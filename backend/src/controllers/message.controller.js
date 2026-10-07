import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { ensureAssistantConversation, maybeTriggerChatbot } from "../lib/chatbot.js";
import { classifyHateSpeech } from "../lib/moderation.js";
import { hasGeminiConfig } from "../lib/gemini.js";
import { validateUploadedFile } from "../lib/fileValidation.js";
import { cached, invalidate } from "../lib/redis.js";
import {
  checkHashReputation,
  hasVirusTotalConfig,
  pollAnalysisUntilComplete,
  sha256Hex,
  submitFileForScan,
} from "../lib/virusTotal.js";

const MAX_TEXT_LENGTH = 5000;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

async function resolveAttachment(file) {
  if (!file) return {};

  const validation = await validateUploadedFile(file);
  if (!validation.ok) {
    const error = new Error(validation.reason);
    error.statusCode = 400;
    throw error;
  }

  let fileScanStatus = "none";
  let pendingHash = null;

  if (hasVirusTotalConfig()) {
    const hash = sha256Hex(file.buffer);
    const reputation = await checkHashReputation(hash);

    if (reputation === "malicious") {
      const error = new Error("This file was flagged as malicious and cannot be sent");
      error.statusCode = 422;
      throw error;
    }

    fileScanStatus = reputation === "clean" ? "clean" : "pending";
    if (reputation === "unknown") pendingHash = hash;
  }

  if (!hasImageKitConfig()) {
    const error = new Error("Media upload is not configured");
    error.statusCode = 500;
    throw error;
  }

  const url = await uploadChatMedia(file);
  const isImage = validation.mimeType.startsWith("image/");
  const isVideo = validation.mimeType.startsWith("video/");

  const result = { fileScanStatus, pendingHash };
  if (isImage) return { ...result, imageUrl: url };
  if (isVideo) return { ...result, videoUrl: url };

  return {
    ...result,
    fileAttachment: { url, name: file.originalname, mimeType: validation.mimeType, size: file.size },
  };
}

async function scanAndFlagIfMalicious(message, buffer) {
  try {
    const filename = message.file?.name || "attachment";
    const analysisId = await submitFileForScan(buffer, filename);
    const isMalicious = await pollAnalysisUntilComplete(analysisId);

    if (isMalicious === true) {
      message.fileScanStatus = "flagged";
      message.text = undefined;
      message.image = undefined;
      message.video = undefined;
      message.file = undefined;
      await message.save();

      const payload = { messageId: message._id, roomId: message.roomId };
      if (message.roomId) {
        io.to(message.roomId.toString()).emit("messageFlagged", payload);
      } else {
        [message.receiverId, message.senderId].forEach((userId) => {
          const socketId = getReceiverSocketId(userId.toString());
          if (socketId) io.to(socketId).emit("messageFlagged", payload);
        });
      }
    } else if (isMalicious === false) {
      message.fileScanStatus = "clean";
      await message.save();
    }
  } catch (error) {
    console.error("Error scanning attachment:", error.message);
  }
}

async function moderateRoomMessageIfNeeded(message) {
  try {
    const isHateSpeech = await classifyHateSpeech(message.text);

    if (isHateSpeech) {
      message.moderationStatus = "flagged";
      message.text = "[removed for violating community guidelines]";
      await message.save();
      io.to(message.roomId.toString()).emit("messageFlagged", {
        messageId: message._id,
        roomId: message.roomId,
      });
    } else {
      message.moderationStatus = "clean";
      await message.save();
    }
  } catch (error) {
    console.error("Error moderating room message:", error.message);
  }
}

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const assistant = await ensureAssistantConversation(loggedInUserId);
    const rawUsers = await cached(
      `sidebar:users:${loggedInUserId}`,
      () => User.find({ _id: { $ne: loggedInUserId } }).select("-clerkId").lean(),
      60,
    );

    const usersWithoutAssistant = rawUsers.filter((user) => user._id.toString() !== assistant.botUser._id.toString());
    const publicAssistant = { ...assistant.botUser.toObject(), clerkId: undefined };

    res.status(200).json([...usersWithoutAssistant, publicAssistant]);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;
    await ensureAssistantConversation(loggedInUserId);

    const conversations = await cached(
      `sidebar:conversations:${loggedInUserId}`,
      () =>
        Message.aggregate([
          // 1. Keep only the messages I sent or received.
          { $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }] } },
          // 2. Collapse them into one row per chat partner, noting our latest message time.
          {
            $group: {
              // The partner is the other person on the message (not me).
              _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
              lastMessageAt: { $max: "$createdAt" },
            },
          },
          // 3. Put the most recent conversation at the top.
          { $sort: { lastMessageAt: -1 } },
          // 4. Look up each partner's user profile (comes back as an array).
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
          // 5. Pull that profile out of the array and make it the document.
          { $replaceRoot: { newRoot: { $first: "$user" } } },
          // 6. Hide the private clerkId field from the result.
          { $project: { clerkId: 0 } },
        ]),
      15,
    );

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Pagination: ?limit=50&before=<ISO date>
    // "before" lets the client page backwards through older history without
    // ever having to load an entire conversation into memory at once.
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_MESSAGE_LIMIT;
    limit = Math.min(limit, MAX_MESSAGE_LIMIT);

    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    if (req.query.before) {
      const beforeDate = new Date(req.query.before);
      if (!Number.isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // Fetch newest-first so `limit` grabs the most recent page, then
    // reverse back to chronological order for the client.
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : undefined;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver id" });
    }

    if (receiverId === senderId.toString()) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    if (!text && !req.file) {
      return res.status(400).json({ message: "Message must include text or media" });
    }

    if (text && text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ message: `Message text cannot exceed ${MAX_TEXT_LENGTH} characters` });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    let attachment;
    try {
      attachment = await resolveAttachment(req.file);
    } catch (uploadError) {
      return res.status(uploadError.statusCode || 500).json({ message: uploadError.message });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: attachment.imageUrl,
      video: attachment.videoUrl,
      file: attachment.fileAttachment,
      fileScanStatus: attachment.fileScanStatus,
    });

    await newMessage.save();

    if (attachment.pendingHash) {
      scanAndFlagIfMalicious(newMessage, req.file.buffer);
    }

    await Promise.all([
      invalidate(`sidebar:conversations:${senderId}`),
      invalidate(`sidebar:conversations:${receiverId}`),
    ]);

    const receiverSocketId = getReceiverSocketId(receiverId);
    // only send the message in realtime if user is online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    maybeTriggerChatbot({ message: newMessage, isRoom: false });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/rooms/:roomId/messages  (requireRoomMember already verified membership)
export async function getRoomMessages(req, res) {
  try {
    const roomId = req.room._id;

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_MESSAGE_LIMIT;
    limit = Math.min(limit, MAX_MESSAGE_LIMIT);

    const query = { roomId };
    if (req.query.before) {
      const beforeDate = new Date(req.query.before);
      if (!Number.isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getRoomMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// POST /api/rooms/:roomId/messages  (requireRoomMember already verified membership)
export async function sendRoomMessage(req, res) {
  try {
    const room = req.room;
    const senderId = req.user._id;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : undefined;

    if (!text && !req.file) {
      return res.status(400).json({ message: "Message must include text or media" });
    }
    if (text && text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ message: `Message text cannot exceed ${MAX_TEXT_LENGTH} characters` });
    }

    let attachment;
    try {
      attachment = await resolveAttachment(req.file);
    } catch (uploadError) {
      return res.status(uploadError.statusCode || 500).json({ message: uploadError.message });
    }

    const moderationStatus = text && hasGeminiConfig() ? "pending" : "none";

    const newMessage = await Message.create({
      senderId,
      roomId: room._id,
      text,
      image: attachment.imageUrl,
      video: attachment.videoUrl,
      file: attachment.fileAttachment,
      fileScanStatus: attachment.fileScanStatus,
      moderationStatus,
    });

    if (attachment.pendingHash) {
      scanAndFlagIfMalicious(newMessage, req.file.buffer);
    }

    // Broadcast to every currently-connected member of the room in one call,
    // instead of looking up and emitting to each member's socket individually.
    io.to(room._id.toString()).emit("newRoomMessage", newMessage);

    maybeTriggerChatbot({ message: newMessage, isRoom: true, room });

    if (moderationStatus === "pending") {
      moderateRoomMessageIfNeeded(newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendRoomMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
