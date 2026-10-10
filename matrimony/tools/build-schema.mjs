// Generates supabase/schema.sql = schema.base.sql with the contact filter (from m-filter.js) injected.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const F = createRequire(import.meta.url)(path.join(root, 'm-filter.js'));
const D = F.DATA;
const q = (s) => "$q$" + s + "$q$";           // dollar-quoted literal (no escaping needed)
const arr = (a) => "array[" + a.map(q).join(',') + "]::text[]";
const digitsFrom = D.DIGIT_BLOCKS.map(z => Array.from({ length: 10 }, (_, k) => String.fromCharCode(z + k)).join('')).join('');
const digitsTo = '0123456789'.repeat(D.DIGIT_BLOCKS.length);
const squeezeReason = D.SQUEEZE.map(w => /mail|yahoo|hotmail|outlook|proton|rediff|icloud|dot|rate/.test(w) ? 'email' : 'social');

const sql = `
-- ===== GENERATED from m-filter.js by tools/build-schema.mjs — do not edit by hand =====
create or replace function mat_norm(s text) returns text language plpgsql immutable as $f$
declare t text;
begin
  t := lower(normalize(coalesce(s, ''), NFKC));
  t := regexp_replace(t, ${q('[' + D.STRIP.slice(1, -1) + ']')}, '', 'g');
  t := translate(t, ${q(D.HOMOGLYPH_FROM)}, ${q(D.HOMOGLYPH_TO)});
  t := translate(t, ${q(digitsFrom)}, ${q(digitsTo)});
  return t;
end $f$;

create or replace function mat_digits(a text) returns text language plpgsql immutable as $f$
declare
  t text := a; i int; m text;
  w text[] := ${arr(D.WORDS.map(x => x[0]))};
  d text[] := ${arr(D.WORDS.map(x => x[1]))};
  m2 text[] := ${arr(D.MULT2)};
  m3 text[] := ${arr(D.MULT3)};
begin
  for i in 1..array_length(w, 1) loop t := replace(t, w[i], d[i]); end loop;
  foreach m in array m2 loop t := regexp_replace(t, m || ${q(D.SEP)} || '*([0-9])', '\\1\\1', 'g'); end loop;
  foreach m in array m3 loop t := regexp_replace(t, m || ${q(D.SEP)} || '*([0-9])', '\\1\\1\\1', 'g'); end loop;
  for i in 1..3 loop
    t := regexp_replace(t, ${q('([0-9])(' + D.SEP + '{0,2})o(' + D.SEP + '{0,2})([0-9])')}, '\\1\\2' || '0' || '\\3\\4', 'g');
  end loop;
  t := regexp_replace(t, ${q('(?<![0-9])(0?[1-9]|[12][0-9]|3[01])[-/. ](0?[1-9]|1[0-2])[-/. ](19|20)[0-9][0-9](?![0-9])')}, ' d ', 'g');
  t := regexp_replace(t, ${q('(?<![0-9])(19|20)[0-9][0-9]' + D.SEP + '{0,3}(19|20)[0-9][0-9](?![0-9])')}, ' d ', 'g');
  return t;
end $f$;

create or replace function mat_has_streak(a text) returns boolean language sql immutable as $f$
  select mat_digits(a) ~ ${q('[0-9](' + D.SEP + '{0,3}[0-9]){7,}')};
$f$;

-- returns NULL when the text is fine, otherwise the reason: phone | email | link | social | phrase
create or replace function mat_contact_check(txt text, prev text[] default '{}') returns text language plpgsql immutable as $f$
declare
  a text := mat_norm(txt); sq text; i int; n int; p text[] := '{}'; x text;
  rules_re text[] := ${arr(D.RULES.map(r => r[1]))};
  rules_id text[] := ${arr(D.RULES.map(r => r[0]))};
  native text[] := ${arr(D.NATIVE)};
  squeeze text[] := ${arr(D.SQUEEZE)};
  squeeze_id text[] := ${arr(squeezeReason)};
begin
  if a = '' then return null; end if;
  for i in 1..array_length(rules_re, 1) loop
    if a ~ rules_re[i] then return rules_id[i]; end if;
  end loop;
  for i in 1..array_length(native, 1) loop
    if position(native[i] in a) > 0 then return 'phrase'; end if;
  end loop;
  sq := translate(a, ${q(D.LEET_FROM)}, ${q(D.LEET_TO)});
  sq := regexp_replace(sq, ${q(D.SEP)}, '', 'g');
  for i in 1..array_length(squeeze, 1) loop
    if position(squeeze[i] in sq) > 0 then return squeeze_id[i]; end if;
  end loop;
  if mat_has_streak(a) then return 'phone'; end if;
  n := coalesce(array_length(prev, 1), 0);
  if n > 0 then
    for i in greatest(1, n - 2)..n loop
      x := mat_norm(prev[i]);
      if x <> '' then p := p || x; end if;
    end loop;
    if array_length(p, 1) > 0 and mat_digits(a) ~ '[0-9]' then
      if mat_has_streak(array_to_string(p || a, ' ')) then return 'phone'; end if;
    end if;
  end if;
  return null;
end $f$;
-- ===== end generated =====
`;
const base = fs.readFileSync(path.join(root, 'supabase', 'schema.base.sql'), 'utf8');
if (!base.includes('-- @@FILTER@@')) throw new Error('placeholder missing');
fs.writeFileSync(path.join(root, 'supabase', 'schema.sql'), base.replace('-- @@FILTER@@', sql));
console.log('schema.sql written', fs.statSync(path.join(root, 'supabase', 'schema.sql')).size, 'bytes');
