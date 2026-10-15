/* hub-core.js — pure, deterministic helpers for the "Government employee" and "Student" hubs (no AI, no network, no storage).
 * Used by category-extra.js (DA/DR arrears calculator, attendance calculator), by the hub pages (calendar reminders)
 * and by tests/hub-core.test.mjs.
 *
 * What is verified and what is not (Oct 2026): see HANDOFF.md "Hubs". The DA/DR presets are only PRESETS the user can edit —
 * the calculator never silently assumes a rate. The 75 % attendance figure is only a default target; colleges differ.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HubCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RULES = { asOf: '2026-10-16' };
  // Presets for the DA/DR calculator. Each says how well it is sourced; the page shows `note` next to the button.
  const DA_PRESETS = [
    { id: 'jan2026', old: 58, now: 60, from: '2026-01', label: '58% → 60% (1 Jan 2026)',
      note: 'TN pensioners: G.O.Ms.No.98, Finance (Pension) Dept, 14 May 2026 (date on the copy is uncertain). Serving employees: reported in the news, G.O. number not confirmed — check your office order.' },
  ];

  const pad = n => (n < 10 ? '0' : '') + n;
  const ym = (y, m) => y * 12 + (m - 1);
  function parseYM(s) { const m = /^(\d{4})-(\d{2})$/.exec(String(s || '')); if (!m) return null; const mo = +m[2]; return mo >= 1 && mo <= 12 ? { y: +m[1], m: mo } : null; }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lbl = i => `${MONTHS[((i % 12) + 12) % 12]} ${Math.floor(i / 12)}`;

  // Rounding of a monthly DA amount. 'nearest' (50 paise and above goes up) is the common rule on pay bills;
  // 'none' keeps paise. Your office may round differently — the page says so.
  function roundAmt(x, mode) {
    if (mode === 'none') return Math.round((x + Number.EPSILON) * 100) / 100;
    if (mode === 'up') return Math.ceil(x - 1e-9);
    return Math.floor(x + 0.5 + 1e-9);
  }

  /* DA / DR arrears.
   * o = { basic, oldDa, newDa, from:'YYYY-MM', to:'YYYY-MM', round:'nearest'|'up'|'none', incMonth?:'YYYY-MM', basic2? }
   * monthly arrears = DA at the new rate − DA at the old rate, each rounded, on the basic (pay or pension) of that month.
   * An optional increment month switches the basic to basic2 from that month on. */
  function daArrears(o) {
    const res = { ok: false, error: '', rows: [], total: 0, months: 0 };
    const a = parseYM(o.from), b = parseYM(o.to), inc = o.incMonth ? parseYM(o.incMonth) : null;
    if (!(o.basic > 0)) { res.error = 'basic'; return res; }
    if (!(o.oldDa >= 0 && o.newDa >= 0 && o.oldDa <= 500 && o.newDa <= 500)) { res.error = 'rate'; return res; }
    if (!a || !b || ym(b.y, b.m) < ym(a.y, a.m)) { res.error = 'period'; return res; }
    if (ym(b.y, b.m) - ym(a.y, a.m) > 120) { res.error = 'long'; return res; }
    if (o.incMonth && (!inc || !(o.basic2 > 0))) { res.error = 'increment'; return res; }
    const mode = o.round || 'nearest';
    for (let i = ym(a.y, a.m); i <= ym(b.y, b.m); i++) {
      const basic = inc && o.basic2 > 0 && i >= ym(inc.y, inc.m) ? o.basic2 : o.basic;
      const daOld = roundAmt(basic * o.oldDa / 100, mode), daNew = roundAmt(basic * o.newDa / 100, mode);
      res.rows.push({ month: lbl(i), basic, daOld, daNew, diff: Math.round((daNew - daOld) * 100) / 100 });
    }
    res.total = Math.round(res.rows.reduce((s, r) => s + r.diff, 0) * 100) / 100;
    res.months = res.rows.length; res.ok = true; return res;
  }

  /* Attendance.
   * attended, total (classes held so far), target % (default 75).
   * pct = attended / total. If below target: classes to attend IN A ROW (every one) to reach it:
   *   (attended + n) / (total + n) >= target/100  =>  n >= (target·total − 100·attended) / (100 − target).
   * If at/above target: classes you may still miss (and not attend any more) keeping >= target:
   *   attended / (total + m) >= target/100  =>  m <= 100·attended/target − total. */
  function attendance(attended, total, target) {
    const t = target == null ? 75 : target;
    const r = { ok: false, error: '', pct: 0, status: '', need: 0, canMiss: 0, target: t };
    if (!(total > 0) || !(attended >= 0) || attended > total || !Number.isInteger(total) || !Number.isInteger(attended)) { r.error = 'input'; return r; }
    if (!(t > 0 && t < 100)) { r.error = 'target'; return r; }
    r.pct = attended * 100 / total;
    const meets = attended * 100 >= t * total - 1e-9;
    if (meets) { r.status = 'ok'; r.canMiss = Math.max(0, Math.floor(100 * attended / t - total + 1e-9)); }
    else { r.status = 'low'; r.need = Math.ceil((t * total - 100 * attended) / (100 - t) - 1e-9); }
    r.ok = true; return r;
  }

  /* Calendar reminders (.ics, RFC 5545). events: [{ title, date:'YYYY-MM-DD', note?, alarmDays? }] — all-day events with a reminder
   * `alarmDays` days before (default 1) at 09:00. Lines are folded at 75 octets and text is escaped, so every calendar app accepts it. */
  const icsEsc = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function fold(line) {
    const enc = new TextEncoder(), out = []; let cur = '', bytes = 0;
    for (const ch of line) { const n = enc.encode(ch).length; if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; } cur += ch; bytes += n; }
    out.push(cur); return out.map((l, i) => (i ? ' ' + l : l)).join('\r\n');
  }
  function makeIcs(events, now) {
    const d = now || new Date(), stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PDF Tools India//Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    let n = 0;
    for (const e of events || []) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date || ''); if (!m || !e.title) continue;
      const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (dt.getUTCMonth() !== +m[2] - 1) continue; // 2026-02-31 etc.
      const next = new Date(dt.getTime() + 864e5), ds = `${m[1]}${m[2]}${m[3]}`, de = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
      const days = e.alarmDays == null ? 1 : e.alarmDays;
      L.push('BEGIN:VEVENT', `UID:${ds}-${++n}-${(e.title || '').length}@pdftoolsindia.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${de}`, 'SUMMARY:' + icsEsc(e.title));
      if (e.note) L.push('DESCRIPTION:' + icsEsc(e.note));
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), `TRIGGER:-P${Math.max(0, days)}DT0H`.replace('-P0DT0H', '-PT0S'), 'END:VALARM', 'END:VEVENT');
    }
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  return { RULES, DA_PRESETS, daArrears, attendance, makeIcs, roundAmt, parseYM };
}));
