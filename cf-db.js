// Cloudflare D1 access for the Cloud Run server (replaces the Supabase service-role client).
// Every call goes to the pdf-tools-api Worker's internal endpoint, protected by CF_INTERNAL_KEY.
// A batch of statements runs as ONE transaction on D1 (all succeed or none do).
import crypto from 'crypto';

export function createDb(baseUrl, internalKey) {
  const url = String(baseUrl || '').replace(/\/$/, '') + '/internal/sql';

  async function batch(statements) {
    if (!baseUrl || !internalKey) throw new Error('Database is not configured (CF_API_URL / CF_INTERNAL_KEY missing on the server)');
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': internalKey },
      body: JSON.stringify({ statements }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Database error (${r.status})`);
    return j; // { results: [rows[]...], meta: [{ changes, last_row_id }...] }
  }

  return {
    batch,
    async all(sql, ...params) { return (await batch([{ sql, params }])).results[0]; },
    async first(sql, ...params) { return (await batch([{ sql, params }])).results[0][0] || null; },
    async run(sql, ...params) { return (await batch([{ sql, params }])).meta[0]; },
  };
}

// Verifies the access token issued by the Worker (HS256, shared AUTH_JWT_SECRET) — no network call needed.
export function verifyAccessToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  const a = Buffer.from(expected), b = Buffer.from(parts[2]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!p.sub || !p.exp || p.exp * 1000 < Date.now()) return null;
    return { id: p.sub, email: p.email };
  } catch { return null; }
}
