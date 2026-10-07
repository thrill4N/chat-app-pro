import { createClient } from "redis";

export function hasRedisConfig() {
  return Boolean(process.env.REDIS_URL);
}

let client = null;
let connectingPromise = null;

async function getClient() {
  if (!hasRedisConfig()) return null;
  if (client?.isOpen) return client;

  if (!connectingPromise) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => console.error("Redis client error:", error.message));
    connectingPromise = client.connect().catch((error) => {
      console.error("Redis connection failed:", error.message);
      connectingPromise = null;
      return null;
    });
  }
  return connectingPromise;
}

const DEFAULT_TTL_SECONDS = 30;

export async function cached(key, computeFn, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const redisClient = await getClient();
  if (!redisClient) return computeFn();
  try {
    const hit = await redisClient.get(key);
    if (hit !== null) return JSON.parse(hit);
  } catch (error) {
    console.error("Redis read error:", error.message);
  }
  const value = await computeFn();
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Redis write error:", error.message);
  }
  return value;
}

export async function invalidate(key) {
  const redisClient = await getClient();
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error("Redis invalidate error:", error.message);
  }
}
