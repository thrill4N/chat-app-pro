import mongoose from "mongoose";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { generateChatbotReply, hasGeminiConfig } from "./gemini.js";
import { invalidate } from "./redis.js";
import { getReceiverSocketId, io } from "./socket.js";

const ASSISTANT_IDENTITY = {
  clerkId: "system:assistant",
  email: "assistant@chat-app-pro.local",
  fullName: "AI Assistant",
  profilePic: "",
  username: "assistant",
  isBot: true,
};

const HISTORY_LENGTH = 10;
const MENTION_REGEX = /@chatbot\b/i;
const FALLBACK_TEXT = "Sorry, I couldn't come up with a response just now -- try again in a moment.";
const COOLDOWN_MS = 3000;
const lastTriggeredAt = new Map();

function isOnCooldown(userId) {
  const key = userId.toString();
  const last = lastTriggeredAt.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return true;
  lastTriggeredAt.set(key, Date.now());
  return false;
}

let cachedBotUser = null;

export async function ensureSystemBot() {
  if (cachedBotUser) return cachedBotUser;

  if (process.env.NODE_ENV === "test" && !process.env.MONGO_URI) {
    const fallbackBot = {
      ...ASSISTANT_IDENTITY,
      _id: new mongoose.Types.ObjectId("000000000000000000000001"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    cachedBotUser = fallbackBot;
    return cachedBotUser;
  }

  const existingBot = await User.findOne({
    $or: [{ isBot: true }, { clerkId: ASSISTANT_IDENTITY.clerkId }, { email: ASSISTANT_IDENTITY.email }],
  });

  if (existingBot) {
    cachedBotUser = existingBot;
    return cachedBotUser;
  }

  const bot = await User.create({
    ...ASSISTANT_IDENTITY,
    status: "Online",
  });

  cachedBotUser = bot;
  return bot;
}

async function getBotUser() {
  return ensureSystemBot();
}

export async function ensureAssistantConversation(userId) {
  const botUser = await ensureSystemBot();

  const existingConversation = await Message.findOne({
    $or: [
      { senderId: userId, receiverId: botUser._id },
      { senderId: botUser._id, receiverId: userId },
    ],
  }).sort({ createdAt: -1 });

  if (existingConversation) {
    return { botUser, existingConversation };
  }

  const seededWelcome = await Message.create({
    senderId: botUser._id,
    receiverId: userId,
    text: "Hi! I'm your private assistant. Ask me anything, and I’ll keep this thread to you.",
  });

  await Promise.all([
    invalidate(`sidebar:conversations:${userId}`),
    invalidate(`sidebar:users:${userId}`),
  ]);

  return { botUser, existingConversation: seededWelcome };
}

function toGeminiRole(message, botUserId) {
  return message.senderId.toString() === botUserId.toString() ? "model" : "user";
}

async function buildHistory(query, botUserId) {
  const recent = await Message.find(query).sort({ createdAt: -1 }).limit(HISTORY_LENGTH).lean();
  return recent.reverse().filter((m) => m.text).map((m) => ({ role: toGeminiRole(m, botUserId), text: m.text }));
}

async function generateReplyFor(historyQuery, botUserId, latestText) {
  const history = await buildHistory(historyQuery, botUserId);
  const replyText = await generateChatbotReply({ history, latestMessage: latestText });
  return replyText || FALLBACK_TEXT;
}

async function sendBotDirectMessage(botUserId, targetUserId, text) {
  const botMessage = await Message.create({ senderId: botUserId, receiverId: targetUserId, text });
  const targetSocketId = getReceiverSocketId(targetUserId.toString());
  if (targetSocketId) io.to(targetSocketId).emit("newMessage", botMessage);
}

async function sendBotRoomMessage(botUserId, roomId, text) {
  const botMessage = await Message.create({ senderId: botUserId, roomId, text });
  io.to(roomId.toString()).emit("newRoomMessage", botMessage);
}

export async function maybeTriggerChatbot({ message, isRoom, room }) {
  try {
    if (!hasGeminiConfig()) return;
    if (!message.text) return;
    const botUser = await getBotUser();
    if (!botUser) return;
    if (message.senderId.toString() === botUser._id.toString()) return;

    const mentioned = MENTION_REGEX.test(message.text);

    if (isRoom) {
      if (!mentioned) return;
      if (isOnCooldown(message.senderId)) return;
      const replyText = await generateReplyFor({ roomId: room._id }, botUser._id, message.text);
      await sendBotRoomMessage(botUser._id, room._id, replyText);
      return;
    }

    const isDirectToBot = message.receiverId?.toString() === botUser._id.toString();

    if (isDirectToBot) {
      if (isOnCooldown(message.senderId)) return;
      const threadQuery = {
        $or: [
          { senderId: message.senderId, receiverId: botUser._id },
          { senderId: botUser._id, receiverId: message.senderId },
        ],
      };
      const replyText = await generateReplyFor(threadQuery, botUser._id, message.text);
      await sendBotDirectMessage(botUser._id, message.senderId, replyText);
      return;
    }

    if (mentioned) {
      if (isOnCooldown(message.senderId)) return;
      const otherUserId = message.receiverId;
      const conversationQuery = {
        $or: [
          { senderId: message.senderId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: message.senderId },
        ],
      };
      const replyText = await generateReplyFor(conversationQuery, botUser._id, message.text);
      await Promise.all([
        sendBotDirectMessage(botUser._id, message.senderId, replyText),
        sendBotDirectMessage(botUser._id, otherUserId, replyText),
      ]);
    }
  } catch (error) {
    console.error("Error in maybeTriggerChatbot:", error.message);
  }
}
