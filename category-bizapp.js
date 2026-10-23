/* category-bizapp.js — more everyday apps for workers and small businesses (lazy key 'bizapp', UPDATE_72). Browser only, nothing is uploaded.
 *   cashbook   — daily cash book: money in / out by category and mode (cash, UPI, bank), today / month totals, cash in hand
 *   staffbook  — workers' attendance (present / half / absent / week-off, overtime), advances, weekly or monthly wages, salary slip
 *   bookings   — bookings / appointments calendar: date, time, place, advance, clash warning, WhatsApp confirm, phone-calendar reminder (.ics)
 *   stockbook  — stock book: items, stock in / out, low-stock list, stock value, re-order message to the supplier
 *   docremind  — renewal reminders you type in: licence, insurance, FC, permit, rent agreement, EMI dates … days left + phone-calendar alarm
 * Uses the shared UI helpers of category-biz.js (window.BizUI), loading that file first when needed.
 * Pure helpers on window.BizAppCore for tests (tests/bizapp-core.test.cjs).
 */
(function () {
  'use strict';
  const n0 = v => (isFinite(v) ? +v : 0);
  const r2 = v => Math.round((n0(v) + Number.EPSILON) * 100) / 100;
  const nm = s => { if (typeof s === 'number') return s; const t = String(s == null ? '' : s).replace(/[₹,\s]/g, ''); return /^-?\d*\.?\d+$/.test(t) ? parseFloat(t) : NaN; };
  function isoAdd(iso, n) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (n || 0))); return d.toISOString().slice(0, 10); }
  function dow(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : 0; }
  function weekRange(iso, startDow) { const back = (dow(iso) - (startDow || 0) + 7) % 7, from = isoAdd(iso, -back); return { from: from, to: isoAdd(from, 6) }; }
  function monthRange(iso) { const from = iso.slice(0, 8) + '01'; const m = /^(\d{4})-(\d{2})/.exec(iso); const last = new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate(); return { from: from, to: iso.slice(0, 8) + String(last).padStart(2, '0'), days: last }; }
  const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);

  // --- cash book
  const CASH_IN = ['விற்பனை / சேவை / Sales', 'பாக்கி வசூல் / Dues collected', 'முன்பணம் / Advance received', 'மற்ற வரவு / Other income'];
  const CASH_OUT = ['பொருள் வாங்கியது / Purchase', 'வாடகை / Rent', 'மின்சாரம் / Electricity', 'சம்பளம் / கூலி / Wages', 'பெட்ரோல் / டீசல் / Fuel', 'போக்குவரத்து / Transport', 'போன் / இணையம் / Phone & net', 'பழுது / Repairs', 'டீ / சாப்பாடு / Tea & food', 'கடன் தவணை / Loan EMI', 'வீட்டுச் செலவு / Home', 'மற்ற செலவு / Other'];
  function cashSummary(entries, from, to) {
    const s = { in: 0, out: 0, net: 0, byCat: {}, byMode: { cash: 0, upi: 0, bank: 0 }, count: 0 };
    (entries || []).forEach(e => {
      if (!inRange(e.d, from, to)) return; const a = n0(nm(e.a)); if (!(a > 0)) return;
      s.count++; if (e.t === 'in') s.in += a; else s.out += a;
      s.byCat[e.c] = r2((s.byCat[e.c] || 0) + (e.t === 'in' ? a : -a));
      const m = s.byMode[e.m] != null ? e.m : 'cash'; s.byMode[m] = r2(s.byMode[m] + (e.t === 'in' ? a : -a));
    });
    s.in = r2(s.in); s.out = r2(s.out); s.net = r2(s.in - s.out); return s;
  }
  function cashInHand(entries, opening, upto) { // cash only (UPI / bank go to the bank)
    let c = n0(nm(opening)); (entries || []).forEach(e => { if (upto && e.d > upto) return; if ((e.m || 'cash') !== 'cash') return; const a = n0(nm(e.a)); c += e.t === 'in' ? a : -a; }); return r2(c);
  }

  // --- staff
  const MARKS = ['P', 'H', 'A', 'W'];
  function attCount(att, wid, from, to) {
    const c = { P: 0, H: 0, A: 0, W: 0, ot: 0 };
    Object.keys(att || {}).forEach(d => { if (!inRange(d, from, to)) return; const x = att[d] && att[d][wid]; if (!x || !x.s) return; if (c[x.s] != null) c[x.s]++; c.ot += n0(nm(x.ot)); });
    c.ot = r2(c.ot); return c;
  }
  function staffPay(w, att, adv, paid, from, to, divisor) {
    const c = attCount(att, w.id, from, to), wage = n0(nm(w.wage));
    const days = c.P + c.H * 0.5;
    const earned = w.type === 'month' ? r2((days + c.W) * wage / (n0(divisor) || 30)) : r2(days * wage);
    const ot = r2(c.ot * n0(nm(w.ot)));
    const sum = list => r2((list || []).filter(x => x.w === w.id && inRange(x.d, from, to)).reduce((a, x) => a + n0(nm(x.a)), 0));
    const a = sum(adv), p = sum(paid);
    return { P: c.P, H: c.H, A: c.A, W: c.W, otHours: c.ot, days: days, earned: earned, ot: ot, adv: a, paid: p, bal: r2(earned + ot - a - p) };
  }

  // --- bookings
  const icsEsc = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function icsFor(ev) { // floating local time; alarms the day before and 2 hours before
    const d = String(ev.d || '').replace(/-/g, ''), t = /^\d{2}:\d{2}$/.test(ev.t || '') ? ev.t.replace(':', '') + '00' : '';
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//pdftoolsindia.com//business app//TA', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + (ev.id || Date.now()) + '@pdftoolsindia.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')];
    if (t) { L.push('DTSTART:' + d + 'T' + t); L.push('DURATION:PT' + Math.max(15, Math.round(n0(ev.mins) || 60)) + 'M'); } else { L.push('DTSTART;VALUE=DATE:' + d); L.push('DTEND;VALUE=DATE:' + isoAdd(ev.d, 1).replace(/-/g, '')); }
    L.push('SUMMARY:' + icsEsc(ev.title)); if (ev.place) L.push('LOCATION:' + icsEsc(ev.place)); if (ev.note) L.push('DESCRIPTION:' + icsEsc(ev.note));
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(ev.title), 'TRIGGER:-P1D', 'END:VALARM');
    if (t) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(ev.title), 'TRIGGER:-PT2H', 'END:VALARM');
    L.push('END:VEVENT', 'END:VCALENDAR'); return L.join('\r\n') + '\r\n';
  }
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
  function clashes(list, b) { // same day and overlapping time (all-day bookings clash with anything that day)
    const s = toMin(b.t), e = s == null ? null : s + (n0(b.mins) || 60);
    return (list || []).filter(x => x.id !== b.id && x.st !== 'cancel' && x.d === b.d && (s == null || toMin(x.t) == null || (toMin(x.t) < e && toMin(x.t) + (n0(x.mins) || 60) > s)));
  }

  // --- stock
  function stockQty(item, moves) { let q = n0(nm(item.open)); (moves || []).forEach(m => { if (m.i !== item.id) return; const v = n0(nm(m.q)); q += m.t === 'in' ? v : m.t === 'out' ? -v : 0; if (m.t === 'set') q = v; }); return r2(q); }
  function stockValue(items, moves) { return r2((items || []).reduce((a, it) => a + Math.max(0, stockQty(it, moves)) * n0(nm(it.cost)), 0)); }

  // --- renewals
  const DOC_PRESETS = ['ஓட்டுநர் உரிமம் / Driving licence', 'வாகனக் காப்பீடு / Vehicle insurance', 'FC (Fitness certificate)', 'பர்மிட் / Permit', 'புகை சான்று / Pollution (PUC)', 'சாலை வரி / Road tax', 'FSSAI பதிவு / FSSAI', 'வர்த்தக உரிமம் / Trade licence', 'கடை வாடகை ஒப்பந்தம் / Rent agreement', 'உடல்நலக் காப்பீடு / Health insurance', 'கடன் தவணை / Loan EMI', 'LIC / பாலிசி பிரீமியம் / Policy premium', 'கேஸ் சிலிண்டர் / Gas cylinder', 'வாரண்டி / Warranty', 'நலவாரிய புதுப்பித்தல் / Welfare board renewal', 'மற்றவை / Other'];
  function daysLeft(iso, today) { const a = Date.parse(iso + 'T00:00:00Z'), b = Date.parse(today + 'T00:00:00Z'); return isFinite(a) && isFinite(b) ? Math.round((a - b) / 86400000) : NaN; }
  function nextRepeat(iso, rep, today) { // the next monthly / yearly date on or after today, always counted from the original day (31 Jan → 28 Feb → 31 Mar)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m || !rep || rep === 'none') return iso;
    const step = rep === 'year' ? 12 : 1;
    for (let k = 0; k < 1200; k += step) {
      const dt = new Date(Date.UTC(+m[1], +m[2] - 1 + k, 1)), last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
      const d = dt.toISOString().slice(0, 8) + String(Math.min(+m[3], last)).padStart(2, '0');
      if (d >= today) return d;
    }
    return iso;
  }


  window.BizAppCore = { isoAdd: isoAdd, weekRange: weekRange, monthRange: monthRange, cashSummary: cashSummary, cashInHand: cashInHand, attCount: attCount, staffPay: staffPay, icsFor: icsFor, clashes: clashes, stockQty: stockQty, stockValue: stockValue, daysLeft: daysLeft, nextRepeat: nextRepeat, CASH_IN: CASH_IN, CASH_OUT: CASH_OUT, DOC_PRESETS: DOC_PRESETS };
  if (typeof TOOL_IMPL === 'undefined') return;

  const BIZ_V = '20261024e';
  function ensureBiz() {
    if (window.BizUI) return Promise.resolve(window.BizUI);
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/category-biz.js?v=' + BIZ_V; s.onload = () => (window.BizUI ? res(window.BizUI) : rej(new Error('no BizUI'))); s.onerror = () => rej(new Error('load failed')); document.head.appendChild(s); });
  }
  function reg(id, fn) {
    TOOL_IMPL[id] = { mount(body) { ensureBiz().then(U => fn(body, U)).catch(() => { body.innerHTML = '<div style="padding:16px;font-weight:700">ஏற்ற முடியவில்லை — இணைய இணைப்பைச் சரிபார்த்து மீண்டும் திறக்கவும். / Could not load — check the connection and reopen.</div>'; }); } };
  }
  const sh = (U, s) => { const p = String(s || '').split(' / '); return (U.isEn() ? p[1] || p[0] : p[0]).trim(); };
  function dl(U, text, name, type) { const b = new Blob([text], { type: type || 'text/plain;charset=utf-8' }); if (typeof downloadBlob === 'function') downloadBlob(b, name); else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } }
  function backupRow(U, key, name, onRestore) {
    return { html: '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-bk="1">💾 Backup</button><label class="bz-btn sec sm" style="cursor:pointer">📂 ' + U.T('மீட்டெடு', 'Restore') + '<input type="file" accept=".json,application/json" data-rs="1" hidden></label></div>',
      bind(root) {
        U.$(root, '[data-bk]').onclick = () => dl(U, JSON.stringify(U.lsGet(key, {})), name + '-backup-' + U.todayIso() + '.json', 'application/json');
        U.$(root, '[data-rs]').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const v = JSON.parse(String(r.result)); if (!v || typeof v !== 'object') throw new Error('bad'); if (!window.confirm(U.T('இப்போது உள்ள தகவல் இந்த Backup-ஆல் மாற்றப்படும். தொடரவா?', 'Current data will be replaced by this backup. Continue?'))) return; U.lsSet(key, v); onRestore(); } catch (err) { window.alert(U.T('இது சரியான Backup file இல்லை', 'Not a valid backup file')); } }; r.readAsText(f); };
      } };
  }
  const CSS = `.ba-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:10px}.ba-cal b{font-size:11px;text-align:center;color:var(--sub)}
  .ba-day{min-height:44px;border:1.5px solid var(--line);border-radius:10px;background:#fff;font:700 14px inherit;font-family:inherit;color:var(--ink);cursor:pointer;position:relative;padding:2px}
  .ba-day.out{opacity:.35}.ba-day.today{border-color:var(--brand)}.ba-day.sel{background:#EAF0FF;border-color:var(--brand)}
  .ba-day i{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);min-width:16px;height:16px;border-radius:8px;background:#C2255C;color:#fff;font:800 10px/16px inherit;font-style:normal}
  .ba-mk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}.ba-mk button{min-height:44px;border-radius:10px;border:2px solid var(--line);background:#fff;font:900 15px inherit;font-family:inherit;cursor:pointer;color:var(--ink)}
  .ba-mk button.on.P{background:#E3F6EC;border-color:#1E8E5A;color:#176B45}.ba-mk button.on.H{background:#FFF4D6;border-color:#D4A017;color:#7A5B00}.ba-mk button.on.A{background:#FDEDEC;border-color:#C0392B;color:#9B2C20}.ba-mk button.on.W{background:#EEF0F3;border-color:#8792A2;color:#3D4654}
  .ba-big{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.ba-big button{min-height:64px;border-radius:16px;border:0;font:900 18px inherit;font-family:inherit;color:#fff;cursor:pointer}
  .ba-left{font-weight:900}.ba-left.red{color:#C0392B}.ba-left.amb{color:#B45309}.ba-left.grn{color:#1E8E5A}`;
  function css() { if (!document.getElementById('ba-style')) { const s = document.createElement('style'); s.id = 'ba-style'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ===================================================================== cashbook */
  reg('cashbook', function (body, U) {
    css(); const KEY = 'bz_cash_v1', root = U.makeRoot(body), T = U.T, $ = U.$, $$ = U.$$;
    let db = Object.assign({ open: '', e: [], cats: { in: [], out: [] } }, U.lsGet(KEY, {})); if (!Array.isArray(db.e)) db.e = [];
    let view = 'add', type = 'out', per = 'today', from = '', to = '';
    const save = () => U.lsSet(KEY, db);
    const cats = t => (t === 'in' ? CASH_IN : CASH_OUT).concat((db.cats && db.cats[t]) || []);
    function range() { const t0 = U.todayIso(); if (per === 'today') return { from: t0, to: t0 }; if (per === 'week') return weekRange(t0, 1); if (per === 'month') return monthRange(t0); if (per === 'last') { const m = monthRange(isoAdd(monthRange(t0).from, -1)); return m; } return { from: from, to: to }; }
    function draw() {
      root.innerHTML = U.purpose('தினசரி வரவு-செலவுக் கணக்கு — எவ்வளவு வந்தது, எதற்கு எவ்வளவு போனது, கையில் எவ்வளவு ரொக்கம். ரொக்கம், UPI, வங்கி தனித்தனியாக.', 'Daily cash book — what came in, what went out and for what, cash in hand. Cash, UPI and bank kept apart.') +
        U.tabs([['add', '➕ ' + T('பதிவு', 'Add')], ['sum', '📊 ' + T('கணக்கு', 'Summary')], ['list', '📋 ' + T('பதிவுகள்', 'Entries')], ['set', '⚙️ ' + T('அமைப்பு', 'Settings')]], view) + '<div data-k="pane"></div>';
      $$(root, '[data-tab]').forEach(b => { b.onclick = () => { view = b.getAttribute('data-tab'); draw(); }; });
      const pane = $(root, '[data-k=pane]');
      ({ add: drawAdd, sum: drawSum, list: drawList, set: drawSet })[view](pane);
    }
    function drawAdd(pane) {
      const t0 = U.todayIso(), s = cashSummary(db.e, t0, t0), hand = cashInHand(db.e, db.open);
      pane.innerHTML = '<div class="ba-big"><button type="button" data-ty="in" style="background:' + (type === 'in' ? '#1E8E5A' : '#9CCBB2') + '">⬇️ ' + T('வரவு', 'Money in') + '</button><button type="button" data-ty="out" style="background:' + (type === 'out' ? '#C0392B' : '#E2A49D') + '">⬆️ ' + T('செலவு', 'Money out') + '</button></div>' +
        '<div class="bz-grid">' + U.field(T('தொகை (₹)', 'Amount (₹)'), 'a', '') + U.selectField(T('எப்படி', 'How'), 'm', [['cash', T('ரொக்கம்', 'Cash')], ['upi', 'UPI / GPay'], ['bank', T('வங்கி', 'Bank')]], 'cash') + '</div>' +
        '<div class="bz-h">' + T('எதற்கு', 'For') + '</div><div class="bz-chips">' + cats(type).map((c, i) => '<button type="button" class="bz-chip' + (i === 0 ? ' on' : '') + '" data-cat="' + U.esc(c) + '">' + U.esc(sh(U, c)) + '</button>').join('') + '</div>' +
        '<div class="bz-grid">' + U.textField(T('குறிப்பு (விரும்பினால்)', 'Note (optional)'), 'n', '') + U.field(T('தேதி', 'Date'), 'd', t0, { type: 'date', mode: 'text' }) + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn" data-act="save">💾 ' + T('சேமி', 'Save') + '</button></div><div data-k="msg"></div>' +
        U.resCard(T('இன்று', 'Today'), T('வரவு ', 'In ') + U.inr(s.in) + ' · ' + T('செலவு ', 'Out ') + U.inr(s.out), T('இன்றைய மீதம் ', 'Net today ') + U.inr(s.net) + ' · ' + T('கையில் ரொக்கம் ', 'Cash in hand ') + U.inr(hand), s.net >= 0 ? 'ok' : 'warn');
      let cat = cats(type)[0];
      $$(pane, '[data-ty]').forEach(b => { b.onclick = () => { type = b.getAttribute('data-ty'); drawAdd(pane); }; });
      $$(pane, '[data-cat]').forEach(b => { b.onclick = () => { cat = b.getAttribute('data-cat'); $$(pane, '[data-cat]').forEach(x => x.classList.toggle('on', x === b)); }; });
      $(pane, '[data-act=save]').onclick = () => {
        const a = U.num($(pane, '[data-k=a]').value), msg = $(pane, '[data-k=msg]');
        if (!(a > 0)) { msg.innerHTML = '<div class="bz-msg">' + T('சரியான தொகை எழுதுங்கள்', 'Enter a valid amount') + '</div>'; return; }
        db.e.push({ id: U.uid(), d: $(pane, '[data-k=d]').value || t0, t: type, a: r2(a), c: cat, m: $(pane, '[data-k=m]').value, n: $(pane, '[data-k=n]').value.trim() }); save(); drawAdd(pane);
        $(pane, '[data-k=msg]').innerHTML = '<div class="bz-info">✓ ' + T('சேமிக்கப்பட்டது', 'Saved') + ': ' + (type === 'in' ? '⬇️ ' : '⬆️ ') + U.inr(a) + ' · ' + U.esc(sh(U, cat)) + '</div>';
      };
    }
    function perChips() { return '<div class="bz-chips">' + [['today', T('இன்று', 'Today')], ['week', T('இந்த வாரம்', 'This week')], ['month', T('இந்த மாதம்', 'This month')], ['last', T('போன மாதம்', 'Last month')], ['custom', T('தேதி தேர்வு', 'Pick dates')]].map(p => '<button type="button" class="bz-chip' + (p[0] === per ? ' on' : '') + '" data-per="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>' + (per === 'custom' ? '<div class="bz-grid">' + U.field(T('முதல்', 'From'), 'from', from, { type: 'date', mode: 'text' }) + U.field(T('வரை', 'To'), 'to', to, { type: 'date', mode: 'text' }) + '</div>' : ''); }
    function bindPer(pane, again) { $$(pane, '[data-per]').forEach(b => { b.onclick = () => { per = b.getAttribute('data-per'); again(pane); }; }); ['from', 'to'].forEach(k => { const i = $(pane, '[data-k=' + k + ']'); if (i) i.addEventListener('change', () => { if (k === 'from') from = i.value; else to = i.value; again(pane); }); }); }
    function drawSum(pane) {
      const r = range(), s = cashSummary(db.e, r.from, r.to);
      const ins = Object.keys(s.byCat).filter(k => s.byCat[k] > 0).sort((a, b) => s.byCat[b] - s.byCat[a]), outs = Object.keys(s.byCat).filter(k => s.byCat[k] < 0).sort((a, b) => s.byCat[a] - s.byCat[b]);
      pane.innerHTML = perChips() + U.resCard(T('மீதம் (வரவு − செலவு)', 'Net (in − out)'), U.inr(s.net), (r.from ? U.dmy(r.from) + ' – ' + U.dmy(r.to) : '') + ' · ' + s.count + T(' பதிவுகள்', ' entries'), s.net >= 0 ? 'ok' : 'warn') +
        U.table([[T('மொத்த வரவு', 'Total in'), U.inr(s.in), true]].concat(ins.map(k => [U.esc(sh(U, k)), U.inr(s.byCat[k])])).concat([[T('மொத்தச் செலவு', 'Total out'), U.inr(s.out), true]]).concat(outs.map(k => [U.esc(sh(U, k)), U.inr(-s.byCat[k])]))) +
        U.table([[T('ரொக்கம் (நிகரம்)', 'Cash (net)'), U.inr(s.byMode.cash)], ['UPI', U.inr(s.byMode.upi)], [T('வங்கி', 'Bank'), U.inr(s.byMode.bank)], [T('இப்போது கையில் ரொக்கம்', 'Cash in hand now'), U.inr(cashInHand(db.e, db.open)), true]]) +
        '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="csv">📊 Excel (.csv)</button><a class="bz-btn green sm" target="_blank" rel="noopener" data-k="wa" href="#">💬 ' + T('கணக்கை அனுப்பு', 'Share summary') + '</a></div>';
      bindPer(pane, drawSum);
      const txt = [T('வரவு-செலவு ', 'Cash book ') + (r.from ? U.dmy(r.from) + ' – ' + U.dmy(r.to) : ''), T('வரவு: ', 'In: ') + U.inr(s.in), T('செலவு: ', 'Out: ') + U.inr(s.out), T('மீதம்: ', 'Net: ') + U.inr(s.net)].concat(outs.slice(0, 8).map(k => '• ' + sh(U, k) + ': ' + U.inr(-s.byCat[k]))).join('\n');
      $(pane, '[data-k=wa]').href = U.waLink('', txt);
      $(pane, '[data-act=csv]').onclick = () => { const rows = [['Date', 'In/Out', 'Amount', 'Category', 'Mode', 'Note']].concat(db.e.filter(e => inRange(e.d, r.from, r.to)).sort((a, b) => a.d.localeCompare(b.d)).map(e => [e.d, e.t === 'in' ? 'In' : 'Out', e.a, sh(U, e.c), e.m, e.n])); dl(U, '﻿' + rows.map(x => x.map(U.csvCell).join(',')).join('\r\n'), 'cashbook-' + (r.from || 'all') + '.csv', 'text/csv;charset=utf-8'); };
    }
    function drawList(pane) {
      const r = range(), rows = db.e.filter(e => inRange(e.d, r.from, r.to)).sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id)));
      pane.innerHTML = perChips() + '<div class="bz-tbl" style="padding:0">' + (rows.length ? rows.slice(0, 400).map(e => '<div class="bz-ent"><span><b>' + (e.t === 'in' ? '⬇️ ' : '⬆️ ') + U.esc(sh(U, e.c)) + '</b><br><small>' + U.esc(U.dmy(e.d)) + ' · ' + (e.m === 'upi' ? 'UPI' : e.m === 'bank' ? T('வங்கி', 'Bank') : T('ரொக்கம்', 'Cash')) + (e.n ? ' · ' + U.esc(e.n) : '') + '</small></span><span><span class="bz-amt ' + (e.t === 'in' ? 'adv' : 'owe') + '">' + U.inr(e.a) + '</span> <button type="button" class="bz-x" data-del="' + e.id + '" aria-label="delete">✕</button></span></div>').join('') : '<div class="bz-ent">' + T('பதிவு இல்லை', 'No entries') + '</div>') + '</div>';
      bindPer(pane, drawList);
      $$(pane, '[data-del]').forEach(b => { b.onclick = () => { if (!window.confirm(T('இந்தப் பதிவை நீக்கவா?', 'Delete this entry?'))) return; db.e = db.e.filter(x => x.id !== b.getAttribute('data-del')); save(); drawList(pane); }; });
    }
    function drawSet(pane) {
      const bk = backupRow(U, KEY, 'cashbook', () => { db = Object.assign({ open: '', e: [], cats: { in: [], out: [] } }, U.lsGet(KEY, {})); draw(); });
      pane.innerHTML = '<div class="bz-grid one">' + U.field(T('தொடக்கக் கையிருப்பு ரொக்கம் (₹)', 'Opening cash in hand (₹)'), 'open', db.open) + '</div>' +
        '<div class="bz-h">' + T('உங்கள் சொந்த வகைகள்', 'Your own categories') + '</div><div class="bz-grid">' + U.textField(T('புதிய வரவு வகை', 'New income type'), 'ci', '') + U.textField(T('புதிய செலவு வகை', 'New expense type'), 'co', '') + '</div><div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="addc">➕ ' + T('சேர்', 'Add') + '</button></div>' +
        '<div class="bz-info">' + T('தகவல் இந்த phone-ல் மட்டும். அடிக்கடி Backup எடுங்கள்.', 'Data stays on this phone only. Back up often.') + '</div>' + bk.html;
      $(pane, '[data-k=open]').addEventListener('input', e => { db.open = e.target.value; save(); });
      $(pane, '[data-act=addc]').onclick = () => { db.cats = db.cats || { in: [], out: [] }; const a = $(pane, '[data-k=ci]').value.trim(), b = $(pane, '[data-k=co]').value.trim(); if (a) db.cats.in.push(a.slice(0, 40)); if (b) db.cats.out.push(b.slice(0, 40)); save(); drawSet(pane); };
      bk.bind(pane);
    }
    draw();
  });

  /* ===================================================================== staffbook */
  reg('staffbook', function (body, U) {
    css(); const KEY = 'bz_staff_v1', root = U.makeRoot(body), T = U.T, $ = U.$, $$ = U.$$;
    const D = { w: [], att: {}, adv: [], paid: [], wk: 0, div: 30, shop: '' };
    let db = Object.assign({}, D, U.lsGet(KEY, {})); ['w', 'adv', 'paid'].forEach(k => { if (!Array.isArray(db[k])) db[k] = []; }); if (!db.att || typeof db.att !== 'object') db.att = {};
    let view = db.w.length ? 'att' : 'workers', day = U.todayIso(), per = 'week', editId = null;
    const save = () => U.lsSet(KEY, db);
    const active = () => db.w.filter(w => !w.off);
    const ML = { P: ['வந்தார்', 'Present'], H: ['அரை நாள்', 'Half day'], A: ['வரவில்லை', 'Absent'], W: ['விடுமுறை', 'Week off'] };
    function range() { const t0 = U.todayIso(); if (per === 'week') return weekRange(t0, n0(db.wk)); if (per === 'lastweek') return weekRange(isoAdd(weekRange(t0, n0(db.wk)).from, -1), n0(db.wk)); if (per === 'month') return monthRange(t0); return monthRange(isoAdd(monthRange(t0).from, -1)); }
    function draw() {
      root.innerHTML = U.purpose('வேலையாட்கள் வருகை, ஓவர்டைம், முன்பணம், வாரக் கூலி / மாதச் சம்பளம் — கணக்கு தானாக. மேஸ்திரி, கடை, பண்ணை, ஹோட்டல் எல்லோருக்கும்.', 'Workers\' attendance, overtime, advances and weekly / monthly pay — worked out for you. For contractors, shops, farms and hotels.') +
        U.tabs([['att', '✅ ' + T('வருகை', 'Attendance')], ['pay', '💰 ' + T('கூலி / சம்பளம்', 'Pay')], ['workers', '👷 ' + T('வேலையாட்கள்', 'Workers')]], view) + '<div data-k="pane"></div>';
      $$(root, '[data-tab]').forEach(b => { b.onclick = () => { view = b.getAttribute('data-tab'); editId = null; draw(); }; });
      const pane = $(root, '[data-k=pane]'); ({ att: drawAtt, pay: drawPay, workers: drawWorkers })[view](pane);
    }
    function drawAtt(pane) {
      const list = active(), marks = db.att[day] || {};
      const cnt = { P: 0, H: 0, A: 0, W: 0 }; list.forEach(w => { const x = marks[w.id]; if (x && cnt[x.s] != null) cnt[x.s]++; });
      pane.innerHTML = '<div class="bz-grid">' + U.field(T('தேதி', 'Date'), 'day', day, { type: 'date', mode: 'text' }) + '<div class="bz-f"><label>&nbsp;</label><button type="button" class="bz-btn sec" data-act="allp" style="width:100%">✅ ' + T('எல்லோரும் வந்தார்கள்', 'Everyone present') + '</button></div></div>' +
        (list.length ? '<div class="bz-list">' + list.map(w => { const x = marks[w.id] || {}; return '<div class="bz-row" style="cursor:default;flex-direction:column;align-items:stretch"><span><b>' + U.esc(w.n) + '</b><small>' + (w.type === 'month' ? T('மாதம் ', 'Month ') : T('நாள் ', 'Day ')) + U.inr(U.num(w.wage) || 0) + '</small></span><div class="ba-mk">' + MARKS.map(m => '<button type="button" class="' + m + (x.s === m ? ' on' : '') + '" data-w="' + w.id + '" data-m="' + m + '">' + T(ML[m][0], ML[m][1]) + '</button>').join('') + '</div>' + (x.s === 'P' || x.s === 'H' ? '<div class="bz-grid" style="margin-top:6px">' + '<div class="bz-f"><label>' + T('ஓவர்டைம் (மணி)', 'Overtime (hours)') + '</label><input type="text" inputmode="decimal" data-ot="' + w.id + '" value="' + U.esc(x.ot || '') + '"></div></div>' : '') + '</div>'; }).join('') + '</div>' +
          U.resCard(T('இன்றைய வருகை', 'Attendance'), cnt.P + ' / ' + list.length, T('அரை நாள் ', 'Half ') + cnt.H + ' · ' + T('வரவில்லை ', 'Absent ') + cnt.A + ' · ' + T('விடுமுறை ', 'Off ') + cnt.W, 'ok')
          : '<div class="bz-info">' + T('முதலில் 👷 வேலையாட்கள் பகுதியில் பெயர்களைச் சேருங்கள்.', 'Add workers first in 👷 Workers.') + '</div>');
      $(pane, '[data-k=day]').addEventListener('change', e => { day = e.target.value || U.todayIso(); drawAtt(pane); });
      $(pane, '[data-act=allp]').onclick = () => { db.att[day] = db.att[day] || {}; list.forEach(w => { const x = db.att[day][w.id]; if (!x || !x.s) db.att[day][w.id] = { s: 'P' }; }); save(); drawAtt(pane); };
      $$(pane, '[data-m]').forEach(b => { b.onclick = () => { db.att[day] = db.att[day] || {}; const id = b.getAttribute('data-w'), m = b.getAttribute('data-m'), cur = db.att[day][id] || {}; db.att[day][id] = cur.s === m ? {} : { s: m, ot: m === 'P' || m === 'H' ? cur.ot : '' }; save(); const y = window.scrollY; drawAtt(pane); window.scrollTo(0, y); }; });
      $$(pane, '[data-ot]').forEach(i => i.addEventListener('input', () => { const id = i.getAttribute('data-ot'); db.att[day][id].ot = i.value; save(); }));
    }
    function drawPay(pane) {
      const r = range(), list = active();
      const rows = list.map(w => ({ w: w, p: staffPay(w, db.att, db.adv, db.paid, r.from, r.to, db.div) }));
      const tot = rows.reduce((a, x) => a + Math.max(0, x.p.bal), 0);
      pane.innerHTML = '<div class="bz-chips">' + [['week', T('இந்த வாரம்', 'This week')], ['lastweek', T('போன வாரம்', 'Last week')], ['month', T('இந்த மாதம்', 'This month')], ['lastmonth', T('போன மாதம்', 'Last month')]].map(p => '<button type="button" class="bz-chip' + (p[0] === per ? ' on' : '') + '" data-per="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>' +
        U.resCard(T('கொடுக்க வேண்டிய மொத்தம்', 'Total to pay'), U.inr(tot), U.dmy(r.from) + ' – ' + U.dmy(r.to), 'ok') +
        '<div class="bz-list">' + rows.map(x => { const p = x.p; return '<div class="bz-row" style="cursor:default;flex-direction:column;align-items:stretch"><span style="display:flex;justify-content:space-between;gap:8px"><b>' + U.esc(x.w.n) + '</b><span class="bz-amt ' + (p.bal > 0.004 ? 'owe' : 'zero') + '">' + U.inr(p.bal) + '</span></span><small>' +
          T('வந்தது ', 'Present ') + p.P + (p.H ? ' + ' + T('அரை ', 'half ') + p.H : '') + (p.W ? ' · ' + T('விடுமுறை ', 'off ') + p.W : '') + (p.A ? ' · ' + T('வரவில்லை ', 'absent ') + p.A : '') + ' → ' + T('கூலி ', 'earned ') + U.inr(p.earned) + (p.ot ? ' + OT ' + U.inr(p.ot) : '') + (p.adv ? ' − ' + T('முன்பணம் ', 'advance ') + U.inr(p.adv) : '') + (p.paid ? ' − ' + T('கொடுத்தது ', 'paid ') + U.inr(p.paid) : '') + '</small>' +
          '<div class="bz-actions" style="margin-top:6px"><button type="button" class="bz-btn sm" data-pay="' + x.w.id + '"' + (p.bal > 0.004 ? '' : ' disabled') + '>💵 ' + T('கொடுத்தேன்', 'Paid') + ' ' + U.inr(Math.max(0, p.bal)) + '</button><button type="button" class="bz-btn sec sm" data-adv="' + x.w.id + '">➕ ' + T('முன்பணம்', 'Advance') + '</button>' + (x.w.ph ? '<a class="bz-btn green sm" target="_blank" rel="noopener" href="' + U.esc(U.waLink(x.w.ph, slip(x.w, p, r))) + '">💬 ' + T('சம்பளச் சீட்டு', 'Pay slip') + '</a>' : '') + '</div></div>'; }).join('') + '</div>' +
        (list.length ? '' : '<div class="bz-info">' + T('வேலையாட்கள் இல்லை.', 'No workers yet.') + '</div>') +
        '<div class="bz-info">' + T('நாள் கூலி: (வந்த நாள் + அரை நாள் ÷ 2) × கூலி. மாதச் சம்பளம்: சம்பளம் ÷ ' + db.div + ' × (வந்த நாள் + அரை நாள் ÷ 2 + விடுமுறை). விதியை 👷 பகுதியில் மாற்றலாம்.', 'Daily wage: (present + half ÷ 2) × wage. Monthly: salary ÷ ' + db.div + ' × (present + half ÷ 2 + week-offs). Change the rule in 👷 Workers.') + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="csv">📊 Excel (.csv)</button></div>';
      $$(pane, '[data-per]').forEach(b => { b.onclick = () => { per = b.getAttribute('data-per'); drawPay(pane); }; });
      $$(pane, '[data-pay]').forEach(b => { b.onclick = () => { const x = rows.find(y => y.w.id === b.getAttribute('data-pay')); if (!x || !(x.p.bal > 0)) return; db.paid.push({ id: U.uid(), w: x.w.id, d: r.to < U.todayIso() ? r.to : U.todayIso(), a: x.p.bal }); save(); drawPay(pane); }; });
      $$(pane, '[data-adv]').forEach(b => { b.onclick = () => { const v = U.num(window.prompt(T('முன்பணம் எவ்வளவு (₹)?', 'Advance amount (₹)?'), '') || ''); if (!(v > 0)) return; db.adv.push({ id: U.uid(), w: b.getAttribute('data-adv'), d: U.todayIso(), a: r2(v) }); save(); drawPay(pane); }; });
      $(pane, '[data-act=csv]').onclick = () => { const lines = [['Worker', 'Present', 'Half', 'Week off', 'Absent', 'OT hours', 'Earned', 'OT pay', 'Advance', 'Paid', 'Balance']].concat(rows.map(x => [x.w.n, x.p.P, x.p.H, x.p.W, x.p.A, x.p.otHours, x.p.earned, x.p.ot, x.p.adv, x.p.paid, x.p.bal])); dl(U, '﻿' + lines.map(l => l.map(U.csvCell).join(',')).join('\r\n'), 'wages-' + r.from + '.csv', 'text/csv;charset=utf-8'); };
    }
    function slip(w, p, r) {
      return [T('சம்பள விவரம்', 'Pay slip') + (db.shop ? ' — ' + db.shop : ''), w.n, U.dmy(r.from) + ' – ' + U.dmy(r.to), T('வந்த நாட்கள்: ', 'Days present: ') + p.P + (p.H ? ' + ' + T('அரை நாள் ', 'half days ') + p.H : '') + (p.W ? ', ' + T('விடுமுறை ', 'week off ') + p.W : ''), T('கூலி: ', 'Earned: ') + U.inr(p.earned)].concat(p.ot ? ['OT (' + p.otHours + T(' மணி', ' h') + '): ' + U.inr(p.ot)] : []).concat(p.adv ? [T('முன்பணம்: −', 'Advance: −') + U.inr(p.adv)] : []).concat(p.paid ? [T('ஏற்கனவே கொடுத்தது: −', 'Already paid: −') + U.inr(p.paid)] : []).concat([T('கொடுக்க வேண்டியது: ', 'Balance: ') + U.inr(p.bal)]).join('\n');
    }
    function drawWorkers(pane) {
      const w = editId ? db.w.find(x => x.id === editId) : null;
      const bk = backupRow(U, KEY, 'staff', () => { db = Object.assign({}, D, U.lsGet(KEY, {})); draw(); });
      pane.innerHTML = '<div class="bz-h">' + (w ? T('மாற்று', 'Edit') + ': ' + U.esc(w.n) : T('புதிய வேலையாள்', 'New worker')) + '</div><div class="bz-grid">' + U.textField(T('பெயர்', 'Name'), 'n', w ? w.n : '') + U.field(T('போன் (WhatsApp)', 'Phone'), 'ph', w ? w.ph : '', { mode: 'tel' }) +
        U.selectField(T('கூலி வகை', 'Pay type'), 'type', [['day', T('நாள் கூலி', 'Daily wage')], ['month', T('மாதச் சம்பளம்', 'Monthly salary')]], w ? w.type : 'day') + U.field(T('கூலி / சம்பளம் (₹)', 'Wage / salary (₹)'), 'wage', w ? w.wage : '') + U.field(T('ஓவர்டைம் ₹ / மணி', 'Overtime ₹ / hour'), 'ot', w ? w.ot : '') + U.textField(T('வேலை (மேஸ்திரி, சித்தாள்…)', 'Role'), 'role', w ? w.role : '') + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn" data-act="save">💾 ' + T('சேமி', 'Save') + '</button>' + (w ? '<button type="button" class="bz-btn sec" data-act="cancel">' + T('ரத்து', 'Cancel') + '</button><button type="button" class="bz-btn sec" data-act="off">' + (w.off ? T('மீண்டும் வேலையில்', 'Active again') : T('வேலையை விட்டார்', 'Left work')) + '</button>' : '') + '</div>' +
        '<div class="bz-list">' + db.w.map(x => '<button type="button" class="bz-row" data-ed="' + x.id + '"><span><b>' + U.esc(x.n) + (x.off ? ' (' + T('விட்டார்', 'left') + ')' : '') + '</b><small>' + U.esc(x.role || '') + ' · ' + (x.type === 'month' ? T('மாதம் ', 'month ') : T('நாள் ', 'day ')) + U.inr(U.num(x.wage) || 0) + '</small></span><span>✏️</span></button>').join('') + '</div>' +
        '<div class="bz-h">' + T('விதிகள்', 'Rules') + '</div><div class="bz-grid">' + U.selectField(T('வாரம் தொடங்கும் நாள்', 'Week starts on'), 'wk', [[0, T('ஞாயிறு', 'Sunday')], [1, T('திங்கள்', 'Monday')], [6, T('சனி', 'Saturday')]], db.wk) + U.selectField(T('மாதச் சம்பளம் வகுத்தல்', 'Monthly salary per day ='), 'div', [[30, T('சம்பளம் ÷ 30', 'salary ÷ 30')], [26, T('சம்பளம் ÷ 26', 'salary ÷ 26')], [31, T('சம்பளம் ÷ 31', 'salary ÷ 31')]], db.div) + '</div>' +
        U.textField(T('நிறுவனம் / மேஸ்திரி பெயர் (சம்பளச் சீட்டில்)', 'Firm / contractor name (on pay slips)'), 'shop', db.shop) + bk.html;
      $(pane, '[data-act=save]').onclick = () => {
        const v = k => $(pane, '[data-k=' + k + ']').value.trim(); if (!v('n')) return;
        const o = { n: v('n'), ph: v('ph'), type: v('type'), wage: v('wage'), ot: v('ot'), role: v('role') };
        if (w) Object.assign(w, o); else db.w.push(Object.assign({ id: U.uid() }, o)); editId = null; save(); drawWorkers(pane);
      };
      if (w) { $(pane, '[data-act=cancel]').onclick = () => { editId = null; drawWorkers(pane); }; $(pane, '[data-act=off]').onclick = () => { w.off = !w.off; save(); editId = null; drawWorkers(pane); }; }
      $$(pane, '[data-ed]').forEach(b => { b.onclick = () => { editId = b.getAttribute('data-ed'); drawWorkers(pane); window.scrollTo(0, 0); }; });
      $(pane, '[data-k=wk]').addEventListener('change', e => { db.wk = +e.target.value; save(); });
      $(pane, '[data-k=div]').addEventListener('change', e => { db.div = +e.target.value; save(); });
      $(pane, '[data-k=shop]').addEventListener('input', e => { db.shop = e.target.value; save(); });
      bk.bind(pane);
    }
    draw();
  });

  /* ===================================================================== bookings */
  reg('bookings', function (body, U) {
    css(); const KEY = 'bz_book_v1', root = U.makeRoot(body), T = U.T, $ = U.$, $$ = U.$$;
    let db = Object.assign({ b: [], shop: '' }, U.lsGet(KEY, {})); if (!Array.isArray(db.b)) db.b = [];
    let view = 'cal', month = U.todayIso().slice(0, 7), sel = U.todayIso(), edit = null;
    const save = () => U.lsSet(KEY, db);
    const MON = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'], MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = U.isEn() ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'];
    function draw() {
      root.innerHTML = U.purpose('முன்பதிவு / அப்பாயிண்ட்மெண்ட் நாள்காட்டி — திருமண போட்டோ, பியூட்டி பார்லர், கேட்டரிங், வாடகை வண்டி, மண்டபம், டியூஷன். ஒரே நேரத்தில் இரண்டு முன்பதிவு வந்தால் எச்சரிக்கை.', 'Bookings calendar — wedding photos, salon, catering, rental vehicles, halls, tuition. Warns when two bookings clash.') +
        U.tabs([['cal', '📅 ' + T('நாள்காட்டி', 'Calendar')], ['up', '⏭️ ' + T('வரவிருப்பவை', 'Upcoming')], ['new', '➕ ' + (edit ? T('மாற்று', 'Edit') : T('புதியது', 'New'))]], view) + '<div data-k="pane"></div>';
      $$(root, '[data-tab]').forEach(b => { b.onclick = () => { view = b.getAttribute('data-tab'); if (view !== 'new') edit = null; draw(); }; });
      const pane = $(root, '[data-k=pane]'); ({ cal: drawCal, up: drawUp, new: drawNew })[view](pane);
    }
    const card = x => { const c = clashes(db.b, x).length; return '<div class="bz-row" style="cursor:default;flex-direction:column;align-items:stretch"><span style="display:flex;justify-content:space-between;gap:8px"><b>' + U.esc(U.dmy(x.d)) + (x.t ? ' · ' + U.esc(x.t) : '') + ' — ' + U.esc(x.what || '') + '</b>' + (x.st === 'done' ? '<span class="bz-st done">✓</span>' : x.st === 'cancel' ? '<span class="bz-st late">' + T('ரத்து', 'Cancelled') + '</span>' : '') + '</span><small>' + U.esc(x.cust || '') + (x.ph ? ' · ' + U.esc(x.ph) : '') + (x.place ? ' · 📍 ' + U.esc(x.place) : '') + '</small>' +
      (U.num(x.total) > 0 ? '<small>' + T('மொத்தம் ', 'Total ') + U.inr(U.num(x.total)) + ' · ' + T('முன்பணம் ', 'Advance ') + U.inr(U.num(x.adv) || 0) + ' · ' + T('மீதம் ', 'Balance ') + U.inr(r2(U.num(x.total) - (U.num(x.adv) || 0))) + '</small>' : '') + (c && x.st !== 'cancel' ? '<small style="color:#C0392B;font-weight:800">⚠️ ' + T('அதே நேரத்தில் ' + c + ' முன்பதிவு', c + ' other booking(s) at the same time') + '</small>' : '') +
      '<div class="bz-actions" style="margin-top:6px">' + (x.ph ? '<a class="bz-btn green sm" target="_blank" rel="noopener" href="' + U.esc(U.waLink(x.ph, msg(x, 'ok'))) + '">💬 ' + T('உறுதி', 'Confirm') + '</a><a class="bz-btn green sm" target="_blank" rel="noopener" href="' + U.esc(U.waLink(x.ph, msg(x, 'rem'))) + '">⏰ ' + T('நினைவூட்டு', 'Remind') + '</a>' : '') + '<button type="button" class="bz-btn sec sm" data-ics="' + x.id + '">📅 ' + T('போன் நாள்காட்டி', 'Phone calendar') + '</button><button type="button" class="bz-btn sec sm" data-ed="' + x.id + '">✏️</button>' + (x.st === 'booked' ? '<button type="button" class="bz-btn sec sm" data-done="' + x.id + '">✓ ' + T('முடிந்தது', 'Done') + '</button>' : '') + '</div></div>'; };
    function msg(x, k) {
      const shop = db.shop ? ' — ' + db.shop : '', when = U.dmy(x.d) + (x.t ? ' ' + x.t : '');
      return k === 'ok' ? T('வணக்கம் ', 'Hello ') + (x.cust || '') + ', ' + T('உங்கள் முன்பதிவு உறுதி: ', 'your booking is confirmed: ') + (x.what || '') + ' — ' + when + (x.place ? ', ' + x.place : '') + (U.num(x.adv) > 0 ? '. ' + T('முன்பணம் பெற்றது ', 'Advance received ') + U.inr(U.num(x.adv)) : '') + (U.num(x.total) > 0 ? '. ' + T('மீதம் ', 'Balance ') + U.inr(r2(U.num(x.total) - (U.num(x.adv) || 0))) : '') + '.' + shop
        : T('வணக்கம் ', 'Hello ') + (x.cust || '') + ', ' + T('நினைவூட்டல்: ', 'reminder: ') + (x.what || '') + ' — ' + when + (x.place ? ', ' + x.place : '') + '.' + shop;
    }
    function bindCards(pane, again) {
      $$(pane, '[data-ics]').forEach(b => { b.onclick = () => { const x = db.b.find(y => y.id === b.getAttribute('data-ics')); if (!x) return; dl(U, icsFor({ id: x.id, d: x.d, t: x.t, mins: x.mins, title: (x.what || T('முன்பதிவு', 'Booking')) + (x.cust ? ' — ' + x.cust : ''), place: x.place, note: [x.ph, x.note].filter(Boolean).join(' · ') }), 'booking-' + x.d + '.ics', 'text/calendar;charset=utf-8'); }; });
      $$(pane, '[data-ed]').forEach(b => { b.onclick = () => { edit = b.getAttribute('data-ed'); view = 'new'; draw(); window.scrollTo(0, 0); }; });
      $$(pane, '[data-done]').forEach(b => { b.onclick = () => { const x = db.b.find(y => y.id === b.getAttribute('data-done')); if (x) { x.st = 'done'; save(); again(pane); } }; });
    }
    function drawCal(pane) {
      const y = +month.slice(0, 4), m = +month.slice(5, 7), first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), last = new Date(Date.UTC(y, m, 0)).getUTCDate(), t0 = U.todayIso();
      const count = {}; db.b.forEach(x => { if (x.st !== 'cancel' && x.d.slice(0, 7) === month) count[x.d] = (count[x.d] || 0) + 1; });
      let cells = DAYS.map(d => '<b>' + d + '</b>').join('');
      for (let i = 0; i < first; i++) cells += '<span></span>';
      for (let d = 1; d <= last; d++) { const iso = month + '-' + String(d).padStart(2, '0'); cells += '<button type="button" class="ba-day' + (iso === t0 ? ' today' : '') + (iso === sel ? ' sel' : '') + '" data-day="' + iso + '">' + d + (count[iso] ? '<i>' + count[iso] + '</i>' : '') + '</button>'; }
      const dayList = db.b.filter(x => x.d === sel).sort((a, b) => String(a.t).localeCompare(String(b.t)));
      pane.innerHTML = '<div class="bz-actions" style="justify-content:space-between;align-items:center"><button type="button" class="bz-btn sec sm" data-mv="-1">◀</button><b style="font-size:17px">' + (U.isEn() ? MON_EN[m - 1] : MON[m - 1]) + ' ' + y + '</b><button type="button" class="bz-btn sec sm" data-mv="1">▶</button></div><div class="ba-cal">' + cells + '</div>' +
        '<div class="bz-h">' + U.esc(U.dmy(sel)) + '</div><div class="bz-list">' + (dayList.length ? dayList.map(card).join('') : '<div class="bz-info">' + T('இந்த நாளில் முன்பதிவு இல்லை.', 'No bookings on this day.') + '</div>') + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn" data-act="add">➕ ' + T('இந்த நாளில் முன்பதிவு', 'Book this day') + '</button></div>';
      $$(pane, '[data-mv]').forEach(b => { b.onclick = () => { const d = new Date(Date.UTC(y, m - 1 + +b.getAttribute('data-mv'), 1)); month = d.toISOString().slice(0, 7); drawCal(pane); }; });
      $$(pane, '[data-day]').forEach(b => { b.onclick = () => { sel = b.getAttribute('data-day'); drawCal(pane); }; });
      $(pane, '[data-act=add]').onclick = () => { edit = null; view = 'new'; draw(); };
      bindCards(pane, drawCal);
    }
    function drawUp(pane) {
      const t0 = U.todayIso(), list = db.b.filter(x => x.d >= t0 && x.st === 'booked').sort((a, b) => (a.d + (a.t || '')).localeCompare(b.d + (b.t || '')));
      const due = list.reduce((a, x) => a + Math.max(0, (U.num(x.total) || 0) - (U.num(x.adv) || 0)), 0);
      pane.innerHTML = U.resCard(T('வரவிருக்கும் முன்பதிவுகள்', 'Upcoming bookings'), String(list.length), T('வர வேண்டிய மீதப் பணம் ', 'Balance still to collect ') + U.inr(r2(due)), 'ok') + '<div class="bz-list">' + list.slice(0, 200).map(card).join('') + '</div>' + backupRow(U, KEY, 'bookings', () => { db = Object.assign({ b: [], shop: '' }, U.lsGet(KEY, {})); draw(); }).html;
      bindCards(pane, drawUp);
      backupRow(U, KEY, 'bookings', () => { db = Object.assign({ b: [], shop: '' }, U.lsGet(KEY, {})); draw(); }).bind(pane);
    }
    function drawNew(pane) {
      const x = edit ? db.b.find(y => y.id === edit) : null;
      pane.innerHTML = '<div class="bz-grid">' + U.field(T('தேதி', 'Date'), 'd', x ? x.d : sel, { type: 'date', mode: 'text' }) + U.field(T('நேரம் (விரும்பினால்)', 'Time (optional)'), 't', x ? x.t : '', { type: 'time', mode: 'text' }) +
        U.selectField(T('எவ்வளவு நேரம்', 'Duration'), 'mins', [[30, '30 ' + T('நிமிடம்', 'min')], [60, '1 ' + T('மணி', 'hour')], [120, '2 ' + T('மணி', 'hours')], [240, '4 ' + T('மணி', 'hours')], [480, T('அரை நாள்', 'Half day')], [720, T('முழு நாள்', 'Full day')]], x ? x.mins : 60) + U.textField(T('என்ன (எ.கா. திருமண போட்டோ)', 'What (e.g. wedding photos)'), 'what', x ? x.what : '') +
        U.textField(T('வாடிக்கையாளர்', 'Customer'), 'cust', x ? x.cust : '') + U.field(T('போன் (WhatsApp)', 'Phone'), 'ph', x ? x.ph : '', { mode: 'tel' }) + U.textField(T('இடம் / மண்டபம்', 'Place'), 'place', x ? x.place : '') + U.field(T('மொத்தக் கட்டணம் (₹)', 'Total (₹)'), 'total', x ? x.total : '') + U.field(T('முன்பணம் (₹)', 'Advance (₹)'), 'adv', x ? x.adv : '') + U.textField(T('குறிப்பு', 'Note'), 'note', x ? x.note : '') + '</div>' +
        '<div data-k="clash"></div><div class="bz-actions"><button type="button" class="bz-btn" data-act="save">💾 ' + T('சேமி', 'Save') + '</button>' + (x ? '<button type="button" class="bz-btn sec" data-act="cancelb">🚫 ' + T('முன்பதிவை ரத்து செய்', 'Cancel booking') + '</button><button type="button" class="bz-btn sec" data-act="del">🗑️</button>' : '') + '</div>' +
        U.textField(T('உங்கள் கடை / நிறுவனப் பெயர் (செய்தியில் வரும்)', 'Your business name (used in messages)'), 'shop', db.shop);
      const val = k => $(pane, '[data-k=' + k + ']').value.trim();
      const check = () => { const c = clashes(db.b, { id: x ? x.id : '', d: val('d'), t: val('t'), mins: +val('mins') }); $(pane, '[data-k=clash]').innerHTML = c.length ? '<div class="bz-msg">⚠️ ' + T('இதே நேரத்தில் ஏற்கனவே: ', 'Already booked then: ') + c.map(y => U.esc((y.t || T('முழு நாள்', 'all day')) + ' ' + (y.what || '') + ' ' + (y.cust || ''))).join('; ') + '</div>' : ''; };
      ['d', 't', 'mins'].forEach(k => $(pane, '[data-k=' + k + ']').addEventListener('change', check)); check();
      $(pane, '[data-k=shop]').addEventListener('input', e => { db.shop = e.target.value; save(); });
      $(pane, '[data-act=save]').onclick = () => {
        if (!val('d')) return; const o = { d: val('d'), t: val('t'), mins: +val('mins') || 60, what: val('what'), cust: val('cust'), ph: val('ph'), place: val('place'), total: val('total'), adv: val('adv'), note: val('note') };
        if (x) Object.assign(x, o); else db.b.push(Object.assign({ id: U.uid(), st: 'booked' }, o)); save(); sel = o.d; month = o.d.slice(0, 7); edit = null; view = 'cal'; draw();
      };
      if (x) {
        $(pane, '[data-act=cancelb]').onclick = () => { x.st = 'cancel'; save(); edit = null; view = 'cal'; draw(); };
        $(pane, '[data-act=del]').onclick = () => { if (!window.confirm(T('இந்த முன்பதிவை நீக்கவா?', 'Delete this booking?'))) return; db.b = db.b.filter(y => y.id !== x.id); save(); edit = null; view = 'cal'; draw(); };
      }
    }
    draw();
  });

  /* ===================================================================== stockbook */
  reg('stockbook', function (body, U) {
    css(); const KEY = 'bz_stock_v1', root = U.makeRoot(body), T = U.T, $ = U.$, $$ = U.$$;
    let db = Object.assign({ it: [], mv: [], sup: '' }, U.lsGet(KEY, {})); if (!Array.isArray(db.it)) db.it = []; if (!Array.isArray(db.mv)) db.mv = [];
    let view = 'list', q = '', editId = null, cur = null;
    const save = () => U.lsSet(KEY, db);
    const qty = it => stockQty(it, db.mv);
    const low = it => U.num(it.min) > 0 && qty(it) <= U.num(it.min);
    function draw() {
      root.innerHTML = U.purpose('சரக்கு இருப்பு — எந்தப் பொருள் எவ்வளவு உள்ளது, வந்தது / போனது, குறைந்துவிட்டவை, இருப்பின் மதிப்பு. மளிகை, உதிரிபாகக் கடை, ஹோட்டல், பண்ணை.', 'Stock book — how much of each item you have, stock in / out, what is running low, stock value. For grocers, spare-parts shops, hotels, farms.') +
        U.tabs([['list', '📦 ' + T('இருப்பு', 'Stock')], ['low', '⚠️ ' + T('குறைந்தவை', 'Running low') + (db.it.filter(low).length ? '<span class="bz-badge">' + db.it.filter(low).length + '</span>' : '')], ['item', '➕ ' + (editId ? T('மாற்று', 'Edit') : T('புதிய பொருள்', 'New item'))]], view) + '<div data-k="pane"></div>';
      $$(root, '[data-tab]').forEach(b => { b.onclick = () => { view = b.getAttribute('data-tab'); if (view !== 'item') editId = null; cur = null; draw(); }; });
      const pane = $(root, '[data-k=pane]'); if (cur) return drawItem(pane); ({ list: drawList, low: drawLow, item: drawEdit })[view](pane);
    }
    function drawList(pane) {
      const s = q.trim().toLowerCase(), list = db.it.filter(it => !s || it.n.toLowerCase().indexOf(s) >= 0).sort((a, b) => a.n.localeCompare(b.n));
      pane.innerHTML = U.resCard(T('இருப்பின் மதிப்பு (வாங்கிய விலையில்)', 'Stock value (at cost)'), U.inr(stockValue(db.it, db.mv)), db.it.length + T(' பொருட்கள்', ' items'), 'ok') +
        '<div class="bz-f"><input type="text" data-k="q" value="' + U.esc(q) + '" placeholder="' + U.esc(T('பொருள் தேடு', 'Search item')) + '"></div><div class="bz-list">' +
        (list.length ? list.map(it => '<button type="button" class="bz-row" data-it="' + it.id + '"><span><b>' + U.esc(it.n) + '</b><small>' + (U.num(it.price) > 0 ? T('விற்பனை ', 'Sell ') + U.inr(U.num(it.price)) + ' · ' : '') + (U.num(it.min) > 0 ? T('குறைந்தபட்சம் ', 'Min ') + U.fmtNum(U.num(it.min)) : '') + '</small></span><span class="bz-amt ' + (low(it) ? 'owe' : 'adv') + '">' + U.fmtNum(qty(it), 3) + ' ' + U.esc(it.u || '') + '</span></button>').join('') : '<div class="bz-info">' + T('பொருட்கள் இல்லை. ➕ புதிய பொருள் சேருங்கள்.', 'No items yet. Add one with ➕.') + '</div>') + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="csv">📊 Excel (.csv)</button></div>' + backupRow(U, KEY, 'stock', () => { db = Object.assign({ it: [], mv: [], sup: '' }, U.lsGet(KEY, {})); draw(); }).html;
      const qi = $(pane, '[data-k=q]'); qi.addEventListener('input', () => { q = qi.value; drawList(pane); const n = $(pane, '[data-k=q]'); n.focus(); n.setSelectionRange(q.length, q.length); });
      $$(pane, '[data-it]').forEach(b => { b.onclick = () => { cur = b.getAttribute('data-it'); draw(); window.scrollTo(0, 0); }; });
      $(pane, '[data-act=csv]').onclick = () => { const rows = [['Item', 'Unit', 'In stock', 'Minimum', 'Cost', 'Price', 'Value']].concat(db.it.map(it => [it.n, it.u, qty(it), it.min, it.cost, it.price, r2(Math.max(0, qty(it)) * (U.num(it.cost) || 0))])); dl(U, '﻿' + rows.map(r => r.map(U.csvCell).join(',')).join('\r\n'), 'stock-' + U.todayIso() + '.csv', 'text/csv;charset=utf-8'); };
      backupRow(U, KEY, 'stock', () => { db = Object.assign({ it: [], mv: [], sup: '' }, U.lsGet(KEY, {})); draw(); }).bind(pane);
    }
    function drawLow(pane) {
      const list = db.it.filter(low);
      const txt = [T('வணக்கம், இந்தப் பொருட்கள் அனுப்பவும்:', 'Hello, please send:')].concat(list.map(it => '• ' + it.n + ' — ' + (U.num(it.reorder) > 0 ? U.fmtNum(U.num(it.reorder)) : '___') + ' ' + (it.u || ''))).join('\n');
      pane.innerHTML = (list.length ? '<div class="bz-list">' + list.map(it => '<button type="button" class="bz-row" data-it="' + it.id + '"><span><b>' + U.esc(it.n) + '</b><small>' + T('குறைந்தபட்சம் ', 'Min ') + U.fmtNum(U.num(it.min)) + '</small></span><span class="bz-amt owe">' + U.fmtNum(qty(it), 3) + ' ' + U.esc(it.u || '') + '</span></button>').join('') + '</div>' +
        '<div class="bz-grid one">' + U.field(T('சப்ளையர் WhatsApp எண்', 'Supplier WhatsApp'), 'sup', db.sup, { mode: 'tel' }) + '</div><div class="bz-actions"><a class="bz-btn green" target="_blank" rel="noopener" data-k="wa" href="' + U.esc(U.waLink(db.sup, txt)) + '">💬 ' + T('ஆர்டர் அனுப்பு', 'Send re-order') + '</a></div>'
        : '<div class="bz-info">👍 ' + T('குறைந்த பொருள் எதுவும் இல்லை.', 'Nothing is running low.') + '</div>');
      $$(pane, '[data-it]').forEach(b => { b.onclick = () => { cur = b.getAttribute('data-it'); draw(); }; });
      const s = $(pane, '[data-k=sup]'); if (s) s.addEventListener('input', () => { db.sup = s.value; save(); $(pane, '[data-k=wa]').href = U.waLink(db.sup, txt); });
    }
    function drawItem(pane) {
      const it = db.it.find(x => x.id === cur); if (!it) { cur = null; return draw(); }
      const mv = db.mv.filter(m => m.i === it.id).sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id)));
      pane.innerHTML = '<div class="bz-actions" style="margin-top:0"><button type="button" class="bz-btn sec sm" data-act="back">← ' + T('இருப்பு', 'Stock') + '</button><button type="button" class="bz-btn sec sm" data-act="edit">✏️</button></div>' +
        U.resCard(U.esc(it.n), U.fmtNum(qty(it), 3) + ' ' + U.esc(it.u || ''), low(it) ? '⚠️ ' + T('குறைந்துவிட்டது', 'Running low') : '', low(it) ? 'warn' : 'ok') +
        '<div class="bz-grid">' + U.field(T('எண்ணிக்கை / அளவு', 'Quantity'), 'q', '') + U.textField(T('குறிப்பு', 'Note'), 'n', '') + '</div>' +
        '<div class="ba-big"><button type="button" data-mvt="in" style="background:#1E8E5A">⬇️ ' + T('வந்தது (வாங்கியது)', 'Stock in') + '</button><button type="button" data-mvt="out" style="background:#C0392B">⬆️ ' + T('போனது (விற்றது)', 'Stock out') + '</button></div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-mvt="set">🔢 ' + T('எண்ணிப் பார்த்த சரியான இருப்பு', 'Set counted stock') + '</button></div>' +
        '<div class="bz-h">' + T('வரலாறு', 'History') + '</div><div class="bz-tbl" style="padding:0">' + (mv.length ? mv.slice(0, 200).map(m => '<div class="bz-ent"><span><b>' + (m.t === 'in' ? '⬇️ ' + T('வந்தது', 'In') : m.t === 'out' ? '⬆️ ' + T('போனது', 'Out') : '🔢 ' + T('சரிபார்ப்பு', 'Count')) + '</b><br><small>' + U.esc(U.dmy(m.d)) + (m.n ? ' · ' + U.esc(m.n) : '') + '</small></span><span><b>' + U.fmtNum(U.num(m.q), 3) + '</b> <button type="button" class="bz-x" data-del="' + m.id + '" aria-label="delete">✕</button></span></div>').join('') : '<div class="bz-ent">' + T('இன்னும் இல்லை', 'Nothing yet') + '</div>') + '</div>';
      $(pane, '[data-act=back]').onclick = () => { cur = null; draw(); };
      $(pane, '[data-act=edit]').onclick = () => { editId = it.id; cur = null; view = 'item'; draw(); };
      $$(pane, '[data-mvt]').forEach(b => { b.onclick = () => { const v = U.num($(pane, '[data-k=q]').value); if (!(v >= 0) || (b.getAttribute('data-mvt') !== 'set' && !(v > 0))) return; db.mv.push({ id: U.uid(), i: it.id, d: U.todayIso(), t: b.getAttribute('data-mvt'), q: r2(v), n: $(pane, '[data-k=n]').value.trim() }); save(); drawItem(pane); }; });
      $$(pane, '[data-del]').forEach(b => { b.onclick = () => { if (!window.confirm(T('இந்தப் பதிவை நீக்கவா?', 'Delete this entry?'))) return; db.mv = db.mv.filter(m => m.id !== b.getAttribute('data-del')); save(); drawItem(pane); }; });
    }
    function drawEdit(pane) {
      const it = editId ? db.it.find(x => x.id === editId) : null;
      pane.innerHTML = '<div class="bz-grid">' + U.textField(T('பொருள் பெயர்', 'Item name'), 'n', it ? it.n : '') + U.textField(T('அலகு (கிலோ, எண்ணம், பாக்கெட், லிட்டர்)', 'Unit (kg, pcs, packet, litre)'), 'u', it ? it.u : '') +
        (it ? '' : U.field(T('இப்போது உள்ள இருப்பு', 'Stock now'), 'open', '')) + U.field(T('குறைந்தபட்ச இருப்பு (எச்சரிக்கைக்கு)', 'Minimum (for the warning)'), 'min', it ? it.min : '') + U.field(T('ஆர்டர் செய்யும் அளவு', 'Re-order quantity'), 'reorder', it ? it.reorder : '') + U.field(T('வாங்கிய விலை (₹)', 'Cost (₹)'), 'cost', it ? it.cost : '') + U.field(T('விற்கும் விலை (₹)', 'Selling price (₹)'), 'price', it ? it.price : '') + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn" data-act="save">💾 ' + T('சேமி', 'Save') + '</button>' + (it ? '<button type="button" class="bz-btn sec" data-act="del">🗑️ ' + T('நீக்கு', 'Delete') + '</button>' : '') + '</div>';
      const v = k => { const e = $(pane, '[data-k=' + k + ']'); return e ? e.value.trim() : ''; };
      $(pane, '[data-act=save]').onclick = () => { if (!v('n')) return; const o = { n: v('n'), u: v('u'), min: v('min'), reorder: v('reorder'), cost: v('cost'), price: v('price') }; if (it) Object.assign(it, o); else db.it.push(Object.assign({ id: U.uid(), open: v('open') }, o)); save(); editId = null; view = 'list'; draw(); };
      if (it) $(pane, '[data-act=del]').onclick = () => { if (!window.confirm(T('இந்தப் பொருளும் அதன் வரலாறும் நீக்கப்படும். தொடரவா?', 'This item and its history will be deleted. Continue?'))) return; db.it = db.it.filter(x => x.id !== it.id); db.mv = db.mv.filter(m => m.i !== it.id); save(); editId = null; view = 'list'; draw(); };
    }
    draw();
  });

  /* ===================================================================== docremind */
  reg('docremind', function (body, U) {
    css(); const KEY = 'bz_docs_v1', root = U.makeRoot(body), T = U.T, $ = U.$, $$ = U.$$;
    let db = Object.assign({ d: [] }, U.lsGet(KEY, {})); if (!Array.isArray(db.d)) db.d = [];
    let editId = null;
    const save = () => U.lsSet(KEY, db);
    function draw() {
      const t0 = U.todayIso(), x = editId ? db.d.find(y => y.id === editId) : null;
      const list = db.d.map(y => Object.assign({}, y, { due: nextRepeat(y.date, y.rep, t0) })).sort((a, b) => a.due.localeCompare(b.due));
      const soon = list.filter(y => daysLeft(y.due, t0) <= (U.num(y.before) || 30)).length;
      root.innerHTML = U.purpose('புதுப்பிக்க வேண்டிய தேதிகள் — ஓட்டுநர் உரிமம், காப்பீடு, FC, பர்மிட், வாடகை ஒப்பந்தம், EMI, பாலிசி. நீங்கள் எழுதும் தேதியிலிருந்து இன்னும் எத்தனை நாள் என்று காட்டும்; போன் நாள்காட்டியில் அலாரம் வைக்கலாம்.', 'Renewal dates — licence, insurance, FC, permit, rent agreement, EMI, policy. Shows days left from the dates you type; add an alarm to your phone calendar.') +
        U.resCard(T('விரைவில் புதுப்பிக்க வேண்டியவை', 'Due soon'), String(soon), list.length + T(' பதிவுகள்', ' saved'), soon ? 'warn' : 'ok') +
        '<div class="bz-list">' + list.map(y => { const n = daysLeft(y.due, t0), cls = n < 0 ? 'red' : n <= (U.num(y.before) || 30) ? 'amb' : 'grn'; return '<div class="bz-row" style="cursor:default;flex-direction:column;align-items:stretch"><span style="display:flex;justify-content:space-between;gap:8px"><b>' + U.esc(sh(U, y.name)) + (y.what ? ' · ' + U.esc(y.what) : '') + '</b><span class="ba-left ' + cls + '">' + (n < 0 ? T(-n + ' நாள் தாண்டியது', (-n) + ' days late') : n === 0 ? T('இன்று', 'Today') : T(n + ' நாள்', n + ' days')) + '</span></span><small>' + U.esc(U.dmy(y.due)) + (y.rep && y.rep !== 'none' ? ' · ' + (y.rep === 'month' ? T('மாதம்தோறும்', 'monthly') : T('ஆண்டுதோறும்', 'yearly')) : '') + (y.note ? ' · ' + U.esc(y.note) : '') + '</small><div class="bz-actions" style="margin-top:6px"><button type="button" class="bz-btn sec sm" data-ics="' + y.id + '">📅 ' + T('போன் அலாரம்', 'Phone alarm') + '</button><button type="button" class="bz-btn sec sm" data-ed="' + y.id + '">✏️</button>' + (y.rep === 'none' || !y.rep ? '<button type="button" class="bz-btn sec sm" data-renew="' + y.id + '">🔄 ' + T('புதுப்பித்தேன்', 'Renewed') + '</button>' : '') + '</div></div>'; }).join('') + '</div>' +
        '<div class="bz-h">' + (x ? T('மாற்று', 'Edit') : T('புதியது சேர்', 'Add new')) + '</div><div class="bz-grid">' + U.selectField(T('எது', 'What'), 'name', DOC_PRESETS.map(p => [p, sh(U, p)]), x ? x.name : DOC_PRESETS[0]) + U.textField(T('விவரம் (வண்டி எண், பாலிசி எண்…)', 'Details (vehicle no., policy no.)'), 'what', x ? x.what : '') +
        U.field(T('முடியும் / கட்ட வேண்டிய தேதி', 'Expiry / due date'), 'date', x ? x.date : '', { type: 'date', mode: 'text' }) + U.selectField(T('திரும்ப வருமா', 'Repeats'), 'rep', [['none', T('இல்லை', 'No')], ['month', T('மாதம்தோறும்', 'Every month')], ['year', T('ஆண்டுதோறும்', 'Every year')]], x ? x.rep : 'none') +
        U.selectField(T('எத்தனை நாள் முன் எச்சரிக்கை', 'Warn how many days before'), 'before', [[7, '7'], [15, '15'], [30, '30'], [60, '60']], x ? x.before : 30) + U.textField(T('குறிப்பு', 'Note'), 'note', x ? x.note : '') + '</div>' +
        '<div class="bz-actions"><button type="button" class="bz-btn" data-act="save">💾 ' + T('சேமி', 'Save') + '</button>' + (x ? '<button type="button" class="bz-btn sec" data-act="del">🗑️</button>' : '') + '</div>' +
        '<div class="bz-info">' + T('தேதிகள் நீங்கள் எழுதியவை மட்டுமே; புதுப்பிக்கும் விதிகள், கட்டணம் அந்தந்தத் துறையின் அதிகாரப்பூர்வ தளத்தில் பாருங்கள்.', 'Dates are only what you type; check renewal rules and fees on the official site of each department.') + '</div>' + backupRow(U, KEY, 'renewals', () => { db = Object.assign({ d: [] }, U.lsGet(KEY, {})); draw(); }).html;
      const v = k => $(root, '[data-k=' + k + ']').value.trim();
      $(root, '[data-act=save]').onclick = () => { if (!v('date')) return; const o = { name: v('name'), what: v('what'), date: v('date'), rep: v('rep'), before: +v('before'), note: v('note') }; if (x) Object.assign(x, o); else db.d.push(Object.assign({ id: U.uid() }, o)); editId = null; save(); draw(); };
      if (x) $(root, '[data-act=del]').onclick = () => { if (!window.confirm(T('நீக்கவா?', 'Delete?'))) return; db.d = db.d.filter(y => y.id !== x.id); editId = null; save(); draw(); };
      $$(root, '[data-ed]').forEach(b => { b.onclick = () => { editId = b.getAttribute('data-ed'); draw(); }; });
      $$(root, '[data-renew]').forEach(b => { b.onclick = () => { editId = b.getAttribute('data-renew'); draw(); const i = $(root, '[data-k=date]'); i.focus(); }; });
      $$(root, '[data-ics]').forEach(b => { b.onclick = () => { const y = list.find(z => z.id === b.getAttribute('data-ics')); if (!y) return; dl(U, icsFor({ id: y.id, d: isoAdd(y.due, -Math.min(U.num(y.before) || 7, 30)), title: T('புதுப்பிக்க: ', 'Renew: ') + sh(U, y.name) + (y.what ? ' ' + y.what : '') + ' (' + U.dmy(y.due) + ')', note: y.note }), 'reminder-' + y.due + '.ics', 'text/calendar;charset=utf-8'); }; });
      backupRow(U, KEY, 'renewals', () => { db = Object.assign({ d: [] }, U.lsGet(KEY, {})); draw(); }).bind(root);
    }
    draw();
  });
})();
