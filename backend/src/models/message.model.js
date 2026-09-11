import mongoose from "mongoose";

/**
 * A message belongs to exactly one of two contexts:
 *  - 1:1: receiverId is set, roomId is absent
 *  - group: roomId is set, receiverId is absent
 *
 * Kept as two optional fields on one schema (rather than two separate
 * Message collections) so message history, pagination, and the sender
 * relationship all share one code path regardless of context -- getMessages
 * and getRoomMessages differ only in which field they filter on.
 */
const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Required only for 1:1 messages; group messages carry roomId instead.
      required: function () {
        return !this.roomId;
      },
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: function () {
        return !this.receiverId;
      },
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
  },
  { timestamps: true },
);

// Both history-lookup paths filter and sort the same way: by conversation
// (either the sender/receiver pair or the room) and by time.
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
