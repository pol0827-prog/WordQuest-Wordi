const { verify } = require("./_auth");

// 이름이 GEMINI_API_KEY / GOOGLE_API_KEY 와 비슷하면(대소문자 무시) 찾아서 씁니다.
const getKey = () => { const k = Object.keys(process.env).find(n => /^(GEM\w*|GOOGLE)_API_KEY$/i.test(n)); return k ? (process.env[k] || "").trim() : ""; };

// 위에서부터 차례로 시도하고, 실패하면 다음 모델로 넘어갑니다.
// 환경변수 GEMINI_MODELS(쉼표로 구분)를 넣으면 그 모델을 맨 앞에 먼저 시도해요.
const DEFAULTS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const MODELS = [...new Set(((process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "").split(",").map(s => s.trim()).filter(Boolean)).concat(DEFAULTS))];

async function ask(model, prompt, json, noThink, ms) {
  const generationConfig = { maxOutputTokens: json ? 16384 : 2048 };
  let think = null;
  if (!noThink) {
    if (/gemini-2\.5/.test(model)) think = { thinkingBudget: 0 };      // 2.5 계열: 생각 끄기
    else if (/gemini-3/.test(model)) think = { thinkingLevel: "minimal" }; // 3.x 계열: 생각 최소화(빠르게)
  }
  if (think) generationConfig.thinkingConfig = think;
  if (json) generationConfig.responseMimeType = "application/json";
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || 20000);
  let r, d;
  try {
  r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal: ctl.signal,
    headers: { "content-type": "application/json", "x-goog-api-key": getKey() },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig })
  });
  d = await r.json().catch(() => ({}));
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "시간 초과" : e.message);
  } finally { clearTimeout(timer); }
  if (!r.ok) {
    const msg = (d.error && d.error.message) || ("호출 실패 " + r.status);
    if (think && r.status === 400 && /think/i.test(msg)) return ask(model, prompt, json, true, ms); // thinking 설정이 안 맞으면 빼고 다시
    throw new Error(msg);
  }
  const c = d.candidates && d.candidates[0];
  if (!c) throw new Error("답 없음" + (d.promptFeedback && d.promptFeedback.blockReason ? " (" + d.promptFeedback.blockReason + ")" : ""));
  const text = ((c.content && c.content.parts) || []).map(p => p.text || "").join("");
  if (!text) throw new Error("빈 답 (" + (c.finishReason || "알 수 없음") + ")");
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
  if (!getKey()) {
    const names = Object.keys(process.env).filter(k => /GEM|GOOG|API|KEY/i.test(k) && !/^(AWS|VERCEL_)/.test(k)).join(", ") || "없음";
    return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요 [진단: 환경=" + (process.env.VERCEL_ENV || "?") + ", 비슷한 이름=" + names + "]" });
  }
  const errs = [], T0 = Date.now();
  for (const model of MODELS) {
    const left = 54000 - (Date.now() - T0); // 서버 제한(60초) 안에서 끝내기
    if (left < 6000) { errs.push("남은 시간 부족으로 중단"); break; }
    try {
      const text = await ask(model, prompt, json, false, Math.min(20000, left - 2000));
      if (!json) return res.json({ text });
      const m = text.replace(/```json|```/g, "").match(/\[[\s\S]*\]/);
      if (!m) throw new Error("JSON 배열을 찾지 못함");
      return res.json({ data: JSON.parse(m[0]), model });
    } catch (e) {
      errs.push(model + ": " + e.message);
      if (/API key not valid|API_KEY_INVALID|UNAUTHENTICATED/i.test(e.message)) break; // 키 자체가 틀리면 다른 모델도 소용없음
    }
  }
  return res.status(502).json({ error: "제미나이 모델을 모두 시도했지만 실패했어요 → " + errs.join(" | ") });
};
