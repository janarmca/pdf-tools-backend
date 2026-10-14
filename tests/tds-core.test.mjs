// Unit tests for tds-core.js (run: node tests/tds-core.test.mjs)
import { createRequire } from 'node:module';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'tds-'));
copyFileSync(join(here, '../tds-core.js'), join(dir, 'core.cjs'));       // repo is "type":"module"; file is a classic script
const T = createRequire(import.meta.url)(join(dir, 'core.cjs'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const d = (y, m, day) => new Date(y, m - 1, day);
const same = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// PAN / TAN
ok(T.checkId('ABCPK1234F').ok && T.checkId('abcpk1234f').type.code === 'P', 'PAN individual (lowercase accepted)');
ok(T.checkId('AABCT1332L').kind === 'PAN' && T.checkId('AABCT1332L').type.code === 'C', 'PAN company');
ok(T.checkId('DELA12345B').kind === 'TAN' && T.checkId('DELA12345B').ok, 'TAN valid');
ok(T.checkId(' ABC PK 1234 F ').ok, 'spaces ignored');
ok(!T.checkId('ABCXK1234F').ok && T.checkId('ABCXK1234F').issues[0].code === 'PAN_TYPE', 'PAN with invalid 4th letter');
ok(!T.checkId('ABCPK123F').ok && T.checkId('ABCPK123F').issues[0].code === 'LENGTH', 'short PAN');
ok(!T.checkId('ABCPK12O4F').ok && /0/.test(T.checkId('ABCPK12O4F').issues.map(i => i.en).join()), 'letter O in digit place gets a hint');
ok(!T.checkId('').ok && !T.checkId('AB-PK1234F').ok, 'empty / symbol');
ok(!T.checkId('ABCDE12345').ok, 'wrong pattern');

// deposit dates
ok(same(T.depositDue(2026, 3), d(2026, 5, 7)), 'April deduction -> 7 May');
ok(same(T.depositDue(2026, 2), d(2026, 4, 30)), 'March deduction -> 30 April');
ok(same(T.depositDue(2026, 11), d(2027, 1, 7)), 'December deduction -> 7 January next year');
ok(same(T.challanCumStatementDue(2026, 3), d(2026, 5, 30)), 'challan-cum-statement: April -> 30 May');

// calendar for FY 2026-27 (official: 31 Jul, 31 Oct, 31 Jan, 31 May; Form 130 by 15 June 2027)
const c = T.calendar(2026);
ok(c.newAct && c.forms.sal === 'Form 138' && c.forms.non === 'Form 140' && c.forms.nr === 'Form 144', 'new-Act form numbers');
ok(same(c.returns[0].due, d(2026, 7, 31)) && same(c.returns[1].due, d(2026, 10, 31)) && same(c.returns[2].due, d(2027, 1, 31)) && same(c.returns[3].due, d(2027, 5, 31)), 'quarterly dates FY 2026-27');
ok(same(c.certs[0].due, d(2027, 6, 15)), 'Form 130 due 15 June 2027');
ok(c.deposits.length === 12 && same(c.deposits[11].due, d(2027, 4, 30)) && c.deposits[11].special, 'March 2027 deposit 30 Apr 2027');
const o = T.calendar(2025);
ok(!o.newAct && o.forms.sal === 'Form 24Q' && o.forms.cert === 'Form 16' && same(o.certs[0].due, d(2026, 6, 15)), 'FY 2025-26 uses old form names, Form 16 by 15 June 2026');
ok(same(o.returns[3].due, d(2026, 5, 31)), 'FY 2025-26 Q4 due 31 May 2026 (FAQ Q6.10)');

// months or part
ok(T.monthsOrPart(d(2026, 3, 31), d(2026, 5, 7)) === 2, '31 Mar -> 7 May = 2 months (March deduction deposited in May)');
ok(T.monthsOrPart(d(2026, 4, 10), d(2026, 5, 8)) === 1, '10 Apr -> 8 May = 1 month (part)');
ok(T.monthsOrPart(d(2026, 4, 10), d(2026, 5, 10)) === 2, '10 Apr -> 10 May = 2 months (start and end day both counted)');
ok(T.monthsOrPart(d(2026, 1, 10), d(2026, 1, 20)) === 1, 'same month part = 1');
ok(T.monthsOrPart(d(2026, 4, 10), d(2026, 4, 10)) === 0, 'same day = 0');
ok(T.monthsOrPart(d(2025, 12, 20), d(2026, 2, 5)) === 2, 'across year end: 20 Dec -> 5 Feb = 2 months');

// interest
let r = T.interest('deposit', 100000, d(2026, 3, 31), d(2026, 5, 7));
ok(r.late && r.months === 2 && r.interest === 3000, '₹1,00,000 March deduction deposited 7 May: 1.5% x 2 = ₹3,000');
r = T.interest('deposit', 50000, d(2026, 4, 10), d(2026, 5, 7));
ok(!r.late && r.interest === 0, 'deposit on due date -> no interest');
r = T.interest('deposit', 50000, d(2026, 4, 10), d(2026, 5, 8));
ok(r.late && r.months === 1 && r.interest === 750, '1 day late -> 1 month 1.5% = ₹750');
r = T.interest('deduct', 200000, d(2026, 4, 5), d(2026, 7, 20));
ok(r.months === 4 && r.interest === 8000, 'late deduction: 5 Apr -> 20 Jul = 4 months x 1% x 2,00,000 = ₹8,000');
r = T.interest('deduct', 100, d(2026, 4, 5), d(2026, 4, 4));
ok(r.interest === 0 && /before/.test(r.note), 'reversed dates rejected');
r = T.interest('deposit', 12345.67, d(2026, 6, 1), d(2026, 9, 9));
ok(r.interest === Math.round(12345.67 * 0.015 * r.months * 100) / 100 && r.months === 4, 'paise rounding 1 Jun -> 9 Sep = 4 months');
console.log(fail ? 'FAILED ' + fail : 'ALL TDS-CORE TESTS PASS'); process.exit(fail ? 1 : 0);
