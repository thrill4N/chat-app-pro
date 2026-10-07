import express from "express";
import { createPost, createReply, listFeed, listReplies, toggleReaction } from "../controllers/feed.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.get("/", listFeed);
router.post("/posts", createPost);
router.get("/posts/:postId/replies", listReplies);
router.post("/posts/:postId/replies", createReply);
router.post("/reactions/:postId", toggleReaction);

export default router;
