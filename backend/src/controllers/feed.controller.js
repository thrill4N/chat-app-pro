import mongoose from "mongoose";
import Post from "../models/post.model.js";
import Reply from "../models/reply.model.js";
import Reaction from "../models/reaction.model.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function normalizeLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

export async function listFeed(req, res) {
  try {
    const limit = normalizeLimit(req.query.limit);
    const cursor = req.query.cursor;
    const query = { softDeleted: false, visibility: "signed_in" };

    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: cursor };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate("authorId", "fullName username profilePic")
      .lean();

    const items = await Promise.all(
      posts.map(async (post) => {
        const [replies, reactions] = await Promise.all([
          Reply.find({ postId: post._id, softDeleted: false }).countDocuments(),
          Reaction.find({ targetType: "post", targetId: post._id }).lean(),
        ]);

        return {
          ...post,
          replyCount: replies,
          reactions,
        };
      }),
    );

    res.status(200).json(items);
  } catch (error) {
    console.error("Error in listFeed:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createPost(req, res) {
  try {
    const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
    if (!body) {
      return res.status(400).json({ message: "Post body is required" });
    }
    if (body.length > 2000) {
      return res.status(400).json({ message: "Post body cannot exceed 2000 characters" });
    }

    const post = await Post.create({
      authorId: req.user._id,
      body,
      visibility: "signed_in",
    });

    res.status(201).json(post);
  } catch (error) {
    console.error("Error in createPost:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createReply(req, res) {
  try {
    const { postId } = req.params;
    const body = typeof req.body.body === "string" ? req.body.body.trim() : "";

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }
    if (!body) {
      return res.status(400).json({ message: "Reply body is required" });
    }
    if (body.length > 1000) {
      return res.status(400).json({ message: "Reply body cannot exceed 1000 characters" });
    }

    const post = await Post.findById(postId);
    if (!post || post.softDeleted) {
      return res.status(404).json({ message: "Post not found" });
    }

    const reply = await Reply.create({
      postId,
      authorId: req.user._id,
      body,
      parentReplyId: req.body.parentReplyId || null,
    });

    res.status(201).json(reply);
  } catch (error) {
    console.error("Error in createReply:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function listReplies(req, res) {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const replies = await Reply.find({ postId, softDeleted: false })
      .sort({ createdAt: -1, _id: -1 })
      .populate("authorId", "fullName username profilePic")
      .lean();

    res.status(200).json(replies);
  } catch (error) {
    console.error("Error in listReplies:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function toggleReaction(req, res) {
  try {
    const { postId } = req.params;
    const { targetType = "post", kind } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid target id" });
    }
    if (!['post', 'reply'].includes(targetType)) {
      return res.status(400).json({ message: "Target type must be 'post' or 'reply'" });
    }
    if (!['like', 'love', 'fire'].includes(kind)) {
      return res.status(400).json({ message: "Reaction kind is invalid" });
    }

    const existing = await Reaction.findOne({
      targetType,
      targetId: postId,
      userId: req.user._id,
    });

    if (existing) {
      if (existing.kind === kind) {
        await existing.deleteOne();
        return res.status(200).json({ removed: true });
      }

      existing.kind = kind;
      await existing.save();
      return res.status(200).json(existing);
    }

    const reaction = await Reaction.create({
      targetType,
      targetId: postId,
      userId: req.user._id,
      kind,
    });

    res.status(201).json(reaction);
  } catch (error) {
    console.error("Error in toggleReaction:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
