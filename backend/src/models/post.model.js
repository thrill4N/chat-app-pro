import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    visibility: {
      type: String,
      enum: ["signed_in"],
      default: "signed_in",
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

postSchema.index({ createdAt: -1, _id: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
