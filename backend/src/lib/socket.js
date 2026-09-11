import express from "express";
import http from "http";
import { Server } from "socket.io";
import Room from "../models/room.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, { cors: { origin: [allowedOrigin] } });

function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// online users map = { userId: socketId }
const userSocketMap = {};

// Socket.io's own "rooms" feature (a socket can be a member of many named
// channels) is what makes group broadcast a one-liner: io.to(roomId).emit(...)
// reaches every currently-connected member without the app tracking
// per-room socket lists itself.
async function joinUserRooms(socket, userId) {
  const rooms = await Room.find({ "members.userId": userId }, "_id").lean();
  rooms.forEach((room) => socket.join(room._id.toString()));
}

// Called by the room controller right after an add/remove-member write, so
// a user who's already connected starts/stops receiving that room's
// broadcasts immediately -- without this, they'd only pick up the change
// on their next reconnect.
function joinUserToRoom(userId, roomId) {
  const socketId = userSocketMap[userId];
  if (!socketId) return; // user isn't currently connected; they'll join on next connect
  io.sockets.sockets.get(socketId)?.join(roomId.toString());
}

function removeUserFromRoom(userId, roomId) {
  const socketId = userSocketMap[userId];
  if (!socketId) return;
  io.sockets.sockets.get(socketId)?.leave(roomId.toString());
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
    joinUserRooms(socket, userId).catch((error) =>
      console.error("Error joining rooms on connect:", error.message),
    );
  }

  // io.emit() sends event to everyone - broadcast
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // socket.on is used to listen for events
  socket.on("disconnect", () => {
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io, getReceiverSocketId, joinUserToRoom, removeUserFromRoom };
