import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const PG = process.env.PGLITE_DIR || path.join(process.cwd(), 'node_modules/@electric-sql/pglite');
export async function makeDb() {
  const mod = await import(pathToFileURL(path.join(PG, 'dist/index.js')).href);
  const db = new mod.PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  const sql = fs.readFileSync(path.join(here, '../supabase/schema.sql'), 'utf8');
  await db.exec(sql);
  return db;
}
