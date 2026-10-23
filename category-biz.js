/* category-biz.js — free tools for small businesses and trades in Tamil Nadu (lazy-loaded, UPDATE_69). Everything runs in the browser, nothing is uploaded.
 *   khata       — customer credit book (udhar): who owes how much, entries, WhatsApp reminder, backup / restore
 *   ratecard    — price list / rate card picture for any trade (laundry, flowers, photo studio, tailor, driver …)
 *   stampmaker  — rubber-stamp artwork: round / rectangle / oval, real size in mm, mirror image for the stamp maker
 *   woodcalc    — carpenter: timber cft, round log, plywood sheets needed, area and cost, feet-inch ↔ cm
 *   tripcalc    — driver / taxi trip bill with minimum km, waiting, night batta, toll; bill picture + WhatsApp text
 *   shopslip    — order book for 12 trades: item-wise orders (5 pants, 3 shirts…), own rates, token slip, ready/deliver with count check, payments, tailor measurements, today summary
 *   wamsg       — ready-made WhatsApp messages for customers (order ready, payment due, festival wishes …)
 *   profitcalc  — cost → selling price, margin vs markup, GST-inclusive price, break-even units
 *   quickbill   — paste a WhatsApp order ("thakali 2 kg, puthina 10 rs") → bill table, total, UPI pay link + QR, paid/unpaid list, customer list sender
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

  function tripFare(o) { // mode: km (per km with minimum) | local (hours+km package) | fixed (airport / drop fixed price)
    if (!o.mode || o.mode === 'km') return tripBill(o);
    const km = Math.max(0, n0(o.endKm) - n0(o.startKm)), days = Math.max(1, Math.round(n0(o.days) || 1));
    let fare, exHr = 0, exKm = 0;
    if (o.mode === 'local') {
      exHr = round2(Math.max(0, n0(o.hours) - n0(o.pkgHours))); exKm = round2(Math.max(0, km - n0(o.pkgKm)));
      fare = round2(n0(o.pkgPrice) + exHr * n0(o.extraHrRate) + exKm * n0(o.extraKmRate));
    } else fare = round2(n0(o.fixedPrice));
    const wait = round2(n0(o.waitHours) * n0(o.waitRate)), batta = round2(n0(o.battaPerDay) * days);
    const other = round2(n0(o.toll) + n0(o.parking) + n0(o.permit) + n0(o.other));
    const sub = round2(fare + wait + batta + other), tax = round2(sub * n0(o.gstPct) / 100), total = round2(sub + tax);
    return { km: km, billKm: km, minApplied: false, exHr: exHr, exKm: exKm, fare: fare, wait: wait, batta: batta, other: other, sub: sub, tax: tax, total: total, due: round2(total - n0(o.advance)) };
  }
  function cutListRaw(rows) { return (rows || []).reduce((a, r) => { const L = num(r.len), W = num(r.wid), H = num(r.thk); return L > 0 && W > 0 && H > 0 ? a + L * W * H / 144 * (num(r.qty) > 0 ? num(r.qty) : 1) : a; }, 0); }
  function cutListCft(rows) { return Math.round(cutListRaw(rows) * 1000) / 1000; } // sum the exact volumes first, round once at the end
  function cutListCost(rows, rate) { return round2(cutListRaw(rows) * n0(rate)); } // cost from the exact volume, not the rounded cft

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

  // --- order book (shopslip): trade profiles. Item names "தமிழ் / English"; rates are always typed by the owner (never preset).
  const TRADES = [
    { id: 'laundry', icon: '👕', ta: 'சலவை / இஸ்திரி / ட்ரை கிளீன்', en: 'Laundry, ironing & dry clean', express: true,
      svc: ['சலவை + இஸ்திரி / Wash & iron', 'இஸ்திரி மட்டும் / Iron only', 'ட்ரை கிளீன் / Dry clean', 'கஞ்சி / Starch', 'ரோல் பிரஸ் / Roll press', 'சாயம் / Dye'],
      items: ['சட்டை / Shirt', 'பேன்ட் / Pant', 'டி-ஷர்ட் / T-shirt', 'வேட்டி / Dhoti', 'புடவை / Saree', 'பட்டுப் புடவை / Silk saree', 'சுடிதார் செட் / Churidar set', 'நைட்டி / Nightie', 'குழந்தை உடை / Kids wear', 'யூனிஃபார்ம் / Uniform', 'கோட் / Coat', 'போர்வை / Bedsheet', 'தலையணை உறை / Pillow cover', 'கம்பளி / Blanket', 'திரைச்சீலை / Curtain', 'துண்டு / Towel'],
      fields: [] },
    { id: 'tailor', icon: '🧵', ta: 'தையல் கடை', en: 'Tailor', measure: true,
      svc: ['தையல் / Stitching', 'லைனிங் உடன் / With lining', 'ஆல்டரேஷன் / Alteration', 'ஆரி / எம்ப்ராய்டரி / Aari work', 'ஃபால்ஸ் + பிக்கோ / Fall & pico'],
      items: ['ரவிக்கை / Blouse', 'சுடிதார் / Churidar', 'சல்வார் / Salwar', 'குர்தி / Kurti', 'பாவாடை / Skirt', 'நைட்டி / Nightie', 'குழந்தை ஃப்ராக் / Kids frock', 'சட்டை / Shirt', 'பேன்ட் / Pant', 'ஸ்கூல் யூனிஃபார்ம் / School uniform', 'புடவை / Saree'],
      fields: [['trial', 'ட்ரயல் தேதி / Trial date', 'date'], ['fabric', 'துணி விவரம் (நிறம், அளவு) / Fabric details', 'text']] },
    { id: 'repair', icon: '📱', ta: 'மொபைல் / எலக்ட்ரானிக்ஸ் பழுது', en: 'Mobile & electronics repair',
      svc: ['பழுது / Repair', 'உதிரிபாகம் / Part', 'சர்வீஸ் / Service', 'சோதனைக் கட்டணம் / Check-up'],
      items: ['திரை / Screen', 'பேட்டரி / Battery', 'சார்ஜிங் போர்ட் / Charging port', 'ஸ்பீக்கர் / மைக் / Speaker / Mic', 'சாஃப்ட்வேர் / Software', 'தண்ணீர் சேதம் / Water damage', 'கேமரா / Camera', 'பின் கவர் / Back panel', 'டிவி / TV', 'மிக்ஸி / Mixie', 'ஃபேன் / Fan'],
      fields: [['device', 'சாதனம் (பிராண்ட், மாடல்) / Device (brand, model)', 'text'], ['serial', 'IMEI / Serial எண்', 'text'], ['problem', 'என்ன பிரச்சனை / Problem', 'text'],
        ['acc', 'பெற்ற பொருட்கள் / Received with', 'checks', ['சார்ஜர் / Charger', 'பேட்டரி / Battery', 'SIM', 'மெமரி கார்டு / Memory card', 'கவர் / Cover', 'பெட்டி / Box']], ['warranty', 'வாரண்டி (நாட்கள்) / Warranty (days)', 'num']],
      hint: 'பூட்டு கடவுச்சொல் / PIN-ஐ இங்கே எழுத வேண்டாம். / Do not write the lock PIN or password here.' },
    { id: 'vehicle', icon: '🛵', ta: 'வண்டி மெக்கானிக்', en: 'Two-wheeler / car mechanic',
      svc: ['உழைப்புக் கூலி / Labour', 'உதிரிபாகம் / Part', 'ஆயில் / Oil'],
      items: ['ஜெனரல் சர்வீஸ் / General service', 'இன்ஜின் ஆயில் / Engine oil', 'பிரேக் ஷூ / Brake shoe', 'கிளட்ச் பிளேட் / Clutch plate', 'செயின் செட் / Chain set', 'டயர் / Tyre', 'டியூப் / Tube', 'பஞ்சர் / Puncture', 'பேட்டரி / Battery', 'வாஷ் / Wash'],
      fields: [['vno', 'வண்டி எண் / Vehicle no.', 'text'], ['km', 'கி.மீ ரீடிங் / Odometer km', 'num'], ['problem', 'புகார் / Complaint', 'text'], ['next', 'அடுத்த சர்வீஸ் தேதி / Next service', 'date']] },
    { id: 'photo', icon: '📸', ta: 'போட்டோ / வீடியோ ஸ்டுடியோ', en: 'Photo & video studio',
      svc: ['போட்டோ / Photo', 'வீடியோ / Video', 'ஆல்பம் / Album', 'டிரோன் / Drone', 'LED / Live', 'பிரிண்ட் / Print'],
      items: ['திருமணம் / Wedding', 'நிச்சயதார்த்தம் / Engagement', 'வரவேற்பு / Reception', 'காதணி விழா / Ear-piercing function', 'பூப்புனித நீராட்டு / Puberty function', 'பிறந்தநாள் / Birthday', 'அவுட்டோர் ஷூட் / Outdoor shoot', 'பாஸ்போர்ட் போட்டோ / Passport photo', 'ஆல்பம் பக்கம் / Album page', 'ஃப்ரேம் / Frame'],
      fields: [['edate', 'நிகழ்ச்சி தேதி / Event date', 'date'], ['etime', 'நேரம் / Time', 'time'], ['venue', 'இடம் / மண்டபம் / Venue', 'text']],
      dueLabel: 'ஆல்பம் / வீடியோ கொடுக்கும் தேதி / Album delivery date' },
    { id: 'flower', icon: '🌼', ta: 'பூக்கடை', en: 'Flower shop',
      svc: ['முழம் / Per muzham', 'மாலை / Garland', 'கொத்து / Bouquet', 'அலங்காரம் / Decoration'],
      items: ['மல்லிகை / Jasmine', 'முல்லை / Mullai', 'கனகாம்பரம் / Kanakambaram', 'ரோஜா / Rose', 'சம்பங்கி / Sampangi', 'மணமாலை ஜோடி / Wedding garland pair', 'சாமி மாலை / Temple garland', 'பூங்கொத்து / Bouquet', 'கார் அலங்காரம் / Car decoration', 'மேடை அலங்காரம் / Stage decoration'],
      fields: [['dtime', 'கொடுக்கும் நேரம் / Delivery time', 'time'], ['addr', 'முகவரி / Address', 'text'], ['occ', 'நிகழ்ச்சி / Occasion', 'text']] },
    { id: 'catering', icon: '🍛', ta: 'கேட்டரிங் / மெஸ் ஆர்டர்', en: 'Catering & mess orders',
      svc: ['ஒரு இலைக்கு / Per plate', 'பார்சல் / Parcel', 'கிலோ / Per kg', 'சேவை / Service'],
      items: ['சைவச் சாப்பாடு / Veg meals', 'அசைவச் சாப்பாடு / Non-veg meals', 'காலை டிஃபன் / Breakfast', 'பிரியாணி / Biryani', 'இனிப்பு / Sweet', 'தண்ணீர் பாட்டில் / Water bottle', 'பரிமாறும் ஆட்கள் / Serving staff', 'பாத்திர வாடகை / Vessel rent'],
      fields: [['edate', 'நிகழ்ச்சி தேதி / Event date', 'date'], ['etime', 'நேரம் / Time', 'time'], ['venue', 'இடம் / Venue', 'text']] },
    { id: 'service', icon: '🔧', ta: 'எலக்ட்ரீஷியன் / பிளம்பர் / AC', en: 'Electrician, plumber & AC service',
      svc: ['உழைப்புக் கூலி / Labour', 'பொருள் / Material', 'வருகைக் கட்டணம் / Visit charge'],
      items: ['ஃபேன் பொருத்துதல் / Fan fitting', 'லைட் பாயிண்ட் / Light point', 'சுவிட்ச் போர்டு / Switch board', 'வயரிங் / Wiring', 'மோட்டார் பழுது / Motor repair', 'குழாய் / Tap fitting', 'பைப் லைன் / Pipe line', 'AC சர்வீஸ் / AC service', 'கேஸ் நிரப்புதல் / Gas refill', 'இன்வெர்ட்டர் / Inverter'],
      fields: [['addr', 'வேலை செய்யும் இடம் / Site address', 'text'], ['vdate', 'வருகை தேதி / Visit date', 'date'], ['warranty', 'வாரண்டி (நாட்கள்) / Warranty (days)', 'num']] },
    { id: 'carpenter', icon: '🪚', ta: 'தச்சு / ஃபர்னிச்சர் ஆர்டர்', en: 'Carpentry & furniture orders',
      svc: ['கூலி மட்டும் / Labour only', 'பொருளுடன் / With material', 'பாலிஷ் / Polish'],
      items: ['கதவு / Door', 'ஜன்னல் / Window', 'கட்டில் / Cot', 'அலமாரி / Wardrobe', 'சமையலறை அலமாரி / Kitchen cabinet', 'மேஜை / Table', 'நாற்காலி பழுது / Chair repair', 'பூஜை அலமாரி / Pooja shelf'],
      fields: [['size', 'அளவு, மர வகை / Size & wood', 'text'], ['addr', 'இடம் / Site', 'text']] },
    { id: 'print', icon: '🖨️', ta: 'ஸ்டாம்ப் / அச்சகம்', en: 'Stamps & printing',
      svc: ['ரப்பர் / Rubber', 'Self-ink', 'அச்சு / Print', 'டிசைன் / Design'],
      items: ['வட்ட ஸ்டாம்ப் / Round stamp', 'செவ்வக ஸ்டாம்ப் / Rectangle stamp', 'தேதி ஸ்டாம்ப் / Date stamp', 'விசிட்டிங் கார்டு / Visiting card', 'பில் புக் / Bill book', 'லெட்டர்ஹெட் / Letterhead', 'ஃப்ளெக்ஸ் (ச.அடி) / Flex (sq.ft)', 'அழைப்பிதழ் / Invitation'],
      fields: [['text', 'அச்சிட வேண்டிய வாசகம் / Text to print', 'text'], ['proof', 'Proof', 'checks', ['அனுப்பியது / Sent', 'சரி என்றார்கள் / Approved']]],
      hint: 'அரசு, நீதிமன்றம், வங்கி அல்லது பிறர் முத்திரையைச் செய்ய ஆர்டர் எடுக்க வேண்டாம் — அது குற்றம். / Never take orders to copy a government, court, bank or someone else\'s seal.' },
    { id: 'salon', icon: '💇', ta: 'அழகு நிலையம் / முன்பதிவு', en: 'Salon & bridal bookings',
      svc: ['சேவை / Service', 'பேக்கேஜ் / Package', 'வீட்டிற்கு வந்து / Home visit'],
      items: ['முடி வெட்டு / Haircut', 'ஷேவ் / Shave', 'ஃபேஷியல் / Facial', 'த்ரெட்டிங் / Threading', 'ஹேர் கலர் / Hair colour', 'மணமகள் ஒப்பனை / Bridal makeup', 'மெஹந்தி / Mehndi', 'புடவை கட்டுதல் / Saree draping'],
      fields: [['bdate', 'முன்பதிவு தேதி / Booking date', 'date'], ['btime', 'நேரம் / Time', 'time']] },
    { id: 'general', icon: '🏪', ta: 'மற்ற தொழில் (நானே எழுதுவேன்)', en: 'Any other trade',
      svc: ['பொருள் / Item', 'சேவை / Service'], items: [], fields: [] }
  ];
  const MEASURES = {
    blouse: { ta: 'ரவிக்கை / Blouse', f: ['நீளம் / Length', 'தோள் / Shoulder', 'மார்பு / Chest', 'இடுப்பு / Waist', 'கை நீளம் / Sleeve length', 'கை சுற்று / Sleeve round', 'ஆர்ம் ஹோல் / Armhole', 'முன் கழுத்து / Front neck', 'பின் கழுத்து / Back neck', 'பாயிண்ட் / Point'] },
    churidar: { ta: 'சுடிதார் மேல் / Churidar top', f: ['நீளம் / Length', 'தோள் / Shoulder', 'மார்பு / Chest', 'இடுப்பு / Waist', 'ஹிப் / Hip', 'ஸ்லிட் / Slit', 'கை நீளம் / Sleeve length', 'கை சுற்று / Sleeve round', 'முன் கழுத்து / Front neck', 'பின் கழுத்து / Back neck'] },
    bottom: { ta: 'கீழ் உடை / Bottom', f: ['நீளம் / Length', 'இடுப்பு / Waist', 'ஹிப் / Hip', 'தொடை / Thigh', 'முட்டி / Knee', 'கணுக்கால் / Ankle'] },
    shirt: { ta: 'சட்டை / Shirt', f: ['நீளம் / Length', 'தோள் / Shoulder', 'மார்பு / Chest', 'இடுப்பு / Waist', 'கை நீளம் / Sleeve', 'கஃப் / Cuff', 'காலர் / Collar'] },
    pant: { ta: 'பேன்ட் / Pant', f: ['நீளம் / Length', 'இடுப்பு / Waist', 'ஹிப் / Seat', 'தொடை / Thigh', 'முட்டி / Knee', 'அடி / Bottom', 'ஃபோர்க் / Fork'] }
  };
  function addDaysIso(iso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + (n || 0)));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  const lineAmt = l => round2(n0(num(l.q)) * n0(num(l.r)));
  function orderCalc(o) {
    const lines = (o.l || []).filter(l => String(l.n || '').trim());
    const sub = round2(lines.reduce((a, l) => a + lineAmt(l), 0));
    const pcs = round2(lines.reduce((a, l) => a + n0(num(l.q)), 0));
    const ex = round2(sub * n0(num(o.ex)) / 100), dis = round2(n0(num(o.dis)));
    const total = round2(Math.max(0, sub + ex - dis));
    const paid = round2((o.pay || []).reduce((a, p) => a + n0(num(p.a)), 0));
    return { sub: sub, ex: ex, dis: dis, total: total, paid: paid, bal: round2(total - paid), pcs: pcs, lines: lines.length };
  }
  function itemSummary(o, en) {
    const pick = s => { const p = String(s || '').split(' / '); return (en ? p[1] || p[0] : p[0]).trim(); };
    const map = {};
    (o.l || []).filter(l => String(l.n || '').trim()).forEach(l => { const k = pick(l.n); map[k] = round2((map[k] || 0) + n0(num(l.q))); });
    return Object.keys(map).map(k => k + ' ×' + fmtNum(map[k], 2)).join(', ');
  }
  function isOverdue(o, today) { return (o.st === 'open' || o.st === 'ready') && !!o.due && o.due < today; }
  function dayStats(orders, iso) {
    const s = { orders: 0, pcs: 0, billed: 0, cash: 0, upi: 0, dueToday: 0, overdue: 0, readyWaiting: 0, toCollect: 0 };
    (orders || []).forEach(o => {
      if (o.st === 'cancel') return;
      const c = orderCalc(o);
      if (o.d === iso) { s.orders++; s.pcs += c.pcs; s.billed += c.total; }
      (o.pay || []).forEach(p => { if (p.d === iso) { if (p.m === 'upi') s.upi += n0(num(p.a)); else s.cash += n0(num(p.a)); } });
      if ((o.st === 'open' || o.st === 'ready') && o.due === iso) s.dueToday++;
      if (isOverdue(o, iso)) s.overdue++;
      if (o.st === 'ready') s.readyWaiting++;
      if (o.st !== 'done' && c.bal > 0.004) s.toCollect += c.bal;
    });
    ['pcs', 'billed', 'cash', 'upi', 'toCollect'].forEach(k => { s[k] = round2(s[k]); });
    return s;
  }
  const ST_LABEL = { open: ['வேலையில் உள்ளது', 'In progress'], ready: ['தயார்', 'Ready'], done: ['கொடுத்தாயிற்று', 'Delivered'], cancel: ['ரத்து', 'Cancelled'] };
  function ordersCsv(orders) {
    const rows = [['Token', 'Date', 'Customer', 'Phone', 'Items', 'Pieces/qty', 'Total', 'Paid', 'Balance', 'Due date', 'Status']];
    (orders || []).forEach(o => { const c = orderCalc(o); rows.push([o.tok, o.d, (o.c || {}).n || '', (o.c || {}).ph || '', itemSummary(o, true), c.pcs, c.total, c.paid, c.bal, o.due || '', (ST_LABEL[o.st] || ['', o.st])[1]]); });
    return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  }

  // --- quick bill from a WhatsApp order ("thakali 2 kg, vendaka 250 gm, puthina 10 rs")
  // [id, Tamil, English, base unit, aliases (Tanglish / English / Tamil variants)]; prices are never preset
  const GOODS = [
    // vegetables
    ['tomato', 'தக்காளி', 'Tomato', 'kg', 'thakkali thakali takkali tomato tomatoes தக்காலி'],
    ['onion', 'பெரிய வெங்காயம்', 'Onion (big)', 'kg', 'vengayam vengaayam venkayam onion onions periya vengayam bellary pallari பல்லாரி வெங்காயம்'],
    ['sonion', 'சின்ன வெங்காயம்', 'Small onion', 'kg', 'chinna vengayam sinna vengayam small onion sambar onion shallot சாம்பார் வெங்காயம்'],
    ['potato', 'உருளைக்கிழங்கு', 'Potato', 'kg', 'urulai urulaikizhangu urulai kilangu urulaikilangu potato potatoes aloo alu உருளை'],
    ['brinjal', 'கத்தரிக்காய்', 'Brinjal', 'kg', 'kathirikai kathrikai kathirikkai kathrikka brinjal eggplant கத்திரிக்காய் கத்திரி'],
    ['okra', 'வெண்டைக்காய்', 'Ladies finger', 'kg', 'vendakkai vendakai vendaka vendakka vendai bhindi ladies finger ladiesfinger okra வெண்டை'],
    ['snakegourd', 'புடலங்காய்', 'Snake gourd', 'kg', 'pudalangai podalangai podalanga pudalanga pudalankai snake gourd snakegourd புடலை'],
    ['bittergourd', 'பாகற்காய்', 'Bitter gourd', 'kg', 'pavakkai pavakai pagarkai paagarkai bitter gourd bittergourd karela பாவக்காய்'],
    ['bottlegourd', 'சுரைக்காய்', 'Bottle gourd', 'kg', 'suraikai suraikkai suraikka sorakkai bottle gourd lauki'],
    ['ridgegourd', 'பீர்க்கங்காய்', 'Ridge gourd', 'kg', 'peerkangai peerkankai peerkanga ridge gourd'],
    ['ashgourd', 'வெள்ளைப் பூசணி', 'Ash gourd', 'kg', 'vellai poosani poosani poosanikai ash gourd ashgourd neer poosani வெண்பூசணி பூசணிக்காய்'],
    ['pumpkin', 'பரங்கிக்காய்', 'Pumpkin', 'kg', 'parangikai parangikkai manjal poosani pumpkin மஞ்சள் பூசணி'],
    ['drumstick', 'முருங்கைக்காய்', 'Drumstick', 'pc', 'murungakkai murungaikai murungakai murunga drumstick drumsticks முருங்கை'],
    ['carrot', 'கேரட்', 'Carrot', 'kg', 'carrot carrots karat kerat'],
    ['beans', 'பீன்ஸ்', 'Beans', 'kg', 'beans beens french beans'],
    ['beetroot', 'பீட்ரூட்', 'Beetroot', 'kg', 'beetroot beet root beet'],
    ['cabbage', 'முட்டைக்கோஸ்', 'Cabbage', 'kg', 'muttaikose muttaikos muttakose cabbage kose கோஸ்'],
    ['cauliflower', 'காலிஃபிளவர்', 'Cauliflower', 'pc', 'cauliflower cauli gobi gobhi caulifower காலிபிளவர்'],
    ['cucumber', 'வெள்ளரிக்காய்', 'Cucumber', 'kg', 'vellarikai vellarikkai vellari cucumber'],
    ['gchilli', 'பச்சை மிளகாய்', 'Green chilli', 'kg', 'pachai milagai pachamilagai pachai molagai green chilli green chillies chilli chillies milagai molagai மிளகாய்'],
    ['ginger', 'இஞ்சி', 'Ginger', 'kg', 'inji ginger'],
    ['garlic', 'பூண்டு', 'Garlic', 'kg', 'poondu pundu garlic vellai poondu'],
    ['rawbanana', 'வாழைக்காய்', 'Raw banana', 'pc', 'vazhakkai valakkai vazhaikai valaikai raw banana plantain'],
    ['bananaflower', 'வாழைப்பூ', 'Banana flower', 'pc', 'vazhaipoo valaipoo vazhai poo banana flower'],
    ['bananastem', 'வாழைத்தண்டு', 'Banana stem', 'pc', 'vazhaithandu valaithandu vazhai thandu banana stem'],
    ['broadbeans', 'அவரைக்காய்', 'Broad beans', 'kg', 'avarakkai avaraikai avarai avarakai broad beans'],
    ['clusterbeans', 'கொத்தவரங்காய்', 'Cluster beans', 'kg', 'kothavarangai kothavaranga kothavarai cluster beans'],
    ['chowchow', 'சௌசௌ', 'Chow chow', 'kg', 'chow chow chowchow chayote sow sow'],
    ['radish', 'முள்ளங்கி', 'Radish', 'kg', 'mullangi mulangi radish'],
    ['yam', 'சேனைக்கிழங்கு', 'Yam', 'kg', 'senai senaikizhangu senai kilangu yam elephant yam'],
    ['colocasia', 'சேப்பங்கிழங்கு', 'Colocasia', 'kg', 'seppankizhangu seppan kilangu seppankilangu arbi colocasia'],
    ['sweetpotato', 'சர்க்கரைவள்ளிக்கிழங்கு', 'Sweet potato', 'kg', 'sakkaravalli sakkaravalli kilangu sweet potato'],
    ['tapioca', 'மரவள்ளிக்கிழங்கு', 'Tapioca', 'kg', 'maravalli maravalli kilangu tapioca kappa'],
    ['capsicum', 'குடைமிளகாய்', 'Capsicum', 'kg', 'kudaimilagai kudai milagai capsicum bell pepper'],
    ['peas', 'பச்சைப் பட்டாணி', 'Green peas', 'kg', 'pattani green peas peas பட்டாணி'],
    ['mushroom', 'காளான்', 'Mushroom', 'pc', 'kalan kaalan mushroom mushrooms'],
    ['lemon', 'எலுமிச்சை', 'Lemon', 'pc', 'elumichai elumichampazham lemon lemons lime எலுமிச்சம்பழம்'],
    ['coconut', 'தேங்காய்', 'Coconut', 'pc', 'thengai thenga thengaai coconut coconuts'],
    ['rawmango', 'மாங்காய்', 'Raw mango', 'kg', 'mangai maangai raw mango'],
    ['corn', 'மக்காச்சோளம்', 'Sweet corn', 'pc', 'makkacholam solam corn sweet corn சோளம்'],
    // greens (bunch)
    ['coriander', 'கொத்தமல்லி', 'Coriander', 'bunch', 'kothamalli kothamali kotthamalli malli coriander cilantro மல்லி இலை'],
    ['mint', 'புதினா', 'Mint', 'bunch', 'puthina pudina pudhina mint'],
    ['curryleaf', 'கறிவேப்பிலை', 'Curry leaves', 'bunch', 'karuveppilai kariveppilai karivepilai karuvepilai curry leaves curryleaves கருவேப்பிலை'],
    ['keerai', 'கீரை', 'Greens', 'bunch', 'keerai kirai greens spinach'],
    ['araikeerai', 'அரைக்கீரை', 'Arai keerai', 'bunch', 'arai keerai araikeerai'],
    ['mulaikeerai', 'முளைக்கீரை', 'Mulai keerai', 'bunch', 'mulai keerai mulaikeerai amaranth'],
    ['sirukeerai', 'சிறுகீரை', 'Siru keerai', 'bunch', 'siru keerai sirukeerai'],
    ['palak', 'பாலக் கீரை', 'Palak', 'bunch', 'palak palak keerai'],
    ['murungaikeerai', 'முருங்கைக்கீரை', 'Drumstick leaves', 'bunch', 'murungai keerai murungaikeerai drumstick leaves moringa'],
    ['agathi', 'அகத்திக்கீரை', 'Agathi keerai', 'bunch', 'agathi keerai agathikeerai agathi'],
    ['venthayakeerai', 'வெந்தயக்கீரை', 'Fenugreek leaves', 'bunch', 'venthaya keerai vendhaya keerai methi fenugreek leaves'],
    ['ponnanganni', 'பொன்னாங்கண்ணி', 'Ponnanganni', 'bunch', 'ponnanganni ponnanganni keerai'],
    ['manathakkali', 'மணத்தக்காளிக் கீரை', 'Manathakkali keerai', 'bunch', 'manathakkali keerai manathakali'],
    // fruits
    ['banana', 'வாழைப்பழம்', 'Banana', 'dozen', 'vazhaipazham valaipazham vazhapazham banana bananas pazham பழம்'],
    ['apple', 'ஆப்பிள்', 'Apple', 'kg', 'apple apples'],
    ['orange', 'ஆரஞ்சு', 'Orange', 'kg', 'orange oranges'],
    ['mosambi', 'சாத்துக்குடி', 'Mosambi', 'kg', 'sathukudi sathukkudi mosambi sweet lime'],
    ['grapes', 'திராட்சை', 'Grapes', 'kg', 'thiratchai thratchai grapes'],
    ['pomegranate', 'மாதுளை', 'Pomegranate', 'kg', 'mathulai madhulai pomegranate'],
    ['papaya', 'பப்பாளி', 'Papaya', 'pc', 'pappali papaya'],
    ['guava', 'கொய்யா', 'Guava', 'kg', 'koyya koiya guava'],
    ['watermelon', 'தர்பூசணி', 'Watermelon', 'kg', 'tharpoosani tharbusani watermelon'],
    ['pineapple', 'அன்னாசி', 'Pineapple', 'pc', 'annasi annachi pineapple'],
    ['mango', 'மாம்பழம்', 'Mango', 'kg', 'mampazham maambazham mango mangoes'],
    ['sapota', 'சப்போட்டா', 'Sapota', 'kg', 'sapota chikoo chiku'],
    // grocery
    ['rice', 'அரிசி', 'Rice', 'kg', 'arisi rice ponni arisi'],
    ['toordal', 'துவரம் பருப்பு', 'Toor dal', 'kg', 'thuvaram paruppu thuvaram paruppu toor dal dal paruppu பருப்பு'],
    ['moongdal', 'பாசிப் பருப்பு', 'Moong dal', 'kg', 'pasi paruppu paasi paruppu moong dal pasiparuppu'],
    ['uraddal', 'உளுத்தம் பருப்பு', 'Urad dal', 'kg', 'ulundu ulutham paruppu urad dal uzhunthu'],
    ['chanadal', 'கடலைப் பருப்பு', 'Chana dal', 'kg', 'kadalai paruppu chana dal kadalaparuppu'],
    ['sugar', 'சர்க்கரை', 'Sugar', 'kg', 'sakkarai seeni sugar சீனி'],
    ['salt', 'உப்பு', 'Salt', 'pc', 'uppu salt'],
    ['atta', 'கோதுமை மாவு', 'Wheat flour', 'kg', 'gothumai mavu kothumai maavu atta wheat flour'],
    ['rava', 'ரவை', 'Rava', 'kg', 'ravai rava sooji semolina'],
    ['maida', 'மைதா', 'Maida', 'kg', 'maida maidha'],
    ['gingellyoil', 'நல்லெண்ணெய்', 'Gingelly oil', 'l', 'nallennai nallenai gingelly oil sesame oil'],
    ['groundnutoil', 'கடலை எண்ணெய்', 'Groundnut oil', 'l', 'kadalai ennai kadalennai groundnut oil'],
    ['sunfloweroil', 'சூரியகாந்தி எண்ணெய்', 'Sunflower oil', 'l', 'sunflower oil refined oil'],
    ['coconutoil', 'தேங்காய் எண்ணெய்', 'Coconut oil', 'l', 'thengai ennai coconut oil'],
    ['tamarind', 'புளி', 'Tamarind', 'kg', 'puli tamarind'],
    ['jaggery', 'வெல்லம்', 'Jaggery', 'kg', 'vellam jaggery'],
    ['milk', 'பால்', 'Milk', 'l', 'paal pal milk'],
    ['curd', 'தயிர்', 'Curd', 'pc', 'thayir curd'],
    ['egg', 'முட்டை', 'Egg', 'pc', 'muttai egg eggs'],
    ['bread', 'பிரட்', 'Bread', 'pc', 'bread'],
    ['teapowder', 'டீ தூள்', 'Tea powder', 'pc', 'tea powder tea thool tea'],
    ['coffeepowder', 'காபி தூள்', 'Coffee powder', 'pc', 'coffee powder coffee thool coffee'],
    ['mustard', 'கடுகு', 'Mustard', 'kg', 'kadugu mustard'],
    ['cumin', 'சீரகம்', 'Cumin', 'kg', 'seeragam jeeragam jeera cumin'],
    ['pepper', 'மிளகு', 'Pepper', 'kg', 'milagu pepper'],
    ['drychilli', 'காய்ந்த மிளகாய்', 'Dry red chilli', 'kg', 'vara milagai kaintha milagai dry chilli red chilli வர மிளகாய்'],
    ['turmeric', 'மஞ்சள் தூள்', 'Turmeric powder', 'pc', 'manjal thool manjal podi turmeric'],
    ['chillipowder', 'மிளகாய்த் தூள்', 'Chilli powder', 'pc', 'milagai thool milagai podi chilli powder'],
    // flowers
    ['jasmine', 'மல்லிகைப் பூ', 'Jasmine', 'muzham', 'malli poo mallipoo malligai poo malligai jasmine மல்லிகை மல்லிப்பூ மல்லிகைப்பூ'],
    ['mullai', 'முல்லைப் பூ', 'Mullai', 'muzham', 'mullai poo mullaipoo mullai முல்லை'],
    ['kanakambaram', 'கனகாம்பரம்', 'Kanakambaram', 'muzham', 'kanakambaram kanagambaram'],
    ['rose', 'ரோஜா', 'Rose', 'pc', 'roja rose roses'],
    ['samanthi', 'சாமந்திப் பூ', 'Chrysanthemum', 'kg', 'samanthi sevanthi chrysanthemum சாமந்தி சேவந்தி'],
    // meat & fish
    ['chicken', 'கோழிக்கறி', 'Chicken', 'kg', 'chicken kozhi kozhikari kozhi kari koli சிக்கன்'],
    ['mutton', 'ஆட்டுக்கறி', 'Mutton', 'kg', 'mutton aattukari attukari aatu kari மட்டன்'],
    ['fish', 'மீன்', 'Fish', 'kg', 'meen fish'],
    ['prawn', 'இறால்', 'Prawn', 'kg', 'iral eral prawn prawns shrimp']
  ];
  const UNIT_WORDS = {
    kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kl', 'கிலோ', 'கி.கி', 'கிகி'],
    g: ['g', 'gm', 'gms', 'gram', 'grams', 'grm', 'grms', 'gr', 'கிராம்', 'கி'],
    l: ['l', 'ltr', 'ltrs', 'lit', 'litre', 'litres', 'liter', 'liters', 'லிட்டர்', 'லி'],
    ml: ['ml', 'mls', 'மிலி', 'மி.லி'],
    pc: ['pc', 'pcs', 'piece', 'pieces', 'no', 'nos', 'number', 'numbers', 'packet', 'packets', 'pkt', 'pkts', 'pack', 'எண்ணம்', 'எண்', 'பாக்கெட்', 'காய்'],
    bunch: ['bunch', 'bunches', 'kattu', 'kaddu', 'katu', 'கட்டு', 'கட்டுகள்'],
    dozen: ['dozen', 'dozens', 'doz', 'dz', 'டஜன்'],
    muzham: ['muzham', 'mulam', 'mozham', 'muzam', 'mulum', 'முழம்'],
    rs: ['rs', 'rs.', 'rupees', 'rupee', 'rupa', 'roopa', 'ruba', 'inr', 'ரூ', 'ரூ.', 'ரூபாய்', 'ரூபாய்க்கு', '₹']
  };
  const NUM_WORDS = { oru: 1, onnu: 1, one: 1, ஒரு: 1, ஒன்று: 1, ஒன்னு: 1, rendu: 2, irandu: 2, two: 2, இரண்டு: 2, ரெண்டு: 2, moonu: 3, munu: 3, three: 3, மூன்று: 3, மூணு: 3, naalu: 4, nalu: 4, four: 4, நான்கு: 4, நாலு: 4, anju: 5, five: 5, ஐந்து: 5, அஞ்சு: 5, aaru: 6, six: 6, ஆறு: 6, pathu: 10, ten: 10, பத்து: 10,
    arai: 0.5, ara: 0.5, half: 0.5, அரை: 0.5, kaal: 0.25, quarter: 0.25, கால்: 0.25, mukkal: 0.75, முக்கால்: 0.75, onnara: 1.5, onnarai: 1.5, ஒன்றரை: 1.5, ஒன்னரை: 1.5 };
  const STOP = new Set(['venum', 'vendum', 'veenum', 'please', 'pls', 'plz', 'and', 'ku', 'kku', 'kum', 'mattum', 'vena', 'also', 'அப்புறம்', 'வேண்டும்', 'வேணும்', 'மட்டும்', 'and', 'with', 'of', 'the', 'a', 'kudunga', 'anupunga', 'anuppunga', 'கொடுங்க', 'அனுப்புங்க', 'அனுப்பவும்', 'சார்', 'sir', 'anna', 'அண்ணா', 'hi', 'hello', 'வணக்கம்']);
  const unitOf = w => { w = String(w).toLowerCase().replace(/\.$/, ''); for (const u in UNIT_WORDS) if (UNIT_WORDS[u].indexOf(w) >= 0 || UNIT_WORDS[u].indexOf(w + '.') >= 0) return u; return null; };
  function phon(s) { // loose Tanglish key: thakkali / thakali / takkali → takali
    s = String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    s = s.replace(/zh/g, 'l').replace(/sh/g, 's').replace(/th/g, 't').replace(/dh/g, 'd').replace(/ph/g, 'p').replace(/bh/g, 'b').replace(/kh/g, 'k').replace(/ch/g, 's').replace(/w/g, 'v').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a').replace(/y$/, 'i');
    return s.replace(/(.)\1+/g, '$1');
  }
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (x, i) => i);
    for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[b.length];
  }
  const GENERIC = new Set(['poo', 'oil', 'powder', 'thool', 'podi', 'ennai', 'mavu', 'kari', 'leaves', 'kilangu', 'kizhangu', 'root', 'flour', 'green', 'red', 'big', 'small', 'raw', 'sweet', 'dry', 'white', 'periya', 'chinna', 'sinna', 'vellai', 'manjal', 'pachai', 'neer', 'french', 'bell', 'elephant', 'refined', 'ponni', 'thandu'].map(phon)); // too general to name an item alone
  const tamilKey = s => String(s || '').replace(/[\s‌‍.]/g, '');
  let goodsIndex = null;
  function buildIndex() { // every Tamil name, English name, alias word and 2–3 word alias phrase
    const idx = [];
    GOODS.forEach(g => {
      const ws = String(g[4] || '').split(' ').filter(Boolean), phrases = [g[1], g[2]].concat(ws);
      for (let i = 0; i < ws.length - 1; i++) { phrases.push(ws[i] + ' ' + ws[i + 1]); if (i < ws.length - 2) phrases.push(ws[i] + ' ' + ws[i + 1] + ' ' + ws[i + 2]); }
      phrases.forEach((p, i) => { if (/[\u0B80-\u0BFF]/.test(p)) idx.push({ id: g[0], t: tamilKey(p), ta: true }); else { const k = phon(p); if (k.length >= 2 && (i < 2 || p.indexOf(' ') > 0 || !GENERIC.has(k))) idx.push({ id: g[0], t: k, ta: false, words: p.split(' ').length, pri: i < 2 ? 1 : 0 }); } });
    });
    return idx;
  }
  function matchGoods(name) { const m = matchName(name); return m ? m.id : null; }
  function matchName(name) { // whole phrase first, then the longest run of words that matches ("Like thakali" → thakali)
    const w = String(name || '').trim().split(/\s+/).filter(Boolean); if (!w.length) return null;
    for (let len = w.length; len >= 1; len--) {
      let best = null;
      for (let i = 0; i + len <= w.length; i++) { const r = matchOne(w.slice(i, i + len).join(' ')); if (r && (!best || r.s < best.s)) best = r; }
      if (best) return { id: best.id, exact: best.s === 0 && len === w.length, s: best.s };
    }
    return null;
  }
  function matchOne(name) {
    const idx = goodsIndex = goodsIndex || buildIndex();
    const raw = String(name || '').trim(); if (!raw) return null;
    if (/[஀-௿]/.test(raw)) {
      const k = tamilKey(raw); let best = null;
      idx.forEach(e => { if (!e.ta) return; if (e.t === k) best = best && best.s === 0 ? best : { id: e.id, s: 0 }; else if ((k.indexOf(e.t) === 0 || e.t.indexOf(k) === 0) && Math.min(k.length, e.t.length) >= 3) { const s = Math.abs(k.length - e.t.length) + 1; if (!best || s < best.s) best = { id: e.id, s: s }; } });
      return best;
    }
    const k = phon(raw); if (k.length < 2) return null;
    let best = null;
    idx.forEach(e => {
      if (e.ta) return;
      let s;
      if (e.t === k) s = 0;
      else { const d = lev(k, e.t), lim = k.length <= 3 ? 0 : k.length <= 5 ? 1 : k.length <= 8 ? 2 : 3; if (d <= lim) s = d + 0.5; else if (k.length >= 5 && (e.t.indexOf(k) === 0 || k.indexOf(e.t) === 0) && e.t.length >= 5) s = 2 + Math.abs(k.length - e.t.length) / 10; }
      if (s != null && (!best || s < best.s || (s === best.s && ((e.pri || 0) > (best.p || 0) || ((e.pri || 0) === (best.p || 0) && (e.words || 1) > (best.w || 1)))))) best = { id: e.id, s: s, w: e.words, p: e.pri };
    });
    return best;
  }
  const goodsById = id => GOODS.find(g => g[0] === id) || null;
  function toNum(tok) {
    let t = String(tok).replace(/[௦-௯]/g, c => String('௦௧௨௩௪௫௬௭௮௯'.indexOf(c))).replace(/½/g, '.5').replace(/¼/g, '.25').replace(/¾/g, '.75');
    if (/^\d+\/\d+$/.test(t)) { const p = t.split('/'); return +p[1] ? +p[0] / +p[1] : NaN; }
    if (/^\d*\.?\d+$/.test(t)) return parseFloat(t);
    const w = t.toLowerCase(); return Object.prototype.hasOwnProperty.call(NUM_WORDS, w) ? NUM_WORDS[w] : NaN;
  }
  function parseOrder(text) { // → [{ name, qty, unit, raw }]
    const out = [];
    String(text || '').replace(/\r/g, '').split(/\n|,|;|،|\|/).forEach(seg => {
      seg = seg.replace(/^\s*(\d+[.)]|[-*•●▪➤✔️✅]+)\s+/, '').replace(/[()]/g, ' ').trim(); if (!seg) return;
      // split glued number+unit ("2kg", "250gm", "rs10", "₹10") and unit+number
      const toks = seg.replace(/(\d)([a-zA-Z஀-௿₹])/g, '$1 $2').replace(/([a-zA-Z₹.])(\d)/g, '$1 $2').replace(/₹/g, ' ₹ ').split(/\s+/).filter(Boolean);
      let cur = { name: [], qty: null, unit: null }, rsNext = false;
      const push = () => { const n = cur.name.join(' ').trim(); if (n || cur.qty != null) out.push({ name: n, qty: cur.qty, unit: cur.unit, raw: seg }); cur = { name: [], qty: null, unit: null }; };
      for (let i = 0; i < toks.length; i++) {
        const tk = toks[i], low = tk.toLowerCase(), n = toNum(tk), u = unitOf(tk);
        if (!isNaN(n) && !(NUM_WORDS[low] != null && cur.qty != null && !cur.unit && cur.name.length)) {
          if (cur.qty != null && cur.name.length) push();
          if (cur.qty != null && !cur.name.length) cur.qty = round2(cur.qty + n); // "1 1/2" style or "oru arai"
          else cur.qty = n;
          if (rsNext) { cur.unit = 'rs'; rsNext = false; }
          continue;
        }
        if (u) {
          if (u === 'rs' && cur.qty == null) { rsNext = true; continue; }
          if (cur.qty != null && !cur.unit) { cur.unit = u; continue; }
          if (cur.qty == null) { cur.unit = u; cur.qty = 1; continue; } // "kilo thakkali"
          continue;
        }
        if (STOP.has(low)) continue;
        if (cur.qty != null && cur.name.length) push();
        cur.name.push(tk);
      }
      push();
    });
    return out.filter(x => x.name || x.qty);
  }
  const UNIT_LABEL = { muzham: ['முழம்', 'muzham'], kg: ['கிலோ', 'kg'], g: ['கிராம்', 'g'], l: ['லிட்டர்', 'L'], ml: ['மி.லி', 'ml'], pc: ['எண்ணம்', 'pc'], bunch: ['கட்டு', 'bunch'], dozen: ['டஜன்', 'dozen'], rs: ['ரூபாய்க்கு', '₹ worth'] };
  const RATE_UNIT = { muzham: 'muzham', kg: 'kg', g: 'kg', l: 'l', ml: 'l', pc: 'pc', bunch: 'bunch', dozen: 'dozen', rs: null };
  function qbLine(l) { // amount of one bill line; rate is per base unit (per kg / per litre / per piece / per bunch / per dozen)
    const q = n0(num(l.qty)), r = n0(num(l.rate));
    if (l.unit === 'rs') return round2(q);
    const mult = l.unit === 'g' || l.unit === 'ml' ? q / 1000 : q;
    return round2(mult * r);
  }
  function qbTotals(b) {
    const sub = round2((b.lines || []).reduce((a, l) => a + qbLine(l), 0));
    const del = round2(n0(num(b.delivery))), dis = round2(n0(num(b.discount)));
    let total = round2(Math.max(0, sub + del - dis)); const exact = total;
    if (b.roundOff) total = Math.round(total);
    return { sub: sub, del: del, dis: dis, total: total, roundOff: round2(total - exact) };
  }
  function validVpa(v) { return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,63}$/.test(String(v || '').trim()); }
  function upiString(o) { // NPCI UPI deep link; the payee address is kept unescaped (validated characters only)
    const p = ['pa=' + String(o.pa).trim()];
    if (o.pn) p.push('pn=' + encodeURIComponent(String(o.pn).trim().slice(0, 50)));
    if (n0(o.am) > 0) p.push('am=' + n0(o.am).toFixed(2));
    p.push('cu=INR');
    if (o.tn) p.push('tn=' + encodeURIComponent(String(o.tn).trim().slice(0, 50)));
    return 'upi://pay?' + p.join('&');
  }
  function payLink(o) { // our static page; everything after # stays in the phone (never sent to a server)
    const q = [['pa', o.pa], ['pn', o.pn], ['am', n0(o.am).toFixed(2)], ['tn', o.tn], ['s', o.shop], ['b', o.bill], ['ph', waNumber(o.phone)]].filter(x => x[1] != null && String(x[1]) !== '').map(x => x[0] + '=' + encodeURIComponent(String(x[1])));
    return (o.base || 'https://pdftoolsindia.com') + '/pay#' + q.join('&');
  }

  window.BizCore = {
    num: num, inr: inr, balanceOf: balanceOf, khataTotals: khataTotals, khataCsv: khataCsv,
    timberCft: timberCft, roundLogCft: roundLogCft, sheetsNeeded: sheetsNeeded, ftInToCm: ftInToCm, cmToFtIn: cmToFtIn,
    tripBill: tripBill, tripFare: tripFare, cutListCft: cutListCft, cutListCost: cutListCost, priceFromCost: priceFromCost, priceFromMarkup: priceFromMarkup, profitOf: profitOf, withGst: withGst, withoutGst: withoutGst, breakEven: breakEven,
    waNumber: waNumber, waLink: waLink, fillTemplate: fillTemplate, graphemes: graphemes, mmToPx: mmToPx, nextToken: nextToken, MESSAGES: MESSAGES, PRESETS: PRESETS,
    TRADES: TRADES, MEASURES: MEASURES, addDaysIso: addDaysIso, lineAmt: lineAmt, orderCalc: orderCalc, itemSummary: itemSummary, isOverdue: isOverdue, dayStats: dayStats, ordersCsv: ordersCsv,
    GOODS: GOODS, phon: phon, lev: lev, matchGoods: matchGoods, matchName: matchName, parseOrder: parseOrder, qbLine: qbLine, qbTotals: qbTotals, validVpa: validVpa, upiString: upiString, payLink: payLink
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
  .bz-ol{border:1.5px solid var(--line);border-radius:14px;padding:10px;background:#fff;display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .bz-ol .full{grid-column:1/-1}.bz-ol input,.bz-ol select{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:12px;padding:6px 10px;font-size:16px;font-family:inherit;background:#fff;color:var(--ink)}
        .bz-qty{display:grid;grid-template-columns:44px 1fr 44px;gap:6px}.bz-qty button{min-height:44px;border:0;border-radius:12px;background:var(--chip);font-size:22px;font-weight:900;cursor:pointer;color:var(--ink)}
        .bz-ol .amt{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:900}
        .bz-badge{display:inline-block;min-width:22px;padding:0 6px;border-radius:11px;background:var(--brand);color:#fff;font-size:12px;line-height:22px;text-align:center;margin-left:6px}
        .bz-card{border:1.5px solid var(--line);border-radius:14px;background:#fff;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;font-family:inherit;font-size:14.5px;color:var(--ink);cursor:pointer}
        .bz-card b{font-size:15.5px}.bz-card small{display:block;color:var(--sub);font-weight:600;margin-top:2px}
        .bz-st{display:inline-block;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:800;background:var(--chip)}.bz-st.ready{background:#E3F6EC;color:#176B45}.bz-st.done{background:#EEF0F3;color:#566070}.bz-st.late{background:#FDEDEC;color:#9B2C20}
        .bz-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.bz-stat{border:1.5px solid var(--line);border-radius:14px;padding:12px;background:#fff}.bz-stat b{display:block;font-size:22px}.bz-stat span{font-size:12.5px;color:var(--sub);font-weight:700}
        .bz-det{border:1.5px solid var(--line);border-radius:14px;background:#fff;margin-top:8px}.bz-det summary{padding:12px 14px;font-weight:800;cursor:pointer;min-height:44px}.bz-det .in{padding:0 14px 12px}
        .bz-chk2{display:flex;flex-wrap:wrap;gap:8px}.bz-chk2 label{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:12px;padding:6px 10px;min-height:44px;font-size:14px;font-weight:700}
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
  window.BizUI = { T: T, isEn: isEn, esc: esc, $: $, $$: $$, lsGet: lsGet, lsSet: lsSet, uid: uid, makeRoot: makeRoot, purpose: purpose, field: field, textField: textField, selectField: selectField, tabs: tabs, table: table, resCard: resCard, bindInputs: bindInputs, copyText: copyText, saveCanvas: saveCanvas, shareCanvas: shareCanvas, waBtn: waBtn, fitFont: fitFont, wrapText: wrapText, FONT: FONT, todayIso: todayIso, dmy: dmy, inr: inr, fmtNum: fmtNum, num: num, n0: n0, round2: round2, csvCell: csvCell, waLink: waLink, waNumber: waNumber, addDaysIso: addDaysIso };

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
        if (!Array.isArray(S.rows) || !S.rows.length) S.rows = [{ nm: '', len: S.len || '', wid: S.wid || '', thk: S.thk || '', qty: S.qty || '1' }];
        if (S.tab === 'timber') {
          pane.innerHTML = '<div class="bz-info">' + T('கதவு, ஜன்னல், கட்டில் — ஒவ்வொரு அளவுக்கும் ஒரு வரி (நீளம் அடி × அகலம் அங் × கனம் அங் × எண்ணிக்கை). மொத்த cft கீழே.', 'One row per size (length ft × width in × thickness in × pieces). Total cft below.') + '</div>' +
            S.rows.map((r, i) => '<div class="bz-ol" style="margin-top:8px"><input class="full" type="text" data-ri="' + i + '" data-rf="nm" value="' + esc(r.nm || '') + '" placeholder="' + esc(T('எதற்கு (எ.கா. கதவு சட்டம்)', 'For (e.g. door frame)')) + '">' +
              ['len', 'wid', 'thk', 'qty'].map(f => '<div class="bz-f" style="margin:0"><label>' + { len: T('நீளம் (அடி)', 'Length (ft)'), wid: T('அகலம் (அங்)', 'Width (in)'), thk: T('கனம் (அங்)', 'Thick (in)'), qty: T('எண்ணிக்கை', 'Pieces') }[f] + '</label><input type="text" inputmode="decimal" data-ri="' + i + '" data-rf="' + f + '" value="' + esc(r[f] || '') + '"></div>').join('') +
              '<div class="amt full"><span data-rcft="' + i + '">' + fmtNum(timberCft(num(r.len), num(r.wid), num(r.thk), num(r.qty) || 1), 3) + ' cft</span><button type="button" class="bz-x" data-rrm="' + i + '" aria-label="remove">✕</button></div></div>').join('') +
            '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="addr">➕ ' + T('வரி சேர்', 'Add row') + '</button></div><div class="bz-grid one">' + field(T('1 cft விலை (₹)', 'Rate per cft (₹)'), 'rate', S.rate) + '</div>';
          $$(pane, '[data-rf]').forEach(inp => inp.addEventListener('input', () => { const i = +inp.getAttribute('data-ri'), r = S.rows[i]; r[inp.getAttribute('data-rf')] = inp.value; lsSet(KEY, S); const sp = $(pane, '[data-rcft="' + i + '"]'); if (sp) sp.textContent = fmtNum(timberCft(num(r.len), num(r.wid), num(r.thk), num(r.qty) || 1), 3) + ' cft'; calc(); }));
          $$(pane, '[data-rrm]').forEach(b => { b.onclick = () => { S.rows.splice(+b.getAttribute('data-rrm'), 1); lsSet(KEY, S); draw(); }; });
          $(pane, '[data-act=addr]').onclick = () => { S.rows.push({ nm: '', len: '', wid: '', thk: '', qty: '1' }); lsSet(KEY, S); draw(); };
        }
        else if (S.tab === 'log') pane.innerHTML = '<div class="bz-grid">' + field(T('சுற்றளவு (அங்குலம்)', 'Girth (in)'), 'girth', S.girth) + field(T('நீளம் (அடி)', 'Length (ft)'), 'rlen', S.rlen) + '</div><div class="bz-grid one">' + field(T('1 cft விலை (₹)', 'Rate per cft (₹)'), 'rate', S.rate) + '</div>';
        else if (S.tab === 'ply') pane.innerHTML = '<div class="bz-grid">' + field(T('மொத்தப் பரப்பு (சதுர அடி)', 'Total area (sq.ft)'), 'area', S.area) + field(T('வீணாகும் % (வெட்டும்போது)', 'Wastage %'), 'waste', S.waste) + field(T('ஷீட் அகலம் (அடி)', 'Sheet width (ft)'), 'sw', S.sw) + field(T('ஷீட் நீளம் (அடி)', 'Sheet length (ft)'), 'sl', S.sl) + '</div><div class="bz-grid one">' + field(T('1 ஷீட் விலை (₹)', 'Price per sheet (₹)'), 'prate', S.prate) + '</div>';
        else pane.innerHTML = '<div class="bz-grid">' + field(T('அடி', 'Feet'), 'ft', S.ft) + field(T('அங்குலம்', 'Inches'), 'inch', S.inch) + '</div><div class="bz-grid one">' + field(T('அல்லது செ.மீ', 'or centimetres'), 'cm', S.cm) + '</div><div class="bz-grid">' + field(T('பரப்பு (சதுர அடி) — விலை கணக்கிட', 'Area (sq.ft) for costing'), 'ar', S.ar) + field(T('1 சதுர அடி விலை (₹)', 'Rate per sq.ft (₹)'), 'arate', S.arate) + '</div>';
        bindInputs(pane, (k, v) => { if (k == null) return; S[k] = v; lsSet(KEY, S); calc(); });
        calc();
      }
      function calc() {
        const out = $(root, '[data-k=out]'), P = k => num(S[k]);
        if (S.tab === 'timber') {
          const c = cutListCft(S.rows), r = P('rate');
          if (!(c > 0)) { out.innerHTML = '<div class="bz-info">' + T('நீளம், அகலம், கனம் எழுதுங்கள்.', 'Enter length, width and thickness.') + '</div>'; return; }
          const lines = S.rows.filter(x => num(x.len) > 0 && num(x.wid) > 0 && num(x.thk) > 0).map(x => [esc((x.nm || '').trim() || (x.len + "' × " + x.wid + '" × ' + x.thk + '"')) + ' × ' + esc(String(num(x.qty) || 1)), fmtNum(timberCft(num(x.len), num(x.wid), num(x.thk), num(x.qty) || 1), 3) + ' cft']);
          out.innerHTML = resCard(T('மொத்தம்', 'Total'), fmtNum(c, 3) + ' cft', r > 0 ? T('விலை ', 'Cost ') + inr(cutListCost(S.rows, r)) : '', 'ok') + table(lines.concat([[T('மொத்தம்', 'Total'), fmtNum(c, 3) + ' cft', true]]).concat(r > 0 ? [[T('விலை', 'Cost') + ' (' + inr(r) + ' / cft)', inr(cutListCost(S.rows, r)), true]] : [])) +
            '<div class="bz-info">' + T('சூத்திரம்: நீளம்(அடி) × அகலம்(அங்) × கனம்(அங்) ÷ 144 × எண்ணிக்கை.', 'Formula: length(ft) × width(in) × thickness(in) ÷ 144 × pieces.') + '</div>';
        } else if (S.tab === 'log') {
          const g = P('girth'), L = P('rlen'), r = P('rate');
          if (!(g > 0 && L > 0)) { out.innerHTML = '<div class="bz-info">' + T('சுற்றளவும் நீளமும் எழுதுங்கள்.', 'Enter girth and length.') + '</div>'; return; }
          const c = roundLogCft(g, L);
          out.innerHTML = resCard(T('மர அளவு', 'Log volume'), fmtNum(c, 3) + ' cft', r > 0 ? T('விலை ', 'Cost ') + inr(round2((g / 4) * (g / 4) * L / 144 * r)) : '', 'ok') + '<div class="bz-info">' + T('கால்-சுற்றளவு முறை: (சுற்றளவு ÷ 4)² × நீளம் ÷ 144. மரக்கடையில் அவர்கள் பயன்படுத்தும் முறையைச் சரிபார்த்துக்கொள்ளுங்கள்.', 'Quarter-girth rule: (girth ÷ 4)² × length ÷ 144. Check which rule your timber depot uses.') + '</div>';
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
      const root = makeRoot(body), KEY = 'bz_trip_v1', LOG = 'bz_triplog_v1';
      const S = Object.assign({ mode: 'km', owner: '', phone: '', veh: '', cust: '', cphone: '', route: '', date: todayIso(), startKm: '', endKm: '', days: '1', ratePerKm: '', minKmPerDay: '', hours: '', pkgHours: '8', pkgKm: '80', pkgPrice: '', extraHrRate: '', extraKmRate: '', fixedPrice: '', waitHours: '', waitRate: '', battaPerDay: '', toll: '', parking: '', permit: '', other: '', gstPct: '', advance: '' }, lsGet(KEY, {}));
      let log = lsGet(LOG, []); if (!Array.isArray(log)) log = [];
      let cv = null, flash = '', cur = null;
      function draw() {
        const M = S.mode;
        root.innerHTML = purpose('வாடகை வாகன ஓட்டுநர்களுக்கு: கி.மீ கணக்கு, உள்ளூர் பேக்கேஜ் (8 மணி / 80 கி.மீ போல), நிலையான கட்டணம் (ஏர்போர்ட், டிராப்) — காத்திருப்பு, பேட்டா, டோல் சேர்த்து பில்; பயணப் பதிவேட்டில் மாத மொத்தம்.',
          'For taxi and rental drivers: per-km trips, local packages (like 8 hr / 80 km), fixed fares (airport, drop) — with waiting, batta and toll; trip diary with monthly totals.') +
          tabs([['km', '🛣️ ' + T('கி.மீ கணக்கு', 'Per km')], ['local', '🕗 ' + T('உள்ளூர் பேக்கேஜ்', 'Local package')], ['fixed', '✈️ ' + T('நிலையான கட்டணம்', 'Fixed fare')], ['log', '📒 ' + T('பயணப் பதிவேடு', 'Trip diary') + (log.length ? ' (' + log.length + ')' : '')]], M) +
          (flash ? '<div class="bz-msg">' + esc(flash) + '</div>' : '') + '<div data-k="pane"></div>';
        $$(root, '[data-tab]').forEach(b => { b.onclick = () => { S.mode = b.getAttribute('data-tab'); flash = ''; lsSet(KEY, S); draw(); }; });
        const pane = $(root, '[data-k=pane]');
        if (M === 'log') return drawLog(pane);
        pane.innerHTML = '<div class="bz-grid">' + textField(T('உரிமையாளர் / ஓட்டுநர் பெயர்', 'Owner / driver'), 'owner', S.owner) + field(T('போன்', 'Phone'), 'phone', S.phone, { mode: 'tel' }) + textField(T('வாகன எண்', 'Vehicle no.'), 'veh', S.veh) + field(T('தேதி', 'Date'), 'date', S.date, { type: 'date', mode: 'text' }) + textField(T('வாடிக்கையாளர்', 'Customer'), 'cust', S.cust) + field(T('வாடிக்கையாளர் போன்', 'Customer phone'), 'cphone', S.cphone, { mode: 'tel' }) + '</div><div class="bz-grid one">' + textField(T('பயணம் (இருந்து — வரை)', 'Route (from — to)'), 'route', S.route) + '</div>' +
          (M === 'fixed' ? '<div class="bz-h">' + T('கட்டணம்', 'Fare') + '</div><div class="bz-grid">' + field(T('நிலையான கட்டணம் (₹)', 'Fixed fare (₹)'), 'fixedPrice', S.fixedPrice) + field(T('நாட்கள்', 'Days'), 'days', S.days) + '</div>'
            : '<div class="bz-h">' + T('ஓடிய தூரம்', 'Distance') + '</div><div class="bz-grid three">' + field(T('தொடக்க கி.மீ', 'Start km'), 'startKm', S.startKm) + field(T('முடிவு கி.மீ', 'End km'), 'endKm', S.endKm) + (M === 'km' ? field(T('நாட்கள்', 'Days'), 'days', S.days) : field(T('மொத்த மணி நேரம்', 'Total hours'), 'hours', S.hours)) + '</div>' +
              (M === 'km' ? '<div class="bz-h">' + T('கட்டண விகிதம்', 'Rates') + '</div><div class="bz-grid">' + field(T('1 கி.மீ (₹)', 'Per km (₹)'), 'ratePerKm', S.ratePerKm) + field(T('குறைந்தபட்ச கி.மீ / நாள்', 'Min km / day'), 'minKmPerDay', S.minKmPerDay) + '</div>'
                : '<div class="bz-h">' + T('பேக்கேஜ்', 'Package') + '</div><div class="bz-grid three">' + field(T('பேக்கேஜ் மணி', 'Package hours'), 'pkgHours', S.pkgHours) + field(T('பேக்கேஜ் கி.மீ', 'Package km'), 'pkgKm', S.pkgKm) + field(T('பேக்கேஜ் விலை (₹)', 'Package price (₹)'), 'pkgPrice', S.pkgPrice) + field(T('கூடுதல் மணி ₹', 'Extra hour ₹'), 'extraHrRate', S.extraHrRate) + field(T('கூடுதல் கி.மீ ₹', 'Extra km ₹'), 'extraKmRate', S.extraKmRate) + field(T('நாட்கள்', 'Days'), 'days', S.days) + '</div>')) +
          '<div class="bz-h">' + T('மற்ற கட்டணங்கள்', 'Other charges') + '</div><div class="bz-grid three">' + field(T('காத்திருப்பு (மணி)', 'Waiting (hours)'), 'waitHours', S.waitHours) + field(T('காத்திருப்பு ₹ / மணி', 'Waiting ₹ / hour'), 'waitRate', S.waitRate) + field(T('ஓட்டுநர் பேட்டா / நாள் (₹)', 'Driver batta / day'), 'battaPerDay', S.battaPerDay) + field('Toll (₹)', 'toll', S.toll) + field('Parking (₹)', 'parking', S.parking) + field(T('பர்மிட் / மாநில வரி (₹)', 'Permit / state tax (₹)'), 'permit', S.permit) + field(T('மற்றவை (₹)', 'Other (₹)'), 'other', S.other) + field('GST %', 'gstPct', S.gstPct) + field(T('முன்பணம் (₹)', 'Advance (₹)'), 'advance', S.advance) + '</div>' +
          '<div data-k="out"></div><canvas class="bz-canvas" data-k="cv" hidden></canvas><div class="bz-actions" data-k="acts" hidden>' +
          '<button type="button" class="bz-btn" data-act="dl">⬇️ ' + T('படம் (PNG)', 'Picture (PNG)') + '</button><button type="button" class="bz-btn sec" data-act="cp">📋 ' + T('செய்தி நகலெடு', 'Copy text') + '</button><a class="bz-btn green" data-k="wa" target="_blank" rel="noopener" href="#">💬 WhatsApp</a><button type="button" class="bz-btn sec" data-act="logit">📒 ' + T('பதிவேட்டில் சேர்', 'Save to diary') + '</button></div>' +
          '<div class="bz-info">' + T('GST, பர்மிட் விகிதங்களை நாங்கள் நிர்ணயிக்கவில்லை — உங்களுக்குப் பொருந்துவதை நீங்களே எழுதுங்கள்.', 'We do not set GST or permit rates — type what applies to you.') + '</div>';
        cv = $(pane, '[data-k=cv]');
        $(pane, '[data-act=dl]').onclick = () => saveCanvas(cv, 'trip-bill.png');
        $(pane, '[data-act=cp]').onclick = function () { if (cur) copyText(cur.txt, this); };
        $(pane, '[data-act=logit]').onclick = function () { if (!cur) return; const r = cur.r; log.push({ id: uid(), d: S.date || todayIso(), cust: S.cust, route: S.route, veh: S.veh, km: S.mode === 'fixed' ? 0 : r.km, total: r.total, adv: num(S.advance) || 0, paid: false }); lsSet(LOG, log); this.textContent = '✓ ' + T('சேர்க்கப்பட்டது', 'Saved'); };
        bindInputs(pane, (k, v) => { S[k] = v; lsSet(KEY, S); calc(); });
        calc();
      }
      function calc() {
        const out = $(root, '[data-k=out]'), acts = $(root, '[data-k=acts]'), P = k => num(S[k]) || 0, M = S.mode;
        const ready = M === 'fixed' ? P('fixedPrice') > 0 : M === 'local' ? P('pkgPrice') > 0 : (P('endKm') > P('startKm') || P('minKmPerDay') > 0) && P('ratePerKm') > 0;
        if (!ready) { out.innerHTML = '<div class="bz-info">' + (M === 'fixed' ? T('நிலையான கட்டணத்தை எழுதுங்கள்.', 'Enter the fixed fare.') : M === 'local' ? T('பேக்கேஜ் விலை, ஓடிய கி.மீ, மணி நேரம் எழுதுங்கள்.', 'Enter the package price, km and hours.') : T('தொடக்க, முடிவு கி.மீ மற்றும் ஒரு கி.மீ கட்டணத்தை எழுதுங்கள்.', 'Enter start km, end km and the rate per km.')) + '</div>'; cv.hidden = true; acts.hidden = true; cur = null; return; }
        const o = {}; Object.keys(S).forEach(k => { o[k] = k === 'mode' ? S.mode : P(k); });
        const r = tripFare(o), rows = [];
        if (M !== 'fixed') rows.push([T('ஓடிய தூரம்', 'Distance run'), fmtNum(r.km, 1) + ' km']);
        if (M === 'km') { rows.push([T('கட்டணம் செலுத்தும் தூரம்', 'Billable km') + (r.minApplied ? ' (' + T('குறைந்தபட்சம்', 'minimum') + ')' : ''), fmtNum(r.billKm, 1) + ' km']); rows.push([T('வாடகை', 'Fare') + ' (' + fmtNum(r.billKm, 1) + ' × ' + inr(P('ratePerKm')) + ')', inr(r.fare)]); }
        else if (M === 'local') { rows.push([T('பேக்கேஜ்', 'Package') + ' (' + fmtNum(P('pkgHours'), 1) + T(' மணி / ', ' hr / ') + fmtNum(P('pkgKm'), 0) + ' km)', inr(P('pkgPrice'))]); if (r.exHr) rows.push([T('கூடுதல் மணி', 'Extra hours') + ' (' + fmtNum(r.exHr, 2) + ' × ' + inr(P('extraHrRate')) + ')', inr(r.exHr * P('extraHrRate'))]); if (r.exKm) rows.push([T('கூடுதல் கி.மீ', 'Extra km') + ' (' + fmtNum(r.exKm, 1) + ' × ' + inr(P('extraKmRate')) + ')', inr(r.exKm * P('extraKmRate'))]); }
        else rows.push([T('நிலையான கட்டணம்', 'Fixed fare'), inr(r.fare)]);
        if (r.wait) rows.push([T('காத்திருப்பு', 'Waiting'), inr(r.wait)]); if (r.batta) rows.push([T('ஓட்டுநர் பேட்டா', 'Driver batta'), inr(r.batta)]); if (r.other) rows.push([T('டோல் / பார்க்கிங் / பர்மிட் / மற்றவை', 'Toll / parking / permit / other'), inr(r.other)]);
        if (r.tax) rows.push(['GST ' + fmtNum(P('gstPct'), 2) + '%', inr(r.tax)]);
        rows.push([T('மொத்தம்', 'Total'), inr(r.total), true]); if (P('advance')) { rows.push([T('முன்பணம்', 'Advance'), '− ' + inr(P('advance'))]); rows.push([T('செலுத்த வேண்டியது', 'Balance to pay'), inr(r.due), true]); }
        out.innerHTML = resCard(P('advance') ? T('செலுத்த வேண்டியது', 'Balance to pay') : T('மொத்தக் கட்டணம்', 'Total bill'), inr(P('advance') ? r.due : r.total), M === 'fixed' ? '' : fmtNum(r.km, 1) + ' km', 'ok') + table(rows);
        acts.hidden = false; cv.hidden = false; paintBill(rows);
        const txt = billText(rows); cur = { r: r, txt: txt };
        $(acts, '[data-k=wa]').href = waLink(S.cphone, txt);
        const lg = $(acts, '[data-act=logit]'); if (lg.textContent.indexOf('✓') === 0) lg.textContent = '📒 ' + T('பதிவேட்டில் சேர்', 'Save to diary');
      }
      function billText(rows) {
        const L = [(S.owner || 'Trip bill') + (S.phone ? ' · ' + S.phone : ''), (S.veh ? S.veh + ' · ' : '') + dmy(S.date)];
        if (S.cust) L.push(T('வாடிக்கையாளர்', 'Customer') + ': ' + S.cust); if (S.route) L.push(S.route);
        rows.forEach(r => L.push(String(r[0]).replace(/<[^>]+>/g, '') + ': ' + String(r[1]))); return L.join('\n');
      }
      function drawLog(pane) {
        const months = {};
        log.forEach(x => { const m = String(x.d || '').slice(0, 7); months[m] = months[m] || { n: 0, km: 0, total: 0, pend: 0 }; months[m].n++; months[m].km += n0(x.km); months[m].total += n0(x.total); if (!x.paid) months[m].pend += round2(n0(x.total) - n0(x.adv)); });
        const mk = Object.keys(months).sort().reverse();
        pane.innerHTML = (log.length ? '' : '<div class="bz-info">' + T('பில் போட்ட பிறகு "📒 பதிவேட்டில் சேர்" தட்டினால் இங்கே வரும்.', 'After making a bill, tap "📒 Save to diary" and it appears here.') + '</div>') +
          mk.map(m => table([[T('மாதம் ', 'Month ') + m, months[m].n + T(' பயணம்', ' trips'), true], [T('மொத்த கி.மீ', 'Total km'), fmtNum(months[m].km, 1) + ' km'], [T('மொத்த வருமானம்', 'Total billed'), inr(months[m].total)], [T('இன்னும் வர வேண்டியது', 'Still to collect'), inr(round2(months[m].pend))]])).join('') +
          '<div class="bz-list">' + log.slice().sort((a, b) => String(b.d).localeCompare(String(a.d))).map(x => '<div class="bz-row" style="cursor:default"><span><b>' + esc(dmy(x.d)) + ' · ' + esc(x.cust || '') + '</b><small>' + esc(x.route || '') + (x.km ? ' · ' + fmtNum(x.km, 1) + ' km' : '') + '</small></span><span style="text-align:right"><span class="bz-amt ' + (x.paid ? 'adv' : 'owe') + '">' + inr(x.total) + '</span><br><button type="button" class="bz-btn sec sm" data-paid="' + x.id + '">' + (x.paid ? '✓ ' + T('பெற்றது', 'Paid') : T('பணம் வந்தது', 'Mark paid')) + '</button> <button type="button" class="bz-x" data-rm="' + x.id + '" aria-label="delete">✕</button></span></div>').join('') + '</div>' +
          (log.length ? '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="csv">📊 Excel (.csv)</button></div>' : '');
        $$(pane, '[data-paid]').forEach(b => { b.onclick = () => { const x = log.find(y => y.id === b.getAttribute('data-paid')); if (x) { x.paid = !x.paid; lsSet(LOG, log); drawLog(pane); } }; });
        $$(pane, '[data-rm]').forEach(b => { b.onclick = () => { if (!window.confirm(T('இந்தப் பயணத்தை நீக்கவா?', 'Delete this trip?'))) return; log = log.filter(y => y.id !== b.getAttribute('data-rm')); lsSet(LOG, log); draw(); }; });
        const c = $(pane, '[data-act=csv]');
        if (c) c.onclick = () => { const rows = [['Date', 'Customer', 'Route', 'Vehicle', 'Km', 'Total', 'Advance', 'Paid']].concat(log.map(x => [x.d, x.cust, x.route, x.veh, x.km, x.total, x.adv, x.paid ? 'yes' : 'no'])); const b = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); if (typeof downloadBlob === 'function') downloadBlob(b, 'trip-diary-' + todayIso() + '.csv'); };
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

  /* ===================================================================== 6. shopslip — order book + token slip for every trade */
  TOOL_IMPL.shopslip = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_orders_v1';
      const D = { v: 1, prof: 'laundry', shop: { n: '', ph: '', ad: '' }, next: 1, width: '576', rates: {}, extra: {}, orders: [], cust: [] };
      let db = Object.assign({}, D, lsGet(KEY, {}));
      if (!Array.isArray(db.orders)) db.orders = []; if (!Array.isArray(db.cust)) db.cust = [];
      if (!db.shop || typeof db.shop !== 'object') db.shop = { n: '', ph: '', ad: '' };
      if (!db.rates || typeof db.rates !== 'object') db.rates = {}; if (!db.extra || typeof db.extra !== 'object') db.extra = {};
      // carry over the old simple slip settings (UPDATE_69 first version)
      const old = lsGet('bz_slip_v1', null);
      if (old && !db.orders.length && !db.shop.n) { db.shop.n = old.shop || ''; db.shop.ph = old.phone || ''; db.next = Math.max(1, Math.floor(num(old.token)) || 1); db.width = String(old.width || '576'); }
      let view = 'new', curId = null, filter = 'pending', q = '', flash = '', form = null, mType = 'blouse', mCust = null;
      const save = () => { if (!lsSet(KEY, db)) flash = T('சேமிக்க முடியவில்லை — browser இடம் நிரம்பியிருக்கலாம். Backup எடுத்து பழைய ஆர்டர்களை நீக்குங்கள்.', 'Could not save — storage may be full. Take a backup and delete old orders.'); };
      const trade = () => TRADES.find(t => t.id === db.prof) || TRADES[0];
      const sh = s => { const p = String(s || '').split(' / '); return (isEn() ? p[1] || p[0] : p[0]).trim(); };
      const rKey = (n, s) => String(n).trim() + '|' + String(s || '').trim();
      const rates = () => (db.rates[db.prof] = db.rates[db.prof] || {});
      const extraItems = () => (db.extra[db.prof] = db.extra[db.prof] || []);
      const allItems = () => trade().items.concat(extraItems());
      const byId = id => db.orders.find(o => o.id === id);
      const now = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
      const stHtml = o => { const t = todayIso(); if (isOverdue(o, t)) return '<span class="bz-st late">⏰ ' + T('தாமதம்', 'Overdue') + '</span>'; const L = ST_LABEL[o.st] || ST_LABEL.open; return '<span class="bz-st ' + esc(o.st) + '">' + T(L[0], L[1]) + '</span>'; };

      function blankForm() { return { id: null, c: { n: '', ph: '' }, f: {}, l: [], ex: '', dis: '', adv: '', mode: 'cash', due: addDaysIso(todayIso(), trade().id === 'laundry' ? 2 : 3), note: '' }; }
      function nav() {
        const pend = db.orders.filter(o => o.st === 'open' || o.st === 'ready').length, t = trade();
        const items = [['new', '➕ ' + T('புதிய ஆர்டர்', 'New order')], ['list', '📋 ' + T('ஆர்டர்கள்', 'Orders') + (pend ? '<span class="bz-badge">' + pend + '</span>' : '')], ['today', '📊 ' + T('இன்று', 'Today')], ['rates', '🏷️ ' + T('விலைகள்', 'Rates')]];
        if (t.measure) items.push(['meas', '📏 ' + T('அளவுகள்', 'Measurements')]);
        items.push(['set', '⚙️ ' + T('அமைப்பு', 'Settings')]);
        return '<div class="bz-tabs">' + items.map(i => '<button type="button" class="bz-tab' + (i[0] === view ? ' on' : '') + '" data-view="' + i[0] + '">' + i[1] + '</button>').join('') + '</div>';
      }
      function draw() {
        const t = trade();
        root.innerHTML = purpose('ஆர்டர் புத்தகம் — ' + t.ta + '. வாடிக்கையாளர் கொடுக்கும் ஒவ்வொரு பொருளையும் (எ.கா. 5 பேன்ட், 3 சட்டை) எண்ணிக்கை, சேவை, விலையுடன் பதிவு செய்து டோக்கன் ரசீது கொடுங்கள்; தயார் ஆனதும் WhatsApp, கொடுக்கும்போது எண்ணிக்கை சரிபார்ப்பு, மீதப் பணம். எல்லாம் இந்த phone-லேயே இருக்கும்.',
          'Order book — ' + t.en + '. Record every item a customer hands over (e.g. 5 pants, 3 shirts) with count, service and rate, give a token slip, send a "ready" WhatsApp, check the count at delivery and collect the balance. Everything stays on this phone.') +
          selectField(T('உங்கள் தொழில்', 'Your trade'), 'prof', TRADES.map(x => [x.id, x.icon + ' ' + x.ta + ' · ' + x.en]), db.prof) +
          nav() + (flash ? '<div class="bz-msg">' + esc(flash) + '</div>' : '') + '<div data-k="pane"></div>';
        $(root, '[data-k=prof]').addEventListener('change', e => { db.prof = e.target.value; save(); form = null; if (view === 'meas' && !trade().measure) view = 'new'; draw(); });
        $$(root, '[data-view]').forEach(b => { b.onclick = () => { view = b.getAttribute('data-view'); flash = ''; if (view === 'new' && !(form && form.id)) form = form || blankForm(); draw(); }; });
        const pane = $(root, '[data-k=pane]');
        if (view === 'new') drawForm(pane); else if (view === 'list') drawList(pane); else if (view === 'order') drawOrder(pane);
        else if (view === 'today') drawToday(pane); else if (view === 'rates') drawRates(pane); else if (view === 'meas') drawMeas(pane); else drawSettings(pane);
      }

      /* ---------- new / edit order */
      function addItem(name) {
        const t = trade(), s = t.svc[0];
        const ex = form.l.find(l => l.n === name && l.s === s);
        if (ex) ex.q = String(round2(n0(num(ex.q)) + 1));
        else form.l.push({ n: name, s: s, q: '1', r: rates()[rKey(name, s)] != null ? String(rates()[rKey(name, s)]) : '', note: '' });
      }
      function drawForm(pane) {
        if (!form) form = blankForm();
        const t = trade(), counts = {};
        form.l.forEach(l => { counts[l.n] = round2((counts[l.n] || 0) + n0(num(l.q))); });
        const custOpts = db.cust.map(c => '<option value="' + esc(c.n) + '">' + esc(c.ph || '') + '</option>').join('');
        let fieldsHtml = '';
        (t.fields || []).forEach(f => {
          const v = form.f[f[0]];
          if (f[2] === 'checks') fieldsHtml += '<div class="bz-f full"><label>' + esc(T(f[1].split(' / ')[0], f[1].split(' / ')[1] || f[1])) + '</label><div class="bz-chk2">' + f[3].map(o => '<label><input type="checkbox" data-fc="' + f[0] + '" value="' + esc(o) + '"' + ((v || []).indexOf(o) >= 0 ? ' checked' : '') + '> ' + esc(sh(o)) + '</label>').join('') + '</div></div>';
          else fieldsHtml += field(esc(T(f[1].split(' / ')[0], f[1].split(' / ')[1] || f[1])), 'f_' + f[0], v || '', { type: f[2] === 'date' ? 'date' : f[2] === 'time' ? 'time' : 'text', mode: f[2] === 'num' ? 'decimal' : 'text' });
        });
        const dueLbl = t.dueLabel ? T(t.dueLabel.split(' / ')[0], t.dueLabel.split(' / ')[1]) : T('கொடுக்கும் தேதி', 'Delivery date');
        pane.innerHTML = (form.id ? '<div class="bz-info">✏️ ' + T('டோக்கன் ' + (byId(form.id) || {}).tok + ' திருத்துகிறீர்கள்', 'Editing token ' + (byId(form.id) || {}).tok) + '</div>' : '') +
          (t.hint ? '<div class="bz-info">ℹ️ ' + esc(T(t.hint.split(' / ')[0], t.hint.split(' / ')[1] || t.hint)) + '</div>' : '') +
          '<div class="bz-h">' + T('வாடிக்கையாளர்', 'Customer') + '</div><div class="bz-grid">' +
          '<div class="bz-f"><label>' + T('பெயர்', 'Name') + '</label><input type="text" list="bz-ob-cust" data-k="cn" value="' + esc(form.c.n) + '" autocomplete="off"><datalist id="bz-ob-cust">' + custOpts + '</datalist></div>' +
          field(T('போன் (WhatsApp)', 'Phone (WhatsApp)'), 'cph', form.c.ph, { mode: 'tel' }) + '</div>' +
          (fieldsHtml ? '<div class="bz-grid">' + fieldsHtml.replace(/class="bz-f full"/g, 'class="bz-f" style="grid-column:1/-1"') + '</div>' : '') +
          '<div class="bz-h">' + T('பொருட்களைத் தட்டுங்கள் (ஒவ்வொரு தட்டும் +1)', 'Tap items (each tap adds 1)') + '</div><div class="bz-chips">' +
          allItems().map(n => '<button type="button" class="bz-chip" data-add="' + esc(n) + '">' + esc(sh(n)) + (counts[n] ? '<span class="bz-badge">' + fmtNum(counts[n], 2) + '</span>' : '') + '</button>').join('') +
          '<button type="button" class="bz-chip" data-act="custom">✍️ ' + T('வேறு பொருள்', 'Other item') + '</button></div>' +
          '<div class="bz-items" data-k="lines"></div>' +
          '<div class="bz-h">' + T('கணக்கு', 'Bill') + '</div><div class="bz-grid">' +
          (t.express ? field(T('அவசரக் கட்டணம் % (Express)', 'Express charge %'), 'ex', form.ex, { ph: '0' }) : '') +
          field(T('தள்ளுபடி (₹)', 'Discount (₹)'), 'dis', form.dis, { ph: '0' }) +
          (form.id ? '' : field(T('முன்பணம் (₹)', 'Advance (₹)'), 'adv', form.adv, { ph: '0' }) + selectField(T('பணம் எப்படி', 'Paid by'), 'mode', [['cash', T('ரொக்கம்', 'Cash')], ['upi', 'UPI / GPay']], form.mode)) +
          '</div><div class="bz-grid">' + field(dueLbl, 'due', form.due, { type: 'date', mode: 'text' }) + textField(T('குறிப்பு', 'Note'), 'note', form.note) + '</div>' +
          '<div class="bz-chips">' + [[0, T('இன்று', 'Today')], [1, T('நாளை', 'Tomorrow')], [2, '+2'], [3, '+3'], [7, '+7']].map(d => '<button type="button" class="bz-chip" data-due="' + d[0] + '">' + d[1] + '</button>').join('') + '</div>' +
          '<div data-k="tot">' + totCard() + '</div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="save">💾 ' + (form.id ? T('மாற்றங்களைச் சேமி', 'Save changes') : T('சேமித்து டோக்கன் கொடு', 'Save & give token')) + '</button><button type="button" class="bz-btn sec" data-act="clear">🧹 ' + (form.id ? T('திருத்தத்தை ரத்து செய்', 'Cancel edit') : T('காலி செய்', 'Clear')) + '</button></div>';
        drawLines();
        const cn = $(pane, '[data-k=cn]');
        cn.addEventListener('input', () => { form.c.n = cn.value; const m = db.cust.find(x => x.n === cn.value); if (m && m.ph && !form.c.ph) { form.c.ph = m.ph; $(pane, '[data-k=cph]').value = m.ph; } });
        $(pane, '[data-k=cph]').addEventListener('input', e => { form.c.ph = e.target.value; });
        (t.fields || []).forEach(f => { const i = $(pane, '[data-k=f_' + f[0] + ']'); if (i) i.addEventListener('input', () => { form.f[f[0]] = i.value; }); });
        $$(pane, '[data-fc]').forEach(i => { i.onchange = () => { const k = i.getAttribute('data-fc'); form.f[k] = $$(pane, '[data-fc="' + k + '"]').filter(x => x.checked).map(x => x.value); }; });
        ['ex', 'dis', 'adv', 'mode', 'due', 'note'].forEach(k => { const i = $(pane, '[data-k=' + k + ']'); if (i) { i.addEventListener('input', () => { form[k] = i.value; if (k !== 'note' && k !== 'due') refreshTotal(); }); i.addEventListener('change', () => { form[k] = i.value; }); } });
        $$(pane, '[data-add]').forEach(b => { b.onclick = () => { addItem(b.getAttribute('data-add')); keepScroll(() => drawForm(pane)); }; });
        $(pane, '[data-act=custom]').onclick = () => { form.l.push({ n: '', s: t.svc[0], q: '1', r: '', note: '' }); drawLines(); const ins = $$(pane, '[data-lf=n]'); if (ins.length) ins[ins.length - 1].focus(); };
        $$(pane, '[data-due]').forEach(b => { b.onclick = () => { form.due = addDaysIso(todayIso(), +b.getAttribute('data-due')); $(pane, '[data-k=due]').value = form.due; }; });
        $(pane, '[data-act=clear]').onclick = () => { form = blankForm(); flash = ''; draw(); };
        $(pane, '[data-act=save]').onclick = saveForm;
      }
      function totCard() {
        const c = orderCalc({ l: form.l, ex: form.ex, dis: form.dis, pay: form.id ? (byId(form.id) || {}).pay : (num(form.adv) > 0 ? [{ a: form.adv }] : []) });
        return resCard(T('மொத்தம்', 'Total') + ' · ' + fmtNum(c.pcs, 2) + ' ' + T('எண்ணிக்கை', 'pcs/qty'), inr(c.total), (c.ex ? T('அவசரம் ', 'Express ') + inr(c.ex) + ' · ' : '') + (c.dis ? T('தள்ளுபடி ', 'Discount ') + inr(c.dis) + ' · ' : '') + (c.paid ? T('பெற்றது ', 'Paid ') + inr(c.paid) + ' · ' : '') + T('மீதம் ', 'Balance ') + inr(c.bal), 'ok');
      }
      function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }
      function refreshTotal() {
        const tot = $(root, '[data-k=tot]'); if (tot) tot.innerHTML = totCard();
        form.l.forEach((l, i) => { const a = $(root, '[data-amt="' + i + '"]'); if (a) a.textContent = inr(lineAmt(l)); });
      }
      function drawLines() {
        const box = $(root, '[data-k=lines]'); if (!box) return; const t = trade();
        if (!form.l.length) { box.innerHTML = '<div class="bz-info">' + T('மேலே உள்ள பொருளைத் தட்டுங்கள். 5 பேன்ட் என்றால் "பேன்ட்"-ஐ 5 முறை தட்டுங்கள் அல்லது எண்ணிக்கையை எழுதுங்கள்.', 'Tap an item above. For 5 pants, tap "Pant" 5 times or type the count.') + '</div>'; return; }
        box.innerHTML = form.l.map((l, i) => {
          const svcs = t.svc.indexOf(l.s) >= 0 || !l.s ? t.svc : t.svc.concat([l.s]);
          return '<div class="bz-ol"><input class="full" type="text" data-li="' + i + '" data-lf="n" value="' + esc(l.n) + '" placeholder="' + esc(T('பொருள் / சேவை', 'Item / service')) + '">' +
            '<select class="full" data-li="' + i + '" data-lf="s">' + svcs.map(s => '<option value="' + esc(s) + '"' + (s === l.s ? ' selected' : '') + '>' + esc(sh(s)) + '</option>').join('') + '</select>' +
            '<div class="bz-qty"><button type="button" data-step="-1" data-li="' + i + '" aria-label="minus">−</button><input type="text" inputmode="decimal" data-li="' + i + '" data-lf="q" value="' + esc(l.q) + '" aria-label="qty"><button type="button" data-step="1" data-li="' + i + '" aria-label="plus">+</button></div>' +
            '<input type="text" inputmode="decimal" data-li="' + i + '" data-lf="r" value="' + esc(l.r) + '" placeholder="' + esc(T('ஒன்றுக்கு ₹', '₹ each')) + '">' +
            '<div class="amt"><span data-amt="' + i + '">' + inr(lineAmt(l)) + '</span><button type="button" class="bz-x" data-rmline="' + i + '" aria-label="remove">✕</button></div>' +
            '<input class="full" type="text" data-li="' + i + '" data-lf="note" value="' + esc(l.note || '') + '" placeholder="' + esc(T('குறிப்பு: நிறம், கறை, கிழிசல், பட்டன் இல்லை…', 'Note: colour, stain, tear, missing button…')) + '"></div>';
        }).join('');
        $$(box, '[data-lf]').forEach(inp => {
          const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
          inp.addEventListener(ev, () => {
            const l = form.l[+inp.getAttribute('data-li')], f = inp.getAttribute('data-lf'); l[f] = inp.value;
            if (f === 's' || f === 'n') { const r = rates()[rKey(l.n, l.s)]; if (r != null) { l.r = String(r); const ri = $(box, '[data-li="' + inp.getAttribute('data-li') + '"][data-lf="r"]'); if (ri) ri.value = l.r; } refreshTotal(); }
            else if (f === 'q' || f === 'r') refreshTotal();
          });
        });
        $$(box, '[data-step]').forEach(b => { b.onclick = () => { const l = form.l[+b.getAttribute('data-li')]; l.q = String(Math.max(0, round2(n0(num(l.q)) + +b.getAttribute('data-step')))); if (n0(num(l.q)) === 0) form.l.splice(+b.getAttribute('data-li'), 1); keepScroll(() => drawForm($(root, '[data-k=pane]'))); }; });
        $$(box, '[data-rmline]').forEach(b => { b.onclick = () => { form.l.splice(+b.getAttribute('data-rmline'), 1); keepScroll(() => drawForm($(root, '[data-k=pane]'))); }; });
      }
      function saveForm() {
        const lines = form.l.filter(l => String(l.n).trim() && n0(num(l.q)) > 0).map(l => ({ n: String(l.n).trim(), s: l.s || '', q: String(round2(n0(num(l.q)))), r: String(num(l.r) >= 0 ? round2(n0(num(l.r))) : ''), note: String(l.note || '').trim(), back: !!l.back }));
        if (!lines.length) { flash = T('குறைந்தது ஒரு பொருளைச் சேருங்கள்', 'Add at least one item'); draw(); return; }
        lines.forEach(l => { if (num(l.r) > 0) rates()[rKey(l.n, l.s)] = num(l.r); if (allItems().indexOf(l.n) < 0 && l.n.length <= 60) extraItems().push(l.n); });
        const name = String(form.c.n || '').trim(), ph = String(form.c.ph || '').trim();
        if (name || ph) { let cu = db.cust.find(x => (ph && x.ph === ph) || (!ph && x.n === name)); if (!cu) { cu = { id: uid(), n: name, ph: ph, m: {} }; db.cust.push(cu); } else { if (name) cu.n = name; if (ph) cu.ph = ph; } }
        let o;
        if (form.id) { o = byId(form.id); if (!o) { form = blankForm(); draw(); return; } Object.assign(o, { c: { n: name, ph: ph }, f: form.f, l: lines, ex: form.ex, dis: form.dis, due: form.due, note: form.note }); }
        else {
          o = { id: uid(), tok: db.next, d: todayIso(), t: now(), p: db.prof, c: { n: name, ph: ph }, f: form.f, l: lines, ex: form.ex, dis: form.dis, pay: [], due: form.due, st: 'open', note: form.note };
          if (num(form.adv) > 0) o.pay.push({ d: todayIso(), a: round2(num(form.adv)), m: form.mode === 'upi' ? 'upi' : 'cash', k: 'adv' });
          db.orders.push(o); db.next = (Math.floor(num(db.next)) || 1) + 1;
        }
        save(); form = blankForm(); curId = o.id; view = 'order'; flash = ''; draw();
      }

      /* ---------- order list */
      function drawList(pane) {
        const t0 = todayIso();
        const F = { pending: o => o.st === 'open' || o.st === 'ready', ready: o => o.st === 'ready', late: o => isOverdue(o, t0), done: o => o.st === 'done', all: () => true };
        const s = q.trim().toLowerCase();
        const rows = db.orders.filter(o => o.st !== 'cancel' || filter === 'all').filter(F[filter] || F.all).filter(o => !s || String(o.tok) === s || ((o.c || {}).n || '').toLowerCase().indexOf(s) >= 0 || ((o.c || {}).ph || '').indexOf(s) >= 0)
          .sort((a, b) => filter === 'done' || filter === 'all' ? b.tok - a.tok : String(a.due || '9').localeCompare(String(b.due || '9')) || a.tok - b.tok);
        pane.innerHTML = '<div class="bz-chips">' + [['pending', T('கொடுக்க வேண்டியவை', 'Pending')], ['ready', T('தயார்', 'Ready')], ['late', T('தாமதம்', 'Overdue')], ['done', T('கொடுத்தவை', 'Delivered')], ['all', T('எல்லாம்', 'All')]].map(f => '<button type="button" class="bz-chip' + (f[0] === filter ? ' on' : '') + '" data-flt="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
          '<div class="bz-f"><input type="text" data-k="q" value="' + esc(q) + '" placeholder="' + esc(T('டோக்கன் எண் / பெயர் / போன் தேடு', 'Search token / name / phone')) + '"></div><div class="bz-list" data-k="rows"></div>';
        const box = $(pane, '[data-k=rows]');
        box.innerHTML = rows.length ? rows.slice(0, 300).map(o => { const c = orderCalc(o); return '<button type="button" class="bz-card" data-oid="' + o.id + '"><span><b>#' + o.tok + ' · ' + esc((o.c || {}).n || T('பெயர் இல்லை', 'No name')) + '</b><small>' + esc(itemSummary(o, isEn())) + '</small><small>' + (o.due ? T('கொடுக்கும் தேதி ', 'Due ') + esc(dmy(o.due)) : '') + '</small></span><span style="text-align:right">' + stHtml(o) + (c.bal > 0.004 ? '<br><span class="bz-amt owe">' + inr(c.bal) + '</span>' : '') + '</span></button>'; }).join('') :
          '<div class="bz-info">' + T('இங்கே ஆர்டர் இல்லை.', 'No orders here.') + '</div>';
        $$(pane, '[data-flt]').forEach(b => { b.onclick = () => { filter = b.getAttribute('data-flt'); draw(); }; });
        $(pane, '[data-k=q]').addEventListener('input', e => { q = e.target.value; const y = window.scrollY; drawList(pane); window.scrollTo(0, y); const i = $(pane, '[data-k=q]'); i.focus(); i.setSelectionRange(q.length, q.length); });
        $$(box, '[data-oid]').forEach(b => { b.onclick = () => { curId = b.getAttribute('data-oid'); view = 'order'; draw(); window.scrollTo(0, 0); }; });
      }

      /* ---------- one order */
      function msgFor(o, kind) {
        const c = orderCalc(o), shop = db.shop.n || '', items = itemSummary(o, false), en = isEn();
        const L = [];
        if (kind === 'recv') {
          L.push(T('வணக்கம் ', 'Hello ') + ((o.c || {}).n || '') + ',', (shop ? shop + ' — ' : '') + T('உங்கள் ஆர்டர் பெறப்பட்டது.', 'we have received your order.'), T('டோக்கன்: ', 'Token: ') + o.tok, T('பொருட்கள்: ', 'Items: ') + itemSummary(o, en) + ' (' + fmtNum(c.pcs, 2) + ')');
          L.push(T('மொத்தம்: ', 'Total: ') + inr(c.total) + (c.paid ? ' · ' + T('பெற்றது: ', 'Paid: ') + inr(c.paid) : '') + (c.bal > 0.004 ? ' · ' + T('மீதம்: ', 'Balance: ') + inr(c.bal) : ''));
          if (o.due) L.push(T('கொடுக்கும் தேதி: ', 'Delivery: ') + dmy(o.due));
        } else if (kind === 'ready') {
          L.push(T('வணக்கம் ', 'Hello ') + ((o.c || {}).n || '') + ',', T('உங்கள் ஆர்டர் (டோக்கன் ', 'your order (token ') + o.tok + ') ' + T('தயாராக உள்ளது: ', 'is ready: ') + itemSummary(o, en) + '.');
          if (c.bal > 0.004) L.push(T('மீதம் செலுத்த வேண்டியது: ', 'Balance to pay: ') + inr(c.bal));
          L.push(T('டோக்கன் ரசீதுடன் வந்து பெற்றுக்கொள்ளுங்கள்.', 'Please bring the token slip when you collect.'));
        } else if (kind === 'due') {
          L.push(T('வணக்கம் ', 'Hello ') + ((o.c || {}).n || '') + ',', T('டோக்கன் ', 'Token ') + o.tok + T(' — மீதம் ', ' — balance ') + inr(c.bal) + T(' நிலுவை உள்ளது. வசதிப்படி செலுத்தவும்.', ' is pending. Please pay at your convenience.'));
        } else {
          L.push(T('வணக்கம் ', 'Hello ') + ((o.c || {}).n || '') + ',', T('டோக்கன் ', 'Token ') + o.tok + T(' பெற்றுக்கொண்டதற்கு நன்றி! மீண்டும் வாருங்கள்.', ' delivered — thank you! Please visit again.'));
        }
        if (shop) L.push('— ' + shop + (db.shop.ph ? ' · ' + db.shop.ph : ''));
        void items; return L.join('\n');
      }
      function drawOrder(pane) {
        const o = byId(curId); if (!o) { view = 'list'; return draw(); }
        const c = orderCalc(o), t = TRADES.find(x => x.id === o.p) || trade(), ph = (o.c || {}).ph || '';
        const fieldRows = (t.fields || []).filter(f => o.f && o.f[f[0]] && String(o.f[f[0]]).length).map(f => [esc(sh(f[1])), esc(Array.isArray(o.f[f[0]]) ? o.f[f[0]].map(sh).join(', ') : f[2] === 'date' ? dmy(o.f[f[0]]) : o.f[f[0]])]);
        const allBack = o.l.length && o.l.every(l => l.back);
        pane.innerHTML = '<div class="bz-actions" style="margin-top:4px"><button type="button" class="bz-btn sec sm" data-act="back">← ' + T('ஆர்டர்கள்', 'Orders') + '</button><button type="button" class="bz-btn sec sm" data-act="edit">✏️ ' + T('திருத்து', 'Edit') + '</button></div>' +
          resCard(T('டோக்கன் ', 'Token ') + o.tok + ' · ' + esc((o.c || {}).n || ''), c.bal > 0.004 ? T('மீதம் ', 'Balance ') + inr(c.bal) : T('முழுதும் பெற்றது', 'Fully paid'), T('மொத்தம் ', 'Total ') + inr(c.total) + ' · ' + fmtNum(c.pcs, 2) + ' ' + T('எண்ணிக்கை', 'pcs') + ' · ' + T('ஆர்டர் ', 'Ordered ') + dmy(o.d) + (o.due ? ' · ' + T('கொடுக்க ', 'Due ') + dmy(o.due) : ''), c.bal > 0.004 ? 'warn' : 'ok') +
          '<div style="margin-top:10px">' + stHtml(o) + (ph ? ' <small>📞 ' + esc(ph) + '</small>' : '') + '</div>' +
          (fieldRows.length ? table(fieldRows) : '') +
          '<div class="bz-h">' + T('பொருட்கள் — கொடுக்கும்போது ஒவ்வொன்றையும் சரிபார்த்து ✓ போடுங்கள்', 'Items — tick each one as you hand it back') + '</div>' +
          '<div class="bz-list">' + o.l.map((l, i) => '<label class="bz-row" style="cursor:pointer"><span style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-ret="' + i + '"' + (l.back ? ' checked' : '') + ' style="width:24px;height:24px;flex:0 0 24px"><span><b>' + esc(sh(l.n)) + ' ×' + esc(fmtNum(num(l.q), 2)) + '</b><small>' + esc(sh(l.s)) + (num(l.r) ? ' · ' + inr(num(l.r)) + T(' ஒன்றுக்கு', ' each') : '') + (l.note ? ' · ' + esc(l.note) : '') + '</small></span></span><span class="bz-amt">' + inr(lineAmt(l)) + '</span></label>').join('') + '</div>' +
          (o.l.length > 0 ? '<div class="bz-info">' + (allBack ? '✅ ' + T('எல்லாப் பொருட்களும் சரிபார்க்கப்பட்டன', 'All items checked') : T('சரிபார்த்தவை: ', 'Checked: ') + o.l.filter(l => l.back).length + ' / ' + o.l.length) + '</div>' : '') +
          table([[T('பொருட்கள்', 'Items'), inr(c.sub)], c.ex ? [T('அவசரக் கட்டணம்', 'Express'), inr(c.ex)] : null, c.dis ? [T('தள்ளுபடி', 'Discount'), '− ' + inr(c.dis)] : null, [T('மொத்தம்', 'Total'), inr(c.total), true]].concat((o.pay || []).map(p => [(p.k === 'adv' ? T('முன்பணம்', 'Advance') : T('பணம் பெற்றது', 'Payment')) + ' · ' + dmy(p.d) + ' · ' + (p.m === 'upi' ? 'UPI' : T('ரொக்கம்', 'Cash')), '− ' + inr(p.a)])).concat([[T('மீதம்', 'Balance'), inr(c.bal), true]]).filter(Boolean)) +
          (o.note ? '<div class="bz-info">📝 ' + esc(o.note) + '</div>' : '') +
          (o.st !== 'done' && o.st !== 'cancel' ? '<div class="bz-h">' + T('பணம் பெறு', 'Take payment') + '</div><div class="bz-grid">' + field(T('தொகை (₹)', 'Amount (₹)'), 'pay', c.bal > 0.004 ? String(c.bal) : '') + selectField(T('எப்படி', 'How'), 'pmode', [['cash', T('ரொக்கம்', 'Cash')], ['upi', 'UPI / GPay']], 'cash') + '</div><div class="bz-actions"><button type="button" class="bz-btn sec" data-act="pay">💵 ' + T('பணம் பெற்றேன்', 'Payment received') + '</button></div>' : '') +
          '<div class="bz-h">' + T('நிலை', 'Status') + '</div><div class="bz-actions">' +
          (o.st === 'open' ? '<button type="button" class="bz-btn green" data-act="ready">✅ ' + T('தயார் ஆனது', 'Mark ready') + '</button>' : '') +
          (o.st === 'open' || o.st === 'ready' ? '<button type="button" class="bz-btn" data-act="done">📦 ' + (c.bal > 0.004 ? T('மீதம் ' + inr(c.bal) + ' பெற்று கொடுத்தேன்', 'Collect ' + inr(c.bal) + ' & deliver') : T('கொடுத்தாயிற்று', 'Mark delivered')) + '</button>' : '') +
          (o.st === 'done' || o.st === 'cancel' ? '<button type="button" class="bz-btn sec" data-act="reopen">↩️ ' + T('மீண்டும் திற', 'Re-open') + '</button>' : '') +
          (o.st !== 'cancel' && o.st !== 'done' ? '<button type="button" class="bz-btn sec" data-act="cancel">🚫 ' + T('ரத்து', 'Cancel order') + '</button>' : '') + '</div>' +
          '<div class="bz-h">WhatsApp</div><div class="bz-actions">' +
          (ph ? waBtn(ph, msgFor(o, 'recv'), T('ஆர்டர் பெற்றோம்', 'Order received')) + waBtn(ph, msgFor(o, 'ready'), T('தயார்', 'Ready')) + (c.bal > 0.004 ? waBtn(ph, msgFor(o, 'due'), T('மீதப் பணம்', 'Balance due')) : '') + (o.st === 'done' ? waBtn(ph, msgFor(o, 'thanks'), T('நன்றி', 'Thank you')) : '') : '<div class="bz-info">' + T('போன் எண் சேர்த்தால் WhatsApp செய்தி அனுப்பலாம் (✏️ திருத்து).', 'Add a phone number to send WhatsApp messages (✏️ Edit).') + '</div>') + '</div>' +
          '<div class="bz-h">' + T('டோக்கன் ரசீது', 'Token slip') + '</div><canvas class="bz-canvas" data-k="cv"></canvas>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="dl">⬇️ ' + T('ரசீது படம் (PNG)', 'Slip picture (PNG)') + '</button><button type="button" class="bz-btn green" data-act="sh">📤 ' + T('பகிர்', 'Share') + '</button><button type="button" class="bz-btn sec" data-act="cp">📋 ' + T('ரசீது உரை நகலெடு', 'Copy slip text') + '</button></div>' +
          '<div class="bz-info">' + T('Thermal printer (58 / 80 mm) இருந்தால் PNG-ஐ அதன் app-ல் திறந்து அச்சிடலாம். அகலத்தை ⚙️ அமைப்பில் மாற்றலாம்.', 'With a 58 / 80 mm thermal printer, open the PNG in its app and print. Change the width in ⚙️ Settings.') + '</div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="del">🗑️ ' + T('இந்த ஆர்டரை நீக்கு', 'Delete this order') + '</button></div>';
        const cv = $(pane, '[data-k=cv]'); paintSlip(cv, o);
        const set = (st, extra) => { o.st = st; if (extra) extra(); save(); drawOrder(pane); };
        $(pane, '[data-act=back]').onclick = () => { view = 'list'; draw(); };
        $(pane, '[data-act=edit]').onclick = () => { form = { id: o.id, c: { n: (o.c || {}).n || '', ph: ph }, f: JSON.parse(JSON.stringify(o.f || {})), l: o.l.map(l => Object.assign({}, l)), ex: o.ex || '', dis: o.dis || '', adv: '', mode: 'cash', due: o.due || '', note: o.note || '' }; if (o.p !== db.prof) { db.prof = o.p; save(); } view = 'new'; draw(); window.scrollTo(0, 0); };
        $$(pane, '[data-ret]').forEach(cb => { cb.onchange = () => { o.l[+cb.getAttribute('data-ret')].back = cb.checked; save(); const y = window.scrollY; drawOrder(pane); window.scrollTo(0, y); }; });
        const payBtn = $(pane, '[data-act=pay]');
        if (payBtn) payBtn.onclick = () => { const a = num($(pane, '[data-k=pay]').value); if (!(a > 0)) return; o.pay = o.pay || []; o.pay.push({ d: todayIso(), a: round2(a), m: $(pane, '[data-k=pmode]').value === 'upi' ? 'upi' : 'cash', k: 'bal' }); save(); drawOrder(pane); };
        const b = sel => $(pane, '[data-act=' + sel + ']');
        if (b('ready')) b('ready').onclick = () => set('ready', () => { o.rdAt = todayIso(); });
        if (b('done')) b('done').onclick = () => {
          if (!allBack && o.l.length && !window.confirm(T('எல்லாப் பொருட்களும் ✓ சரிபார்க்கப்படவில்லை. இருந்தாலும் கொடுத்ததாகக் குறிக்கவா?', 'Not every item is ticked. Mark as delivered anyway?'))) return;
          set('done', () => { const cc = orderCalc(o); if (cc.bal > 0.004) { o.pay = o.pay || []; o.pay.push({ d: todayIso(), a: cc.bal, m: (($(pane, '[data-k=pmode]') || {}).value === 'upi') ? 'upi' : 'cash', k: 'bal' }); } o.doneAt = todayIso(); });
        };
        if (b('reopen')) b('reopen').onclick = () => set('open');
        if (b('cancel')) b('cancel').onclick = () => { if (window.confirm(T('இந்த ஆர்டரை ரத்து செய்யவா?', 'Cancel this order?'))) set('cancel'); };
        b('del').onclick = () => { if (!window.confirm(T('இந்த ஆர்டர் முழுதும் நீக்கப்படும். தொடரவா?', 'This order will be deleted completely. Continue?'))) return; db.orders = db.orders.filter(x => x.id !== o.id); save(); view = 'list'; draw(); };
        b('dl').onclick = () => saveCanvas(cv, 'token-' + o.tok + '.png');
        b('sh').onclick = async () => { if (!(await shareCanvas(cv, 'token-' + o.tok + '.png', msgFor(o, 'recv')))) saveCanvas(cv, 'token-' + o.tok + '.png'); };
        b('cp').onclick = function () { copyText(msgFor(o, 'recv'), this); };
      }
      function paintSlip(cv, o) {
        const W = +db.width || 576, sc = W / 576, pad = Math.round(22 * sc), c = orderCalc(o), t = TRADES.find(x => x.id === o.p) || trade();
        const fs = Math.round(25 * sc), lh = Math.round(38 * sc), ops = [];
        const C = (txt, size, wt) => ops.push({ k: 'c', a: txt, s: size, w: wt }), LR = (a, b2, wt) => ops.push({ k: 'lr', a: a, b: b2, w: wt }), Lf = (txt, wt) => ops.push({ k: 'l', a: txt, w: wt }), HR = () => ops.push({ k: 'hr' });
        C(db.shop.n.trim() || T('கடை பெயர்', 'Shop name'), Math.round(42 * sc), '800');
        if (db.shop.ph.trim()) C('📞 ' + db.shop.ph.trim(), fs, '600'); if (db.shop.ad.trim()) C(db.shop.ad.trim(), Math.round(21 * sc), '500');
        HR(); C(T('டோக்கன் ', 'Token ') + o.tok, Math.round(58 * sc), '900');
        LR(T('தேதி ', 'Date ') + dmy(o.d), o.t || '', '500');
        if ((o.c || {}).n || (o.c || {}).ph) Lf(((o.c || {}).n || '') + ((o.c || {}).ph ? '  ' + o.c.ph : ''), '700');
        (t.fields || []).forEach(f => { const v = o.f && o.f[f[0]]; if (v && String(v).length) Lf(sh(f[1]) + ': ' + (Array.isArray(v) ? v.map(sh).join(', ') : f[2] === 'date' ? dmy(v) : v), '500'); });
        HR();
        o.l.forEach(l => { LR(sh(l.n) + ' ×' + fmtNum(num(l.q), 2) + (l.s && t.svc.length > 1 ? ' (' + sh(l.s) + ')' : ''), num(l.r) ? fmtNum(lineAmt(l), 2) : '', '600'); if (l.note) Lf('   ' + l.note, '500'); });
        HR(); LR(T('மொத்த எண்ணிக்கை', 'Total pieces'), fmtNum(c.pcs, 2), '700');
        if (c.ex) LR(T('அவசரக் கட்டணம்', 'Express'), inr(c.ex), '500'); if (c.dis) LR(T('தள்ளுபடி', 'Discount'), '− ' + inr(c.dis), '500');
        if (c.total) { LR(T('மொத்தம்', 'Total'), inr(c.total), '800'); if (c.paid) LR(T('பெற்றது', 'Paid'), inr(c.paid), '500'); LR(T('மீதம்', 'Balance'), inr(c.bal), '900'); }
        if (o.due) { HR(); Lf((t.dueLabel ? sh(t.dueLabel) : T('கொடுக்கும் தேதி', 'Delivery')) + ': ' + dmy(o.due), '800'); }
        if (o.note) Lf(o.note, '500');
        ops.push({ k: 'foot' });
        const H = Math.round(30 * sc) + ops.reduce((a, op) => a + (op.k === 'hr' ? Math.round(18 * sc) : op.k === 'c' ? Math.round(op.s * 1.45) : op.k === 'foot' ? Math.round(56 * sc) : lh), 0);
        cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000000'; ctx.textBaseline = 'middle';
        let y = Math.round(20 * sc);
        ops.forEach(op => {
          if (op.k === 'hr') { ctx.fillRect(pad, y + Math.round(8 * sc), W - 2 * pad, Math.max(1, Math.round(2 * sc))); y += Math.round(18 * sc); return; }
          if (op.k === 'c') { const hh = Math.round(op.s * 1.45); ctx.textAlign = 'center'; fitFont(ctx, op.a, W - 2 * pad, op.s, op.w, 12); ctx.fillText(op.a, W / 2, y + hh / 2); y += hh; return; }
          if (op.k === 'foot') { ctx.textAlign = 'center'; ctx.fillStyle = '#444'; fitFont(ctx, T('இந்த ரசீதைக் கொண்டு வரவும் · நன்றி', 'Please bring this slip · Thank you'), W - 2 * pad, Math.round(20 * sc), '500', 11); ctx.fillText(T('இந்த ரசீதைக் கொண்டு வரவும் · நன்றி', 'Please bring this slip · Thank you'), W / 2, y + Math.round(28 * sc)); ctx.fillStyle = '#000'; y += Math.round(56 * sc); return; }
          const my = y + lh / 2;
          if (op.k === 'l') { ctx.textAlign = 'left'; fitFont(ctx, op.a, W - 2 * pad, fs, op.w, 11); ctx.fillText(op.a, pad, my); }
          else { ctx.font = op.w + ' ' + fs + 'px ' + FONT; const bw = op.b ? ctx.measureText(op.b).width : 0; ctx.textAlign = 'right'; if (op.b) ctx.fillText(op.b, W - pad, my); ctx.textAlign = 'left'; fitFont(ctx, op.a, W - 2 * pad - bw - Math.round(14 * sc), fs, op.w, 11); ctx.fillText(op.a, pad, my); }
          y += lh;
        });
      }

      /* ---------- today */
      function drawToday(pane) {
        const iso = todayIso(), s = dayStats(db.orders, iso);
        const dueRows = db.orders.filter(o => (o.st === 'open' || o.st === 'ready') && o.due && o.due <= iso).sort((a, b) => String(a.due).localeCompare(String(b.due)));
        pane.innerHTML = '<div class="bz-stats">' +
          [[s.orders, T('இன்றைய ஆர்டர்', "Today's orders")], [fmtNum(s.pcs, 2), T('இன்று வந்த எண்ணிக்கை', 'Pieces / qty in')], [inr(s.billed), T('இன்றைய பில் தொகை', 'Billed today')], [inr(round2(s.cash + s.upi)), T('இன்று பெற்ற பணம்', 'Collected today') + ' (' + T('ரொக்கம் ', 'cash ') + inr(s.cash) + ' · UPI ' + inr(s.upi) + ')'], [s.dueToday, T('இன்று கொடுக்க வேண்டியவை', 'Due today')], [s.overdue, T('தாமதமானவை', 'Overdue')], [s.readyWaiting, T('தயார் — வாங்க வரவில்லை', 'Ready, not collected')], [inr(s.toCollect), T('மொத்தம் வர வேண்டிய பணம்', 'Total balance to collect')]]
            .map(x => '<div class="bz-stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('') + '</div>' +
          '<div class="bz-h">' + T('இன்று / தாமதமாகக் கொடுக்க வேண்டியவை', 'Due today / overdue') + '</div><div class="bz-list">' +
          (dueRows.length ? dueRows.map(o => '<button type="button" class="bz-card" data-oid="' + o.id + '"><span><b>#' + o.tok + ' · ' + esc((o.c || {}).n || '') + '</b><small>' + esc(itemSummary(o, isEn())) + '</small></span><span>' + stHtml(o) + '</span></button>').join('') : '<div class="bz-info">' + T('இன்று கொடுக்க வேண்டியது எதுவும் இல்லை 👍', 'Nothing due today 👍') + '</div>') + '</div>' +
          '<div class="bz-h">' + T('Excel / Backup', 'Excel / backup') + '</div><div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="csv">📊 ' + T('எல்லா ஆர்டர்களும் (.csv)', 'All orders (.csv)') + '</button><button type="button" class="bz-btn sec sm" data-act="bk">💾 Backup (.json)</button><label class="bz-btn sec sm" style="cursor:pointer">📂 ' + T('மீட்டெடு', 'Restore') + '<input type="file" accept=".json,application/json" data-act="rs" hidden></label></div>' +
          '<div class="bz-info">' + T('தகவல் இந்த browser-ல் மட்டும் இருக்கும். phone மாற்றும்போது அல்லது browser data அழிக்கும் முன் Backup எடுங்கள்.', 'Data lives only in this browser. Take a backup before changing phones or clearing browser data.') + '</div>';
        $$(pane, '[data-oid]').forEach(b => { b.onclick = () => { curId = b.getAttribute('data-oid'); view = 'order'; draw(); window.scrollTo(0, 0); }; });
        $(pane, '[data-act=csv]').onclick = () => { const b = new Blob(['﻿' + ordersCsv(db.orders)], { type: 'text/csv;charset=utf-8' }); if (typeof downloadBlob === 'function') downloadBlob(b, 'orders-' + iso + '.csv'); };
        $(pane, '[data-act=bk]').onclick = () => { const b = new Blob([JSON.stringify(db)], { type: 'application/json' }); if (typeof downloadBlob === 'function') downloadBlob(b, 'order-book-backup-' + iso + '.json'); };
        $(pane, '[data-act=rs]').onchange = e => {
          const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader();
          r.onload = () => { try { const v = JSON.parse(String(r.result)); if (!v || !Array.isArray(v.orders)) throw new Error('bad'); if (!window.confirm(T('இப்போது உள்ள ஆர்டர்கள் இந்த Backup-ஆல் மாற்றப்படும். தொடரவா?', 'Current orders will be replaced by this backup. Continue?'))) return; db = Object.assign({}, D, v); save(); flash = T('மீட்டெடுக்கப்பட்டது', 'Restored'); draw(); } catch (err) { flash = T('இது சரியான Backup file இல்லை', 'This is not a valid backup file'); draw(); } };
          r.readAsText(f);
        };
      }

      /* ---------- rates (the owner's own price list) */
      function drawRates(pane) {
        const t = trade(), R = rates();
        pane.innerHTML = '<div class="bz-info">' + T('உங்கள் விலைகளை ஒருமுறை இங்கே எழுதினால், ஆர்டரில் தானாக வரும். ஆர்டரில் மாற்றிய விலையும் இங்கே நினைவில் இருக்கும். (இயல்பு விலை எதுவும் நாங்கள் வைக்கவில்லை — உங்கள் கடை விலையே.)', 'Type your prices once and they fill in automatically. A price you change in an order is remembered too. (We never preset prices — they are your own.)') + '</div>' +
          allItems().map((n, i) => '<details class="bz-det"' + (i < 2 ? ' open' : '') + '><summary>' + esc(sh(n)) + (extraItems().indexOf(n) >= 0 ? ' <small>(' + T('நீங்கள் சேர்த்தது', 'yours') + ')</small>' : '') + '</summary><div class="in"><div class="bz-grid">' +
            t.svc.map(s => '<div class="bz-f"><label>' + esc(sh(s)) + ' (₹)</label><input type="text" inputmode="decimal" data-rate="' + esc(rKey(n, s)) + '" value="' + esc(R[rKey(n, s)] != null ? R[rKey(n, s)] : '') + '"></div>').join('') + '</div>' +
            (extraItems().indexOf(n) >= 0 ? '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-rmitem="' + esc(n) + '">🗑️ ' + T('இந்தப் பொருளை நீக்கு', 'Remove this item') + '</button></div>' : '') + '</div></details>').join('') +
          '<div class="bz-h">' + T('புதிய பொருள் / சேவை சேர்', 'Add your own item / service') + '</div><div class="bz-grid">' + textField(T('பெயர்', 'Name'), 'newitem', '') + '<div class="bz-f"><label>&nbsp;</label><button type="button" class="bz-btn" data-act="additem" style="width:100%">➕ ' + T('சேர்', 'Add') + '</button></div></div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="tocard">🏷️ ' + T('இந்த விலைகளை விலைப்பட்டியல் படமாக்கு', 'Make a price-list picture from these') + '</button></div>';
        $$(pane, '[data-rate]').forEach(i => { i.addEventListener('input', () => { const v = num(i.value); if (i.value.trim() === '') delete R[i.getAttribute('data-rate')]; else if (v >= 0) R[i.getAttribute('data-rate')] = v; save(); }); });
        $$(pane, '[data-rmitem]').forEach(b => { b.onclick = () => { db.extra[db.prof] = extraItems().filter(x => x !== b.getAttribute('data-rmitem')); save(); drawRates(pane); }; });
        $(pane, '[data-act=additem]').onclick = () => { const v = $(pane, '[data-k=newitem]').value.trim(); if (v && allItems().indexOf(v) < 0) { extraItems().push(v.slice(0, 60)); save(); } drawRates(pane); };
        $(pane, '[data-act=tocard]').onclick = () => {
          const items = []; allItems().forEach(n => t.svc.forEach(s => { const r = R[rKey(n, s)]; if (r != null) items.push({ n: sh(n) + (t.svc.length > 1 ? ' — ' + sh(s) : ''), p: String(r) }); }));
          if (!items.length) { flash = T('முதலில் விலைகளை எழுதுங்கள்', 'Type some prices first'); draw(); return; }
          const rc = lsGet('bz_ratecard_v1', {}) || {}; rc.preset = 'blank'; rc.items = items; if (!rc.shop) rc.shop = db.shop.n; if (!rc.phone) rc.phone = db.shop.ph; if (!rc.addr) rc.addr = db.shop.ad; lsSet('bz_ratecard_v1', rc);
          try { if (typeof openTool === 'function') { openTool('ratecard'); return; } } catch (e) { /* fall back */ }
          location.href = '/?tool=ratecard';
        };
      }

      /* ---------- tailor measurements */
      function drawMeas(pane) {
        const list = db.cust.slice().sort((a, b) => String(a.n).localeCompare(String(b.n)));
        const cu = db.cust.find(x => x.id === mCust);
        pane.innerHTML = '<div class="bz-info">' + T('வாடிக்கையாளர் அளவுகளை ஒருமுறை எழுதி வைத்தால் அடுத்த முறை தேட வேண்டாம். அளவு அங்குலத்தில் (அல்லது நீங்கள் பயன்படுத்தும் அலகில்).', 'Save each customer\'s measurements once; no need to re-measure next time. Inches (or the unit you use).') + '</div>' +
          '<div class="bz-grid">' + selectField(T('வாடிக்கையாளர்', 'Customer'), 'mc', [['', T('— தேர்ந்தெடு —', '— choose —')]].concat(list.map(c => [c.id, c.n + (c.ph ? ' · ' + c.ph : '')])), mCust || '') +
          '<div class="bz-f"><label>' + T('அல்லது புதியவர்', 'or new') + '</label><input type="text" data-k="mnew" placeholder="' + esc(T('பெயர்', 'Name')) + '"></div></div><div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="mnew">➕ ' + T('புதியவரைச் சேர்', 'Add new') + '</button></div>' +
          (cu ? tabs(Object.keys(MEASURES).map(k => [k, sh(MEASURES[k].ta)]), mType) + '<div class="bz-grid three">' + MEASURES[mType].f.map((f, i) => field(esc(sh(f)), 'm' + i, ((cu.m || {})[mType] || {})[f] || '')).join('') + '</div>' +
            textField(T('குறிப்பு (டிசைன், கழுத்து மாடல்…)', 'Note (design, neck style…)'), 'mnote', ((cu.m || {})[mType] || {})._note || '') +
            '<div class="bz-actions"><button type="button" class="bz-btn sec" data-act="mcp">📋 ' + T('அளவுகளை நகலெடு', 'Copy measurements') + '</button>' + (cu.ph ? waBtn(cu.ph, measText(cu), T('வாடிக்கையாளருக்கு அனுப்பு', 'Send to customer')) : '') + '</div>' : '');
        $(pane, '[data-k=mc]').addEventListener('change', e => { mCust = e.target.value || null; drawMeas(pane); });
        $(pane, '[data-act=mnew]').onclick = () => { const n = $(pane, '[data-k=mnew]').value.trim(); if (!n) return; const c = { id: uid(), n: n, ph: '', m: {} }; db.cust.push(c); save(); mCust = c.id; drawMeas(pane); };
        if (!cu) return;
        $$(pane, '[data-tab]').forEach(b => { b.onclick = () => { mType = b.getAttribute('data-tab'); drawMeas(pane); }; });
        MEASURES[mType].f.forEach((f, i) => { $(pane, '[data-k=m' + i + ']').addEventListener('input', e => { cu.m = cu.m || {}; cu.m[mType] = cu.m[mType] || {}; cu.m[mType][f] = e.target.value; save(); }); });
        $(pane, '[data-k=mnote]').addEventListener('input', e => { cu.m = cu.m || {}; cu.m[mType] = cu.m[mType] || {}; cu.m[mType]._note = e.target.value; save(); });
        $(pane, '[data-act=mcp]').onclick = function () { copyText(measText(cu), this); };
      }
      function measText(cu) {
        const L = [cu.n + (cu.ph ? ' · ' + cu.ph : '')];
        Object.keys(MEASURES).forEach(k => { const m = (cu.m || {})[k]; if (!m) return; const parts = MEASURES[k].f.filter(f => m[f]).map(f => sh(f) + ' ' + m[f]); if (parts.length || m._note) L.push(sh(MEASURES[k].ta) + ': ' + parts.join(', ') + (m._note ? ' (' + m._note + ')' : '')); });
        return L.join('\n');
      }

      /* ---------- settings */
      function drawSettings(pane) {
        pane.innerHTML = '<div class="bz-grid">' + textField(T('கடை பெயர்', 'Shop name'), 'sn', db.shop.n) + field(T('கடை போன்', 'Shop phone'), 'sp', db.shop.ph, { mode: 'tel' }) + '</div>' +
          '<div class="bz-grid one">' + textField(T('முகவரி (ரசீதில் வரும்)', 'Address (printed on the slip)'), 'sa', db.shop.ad) + '</div>' +
          '<div class="bz-grid">' + field(T('அடுத்த டோக்கன் எண்', 'Next token number'), 'nx', db.next) + selectField(T('ரசீது அகலம்', 'Slip width'), 'sw', [['384', '58 mm thermal'], ['576', '80 mm thermal'], ['800', T('போன் / WhatsApp படம்', 'Phone / WhatsApp picture')]], db.width) + '</div>' +
          '<div class="bz-info">' + T('இந்த ஆர்டர் புத்தகம் இந்த phone-ன் browser-ல் மட்டும் சேமிக்கப்படுகிறது; எங்கள் server-க்கு எதுவும் வராது. 📊 இன்று பகுதியில் Backup எடுக்கலாம்.', 'This order book is stored only in this phone\'s browser; nothing reaches our server. Take backups from 📊 Today.') + '</div>';
        const map = { sn: v => { db.shop.n = v; }, sp: v => { db.shop.ph = v; }, sa: v => { db.shop.ad = v; }, nx: v => { const n = Math.floor(num(v)); if (n > 0) db.next = n; }, sw: v => { db.width = v; } };
        Object.keys(map).forEach(k => { const i = $(pane, '[data-k=' + k + ']'); const h = () => { map[k](i.value); save(); }; i.addEventListener('input', h); i.addEventListener('change', h); });
      }
      if (!db.orders.length && !db.shop.n) view = 'set';
      form = blankForm(); draw();
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
      function acts() { // update in place: re-creating the buttons on blur would swallow the tap
        const a = $(root, '[data-k=acts]');
        if (!$(a, '[data-act=cp]')) { a.innerHTML = waBtn(S.phone, text) + '<button type="button" class="bz-btn sec" data-act="cp">📋 ' + T('நகலெடு', 'Copy') + '</button>'; $(a, '[data-act=cp]').onclick = function () { copyText(text, this); }; }
        $(a, 'a.bz-btn').href = waLink(S.phone, text);
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
  /* ===================================================================== 9. quickbill — WhatsApp order → bill + UPI pay link / QR */
  let qrLibP = null;
  const loadQr = () => qrLibP || (qrLibP = new Promise((res, rej) => { if (window.qrcode) return res(window.qrcode); const sc = document.createElement('script'); sc.src = '/libs/qrcode-generator.js?v=1'; sc.onload = () => res(window.qrcode); sc.onerror = () => { qrLibP = null; rej(new Error('QR library could not load')); }; document.head.appendChild(sc); }));
  function drawQr(ctx, qrc, text, x, y, size) {
    const q = qrc(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = size / (n + 8), off = cell * 4;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, size, size); ctx.fillStyle = '#000000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(Math.floor(x + off + c * cell), Math.floor(y + off + r * cell), Math.ceil(cell), Math.ceil(cell));
  }
  TOOL_IMPL.quickbill = {
    mount(body) {
      const root = makeRoot(body), KEY = 'bz_qbill_v1';
      const D = { shop: '', vpa: '', pn: '', phone: '', round: true, delivery: '', next: 1, rates: {}, bills: [], shopPhone: '', clist: '' };
      let db = Object.assign({}, D, lsGet(KEY, {})); if (!Array.isArray(db.bills)) db.bills = []; if (!db.rates || typeof db.rates !== 'object') db.rates = {};
      let view = (db.vpa || db.shop) ? 'bill' : 'set', bill = null, flash = '', filter = 'unpaid';
      const save = () => { if (!lsSet(KEY, db)) flash = T('சேமிக்க முடியவில்லை — Backup எடுத்து பழைய பில்களை நீக்குங்கள்.', 'Could not save — take a backup and delete old bills.'); };
      const nm = g => isEn() ? g[2] : g[1];
      const ul = u => (UNIT_LABEL[u] || [u, u])[isEn() ? 1 : 0];
      const rateKey = l => (l.id || ('x:' + (phon(l.name) || tamilKey(l.name)))) + '|' + RATE_UNIT[l.unit];
      const rateFor = l => { if (l.unit === 'rs') return ''; const v = db.rates[rateKey(l)]; return v != null ? String(v) : ''; };
      function newBill() { return { text: '', cust: '', cph: '', lines: [], delivery: db.delivery || '', discount: '', roundOff: db.round !== false, no: null }; }
      function fromText(text) {
        const lines = parseOrder(text).map(p => {
          const m = matchName(p.name), g = m ? goodsById(m.id) : null;
          let unit = p.unit, qty = p.qty == null ? 1 : p.qty;
          if (!unit) { unit = g ? g[3] : 'pc'; if ((unit === 'kg' || unit === 'l') && qty >= 50) unit = unit === 'kg' ? 'g' : 'ml'; } // "inji 100" means 100 g
          if (g && (unit === 'kg' || unit === 'g') && (g[3] === 'l')) unit = unit === 'kg' ? 'l' : 'ml';
          const l = { id: g ? g[0] : null, name: g ? nm(g) : p.name, said: p.raw, qty: String(qty), unit: unit, rate: '', check: !m || !m.exact };
          l.rate = rateFor(l); return l;
        });
        return lines;
      }
      function nav() {
        const unpaid = db.bills.filter(b => !b.paid).length;
        return '<div class="bz-tabs">' + [['bill', '🧾 ' + T('பில் போடு', 'Make bill')], ['list', '📋 ' + T('பில்கள்', 'Bills') + (unpaid ? '<span class="bz-badge">' + unpaid + '</span>' : '')], ['rates', '🏷️ ' + T('என் விலைகள்', 'My prices')], ['set', '⚙️ ' + T('கடை & UPI', 'Shop & UPI')], ['cust', '🛒 ' + T('வாடிக்கையாளர்', 'Customer')]]
          .map(i => '<button type="button" class="bz-tab' + (i[0] === view ? ' on' : '') + '" data-view="' + i[0] + '">' + i[1] + '</button>').join('') + '</div>';
      }
      function draw() {
        root.innerHTML = purpose('WhatsApp-ல் வந்த ஆர்டரை ("தக்காளி 2 கிலோ, வெண்டைக்காய் 250 கிராம், புதினா 10 ரூபாய்") இங்கே ஒட்டினால் தானாக அட்டவணை + மொத்தத் தொகை. உங்கள் GPay / PhonePe UPI ID-க்கு பணம் செலுத்தும் இணைப்பு, QR-உடன் பில்லை ஒரே தொடுதலில் அனுப்புங்கள்.',
          'Paste the WhatsApp order ("tomato 2 kg, okra 250 g, mint ₹10") and get a table with the total. Send the bill with a pay link and QR for your own GPay / PhonePe UPI ID in one tap.') +
          nav() + (flash ? '<div class="bz-msg">' + esc(flash) + '</div>' : '') + '<div data-k="pane"></div>';
        $$(root, '[data-view]').forEach(b => { b.onclick = () => { view = b.getAttribute('data-view'); flash = ''; draw(); }; });
        const pane = $(root, '[data-k=pane]');
        ({ bill: drawBill, list: drawList, rates: drawRates, set: drawSet, cust: drawCust })[view](pane);
      }

      /* ---------- make a bill */
      function drawBill(pane) {
        if (!bill) bill = newBill();
        const t = qbTotals(bill), opts = GOODS.map(g => '<option value="' + esc(nm(g)) + '"></option>').join('');
        pane.innerHTML = (db.vpa ? '' : '<div class="bz-info">⚙️ ' + T('"கடை & UPI" பகுதியில் உங்கள் UPI ID-ஐ ஒருமுறை சேமித்தால், பில்லுடன் பணம் செலுத்தும் இணைப்பும் QR-உம் வரும்.', 'Save your UPI ID once in "Shop & UPI" to add a pay link and QR to every bill.') + '</div>') +
          '<div class="bz-f"><label>' + T('வாடிக்கையாளர் அனுப்பிய ஆர்டர் (WhatsApp-ல் இருந்து நகலெடுத்து இங்கே ஒட்டுங்கள்)', 'Customer\'s order (copy from WhatsApp and paste here)') + '</label><textarea data-k="text" placeholder="' + esc('தக்காளி 2 கிலோ\nvendaka 250 gm\nputhina 10 rs') + '">' + esc(bill.text) + '</textarea></div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn" data-act="parse">➡️ ' + T('அட்டவணை போடு', 'Make the table') + '</button><button type="button" class="bz-btn sec" data-act="paste">📋 ' + T('ஒட்டு (Paste)', 'Paste') + '</button><button type="button" class="bz-btn sec" data-act="new">🧹 ' + T('புதிய பில்', 'New bill') + '</button></div>' +
          '<div class="bz-grid">' + textField(T('வாடிக்கையாளர் பெயர்', 'Customer name'), 'cust', bill.cust) + field(T('வாடிக்கையாளர் WhatsApp', 'Customer WhatsApp'), 'cph', bill.cph, { mode: 'tel' }) + '</div>' +
          '<datalist id="bz-qb-goods">' + opts + '</datalist><div class="bz-items" data-k="lines"></div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="add">➕ ' + T('பொருள் சேர்', 'Add item') + '</button></div>' +
          '<div class="bz-grid">' + field(T('டெலிவரி கட்டணம் (₹)', 'Delivery (₹)'), 'delivery', bill.delivery, { ph: '0' }) + field(T('தள்ளுபடி (₹)', 'Discount (₹)'), 'discount', bill.discount, { ph: '0' }) + '</div>' +
          '<label class="bz-chk"><input type="checkbox" data-k="roundOff"' + (bill.roundOff ? ' checked' : '') + '> ' + T('மொத்தத்தை முழு ரூபாய்க்கு மாற்று (round off)', 'Round the total to whole rupees') + '</label>' +
          '<div data-k="tot"></div>' +
          '<div class="bz-actions"><a class="bz-btn green" data-k="wa" target="_blank" rel="noopener" href="#">💬 ' + T('WhatsApp-ல் அனுப்பு', 'Send on WhatsApp') + '</a><button type="button" class="bz-btn sec" data-act="copy">📋 ' + T('பில் உரை நகலெடு', 'Copy bill text') + '</button><button type="button" class="bz-btn sec" data-act="img">🖼️ ' + T('பில் படம் + QR', 'Bill picture + QR') + '</button></div>' +
          '<canvas class="bz-canvas" data-k="cv" hidden></canvas><div class="bz-actions" data-k="imgacts" hidden><button type="button" class="bz-btn" data-act="dl">⬇️ PNG</button><button type="button" class="bz-btn green" data-act="share">📤 ' + T('பகிர்', 'Share') + '</button></div>' +
          '<div class="bz-info">' + T('விலைகள் உங்களுடையவை — ஒருமுறை எழுதினால் அடுத்த பில்லில் தானாக வரும். ⚠️ குறியிட்ட பொருளை ஒருமுறை சரிபாருங்கள்.', 'Prices are yours — type once and they come back next time. Check rows marked ⚠️.') + '</div>';
        drawLines(); refresh();
        const ta = $(pane, '[data-k=text]'); ta.addEventListener('input', () => { bill.text = ta.value; });
        $(pane, '[data-act=parse]').onclick = () => { bill.text = ta.value; const add = fromText(bill.text); if (!add.length) { flash = T('பொருள் எதுவும் கண்டுபிடிக்க முடியவில்லை. ஒவ்வொரு பொருளையும் தனி வரியில் அல்லது காற்புள்ளியுடன் எழுதுங்கள்.', 'No items found. Put each item on its own line or separate with commas.'); draw(); return; } bill.lines = bill.lines.filter(l => String(l.name).trim()).concat(add); flash = ''; drawBill(pane); };
        $(pane, '[data-act=paste]').onclick = async () => { try { const v = await navigator.clipboard.readText(); if (v) { bill.text = v; ta.value = v; $(pane, '[data-act=parse]').click(); } } catch (e) { ta.focus(); flash = T('நேரடியாக ஒட்ட முடியவில்லை — பெட்டியை நீண்ட நேரம் அழுத்தி "Paste" தட்டுங்கள்.', 'Could not paste directly — long-press the box and tap Paste.'); draw(); } };
        $(pane, '[data-act=new]').onclick = () => { bill = newBill(); flash = ''; drawBill(pane); };
        $(pane, '[data-act=add]').onclick = () => { bill.lines.push({ id: null, name: '', said: '', qty: '1', unit: 'kg', rate: '', check: false }); drawLines(); const ins = $$(pane, '[data-lf=name]'); if (ins.length) ins[ins.length - 1].focus(); };
        ['cust', 'cph', 'delivery', 'discount'].forEach(k => { const i = $(pane, '[data-k=' + k + ']'); i.addEventListener('input', () => { bill[k] = i.value; refresh(); }); });
        $(pane, '[data-k=roundOff]').addEventListener('change', e => { bill.roundOff = e.target.checked; refresh(); });
        $(pane, '[data-k=wa]').addEventListener('click', () => { commit(); });
        $(pane, '[data-act=copy]').onclick = function () { commit(); copyText(billText(bill), this); };
        $(pane, '[data-act=img]').onclick = async () => { commit(); const cv = $(pane, '[data-k=cv]'); try { await paintBillImg(cv, bill); cv.hidden = false; $(pane, '[data-k=imgacts]').hidden = false; } catch (e) { flash = T('படம் உருவாக்க முடியவில்லை (இணைய இணைப்பைச் சரிபாருங்கள்)', 'Could not make the picture (check the internet connection)'); draw(); } };
        $(pane, '[data-act=dl]').onclick = () => saveCanvas($(pane, '[data-k=cv]'), 'bill-' + (bill.no || '') + '.png');
        $(pane, '[data-act=share]').onclick = async () => { const cv = $(pane, '[data-k=cv]'); if (!(await shareCanvas(cv, 'bill-' + bill.no + '.png', billText(bill)))) saveCanvas(cv, 'bill-' + bill.no + '.png'); };
      }
      function drawLines() {
        const box = $(root, '[data-k=lines]'); if (!box) return;
        if (!bill.lines.length) { box.innerHTML = ''; return; }
        const units = ['kg', 'g', 'l', 'ml', 'pc', 'bunch', 'dozen', 'muzham', 'rs'];
        box.innerHTML = bill.lines.map((l, i) => '<div class="bz-ol"' + (l.check ? ' style="border-color:#F3DFA2;background:#FFFBEF"' : '') + '>' +
          '<input class="full" type="text" list="bz-qb-goods" data-li="' + i + '" data-lf="name" value="' + esc(l.name) + '" placeholder="' + esc(T('பொருள்', 'Item')) + '">' +
          (l.said ? '<small class="full" style="color:var(--sub);font-weight:600">' + (l.check ? '⚠️ ' : '') + T('வாடிக்கையாளர் எழுதியது: ', 'Customer wrote: ') + esc(l.said) + '</small>' : '') +
          '<input type="text" inputmode="decimal" data-li="' + i + '" data-lf="qty" value="' + esc(l.qty) + '" aria-label="qty">' +
          '<select data-li="' + i + '" data-lf="unit">' + units.map(u => '<option value="' + u + '"' + (u === l.unit ? ' selected' : '') + '>' + esc(ul(u)) + '</option>').join('') + '</select>' +
          (l.unit === 'rs' ? '<div class="full" style="font-size:13px;color:var(--sub);font-weight:700">' + T('ரூபாய்க்குக் கேட்டது — தொகை மாறாது', 'Asked by rupees — amount is fixed') + '</div>'
            : '<input type="text" inputmode="decimal" data-li="' + i + '" data-lf="rate" value="' + esc(l.rate) + '" placeholder="' + esc('₹ / ' + ul(RATE_UNIT[l.unit])) + '">') +
          '<div class="amt' + (l.unit === 'rs' ? ' full' : '') + '"><span data-amt="' + i + '">' + inr(qbLine(l)) + '</span><button type="button" class="bz-x" data-rm="' + i + '" aria-label="remove">✕</button></div></div>').join('');
        $$(box, '[data-lf]').forEach(inp => {
          inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
            const i = +inp.getAttribute('data-li'), l = bill.lines[i], f = inp.getAttribute('data-lf'); l[f] = inp.value;
            if (f === 'name') { const g = GOODS.find(x => x[1] === l.name || x[2] === l.name); l.id = g ? g[0] : null; l.check = false; const r = rateFor(l); if (r !== '') { l.rate = r; const ri = $(box, '[data-li="' + i + '"][data-lf="rate"]'); if (ri) ri.value = r; } }
            if (f === 'unit') { const r = rateFor(l); if (r !== '') l.rate = r; drawLines(); }
            refresh();
          });
        });
        $$(box, '[data-rm]').forEach(b => { b.onclick = () => { bill.lines.splice(+b.getAttribute('data-rm'), 1); drawLines(); refresh(); }; });
      }
      function refresh() {
        const t = qbTotals(bill), tot = $(root, '[data-k=tot]'); if (!tot) return;
        bill.lines.forEach((l, i) => { const a = $(root, '[data-amt="' + i + '"]'); if (a) a.textContent = inr(qbLine(l)); });
        const missing = bill.lines.filter(l => String(l.name).trim() && l.unit !== 'rs' && !(num(l.rate) > 0)).length;
        tot.innerHTML = resCard(T('மொத்தம்', 'Total') + ' · ' + bill.lines.filter(l => String(l.name).trim()).length + ' ' + T('பொருட்கள்', 'items'), inr(t.total), (t.del ? T('டெலிவரி ', 'Delivery ') + inr(t.del) + ' · ' : '') + (t.dis ? T('தள்ளுபடி ', 'Discount ') + inr(t.dis) + ' · ' : '') + (t.roundOff ? 'round off ' + (t.roundOff > 0 ? '+' : '') + fmtNum(t.roundOff, 2) : '') + (missing ? ' ⚠️ ' + missing + T(' பொருளுக்கு விலை இல்லை', ' item(s) without a price') : ''), missing ? 'warn' : 'ok');
        const wa = $(root, '[data-k=wa]'); if (wa) wa.href = waLink(bill.cph, billText(bill));
      }
      function commit() { // give the bill a number, remember the prices, keep it in the list
        bill.lines.forEach(l => { if (l.unit !== 'rs' && num(l.rate) > 0 && String(l.name).trim()) db.rates[rateKey(l)] = num(l.rate); });
        const t = qbTotals(bill);
        if (!bill.no) { bill.no = db.next; db.next = (Math.floor(num(db.next)) || 1) + 1; bill.d = todayIso(); const n = new Date(); bill.t = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); }
        const rec = { no: bill.no, d: bill.d, t: bill.t, cust: bill.cust, cph: bill.cph, lines: bill.lines.filter(l => String(l.name).trim()).map(l => ({ name: l.name, qty: l.qty, unit: l.unit, rate: l.rate, id: l.id })), delivery: bill.delivery, discount: bill.discount, roundOff: bill.roundOff, total: t.total };
        const i = db.bills.findIndex(b => b.no === bill.no);
        if (i >= 0) { rec.paid = db.bills[i].paid; rec.pm = db.bills[i].pm; rec.pd = db.bills[i].pd; db.bills[i] = rec; } else { rec.paid = false; db.bills.push(rec); }
        save(); const wa = $(root, '[data-k=wa]'); if (wa) wa.href = waLink(bill.cph, billText(bill));
      }
      function lineText(l) {
        const a = qbLine(l), q = fmtNum(num(l.qty), 3);
        if (l.unit === 'rs') return l.name + ' — ' + inr(a);
        if (l.unit === 'g' || l.unit === 'ml') return l.name + ' — ' + q + ' ' + ul(l.unit) + ' (' + inr(num(l.rate)) + '/' + ul(RATE_UNIT[l.unit]) + ') = ' + inr(a);
        return l.name + ' — ' + q + ' ' + ul(l.unit) + ' × ' + inr(num(l.rate)) + ' = ' + inr(a);
      }
      function payOf(b) { const t = qbTotals(b); return db.vpa && validVpa(db.vpa) && t.total > 0 ? payLink({ pa: db.vpa.trim(), pn: db.pn || db.shop, am: t.total, tn: 'Bill ' + (b.no || ''), shop: db.shop, bill: b.no, phone: db.phone }) : ''; }
      function billText(b) {
        const t = qbTotals(b), L = [];
        L.push('🧾 *' + (db.shop || T('பில்', 'Bill')) + '*' + (b.no ? ' — ' + T('பில் ', 'Bill ') + '#' + b.no : ''));
        L.push(dmy(b.d || todayIso()) + (b.t ? ' ' + b.t : '') + (b.cust ? ' · ' + b.cust : ''));
        L.push('');
        b.lines.filter(l => String(l.name).trim()).forEach((l, i) => L.push((i + 1) + '. ' + lineText(l)));
        L.push('');
        if (t.del) L.push(T('டெலிவரி: ', 'Delivery: ') + inr(t.del)); if (t.dis) L.push(T('தள்ளுபடி: ', 'Discount: ') + '− ' + inr(t.dis)); if (t.roundOff) L.push('Round off: ' + (t.roundOff > 0 ? '+' : '') + fmtNum(t.roundOff, 2));
        L.push('*' + T('மொத்தம்: ', 'Total: ') + inr(t.total) + '*');
        const pl = payOf(b);
        if (pl) { L.push(''); L.push('💳 ' + T('GPay / PhonePe / எந்த UPI-லும் செலுத்த:', 'Pay by GPay / PhonePe / any UPI:')); L.push(pl); L.push('UPI ID: ' + db.vpa.trim()); }
        L.push(''); L.push(T('நன்றி 🙏', 'Thank you 🙏') + (db.phone ? ' · ' + db.phone : ''));
        return L.join('\n');
      }
      async function paintBillImg(cv, b) {
        const t = qbTotals(b), lines = b.lines.filter(l => String(l.name).trim()), W = 800, pad = 40, rowH = 52;
        const upi = db.vpa && validVpa(db.vpa) && t.total > 0 ? upiString({ pa: db.vpa.trim(), pn: db.pn || db.shop, am: t.total, tn: 'Bill ' + b.no }) : '';
        const qrSize = upi ? 420 : 0, H = 190 + lines.length * rowH + 150 + (upi ? qrSize + 130 : 40);
        const qrc = upi ? await loadQr() : null;
        cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#176B45'; ctx.fillRect(0, 0, W, 130);
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        fitFont(ctx, db.shop || T('பில்', 'Bill'), W - 2 * pad, 50, '800', 24); ctx.fillText(db.shop || T('பில்', 'Bill'), W / 2, 50);
        const sub = T('பில் #', 'Bill #') + b.no + ' · ' + dmy(b.d) + (b.cust ? ' · ' + b.cust : ''); fitFont(ctx, sub, W - 2 * pad, 28, '600', 16); ctx.fillText(sub, W / 2, 100);
        let y = 165; ctx.fillStyle = '#111827';
        lines.forEach((l, i) => {
          if (i % 2 === 0) { ctx.fillStyle = '#F3F4F6'; ctx.fillRect(0, y - rowH / 2, W, rowH); ctx.fillStyle = '#111827'; }
          const amt = inr(qbLine(l)); ctx.font = '800 28px ' + FONT; const aw = ctx.measureText(amt).width;
          ctx.textAlign = 'right'; ctx.fillText(amt, W - pad, y);
          const left = l.name + '  ' + (l.unit === 'rs' ? '' : fmtNum(num(l.qty), 3) + ' ' + ul(l.unit));
          ctx.textAlign = 'left'; fitFont(ctx, left, W - 2 * pad - aw - 20, 28, '600', 14); ctx.fillText(left, pad, y); y += rowH;
        });
        y += 10; ctx.fillStyle = '#176B45'; ctx.fillRect(pad, y, W - 2 * pad, 3); y += 45; ctx.fillStyle = '#111827';
        const extra = [t.del ? T('டெலிவரி ', 'Delivery ') + inr(t.del) : '', t.dis ? T('தள்ளுபடி ', 'Discount ') + '−' + inr(t.dis) : ''].filter(Boolean).join('  ·  ');
        if (extra) { ctx.textAlign = 'center'; fitFont(ctx, extra, W - 2 * pad, 26, '500', 14); ctx.fillText(extra, W / 2, y); y += 40; }
        ctx.textAlign = 'center'; ctx.font = '900 46px ' + FONT; ctx.fillText(T('மொத்தம் ', 'Total ') + inr(t.total), W / 2, y + 10); y += 70;
        if (upi) {
          drawQr(ctx, qrc, upi, (W - qrSize) / 2, y, qrSize); y += qrSize + 30;
          ctx.fillStyle = '#111827'; fitFont(ctx, T('GPay / PhonePe / எந்த UPI app-லும் ஸ்கேன் செய்யுங்கள்', 'Scan with GPay / PhonePe / any UPI app'), W - 2 * pad, 26, '700', 14); ctx.fillText(T('GPay / PhonePe / எந்த UPI app-லும் ஸ்கேன் செய்யுங்கள்', 'Scan with GPay / PhonePe / any UPI app'), W / 2, y); y += 38;
          fitFont(ctx, 'UPI ID: ' + db.vpa.trim(), W - 2 * pad, 26, '600', 14); ctx.fillText('UPI ID: ' + db.vpa.trim(), W / 2, y);
        }
        ctx.fillStyle = '#9CA3AF'; ctx.font = '500 20px ' + FONT; ctx.fillText('pdftoolsindia.com', W / 2, H - 22);
      }

      /* ---------- bills list */
      function drawList(pane) {
        const iso = todayIso(), today = db.bills.filter(b => b.d === iso);
        const sum = (arr, f) => round2(arr.reduce((a, b) => a + (f(b) ? n0(b.total) : 0), 0));
        const rows = db.bills.filter(b => filter === 'all' || (filter === 'unpaid' ? !b.paid : b.paid)).sort((a, b) => b.no - a.no).slice(0, 300);
        pane.innerHTML = '<div class="bz-stats"><div class="bz-stat"><b>' + today.length + '</b><span>' + T('இன்றைய பில்கள்', "Today's bills") + '</span></div><div class="bz-stat"><b>' + inr(sum(today, () => true)) + '</b><span>' + T('இன்றைய மொத்தம்', 'Billed today') + '</span></div><div class="bz-stat"><b>' + inr(sum(db.bills, b => b.paid && b.pd === iso)) + '</b><span>' + T('இன்று வந்த பணம்', 'Received today') + '</span></div><div class="bz-stat"><b>' + inr(sum(db.bills, b => !b.paid)) + '</b><span>' + T('இன்னும் வர வேண்டியது', 'Still to collect') + '</span></div></div>' +
          '<div class="bz-chips">' + [['unpaid', T('பணம் வர வேண்டியவை', 'Unpaid')], ['paid', T('பணம் வந்தவை', 'Paid')], ['all', T('எல்லாம்', 'All')]].map(f => '<button type="button" class="bz-chip' + (f[0] === filter ? ' on' : '') + '" data-flt="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
          '<div class="bz-list">' + (rows.length ? rows.map(b => '<div class="bz-card" style="cursor:default;flex-wrap:wrap"><span><b>#' + b.no + ' · ' + esc(b.cust || T('பெயர் இல்லை', 'No name')) + '</b><small>' + esc(dmy(b.d)) + ' ' + esc(b.t || '') + ' · ' + b.lines.length + T(' பொருட்கள்', ' items') + (b.paid ? ' · ✅ ' + (b.pm === 'upi' ? 'UPI' : T('ரொக்கம்', 'Cash')) : '') + '</small></span><span class="bz-amt ' + (b.paid ? 'adv' : 'owe') + '">' + inr(b.total) + '</span>' +
            '<div class="bz-actions" style="width:100%;margin-top:6px">' + (b.paid ? '<button type="button" class="bz-btn sec sm" data-unpay="' + b.no + '">↩️ ' + T('பணம் வரவில்லை', 'Mark unpaid') + '</button>' + (b.cph ? '<a class="bz-btn green sm" target="_blank" rel="noopener" href="' + esc(waLink(b.cph, T('வணக்கம் ', 'Hello ') + (b.cust || '') + ', ' + T('பில் #', 'bill #') + b.no + ' — ' + inr(b.total) + T(' பணம் பெற்றோம். நன்றி 🙏', ' received. Thank you 🙏') + (db.shop ? ' — ' + db.shop : ''))) + '">💬 ' + T('பெற்றோம் செய்தி', 'Receipt msg') + '</a>' : '')
              : '<button type="button" class="bz-btn green sm" data-pay="' + b.no + '" data-m="upi">✅ UPI ' + T('வந்தது', 'received') + '</button><button type="button" class="bz-btn sm" data-pay="' + b.no + '" data-m="cash">💵 ' + T('ரொக்கம் வந்தது', 'Cash received') + '</button>' + (b.cph ? '<a class="bz-btn sec sm" target="_blank" rel="noopener" href="' + esc(waLink(b.cph, billText(b))) + '">💬 ' + T('மீண்டும் அனுப்பு', 'Resend') + '</a>' : '')) +
            '<button type="button" class="bz-btn sec sm" data-edit="' + b.no + '">✏️</button><button type="button" class="bz-x" data-del="' + b.no + '" aria-label="delete">✕</button></div></div>').join('') : '<div class="bz-info">' + T('இங்கே பில் இல்லை.', 'No bills here.') + '</div>') + '</div>' +
          '<div class="bz-info">' + T('பணம் வந்ததா என்பதை உங்கள் GPay / PhonePe / வங்கி app-ல் பார்த்த பிறகே "வந்தது" தட்டுங்கள். வாடிக்கையாளரின் "செலுத்தினேன்" செய்தி மட்டும் ஆதாரம் அல்ல.', 'Tap "received" only after you see the money in your GPay / PhonePe / bank app. The customer\'s "I paid" message alone is not proof.') + '</div>' +
          '<div class="bz-actions"><button type="button" class="bz-btn sec sm" data-act="csv">📊 Excel (.csv)</button><button type="button" class="bz-btn sec sm" data-act="bk">💾 Backup</button><label class="bz-btn sec sm" style="cursor:pointer">📂 ' + T('மீட்டெடு', 'Restore') + '<input type="file" accept=".json,application/json" data-act="rs" hidden></label></div>';
        const find = no => db.bills.find(b => b.no === +no);
        $$(pane, '[data-flt]').forEach(b => { b.onclick = () => { filter = b.getAttribute('data-flt'); drawList(pane); }; });
        $$(pane, '[data-pay]').forEach(b => { b.onclick = () => { const x = find(b.getAttribute('data-pay')); if (x) { x.paid = true; x.pm = b.getAttribute('data-m'); x.pd = todayIso(); save(); drawList(pane); } }; });
        $$(pane, '[data-unpay]').forEach(b => { b.onclick = () => { const x = find(b.getAttribute('data-unpay')); if (x) { x.paid = false; delete x.pd; save(); drawList(pane); } }; });
        $$(pane, '[data-edit]').forEach(b => { b.onclick = () => { const x = find(b.getAttribute('data-edit')); if (!x) return; bill = { text: '', cust: x.cust, cph: x.cph, lines: x.lines.map(l => Object.assign({ said: '', check: false }, l)), delivery: x.delivery, discount: x.discount, roundOff: x.roundOff, no: x.no, d: x.d, t: x.t }; view = 'bill'; draw(); window.scrollTo(0, 0); }; });
        $$(pane, '[data-del]').forEach(b => { b.onclick = () => { if (!window.confirm(T('இந்தப் பில்லை நீக்கவா?', 'Delete this bill?'))) return; db.bills = db.bills.filter(x => x.no !== +b.getAttribute('data-del')); save(); drawList(pane); }; });
        $(pane, '[data-act=csv]').onclick = () => { const rows2 = [['Bill', 'Date', 'Time', 'Customer', 'Phone', 'Items', 'Total', 'Paid', 'Mode', 'Paid on']].concat(db.bills.map(b => [b.no, b.d, b.t, b.cust, b.cph, b.lines.map(l => l.name + ' ' + l.qty + ' ' + l.unit).join('; '), b.total, b.paid ? 'yes' : 'no', b.pm || '', b.pd || ''])); const bl = new Blob(['﻿' + rows2.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); if (typeof downloadBlob === 'function') downloadBlob(bl, 'bills-' + todayIso() + '.csv'); };
        $(pane, '[data-act=bk]').onclick = () => { const bl = new Blob([JSON.stringify(db)], { type: 'application/json' }); if (typeof downloadBlob === 'function') downloadBlob(bl, 'quick-bill-backup-' + todayIso() + '.json'); };
        $(pane, '[data-act=rs]').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const v = JSON.parse(String(r.result)); if (!v || !Array.isArray(v.bills)) throw new Error('bad'); if (!window.confirm(T('இப்போது உள்ள பில்கள் இந்த Backup-ஆல் மாற்றப்படும். தொடரவா?', 'Current bills will be replaced by this backup. Continue?'))) return; db = Object.assign({}, D, v); save(); flash = T('மீட்டெடுக்கப்பட்டது', 'Restored'); draw(); } catch (err) { flash = T('இது சரியான Backup file இல்லை', 'Not a valid backup file'); draw(); } }; r.readAsText(f); };
      }

      /* ---------- my prices (and today's price list) */
      function drawRates(pane) {
        let q = '';
        pane.innerHTML = '<div class="bz-info">' + T('தினமும் விலை மாறினால் இங்கே மாற்றுங்கள்; பில்லில் தானாக வரும். "இன்றைய விலை" செய்தியை வாடிக்கையாளர் குழுவுக்கு அனுப்பலாம்.', 'If prices change daily, update them here; bills pick them up. Send "today\'s prices" to your customer group.') + '</div>' +
          '<div class="bz-f"><input type="text" data-k="rq" placeholder="' + esc(T('பொருள் தேடு (தக்காளி / tomato / thakkali)', 'Search item (tomato / thakkali)')) + '"></div><div class="bz-list" data-k="rl"></div>' +
          '<div class="bz-actions"><a class="bz-btn green" data-k="rwa" target="_blank" rel="noopener" href="#">💬 ' + T('இன்றைய விலை — WhatsApp', "Today's prices — WhatsApp") + '</a><button type="button" class="bz-btn sec" data-act="rcp">📋 ' + T('நகலெடு', 'Copy') + '</button><button type="button" class="bz-btn sec" data-act="rcard">🏷️ ' + T('விலைப்பட்டியல் படம்', 'Price-list picture') + '</button></div>';
        const priced = () => GOODS.filter(g => db.rates[g[0] + '|' + RATE_UNIT[g[3]]] != null);
        const todayText = () => ['🛒 *' + (db.shop || T('இன்றைய விலை', "Today's prices")) + '* — ' + T('இன்றைய விலை ', 'prices ') + dmy(todayIso()), ''].concat(priced().map(g => nm(g) + ' — ' + inr(db.rates[g[0] + '|' + RATE_UNIT[g[3]]]) + ' / ' + ul(RATE_UNIT[g[3]]))).concat(['', T('ஆர்டருக்கு WhatsApp செய்யுங்கள்', 'WhatsApp your order') + (db.phone ? ': ' + db.phone : '')]).join('\n');
        function fill() {
          const s = q.trim(), k = phon(s), list = GOODS.filter(g => !s || g[1].indexOf(s) >= 0 || g[2].toLowerCase().indexOf(s.toLowerCase()) >= 0 || (k.length >= 2 && (phon(g[4]).indexOf(k) >= 0))).sort((a, b) => (db.rates[b[0] + '|' + RATE_UNIT[b[3]]] != null) - (db.rates[a[0] + '|' + RATE_UNIT[a[3]]] != null));
          $(pane, '[data-k=rl]').innerHTML = list.slice(0, s ? 40 : 60).map(g => { const rk = g[0] + '|' + RATE_UNIT[g[3]]; return '<div class="bz-item"><span style="font-weight:700">' + esc(nm(g)) + ' <small style="color:var(--sub)">/ ' + esc(ul(RATE_UNIT[g[3]])) + '</small></span><input type="text" inputmode="decimal" data-rk="' + esc(rk) + '" value="' + esc(db.rates[rk] != null ? db.rates[rk] : '') + '" placeholder="₹"><span></span></div>'; }).join('');
          $$(pane, '[data-rk]').forEach(i => i.addEventListener('input', () => { const v = num(i.value); if (i.value.trim() === '') delete db.rates[i.getAttribute('data-rk')]; else if (v >= 0) db.rates[i.getAttribute('data-rk')] = v; save(); $(pane, '[data-k=rwa]').href = waLink('', todayText()); }));
          $(pane, '[data-k=rwa]').href = waLink('', todayText());
        }
        $(pane, '[data-k=rq]').addEventListener('input', e => { q = e.target.value; fill(); });
        $(pane, '[data-act=rcp]').onclick = function () { copyText(todayText(), this); };
        $(pane, '[data-act=rcard]').onclick = () => {
          const items = priced().map(g => ({ n: nm(g) + ' (' + ul(RATE_UNIT[g[3]]) + ')', p: String(db.rates[g[0] + '|' + RATE_UNIT[g[3]]]) }));
          if (!items.length) { flash = T('முதலில் விலைகளை எழுதுங்கள்', 'Type some prices first'); draw(); return; }
          const rc = lsGet('bz_ratecard_v1', {}) || {}; rc.preset = 'blank'; rc.items = items; rc.tag = T('இன்றைய விலை ', "Today's prices ") + dmy(todayIso()); if (db.shop) rc.shop = db.shop; if (db.phone) rc.phone = db.phone; lsSet('bz_ratecard_v1', rc);
          try { if (typeof openTool === 'function') { openTool('ratecard'); return; } } catch (e) { /* fall back */ }
          location.href = '/?tool=ratecard';
        };
        fill();
      }

      /* ---------- shop & UPI */
      function drawSet(pane) {
        pane.innerHTML = '<div class="bz-grid">' + textField(T('கடை பெயர்', 'Shop name'), 'shop', db.shop, 'எ.கா. முருகன் காய்கறி') + field(T('கடை WhatsApp எண்', 'Shop WhatsApp number'), 'phone', db.phone, { mode: 'tel' }) + '</div>' +
          '<div class="bz-grid">' + textField(T('UPI ID (GPay / PhonePe / Paytm)', 'UPI ID (GPay / PhonePe / Paytm)'), 'vpa', db.vpa, 'name@okaxis') + textField(T('UPI-ல் உள்ள பெயர் (ஆங்கிலத்தில்)', 'Name on UPI (in English)'), 'pn', db.pn) + '</div>' +
          '<div data-k="vmsg"></div>' +
          '<div class="bz-actions"><label class="bz-btn sec sm" style="cursor:pointer">📷 ' + T('என் கடை QR படத்திலிருந்து UPI ID எடு', 'Read UPI ID from my shop QR picture') + '<input type="file" accept="image/*" data-act="qrimg" hidden></label></div>' +
          '<div class="bz-grid">' + field(T('வழக்கமான டெலிவரி கட்டணம் (₹)', 'Usual delivery charge (₹)'), 'delivery', db.delivery, { ph: '0' }) + field(T('அடுத்த பில் எண்', 'Next bill number'), 'next', db.next) + '</div>' +
          '<label class="bz-chk"><input type="checkbox" data-k="round"' + (db.round !== false ? ' checked' : '') + '> ' + T('மொத்தத்தை முழு ரூபாய்க்கு மாற்று', 'Round totals to whole rupees') + '</label>' +
          '<div class="bz-actions" data-k="testpay"></div>' +
          '<div class="bz-info">' + T('பணம் நேரடியாக உங்கள் UPI கணக்குக்கே செல்லும்; நாங்கள் பணத்தைத் தொடுவதில்லை, கட்டணம் எதுவும் இல்லை. உங்கள் விவரங்கள் இந்த phone-ல் மட்டும் இருக்கும். UPI PIN, OTP-ஐ யாருக்கும் சொல்லாதீர்கள் — பணம் பெற PIN தேவையே இல்லை.', 'Money goes straight to your own UPI account; we never touch it and charge nothing. Your details stay on this phone. Never share your UPI PIN or OTP — you never need a PIN to receive money.') + '</div>' +
          '<div class="bz-info">' + T('குறிப்பு: வாடிக்கையாளர் பணம் செலுத்தியதும் தானாக உங்களுக்குச் செய்தி வர வேண்டுமென்றால் அதற்குக் கட்டண payment gateway தேவை. இங்கே இலவச வழி: பணம் வந்ததும் உங்கள் UPI app அறிவிப்பு வரும்; வாடிக்கையாளரும் பணம் செலுத்தும் பக்கத்தில் "செலுத்தினேன்" தட்டினால் உங்களுக்கு WhatsApp வரும்.', 'Note: an automatic "paid" alert from the bank needs a paid payment gateway. The free way here: your UPI app notifies you, and the customer can tap "I paid" on the pay page, which sends you a WhatsApp.') + '</div>';
        function check() {
          const v = String(db.vpa || '').trim(), m = $(pane, '[data-k=vmsg]'), tp = $(pane, '[data-k=testpay]');
          m.innerHTML = !v ? '' : validVpa(v) ? '<div class="bz-info">✅ ' + T('UPI ID சரியான வடிவில் உள்ளது. ஒருமுறை ₹1 சோதனைப் பணம் அனுப்பி உங்கள் கணக்குக்கு வருகிறதா என்று பாருங்கள்.', 'UPI ID looks valid. Send a ₹1 test payment once to confirm it reaches your account.') + '</div>' : '<div class="bz-msg">' + T('UPI ID சரியில்லை — name@bank போல இருக்க வேண்டும்', 'UPI ID looks wrong — it should look like name@bank') + '</div>';
          tp.innerHTML = validVpa(v) ? '<a class="bz-btn sec sm" target="_blank" rel="noopener" href="' + esc(payLink({ pa: v, pn: db.pn || db.shop, am: 1, tn: 'Test', shop: db.shop, bill: 'TEST', phone: db.phone, base: location.origin })) + '">🔍 ' + T('₹1 சோதனை பணம் செலுத்தும் பக்கம்', '₹1 test pay page') + '</a>' : '';
        }
        const map = { shop: v => { db.shop = v; }, phone: v => { db.phone = v; }, vpa: v => { db.vpa = v.trim(); }, pn: v => { db.pn = v; }, delivery: v => { db.delivery = v; }, next: v => { const n = Math.floor(num(v)); if (n > 0) db.next = n; } };
        Object.keys(map).forEach(k => { const i = $(pane, '[data-k=' + k + ']'); i.addEventListener('input', () => { map[k](i.value); save(); check(); }); });
        $(pane, '[data-k=round]').addEventListener('change', e => { db.round = e.target.checked; save(); });
        $(pane, '[data-act=qrimg]').onchange = async e => {
          const f = e.target.files && e.target.files[0]; if (!f) return;
          try {
            if (typeof ensureJsQr !== 'function') throw new Error('no decoder');
            const jsQR = await ensureJsQr(), img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(f); });
            const sc = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
            const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, c.width, c.height); const d = cx.getImageData(0, 0, c.width, c.height), r = jsQR(d.data, d.width, d.height);
            if (!r || !/^upi:\/\/pay\?/i.test(r.data)) throw new Error('not upi');
            const u = new URLSearchParams(r.data.replace(/^upi:\/\/pay\?/i, ''));
            if (!validVpa(u.get('pa'))) throw new Error('bad pa');
            db.vpa = u.get('pa'); if (u.get('pn')) db.pn = u.get('pn'); save(); flash = T('உங்கள் QR-லிருந்து UPI ID எடுக்கப்பட்டது: ', 'UPI ID read from your QR: ') + db.vpa; draw();
          } catch (err) { flash = T('இந்தப் படத்தில் UPI QR கண்டுபிடிக்க முடியவில்லை. தெளிவான QR படம் போடுங்கள் அல்லது UPI ID-ஐ நேரடியாக எழுதுங்கள்.', 'Could not find a UPI QR in this picture. Use a clear QR picture or type the UPI ID.'); draw(); }
        };
        check();
      }

      /* ---------- customer side: make a list and send it to the shop */
      function drawCust(pane) {
        const common = ['tomato', 'onion', 'sonion', 'potato', 'brinjal', 'okra', 'carrot', 'beans', 'gchilli', 'ginger', 'garlic', 'coriander', 'curryleaf', 'mint', 'coconut', 'lemon', 'banana', 'milk', 'egg', 'rice'];
        pane.innerHTML = '<div class="bz-info">' + T('வாடிக்கையாளர்களுக்கு: பொருளைத் தட்டி அளவைச் சேர்த்து, கடைக்கு WhatsApp-ல் ஒரே தொடுதலில் அனுப்புங்கள்.', 'For customers: tap items, set amounts and send the list to the shop on WhatsApp in one tap.') + '</div>' +
          '<div class="bz-grid one">' + field(T('கடையின் WhatsApp எண்', "Shop's WhatsApp number"), 'sph', db.shopPhone, { mode: 'tel' }) + '</div>' +
          '<div class="bz-chips">' + common.map(id => { const g = goodsById(id); return '<button type="button" class="bz-chip" data-cadd="' + id + '">' + esc(nm(g)) + '</button>'; }).join('') + '</div>' +
          '<div class="bz-f"><label>' + T('என் பட்டியல் (மாற்றலாம்)', 'My list (you can edit)') + '</label><textarea data-k="clist">' + esc(db.clist || '') + '</textarea></div>' +
          '<div class="bz-actions"><a class="bz-btn green" data-k="cwa" target="_blank" rel="noopener" href="#">💬 ' + T('கடைக்கு அனுப்பு', 'Send to shop') + '</a><button type="button" class="bz-btn sec" data-act="cclear">🧹 ' + T('காலி செய்', 'Clear') + '</button></div>';
        const ta = $(pane, '[data-k=clist]'), link = () => { $(pane, '[data-k=cwa]').href = waLink(db.shopPhone, T('வணக்கம், இந்தப் பொருட்கள் வேண்டும்:', 'Hello, please send:') + '\n' + (db.clist || '')); };
        $$(pane, '[data-cadd]').forEach(b => { b.onclick = () => { const g = goodsById(b.getAttribute('data-cadd')); const def = { kg: '1 ' + ul('kg'), bunch: '1 ' + ul('bunch'), pc: '1', dozen: '1 ' + ul('dozen'), l: '1 ' + ul('l'), muzham: '1 ' + ul('muzham') }[g[3]] || '1'; db.clist = (db.clist ? db.clist.replace(/\s+$/, '') + '\n' : '') + nm(g) + ' ' + def; ta.value = db.clist; save(); link(); }; });
        ta.addEventListener('input', () => { db.clist = ta.value; save(); link(); });
        $(pane, '[data-k=sph]').addEventListener('input', e => { db.shopPhone = e.target.value; save(); link(); });
        $(pane, '[data-act=cclear]').onclick = () => { db.clist = ''; ta.value = ''; save(); link(); };
        link();
      }
      draw();
    }
  };
})();
