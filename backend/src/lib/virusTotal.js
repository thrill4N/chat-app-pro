import crypto from "crypto";

const VT_BASE_URL = "https://www.virustotal.com/api/v3";

export function hasVirusTotalConfig() {
  return Boolean(process.env.VIRUSTOTAL_API_KEY);
}

export function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Fast path: check whether this exact file's hash is already known to
 * VirusTotal *before* ever uploading anything. This is a single cheap GET,
 * so it's cheap enough to run synchronously in the request path -- unlike
 * a full scan, which can take seconds to minutes for a file VT hasn't
 * seen before.
 *
 * Returns "malicious" | "clean" | "unknown" ("unknown" = VT has never
 * seen this hash, so nothing can be concluded synchronously).
 */
export async function checkHashReputation(hash) {
  const res = await fetch(`${VT_BASE_URL}/files/${hash}`, {
    headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY },
  });

  if (res.status === 404) return "unknown";
  if (!res.ok) {
    // A VT outage or rate-limit shouldn't block legitimate uploads --
    // treat it the same as "unknown" and let the async full scan (below)
    // be the backstop.
    console.error("VirusTotal hash lookup failed:", res.status);
    return "unknown";
  }

  const body = await res.json();
  const stats = body.data?.attributes?.last_analysis_stats;
  return stats?.malicious > 0 ? "malicious" : "clean";
}

/**
 * Slow path, for files VT has never seen: uploads the actual bytes for a
 * fresh scan. Returns an analysis id to poll. Free-tier VT limits file
 * uploads to 32MB and enforces a low requests-per-minute rate, so this is
 * deliberately only called for the (presumably rarer) unknown-hash case,
 * never on every message.
 */
export async function submitFileForScan(buffer, filename) {
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);

  const res = await fetch(`${VT_BASE_URL}/files`, {
    method: "POST",
    headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY },
    body: formData,
  });

  if (!res.ok) throw new Error(`VirusTotal submission failed: ${res.status}`);

  const body = await res.json();
  return body.data.id; // analysis id
}

export async function getAnalysisStatus(analysisId) {
  const res = await fetch(`${VT_BASE_URL}/analyses/${analysisId}`, {
    headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY },
  });
  if (!res.ok) throw new Error(`VirusTotal analysis fetch failed: ${res.status}`);

  const body = await res.json();
  const { status, stats } = body.data.attributes;
  return { status, malicious: stats?.malicious > 0 };
}

/**
 * Polls until VT finishes analyzing (status moves from "queued" to
 * "completed"), or gives up after maxAttempts.
 *
 * This is an in-process, best-effort poller -- it does NOT survive a
 * server restart mid-poll, and every concurrent scan holds its own timer.
 * That's an acceptable tradeoff for the sprint's current scale, but it's
 * exactly the kind of job a proper queue (BullMQ + the Day 7 Redis
 * instance) is meant to replace: durable, retryable, and not tied to a
 * single process's uptime.
 */
export async function pollAnalysisUntilComplete(analysisId, { maxAttempts = 10, intervalMs = 15000 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { status, malicious } = await getAnalysisStatus(analysisId);
    if (status === "completed") return malicious;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  // Gave up waiting -- treat as unresolved rather than guessing either way.
  console.error("VirusTotal analysis did not complete in time:", analysisId);
  return null;
}
