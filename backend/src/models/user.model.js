import mongoose from "mongoose";

/**
 * User document.
 *
 * Split into two groups of fields by *who owns the write*:
 *  1. Clerk-sourced: clerkId, email, fullName, profilePic — written only by
 *     the Clerk webhook (see webhooks/clerk.webhook.js) on
 *     user.created / user.updated / user.deleted. Never accept these from
 *     a client request body.
 *  2. App-owned: username, bio, status, lastSeenPolicy — written only by
 *     PATCH /api/users/me (see controllers/user.controller.js). Clerk has
 *     no concept of these fields.
 */
const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    // --- App-owned profile fields (not written by the Clerk webhook) ---
    // sparse: true means multiple users can have no username yet without
    // tripping the unique index (a plain unique index would only allow one
    // document with a missing/null username).
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      minlength: 3,
      maxlength: 20,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 160,
    },
    status: {
      type: String,
      default: "Available",
      maxlength: 40,
    },
    lastSeenPolicy: {
      type: String,
      enum: ["everyone", "nobody"],
      default: "everyone",
    },
  },
  { timestamps: true }, // createdAt & updatedAt
);

const User = mongoose.model("User", userSchema);

export default User;
