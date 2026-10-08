import express from "express";
import { updateProfile, uploadProfilePicture } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadProfilePicture as profilePictureUpload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/me/profile-picture", profilePictureUpload.single("image"), uploadProfilePicture);
router.patch("/me", updateProfile);

export default router;
