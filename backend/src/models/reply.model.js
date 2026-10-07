import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reply",
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    moderationStatus: {
      type: String,
      enum: ["none", "pending", "clean", "flagged"],
      default: "none",
    },
    softDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

replySchema.index({ postId: 1, createdAt: -1, _id: -1 });
replySchema.index({ parentReplyId: 1, createdAt: -1 });

const Reply = mongoose.model("Reply", replySchema);

export default Reply;
