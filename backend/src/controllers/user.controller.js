import User from "../models/user.model.js";
import { refreshOnlineUsers } from "../lib/socket.js";
import { hasImageKitConfig, uploadProfilePicture as uploadProfileImage } from "../lib/imagekit.js";
import { validateUploadedFile } from "../lib/fileValidation.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_BIO_LENGTH = 160;
const MAX_STATUS_LENGTH = 40;
const ALLOWED_LAST_SEEN_POLICIES = ["everyone", "nobody"];

function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

export async function uploadProfilePicture(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "Choose a profile picture to upload" });
  }

  const validation = await validateUploadedFile(req.file);
  if (!validation.ok || !validation.mimeType.startsWith("image/")) {
    return res.status(400).json({ message: "Profile pictures must be valid image files" });
  }

  if (!hasImageKitConfig()) {
    return res.status(503).json({ message: "Profile picture uploads are not configured" });
  }

  try {
    const profilePic = await uploadProfileImage({ ...req.file, mimetype: validation.mimeType });
    res.status(200).json({ profilePic });
  } catch (error) {
    console.error("Error uploading profile picture:", error.message);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
}

// PATCH /api/users/me
// fullName and email remain Clerk-sourced; app profile fields are managed here.
export async function updateProfile(req, res) {
  try {
    const {
      username,
      bio,
      status,
      lastSeenPolicy,
      showOnlineStatus,
      showTypingIndicator,
      profilePic,
    } = req.body;

    const updates = {};

    if (username !== undefined) {
      const trimmed = String(username).trim();
      const normalized = normalizeUsername(trimmed);

      if (!USERNAME_REGEX.test(normalized)) {
        return res.status(400).json({
          message: "Username must be 3-20 characters: letters, numbers, and underscores only",
        });
      }

      const existing = await User.findOne({
        username: normalized,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(409).json({ message: "Username is already taken" });
      }

      updates.username = normalized;
    }

    if (bio !== undefined) {
      const trimmed = String(bio).trim();
      if (trimmed.length === 0) {
        return res.status(400).json({ message: "Bio is required" });
      }
      if (trimmed.length > MAX_BIO_LENGTH) {
        return res.status(400).json({ message: `Bio cannot exceed ${MAX_BIO_LENGTH} characters` });
      }
      updates.bio = trimmed;
    }

    if (status !== undefined) {
      const trimmed = String(status).trim();
      if (trimmed.length > MAX_STATUS_LENGTH) {
        return res.status(400).json({ message: `Status cannot exceed ${MAX_STATUS_LENGTH} characters` });
      }
      updates.status = trimmed;
    }

    if (lastSeenPolicy !== undefined) {
      if (!ALLOWED_LAST_SEEN_POLICIES.includes(lastSeenPolicy)) {
        return res.status(400).json({ message: "Invalid last-seen policy" });
      }
      updates.lastSeenPolicy = lastSeenPolicy;
      updates.showOnlineStatus = lastSeenPolicy === "everyone";
    }

    if (showOnlineStatus !== undefined) {
      if (typeof showOnlineStatus !== "boolean") {
        return res.status(400).json({ message: "Show online status must be true or false" });
      }
      updates.showOnlineStatus = showOnlineStatus;
      updates.lastSeenPolicy = showOnlineStatus ? "everyone" : "nobody";
    }

    if (showTypingIndicator !== undefined) {
      if (typeof showTypingIndicator !== "boolean") {
        return res.status(400).json({ message: "Typing indicators preference must be true or false" });
      }
      updates.showTypingIndicator = showTypingIndicator;
    }

    if (profilePic !== undefined) {
      const nextProfilePic = String(profilePic).trim();
      if (!nextProfilePic) {
        return res.status(400).json({ message: "Profile picture is required" });
      }
      updates.profilePic = nextProfilePic;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-clerkId");

    refreshOnlineUsers();
    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username is already taken" });
    }
    console.error("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
