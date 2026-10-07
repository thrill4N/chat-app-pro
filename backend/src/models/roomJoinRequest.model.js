import mongoose from "mongoose";

const roomJoinRequestSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied", "cancelled"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

roomJoinRequestSchema.index(
  { roomId: 1, requesterId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
roomJoinRequestSchema.index({ roomId: 1, status: 1 });

const RoomJoinRequest = mongoose.model("RoomJoinRequest", roomJoinRequestSchema);

export default RoomJoinRequest;
