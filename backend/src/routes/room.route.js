import express from "express";
import {
  addMember,
  approveJoinRequest,
  createRoom,
  denyJoinRequest,
  getRoom,
  leaveRoom,
  listJoinRequests,
  listMyRooms,
  removeMember,
  requestRoomAccess,
  updateMemberRole,
} from "../controllers/room.controller.js";
import { getRoomMessages, sendRoomMessage } from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { requireRoomAdmin, requireRoomMember, requireRoomOwner } from "../middleware/room.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createRoom);
router.get("/", listMyRooms);
router.post("/:roomId/join-requests", requestRoomAccess);

// Every route below acts on one specific room, so membership is checked
// once, up front, for all of them.
router.use("/:roomId", requireRoomMember);

router.get("/:roomId", getRoom);
router.post("/:roomId/leave", leaveRoom);
router.get("/:roomId/join-requests", requireRoomAdmin, listJoinRequests);
router.post("/:roomId/join-requests/:requestId/approve", requireRoomAdmin, approveJoinRequest);
router.post("/:roomId/join-requests/:requestId/deny", requireRoomAdmin, denyJoinRequest);

router.get("/:roomId/messages", getRoomMessages);
router.post("/:roomId/messages", upload.single("media"), sendRoomMessage);

router.post("/:roomId/members", requireRoomAdmin, addMember);
router.delete("/:roomId/members/:userId", requireRoomAdmin, removeMember);
router.patch("/:roomId/members/:userId/role", requireRoomOwner, updateMemberRole);

export default router;
