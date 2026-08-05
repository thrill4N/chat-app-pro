import mongoose from "mongoose";

export const ROOM_ROLES = ["owner", "admin", "member"];

/**
 * Group chatroom.
 *
 * Membership + role live inline on the room document (an array of
 * {userId, role, joinedAt} subdocuments) rather than a separate join
 * collection. For the member counts a group chat realistically has
 * (tens, maybe low hundreds), this keeps "get a room with its members" a
 * single query instead of a join, at the cost of the members array
 * growing with the document. That tradeoff would flip for very large
 * rooms, but isn't a concern at this scale.
 */
const roomMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ROOM_ROLES,
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: "",
      maxlength: 300,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [roomMemberSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Every membership/role check goes through this room's members array, so
// an index on members.userId keeps "which rooms is this user in" fast as
// room count grows.
roomSchema.index({ "members.userId": 1 });

const Room = mongoose.model("Room", roomSchema);

export default Room;
