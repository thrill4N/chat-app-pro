import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const authHeroFile = path.resolve(repoRoot, "../frontend/src/components/auth/AuthHeroPanel.jsx");

await test("auth page does not require a hardcoded hero image asset", async () => {
  const source = await fs.readFile(authHeroFile, "utf8");
  assert.doesNotMatch(source, /src=["']\/auth\.png["']/);
});

await test("api health endpoint responds successfully", async () => {
  const { app } = await import("../src/lib/socket.js");
  const server = app.listen(0);

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload, { ok: true });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
