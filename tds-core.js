/* tds-core.js — pure, deterministic helpers for the TDS tools (no AI, no network, no storage).
 * Used by category-tds.js in the browser and by tests/tds-core.test.mjs in Node.
 *
 * Every rule below was checked against the Income Tax Department's own pages (Oct 2026):
 *  - FAQs on the transition to the Income-tax Act 2025 (Q2.3, Q2.4, Q6.1, Q6.8, Q6.9, Q6.10, Q2.13)
 *  - Form 138 FAQ / guidance note (quarterly due dates), Form 130 FAQ (certificate due 15 June)
 *  - Income-tax Act 2025 s.398(3)(a): interest 1% per month or part (failure to deduct) and 1.5% per month or part
 *    (failure to deposit after deduction)
 * Anything that could not be confirmed from those pages is NOT implemented (TDS rate table, late fee, TCS dates, Form 131 date).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TdsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Date these rules were last checked against the official pages (see .github/tax-sources.json; a weekly
  // workflow opens an issue when one of those pages changes). Update this when the tools are re-verified.
  const RULES = { asOf: '2026-10-15', basis: 'Income-tax Act 2025 / Income-tax Rules 2026 (incometaxindia.gov.in)' };

  /* ---------------- PAN / TAN ---------------- */
  const PAN_TYPES = {
    A: ['Association of Persons (AOP)', 'நபர்கள் சங்கம் (AOP)'],
    B: ['Body of Individuals (BOI)', 'தனிநபர்கள் குழு (BOI)'],
    C: ['Company', 'நிறுவனம் (Company)'],
    F: ['Firm / LLP', 'கூட்டு நிறுவனம் / LLP'],
    G: ['Government', 'அரசு'],
    H: ['Hindu Undivided Family (HUF)', 'இந்து கூட்டுக் குடும்பம் (HUF)'],
    J: ['Artificial Juridical Person', 'செயற்கை சட்ட நபர்'],
    L: ['Local Authority', 'உள்ளாட்சி அமைப்பு'],
    P: ['Individual', 'தனிநபர்'],
    T: ['Trust (AOP-Trust)', 'அறக்கட்டளை']
  };
  const DIGIT_FIX = { O: '0', I: '1', L: '1', S: '5', B: '8', Z: '2', G: '6', Q: '0', D: '0' };
  const LETTER_FIX = { '0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z', '6': 'G' };

  function clean(s) { return String(s == null ? '' : s).toUpperCase().replace(/[\s ​-‍﻿]+/g, '').replace(/[^A-Z0-9]/g, '-'); }

  // returns {ok, kind:'PAN'|'TAN'|null, value, issues:[codes/text], type?}
  function checkId(raw) {
    const value = clean(raw);
    const out = { input: String(raw == null ? '' : raw).trim(), value, kind: null, ok: false, issues: [], type: null };
    if (!value) { out.issues.push({ code: 'EMPTY', en: 'Empty', ta: 'காலி' }); return out; }
    if (/-/.test(value)) { out.issues.push({ code: 'CHARS', en: 'Contains a character other than letters and digits', ta: 'எழுத்து/எண் தவிர வேறு குறியீடு உள்ளது' }); return out; }
    const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);
    const isTan = /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(value);
    if (isPan) {
      out.kind = 'PAN';
      const t = value[3];
      if (!PAN_TYPES[t]) { out.issues.push({ code: 'PAN_TYPE', en: `4th letter "${t}" is not a valid PAN holder type (valid: ${Object.keys(PAN_TYPES).join(', ')})`, ta: `4-வது எழுத்து "${t}" செல்லுபடியாகும் PAN வகை அல்ல` }); return out; }
      out.type = { code: t, en: PAN_TYPES[t][0], ta: PAN_TYPES[t][1] };
      out.ok = true; return out;
    }
    if (isTan) { out.kind = 'TAN'; out.ok = true; return out; }
    // explain what is wrong
    if (value.length !== 10) {
      out.issues.push({ code: 'LENGTH', en: `Length is ${value.length}; PAN and TAN must be exactly 10 characters`, ta: `நீளம் ${value.length}; PAN, TAN சரியாக 10 எழுத்துகள் இருக்க வேண்டும்` });
      return out;
    }
    // length 10 but wrong pattern: describe against the closer of PAN / TAN
    const panPat = 'LLLLLDDDDL', tanPat = 'LLLLDDDDDL';
    const score = pat => { let m = 0; for (let i = 0; i < 10; i++) { const isL = /[A-Z]/.test(value[i]); if ((pat[i] === 'L') === isL) m++; } return m; };
    const pat = score(panPat) >= score(tanPat) ? panPat : tanPat; const kind = pat === panPat ? 'PAN' : 'TAN';
    out.kind = kind;
    for (let i = 0; i < 10; i++) {
      const c = value[i]; const wantLetter = pat[i] === 'L'; const isL = /[A-Z]/.test(c);
      if (wantLetter !== isL) {
        const hint = wantLetter ? LETTER_FIX[c] : DIGIT_FIX[c];
        out.issues.push({ code: 'POS', en: `Position ${i + 1} should be a ${wantLetter ? 'letter' : 'digit'} but is "${c}"${hint ? ` (did you mean "${hint}"?)` : ''} — as a ${kind}`, ta: `இடம் ${i + 1}-ல் ${wantLetter ? 'எழுத்து' : 'எண்'} இருக்க வேண்டும்; "${c}" உள்ளது${hint ? ` ("${hint}" ஆக இருக்குமா?)` : ''} — ${kind} என்று கணித்தால்` });
      }
    }
    return out;
  }

  /* ---------------- dates ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function parseISO(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null; }
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_TA = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];

  // Deposit due date for tax deducted in (year, month0). Non-government deductor, ordinary challan:
  // 7th of the following month; for March deductions, 30 April (official FAQ Q6.8).
  function depositDue(year, month0) {
    if (month0 === 2) return new Date(year, 3, 30);
    return new Date(month0 === 11 ? year + 1 : year, (month0 + 1) % 12, 7);
  }
  // Challan-cum-statement cases: 30 days after the end of the month (official FAQ Q6.8).
  function challanCumStatementDue(year, month0) {
    const end = new Date(year, month0 + 1, 0); const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 30); return d;
  }

  // startYear = first calendar year of the financial / tax year (2026 => FY 2026-27)
  function calendar(startYear) {
    const newAct = startYear >= 2026;
    const fy = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    const forms = newAct
      ? { sal: 'Form 138', non: 'Form 140', nr: 'Form 144', cert: 'Form 130', certNote: 'Form 130 (salary) — must be downloaded from TRACES' }
      : { sal: 'Form 24Q', non: 'Form 26Q', nr: 'Form 27Q', cert: 'Form 16', certNote: 'Form 16 (salary) — downloaded from TRACES' };
    const deposits = [];
    for (let k = 0; k < 12; k++) {
      const m0 = (3 + k) % 12; const y = startYear + (3 + k >= 12 ? 1 : 0);
      deposits.push({ forMonth: `${MON[m0]} ${y}`, forMonthTa: `${MON_TA[m0]} ${y}`, due: depositDue(y, m0), challanCum: challanCumStatementDue(y, m0), special: m0 === 2 });
    }
    const returns = [
      { q: 'Q1 (Apr–Jun)', due: new Date(startYear, 6, 31) },
      { q: 'Q2 (Jul–Sep)', due: new Date(startYear, 9, 31) },
      { q: 'Q3 (Oct–Dec)', due: new Date(startYear + 1, 0, 31) },
      { q: 'Q4 (Jan–Mar)', due: new Date(startYear + 1, 4, 31) }
    ];
    // the annual salary certificate is issued by 15 June of the financial year after the tax year (Form 130 FAQ)
    const certs = [{ name: forms.certNote, due: new Date(startYear + 1, 5, 15), forYear: fy }];
    return { fy, newAct, forms, deposits, returns, certs };
  }

  /* ---------------- interest (Income-tax Act 2025 s.398(3)(a)) ---------------- */
  // "per month or part of a month": a period from start to end counts every started month.
  // Counting convention (both start and end day included): the period 10 Jan .. 9 Feb is one month; 10 Jan .. 10 Feb is two.
  function monthsOrPart(start, end) {
    if (!(end > start)) return 0;
    let m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() >= start.getDate()) m += 1;
    return Math.max(m, 1);
  }
  // kind: 'deduct' => 1% (tax not deducted / deducted late), 'deposit' => 1.5% (deducted but deposited late)
  function interest(kind, amount, from, to, opt) {
    opt = opt || {};
    const rate = kind === 'deduct' ? 1 : 1.5;
    const res = { kind, rate, amount, from, to, months: 0, interest: 0, note: '', due: null, late: true };
    if (!(amount > 0)) { res.note = 'Enter the TDS amount'; return res; }
    if (!from || !to) { res.note = 'Enter both dates'; return res; }
    if (to < from) { res.note = 'The later date is before the earlier date'; return res; }
    if (kind === 'deposit') {
      const due = depositDue(from.getFullYear(), from.getMonth()); res.due = due;
      if (to <= due) { res.late = false; res.note = 'Deposited on or before the due date — no interest for late deposit'; return res; }
    }
    if (kind === 'deduct' && +to === +from) { res.late = false; res.note = 'Deducted on the date it was deductible — no interest'; return res; }
    res.months = monthsOrPart(from, to);
    res.interest = Math.round(amount * rate / 100 * res.months * 100) / 100;
    return res;
  }

  /* ---------------- late filing fee (Income-tax Act 2025 s.427(1),(2); old Act s.234E) ---------------- */
  // Rs 200 for every day the failure continues, never more than the tax deductible; must be paid before the statement is delivered.
  // Days = filing date minus due date (filing on the due date = 0 days).
  function lateFee(due, filed, tdsAmount) {
    const res = { days: 0, perDay: 200, uncapped: 0, fee: 0, capped: false, late: false, note: '' };
    if (!due || !filed) { res.note = 'Enter the filing date'; return res; }
    if (!(tdsAmount >= 0)) { res.note = 'Enter the TDS amount'; return res; }
    const days = Math.round((Date.UTC(filed.getFullYear(), filed.getMonth(), filed.getDate()) - Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())) / 864e5);
    if (days <= 0) { res.note = 'Filed on or before the due date — no late fee'; return res; }
    res.late = true; res.days = days; res.uncapped = 200 * days; res.fee = Math.min(res.uncapped, tdsAmount); res.capped = res.uncapped > tdsAmount;
    return res;
  }

  return { RULES, lateFee, checkId, PAN_TYPES, parseISO, iso, depositDue, challanCumStatementDue, calendar, monthsOrPart, interest, MON, MON_TA, DAY, DAY_TA, pad };
}));
