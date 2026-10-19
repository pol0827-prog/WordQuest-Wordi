const { verify } = require("./_auth");

// 제미나이(구글 AI 스튜디오)만 사용합니다. 필요한 환경변수: GEMINI_API_KEY
// (선택) GEMINI_MODEL - 기본값 gemini-2.5-flash
async function ask(prompt, json) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const generationConfig = { maxOutputTokens: json ? 8192 : 2048 };
  // 2.5 계열은 '생각'에 출력 토큰을 쓰다가 답이 중간에 잘릴 수 있어서 생각을 끕니다.
  if (/2\.5/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  if (json) generationConfig.responseMimeType = "application/json";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || "Gemini 호출에 실패했어요 (" + r.status + ")");
  const c = d.candidates && d.candidates[0];
  if (!c) throw new Error("Gemini가 답을 주지 않았어요" + (d.promptFeedback && d.promptFeedback.blockReason ? " (" + d.promptFeedback.blockReason + ")" : ""));
  const text = ((c.content && c.content.parts) || []).map(p => p.text || "").join("");
  if (!text) throw new Error("Gemini 답이 비어 있어요 (" + (c.finishReason || "알 수 없음") + ")");
  return text;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 가능해요" });
  const u = await verify(req);
  if (!u) return res.status(401).json({ error: "로그인이 필요해요" });
  const { prompt, json } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "내용이 없어요" });
  if (json && !u.teacher) return res.status(403).json({ error: "교사 계정만 쓸 수 있어요" });
  if (prompt.length > (json ? 20000 : 2000)) return res.status(413).json({ error: "내용이 너무 길어요" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요" });
  let text;
  try { text = await ask(prompt, json); } catch (e) { return res.status(502).json({ error: e.message }); }
  if (!json) return res.json({ text });
  const m = text.replace(/```json|```/g, "").match(/\[[\s\S]*\]/);
  try { return res.json({ data: JSON.parse(m[0]) }); } catch (e) { return res.status(502).json({ error: "결과를 해석하지 못했어요 (답이 중간에 끊겼을 수 있어요)" }); }
};
