const KEY = "AIzaSyDjfwyC4gw0WIX6gBbpXApzQ-tPdVaaoFU";
const PROJECT = "wordquest-wordi";
// Firebase ID 토큰을 확인하고, teachers/{이메일} 문서가 있으면 교사로 판단합니다.
async function verify(req) {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!t) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${KEY}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: t })
  });
  if (!r.ok) return null;
  const d = await r.json();
  const email = d.users && d.users[0] && d.users[0].email;
  if (!email) return null;
  const f = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/teachers/${encodeURIComponent(email)}`, {
    headers: { Authorization: "Bearer " + t }
  });
  return { email, teacher: f.status === 200 };
}
module.exports = { verify };
