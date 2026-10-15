// node tests/hub-core.test.mjs — DA/DR arrears, attendance and .ics reminders (pure functions)
import { createRequire } from 'node:module';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'hub-')); copyFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'hub-core.js'), join(dir, 'hub-core.cjs')); // package is type:module, the file is a browser UMD script
const H = createRequire(import.meta.url)(join(dir, 'hub-core.cjs'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

// ---- DA arrears: hand-computed
let r = H.daArrears({ basic: 50000, oldDa: 58, newDa: 60, from: '2026-01', to: '2026-03' });
ok(r.ok && r.months === 3 && r.rows[0].daOld === 29000 && r.rows[0].daNew === 30000 && r.rows[0].diff === 1000 && r.total === 3000, '50,000 basic, 58%→60%, Jan–Mar = 1,000 x 3 = 3,000');
r = H.daArrears({ basic: 37700, oldDa: 58, newDa: 60, from: '2026-01', to: '2026-01' });
ok(r.rows[0].daOld === 21866 && r.rows[0].daNew === 22620 && r.total === 754, '37,700 basic: 21,866 -> 22,620 (rounded to nearest rupee), diff 754');
r = H.daArrears({ basic: 20001, oldDa: 58, newDa: 60, from: '2026-01', to: '2026-01', round: 'none' });
ok(Math.abs(r.total - 400.02) < 1e-9, 'no rounding keeps paise (20,001 x 2% = 400.02)');
r = H.daArrears({ basic: 20001, oldDa: 58, newDa: 60, from: '2026-01', to: '2026-01', round: 'up' });
ok(r.rows[0].daOld === 11601 && r.rows[0].daNew === 12001, 'round up: 11,600.58 -> 11,601 and 12,000.6 -> 12,001');
r = H.daArrears({ basic: 40000, oldDa: 58, newDa: 60, from: '2025-12', to: '2026-02', incMonth: '2026-01', basic2: 41200 });
ok(r.rows[0].basic === 40000 && r.rows[1].basic === 41200 && r.rows[2].basic === 41200 && r.total === 800 + 824 + 824, 'increment month switches the basic from that month');
r = H.daArrears({ basic: 40000, oldDa: 58, newDa: 60, from: '2025-11', to: '2026-02' });
ok(r.rows.map(x => x.month).join() === 'Nov 2025,Dec 2025,Jan 2026,Feb 2026', 'months cross the year end correctly');
ok(!H.daArrears({ basic: 0, oldDa: 58, newDa: 60, from: '2026-01', to: '2026-02' }).ok && H.daArrears({ basic: 1, oldDa: 58, newDa: 60, from: '2026-03', to: '2026-01' }).error === 'period' && H.daArrears({ basic: 1, oldDa: -1, newDa: 60, from: '2026-01', to: '2026-01' }).error === 'rate' && H.daArrears({ basic: 1, oldDa: 5, newDa: 6, from: '2026-13', to: '2026-14' }).error === 'period' && H.daArrears({ basic: 1, oldDa: 5, newDa: 6, from: '2000-01', to: '2026-01' }).error === 'long', 'bad basic / period / rate / 10-year limit are rejected');
r = H.daArrears({ basic: 30000, oldDa: 60, newDa: 58, from: '2026-01', to: '2026-01' });
ok(r.ok && r.total === -600, 'a lower new rate gives a negative (recovery) amount');

// ---- attendance
let a = H.attendance(60, 90, 75);
ok(a.status === 'low' && a.need === 30 && (60 + 30) / (90 + 30) >= .75 && (60 + 29) / (90 + 29) < .75, '60/90 at 75%: attend 30 in a row (exact)');
a = H.attendance(80, 100, 75);
ok(a.status === 'ok' && a.canMiss === 6 && 80 / 106 >= .75 && 80 / 107 < .75, '80/100: may miss 6 more classes and stay >= 75%');
a = H.attendance(75, 100, 75); ok(a.status === 'ok' && a.canMiss === 0 && a.pct === 75, 'exactly 75% counts as meeting 75%, 0 spare');
a = H.attendance(0, 10, 75); ok(a.status === 'low' && a.need === 30, '0/10 needs 30 in a row');
ok(H.attendance(5, 4, 75).error === 'input' && H.attendance(1, 0, 75).error === 'input' && H.attendance(1.5, 4, 75).error === 'input' && H.attendance(3, 4, 100).error === 'target' && H.attendance(3, 4, 0).error === 'target', 'invalid inputs rejected');
let allOk = true; for (let t = 1; t <= 60; t++) for (let at = 0; at <= t; at += 1) for (const tg of [50, 65, 75, 80, 85]) { const x = H.attendance(at, t, tg); if (x.status === 'low') { if (!((at + x.need) * 100 >= tg * (t + x.need)) || (x.need > 1 && (at + x.need - 1) * 100 >= tg * (t + x.need - 1))) allOk = false; } else if (!(at * 100 >= tg * (t + x.canMiss)) || at * 100 >= tg * (t + x.canMiss + 1)) allOk = false; }
ok(allOk, 'brute-force check: need/canMiss are exact minimum/maximum for 60 x all x 5 targets');

// ---- .ics
const ics = H.makeIcs([{ title: 'TDS Form 138, Q2; due', date: '2026-10-31', note: 'Line1\nLine2, with comma', alarmDays: 3 }, { title: 'x', date: '2026-02-31' }, { title: 'No date' }], new Date('2026-10-16T01:02:03Z'));
ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n') && (ics.match(/BEGIN:VEVENT/g) || []).length === 1, 'valid wrapper, impossible / missing dates are skipped');
ok(/DTSTART;VALUE=DATE:20261031\r\n/.test(ics) && /DTEND;VALUE=DATE:20261101\r\n/.test(ics) && /DTSTAMP:20261016T010203Z/.test(ics), 'all-day event 31 Oct (end is the next day)');
ok(/SUMMARY:TDS Form 138\\, Q2\; due/.test(ics) && /DESCRIPTION:Line1\\nLine2\\, with comma/.test(ics), 'commas, semicolons and newlines are escaped');
ok(/TRIGGER:-P3DT0H/.test(ics), 'reminder 3 days before');
ok(/TRIGGER:-PT0S/.test(H.makeIcs([{ title: 'a', date: '2026-10-31', alarmDays: 0 }])), 'alarmDays 0 reminds on the day');
const tam = H.makeIcs([{ title: 'தமிழ் தலைப்பு '.repeat(12), date: '2026-12-01' }]);
ok(tam.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75), 'Tamil lines folded to <= 75 bytes');
ok(tam.replace(/\r\n /g, '').includes('SUMMARY:' + 'தமிழ் தலைப்பு '.repeat(12)), 'unfolding restores the Tamil text exactly');
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
