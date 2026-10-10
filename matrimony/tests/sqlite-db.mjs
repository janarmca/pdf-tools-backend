// In-memory stand-in for the Cloud Run `db` client (cf-db.js), backed by a real SQLite database
// with the real Cloudflare D1 schema (cloudflare/migrations). D1 is SQLite, so the SQL behaves the same.
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function sqliteDb() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../cloudflare/migrations');
  const raw = new DatabaseSync(':memory:');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) raw.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
  async function batch(statements) {
    raw.exec('begin');
    try {
      const out = { results: [], meta: [] };
      for (const s of statements) {
        const st = raw.prepare(s.sql);
        const before = raw.prepare('select total_changes() as n').get().n;
        const rows = st.all(...(s.params || []));
        out.results.push(rows.map((r) => ({ ...r })));
        out.meta.push({ changes: raw.prepare('select total_changes() as n').get().n - before });
      }
      raw.exec('commit');
      return out;
    } catch (e) { raw.exec('rollback'); throw e; }
  }
  return {
    raw, batch,
    async all(sql, ...params) { return (await batch([{ sql, params }])).results[0]; },
    async first(sql, ...params) { return (await batch([{ sql, params }])).results[0][0] || null; },
    async run(sql, ...params) { return (await batch([{ sql, params }])).meta[0]; },
  };
}
