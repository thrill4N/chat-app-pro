import mongoose from "mongoose";
import Room from "../models/room.model.js";

/**
 * Loads the room from :roomId, requires the current user to be a member,
 * and attaches both the room document and the caller's membership entry
 * to the request -- so every downstream handler gets consistent role info
 * without re-querying it.
 */
export async function requireRoomMember(req, res, next) {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const membership = room.members.find((member) => member.userId.equals(req.user._id));
    if (!membership) {
      return res.status(403).json({ message: "You are not a member of this room" });
    }

    req.room = room;
    req.roomMembership = membership;
    next();
  } catch (error) {
    console.error("Error in requireRoomMember:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Owner or admin. Must run after requireRoomMember.
export function requireRoomAdmin(req, res, next) {
  if (!["owner", "admin"].includes(req.roomMembership.role)) {
    return res.status(403).json({ message: "Only room admins can do this" });
  }
  next();
}

// Owner only. Must run after requireRoomMember.
export function requireRoomOwner(req, res, next) {
  if (req.roomMembership.role !== "owner") {
    return res.status(403).json({ message: "Only the room owner can do this" });
  }
  next();
}
