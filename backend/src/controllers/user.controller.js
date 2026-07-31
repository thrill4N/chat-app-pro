import User from "../models/user.model.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_BIO_LENGTH = 160;
const MAX_STATUS_LENGTH = 40;
const ALLOWED_LAST_SEEN_POLICIES = ["everyone", "nobody"];

// PATCH /api/users/me
// Only fields the app itself owns can be edited here. fullName/email/
// profilePic stay Clerk-sourced and are synced exclusively by the Clerk
// webhook, so they're intentionally not accepted in this request body.
export async function updateProfile(req, res) {
  try {
    const { username, bio, status, lastSeenPolicy } = req.body;

    // Built up as a plain object rather than writing straight to req.user
    // and calling .save(): this way a request that only sends `bio` never
    // touches username/status/lastSeenPolicy at all, so two users editing
    // different fields at the same time can't clobber each other's writes.
    // findByIdAndUpdate() below then applies only these keys atomically.
    const updates = {};

    if (username !== undefined) {
      const trimmed = String(username).trim();
      if (!USERNAME_REGEX.test(trimmed)) {
        return res.status(400).json({
          message: "Username must be 3-20 characters: letters, numbers, and underscores only",
        });
      }

      const existing = await User.findOne({
        username: trimmed,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(409).json({ message: "Username is already taken" });
      }

      updates.username = trimmed;
    }

    if (bio !== undefined) {
      const trimmed = String(bio).trim();
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
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-clerkId");

    res.status(200).json(updatedUser);
  } catch (error) {
    // Handles the race where two requests grab the same username between
    // the findOne check above and this write.
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username is already taken" });
    }
    console.error("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
