import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const MAX_TEXT_LENGTH = 5000;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

// Shared by both 1:1 and room message sending, so the upload branching
// logic (image vs video, config check) lives in exactly one place.
async function uploadMediaIfPresent(file) {
  if (!file) return {};
  if (!hasImageKitConfig()) {
    const error = new Error("Media upload is not configured");
    error.statusCode = 500;
    throw error;
  }

  const url = await uploadChatMedia(file);
  return file.mimetype.startsWith("video/") ? { videoUrl: url } : { imageUrl: url };
}

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-clerkId");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const conversations = await Message.aggregate([
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
    ]);

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

    let imageUrl;
    let videoUrl;

    try {
      ({ imageUrl, videoUrl } = await uploadMediaIfPresent(req.file));
    } catch (uploadError) {
      return res.status(uploadError.statusCode || 500).json({ message: uploadError.message });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    // only send the message in realtime if user is online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

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

    let imageUrl;
    let videoUrl;

    try {
      ({ imageUrl, videoUrl } = await uploadMediaIfPresent(req.file));
    } catch (uploadError) {
      return res.status(uploadError.statusCode || 500).json({ message: uploadError.message });
    }

    const newMessage = await Message.create({
      senderId,
      roomId: room._id,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    // Broadcast to every currently-connected member of the room in one call,
    // instead of looking up and emitting to each member's socket individually.
    io.to(room._id.toString()).emit("newRoomMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendRoomMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
