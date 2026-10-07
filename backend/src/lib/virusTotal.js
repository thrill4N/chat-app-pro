import crypto from "crypto";
const VT_BASE_URL = "https://www.virustotal.com/api/v3";
export function hasVirusTotalConfig() { return Boolean(process.env.VIRUSTOTAL_API_KEY); }
export function sha256Hex(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
export async function checkHashReputation(hash) {
  const res = await fetch(`${VT_BASE_URL}/files/${hash}`, { headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY } });
  if (res.status === 404) return "unknown";
  if (!res.ok) { console.error("VirusTotal hash lookup failed:", res.status); return "unknown"; }
  const body = await res.json();
  const stats = body.data?.attributes?.last_analysis_stats;
  return stats?.malicious > 0 ? "malicious" : "clean";
}
export async function submitFileForScan(buffer, filename) {
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);
  const res = await fetch(`${VT_BASE_URL}/files`, { method: "POST", headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY }, body: formData });
  if (!res.ok) throw new Error(`VirusTotal submission failed: ${res.status}`);
  const body = await res.json();
  return body.data.id;
}
export async function getAnalysisStatus(analysisId) {
  const res = await fetch(`${VT_BASE_URL}/analyses/${analysisId}`, { headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY } });
  if (!res.ok) throw new Error(`VirusTotal analysis fetch failed: ${res.status}`);
  const body = await res.json();
  const { status, stats } = body.data.attributes;
  return { status, malicious: stats?.malicious > 0 };
}
export async function pollAnalysisUntilComplete(analysisId, { maxAttempts = 10, intervalMs = 15000 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { status, malicious } = await getAnalysisStatus(analysisId);
    if (status === "completed") return malicious;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  console.error("VirusTotal analysis did not complete in time:", analysisId);
  return null;
}
