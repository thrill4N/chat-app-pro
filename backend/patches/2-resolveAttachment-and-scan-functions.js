// Replaces uploadMediaIfPresent. Handles images/video (as before) plus
// generic file attachments, with type validation and malware-hash
// checking layered in before anything gets uploaded or persisted.
async function resolveAttachment(file) {
  if (!file) return {};

  const validation = await validateUploadedFile(file);
  if (!validation.ok) {
    const error = new Error(validation.reason);
    error.statusCode = 400;
    throw error;
  }

  let fileScanStatus = "none";
  let pendingHash = null;

  if (hasVirusTotalConfig()) {
    const hash = sha256Hex(file.buffer);
    const reputation = await checkHashReputation(hash);

    if (reputation === "malicious") {
      const error = new Error("This file was flagged as malicious and cannot be sent");
      error.statusCode = 422;
      throw error;
    }

    // "clean" = VT already knows this exact file and it's safe -- no
    // further action needed. "unknown" = never seen before; per the
    // async flag-and-remove decision, send it now and scan in the
    // background rather than blocking the request on a fresh scan.
    fileScanStatus = reputation === "clean" ? "clean" : "pending";
    if (reputation === "unknown") pendingHash = hash;
  }

  if (!hasImageKitConfig()) {
    const error = new Error("Media upload is not configured");
    error.statusCode = 500;
    throw error;
  }

  const url = await uploadChatMedia(file);
  const isImage = validation.mimeType.startsWith("image/");
  const isVideo = validation.mimeType.startsWith("video/");

  const result = { fileScanStatus, pendingHash };
  if (isImage) return { ...result, imageUrl: url };
  if (isVideo) return { ...result, videoUrl: url };

  return {
    ...result,
    fileAttachment: {
      url,
      name: file.originalname,
      mimeType: validation.mimeType,
      size: file.size,
    },
  };
}

// Fire-and-forget background scan for a file VT hadn't seen before. Never
// awaited by the request handler -- the message has already sent, per the
// async flag-and-remove approach; this either confirms it clean (quiet,
// no-op update) or pulls it and tells connected clients.
async function scanAndFlagIfMalicious(message, buffer) {
  try {
    const filename = message.file?.name || "attachment";
    const analysisId = await submitFileForScan(buffer, filename);
    const isMalicious = await pollAnalysisUntilComplete(analysisId);

    if (isMalicious === true) {
      message.fileScanStatus = "flagged";
      message.text = undefined;
      message.image = undefined;
      message.video = undefined;
      message.file = undefined;
      await message.save();

      const payload = { messageId: message._id, roomId: message.roomId };
      if (message.roomId) {
        io.to(message.roomId.toString()).emit("messageFlagged", payload);
      } else {
        [message.receiverId, message.senderId].forEach((userId) => {
          const socketId = getReceiverSocketId(userId.toString());
          if (socketId) io.to(socketId).emit("messageFlagged", payload);
        });
      }
    } else if (isMalicious === false) {
      message.fileScanStatus = "clean";
      await message.save();
    }
    // isMalicious === null: VT didn't finish in time -- left as "pending"
    // rather than guessing either way.
  } catch (error) {
    console.error("Error scanning attachment:", error.message);
  }
}
