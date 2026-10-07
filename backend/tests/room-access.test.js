import test from "node:test";
import assert from "node:assert/strict";

import RoomJoinRequest from "../src/models/roomJoinRequest.model.js";
import { resolveSocketUserFromHandshake } from "../src/lib/socket.js";

test("pending room requests enforce a single active request per room and user", () => {
  const indexes = RoomJoinRequest.schema.indexes();
  const pendingUniqueIndex = indexes.find((index) => {
    const key = Object.keys(index[0]);
    return (
      key.includes("roomId") &&
      key.includes("requesterId") &&
      index[1]?.unique === true &&
      index[1]?.partialFilterExpression?.status === "pending"
    );
  });

  assert.ok(pendingUniqueIndex, "a unique pending-request index must exist");
});

test("socket handshake rejects untrusted client-supplied user ids without a valid Clerk token", async () => {
  const user = await resolveSocketUserFromHandshake({
    auth: {},
    query: { userId: "507f191e810c19729de860ea" },
    headers: {},
  });

  assert.equal(user, null);
});
