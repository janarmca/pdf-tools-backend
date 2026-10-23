/* category-biz.js — free tools for small businesses and trades in Tamil Nadu (lazy-loaded, UPDATE_69). Everything runs in the browser, nothing is uploaded.
 *   khata       — customer credit book (udhar): who owes how much, entries, WhatsApp reminder, backup / restore
 *   ratecard    — price list / rate card picture for any trade (laundry, flowers, photo studio, tailor, driver …)
 *   stampmaker  — rubber-stamp artwork: round / rectangle / oval, real size in mm, mirror image for the stamp maker
 *   woodcalc    — carpenter: timber cft, round log, plywood sheets needed, area and cost, feet-inch ↔ cm
 *   tripcalc    — driver / taxi trip bill with minimum km, waiting, night batta, toll; bill picture + WhatsApp text
 *   shopslip    — token / delivery slip picture (laundry, tailor, repair shop, photo lab) with running token number
 *   wamsg       — ready-made WhatsApp messages for customers (order ready, payment due, festival wishes …)
 *   profitcalc  — cost → selling price, margin vs markup, GST-inclusive price, break-even units
 * Host globals: TOOL_IMPL, downloadBlob, escapeHtml (optional), __appLang (optional).
 * Pure helpers on window.BizCore for tests (tests/biz-core.test.cjs).
 */
(function () {
  'use strict';

  /* ===================================================================== pure helpers */
  const TA_DIGITS = '௦௧௨௩௪௫௬௭௮௯';
  function num(s) {
    if (typeof s === 'number') return isFinite(s) ? s : NaN;
    let t = String(s == null ? '' : s).replace(/[௦-௯]/g, c => String(TA_DIGITS.indexOf(c))).replace(/[₹,\s]/g, '');
    if (t === '' || t === '.' || t === '-') return NaN;
    if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) return NaN;
    return parseFloat(t);
  }
  const n0 = v => (isFinite(v) ? v : 0);
  const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
  function inr(v, dec) {
    v = n0(v);
    const d = dec == null ? (Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2) : dec;
    return '₹ ' + v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtNum(v, d) { return n0(v).toLocaleString('en-IN', { maximumFractionDigits: d == null ? 2 : d }); }

  // --- credit book
  function balanceOf(entries) { // positive = customer owes you
    let b = 0;
    (entries || []).forEach(e => { b += e.t === 'p' ? -n0(e.a) : n0(e.a); });
    return round2(b);
  }
  function khataTotals(customers) {
    let owed = 0, adv = 0, cnt = 0;
    (customers || []).forEach(c => { const b = balanceOf(c.e); if (b > 0.004) { owed += b; cnt++; } else if (b < -0.004) adv += -b; });
    return { owed: round2(owed), advance: round2(adv), owing: cnt, customers: (customers || []).length };
  }
  function csvCell(s) { s = String(s == null ? '' : s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function khataCsv(customers) {
    const rows = [['Customer', 'Phone', 'Date', 'Type', 'Amount', 'Note', 'Balance after']];
    (customers || []).forEach(c => {
      let run = 0;
      (c.e || []).slice().sort((a, b) => String(a.d).localeCompare(String(b.d))).forEach(e => {
        run += e.t === 'p' ? -n0(e.a) : n0(e.a);
        rows.push([c.n, c.p || '', e.d, e.t === 'p' ? 'Payment received' : 'Credit given', n0(e.a), e.n || '', round2(run)]);
      });
    });
    return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  }

  // --- carpenter
  function timberCft(lengthFt, widthIn, thickIn, qty) { return Math.round(n0(lengthFt) * n0(widthIn) * n0(thickIn) / 144 * (n0(qty) || 1) * 1000) / 1000; }
  function roundLogCft(girthIn, lengthFt) { const q = n0(girthIn) / 4; return Math.round(q * q * n0(lengthFt) / 144 * 1000) / 1000; } // quarter-girth rule
  function sheetsNeeded(areaSqft, sheetSqft, wastePct) {
    if (!(sheetSqft > 0)) return 0;
    return Math.ceil(n0(areaSqft) * (1 + n0(wastePct) / 100) / sheetSqft - 1e-9);
  }
  function ftInToCm(ft, inch) { return round2((n0(ft) * 12 + n0(inch)) * 2.54); }
  function cmToFtIn(cm) { const totalIn = n0(cm) / 2.54, ft = Math.floor(totalIn / 12 + 1e-9); return { ft: ft, inch: round2(totalIn - ft * 12) }; }

  // --- driver
  function tripBill(o) {
    const km = Math.max(0, n0(o.endKm) - n0(o.startKm)), days = Math.max(1, Math.round(n0(o.days) || 1));
    const minKm = n0(o.minKmPerDay) * days, billKm = Math.max(km, minKm);
    const fare = round2(billKm * n0(o.ratePerKm));
    const wait = round2(n0(o.waitHours) * n0(o.waitRate));
    const batta = round2(n0(o.battaPerDay) * days);
    const other = round2(n0(o.toll) + n0(o.parking) + n0(o.permit) + n0(o.other));
    const sub = round2(fare + wait + batta + other);
    const tax = round2(sub * n0(o.gstPct) / 100), total = round2(sub + tax), due = round2(total - n0(o.advance));
    return { km: km, billKm: billKm, minApplied: minKm > km, fare: fare, wait: wait, batta: batta, other: other, sub: sub, tax: tax, total: total, due: due };
  }

  // --- profit
  function priceFromCost(cost, marginPct) { // margin on selling price
    const m = n0(marginPct) / 100; if (m >= 1) return NaN; return round2(n0(cost) / (1 - m));
  }
  function priceFromMarkup(cost, markupPct) { return round2(n0(cost) * (1 + n0(markupPct) / 100)); }
  function profitOf(cost, sell) {
    cost = n0(cost); sell = n0(sell);
    return { profit: round2(sell - cost), margin: sell > 0 ? round2((sell - cost) / sell * 100) : 0, markup: cost > 0 ? round2((sell - cost) / cost * 100) : 0 };
  }
  function withGst(price, gstPct) { return round2(n0(price) * (1 + n0(gstPct) / 100)); }
  function withoutGst(incl, gstPct) { return round2(n0(incl) / (1 + n0(gstPct) / 100)); }
  function breakEven(fixed, price, varCost) { const u = n0(price) - n0(varCost); return u > 0 ? Math.ceil(n0(fixed) / u - 1e-9) : Infinity; }

  // --- WhatsApp
  function waNumber(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 11 && d[0] === '0') d = d.slice(1);
    if (d.length === 10) return '91' + d;
    if (d.length === 12 && d.indexOf('91') === 0) return d;
    return d.length >= 11 && d.length <= 15 ? d : '';
  }
  function waLink(phone, text) { const n = waNumber(phone); return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text || ''); }
  function fillTemplate(tpl, vars) { return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && String(vars[k]).trim() !== '' ? String(vars[k]).trim() : '____')); }

  // --- text / geometry
  function graphemes(s) {
    s = String(s || '');
    try { if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter('ta', { granularity: 'grapheme' }).segment(s), x => x.segment); } catch (e) { /* ignore */ }
    return Array.from(s);
  }
  const mmToPx = (mm, dpi) => Math.max(1, Math.round(n0(mm) / 25.4 * (dpi || 300)));
  function nextToken(n) { n = Math.max(0, Math.floor(n0(n))); return n + 1; }
  function todayIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dmy(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : (iso || ''); }

  // --- ready-made messages (Tamil first, English second); {name} {shop} {item} {amount} {date}
  const MESSAGES = [
    { id: 'ready', ta: 'ஆர்டர் தயார்', en: 'Order ready', t: 'வணக்கம் {name}, உங்கள் {item} தயாராக உள்ளது. வசதிப்படி வந்து பெற்றுக்கொள்ளலாம். — {shop}', e: 'Hello {name}, your {item} is ready. You can collect it at your convenience. — {shop}' },
    { id: 'due', ta: 'பணம் நிலுவை நினைவூட்டல்', en: 'Payment reminder', t: 'வணக்கம் {name}, உங்கள் கணக்கில் ₹{amount} நிலுவை உள்ளது. வசதிப்படி செலுத்தவும். நன்றி. — {shop}', e: 'Hello {name}, a balance of ₹{amount} is pending on your account. Please pay at your convenience. Thank you. — {shop}' },
    { id: 'booking', ta: 'முன்பதிவு உறுதி', en: 'Booking confirmed', t: 'வணக்கம் {name}, {date} அன்று உங்கள் {item} முன்பதிவு உறுதி செய்யப்பட்டது. — {shop}', e: 'Hello {name}, your booking for {item} on {date} is confirmed. — {shop}' },
    { id: 'advance', ta: 'முன்பணம் பெற்றோம்', en: 'Advance received', t: 'வணக்கம் {name}, ₹{amount} முன்பணம் பெற்றோம். மிக்க நன்றி. — {shop}', e: 'Hello {name}, we received an advance of ₹{amount}. Thank you. — {shop}' },
    { id: 'delivery', ta: 'இன்று டெலிவரி', en: 'Delivery today', t: 'வணக்கம் {name}, உங்கள் {item} இன்று {date} டெலிவரி செய்யப்படும். — {shop}', e: 'Hello {name}, your {item} will be delivered today, {date}. — {shop}' },
    { id: 'thanks', ta: 'நன்றி + மதிப்புரை', en: 'Thank you + review', t: 'வணக்கம் {name}, எங்கள் கடையைத் தேர்ந்தெடுத்ததற்கு நன்றி. உங்கள் கருத்தைப் பகிர்ந்தால் மகிழ்வோம். — {shop}', e: 'Hello {name}, thank you for choosing us. We would love to hear your feedback. — {shop}' },
    { id: 'pongal', ta: 'பொங்கல் வாழ்த்து', en: 'Pongal wishes', t: 'அன்பான {name} அவர்களுக்கு பொங்கல் நல்வாழ்த்துகள்! — {shop}', e: 'Warm Pongal wishes to {name}! — {shop}' },
    { id: 'deepavali', ta: 'தீபாவளி வாழ்த்து', en: 'Deepavali wishes', t: 'அன்பான {name} அவர்களுக்கு தீபாவளி நல்வாழ்த்துகள்! — {shop}', e: 'Happy Deepavali to {name}! — {shop}' },
    { id: 'newyear', ta: 'புத்தாண்டு வாழ்த்து', en: 'New Year wishes', t: 'அன்பான {name} அவர்களுக்கு இனிய புத்தாண்டு நல்வாழ்த்துகள்! — {shop}', e: 'Happy New Year, {name}! — {shop}' },
    { id: 'closed', ta: 'கடை விடுமுறை அறிவிப்பு', en: 'Shop closed notice', t: 'வணக்கம் {name}, {date} அன்று எங்கள் கடை விடுமுறை. மறுநாள் வழக்கம்போல் இயங்கும். — {shop}', e: 'Hello {name}, our shop will be closed on {date} and will open as usual the next day. — {shop}' }
  ];

  // --- rate-card presets (names only; the owner types the prices)
  const PRESETS = [
    { id: 'laundry', ta: 'சலவை / இஸ்திரி', en: 'Laundry & ironing', items: ['சட்டை / Shirt', 'பேன்ட் / Pant', 'புடவை / Saree', 'வேட்டி / Dhoti', 'போர்வை / Bedsheet', 'இஸ்திரி மட்டும் / Ironing only', 'ட்ரை கிளீனிங் / Dry clean'] },
    { id: 'flower', ta: 'பூக்கடை', en: 'Flower shop', items: ['மல்லிகை / Jasmine (முழம்)', 'முல்லை / Mullai (முழம்)', 'கனகாம்பரம் / Kanakambaram', 'ரோஜா மாலை / Rose garland', 'மணமாலை / Wedding garland', 'பூங்கொத்து / Bouquet', 'கோயில் அலங்காரம் / Temple decoration'] },
    { id: 'photo', ta: 'போட்டோ / வீடியோ', en: 'Photo & video studio', items: ['பாஸ்போர்ட் போட்டோ / Passport photo', 'ஸ்டுடியோ போட்டோ / Studio shoot', 'திருமணம் / Wedding (per day)', 'காதணி விழா / Function', 'ஆல்பம் / Album (per page)', 'வீடியோ எடிட்டிங் / Video editing', 'ஃப்ரேம் / Framing'] },
    { id: 'tailor', ta: 'தையல்', en: 'Tailor', items: ['சட்டை / Shirt', 'பேன்ட் / Pant', 'ரவிக்கை / Blouse', 'சுடிதார் / Churidar', 'பாவாடை / Skirt', 'ஆல்டரேஷன் / Alteration', 'ஸ்கூல் யூனிஃபார்ம் / School uniform'] },
    { id: 'tea', ta: 'தேநீர் / உணவகம்', en: 'Tea shop & mess', items: ['தேநீர் / Tea', 'காபி / Coffee', 'இட்லி / Idli', 'தோசை / Dosa', 'பொங்கல் / Pongal', 'சாப்பாடு / Meals', 'பரோட்டா / Parotta'] },
    { id: 'xerox', ta: 'ஜெராக்ஸ் / பிரிண்ட்', en: 'Xerox & printing', items: ['ஜெராக்ஸ் / Xerox (page)', 'கருப்பு பிரிண்ட் / B&W print', 'கலர் பிரிண்ட் / Colour print', 'லேமினேஷன் / Lamination', 'ஸ்பைரல் பைண்டிங் / Spiral binding', 'ஸ்கேன் / Scan', 'பாஸ்போர்ட் போட்டோ / Passport photo'] },
    { id: 'driver', ta: 'வாடகை வாகனம்', en: 'Driver tariff', items: ['ஒரு கி.மீ / Per km', 'குறைந்தபட்சம் / Minimum per day', 'காத்திருப்பு / Waiting (per hour)', 'இரவு பேட்டா / Night batta', 'ஏர்போர்ட் / Airport drop', 'திருமணம் / Wedding day', 'சுற்றுலா / Tour (per day)'] },
    { id: 'carpenter', ta: 'தச்சு கூலி', en: 'Carpenter labour', items: ['கதவு / Door', 'ஜன்னல் / Window', 'கட்டில் / Cot', 'அலமாரி / Wardrobe', 'சமையலறை அலமாரி / Kitchen cabinet', 'மர வேலை சதுர அடி / Per sq.ft', 'பழுது / Repair visit'] },
    { id: 'mobile', ta: 'மொபைல் பழுது', en: 'Mobile repair', items: ['திரை மாற்றம் / Screen change', 'பேட்டரி / Battery', 'சார்ஜிங் போர்ட் / Charging port', 'சாஃப்ட்வேர் / Software', 'டெம்பர்டு கிளாஸ் / Tempered glass', 'கவர் / Cover', 'தண்ணீர் சேதம் / Water damage check'] },
    { id: 'salon', ta: 'அழகு நிலையம்', en: 'Salon & parlour', items: ['முடி வெட்டு / Haircut', 'ஷேவ் / Shave', 'ஃபேஷியல் / Facial', 'த்ரெட்டிங் / Threading', 'மெஹந்தி / Mehndi', 'மணமகள் ஒப்பனை / Bridal makeup', 'ஹேர் கலர் / Hair colour'] },
    { id: 'blank', ta: 'காலி (நானே எழுதுவேன்)', en: 'Blank', items: ['', '', '', '', ''] }
  ];

  window.BizCore = {
    num: num, inr: inr, balanceOf: balanceOf, khataTotals: khataTotals, khataCsv: khataCsv,
    timberCft: timberCft, roundLogCft: roundLogCft, sheetsNeeded: sheetsNeeded, ftInToCm: ftInToCm, cmToFtIn: cmToFtIn,
    tripBill: tripBill, priceFromCost: priceFromCost, priceFromMarkup: priceFromMarkup, profitOf: profitOf, withGst: withGst, withoutGst: withoutGst, breakEven: breakEven,
    waNumber: waNumber, waLink: waLink, fillTemplate: fillTemplate, graphemes: graphemes, mmToPx: mmToPx, nextToken: nextToken, MESSAGES: MESSAGES, PRESETS: PRESETS
  };
  if (typeof TOOL_IMPL === 'undefined') return;

  /* ===================================================================== UI helpers */
  function isEn() { try { return typeof __appLang !== 'undefined' && __appLang === 'en'; } catch (e) { return false; } }
  function T(ta, en) { return isEn() && en ? en + ' · ' + ta : ta; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => Array.from(r.querySelectorAll(s));
  function lsGet(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  const CSS = `
  .bz-root{color:var(--ink);font-size:15px;line-height:1.5;max-width:100%;overflow-wrap:anywhere}
  .bz-root *{box-sizing:border-box;min-width:0}
  .bz-purpose{background:var(--chip);border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:600;line-height:1.55}
  .bz-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
  .bz-grid.one{grid-template-columns:1fr}
  .bz-grid.three{grid-template-columns:1fr 1fr 1fr}
  .bz-f{margin-top:12px}.bz-grid .bz-f{margin-top:0}
  .bz-f label{display:block;font-size:12.5px;font-weight:700;color:var(--sub);margin-bottom:4px}
  .bz-f input[type=text],.bz-f input[type=date],.bz-f select,.bz-f textarea{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:8px 12px;font-size:16px;font-family:inherit;background:#fff;color:var(--ink);outline:none}
  .bz-f textarea{min-height:88px;resize:vertical}
  .bz-f input:focus,.bz-f select:focus,.bz-f textarea:focus{border-color:var(--brand)}
  .bz-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
  .bz-tab,.bz-chip{min-height:44px;padding:8px 12px;border-radius:12px;border:2px solid var(--line);background:#fff;color:var(--ink);font:800 13.5px/1.25 inherit;font-family:inherit;cursor:pointer}
  .bz-tab{flex:1 1 auto}
  .bz-tab.on,.bz-chip.on{border-color:var(--brand);background:#EAF0FF;color:var(--brand-dark)}
  .bz-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .bz-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:8px 16px;border-radius:12px;border:0;background:var(--brand);color:#fff;font:800 14.5px/1.2 inherit;font-family:inherit;cursor:pointer;text-decoration:none}
  .bz-btn.sec{background:#fff;color:var(--brand-dark);border:2px solid var(--line)}
  .bz-btn.red{background:#C0392B}.bz-btn.green{background:#1E8E5A}
  .bz-btn.sm{min-height:40px;padding:6px 12px;font-size:13px}
  .bz-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .bz-res{background:linear-gradient(135deg,#28407F,#3752A6);color:#fff;border-radius:18px;padding:16px;margin-top:14px}
  .bz-res.ok{background:linear-gradient(135deg,#176B45,#1E8E5A)}.bz-res.warn{background:linear-gradient(135deg,#9B2C20,#C0392B)}
  .bz-res .lbl{font-size:13px;font-weight:700;opacity:.92}.bz-res .big{font-size:30px;font-weight:900;line-height:1.2;margin-top:2px}.bz-res .sub{font-size:13.5px;font-weight:600;margin-top:6px;opacity:.95}
  .bz-info{background:#FFF8E6;border:1px solid #F3DFA2;color:#6B4E00;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:600;margin-top:12px;line-height:1.55}
  .bz-msg{background:#FDEDEC;border:1px solid #F5C6C2;color:#9B2C20;border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:700;margin-top:12px}
  .bz-tbl{width:100%;border-collapse:collapse;margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:14px}
  .bz-tbl td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}.bz-tbl td:last-child{text-align:right;font-weight:800}.bz-tbl tr.strong td{background:var(--chip);font-weight:900}
  .bz-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
  .bz-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:56px;padding:10px 14px;border:1.5px solid var(--line);border-radius:14px;background:#fff;text-align:left;width:100%;font-family:inherit;font-size:15px;color:var(--ink);cursor:pointer}
  .bz-row b{display:block;font-size:15.5px}.bz-row small{color:var(--sub);font-weight:600}
  .bz-amt{font-weight:900;white-space:nowrap}.bz-amt.owe{color:#C0392B}.bz-amt.adv{color:#1E8E5A}.bz-amt.zero{color:var(--sub)}
  .bz-h{font-size:15px;font-weight:900;margin:18px 0 0}
  .bz-canvas{display:block;max-width:100%;height:auto;margin:12px auto 0;border:1px solid var(--line);border-radius:10px;background:#fff}
  .bz-canvas.chk{background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px}
  .bz-items{display:flex;flex-direction:column;gap:8px;margin-top:8px}
  .bz-item{display:grid;grid-template-columns:1fr 110px 44px;gap:8px;align-items:center}
  .bz-item.q{grid-template-columns:1fr 56px 84px 44px}
  .bz-item input{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:6px 10px;font-size:16px;font-family:inherit;background:#fff;color:var(--ink)}
  .bz-x{min-height:44px;min-width:44px;border:0;border-radius:12px;background:#FDEDEC;color:#9B2C20;font-size:18px;font-weight:900;cursor:pointer}
  .bz-sw{width:44px;height:44px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--line);cursor:pointer}.bz-sw.on{box-shadow:0 0 0 3px var(--brand)}
  .bz-chk{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;font-weight:700;cursor:pointer}.bz-chk input{width:22px;height:22px;flex:0 0 22px}
  .bz-ent{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line);font-size:14px}
  .bz-ent:last-child{border-bottom:0}
  @media (max-width:420px){.bz-grid.three{grid-template-columns:1fr 1fr}.bz-item{grid-template-columns:1fr 92px 44px}}`;
  function makeRoot(body) {
    if (!document.getElementById('bz-style')) { const s = document.createElement('style'); s.id = 'bz-style'; s.textContent = CSS; document.head.appendChild(s); }
    const root = document.createElement('div'); root.className = 'bz-root tamil'; body.appendChild(root); return root;
  }
  const purpose = (ta, en) => '<div class="bz-purpose">' + T(ta, en) + '</div>';
  function field(label, key, val, o) {
    o = o || {};
    return '<div class="bz-f"><label>' + label + '</label><input type="' + (o.type || 'text') + '" inputmode="' + (o.mode || 'decimal') + '" data-k="' + key + '" value="' + esc(val == null ? '' : val) + '" autocomplete="off"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '></div>';
  }
  function textField(label, key, val, ph) { return field(label, key, val, { mode: 'text', ph: ph }); }
  function selectField(label, key, opts, cur) {
    return '<div class="bz-f"><label>' + label + '</label><select data-k="' + key + '">' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
  }
  function tabs(items, cur) { return '<div class="bz-tabs">' + items.map(i => '<button type="button" class="bz-tab' + (i[0] === cur ? ' on' : '') + '" data-tab="' + i[0] + '">' + i[1] + '</button>').join('') + '</div>'; }
  function table(rows) { return '<table class="bz-tbl"><tbody>' + rows.map(r => '<tr' + (r[2] ? ' class="strong"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table>'; }
  function resCard(label, big, sub, cls) { return '<div class="bz-res ' + (cls || '') + '"><div class="lbl">' + label + '</div><div class="big">' + big + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>'; }
  function bindInputs(root, fn) {
    $$(root, 'input[data-k],select[data-k],textarea[data-k]').forEach(i => { i.addEventListener('input', () => fn(i.getAttribute('data-k'), i.type === 'checkbox' ? i.checked : i.value)); i.addEventListener('change', () => fn(i.getAttribute('data-k'), i.type === 'checkbox' ? i.checked : i.value)); });
  }
  function copyText(text, btn) {
    const done = () => { if (!btn) return; const old = btn.getAttribute('data-l') || btn.textContent; btn.setAttribute('data-l', old); btn.textContent = '✓ ' + T('நகலெடுக்கப்பட்டது', 'Copied'); setTimeout(() => { btn.textContent = old; }, 1400); };
    const fb = () => { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) { /* ignore */ } done(); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb(); } catch (e) { fb(); }
  }
  function canvasBlob(cv, type) { return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Could not make the picture'))), type || 'image/png')); }
  async function saveCanvas(cv, name) {
    const b = await canvasBlob(cv, 'image/png');
    if (typeof downloadBlob === 'function') return downloadBlob(b, name);
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  async function shareCanvas(cv, name, text) {
    try {
      const b = await canvasBlob(cv, 'image/png'), f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: text || '' }); return true; }
    } catch (e) { /* cancelled or not supported */ }
    return false;
  }
  const FONT = "'Noto Sans Tamil','Latha','Nirmala UI','Segoe UI',system-ui,sans-serif";
  function fitFont(ctx, text, maxW, size, weight, minSize) { // largest font ≤ size whose text fits maxW
    let s = size; ctx.font = weight + ' ' + s + 'px ' + FONT;
    const w = ctx.measureText(text).width;
    if (w > maxW && w > 0) s = Math.max(minSize || 8, Math.floor(s * maxW / w));
    ctx.font = weight + ' ' + s + 'px ' + FONT; return s;
  }
  function wrapText(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur); return lines;
  }
  const waBtn = (phone, text, label) => '<a class="bz-btn green" target="_blank" rel="noopener" href="' + esc(waLink(phone, text)) + '">💬 ' + (label || T('WhatsApp-ல் அனுப்பு', 'Send on WhatsApp')) + '</a>';

  /* ===================================================================== 1. khata — customer credit book */
  TOOL_IMPL.khata = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_khata_v1';
      let db = lsGet(KEY, null); if (!db || !Array.isArray(db.c)) db = { shop: '', c: [] };
      let cur = null, q = '', flash = '';
      const save = () => { if (!lsSet(KEY, db)) flash = T('சேமிக்க முடியவில்லை — browser இடம் நிரம்பியிருக்கலாம். Backup எடுங்கள்.', 'Could not save — browser storage may be full. Take a backup.'); };
      const byId = id => db.c.find(c => c.id === id);
      const bal = c => balanceOf(c.e);
      const balHtml = b => b > 0.004 ? '<span class="bz-amt owe">' + inr(b) + '</span>' : b < -0.004 ? '<span class="bz-amt adv">' + inr(-b) + ' ' + T('முன்பணம்', 'advance') + '</span>' : '<span class="bz-amt zero">₹ 0</span>';

      function drawList() {
        const t = khataTotals(db.c);
        root.innerHTML = purpose('வாடிக்கையாளர் உதார் (கடன்) கணக்கு — யார் எவ்வளவு தர வேண்டும் என்று எழுதி வைக்க. தகவல் இந்த phone / browser-லேயே இருக்கும், எங்கும் அனுப்பப்படாது. அடிக்கடி Backup எடுங்கள்.',
          'Customer credit book — who owes you how much. Data stays in this browser only, nothing is uploaded. Take a backup often.') +
          resCard(T('மொத்த நிலுவை', 'Total to collect'), inr(t.owed), t.owing + ' ' + T('பேரிடம் வர வேண்டும்', 'customers owe you'), t.owed > 0 ? 'warn' : 'ok') +
          (flash ? '<div class="bz-msg">' + esc(flash) + '</div>' : '') +
          '<div class="bz-h">' + T('புதிய வாடிக்கையாளர்', 'New customer') + '</div><div class="bz-grid">' + textField(T('பெயர்', 'Name'), 'nn', '') + field(T('போன் (WhatsApp)', 'Phone'), 'np', '', { mode: 'tel' }) + '</div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="add">➕ ' + T('சேர்', 'Add') + '</button></div>' +
          '<div class="bz-h">' + T('வாடிக்கையாளர்கள்', 'Customers') + ' (' + t.customers + ')</div>' +
          '<div class="bz-f"><input type="text" data-k="q" value="' + esc(q) + '" placeholder="' + esc(T('பெயர் தேடு', 'Search name')) + '"></div><div class="bz-list" data-k="list"></div>' +
          '<div class="bz-h">' + T('என் கடை பெயர் (WhatsApp செய்தியில் வரும்)', 'My shop name (used in WhatsApp message)') + '</div>' + textField('', 'shop', db.shop) +
          '<div class="bz-h">' + T('Backup / மீட்பு', 'Backup / restore') + '</div><div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="bk">💾 Backup (.json)</button><button type="button" class="bz-btn sec sm" data-act="csv">📊 Excel (.csv)</button><label class="bz-btn sec sm" style="cursor:pointer">📂 ' + T('மீட்டெடு', 'Restore') + '<input type="file" accept=".json,application/json" data-act="rs" hidden></label></div>';
        fillList();
        $(root, '[data-k=nn]').addEventListener('input', () => { flash = ''; });
        $(root, '[data-k=q]').addEventListener('input', e => { q = e.target.value; fillList(); });
        $(root, '[data-k=shop]').addEventListener('input', e => { db.shop = e.target.value; save(); });
        $(root, '[data-act=add]').onclick = () => {
          const n = $(root, '[data-k=nn]').value.trim(), p = $(root, '[data-k=np]').value.trim();
          if (!n) { flash = T('பெயர் எழுதுங்கள்', 'Enter a name'); drawList(); return; }
          const c = { id: uid(), n: n, p: p, e: [] }; db.c.push(c); flash = ''; save(); cur = c.id; draw();
        };
        $(root, '[data-act=bk]').onclick = () => { const b = new Blob([JSON.stringify(db)], { type: 'application/json' }); (typeof downloadBlob === 'function' ? downloadBlob(b, 'khata-backup-' + todayIso() + '.json') : null); };
        $(root, '[data-act=csv]').onclick = () => { const b = new Blob(['﻿' + khataCsv(db.c)], { type: 'text/csv;charset=utf-8' }); (typeof downloadBlob === 'function' ? downloadBlob(b, 'khata-' + todayIso() + '.csv') : null); };
        $(root, '[data-act=rs]').onchange = e => {
          const f = e.target.files && e.target.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const v = JSON.parse(String(r.result));
              if (!v || !Array.isArray(v.c)) throw new Error('bad');
              if (!window.confirm(T('இப்போது உள்ள கணக்குகள் இந்த Backup-ஆல் மாற்றப்படும். தொடரவா?', 'Current entries will be replaced by this backup. Continue?'))) return;
              db = { shop: String(v.shop || ''), c: v.c.map(c => ({ id: String(c.id || uid()), n: String(c.n || ''), p: String(c.p || ''), e: (c.e || []).map(x => ({ i: String(x.i || uid()), d: String(x.d || ''), t: x.t === 'p' ? 'p' : 'c', a: n0(num(x.a)), n: String(x.n || '') })) })) };
              save(); flash = T('மீட்டெடுக்கப்பட்டது', 'Restored'); drawList();
            } catch (err) { flash = T('இது சரியான Backup file இல்லை', 'This is not a valid backup file'); drawList(); }
          };
          r.readAsText(f);
        };
      }
      function fillList() {
        const box = $(root, '[data-k=list]'); if (!box) return;
        const s = q.trim().toLowerCase();
        const rows = db.c.filter(c => !s || c.n.toLowerCase().indexOf(s) >= 0 || (c.p || '').indexOf(s) >= 0).sort((a, b) => bal(b) - bal(a));
        box.innerHTML = rows.length ? rows.map(c => '<button type="button" class="bz-row" data-id="' + c.id + '"><span><b>' + esc(c.n) + '</b><small>' + esc(c.p || '') + '</small></span>' + balHtml(bal(c)) + '</button>').join('') :
          '<div class="bz-info">' + T('இன்னும் யாரும் இல்லை. மேலே முதல் வாடிக்கையாளரைச் சேர்க்கவும்.', 'No customers yet. Add your first customer above.') + '</div>';
        $$(box, '[data-id]').forEach(b => { b.onclick = () => { cur = b.getAttribute('data-id'); flash = ''; draw(); }; });
      }
      function drawCustomer() {
        const c = byId(cur); if (!c) { cur = null; return drawList(); }
        const b = bal(c), shop = db.shop || '';
        const msg = fillTemplate(MESSAGES[1].t, { name: c.n, amount: fmtNum(Math.max(b, 0), 2), shop: shop || ' ' }).replace(/\s—\s____$/, '').replace(/____/g, '');
        root.innerHTML = '<div class="bz-actions" style="margin-top:0"><button type="button" class="bz-btn sec sm" data-act="back">← ' + T('பட்டியல்', 'List') + '</button></div>' +
          '<div class="bz-h" style="margin-top:12px">' + esc(c.n) + (c.p ? ' · ' + esc(c.p) : '') + '</div>' +
          resCard(b > 0.004 ? T('இவர் தர வேண்டியது', 'Owes you') : b < -0.004 ? T('இவருக்கு நீங்கள் தர வேண்டியது', 'You owe (advance)') : T('கணக்கு சரி', 'All clear'), inr(Math.abs(b)), '', b > 0.004 ? 'warn' : 'ok') +
          (flash ? '<div class="bz-msg">' + esc(flash) + '</div>' : '') +
          '<div class="bz-grid">' + field(T('தொகை (₹)', 'Amount (₹)'), 'amt', '') + textField(T('குறிப்பு (விரும்பினால்)', 'Note (optional)'), 'note', '') + '</div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn red" data-act="cr">➕ ' + T('கடன் கொடுத்தேன்', 'Credit given') + '</button><button type="button" class="bz-btn green" data-act="pay">💵 ' + T('பணம் வாங்கினேன்', 'Payment received') + '</button></div>' +
          (b > 0.004 ? '<div class="bz-actions">' + waBtn(c.p, msg, T('நினைவூட்டல் அனுப்பு', 'Send reminder')) + '</div>' : '') +
          '<div class="bz-h">' + T('பதிவுகள்', 'Entries') + '</div><div class="bz-tbl" style="padding:0" data-k="ents"></div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="del">🗑️ ' + T('இந்த வாடிக்கையாளரை நீக்கு', 'Delete this customer') + '</button></div>';
        const ents = $(root, '[data-k=ents]');
        const sorted = c.e.slice().sort((x, y) => String(y.d).localeCompare(String(x.d)) || String(y.i).localeCompare(String(x.i)));
        ents.innerHTML = sorted.length ? sorted.map(e => '<div class="bz-ent"><span><b>' + (e.t === 'p' ? '💵 ' + T('பணம் பெற்றது', 'Paid') : '➕ ' + T('கடன்', 'Credit')) + '</b><br><small>' + esc(dmy(e.d)) + (e.n ? ' · ' + esc(e.n) : '') + '</small></span><span><span class="bz-amt ' + (e.t === 'p' ? 'adv' : 'owe') + '">' + inr(e.a) + '</span> <button type="button" class="bz-x" data-del="' + e.i + '" aria-label="delete">✕</button></span></div>').join('') :
          '<div class="bz-ent"><span>' + T('இன்னும் பதிவு இல்லை', 'No entries yet') + '</span></div>';
        $(root, '[data-act=back]').onclick = () => { cur = null; flash = ''; draw(); };
        const add = t => {
          const a = num($(root, '[data-k=amt]').value);
          if (!(a > 0)) { flash = T('சரியான தொகை எழுதுங்கள்', 'Enter a valid amount'); drawCustomer(); return; }
          c.e.push({ i: uid(), d: todayIso(), t: t, a: round2(a), n: $(root, '[data-k=note]').value.trim() }); flash = ''; save(); drawCustomer();
        };
        $(root, '[data-act=cr]').onclick = () => add('c'); $(root, '[data-act=pay]').onclick = () => add('p');
        $$(ents, '[data-del]').forEach(x => { x.onclick = () => { if (!window.confirm(T('இந்தப் பதிவை நீக்கவா?', 'Delete this entry?'))) return; c.e = c.e.filter(e => e.i !== x.getAttribute('data-del')); save(); drawCustomer(); }; });
        $(root, '[data-act=del]').onclick = () => { if (!window.confirm(T('இவரது எல்லாப் பதிவுகளும் நீக்கப்படும். தொடரவா?', 'All entries of this customer will be deleted. Continue?'))) return; db.c = db.c.filter(x => x.id !== c.id); cur = null; save(); draw(); };
      }
      function draw() { cur ? drawCustomer() : drawList(); }
      draw();
    }
  };

  /* ===================================================================== 2. ratecard — price list picture */
  TOOL_IMPL.ratecard = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_ratecard_v1';
      const COLORS = ['#1F4E79', '#176B45', '#9B2C20', '#5B2A86', '#B45309', '#111827'];
      const S = Object.assign({ preset: 'laundry', shop: '', tag: '', phone: '', addr: '', color: COLORS[0], mark: true, items: PRESETS[0].items.map(n => ({ n: n, p: '' })) }, lsGet(KEY, {}));
      if (!Array.isArray(S.items) || !S.items.length) S.items = [{ n: '', p: '' }];
      let cv = null;
      function layout() {
        root.innerHTML = purpose('உங்கள் கடை / தொழிலுக்கான விலைப்பட்டியல் படம் — WhatsApp, Facebook, கடை வாசலில் ஒட்ட. தொழிலைத் தேர்ந்தெடுத்து, விலைகளை நிரப்புங்கள்.',
          'A price-list picture for your shop or trade — share on WhatsApp or print. Pick your trade, then fill in the prices.') +
          selectField(T('தொழில் மாதிரி', 'Trade'), 'preset', PRESETS.map(p => [p.id, p.ta + ' · ' + p.en]), S.preset) +
          '<div class="bz-grid">' + textField(T('கடை / நிறுவனப் பெயர்', 'Shop name'), 'shop', S.shop, 'எ.கா. முருகன் லாண்டரி') + textField(T('சிறு வாசகம்', 'Tagline'), 'tag', S.tag) + field(T('போன்', 'Phone'), 'phone', S.phone, { mode: 'tel' }) + textField(T('முகவரி', 'Address'), 'addr', S.addr) + '</div>' +
          '<div class="bz-h">' + T('நிறம்', 'Colour') + '</div><div class="bz-chips">' + COLORS.map(c => '<button type="button" class="bz-sw' + (c === S.color ? ' on' : '') + '" data-col="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
          '<div class="bz-h">' + T('பொருள் & விலை', 'Items & prices') + '</div><div class="bz-items" data-k="items"></div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="addrow">➕ ' + T('வரி சேர்', 'Add row') + '</button></div>' +
          '<label class="bz-chk"><input type="checkbox" data-k="mark"' + (S.mark ? ' checked' : '') + '> ' + T('கீழே சிறிய "pdftoolsindia.com" குறி', 'Small "pdftoolsindia.com" mark at the bottom') + '</label>' +
          '<canvas class="bz-canvas" data-k="cv"></canvas>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="dl">⬇️ ' + T('படமாக சேமி (PNG)', 'Save picture (PNG)') + '</button><button type="button" class="bz-btn green" data-act="sh">📤 ' + T('பகிர்', 'Share') + '</button></div>' +
          '<div class="bz-info">' + T('விலை எழுதாத வரிகள் படத்தில் வராது. விலை "₹50 / சட்டை" போல் எழுதலாம்.', 'Rows without a price are left out. You can write prices like "₹50 / shirt".') + '</div>';
        drawItems(); cv = $(root, '[data-k=cv]');
        $(root, '[data-k=preset]').addEventListener('change', e => { S.preset = e.target.value; const p = PRESETS.find(x => x.id === S.preset); if (p) S.items = p.items.map(n => ({ n: n, p: '' })); persist(); layout(); });
        bindInputs(root, (k, v) => { if (k === 'preset' || k === 'items') return; if (k in S) { S[k] = v; persist(); paint(); } });
        $$(root, '[data-col]').forEach(b => { b.onclick = () => { S.color = b.getAttribute('data-col'); persist(); $$(root, '[data-col]').forEach(x => x.classList.toggle('on', x === b)); paint(); }; });
        $(root, '[data-act=addrow]').onclick = () => { S.items.push({ n: '', p: '' }); persist(); drawItems(); };
        $(root, '[data-act=dl]').onclick = () => saveCanvas(cv, 'price-list.png');
        $(root, '[data-act=sh]').onclick = async () => { if (!(await shareCanvas(cv, 'price-list.png', S.shop))) saveCanvas(cv, 'price-list.png'); };
        paint();
      }
      function persist() { lsSet(KEY, S); }
      function drawItems() {
        const box = $(root, '[data-k=items]');
        box.innerHTML = S.items.map((it, i) => '<div class="bz-item"><input type="text" data-i="' + i + '" data-f="n" value="' + esc(it.n) + '" placeholder="' + esc(T('பொருள் / சேவை', 'Item / service')) + '"><input type="text" inputmode="decimal" data-i="' + i + '" data-f="p" value="' + esc(it.p) + '" placeholder="₹"><button type="button" class="bz-x" data-rm="' + i + '" aria-label="remove">✕</button></div>').join('');
        $$(box, 'input').forEach(inp => { inp.addEventListener('input', () => { S.items[+inp.getAttribute('data-i')][inp.getAttribute('data-f')] = inp.value; persist(); paint(); }); });
        $$(box, '[data-rm]').forEach(b => { b.onclick = () => { S.items.splice(+b.getAttribute('data-rm'), 1); if (!S.items.length) S.items.push({ n: '', p: '' }); persist(); drawItems(); paint(); }; });
      }
      function paint() {
        const rows = S.items.filter(i => i.n.trim() && String(i.p).trim()), W = 1080, pad = 60, rowH = 92;
        const headH = 250 + (S.tag ? 40 : 0), footH = 150 + (S.mark ? 40 : 0);
        const H = headH + Math.max(rows.length, 1) * rowH + footH + 40;
        cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = S.color; ctx.fillRect(0, 0, W, headH);
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        fitFont(ctx, S.shop.trim() || T('உங்கள் கடை பெயர்', 'Your shop name'), W - 2 * pad, 84, '800', 36); ctx.fillText(S.shop.trim() || T('உங்கள் கடை பெயர்', 'Your shop name'), W / 2, 100);
        if (S.tag) { fitFont(ctx, S.tag, W - 2 * pad, 38, '500', 22); ctx.globalAlpha = 0.9; ctx.fillText(S.tag, W / 2, 168); ctx.globalAlpha = 1; }
        fitFont(ctx, T('விலைப்பட்டியல்', 'Price list'), W - 2 * pad, 44, '700', 22); ctx.fillStyle = '#FFFFFF'; ctx.fillText(T('விலைப்பட்டியல்', 'Price list'), W / 2, headH - 48);
        let y = headH + 10;
        if (!rows.length) { ctx.fillStyle = '#6B7280'; ctx.font = '500 34px ' + FONT; ctx.fillText(T('விலைகளை நிரப்புங்கள்', 'Fill in the prices'), W / 2, y + rowH / 2); y += rowH; }
        rows.forEach((r, i) => {
          if (i % 2 === 0) { ctx.fillStyle = '#F3F4F6'; ctx.fillRect(0, y, W, rowH); }
          ctx.textBaseline = 'middle'; ctx.fillStyle = '#111827'; ctx.textAlign = 'left';
          const priceTxt = /^[\d.,\s]+$/.test(r.p.trim()) ? '₹ ' + r.p.trim() : r.p.trim();
          ctx.font = '800 40px ' + FONT; const pw = Math.min(ctx.measureText(priceTxt).width, 360);
          fitFont(ctx, r.n.trim(), W - 2 * pad - pw - 40, 42, '600', 22); ctx.fillText(r.n.trim(), pad, y + rowH / 2);
          ctx.fillStyle = S.color; ctx.textAlign = 'right'; fitFont(ctx, priceTxt, 360, 42, '800', 22); ctx.fillText(priceTxt, W - pad, y + rowH / 2);
          y += rowH;
        });
        y += 20; ctx.textAlign = 'center'; ctx.fillStyle = S.color; ctx.fillRect(pad, y, W - 2 * pad, 4); y += 40;
        ctx.fillStyle = '#111827';
        if (S.phone.trim()) { fitFont(ctx, '📞 ' + S.phone.trim(), W - 2 * pad, 44, '800', 24); ctx.fillText('📞 ' + S.phone.trim(), W / 2, y); y += 56; }
        if (S.addr.trim()) { fitFont(ctx, S.addr.trim(), W - 2 * pad, 32, '500', 20); ctx.fillText(S.addr.trim(), W / 2, y); y += 44; }
        if (S.mark) { ctx.fillStyle = '#9CA3AF'; ctx.font = '500 24px ' + FONT; ctx.fillText('pdftoolsindia.com', W / 2, H - 28); }
      }
      layout();
    }
  };

  /* ===================================================================== 3. stampmaker — rubber stamp artwork */
  TOOL_IMPL.stampmaker = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_stamp_v1';
      const INKS = [['#1d3d9b', 'நீலம் / Blue'], ['#c0272d', 'சிவப்பு / Red'], ['#5b2a86', 'ஊதா / Violet'], ['#111111', 'கருப்பு / Black']];
      const S = Object.assign({ shape: 'round', w: 40, h: 30, top: 'முருகன் ஸ்டோர்ஸ்', bottom: 'மதுரை - 625001', mid: 'முருகன்\nஸ்டோர்ஸ்', ink: INKS[0][0], thick: 3, dbl: true, mirror: false, white: false }, lsGet(KEY, {}));
      let cv = null;
      function layout() {
        root.innerHTML = purpose('ரப்பர் ஸ்டாம்ப் வடிவமைப்பு — உண்மையான அளவில் (மி.மீ), 300 DPI. ஸ்டாம்ப் செய்பவரிடம் இந்தப் படத்தைக் கொடுக்கலாம். "கண்ணாடிப் பிம்பம்" தேர்வு செய்தால் ஸ்டாம்ப் தகடுக்கு ஏற்ற தலைகீழ் வடிவம் கிடைக்கும்.',
          'Rubber-stamp artwork at real size (mm), 300 DPI. Give the picture to your stamp maker. Turn on "mirror" for the reversed plate artwork.') +
          tabs([['round', '⭕ ' + T('வட்டம்', 'Round')], ['rect', '▭ ' + T('செவ்வகம்', 'Rectangle')], ['oval', '⬭ ' + T('நீள்வட்டம்', 'Oval')]], S.shape) +
          '<div class="bz-grid">' + field(S.shape === 'round' ? T('விட்டம் (மி.மீ)', 'Diameter (mm)') : T('அகலம் (மி.மீ)', 'Width (mm)'), 'w', S.w) + (S.shape === 'round' ? '' : field(T('உயரம் (மி.மீ)', 'Height (mm)'), 'h', S.h)) + '</div>' +
          (S.shape === 'round' ? '<div class="bz-grid">' + textField(T('மேல் வளைவு எழுத்து', 'Top curved text'), 'top', S.top) + textField(T('கீழ் வளைவு எழுத்து', 'Bottom curved text'), 'bottom', S.bottom) + '</div>' : '') +
          '<div class="bz-f"><label>' + (S.shape === 'round' ? T('நடுவில் உள்ள எழுத்து (ஒவ்வொரு வரியும் தனியாக)', 'Centre text (one line per row)') : T('எழுத்து (ஒவ்வொரு வரியும் தனியாக)', 'Text (one line per row)')) + '</label><textarea data-k="mid">' + esc(S.mid) + '</textarea></div>' +
          '<div class="bz-h">' + T('மை நிறம்', 'Ink colour') + '</div><div class="bz-chips">' + INKS.map(i => '<button type="button" class="bz-sw' + (i[0] === S.ink ? ' on' : '') + '" data-ink="' + i[0] + '" style="background:' + i[0] + '" aria-label="' + esc(i[1]) + '"></button>').join('') + '</div>' +
          '<div class="bz-grid">' + selectField(T('கோடு தடிமன்', 'Border thickness'), 'thick', [[2, T('மெல்லிய', 'Thin')], [3, T('நடுத்தர', 'Medium')], [5, T('தடித்த', 'Bold')]], S.thick) + '</div>' +
          '<label class="bz-chk"><input type="checkbox" data-k="dbl"' + (S.dbl ? ' checked' : '') + '> ' + T('இரட்டைக் கோடு', 'Double border') + '</label>' +
          '<label class="bz-chk"><input type="checkbox" data-k="mirror"' + (S.mirror ? ' checked' : '') + '> ' + T('கண்ணாடிப் பிம்பம் (ஸ்டாம்ப் தகடுக்கு)', 'Mirror image (for the stamp plate)') + '</label>' +
          '<label class="bz-chk"><input type="checkbox" data-k="white"' + (S.white ? ' checked' : '') + '> ' + T('வெள்ளைப் பின்னணி (இல்லையெனில் தெளிவான பின்னணி)', 'White background (otherwise transparent)') + '</label>' +
          '<canvas class="bz-canvas chk" data-k="cv"></canvas><div class="bz-info" data-k="size"></div>' +
          '<div class="bz-info">⚠️ ' + T('உங்கள் சொந்த நிறுவனத்தின் பெயருக்கு மட்டும் பயன்படுத்துங்கள். அரசு அலுவலகம், நீதிமன்றம், வங்கி, பிறர் பெயர் அல்லது அதிகாரப்பூர்வ முத்திரையைப் போலியாகச் செய்வது சட்டப்படி குற்றம்.', 'Use only for your own business name. Copying a government, court, bank or someone else\'s seal is a crime.') + '</div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="dl">⬇️ ' + T('PNG சேமி (300 DPI)', 'Save PNG (300 DPI)') + '</button></div>';
        cv = $(root, '[data-k=cv]');
        $$(root, '[data-tab]').forEach(b => { b.onclick = () => { S.shape = b.getAttribute('data-tab'); if (S.shape === 'round') S.h = S.w; else if (S.h === S.w) S.h = Math.round(S.w * 0.6); persist(); layout(); }; });
        $$(root, '[data-ink]').forEach(b => { b.onclick = () => { S.ink = b.getAttribute('data-ink'); persist(); $$(root, '[data-ink]').forEach(x => x.classList.toggle('on', x === b)); paint(); }; });
        bindInputs(root, (k, v) => { if (k in S) { S[k] = (k === 'w' || k === 'h') ? v : (k === 'thick' ? +v : v); persist(); paint(); } });
        $(root, '[data-act=dl]').onclick = () => saveCanvas(cv, 'rubber-stamp-' + S.shape + (S.mirror ? '-mirror' : '') + '.png');
        paint();
      }
      function persist() { lsSet(KEY, S); }
      function arcText(ctx, text, cx, cy, r, centerAngle, top) {
        const ch = graphemes(text); if (!ch.length) return;
        const wd = ch.map(c => ctx.measureText(c).width), total = wd.reduce((a, b) => a + b, 0);
        let cum = 0;
        ch.forEach((c, i) => {
          const mid = cum + wd[i] / 2; cum += wd[i];
          const a = top ? centerAngle - total / (2 * r) + mid / r : centerAngle + total / (2 * r) - mid / r;
          ctx.save(); ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a)); ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2); ctx.fillText(c, 0, 0); ctx.restore();
        });
      }
      function centreLines(ctx, lines, cx, cy, maxW, maxH, base) {
        lines = lines.filter(l => l.trim()); if (!lines.length) return;
        const lh = Math.min(maxH / lines.length, base * 1.25), fs0 = Math.min(base, lh * 0.82);
        lines.forEach((l, i) => { fitFont(ctx, l.trim(), maxW, fs0, '800', 8); ctx.fillText(l.trim(), cx, cy - (lines.length - 1) * lh / 2 + i * lh); });
      }
      function paint() {
        let w = num(S.w), h = S.shape === 'round' ? w : num(S.h);
        const info = $(root, '[data-k=size]');
        if (!(w >= 10 && w <= 150 && h >= 10 && h <= 150)) { info.textContent = T('அளவு 10 முதல் 150 மி.மீ-க்குள் இருக்க வேண்டும்', 'Size must be between 10 and 150 mm'); return; }
        const W = mmToPx(w, 300), H = mmToPx(h, 300), ctx = cv.getContext('2d');
        cv.width = W; cv.height = H; ctx.clearRect(0, 0, W, H);
        if (S.white) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); }
        ctx.save(); if (S.mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
        const t = Math.max(2, Math.round(Math.min(W, H) * 0.012 * S.thick / 3 * 1.4));
        ctx.strokeStyle = S.ink; ctx.fillStyle = S.ink; ctx.lineWidth = t; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const mid = String(S.mid || '').split(/\r?\n/);
        if (S.shape === 'round') {
          const cx = W / 2, cy = H / 2, R0 = W / 2 - t * 1.2, bw = R0 * 0.26, R1 = R0 - bw - t * 1.5;
          ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.stroke();
          if (S.dbl) { ctx.lineWidth = Math.max(1, t * 0.5); ctx.beginPath(); ctx.arc(cx, cy, R0 - t * 1.8, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = t; }
          ctx.beginPath(); ctx.arc(cx, cy, R1, 0, Math.PI * 2); ctx.stroke();
          const rm = (R0 + R1) / 2 - (S.dbl ? t * 0.6 : 0);
          [[S.top, true], [S.bottom, false]].forEach(p => {
            const txt = String(p[0] || '').trim(); if (!txt) return;
            let fs = bw * 0.62; ctx.font = '800 ' + fs + 'px ' + FONT;
            const total = graphemes(txt).reduce((a, c) => a + ctx.measureText(c).width, 0), avail = Math.PI * rm * 0.92;
            if (total > avail) { fs = Math.max(8, fs * avail / total); ctx.font = '800 ' + fs + 'px ' + FONT; }
            arcText(ctx, txt, cx, cy, p[1] ? rm : rm, p[1] ? -Math.PI / 2 : Math.PI / 2, p[1]);
          });
          const sz = R1 * 1.55; centreLines(ctx, mid, cx, cy, sz * 0.92, sz * 0.9, R1 * 0.5);
        } else if (S.shape === 'rect') {
          const m = t * 0.8; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
          if (S.dbl) { ctx.lineWidth = Math.max(1, t * 0.5); ctx.strokeRect(m + t * 2, m + t * 2, W - 2 * (m + t * 2), H - 2 * (m + t * 2)); ctx.lineWidth = t; }
          const g = t * (S.dbl ? 5 : 3);
          centreLines(ctx, mid, W / 2, H / 2, W - 2 * g - t * 2, H - 2 * g - t * 2, H * 0.4);
        } else {
          const m = t * 0.8; ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W / 2 - m, H / 2 - m, 0, 0, Math.PI * 2); ctx.stroke();
          if (S.dbl) { ctx.lineWidth = Math.max(1, t * 0.5); ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W / 2 - m - t * 2, H / 2 - m - t * 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = t; }
          centreLines(ctx, mid, W / 2, H / 2, W * 0.66, H * 0.56, H * 0.34);
        }
        ctx.restore();
        info.textContent = T('படத்தின் அளவு: ', 'Picture size: ') + fmtNum(w, 1) + ' × ' + fmtNum(h, 1) + ' mm (' + W + ' × ' + H + ' px, 300 DPI). ' + T('அச்சிடும்போது "Actual size / 100%" தேர்வு செய்யுங்கள்.', 'When printing choose "Actual size / 100%".');
      }
      layout();
    }
  };

  /* ===================================================================== 4. woodcalc — carpenter */
  TOOL_IMPL.woodcalc = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_wood_v1';
      const S = Object.assign({ tab: 'timber', len: '', wid: '', thk: '', qty: '1', rate: '', girth: '', rlen: '', area: '', sw: '4', sl: '8', waste: '10', prate: '', ft: '', inch: '', cm: '', ar: '', arate: '' }, lsGet(KEY, {}));
      function draw() {
        root.innerHTML = purpose('தச்சர்களுக்கு: மரத்தின் கன அடி (cft), உருளை மரம், பிளைவுட் எத்தனை ஷீட் வேண்டும், சதுர அடி கணக்கு, அடி-அங்குலம் ↔ செ.மீ.',
          'For carpenters: timber cubic feet (cft), round logs, plywood sheets needed, square-foot cost, feet-inch ↔ cm.') +
          tabs([['timber', T('பலகை cft', 'Timber cft')], ['log', T('உருளை மரம்', 'Round log')], ['ply', T('பிளைவுட்', 'Plywood')], ['conv', T('அடி ↔ செ.மீ', 'ft-in ↔ cm')]], S.tab) + '<div data-k="pane"></div><div data-k="out"></div>';
        $$(root, '[data-tab]').forEach(b => { b.onclick = () => { S.tab = b.getAttribute('data-tab'); draw(); }; });
        const pane = $(root, '[data-k=pane]');
        if (S.tab === 'timber') pane.innerHTML = '<div class="bz-grid three">' + field(T('நீளம் (அடி)', 'Length (ft)'), 'len', S.len) + field(T('அகலம் (அங்குலம்)', 'Width (in)'), 'wid', S.wid) + field(T('கனம் (அங்குலம்)', 'Thickness (in)'), 'thk', S.thk) + '</div><div class="bz-grid">' + field(T('எண்ணிக்கை', 'Pieces'), 'qty', S.qty) + field(T('1 cft விலை (₹)', 'Rate per cft (₹)'), 'rate', S.rate) + '</div>';
        else if (S.tab === 'log') pane.innerHTML = '<div class="bz-grid">' + field(T('சுற்றளவு (அங்குலம்)', 'Girth (in)'), 'girth', S.girth) + field(T('நீளம் (அடி)', 'Length (ft)'), 'rlen', S.rlen) + '</div><div class="bz-grid one">' + field(T('1 cft விலை (₹)', 'Rate per cft (₹)'), 'rate', S.rate) + '</div>';
        else if (S.tab === 'ply') pane.innerHTML = '<div class="bz-grid">' + field(T('மொத்தப் பரப்பு (சதுர அடி)', 'Total area (sq.ft)'), 'area', S.area) + field(T('வீணாகும் % (வெட்டும்போது)', 'Wastage %'), 'waste', S.waste) + field(T('ஷீட் அகலம் (அடி)', 'Sheet width (ft)'), 'sw', S.sw) + field(T('ஷீட் நீளம் (அடி)', 'Sheet length (ft)'), 'sl', S.sl) + '</div><div class="bz-grid one">' + field(T('1 ஷீட் விலை (₹)', 'Price per sheet (₹)'), 'prate', S.prate) + '</div>';
        else pane.innerHTML = '<div class="bz-grid">' + field(T('அடி', 'Feet'), 'ft', S.ft) + field(T('அங்குலம்', 'Inches'), 'inch', S.inch) + '</div><div class="bz-grid one">' + field(T('அல்லது செ.மீ', 'or centimetres'), 'cm', S.cm) + '</div><div class="bz-grid">' + field(T('பரப்பு (சதுர அடி) — விலை கணக்கிட', 'Area (sq.ft) for costing'), 'ar', S.ar) + field(T('1 சதுர அடி விலை (₹)', 'Rate per sq.ft (₹)'), 'arate', S.arate) + '</div>';
        bindInputs(pane, (k, v) => { S[k] = v; lsSet(KEY, S); calc(); });
        calc();
      }
      function calc() {
        const out = $(root, '[data-k=out]'), P = k => num(S[k]);
        if (S.tab === 'timber') {
          const L = P('len'), Wd = P('wid'), Th = P('thk'), q = P('qty') || 1, r = P('rate');
          if (!(L > 0 && Wd > 0 && Th > 0)) { out.innerHTML = '<div class="bz-info">' + T('நீளம், அகலம், கனம் எழுதுங்கள்.', 'Enter length, width and thickness.') + '</div>'; return; }
          const c = timberCft(L, Wd, Th, q);
          out.innerHTML = resCard(T('மொத்தம்', 'Total'), fmtNum(c, 3) + ' cft', r > 0 ? T('விலை ', 'Cost ') + inr(c * r) : '', 'ok') + '<div class="bz-info">' + T('சூத்திரம்: நீளம்(அடி) × அகலம்(அங்) × கனம்(அங்) ÷ 144. ஒரு பலகை = ', 'Formula: length(ft) × width(in) × thickness(in) ÷ 144. One piece = ') + fmtNum(timberCft(L, Wd, Th, 1), 3) + ' cft</div>';
        } else if (S.tab === 'log') {
          const g = P('girth'), L = P('rlen'), r = P('rate');
          if (!(g > 0 && L > 0)) { out.innerHTML = '<div class="bz-info">' + T('சுற்றளவும் நீளமும் எழுதுங்கள்.', 'Enter girth and length.') + '</div>'; return; }
          const c = roundLogCft(g, L);
          out.innerHTML = resCard(T('மர அளவு', 'Log volume'), fmtNum(c, 3) + ' cft', r > 0 ? T('விலை ', 'Cost ') + inr(c * r) : '', 'ok') + '<div class="bz-info">' + T('கால்-சுற்றளவு முறை: (சுற்றளவு ÷ 4)² × நீளம் ÷ 144. மரக்கடையில் அவர்கள் பயன்படுத்தும் முறையைச் சரிபார்த்துக்கொள்ளுங்கள்.', 'Quarter-girth rule: (girth ÷ 4)² × length ÷ 144. Check which rule your timber depot uses.') + '</div>';
        } else if (S.tab === 'ply') {
          const a = P('area'), sw = P('sw'), sl = P('sl'), w = P('waste') || 0, pr = P('prate');
          if (!(a > 0 && sw > 0 && sl > 0)) { out.innerHTML = '<div class="bz-info">' + T('பரப்பு, ஷீட் அளவு எழுதுங்கள்.', 'Enter the area and sheet size.') + '</div>'; return; }
          const n = sheetsNeeded(a, sw * sl, w);
          out.innerHTML = resCard(T('தேவையான ஷீட்', 'Sheets needed'), n + ' ' + T('ஷீட்', 'sheets'), pr > 0 ? T('செலவு ', 'Cost ') + inr(n * pr) : '', 'ok') + '<div class="bz-info">' + T('ஒரு ஷீட் = ', 'One sheet = ') + fmtNum(sw * sl, 2) + ' sq.ft. ' + T('வெட்டுக் கழிவு சேர்க்கப்பட்டுள்ளது.', 'Cutting wastage included.') + '</div>';
        } else {
          const cm = P('cm'), ft = P('ft'), inch = P('inch'), ar = P('ar'), ar2 = P('arate'); let html = '';
          if (cm > 0) { const x = cmToFtIn(cm); html += resCard(T('செ.மீ → அடி', 'cm → ft-in'), x.ft + ' ' + T('அடி', 'ft') + ' ' + fmtNum(x.inch, 2) + ' ' + T('அங்', 'in'), fmtNum(cm, 2) + ' cm', 'ok'); }
          if (ft > 0 || inch > 0) html += resCard(T('அடி-அங் → செ.மீ', 'ft-in → cm'), fmtNum(ftInToCm(ft, inch), 2) + ' cm', fmtNum(ftInToCm(ft, inch) / 100, 3) + ' m', 'ok');
          if (ar > 0 && ar2 > 0) html += resCard(T('பரப்பு செலவு', 'Area cost'), inr(ar * ar2), fmtNum(ar, 2) + ' sq.ft × ' + inr(ar2));
          out.innerHTML = html || '<div class="bz-info">' + T('மேலே ஏதாவது ஒன்றை எழுதுங்கள்.', 'Enter any value above.') + '</div>';
        }
      }
      draw();
    }
  };

  /* ===================================================================== 5. tripcalc — driver / taxi trip bill */
  TOOL_IMPL.tripcalc = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_trip_v1';
      const S = Object.assign({ owner: '', phone: '', veh: '', cust: '', route: '', date: todayIso(), startKm: '', endKm: '', days: '1', ratePerKm: '', minKmPerDay: '', waitHours: '', waitRate: '', battaPerDay: '', toll: '', parking: '', permit: '', other: '', gstPct: '', advance: '' }, lsGet(KEY, {}));
      let cv = null, last = null;
      function draw() {
        root.innerHTML = purpose('வாடகை வாகன ஓட்டுநர்களுக்கு: ஓடிய கி.மீ, குறைந்தபட்ச கி.மீ, காத்திருப்பு, இரவு பேட்டா, டோல் எல்லாம் சேர்த்து பயணக் கட்டணம் — படமாகவோ WhatsApp செய்தியாகவோ கொடுக்கலாம்.',
          'For taxi and rental drivers: km run, minimum km, waiting, night batta and toll added into one trip bill — share as a picture or WhatsApp text.') +
          '<div class="bz-grid">' + textField(T('உரிமையாளர் / ஓட்டுநர் பெயர்', 'Owner / driver'), 'owner', S.owner) + field(T('போன்', 'Phone'), 'phone', S.phone, { mode: 'tel' }) + textField(T('வாகன எண்', 'Vehicle no.'), 'veh', S.veh) + textField(T('வாடிக்கையாளர்', 'Customer'), 'cust', S.cust) + textField(T('பயணம் (இருந்து — வரை)', 'Route (from — to)'), 'route', S.route) + field(T('தேதி', 'Date'), 'date', S.date, { type: 'date', mode: 'text' }) + '</div>' +
          '<div class="bz-h">' + T('ஓடிய தூரம்', 'Distance') + '</div><div class="bz-grid three">' + field(T('தொடக்க கி.மீ', 'Start km'), 'startKm', S.startKm) + field(T('முடிவு கி.மீ', 'End km'), 'endKm', S.endKm) + field(T('நாட்கள்', 'Days'), 'days', S.days) + '</div>' +
          '<div class="bz-h">' + T('கட்டண விகிதம்', 'Rates') + '</div><div class="bz-grid three">' + field(T('1 கி.மீ (₹)', 'Per km (₹)'), 'ratePerKm', S.ratePerKm) + field(T('குறைந்தபட்ச கி.மீ / நாள்', 'Min km / day'), 'minKmPerDay', S.minKmPerDay) + field(T('இரவு பேட்டா / நாள் (₹)', 'Night batta / day'), 'battaPerDay', S.battaPerDay) + field(T('காத்திருப்பு (மணி)', 'Waiting (hours)'), 'waitHours', S.waitHours) + field(T('காத்திருப்பு ₹ / மணி', 'Waiting ₹ / hour'), 'waitRate', S.waitRate) + field('GST %', 'gstPct', S.gstPct) + '</div>' +
          '<div class="bz-h">' + T('மற்ற செலவுகள்', 'Other charges') + '</div><div class="bz-grid three">' + field('Toll (₹)', 'toll', S.toll) + field('Parking (₹)', 'parking', S.parking) + field('Permit (₹)', 'permit', S.permit) + field(T('மற்றவை (₹)', 'Other (₹)'), 'other', S.other) + field(T('முன்பணம் (₹)', 'Advance (₹)'), 'advance', S.advance) + '</div>' +
          '<div data-k="out"></div><canvas class="bz-canvas" data-k="cv" hidden></canvas><div class="bz-actions" data-k="acts" hidden></div>';
        cv = $(root, '[data-k=cv]');
        bindInputs(root, (k, v) => { S[k] = v; lsSet(KEY, S); calc(); });
        calc();
      }
      function calc() {
        const out = $(root, '[data-k=out]'), acts = $(root, '[data-k=acts]'), P = k => num(S[k]) || 0;
        if (!(P('endKm') > P('startKm')) && !(P('minKmPerDay') > 0)) { out.innerHTML = '<div class="bz-info">' + T('தொடக்க, முடிவு கி.மீ மற்றும் ஒரு கி.மீ கட்டணத்தை எழுதுங்கள்.', 'Enter start km, end km and the rate per km.') + '</div>'; cv.hidden = true; acts.hidden = true; return; }
        const r = tripBill({ startKm: P('startKm'), endKm: P('endKm'), days: P('days'), ratePerKm: P('ratePerKm'), minKmPerDay: P('minKmPerDay'), waitHours: P('waitHours'), waitRate: P('waitRate'), battaPerDay: P('battaPerDay'), toll: P('toll'), parking: P('parking'), permit: P('permit'), other: P('other'), gstPct: P('gstPct'), advance: P('advance') });
        last = r;
        const rows = [[T('ஓடிய தூரம்', 'Distance run'), fmtNum(r.km, 1) + ' km'], [T('கட்டணம் செலுத்தும் தூரம்', 'Billable km') + (r.minApplied ? ' (' + T('குறைந்தபட்சம்', 'minimum') + ')' : ''), fmtNum(r.billKm, 1) + ' km'], [T('வாடகை', 'Fare') + ' (' + fmtNum(r.billKm, 1) + ' × ' + inr(P('ratePerKm')) + ')', inr(r.fare)]];
        if (r.wait) rows.push([T('காத்திருப்பு', 'Waiting'), inr(r.wait)]); if (r.batta) rows.push([T('இரவு பேட்டா', 'Night batta'), inr(r.batta)]); if (r.other) rows.push([T('டோல் / பார்க்கிங் / மற்றவை', 'Toll / parking / other'), inr(r.other)]);
        if (r.tax) rows.push(['GST ' + fmtNum(P('gstPct'), 2) + '%', inr(r.tax)]);
        rows.push([T('மொத்தம்', 'Total'), inr(r.total), true]); if (P('advance')) { rows.push([T('முன்பணம்', 'Advance'), '− ' + inr(P('advance'))]); rows.push([T('செலுத்த வேண்டியது', 'Balance to pay'), inr(r.due), true]); }
        out.innerHTML = resCard(P('advance') ? T('செலுத்த வேண்டியது', 'Balance to pay') : T('மொத்தக் கட்டணம்', 'Total bill'), inr(P('advance') ? r.due : r.total), fmtNum(r.billKm, 1) + ' km', 'ok') + table(rows);
        acts.hidden = false; cv.hidden = false; paintBill(rows);
        const txt = billText(rows);
        acts.innerHTML = '<button type="button" class="bz-btn" data-act="dl">⬇️ ' + T('படம் (PNG)', 'Picture (PNG)') + '</button><button type="button" class="bz-btn sec" data-act="cp">📋 ' + T('செய்தி நகலெடு', 'Copy text') + '</button>' + waBtn('', txt, T('WhatsApp', 'WhatsApp'));
        $(acts, '[data-act=dl]').onclick = () => saveCanvas(cv, 'trip-bill.png');
        $(acts, '[data-act=cp]').onclick = function () { copyText(txt, this); };
      }
      function billText(rows) {
        const L = [(S.owner || 'Trip bill') + (S.phone ? ' · ' + S.phone : ''), (S.veh ? S.veh + ' · ' : '') + dmy(S.date)];
        if (S.cust) L.push(T('வாடிக்கையாளர்', 'Customer') + ': ' + S.cust); if (S.route) L.push(S.route);
        rows.forEach(r => L.push(String(r[0]).replace(/<[^>]+>/g, '') + ': ' + String(r[1]))); return L.join('\n');
      }
      function paintBill(rows) {
        const W = 900, pad = 50, rowH = 64, head = 230, H = head + rows.length * rowH + 130, ctx = cv.getContext('2d');
        cv.width = W; cv.height = H; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#1F4E79'; ctx.fillRect(0, 0, W, head - 40);
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        fitFont(ctx, S.owner || T('பயணக் கட்டணம்', 'Trip bill'), W - 2 * pad, 56, '800', 26); ctx.fillText(S.owner || T('பயணக் கட்டணம்', 'Trip bill'), W / 2, 62);
        fitFont(ctx, [S.phone, S.veh].filter(Boolean).join('  ·  ') || ' ', W - 2 * pad, 30, '500', 18); ctx.fillText([S.phone, S.veh].filter(Boolean).join('  ·  '), W / 2, 118);
        fitFont(ctx, T('பயணக் கட்டணம் · ', 'Trip bill · ') + dmy(S.date), W - 2 * pad, 32, '700', 18); ctx.fillText(T('பயணக் கட்டணம் · ', 'Trip bill · ') + dmy(S.date), W / 2, 162);
        ctx.fillStyle = '#111827'; ctx.textAlign = 'left'; fitFont(ctx, [S.cust, S.route].filter(Boolean).join(' · ') || ' ', W - 2 * pad, 30, '600', 18); ctx.fillText([S.cust, S.route].filter(Boolean).join(' · '), pad, head - 14);
        let y = head + 10;
        rows.forEach((r, i) => {
          if (r[2]) { ctx.fillStyle = '#E8F0FB'; ctx.fillRect(0, y - rowH / 2 + 6, W, rowH); }
          ctx.fillStyle = '#111827'; ctx.textAlign = 'left'; fitFont(ctx, String(r[0]).replace(/<[^>]+>/g, ''), W - 2 * pad - 260, 32, r[2] ? '800' : '500', 18); ctx.fillText(String(r[0]).replace(/<[^>]+>/g, ''), pad, y + 6);
          ctx.textAlign = 'right'; ctx.font = (r[2] ? '800 ' : '700 ') + '34px ' + FONT; ctx.fillText(String(r[1]), W - pad, y + 6); y += rowH;
        });
        ctx.textAlign = 'center'; ctx.fillStyle = '#9CA3AF'; ctx.font = '500 22px ' + FONT; ctx.fillText(T('நன்றி! மீண்டும் சந்திப்போம்.', 'Thank you! Please travel with us again.'), W / 2, H - 60); ctx.fillText('pdftoolsindia.com', W / 2, H - 26);
      }
      draw();
    }
  };

  /* ===================================================================== 6. shopslip — token / delivery slip */
  TOOL_IMPL.shopslip = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_slip_v1';
      const S = Object.assign({ shop: '', phone: '', token: 1, cust: '', cphone: '', due: '', advance: '', note: '', width: '576', items: [{ n: '', q: '1', r: '' }] }, lsGet(KEY, {}));
      if (!Array.isArray(S.items) || !S.items.length) S.items = [{ n: '', q: '1', r: '' }];
      let cv = null;
      function layout() {
        root.innerHTML = purpose('சலவை, தையல், பழுதுபார்ப்பு, போட்டோ லேப் போன்ற கடைகளுக்கு: டோக்கன் ரசீது — வாடிக்கையாளர் பெயர், பொருட்கள், முன்பணம், கொடுக்கும் தேதி. டோக்கன் எண் தானாக ஏறும்.',
          'Token slip for laundry, tailor, repair and photo-lab shops — customer, items, advance, delivery date. The token number counts up by itself.') +
          '<div class="bz-grid">' + textField(T('கடை பெயர்', 'Shop name'), 'shop', S.shop) + field(T('கடை போன்', 'Shop phone'), 'phone', S.phone, { mode: 'tel' }) + field(T('டோக்கன் எண்', 'Token no.'), 'token', S.token) + selectField(T('ரசீது அகலம்', 'Slip width'), 'width', [['384', '58 mm thermal'], ['576', '80 mm thermal'], ['800', T('போன் / WhatsApp படம்', 'Phone / WhatsApp picture')]], S.width) + textField(T('வாடிக்கையாளர் பெயர்', 'Customer'), 'cust', S.cust) + field(T('வாடிக்கையாளர் போன்', 'Customer phone'), 'cphone', S.cphone, { mode: 'tel' }) + field(T('கொடுக்கும் தேதி', 'Delivery date'), 'due', S.due, { type: 'date', mode: 'text' }) + field(T('முன்பணம் (₹)', 'Advance (₹)'), 'advance', S.advance) + '</div>' +
          '<div class="bz-h">' + T('பொருட்கள்', 'Items') + '</div><div class="bz-items" data-k="items"></div><div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="addrow">➕ ' + T('வரி சேர்', 'Add row') + '</button></div>' +
          '<div class="bz-grid one">' + textField(T('குறிப்பு', 'Note'), 'note', S.note) + '</div>' +
          '<canvas class="bz-canvas" data-k="cv"></canvas><div data-k="tot"></div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="dl">⬇️ ' + T('படம் (PNG)', 'Picture (PNG)') + '</button><button type="button" class="bz-btn green" data-act="next">➕ ' + T('அடுத்த டோக்கன்', 'Next token') + '</button><span data-k="wa"></span></div>' +
          '<div class="bz-info">' + T('Thermal printer இருந்தால் PNG-ஐ அதன் app-ல் திறந்து அச்சிடலாம்.', 'With a thermal printer, open the PNG in its app and print.') + '</div>';
        drawItems(); cv = $(root, '[data-k=cv]');
        bindInputs(root, (k, v) => { if (k in S) { S[k] = k === 'token' ? (num(v) > 0 ? Math.floor(num(v)) : v) : v; persist(); paint(); } });
        $(root, '[data-act=addrow]').onclick = () => { S.items.push({ n: '', q: '1', r: '' }); persist(); drawItems(); };
        $(root, '[data-act=dl]').onclick = () => saveCanvas(cv, 'token-' + S.token + '.png');
        $(root, '[data-act=next]').onclick = () => { S.token = nextToken(num(S.token)); S.cust = ''; S.cphone = ''; S.due = ''; S.advance = ''; S.note = ''; S.items = [{ n: '', q: '1', r: '' }]; persist(); layout(); };
        paint();
      }
      function persist() { lsSet(KEY, S); }
      function drawItems() {
        const box = $(root, '[data-k=items]');
        box.innerHTML = S.items.map((it, i) => '<div class="bz-item q"><input type="text" data-i="' + i + '" data-f="n" value="' + esc(it.n) + '" placeholder="' + esc(T('பொருள்', 'Item')) + '"><input type="text" inputmode="decimal" data-i="' + i + '" data-f="q" value="' + esc(it.q) + '" placeholder="' + esc(T('எண்', 'Qty')) + '"><input type="text" inputmode="decimal" data-i="' + i + '" data-f="r" value="' + esc(it.r) + '" placeholder="₹"><button type="button" class="bz-x" data-rm="' + i + '" aria-label="remove">✕</button></div>').join('');
        $$(box, 'input').forEach(inp => { inp.addEventListener('input', () => { S.items[+inp.getAttribute('data-i')][inp.getAttribute('data-f')] = inp.value; persist(); paint(); }); });
        $$(box, '[data-rm]').forEach(b => { b.onclick = () => { S.items.splice(+b.getAttribute('data-rm'), 1); if (!S.items.length) S.items.push({ n: '', q: '1', r: '' }); persist(); drawItems(); paint(); }; });
      }
      function paint() {
        const W = +S.width || 576, sc = W / 576, pad = Math.round(24 * sc), items = S.items.filter(i => i.n.trim());
        const lines = items.map(i => { const q = num(i.q) || 1, r = num(i.r) || 0; return { n: i.n.trim(), q: q, r: r, a: round2(q * r) }; });
        const sum = lines.reduce((a, l) => a + l.a, 0), adv = num(S.advance) || 0, bal = round2(sum - adv);
        const fs = Math.round(26 * sc), lh = Math.round(40 * sc), big = Math.round(46 * sc);
        const probe = document.createElement('canvas').getContext('2d');
        const H = Math.round((150 + lines.length * 46 + 260 + (S.note ? 50 : 0) + (S.cust ? 40 : 0) + (S.due ? 40 : 0)) * sc);
        cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); void probe;
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000000'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        let y = Math.round(40 * sc);
        fitFont(ctx, S.shop.trim() || T('கடை பெயர்', 'Shop name'), W - 2 * pad, big, '800', 16); ctx.fillText(S.shop.trim() || T('கடை பெயர்', 'Shop name'), W / 2, y); y += lh;
        if (S.phone.trim()) { fitFont(ctx, S.phone.trim(), W - 2 * pad, fs, '500', 14); ctx.fillText(S.phone.trim(), W / 2, y); y += lh; }
        ctx.fillRect(pad, y - lh / 2 + 6, W - 2 * pad, 2); y += Math.round(18 * sc);
        fitFont(ctx, T('டோக்கன் எண்: ', 'Token: ') + S.token, W - 2 * pad, Math.round(54 * sc), '800', 20); ctx.fillText(T('டோக்கன் எண்: ', 'Token: ') + S.token, W / 2, y + 10); y += Math.round(60 * sc);
        ctx.textAlign = 'left'; ctx.font = '500 ' + fs + 'px ' + FONT;
        ctx.fillText(T('தேதி: ', 'Date: ') + dmy(todayIso()), pad, y); y += lh;
        if (S.cust.trim()) { fitFont(ctx, T('பெயர்: ', 'Name: ') + S.cust.trim() + (S.cphone.trim() ? ' (' + S.cphone.trim() + ')' : ''), W - 2 * pad, fs, '600', 14); ctx.fillText(T('பெயர்: ', 'Name: ') + S.cust.trim() + (S.cphone.trim() ? ' (' + S.cphone.trim() + ')' : ''), pad, y); y += lh; }
        ctx.fillRect(pad, y - lh / 2 + 8, W - 2 * pad, 1); y += Math.round(10 * sc);
        lines.forEach(l => {
          ctx.textAlign = 'left'; fitFont(ctx, l.n + (l.q !== 1 ? ' × ' + fmtNum(l.q, 2) : ''), W - 2 * pad - Math.round(150 * sc), fs, '600', 14); ctx.fillText(l.n + (l.q !== 1 ? ' × ' + fmtNum(l.q, 2) : ''), pad, y);
          if (l.r) { ctx.textAlign = 'right'; ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillText(fmtNum(l.a, 2), W - pad, y); } y += Math.round(46 * sc);
        });
        if (sum > 0) {
          ctx.fillRect(pad, y - lh / 2 + 8, W - 2 * pad, 1); y += Math.round(14 * sc);
          const row = (a, b, strong) => { ctx.textAlign = 'left'; ctx.font = (strong ? '800 ' : '500 ') + fs + 'px ' + FONT; ctx.fillText(a, pad, y); ctx.textAlign = 'right'; ctx.fillText(b, W - pad, y); y += lh; };
          row(T('மொத்தம்', 'Total'), inr(sum), true); if (adv) { row(T('முன்பணம்', 'Advance'), inr(adv)); row(T('மீதம்', 'Balance'), inr(bal), true); }
        }
        if (S.due) { ctx.textAlign = 'left'; ctx.font = '800 ' + fs + 'px ' + FONT; ctx.fillText(T('கொடுக்கும் தேதி: ', 'Delivery: ') + dmy(S.due), pad, y); y += lh; }
        if (S.note.trim()) { ctx.textAlign = 'left'; fitFont(ctx, S.note.trim(), W - 2 * pad, fs, '500', 14); ctx.fillText(S.note.trim(), pad, y); y += lh; }
        ctx.textAlign = 'center'; ctx.fillStyle = '#6B7280'; ctx.font = '500 ' + Math.round(20 * sc) + 'px ' + FONT; ctx.fillText(T('இந்த ரசீதைக் கொண்டு வரவும் · நன்றி', 'Please bring this slip · Thank you'), W / 2, y + Math.round(10 * sc));
        $(root, '[data-k=tot]').innerHTML = sum > 0 ? resCard(adv ? T('மீதம்', 'Balance') : T('மொத்தம்', 'Total'), inr(adv ? bal : sum), '', 'ok') : '';
        const msg = fillTemplate(MESSAGES[0].t, { name: S.cust, item: lines.map(l => l.n).join(', '), shop: S.shop });
        $(root, '[data-k=wa]').innerHTML = S.cphone.trim() ? waBtn(S.cphone, msg, T('"தயார்" செய்தி', '"Ready" message')) : '';
      }
      layout();
    }
  };

  /* ===================================================================== 7. wamsg — WhatsApp messages */
  TOOL_IMPL.wamsg = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_wamsg_v1';
      const S = Object.assign({ id: 'ready', lang: 'ta', name: '', phone: '', shop: '', item: '', amount: '', date: '' }, lsGet(KEY, {}));
      let text = '', edited = false;
      function build() { const m = MESSAGES.find(x => x.id === S.id) || MESSAGES[0]; return fillTemplate(S.lang === 'en' ? m.e : m.t, S); }
      function draw() {
        root.innerHTML = purpose('வாடிக்கையாளருக்கு அனுப்ப தயாரான செய்திகள் — ஆர்டர் தயார், பணம் நிலுவை, முன்பதிவு, பண்டிகை வாழ்த்து. பெயர் போட்டு WhatsApp-ல் ஒரே தொடுதலில் அனுப்புங்கள்.',
          'Ready-made customer messages — order ready, payment due, booking, festival wishes. Fill the name and send on WhatsApp in one tap.') +
          '<div class="bz-h">' + T('செய்தி வகை', 'Message') + '</div><div class="bz-chips">' + MESSAGES.map(m => '<button type="button" class="bz-chip' + (m.id === S.id ? ' on' : '') + '" data-id="' + m.id + '">' + m.ta + '</button>').join('') + '</div>' +
          tabs([['ta', 'தமிழ்'], ['en', 'English']], S.lang) +
          '<div class="bz-grid">' + textField(T('வாடிக்கையாளர் பெயர்', 'Customer name'), 'name', S.name) + field(T('போன் (WhatsApp)', 'Phone'), 'phone', S.phone, { mode: 'tel' }) + textField(T('கடை பெயர்', 'Shop name'), 'shop', S.shop) + textField(T('பொருள் / சேவை', 'Item / service'), 'item', S.item) + field(T('தொகை (₹)', 'Amount (₹)'), 'amount', S.amount) + field(T('தேதி', 'Date'), 'date', S.date, { mode: 'text' }) + '</div>' +
          '<div class="bz-f"><label>' + T('செய்தி (மாற்றலாம்)', 'Message (you can edit)') + '</label><textarea data-k="msg"></textarea></div><div class="bz-actions" data-k="acts"></div>' +
          '<div class="bz-info">' + T('"____" என்று வரும் இடங்களை நிரப்புங்கள். தொலைபேசி எண் இல்லையென்றால் WhatsApp திறந்ததும் தொடர்பைத் தேர்ந்தெடுக்கலாம்.', 'Fill the "____" blanks. Without a phone number, WhatsApp lets you pick the contact.') + '</div>';
        $$(root, '[data-id]').forEach(b => { b.onclick = () => { S.id = b.getAttribute('data-id'); edited = false; lsSet(KEY, S); draw(); }; });
        $$(root, '[data-tab]').forEach(b => { b.onclick = () => { S.lang = b.getAttribute('data-tab'); edited = false; lsSet(KEY, S); draw(); }; });
        bindInputs(root, (k, v) => { if (k === 'msg') { text = v; edited = true; acts(); return; } S[k] = v; lsSet(KEY, S); if (!edited) { text = build(); $(root, '[data-k=msg]').value = text; } acts(); });
        text = build(); $(root, '[data-k=msg]').value = text; acts();
      }
      function acts() {
        const a = $(root, '[data-k=acts]');
        a.innerHTML = waBtn(S.phone, text) + '<button type="button" class="bz-btn sec" data-act="cp">📋 ' + T('நகலெடு', 'Copy') + '</button>';
        $(a, '[data-act=cp]').onclick = function () { copyText(text, this); };
      }
      draw();
    }
  };

  /* ===================================================================== 8. profitcalc — profit and selling price */
  TOOL_IMPL.profitcalc = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_profit_v1';
      const S = Object.assign({ tab: 'price', cost: '', margin: '25', mode: 'margin', sell: '', gst: '0', fixed: '', price: '', var: '' }, lsGet(KEY, {}));
      function draw() {
        root.innerHTML = purpose('கடை நடத்துபவர்களுக்கு: வாங்கிய விலையிலிருந்து விற்பனை விலை, லாப %, GST சேர்த்த விலை, எத்தனை விற்றால் நஷ்டமில்லை (break-even).',
          'For shop owners: selling price from cost, profit %, GST-inclusive price, and how many to sell to break even.') +
          tabs([['price', T('விற்பனை விலை', 'Selling price')], ['check', T('லாபம் பார்', 'Check profit')], ['be', T('Break-even', 'Break-even')]], S.tab) + '<div data-k="pane"></div><div data-k="out"></div>';
        $$(root, '[data-tab]').forEach(b => { b.onclick = () => { S.tab = b.getAttribute('data-tab'); draw(); }; });
        const pane = $(root, '[data-k=pane]');
        if (S.tab === 'price') pane.innerHTML = '<div class="bz-grid">' + field(T('வாங்கிய விலை (₹)', 'Cost price (₹)'), 'cost', S.cost) + field(T('லாபம் (%)', 'Profit (%)'), 'margin', S.margin) + '</div><div class="bz-grid">' + selectField(T('% எதன் மேல்?', '% on what?'), 'mode', [['margin', T('விற்பனை விலையில் (margin)', 'On selling price (margin)')], ['markup', T('வாங்கிய விலையில் (markup)', 'On cost (markup)')]], S.mode) + field('GST %', 'gst', S.gst) + '</div>';
        else if (S.tab === 'check') pane.innerHTML = '<div class="bz-grid">' + field(T('வாங்கிய விலை (₹)', 'Cost price (₹)'), 'cost', S.cost) + field(T('விற்கும் விலை (₹)', 'Selling price (₹)'), 'sell', S.sell) + '</div>';
        else pane.innerHTML = '<div class="bz-grid one">' + field(T('மாத நிலையான செலவு — வாடகை, சம்பளம், மின்சாரம் (₹)', 'Monthly fixed cost — rent, salary, power (₹)'), 'fixed', S.fixed) + '</div><div class="bz-grid">' + field(T('ஒன்றின் விற்கும் விலை (₹)', 'Selling price per unit (₹)'), 'price', S.price) + field(T('ஒன்றின் மாறும் செலவு (₹)', 'Cost per unit (₹)'), 'var', S.var) + '</div>';
        bindInputs(pane, (k, v) => { S[k] = v; lsSet(KEY, S); calc(); });
        calc();
      }
      function calc() {
        const out = $(root, '[data-k=out]'), P = k => num(S[k]);
        if (S.tab === 'price') {
          const c = P('cost'), m = P('margin'), g = P('gst') || 0;
          if (!(c > 0 && m >= 0)) { out.innerHTML = '<div class="bz-info">' + T('வாங்கிய விலையும் லாப %-உம் எழுதுங்கள்.', 'Enter the cost price and profit %.') + '</div>'; return; }
          const sp = S.mode === 'margin' ? priceFromCost(c, m) : priceFromMarkup(c, m);
          if (!isFinite(sp)) { out.innerHTML = '<div class="bz-msg">' + T('Margin 100%-க்குக் குறைவாக இருக்க வேண்டும்', 'Margin must be below 100%') + '</div>'; return; }
          const pr = profitOf(c, sp), gp = withGst(sp, g);
          out.innerHTML = resCard(T('விற்பனை விலை', 'Selling price'), inr(sp), T('ஒன்றுக்கு லாபம் ', 'Profit per unit ') + inr(pr.profit), 'ok') + table([[T('விற்பனை விலை (GST இல்லாமல்)', 'Selling price (before GST)'), inr(sp)], g ? ['GST ' + fmtNum(g, 2) + '%', inr(gp - sp)] : null, g ? [T('வாடிக்கையாளர் தரும் விலை', 'Customer pays'), inr(gp), true] : null, [T('லாபம் (margin)', 'Margin on price'), fmtNum(pr.margin, 2) + '%'], [T('லாபம் (markup)', 'Markup on cost'), fmtNum(pr.markup, 2) + '%']].filter(Boolean));
        } else if (S.tab === 'check') {
          const c = P('cost'), sp = P('sell');
          if (!(c > 0 && sp > 0)) { out.innerHTML = '<div class="bz-info">' + T('வாங்கிய விலையும் விற்கும் விலையும் எழுதுங்கள்.', 'Enter cost and selling price.') + '</div>'; return; }
          const pr = profitOf(c, sp);
          out.innerHTML = resCard(pr.profit >= 0 ? T('ஒன்றுக்கு லாபம்', 'Profit per unit') : T('ஒன்றுக்கு நஷ்டம்', 'Loss per unit'), inr(Math.abs(pr.profit)), fmtNum(pr.margin, 2) + '% margin · ' + fmtNum(pr.markup, 2) + '% markup', pr.profit >= 0 ? 'ok' : 'warn');
        } else {
          const f = P('fixed'), pr = P('price'), v = P('var');
          if (!(f >= 0 && pr > 0 && v >= 0)) { out.innerHTML = '<div class="bz-info">' + T('மூன்றையும் எழுதுங்கள்.', 'Fill all three fields.') + '</div>'; return; }
          const u = breakEven(f, pr, v);
          out.innerHTML = isFinite(u) ? resCard(T('நஷ்டமில்லாமல் இருக்க மாதம் விற்க வேண்டியது', 'Units to sell per month to break even'), u + ' ' + T('எண்ணிக்கை', 'units'), T('விற்பனை ', 'Sales ') + inr(u * pr) + T(' · ஒன்றுக்கு கிடைக்கும் பங்களிப்பு ', ' · contribution per unit ') + inr(pr - v), 'ok') : '<div class="bz-msg">' + T('விற்கும் விலை செலவை விடக் குறைவு — எத்தனை விற்றாலும் நஷ்டம்', 'Selling price is not above cost — you lose on every unit') + '</div>';
        }
      }
      draw();
    }
  };
})();
