import test from "node:test";
import assert from "node:assert/strict";

import Post from "../src/models/post.model.js";
import Reaction from "../src/models/reaction.model.js";

test("feed posts use the signed-in visibility contract", () => {
  const visibilityValues = Post.schema.path("visibility").enumValues;
  assert.deepEqual(visibilityValues, ["signed_in"]);
});

test("feed reactions enforce one unique reaction per user per target", () => {
  const indexes = Reaction.schema.indexes();
  const uniqueIndex = indexes.find((index) => {
    const key = Object.keys(index[0]);
    return key.includes("targetType") && key.includes("targetId") && key.includes("userId") && index[1]?.unique === true;
  });

  assert.ok(uniqueIndex, "reactions must enforce a unique user-target pair");
});
