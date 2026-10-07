import { hasGeminiConfig } from "./gemini.js";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const CLASSIFIER_INSTRUCTION =
  "You are a content moderation classifier for a group chat app. Given a single message, decide " +
  "whether it contains hate speech: content that attacks, demeans, or incites hatred against people " +
  "based on race, ethnicity, religion, gender, sexual orientation, disability, or similar protected " +
  "characteristics. Respond with exactly one word: YES if the message contains hate speech, or NO if " +
  "it does not. Do not explain your answer, do not add punctuation -- respond with only YES or NO.";

export async function classifyHateSpeech(text) {
  if (!hasGeminiConfig()) return false;
  const model = process.env.MODERATION_MODEL || process.env.AI_AGENT_MODEL || "gemini-2.5-flash";
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.AI_AGENT_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        systemInstruction: { parts: [{ text: CLASSIFIER_INSTRUCTION }] },
        generationConfig: { maxOutputTokens: 5, temperature: 0 },
      }),
    });
    if (!res.ok) { console.error("Moderation classifier error:", res.status); return false; }
    const body = await res.json();
    if (body.promptFeedback?.blockReason) return true;
    const answer = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    return Boolean(answer?.startsWith("YES"));
  } catch (error) {
    console.error("Error calling moderation classifier:", error.message);
    return false;
  }
}
