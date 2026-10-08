import test from "node:test";
import assert from "node:assert/strict";

import User from "../src/models/user.model.js";

test("user profile schema stores privacy toggles and normalizes usernames", () => {
  assert.equal(User.schema.path("showOnlineStatus").defaultValue, true);
  assert.equal(User.schema.path("showTypingIndicator").defaultValue, true);
  assert.equal(User.schema.path("username").options.lowercase, true);
  assert.equal(User.schema.path("username").options.trim, true);
  assert.equal(User.schema.path("username").options.unique, true);
});
