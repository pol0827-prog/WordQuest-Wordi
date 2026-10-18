const { verify } = require("./_auth");
const HOSTS = (process.env.ALLOWED_HOSTS || "horaeng.com").split(",").map(s => s.trim());
const allowed = u => { try { const x = new URL(u); return x.protocol === "https:" && HOSTS.some(h => x.hostname === h || x.hostname.endsWith("." + h)); } catch (e) { return false; } };
const UA = { "user-agent": "Mozilla/5.0" };
async function getPdf(u) {
  const r = await fetch(u, { headers: UA });
  if (!r.ok || !/pdf/i.test(r.headers.get("content-type") || "")) return null;
  return Buffer.from(await r.arrayBuffer());
}
module.exports = async (req, res) => {
  const u = await verify(req);
  if (!u || !u.teacher) return res.status(403).json({ error: "교사 계정만 쓸 수 있어요" });
  const { g, y, m, url } = req.query;
  let buf = null;
  if (url) {
    if (!allowed(url)) return res.status(400).json({ error: "허용되지 않은 주소예요 (ALLOWED_HOSTS 확인)" });
    buf = await getPdf(url);
  } else {
    if (!/^[1-3]$/.test(g || "") || !/^20\d\d$/.test(y || "") || !/^\d{1,2}$/.test(m || "")) return res.status(400).json({ error: "학년·연도·월을 확인해 주세요" });
    // 1) 호랭이닷컴의 파일 이름 규칙으로 바로 시도
    buf = await getPdf(encodeURI(`https://horaeng.com/wp-content/uploads/${y}년-${m}월-고${g}-모의고사-국어-문제.pdf`));
    // 2) 안 되면 사이트 검색으로 게시글을 찾아 국어 문제 PDF 링크를 찾음
    if (!buf) {
      const q = encodeURIComponent(`${y}년 ${m}월 고${g} 모의고사`);
      const r = await fetch(`https://horaeng.com/wp-json/wp/v2/posts?search=${q}&per_page=5&_fields=title,content`, { headers: UA });
      if (r.ok) {
        for (const p of await r.json()) {
          const html = (p.content && p.content.rendered) || "";
          const hit = [...html.matchAll(/href="([^"]+\.pdf)"/gi)].map(x => { try { return decodeURIComponent(x[1]); } catch (e) { return x[1]; } })
            .find(l => /국어/.test(l) && /문제/.test(l) && allowed(l));
          if (hit && (buf = await getPdf(encodeURI(hit)))) break;
        }
      }
    }
  }
  if (!buf) return res.status(404).json({ error: "해당 자료를 찾지 못했어요. PDF 주소를 직접 입력해 보세요." });
  if (buf.length > 4.4e6) return res.status(413).json({ error: "PDF가 너무 커서(4.4MB 초과) 가져올 수 없어요. 파일을 직접 올려 주세요." });
  res.setHeader("content-type", "application/pdf");
  res.send(buf);
};
