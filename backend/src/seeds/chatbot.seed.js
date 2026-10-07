import "dotenv/config";
import { connectDB } from "../lib/db.js";
import User from "../models/user.model.js";

const BOT_CLERK_ID = "system:chatbot";
const BOT_EMAIL = "chatbot@chat-app-pro.local";

async function seedChatbot() {
  await connectDB();

  const existing = await User.findOne({ isBot: true });
  if (existing) {
    console.log("Chatbot user already exists:", existing._id.toString());
    process.exit(0);
  }

  const bot = await User.create({
    clerkId: BOT_CLERK_ID,
    email: BOT_EMAIL,
    fullName: "Chatbot",
    username: "chatbot",
    status: "Always available",
    profilePic: "https://api.dicebear.com/9.x/bottts/svg?seed=chatapppro",
    isBot: true,
  });

  console.log("Created chatbot user:", bot._id.toString());
  process.exit(0);
}

seedChatbot().catch((error) => {
  console.error("Error seeding chatbot user:", error.message);
  process.exit(1);
});
