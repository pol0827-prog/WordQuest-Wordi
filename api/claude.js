const { verify } = require("./_auth");

// GEMINI_API_KEY가 있으면 Gemini(구글 AI 스튜디오), 없으면 ANTHROPIC_API_KEY로 Claude를 호출합니다.
async function ask(prompt, json) {
  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: json ? 8192 : 4096 } })
    });
    const d = await r.json();
    if (!r.ok) throw new Error((d.error && d.error.message) || "Gemini 호출에 실패했어요");
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    return parts.map(p => p.text || "").join("");
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", max_tokens: json ? 4000 : 1500, messages: [{ role: "user", content: prompt }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || "Claude 호출에 실패했어요");
  return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 가능해요" });
  const u = await verify(req);
  if (!u) return res.status(401).json({ error: "로그인이 필요해요" });
  const { prompt, json } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "내용이 없어요" });
  if (json && !u.teacher) return res.status(403).json({ error: "교사 계정만 쓸 수 있어요" });
  if (prompt.length > (json ? 20000 : 2000)) return res.status(413).json({ error: "내용이 너무 길어요" });
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "서버에 GEMINI_API_KEY 또는 ANTHROPIC_API_KEY가 설정되지 않았어요" });
  let text;
  try { text = await ask(prompt, json); } catch (e) { return res.status(502).json({ error: e.message }); }
  if (!json) return res.json({ text });
  const m = text.replace(/```json|```/g, "").match(/\[[\s\S]*\]/);
  try { return res.json({ data: JSON.parse(m[0]) }); } catch (e) { return res.status(502).json({ error: "결과를 해석하지 못했어요" }); }
};
