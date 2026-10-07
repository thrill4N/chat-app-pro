import mongoose from "mongoose";
import Room from "../models/room.model.js";
import RoomJoinRequest from "../models/roomJoinRequest.model.js";
import User from "../models/user.model.js";
import { io, joinUserToRoom, removeUserFromRoom } from "../lib/socket.js";
import { cached, invalidate } from "../lib/redis.js";

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 300;

async function invalidateRoomsCacheFor(userIds) {
  await Promise.all(userIds.map((userId) => invalidate(`rooms:${userId.toString()}`)));
}

// POST /api/rooms
export async function createRoom(req, res) {
  try {
    const { name, description, memberIds, accessMode = "invite_only" } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return res.status(400).json({ message: "Room name is required" });
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ message: `Room name cannot exceed ${MAX_NAME_LENGTH} characters` });
    }

    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      return res
        .status(400)
        .json({ message: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters` });
    }

    if (!['invite_only', 'request_to_join'].includes(accessMode)) {
      return res.status(400).json({ message: "Access mode must be 'invite_only' or 'request_to_join'" });
    }

    const initialIds = Array.isArray(memberIds)
      ? [...new Set(memberIds.filter((id) => mongoose.Types.ObjectId.isValid(id)))]
      : [];
    const validInitialUsers = initialIds.length
      ? await User.find({ _id: { $in: initialIds } }, "_id").lean()
      : [];

    const members = [
      { userId: req.user._id, role: "owner" },
      ...validInitialUsers
        .filter((user) => !user._id.equals(req.user._id))
        .map((user) => ({ userId: user._id, role: "member" })),
    ];

    const room = await Room.create({
      name: trimmedName,
      description: trimmedDescription,
      accessMode,
      createdBy: req.user._id,
      members,
    });

    members.forEach((member) => joinUserToRoom(member.userId.toString(), room._id));
    await invalidateRoomsCacheFor(members.map((member) => member.userId));

    res.status(201).json(room);
  } catch (error) {
    console.error("Error in createRoom:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/rooms
export async function listMyRooms(req, res) {
  try {
    const rooms = await cached(
      `rooms:${req.user._id}`,
      () => Room.find({ "members.userId": req.user._id }).sort({ updatedAt: -1 }).lean(),
      30,
    );
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error in listMyRooms:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/rooms/:roomId  (requireRoomMember already loaded req.room)
export async function getRoom(req, res) {
  try {
    const populatedRoom = await req.room.populate("members.userId", "fullName username profilePic");
    res.status(200).json(populatedRoom);
  } catch (error) {
    console.error("Error in getRoom:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// POST /api/rooms/:roomId/members  (admin/owner only)
export async function addMember(req, res) {
  try {
    const { userId } = req.body;
    const room = req.room;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const alreadyMember = room.members.some((member) => member.userId.equals(userId));
    if (alreadyMember) {
      return res.status(409).json({ message: "User is already a member" });
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    room.members.push({ userId, role: "member" });
    await room.save();

    joinUserToRoom(userId, room._id);
    await invalidateRoomsCacheFor(room.members.map((member) => member.userId));
    io.to(room._id.toString()).emit("roomMembersUpdated", { roomId: room._id, members: room.members });

    res.status(200).json(room);
  } catch (error) {
    console.error("Error in addMember:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// DELETE /api/rooms/:roomId/members/:userId  (admin/owner only, with role limits)
export async function removeMember(req, res) {
  try {
    const { userId } = req.params;
    const room = req.room;
    const callerRole = req.roomMembership.role;

    const target = room.members.find((member) => member.userId.equals(userId));
    if (!target) {
      return res.status(404).json({ message: "User is not a member of this room" });
    }

    if (target.role === "owner") {
      return res.status(400).json({ message: "The room owner cannot be removed" });
    }

    // A plain admin can only remove regular members -- demoting/removing
    // another admin is reserved for the owner, so no single admin can
    // unilaterally clear out the rest of the room's leadership.
    if (target.role === "admin" && callerRole !== "owner") {
      return res.status(403).json({ message: "Only the owner can remove an admin" });
    }

    room.members = room.members.filter((member) => !member.userId.equals(userId));
    await room.save();

    removeUserFromRoom(userId, room._id);
    await invalidateRoomsCacheFor([...room.members.map((member) => member.userId), userId]);
    io.to(room._id.toString()).emit("roomMembersUpdated", { roomId: room._id, members: room.members });

    res.status(200).json(room);
  } catch (error) {
    console.error("Error in removeMember:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/rooms/:roomId/members/:userId/role  (owner only)
export async function updateMemberRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const room = req.room;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'admin' or 'member'" });
    }

    const target = room.members.find((member) => member.userId.equals(userId));
    if (!target) {
      return res.status(404).json({ message: "User is not a member of this room" });
    }
    if (target.role === "owner") {
      return res.status(400).json({ message: "The owner's role cannot be changed" });
    }

    target.role = role;
    await room.save();

    await invalidateRoomsCacheFor(room.members.map((member) => member.userId));
    io.to(room._id.toString()).emit("roomMembersUpdated", { roomId: room._id, members: room.members });

    res.status(200).json(room);
  } catch (error) {
    console.error("Error in updateMemberRole:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// POST /api/rooms/:roomId/leave  (any member, except the owner)
export async function leaveRoom(req, res) {
  try {
    const room = req.room;

    if (req.roomMembership.role === "owner") {
      return res.status(400).json({
        message: "The owner can't leave a room directly -- transfer ownership or delete the room",
      });
    }

    room.members = room.members.filter((member) => !member.userId.equals(req.user._id));
    await room.save();

    removeUserFromRoom(req.user._id.toString(), room._id);
    await invalidateRoomsCacheFor([...room.members.map((member) => member.userId), req.user._id]);
    io.to(room._id.toString()).emit("roomMembersUpdated", { roomId: room._id, members: room.members });

    res.status(200).json({ message: "Left room" });
  } catch (error) {
    console.error("Error in leaveRoom:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function requestRoomAccess(req, res) {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.accessMode !== "request_to_join") {
      return res.status(400).json({ message: "This room does not support join requests" });
    }

    const isAlreadyMember = room.members.some((member) => member.userId.equals(req.user._id));
    if (isAlreadyMember) {
      return res.status(409).json({ message: "You are already a member of this room" });
    }

    const existing = await RoomJoinRequest.findOne({
      roomId,
      requesterId: req.user._id,
      status: "pending",
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const request = await RoomJoinRequest.create({
      roomId,
      requesterId: req.user._id,
      status: "pending",
    });

    res.status(201).json(request);
  } catch (error) {
    console.error("Error in requestRoomAccess:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function listJoinRequests(req, res) {
  try {
    const { roomId } = req.params;
    const requests = await RoomJoinRequest.find({ roomId, status: "pending" })
      .sort({ createdAt: -1 })
      .populate("requesterId", "fullName username profilePic")
      .lean();

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in listJoinRequests:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function approveJoinRequest(req, res) {
  try {
    const { roomId, requestId } = req.params;
    const request = await RoomJoinRequest.findOne({ _id: requestId, roomId });

    if (!request) {
      return res.status(404).json({ message: "Join request not found" });
    }

    if (request.status === "approved") {
      return res.status(200).json({ ...request.toObject(), status: "approved" });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: `Join request has already been ${request.status}` });
    }

    const room = await Room.findById(roomId);
    const alreadyMember = room.members.some((member) => member.userId.equals(request.requesterId));
    if (!alreadyMember) {
      room.members.push({ userId: request.requesterId, role: "member" });
      await room.save();
      joinUserToRoom(request.requesterId.toString(), room._id);
      await invalidateRoomsCacheFor(room.members.map((member) => member.userId));
      io.to(room._id.toString()).emit("roomMembersUpdated", { roomId: room._id, members: room.members });
    }

    request.status = "approved";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    res.status(200).json(request);
  } catch (error) {
    console.error("Error in approveJoinRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function denyJoinRequest(req, res) {
  try {
    const { roomId, requestId } = req.params;
    const request = await RoomJoinRequest.findOne({ _id: requestId, roomId });

    if (!request) {
      return res.status(404).json({ message: "Join request not found" });
    }

    if (request.status === "denied") {
      return res.status(200).json({ ...request.toObject(), status: "denied" });
    }

    if (request.status !== "pending") {
      return res.status(409).json({ message: `Join request has already been ${request.status}` });
    }

    request.status = "denied";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    res.status(200).json(request);
  } catch (error) {
    console.error("Error in denyJoinRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
