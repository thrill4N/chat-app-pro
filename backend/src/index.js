import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";

import "dotenv/config";

import fs from "fs";
import path from "path";

import { clerkMiddleware } from "@clerk/express";

import User from "./models/user.model.js";
import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";

import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import userRoutes from "./routes/user.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

const publicDir = path.join(process.cwd(), "public");

// it's important that you don't parse the webhook event data, it should be in the raw format
app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhook);

// contentSecurityPolicy is left off: this API serves media URLs from an
// external ImageKit CDN and auth requests from Clerk's domains, and
// helmet's restrictive default CSP would block both. The other
// protections (X-Content-Type-Options, X-Frame-Options, etc.) still apply.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());

// Basic abuse protection on the API surface. Auth failures and message spam
// are the main things worth throttling here; static asset serving below is
// left untouched.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// if the public directory exists, serve the static files
// this is for the production build
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

// Central error handler. Without this, thrown errors (including Multer's
// file-size/file-type errors from the upload middleware) fall through to
// Express's default handler, which replies with an HTML page instead of
// JSON that the frontend can actually parse.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ message: err.message });
  }

  if (err && err.message === "Only image and video uploads are allowed") {
    return res.status(400).json({ message: err.message });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

server.listen(PORT, () => {
  connectDB();
  console.log("Server is up and running on PORT:", PORT);

  if (process.env.NODE_ENV === "production") job.start();
});
