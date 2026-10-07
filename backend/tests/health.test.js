import test from "node:test";
import assert from "node:assert/strict";

import { connectDB } from "../src/lib/db.js";

test("connectDB should not exit in test mode when no Mongo URI is configured", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousMongoUri = process.env.MONGO_URI;

  process.env.NODE_ENV = "test";
  delete process.env.MONGO_URI;

  try {
    await assert.doesNotReject(async () => {
      await connectDB();
    });
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousMongoUri === undefined) {
      delete process.env.MONGO_URI;
    } else {
      process.env.MONGO_URI = previousMongoUri;
    }
  }
});
