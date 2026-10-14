/* category-tds.js — lazy-loaded TDS & DSC helper tools for pdftoolsindia.com
 *
 *   pantan      PAN / TAN checker (bulk)
 *   tdsdates    TDS due-date calendar (FY / Tax Year)
 *   tdsinterest TDS late-interest calculator (s.398(3)(a))
 *   dscbulk     Bulk signature check for Form 16 / Form 130 PDFs or a TRACES ZIP
 *
 * Free, browser-only, no AI. Logic lives in tds-core.js (window.TdsCore) and dsc-verify.js (window.DscVerify);
 * both are loaded through TOOL_LIBS before mount(). Globals used from the host page:
 *   TOOL_IMPL, el, escapeHtml, downloadBlob, readFileAsArrayBuffer, mountUploader, mountProgress, __appLang
 */
(function () {
  'use strict';
  function isEn() { try { return typeof __appLang !== 'undefined' && __appLang === 'en'; } catch (e) { return false; } }
  const T = (ta, en) => (isEn() ? en + ' · ' + ta : ta + ' · ' + en);
  const esc = s => escapeHtml(String(s == null ? '' : s));
  const core = () => window.TdsCore;
  const fmtDate = d => d ? `${String(d.getDate()).padStart(2, '0')} ${core().MON[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '—';
  const wday = d => core().DAY[d.getDay()] + ' / ' + core().DAY_TA[d.getDay()];
  const inr = n => '₹ ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const todayLocal = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const csvCell = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csvBlob = rows => new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const card = 'border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:10px 0;background:var(--card,#fff);';
  const th = 'text-align:left;padding:6px 8px;border-bottom:2px solid var(--line);font-size:12.5px;white-space:nowrap;';
  const td = 'padding:6px 8px;border-bottom:1px solid var(--line);font-size:13px;vertical-align:top;';
  const SRC = {
    faq: 'https://www.incometaxindia.gov.in/documents/81799/11848482/FAQs-on-Interplay-and-Transition.pdf',
    f138: 'https://www.incometaxindia.gov.in/documents/d/guest/form-138-faqs',
    f130: 'https://www.incometaxindia.gov.in/documents/d/guest/form-130-faqs',
    forms: 'https://www.incometaxindia.gov.in/w/faqs-on-forms-as-per-income-tax-rules-2026-1'
  };
  const srcLink = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`;

  /* ====================================================================
   * PAN / TAN checker
   * ==================================================================== */
  TOOL_IMPL.pantan = {
    mount(container) {
      const body = el(`<div class="tamil"></div>`); container.appendChild(body);
      body.innerHTML = `
        <div class="note">${T('PAN / TAN எண்களை (ஒவ்வொரு வரியில் ஒன்று) ஒட்டுங்கள். TDS return-ல் தவறான PAN வடிவம் இருந்தால் பிழை வரும்; அதை முன்கூட்டியே கண்டுபிடிக்க உதவும். Excel-ல் இருந்து ஒரு column-ஐ நகலெடுத்து ஒட்டலாம்.', 'Paste PAN / TAN numbers, one per line (or a column from Excel). Catches format mistakes before a TDS return is filed.')}</div>
        <div class="field" style="margin:8px 0;"><textarea id="ptIn" rows="8" spellcheck="false" autocomplete="off" style="width:100%;font-family:monospace;font-size:14px;padding:10px;border:1px solid var(--line);border-radius:10px;" placeholder="ABCPK1234F\nDELA12345B\nAABCT1332L"></textarea></div>
        <div class="btn-row"><button class="btn" id="ptGo">🪪 ${T('சரிபார்', 'Check')}</button><button class="btn" id="ptClr" style="background:#fff;color:var(--ink);border:1px solid var(--line);">${T('அழி', 'Clear')}</button></div>
        <div id="ptOut"></div>
        <div class="note" style="font-size:12.5px;line-height:1.6;margin-top:12px;"><b>${T('இது எதைச் சரிபார்க்கிறது', 'What this checks')}</b><br>✅ ${T('வடிவம் மட்டும்: PAN = 5 எழுத்து + 4 எண் + 1 எழுத்து (4-வது எழுத்து வகையைக் காட்டும்); TAN = 4 எழுத்து + 5 எண் + 1 எழுத்து.', 'Format only: PAN = 5 letters + 4 digits + 1 letter (4th letter shows the holder type); TAN = 4 letters + 5 digits + 1 letter.')}<br>ℹ️ ${T('PAN உண்மையில் உள்ளதா, யாருடையது, Aadhaar இணைப்பு உள்ளதா என்பதை இணையமின்றிச் சரிபார்க்க முடியாது. அதற்கு வருமான வரி e-filing தளத்தின் “Verify PAN” அல்லது TRACES-ஐப் பயன்படுத்துங்கள்.', 'It cannot tell whether a PAN really exists, whose it is, or if it is linked to Aadhaar — use “Verify PAN” on the Income Tax e-filing portal or TRACES for that.')}</div>`;
      const inp = body.querySelector('#ptIn'), out = body.querySelector('#ptOut');
      let rows = [];
      function run() {
        const lines = inp.value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length);
        const seen = {}; rows = lines.map((l, i) => { const r = core().checkId(l.split(/[\t,;]/)[0]); r.line = i + 1; if (r.ok) { seen[r.value] = (seen[r.value] || 0) + 1; } return r; });
        rows.forEach(r => { if (r.ok && seen[r.value] > 1) r.dup = true; });
        const good = rows.filter(r => r.ok).length, bad = rows.length - good, dups = Object.keys(seen).filter(k => seen[k] > 1).length;
        if (!rows.length) { out.innerHTML = ''; return; }
        let h = `<div style="${card}"><b>${rows.length}</b> ${T('எண்கள்', 'numbers')} — <span style="color:#1E8449;font-weight:700;">✅ ${good} ${T('சரி', 'OK')}</span> · <span style="color:#C0392B;font-weight:700;">❌ ${bad} ${T('தவறு', 'wrong')}</span>${dups ? ` · <span style="color:#B9770E;font-weight:700;">⚠️ ${dups} ${T('மீண்டும் வருபவை', 'duplicated')}</span>` : ''}</div>`;
        h += `<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;"><tr><th style="${th}">#</th><th style="${th}">${T('உள்ளிட்டது', 'Entered')}</th><th style="${th}">${T('வகை', 'Type')}</th><th style="${th}">${T('முடிவு', 'Result')}</th></tr>`;
        rows.forEach(r => {
          const kind = r.ok ? (r.kind === 'PAN' ? `PAN · ${esc(isEn() ? r.type.en : r.type.ta)}` : 'TAN') : (r.kind || '—');
          const res = r.ok ? `✅ ${T('வடிவம் சரி', 'Format OK')}${r.dup ? ` · ⚠️ ${T('மீண்டும் உள்ளது', 'duplicate')}` : ''}` : '❌ ' + r.issues.map(i => esc(isEn() ? i.en : i.ta)).join('<br>');
          h += `<tr><td style="${td}">${r.line}</td><td style="${td}font-family:monospace;">${esc(r.input)}</td><td style="${td}">${kind}</td><td style="${td}">${res}</td></tr>`;
        });
        h += `</table></div><div class="btn-row" style="margin-top:8px;"><button class="btn" id="ptCsv" style="background:#fff;color:var(--ink);border:1px solid var(--line);">⬇️ CSV</button><button class="btn" id="ptCpV" style="background:#fff;color:var(--ink);border:1px solid var(--line);">📋 ${T('சரியானவற்றை நகலெடு', 'Copy valid ones')}</button></div>`;
        out.innerHTML = h;
        out.querySelector('#ptCsv').onclick = () => downloadBlob(csvBlob([['Line', 'Entered', 'Normalised', 'Type', 'Holder type', 'Result', 'Problems']].concat(rows.map(r => [r.line, r.input, r.value, r.kind || '', r.ok && r.type ? r.type.en : '', r.ok ? (r.dup ? 'OK (duplicate)' : 'OK') : 'WRONG', r.issues.map(i => i.en).join(' | ')]))), 'pan-tan-check.csv');
        out.querySelector('#ptCpV').onclick = async (e) => { try { await navigator.clipboard.writeText(rows.filter(r => r.ok).map(r => r.value).join('\n')); e.target.textContent = '✅ ' + T('நகலெடுக்கப்பட்டது', 'Copied'); } catch (x) { e.target.textContent = '⚠️'; } };
      }
      body.querySelector('#ptGo').onclick = run;
      body.querySelector('#ptClr').onclick = () => { inp.value = ''; out.innerHTML = ''; };
      inp.addEventListener('input', () => { if (inp.value.length < 20000) run(); });
    }
  };

  /* ====================================================================
   * TDS due-date calendar
   * ==================================================================== */
  TOOL_IMPL.tdsdates = {
    mount(container) {
      const body = el(`<div class="tamil"></div>`); container.appendChild(body);
      const now = todayLocal(); const curStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      let year = curStart;
      function paint() {
        const c = core().calendar(year);
        let opts = ''; for (let y = curStart - 2; y <= curStart + 1; y++) opts += `<option value="${y}" ${y === year ? 'selected' : ''}>FY ${y}-${String((y + 1) % 100).padStart(2, '0')}${y >= 2026 ? ' (Income-tax Act 2025)' : ' (Income-tax Act 1961)'}</option>`;
        // next due items relative to today (across the selected year only)
        const nextDep = c.deposits.find(d => d.due >= now), nextRet = c.returns.find(r => r.due >= now);
        let h = `<div class="note">${T('நிதியாண்டை (Financial Year) தேர்ந்தெடுங்கள்: TDS வரி செலுத்தும் தேதிகள், காலாண்டு return தேதிகள், சான்றிதழ் தேதி. தேதிகள் வருமான வரித் துறையின் அதிகாரப்பூர்வ FAQ-களில் உள்ளபடி.', 'Pick a financial year: TDS deposit dates, quarterly return dates and the certificate date, as given in the Income Tax Department’s official FAQs.')}</div>
          <div class="opts"><div class="field"><label>${T('நிதியாண்டு', 'Financial year')}</label><select id="tdY">${opts}</select></div></div>`;
        if (nextDep || nextRet) {
          h += `<div style="${card}background:#EAF2F8;"><b>⏰ ${T('அடுத்த தேதிகள் (இன்றிலிருந்து)', 'Next dates (from today)')}</b><div style="margin-top:6px;font-size:13.5px;line-height:1.7;">`;
          if (nextDep) h += `💳 ${T('TDS செலுத்த', 'TDS deposit for')} <b>${esc(nextDep.forMonth)}</b>: <b>${fmtDate(nextDep.due)}</b> (${wday(nextDep.due)}) — ${Math.round((nextDep.due - now) / 864e5)} ${T('நாட்கள்', 'days')}<br>`;
          if (nextRet) h += `📄 ${esc(nextRet.q)} ${T('return', 'return')}: <b>${fmtDate(nextRet.due)}</b> (${wday(nextRet.due)}) — ${Math.round((nextRet.due - now) / 864e5)} ${T('நாட்கள்', 'days')}`;
          h += `</div></div>`;
        }
        h += `<div style="${card}"><b>💳 ${T('TDS வரி செலுத்தும் கடைசி தேதி', 'TDS deposit due dates')}</b> <span style="color:var(--sub);font-size:12.5px;">(${T('அரசு அல்லாத deductor, சாதாரண challan', 'non-government deductor, ordinary challan')})</span>
          <div style="overflow-x:auto;margin-top:6px;"><table style="border-collapse:collapse;width:100%;"><tr><th style="${th}">${T('பிடித்த மாதம்', 'Deducted in')}</th><th style="${th}">${T('கடைசி தேதி', 'Due date')}</th></tr>`;
        c.deposits.forEach(d => { const past = d.due < now; h += `<tr style="${past ? 'opacity:.6;' : ''}"><td style="${td}">${esc(d.forMonth)}</td><td style="${td}"><b>${fmtDate(d.due)}</b>${d.special ? ' <span style="color:#B9770E;">★</span>' : ''}<div style="font-size:11.5px;color:var(--sub);">${wday(d.due)}</div></td></tr>`; });
        h += `</table></div><div style="font-size:12.5px;color:var(--sub);margin-top:6px;line-height:1.6;">★ ${T('மார்ச் மாதப் பிடித்தத்துக்கு கடைசி தேதி 30 ஏப்ரல்.', 'For tax deducted in March the due date is 30 April.')}<br>${T('Challan-cum-statement வழக்குகளுக்கு (எ.கா. சொத்து விற்பனை TDS): மாத முடிவிலிருந்து 30 நாட்கள். இந்த tool-ல் அதைத் தனியாகக் கணக்கிடவில்லை.', 'Challan-cum-statement cases (for example TDS on property sale): 30 days after the end of the month — not listed separately here.')}</div></div>`;
        h += `<div style="${card}"><b>📄 ${T('காலாண்டு TDS return', 'Quarterly TDS statements')}</b>
          <div style="font-size:12.5px;color:var(--sub);margin:4px 0;">${T('சம்பளம்', 'Salary')}: <b>${c.forms.sal}</b> · ${T('சம்பளம் அல்லாதவை', 'Non-salary')}: <b>${c.forms.non}</b> · ${T('வெளிநாட்டவர்/NRI', 'Non-resident')}: <b>${c.forms.nr}</b></div>
          <div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;"><tr><th style="${th}">${T('காலாண்டு', 'Quarter')}</th><th style="${th}">${T('கடைசி தேதி', 'Due date')}</th></tr>`;
        c.returns.forEach(r => { h += `<tr style="${r.due < now ? 'opacity:.6;' : ''}"><td style="${td}">${esc(r.q)}</td><td style="${td}"><b>${fmtDate(r.due)}</b><div style="font-size:11.5px;color:var(--sub);">${wday(r.due)}</div></td></tr>`; });
        h += `</table></div></div>`;
        h += `<div style="${card}"><b>🧾 ${T('வருடாந்திர சான்றிதழ்', 'Annual certificate')}</b><div style="font-size:13.5px;margin-top:6px;line-height:1.7;">${esc(c.certs[0].name)}: <b>${fmtDate(c.certs[0].due)}</b> (${wday(c.certs[0].due)})<br><span style="color:var(--sub);font-size:12.5px;">${c.newAct ? T('Form 130-ஐ TRACES-ல் இருந்தே பதிவிறக்க வேண்டும்; வேறு வழியில் தயாரித்தது செல்லுபடியாகாது (வருமான வரித் துறை FAQ).', 'Form 130 must be downloaded from TRACES; one prepared any other way is not a valid certificate (Income Tax Dept FAQ).') : T('Form 16-ஐ TRACES-ல் இருந்து பதிவிறக்கி, டிஜிட்டல் அல்லது கையால் கையொப்பமிடலாம்.', 'Form 16 is downloaded from TRACES and may be signed digitally or manually.')}<br>${T('Form 16A / 131-க்கான தேதியை இந்தக் கருவி காட்டாது: அதிகாரப்பூர்வ பக்கத்தில் உறுதி செய்யுங்கள்.', 'The date for Form 16A / 131 is not shown here — confirm it on the official page.')}</span></div></div>`;
        h += `<div class="note" style="font-size:12.5px;line-height:1.65;"><b>${T('கவனிக்க', 'Please note')}</b><br>• ${T('இவை சட்டப்படியான தேதிகள். CBDT சில சமயம் நீட்டிக்கலாம்; TRACES / e-filing அறிவிப்புகளையும் பாருங்கள்.', 'These are the statutory dates. CBDT may extend them — also check TRACES / e-filing notices.')}<br>• ${T('31 மார்ச் 2026 வரையிலான காலத்துக்குப் பழைய சட்டமும் பழைய படிவங்களும் (24Q/26Q/27Q/16); 1 ஏப்ரல் 2026 முதல் புதிய சட்டம்.', 'Periods up to 31 March 2026 stay under the old Act and old forms (24Q/26Q/27Q/16); from 1 April 2026 the new Act applies.')}<br>• ${T('TCS தேதிகள் இங்கு சேர்க்கப்படவில்லை.', 'TCS dates are not included.')}<br>• ${T('ஆதாரம்', 'Sources')}: ${srcLink(SRC.faq, 'Transition FAQs')} · ${srcLink(SRC.f138, 'Form 138 FAQ')} · ${srcLink(SRC.f130, 'Form 130 FAQ')}<br>• ${T('இந்த விதிகள் கடைசியாகச் சரிபார்க்கப்பட்ட தேதி', 'Rules last verified on')}: <b>${esc(core().RULES.asOf)}</b> (${T('அதிகாரப்பூர்வ பக்கங்களில் மாற்றம் வந்தால் இந்தத் தளம் புதுப்பிக்கப்படும்; முக்கியமான தாக்கல்களுக்கு முன் அதிகாரப்பூர்வ பக்கத்தையும் பாருங்கள்', 'the site is updated when the official pages change; for an important filing also check the official page')})</div>`;
        body.innerHTML = h;
        body.querySelector('#tdY').onchange = (e) => { year = +e.target.value; paint(); };
      }
      paint();
    }
  };

  /* ====================================================================
   * TDS late-interest calculator
   * ==================================================================== */
  TOOL_IMPL.tdsinterest = {
    mount(container) {
      const body = el(`<div class="tamil"></div>`); container.appendChild(body);
      let rows = [{ kind: 'deposit', amount: '', from: '', to: '' }];
      function calc(r) { return core().interest(r.kind, parseFloat(r.amount), core().parseISO(r.from), core().parseISO(r.to)); }
      function paint(keepFocus) {
        let tot = 0; let h = `<div class="note">${T('TDS தாமதத்துக்கான வட்டி: பிரிவு 398(3)(a) (புதிய சட்டம்) — பிடிக்காமல்/தாமதமாகப் பிடித்தால் மாதத்துக்கு 1%; பிடித்தும் தாமதமாகச் செலுத்தினால் மாதத்துக்கு 1.5%; “மாதம் அல்லது மாதத்தின் ஒரு பகுதி” ஒரு முழு மாதமாகக் கணக்கு.', 'Interest on late TDS, Income-tax Act 2025 section 398(3)(a): 1% per month when tax is not deducted / deducted late; 1.5% per month when deducted but deposited late. “Month or part of a month” counts as a full month.')}</div>`;
        rows.forEach((r, i) => {
          const res = calc(r); tot += res.interest || 0;
          const dep = r.kind === 'deposit';
          h += `<div style="${card}position:relative;">
            ${rows.length > 1 ? `<button data-del="${i}" title="Remove" style="position:absolute;top:6px;right:8px;border:none;background:none;cursor:pointer;font-size:18px;">✕</button>` : ''}
            <div class="field"><label>${T('வகை', 'Case')} #${i + 1}</label><select data-i="${i}" data-f="kind" style="width:100%;"><option value="deposit" ${dep ? 'selected' : ''}>${T('பிடித்தது, தாமதமாகச் செலுத்தியது (1.5%)', 'Deducted, deposited late (1.5%)')}</option><option value="deduct" ${!dep ? 'selected' : ''}>${T('பிடிக்கவில்லை / தாமதமாகப் பிடித்தது (1%)', 'Not deducted / deducted late (1%)')}</option></select></div>
            <div class="field"><label>${T('TDS தொகை ₹', 'TDS amount ₹')}</label><input type="number" inputmode="decimal" min="0" step="0.01" data-i="${i}" data-f="amount" value="${esc(r.amount)}" style="width:100%;"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div class="field"><label>${dep ? T('பிடித்த தேதி', 'Date of deduction') : T('பிடிக்க வேண்டிய தேதி', 'Date it was deductible')}</label><input type="date" data-i="${i}" data-f="from" value="${esc(r.from)}" style="width:100%;"></div>
              <div class="field"><label>${dep ? T('செலுத்திய தேதி', 'Date of deposit') : T('பிடித்த தேதி', 'Date actually deducted')}</label><input type="date" data-i="${i}" data-f="to" value="${esc(r.to)}" style="width:100%;"></div>
            </div>
            <div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--bg,#f6f7fb);font-size:13.5px;">${res.interest ? `<b>${T('வட்டி', 'Interest')}: ${inr(res.interest)}</b> <span style="color:var(--sub);font-size:12px;">(${res.months} ${T('மாதம்', 'month(s)')} × ${res.rate}%)</span>` : `<span style="color:var(--sub);">${esc(res.note || '—')}</span>`}${res.due ? `<div style="font-size:12px;color:var(--sub);">${T('கடைசி தேதி', 'Due date')}: ${fmtDate(res.due)}</div>` : ''}</div>
          </div>`;
        });
        h += `<div class="btn-row"><button class="btn" id="tiAdd" style="background:#fff;color:var(--ink);border:1px solid var(--line);">➕ ${T('வரி சேர்', 'Add row')}</button><button class="btn" id="tiCsv" style="background:#fff;color:var(--ink);border:1px solid var(--line);">⬇️ CSV</button></div>`;
        h += `<div style="${card}background:#E8F8F0;"><b>${T('மொத்த வட்டி', 'Total interest')}: ${inr(tot)}</b></div>`;
        h += `<div class="note" style="font-size:12.5px;line-height:1.65;"><b>${T('கணக்கிடும் முறை', 'How it is counted')}</b><br>• ${T('தொடக்க நாளும் முடிவு நாளும் சேர்த்து எண்ணப்படும்; எ.கா. 10 ஜன – 9 பிப் = 1 மாதம், 10 ஜன – 10 பிப் = 2 மாதங்கள். 31 மார்ச் – 7 மே = 2 மாதங்கள்.', 'Both the start day and the end day are counted: 10 Jan – 9 Feb = 1 month, 10 Jan – 10 Feb = 2 months; 31 Mar – 7 May = 2 months.')}<br>• ${T('“செலுத்தியது தாமதம்” வழக்கில் கடைசி தேதி: அடுத்த மாதம் 7 (மார்ச் பிடித்தத்துக்கு 30 ஏப்ரல்); அன்றோ அதற்கு முன்போ செலுத்தினால் வட்டி இல்லை. அந்த தேதி விடுமுறை நாளாக இருந்தால் அடுத்த வேலை நாளைப் பாருங்கள்.', 'For “deposited late” the due date is the 7th of the next month (30 April for March); paying on or before it means no interest. If that date is a holiday, check the next working day rule yourself.')}<br>• ${T('இது ஒரு மதிப்பீடு. TRACES-ன் “Justification Report” காட்டும் தொகையே இறுதி; தொகையை ஒரு முறை அதனுடன் ஒப்பிடுங்கள்.', 'This is an estimate — the figure in the TRACES Justification Report is final; compare with it before paying.')}<br>• ${T('தாமதக் கட்டணம் (late fee) மற்றும் அபராதம் இங்கு சேர்க்கப்படவில்லை.', 'Late filing fee and penalty are not included.')}<br>• ${T('ஆதாரம்', 'Source')}: ${srcLink(SRC.faq, 'Transition FAQs (Q2.13, Q6.9)')}<br>• ${T('இந்த விதிகள் கடைசியாகச் சரிபார்க்கப்பட்ட தேதி', 'Rules last verified on')}: <b>${esc(core().RULES.asOf)}</b> (${T('அதிகாரப்பூர்வ பக்கங்களில் மாற்றம் வந்தால் இந்தத் தளம் புதுப்பிக்கப்படும்; முக்கியமான தாக்கல்களுக்கு முன் அதிகாரப்பூர்வ பக்கத்தையும் பாருங்கள்', 'the site is updated when the official pages change; for an important filing also check the official page')})</div>`;
        const active = document.activeElement; const key = active && active.dataset ? [active.dataset.i, active.dataset.f] : null;
        body.innerHTML = h;
        if (keepFocus && key) { const n = body.querySelector(`[data-i="${key[0]}"][data-f="${key[1]}"]`); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { /* date / number inputs */ } } }
        body.querySelectorAll('[data-f]').forEach(n => { const ev = n.tagName === 'SELECT' || n.type === 'date' ? 'change' : 'input'; n.addEventListener(ev, () => { rows[+n.dataset.i][n.dataset.f] = n.value; paint(true); }); });
        body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.del, 1); paint(); });
        body.querySelector('#tiAdd').onclick = () => { rows.push({ kind: rows[rows.length - 1].kind, amount: '', from: '', to: '' }); paint(); };
        body.querySelector('#tiCsv').onclick = () => downloadBlob(csvBlob([['Case', 'TDS amount', 'From', 'To', 'Months', 'Rate %', 'Interest', 'Note']].concat(rows.map(r => { const x = calc(r); return [r.kind === 'deposit' ? 'Deducted, deposited late' : 'Not deducted / deducted late', r.amount, r.from, r.to, x.months, x.rate, x.interest, x.note]; }).concat([['Total', '', '', '', '', '', tot.toFixed(2), '']]))), 'tds-interest.csv');
      }
      paint();
    }
  };

  /* ====================================================================
   * Bulk signature check (Form 16 / 130 PDFs or a TRACES ZIP)
   * ==================================================================== */
  TOOL_IMPL.dscbulk = {
    mount(container) {
      const body = el(`<div class="tamil"></div>`); container.appendChild(body);
      let results = [];
      const SHORT = {
        DIGEST_MISMATCH: 'Content changed after signing', SIG_INVALID: 'Signature does not match certificate', CMS_PARSE: 'Signature unreadable', NO_SIGNER: 'No signer info', NO_CERT: 'No certificate inside',
        HASH_UNSUPPORTED: 'Unsupported hash', NOT_YET_VALID: 'Certificate not yet valid at signing', EXPIRED_AT_SIGNING: 'Certificate expired at signing', CHAIN_BROKEN: 'Certificate chain broken',
        APPENDED: 'Data added after signing', SHA1: 'Old SHA-1 hash', KEYUSAGE: 'Certificate not for signing', CHAIN_INCOMPLETE: 'Chain not embedded', SIG_UNCHECKED: 'Could not check'
      };
      body.innerHTML = `
        <div class="note">${T('Form 16 / Form 130 போன்ற பல PDF-களை (அல்லது TRACES-ல் பதிவிறக்கிய ZIP-ஐ) ஒரே நேரத்தில் இடுங்கள்: எது கையொப்பமிடப்பட்டுள்ளது, எதில் கையொப்பம் உடைந்துள்ளது என்று பட்டியல் கிடைக்கும். கோப்புகள் உங்கள் சாதனத்தை விட்டு வெளியே போகாது.', 'Drop many Form 16 / Form 130 PDFs (or the ZIP downloaded from TRACES): get a list of which are signed and which signatures are broken. Files never leave your device.')}</div>
        <div id="dbUp"></div><div id="dbOut"></div>`;
      const up = body.querySelector('#dbUp'), out = body.querySelector('#dbOut');
      mountUploader(up, { accept: 'application/pdf,.pdf,application/zip,.zip', multiple: true, noSignWarn: true, label: T('PDF-கள் அல்லது ZIP இங்கே', 'PDFs or a ZIP here'), sublabel: 'Form 16, Form 130, 16A…', onAdd: files => run(files) });
      const verdict = r => r.problems.some(p => p.level === 'bad') ? 'bad' : (r.problems.some(p => p.level === 'warn' && !(p.code === 'APPENDED' && !r.isLatest)) ? 'warn' : 'ok');
      async function run(files) {
        out.innerHTML = ''; results = [];
        const prog = mountProgress(out); prog.set(2, 'Reading…');
        const items = [];
        try {
          for (const f of files) {
            if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
              const zip = await JSZip.loadAsync(f);
              zip.forEach((path, entry) => { if (!entry.dir && /\.pdf$/i.test(path) && !/^__MACOSX\//.test(path)) items.push({ name: path, get: () => entry.async('uint8array') }); });
            } else if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') items.push({ name: f.name, get: async () => new Uint8Array(await f.arrayBuffer()) });
          }
        } catch (e) { prog.remove(); out.innerHTML = `<div class="note" style="background:#FDEDEC;">${esc(e.message)}</div>`; return; }
        if (!items.length) { prog.remove(); out.innerHTML = `<div class="note" style="background:#FFF8E1;">${T('PDF கோப்பு எதுவும் கிடைக்கவில்லை.', 'No PDF files found.')}</div>`; return; }
        if (items.length > 1000) items.length = 1000;
        for (let i = 0; i < items.length; i++) {
          prog.set(5 + Math.round(i / items.length * 90), `${i + 1} / ${items.length}`);
          const it = items[i]; const row = { name: it.name, status: 'error', signer: '', issuer: '', valid: '', problems: [], count: 0 };
          try {
            const buf = await it.get(); const rep = await window.DscVerify.analyze(buf);
            if (!rep.isPdf) { row.status = 'notpdf'; }
            else if (!rep.signatures.length) { row.status = 'unsigned'; }
            else {
              row.count = rep.signatures.length;
              const vs = rep.signatures.map(verdict); row.status = vs.includes('bad') ? 'bad' : (vs.includes('warn') ? 'warn' : 'ok');
              const s0 = rep.signatures.find((s, k) => vs[k] === row.status) || rep.signatures[0];
              row.signer = s0.signer ? s0.signer.subjectCn : ''; row.issuer = s0.signer ? s0.signer.issuerCn : '';
              row.valid = s0.signer ? fmtDate(s0.signer.notBefore) + ' → ' + fmtDate(s0.signer.notAfter) : '';
              row.problems = [].concat.apply([], rep.signatures.map(s => s.problems.filter(p => !(p.code === 'APPENDED' && !s.isLatest)).map(p => SHORT[p.code] || p.code)));
            }
          } catch (e) { row.status = 'error'; row.problems = [e.message]; }
          results.push(row);
          if (i % 5 === 4) await new Promise(r => setTimeout(r, 0));
        }
        prog.remove(); render();
      }
      function render() {
        const cnt = { ok: 0, warn: 0, bad: 0, unsigned: 0, error: 0, notpdf: 0 }; results.forEach(r => cnt[r.status]++);
        const ic = { ok: '✅', warn: '⚠️', bad: '❌', unsigned: '➖', error: '❓', notpdf: '❓' };
        const lab = { ok: T('சரி', 'Valid'), warn: T('கவனிக்க', 'Check'), bad: T('உடைந்தது', 'Broken'), unsigned: T('கையொப்பம் இல்லை', 'Unsigned'), error: T('படிக்க முடியவில்லை', 'Unreadable'), notpdf: 'Not PDF' };
        let h = `<div style="${card}"><b>${results.length}</b> ${T('கோப்புகள்', 'files')}: ✅ ${cnt.ok} · ⚠️ ${cnt.warn} · ❌ ${cnt.bad} · ➖ ${cnt.unsigned}${cnt.error + cnt.notpdf ? ` · ❓ ${cnt.error + cnt.notpdf}` : ''}</div>`;
        results.forEach(r => {
          const bg = { ok: '#F1FAF4', warn: '#FFFBEF', bad: '#FEF3F2', unsigned: 'var(--card,#fff)', error: 'var(--card,#fff)', notpdf: 'var(--card,#fff)' }[r.status];
          h += `<div style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:6px 0;background:${bg};"><div style="display:flex;gap:8px;justify-content:space-between;align-items:flex-start;"><div style="font-size:13px;word-break:break-all;font-weight:600;">${esc(r.name)}</div><div style="white-space:nowrap;font-size:13px;">${ic[r.status]} ${lab[r.status]}</div></div>${r.signer ? `<div style="font-size:12.5px;margin-top:2px;">👤 ${esc(r.signer)}${r.issuer ? ` <span style="color:var(--sub)">· ${esc(r.issuer)}</span>` : ''}</div>` : ''}${r.problems.length ? `<div style="font-size:12.5px;margin-top:2px;color:${r.status === 'bad' ? '#C0392B' : '#8a6d0b'};">${esc(r.problems.join('; '))}</div>` : ''}</div>`;
        });
        h += `<div class="btn-row" style="margin-top:8px;"><button class="btn" id="dbCsv">⬇️ CSV</button></div>
          <div class="note" style="font-size:12.5px;line-height:1.65;margin-top:10px;">• ${T('✅ = கையொப்பம் கணித ரீதியாகச் சரி, ஆவணம் மாறவில்லை. ❌ = கையொப்பத்துக்குப் பின் PDF மாறியுள்ளது அல்லது கையொப்பம் செல்லாது. ➖ = டிஜிட்டல் கையொப்பம் இல்லை (கையால் கையொப்பமிடலாம்: Form 130 FAQ).', '✅ = signature mathematically valid and content unchanged. ❌ = PDF changed after signing or the signature is invalid. ➖ = no digital signature (a certificate may also be signed manually — Form 130 FAQ).')}<br>• ${T('சான்றிதழ் ரத்து (OCSP/CRL) மற்றும் அரசு root நம்பகத்தன்மையை இணையமின்றிச் சரிபார்க்க முடியாது; அதிகாரப்பூர்வ முடிவுக்கு Adobe Acrobat Reader-ஐயும் பயன்படுத்துங்கள்.', 'Certificate revocation (OCSP/CRL) and official trust-store checks cannot be done offline — also use Adobe Acrobat Reader for an official verdict.')}</div>`;
        out.innerHTML = h;
        out.querySelector('#dbCsv').onclick = () => downloadBlob(csvBlob([['File', 'Status', 'Signatures', 'Signer', 'Issuer', 'Certificate valid', 'Notes']].concat(results.map(r => [r.name, r.status, r.count, r.signer, r.issuer, r.valid, r.problems.join('; ')]))), 'signature-check.csv');
      }
    }
  };
})();
