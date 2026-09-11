    let attachment;
    try {
      attachment = await resolveAttachment(req.file);
    } catch (uploadError) {
      return res.status(uploadError.statusCode || 500).json({ message: uploadError.message });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: attachment.imageUrl,
      video: attachment.videoUrl,
      file: attachment.fileAttachment,
      fileScanStatus: attachment.fileScanStatus,
    });

    await newMessage.save();

    if (attachment.pendingHash) {
      scanAndFlagIfMalicious(newMessage, req.file.buffer);
    }
