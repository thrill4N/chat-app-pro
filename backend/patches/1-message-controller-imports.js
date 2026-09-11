import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { validateUploadedFile } from "../lib/fileValidation.js";
import {
  checkHashReputation,
  hasVirusTotalConfig,
  pollAnalysisUntilComplete,
  sha256Hex,
  submitFileForScan,
} from "../lib/virusTotal.js";

const MAX_TEXT_LENGTH = 5000;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;
