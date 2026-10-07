import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { ensureSystemBot } = await import("../src/lib/chatbot.js");

test("ensureSystemBot creates a private assistant user for the app", async () => {
  const bot = await ensureSystemBot();

  assert.ok(bot);
  assert.equal(bot.isBot, true);
  assert.equal(bot.fullName, "AI Assistant");
  assert.match(bot.email, /assistant/i);
});
