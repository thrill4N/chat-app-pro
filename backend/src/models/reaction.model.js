import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["post", "reply"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      enum: ["like", "love", "fire"],
      required: true,
    },
  },
  { timestamps: true },
);

reactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
reactionSchema.index({ targetType: 1, targetId: 1 });

const Reaction = mongoose.model("Reaction", reactionSchema);

export default Reaction;
