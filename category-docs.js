/* category-docs.js — lazy-loaded business & personal document tools for pdftoolsindia.com
 *
 *   quotepo   — Quotation / Proforma / Tax Invoice / Cash Bill / Bill of Supply / Purchase Order / Delivery Challan
 *   (receipts and letters are added further down in this file)
 *
 * Plain browser JS, no build step. Globals from the host page: TOOL_IMPL, el, mountResult, mountProgress, downloadBlob,
 * escapeHtml, numberToWordsINR, embedUnicodeFont, getDocxLib, XLSX, PDFDocument, rgb, TamilCore, __appLang, ensureQrLib.
 * Everything runs in the browser; drafts, your business details and customers stay in this browser's localStorage.
 */
(function () {
  'use strict';

  /* =====================================================================
   * Shared helpers
   * ===================================================================== */
  const isEn = () => { try { return typeof __appLang !== 'undefined' && __appLang === 'en'; } catch (e) { return false; } };
  const B = (ta, en) => (isEn() ? en + ' · ' + ta : ta + ' · ' + en); // bilingual label, the user's language first
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  const localISO = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }; // NOT toISOString(): that is the UTC date (yesterday before 05:30 IST)
  const fmtDMY = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : (iso || ''); };
  const fyOf = (iso) => { const m = /^(\d{4})-(\d{2})/.exec(iso || '') || /^(\d{4})-(\d{2})/.exec(localISO()); const y = +m[1], mo = +m[2], s = mo >= 4 ? y : y - 1; return s + '-' + String((s + 1) % 100).padStart(2, '0'); };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inrPlain = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const words = (n) => numberToWordsINR(n);
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o); t[last] = v; };
  const fileSafe = (s) => { const r = String(s || '').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 40); return /[A-Za-z0-9]/.test(r) ? r : ''; };

  let cssDone = false;
  function injectCss() {
    if (cssDone || document.getElementById('dx-style')) { cssDone = true; return; }
    cssDone = true;
    const s = document.createElement('style');
    s.id = 'dx-style';
    s.textContent = `
    .dx{color:var(--ink);font-size:14px;line-height:1.45}
    .dx *{box-sizing:border-box;min-width:0}
    .dx h3.dx-h{margin:20px 0 8px;font-size:13px;font-weight:900;color:var(--brand-dark,#28407F);text-transform:none}
    .dx .dx-note{background:var(--chip,#EEF2FB);border-radius:12px;padding:10px 12px;font-size:13px;font-weight:600;line-height:1.55}
    .dx .dx-warn{background:#FFF8E6;border:1px solid #F3DFA2;color:#6B4E00;border-radius:12px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-top:8px}
    .dx .dx-err{background:#FDEDEC;border:1px solid #F5C6C2;color:#9B2C20;border-radius:12px;padding:9px 12px;font-size:13px;font-weight:700;margin-top:10px}
    .dx .dx-ok{background:#F0FAF4;border:1px solid #CDEBDA;color:#175C3B;border-radius:12px;padding:9px 12px;font-size:13px;font-weight:700;margin-top:10px}
    .dx .dx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .dx .dx-grid.one{grid-template-columns:1fr}.dx .dx-grid.three{grid-template-columns:1fr 1fr 1fr}
    .dx .dx-f{margin-top:10px}.dx .dx-grid .dx-f{margin-top:0}
    .dx label{display:block;font-size:12px;font-weight:700;color:var(--sub);margin-bottom:3px}
    .dx input[type=text],.dx input[type=number],.dx input[type=date],.dx input[type=email],.dx input[type=tel],.dx input[type=month],.dx select,.dx textarea{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:10px;padding:8px 11px;font-size:16px;font-family:inherit;background:#fff;color:var(--ink);outline:none}
    .dx textarea{min-height:64px;resize:vertical}
    .dx input:focus,.dx select:focus,.dx textarea:focus{border-color:var(--brand)}
    .dx input.bad{border-color:#C0392B;background:#FFF5F4}
    .dx .dx-hint{font-size:11.5px;color:var(--sub);font-weight:600;margin-top:3px;min-height:15px}
    .dx .dx-hint.ok{color:#176B45}.dx .dx-hint.bad{color:#B03A2E}
    .dx details{border:1px solid var(--line);border-radius:12px;background:#fff;padding:2px 12px;margin-top:10px}
    .dx details>summary{min-height:44px;display:flex;align-items:center;font-weight:800;font-size:13px;color:var(--brand-dark,#28407F);cursor:pointer}
    .dx details[open]{padding-bottom:12px}
    .dx .dx-item{border:1.5px solid var(--line);border-radius:14px;background:#fff;padding:10px;margin-top:10px}
    .dx .dx-ih{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-weight:900;font-size:13px}
    .dx .dx-ih .amt{font-weight:900;color:var(--brand-dark,#28407F)}
    .dx .dx-del{min-height:40px;min-width:40px;border:none;border-radius:10px;background:#FDEDEC;color:#C0392B;font-size:16px;font-weight:900;cursor:pointer}
    .dx .dx-btn{min-height:46px;padding:10px 16px;border-radius:12px;border:none;background:var(--brand);color:#fff;font:800 14px inherit;font-family:inherit;cursor:pointer}
    .dx .dx-btn.sec{background:var(--chip,#EEF2FB);color:var(--brand,#3752A6)}
    .dx .dx-btn:disabled{opacity:.5;cursor:default}
    .dx .dx-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .dx .dx-row .dx-btn{flex:1 1 120px}
    .dx .dx-chk{display:flex;align-items:center;gap:10px;min-height:44px;font-size:13.5px;font-weight:700;cursor:pointer}
    .dx .dx-chk input{width:22px;height:22px;flex:0 0 22px}
    .dx .dx-sum{margin-top:14px;border-radius:16px;background:linear-gradient(135deg,#28407F,#3752A6);color:#fff;padding:14px 16px}
    .dx .dx-sum .tot{font-size:28px;font-weight:900;line-height:1.2}
    .dx .dx-sum table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
    .dx .dx-sum td{padding:2px 0}.dx .dx-sum td:last-child{text-align:right;font-weight:800}
    .dx .dx-sum .wd{font-size:12px;opacity:.9;margin-top:6px}
    .dx .dx-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:#fff;border:1px solid var(--line)}
    .dx .dx-tbl th,.dx .dx-tbl td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
    .dx .dx-tbl th{background:#EAF0FF;color:var(--brand-dark,#28407F)}
    .dx .dx-wrap{overflow-x:auto;max-width:100%}
    `;
    document.head.appendChild(s);
  }
  function root(container) { injectCss(); const r = document.createElement('div'); r.className = 'dx tamil'; container.appendChild(r); return r; }
  function showMsg(host, kind, html) { let m = host.querySelector(':scope > .dx-msg'); if (!m) { m = document.createElement('div'); m.className = 'dx-msg'; host.appendChild(m); } m.innerHTML = html ? '<div class="dx-' + kind + '" role="' + (kind === 'err' ? 'alert' : 'status') + '">' + html + '</div>' : ''; }

  /* ---- states, GSTIN ---- */
  const STATES = [['01', 'Jammu and Kashmir', 'ஜம்மு காஷ்மீர்'], ['02', 'Himachal Pradesh', 'ஹிமாச்சல பிரதேசம்'], ['03', 'Punjab', 'பஞ்சாப்'], ['04', 'Chandigarh', 'சண்டிகர்'], ['05', 'Uttarakhand', 'உத்தராகண்ட்'],
    ['06', 'Haryana', 'ஹரியானா'], ['07', 'Delhi', 'டெல்லி'], ['08', 'Rajasthan', 'ராஜஸ்தான்'], ['09', 'Uttar Pradesh', 'உத்தரப் பிரதேசம்'], ['10', 'Bihar', 'பீகார்'], ['11', 'Sikkim', 'சிக்கிம்'],
    ['12', 'Arunachal Pradesh', 'அருணாசலப் பிரதேசம்'], ['13', 'Nagaland', 'நாகாலாந்து'], ['14', 'Manipur', 'மணிப்பூர்'], ['15', 'Mizoram', 'மிசோரம்'], ['16', 'Tripura', 'திரிபுரா'], ['17', 'Meghalaya', 'மேகாலயா'],
    ['18', 'Assam', 'அசாம்'], ['19', 'West Bengal', 'மேற்கு வங்கம்'], ['20', 'Jharkhand', 'ஜார்கண்ட்'], ['21', 'Odisha', 'ஒடிசா'], ['22', 'Chhattisgarh', 'சத்தீஸ்கர்'], ['23', 'Madhya Pradesh', 'மத்தியப் பிரதேசம்'],
    ['24', 'Gujarat', 'குஜராத்'], ['26', 'Dadra and Nagar Haveli and Daman and Diu', 'தாத்ரா நகர் ஹவேலி, டாமன் டையூ'], ['27', 'Maharashtra', 'மகாராஷ்டிரா'], ['29', 'Karnataka', 'கர்நாடகா'], ['30', 'Goa', 'கோவா'],
    ['31', 'Lakshadweep', 'லட்சத்தீவு'], ['32', 'Kerala', 'கேரளா'], ['33', 'Tamil Nadu', 'தமிழ்நாடு'], ['34', 'Puducherry', 'புதுச்சேரி'], ['35', 'Andaman and Nicobar Islands', 'அந்தமான் நிக்கோபார்'],
    ['36', 'Telangana', 'தெலுங்கானா'], ['37', 'Andhra Pradesh', 'ஆந்திரப் பிரதேசம்'], ['38', 'Ladakh', 'லடாக்'], ['97', 'Other Territory', 'பிற பகுதி']];
  const stateByCode = (c) => STATES.find((s) => s[0] === c);
  const stateLabel = (c) => { const s = stateByCode(c); return s ? s[1] + ' (' + s[0] + ')' : ''; };
  const GSTIN_CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function gstinCheck(g) { // returns { ok, formatOk, state }
    g = String(g || '').trim().toUpperCase();
    if (!g) return { empty: true };
    const formatOk = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g);
    let ok = false;
    if (formatOk) {
      let sum = 0;
      for (let i = 0; i < 14; i++) { const p = GSTIN_CH.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2); sum += Math.floor(p / 36) + (p % 36); }
      ok = GSTIN_CH[(36 - (sum % 36)) % 36] === g[14];
    }
    return { formatOk, ok, state: stateByCode(g.slice(0, 2)) ? g.slice(0, 2) : '' };
  }
  const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  /* ---- tax maths, in whole paise so totals always add up exactly ---- */
  const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];
  // items: [{desc, hsn, qty, unit, rate, disc, gst}], opts: { inter, inclusive, roundOff, advance, taxed }
  function calcDoc(items, opts) {
    const rows = [], groups = new Map();
    let taxable = 0, cgst = 0, sgst = 0, igst = 0;
    items.forEach((it) => {
      const qty = num(it.qty), rate = num(it.rate), disc = Math.min(100, Math.max(0, num(it.disc))), gst = opts.taxed ? num(it.gst) : 0;
      const gross = Math.round(qty * rate * 100);
      const afterDisc = Math.round(qty * rate * (100 - disc)); // paise
      let tx, taxLine;
      if (opts.inclusive && gst > 0) { tx = Math.round(afterDisc * 100 / (100 + gst)); taxLine = afterDisc - tx; } else { tx = afterDisc; taxLine = Math.round(tx * gst / 100); }
      const key = (String(it.hsn || '').trim() || '—') + '|' + gst;
      let g = groups.get(key);
      if (!g) { g = { hsn: String(it.hsn || '').trim() || '—', gst, taxable: 0 }; groups.set(key, g); }
      g.taxable += tx;
      rows.push({ ...it, qty, rate, disc, gst, gross: gross, discAmt: gross - afterDisc, taxable: tx, taxLine, amount: tx + taxLine });
    });
    const summary = [...groups.values()].map((g) => {
      const half = Math.round(g.taxable * g.gst / 200), full = Math.round(g.taxable * g.gst / 100);
      const c = opts.inter ? 0 : half, s = opts.inter ? 0 : half, i = opts.inter ? full : 0;
      taxable += g.taxable; cgst += c; sgst += s; igst += i;
      return { hsn: g.hsn, gst: g.gst, taxable: g.taxable, cgst: c, sgst: s, igst: i, tax: c + s + i };
    });
    // a price entered "including GST" is what the customer pays: keep the grand total equal to the sum of the lines
    let tax = cgst + sgst + igst, total = taxable + tax;
    if (opts.inclusive) { const lines = rows.reduce((a, r) => a + r.amount, 0); if (lines !== total && summary.length) { const d = lines - total; if (opts.inter) { summary[0].igst += d; igst += d; } else { summary[0].cgst += d; cgst += d; } summary[0].tax += d; tax += d; total = lines; } }
    const rounded = opts.roundOff ? Math.round(total / 100) * 100 : total;
    const advance = Math.round(num(opts.advance) * 100);
    return { rows, summary, taxable, cgst, sgst, igst, tax, total, roundOff: rounded - total, grand: rounded, advance, balance: rounded - advance };
  }
  const P = (paise) => paise / 100; // paise -> rupees for display

  /* ---- PDF helpers ---- */
  function wrapLines(font, text, size, maxW, maxLines) {
    const out = [];
    String(text == null ? '' : text).split(/\r?\n/).forEach((para) => {
      const ws = para.split(/(\s+)/); let line = '';
      const push = () => { out.push(line.replace(/\s+$/, '')); line = ''; };
      ws.forEach((w) => {
        if (!w) return;
        if (font.widthOfTextAtSize(line + w, size) <= maxW) { line += w; return; }
        if (line.trim()) push();
        if (/^\s+$/.test(w)) return;
        let rest = w;
        while (font.widthOfTextAtSize(rest, size) > maxW) { // a single very long word: break it
          let k = rest.length; while (k > 1 && font.widthOfTextAtSize(rest.slice(0, k), size) > maxW) k--;
          out.push(rest.slice(0, k)); rest = rest.slice(k);
        }
        line = rest;
      });
      if (line.trim() || !out.length) push();
    });
    if (maxLines && out.length > maxLines) { const cut = out.slice(0, maxLines); cut[maxLines - 1] = cut[maxLines - 1].replace(/.{0,2}$/, '…'); return cut; }
    return out;
  }
  let qrLibP = null;
  const loadQrGen = () => qrLibP || (qrLibP = new Promise((res, rej) => { if (window.qrcode) return res(window.qrcode); const sc = document.createElement('script'); sc.src = '/libs/qrcode-generator.js?v=1'; sc.onload = () => res(window.qrcode); sc.onerror = () => { qrLibP = null; rej(new Error('QR library could not load')); }; document.head.appendChild(sc); }));
  async function qrDataUrl(text, px) { // self-hosted generator (no CDN); UTF-8 safe so Tamil contact details encode correctly
    try {
      const qrcode = await loadQrGen(), qr = qrcode(0, 'M'); qr.addData(unescape(encodeURIComponent(String(text)))); qr.make();
      const n = qr.getModuleCount(), cell = Math.max(2, Math.floor(px / n)), size = cell * n, c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
      for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) g.fillRect(q * cell, r * cell, cell, cell);
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }
  const dataUrlBytes = (u) => { const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };

  /* =====================================================================
   * Business documents: Quotation / Proforma / Tax Invoice / Cash Bill / Bill of Supply / Purchase Order / Delivery Challan
   * ===================================================================== */
  const DOC_TYPES = {
    quotation: { en: 'Quotation', ta: 'விலைப்புள்ளி', prefix: 'QT', taxed: true, amounts: true, due: ['செல்லுபடியாகும் நாள்', 'Valid until'], from: ['விற்பனையாளர் (நீங்கள்)', 'Seller (You)'], to: ['வாடிக்கையாளர்', 'Quotation for'] },
    proforma: { en: 'Proforma Invoice', ta: 'முன் விலைப்பட்டியல்', prefix: 'PI', taxed: true, amounts: true, due: ['செல்லுபடியாகும் நாள்', 'Valid until'], from: ['விற்பனையாளர் (நீங்கள்)', 'Seller (You)'], to: ['வாங்குபவர்', 'Bill to'] },
    tax: { en: 'Tax Invoice', ta: 'வரி விலைப்பட்டியல்', prefix: 'INV', taxed: true, amounts: true, due: ['செலுத்த வேண்டிய நாள்', 'Due date'], from: ['விற்பனையாளர் (நீங்கள்)', 'Seller (You)'], to: ['வாங்குபவர்', 'Bill to'] },
    bill: { en: 'Cash Bill', ta: 'ரொக்க பில்', prefix: 'BILL', taxed: true, amounts: true, inclusive: true, due: ['செலுத்த வேண்டிய நாள்', 'Due date'], from: ['கடை / நிறுவனம் (நீங்கள்)', 'Shop / Business (You)'], to: ['வாடிக்கையாளர்', 'Customer'] },
    supply: { en: 'Bill of Supply', ta: 'விநியோக பில் (GST இல்லை)', prefix: 'BOS', taxed: false, amounts: true, due: ['செலுத்த வேண்டிய நாள்', 'Due date'], from: ['விற்பனையாளர் (நீங்கள்)', 'Seller (You)'], to: ['வாங்குபவர்', 'Bill to'] },
    po: { en: 'Purchase Order', ta: 'கொள்முதல் ஆணை', prefix: 'PO', taxed: true, amounts: true, due: ['டெலிவரி தேதி', 'Deliver by'], from: ['வாங்குபவர் (நீங்கள்)', 'Buyer (You)'], to: ['சப்ளையர்', 'Supplier'] },
    challan: { en: 'Delivery Challan', ta: 'டெலிவரி சலான்', prefix: 'DC', taxed: false, amounts: false, due: ['', ''], from: ['அனுப்புபவர் (நீங்கள்)', 'Consignor (You)'], to: ['பெறுபவர்', 'Consignee'] },
  };
  const DEFAULT_TERMS = 'Goods once sold will not be taken back or exchanged.\nPayment as agreed; interest may be charged on overdue amounts.\nAll disputes are subject to local jurisdiction.';
  const UNITS = ['NOS', 'PCS', 'KG', 'GRAM', 'LTR', 'MTR', 'SQFT', 'SQMT', 'BOX', 'BAG', 'SET', 'PAIR', 'DOZEN', 'HRS', 'DAYS', 'MONTH', 'JOB', 'SERVICE'];
  const SELLER_KEY = 'pti-biz-seller-v1', BUYERS_KEY = 'pti-biz-buyers-v1', SEQ_KEY = 'pti-biz-seq-v1';
  const newItem = (gst) => ({ desc: '', hsn: '', qty: 1, unit: 'NOS', rate: '', disc: '', gst: gst == null ? 18 : gst });

  function sellerProfile() { return lsGet(SELLER_KEY, {}); }
  function nextNo(type, date) {
    const seqs = lsGet(SEQ_KEY, {}), n = (seqs[type] || 0) + 1;
    return DOC_TYPES[type].prefix + '/' + fyOf(date) + '/' + String(n).padStart(3, '0');
  }
  function bumpSeq(type, no) {
    const m = /(\d+)\s*$/.exec(no || ''); if (!m) return;
    const seqs = lsGet(SEQ_KEY, {}); seqs[type] = Math.max(seqs[type] || 0, +m[1]); lsSet(SEQ_KEY, seqs);
  }
  function blankDoc(type) {
    const sp = sellerProfile(), T = DOC_TYPES[type], date = localISO();
    return {
      type,
      from: Object.assign({ name: '', addr: '', gstin: '', pan: '', mobile: '', email: '', state: '' }, sp.from || {}),
      to: { name: '', addr: '', gstin: '', mobile: '', state: '' },
      meta: { no: nextNo(type, date), date, due: '', poRef: '', vehicle: '', taxMode: 'auto', inclusive: !!T.inclusive, roundOff: true, advance: '', notes: '' },
      bank: Object.assign({ name: '', bank: '', acc: '', ifsc: '', upi: '' }, sp.bank || {}),
      terms: sp.terms == null ? DEFAULT_TERMS : sp.terms, signatory: sp.signatory || '',
      items: [newItem()],
    };
  }

  function mountBizDoc(container, toolId, lockedType) {
    const host = root(container);
    const DKEY = 'pti-biz-draft-' + toolId + '-v1';
    let S = lsGet(DKEY, null);
    if (!S || !DOC_TYPES[S.type] || !Array.isArray(S.items) || !S.items.length) S = blankDoc(lockedType || 'quotation');
    if (lockedType) S.type = lockedType;
    const saveDraft = () => { lsSet(DKEY, S); const sp = { from: S.from, bank: S.bank, terms: S.terms, signatory: S.signatory }; lsSet(SELLER_KEY, sp); };
    const T = () => DOC_TYPES[S.type];
    const inter = () => { if (!T().taxed) return false; if (S.meta.taxMode === 'inter') return true; if (S.meta.taxMode === 'intra') return false; return !!(S.from.state && S.to.state && S.from.state !== S.to.state); };
    const calc = () => calcDoc(S.items, { taxed: T().taxed, inter: inter(), inclusive: !!S.meta.inclusive && T().taxed, roundOff: !!S.meta.roundOff, advance: S.meta.advance });

    const stateOpts = (sel) => '<option value="">' + esc(B('— மாநிலம் தேர்வு —', '— choose state —')) + '</option>' + STATES.map((s) => '<option value="' + s[0] + '"' + (sel === s[0] ? ' selected' : '') + '>' + esc(isEn() ? s[1] : s[2] + ' · ' + s[1]) + ' (' + s[0] + ')</option>').join('');
    const fld = (label, path, o) => { o = o || {}; const v = getPath(S, path); return '<div class="dx-f"' + (o.style ? ' style="' + o.style + '"' : '') + '><label>' + label + '</label>' +
      (o.area ? '<textarea data-p="' + path + '" rows="' + o.area + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(v) + '</textarea>'
        : '<input type="' + (o.type || 'text') + '" data-p="' + path + '" value="' + esc(v) + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.list ? ' list="' + o.list + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' autocomplete="off">') +
      (o.hint ? '<div class="dx-hint" id="' + o.hint + '"></div>' : '') + '</div>'; };

    function paint() {
      const t = T(), buyers = lsGet(BUYERS_KEY, []);
      const typeSel = lockedType ? '' : '<div class="dx-f"><label>' + B('ஆவண வகை', 'Document type') + '</label><select data-p="type">' +
        Object.keys(DOC_TYPES).map((k) => '<option value="' + k + '"' + (S.type === k ? ' selected' : '') + '>' + esc(DOC_TYPES[k].en + ' — ' + DOC_TYPES[k].ta) + '</option>').join('') + '</select></div>';
      const itemCards = S.items.map((it, i) => '<div class="dx-item"><div class="dx-ih"><span>' + B('பொருள்', 'Item') + ' ' + (i + 1) + '</span><span class="amt" data-amt="' + i + '"></span>' +
        '<button type="button" class="dx-del" data-del="' + i + '" aria-label="' + esc(B('நீக்கு', 'Remove')) + '"' + (S.items.length < 2 ? ' disabled' : '') + '>✕</button></div>' +
        '<input type="text" data-i="' + i + '" data-f="desc" value="' + esc(it.desc) + '" placeholder="' + esc(B('பொருள் / சேவை விளக்கம்', 'Item / service description')) + '" autocomplete="off">' +
        '<div class="dx-grid" style="margin-top:8px"><div><label>' + B('HSN / SAC', 'HSN / SAC') + '</label><input type="text" inputmode="numeric" data-i="' + i + '" data-f="hsn" value="' + esc(it.hsn) + '"></div>' +
        '<div><label>' + B('அலகு', 'Unit') + '</label><input type="text" list="dxUnits" data-i="' + i + '" data-f="unit" value="' + esc(it.unit) + '"></div></div>' +
        '<div class="dx-grid' + (t.amounts ? ' three' : '') + '" style="margin-top:8px"><div><label>' + B('எண்ணிக்கை', 'Qty') + '</label><input type="number" inputmode="decimal" min="0" step="any" data-i="' + i + '" data-f="qty" value="' + esc(it.qty) + '"></div>' +
        (t.amounts ? '<div><label>' + B('விலை ₹', 'Rate ₹') + '</label><input type="number" inputmode="decimal" min="0" step="any" data-i="' + i + '" data-f="rate" value="' + esc(it.rate) + '"></div>' +
          '<div><label>' + B('தள்ளுபடி %', 'Disc %') + '</label><input type="number" inputmode="decimal" min="0" max="100" step="any" data-i="' + i + '" data-f="disc" value="' + esc(it.disc) + '"></div>' : '') + '</div>' +
        (t.taxed ? '<div style="margin-top:8px"><label>GST %</label><select data-i="' + i + '" data-f="gst">' + GST_RATES.map((g) => '<option value="' + g + '"' + (num(it.gst) === g ? ' selected' : '') + '>' + g + '%' + ([12, 28].includes(g) ? ' (' + B('பழைய விகிதம்', 'old rate') + ')' : g === 40 ? ' (' + B('ஆடம்பரம்', 'luxury / sin') + ')' : g === 3 ? ' (' + B('தங்கம்', 'gold') + ')' : '') + '</option>').join('') + '</select></div>' : '') + '</div>').join('');
      host.innerHTML =
        '<div class="dx-note">' + esc(isEn() ? 'Fill it once — your business details, bank and terms are remembered on this phone. PDF, Excel, Word, print and WhatsApp share are all available.' : 'ஒருமுறை நிரப்புங்கள் — உங்கள் நிறுவன விவரம், வங்கி, நிபந்தனைகள் இந்த phone-லேயே நினைவில் இருக்கும். PDF, Excel, Word, அச்சு, WhatsApp எல்லாம் உண்டு.') + '</div>' +
        typeSel +
        '<details' + (S.from.name ? '' : ' open') + '><summary>' + esc(t.from[isEn() ? 1 : 0]) + (S.from.name ? ' — ' + esc(S.from.name) : '') + '</summary>' +
        fld(B('நிறுவனப் பெயர்', 'Business name'), 'from.name') + fld(B('முகவரி', 'Address'), 'from.addr', { area: 2 }) +
        '<div class="dx-grid"><div>' + fld('GSTIN', 'from.gstin', { ph: '33AAAAA0000A1Z5', hint: 'hFromGstin' }) + '</div><div>' + fld('PAN', 'from.pan', { ph: 'AAAAA0000A', hint: 'hFromPan' }) + '</div></div>' +
        '<div class="dx-f"><label>' + B('மாநிலம்', 'State') + '</label><select data-p="from.state">' + stateOpts(S.from.state) + '</select></div>' +
        '<div class="dx-grid"><div>' + fld(B('கைபேசி', 'Mobile'), 'from.mobile', { type: 'tel', mode: 'tel' }) + '</div><div>' + fld('Email', 'from.email', { type: 'email' }) + '</div></div></details>' +
        '<h3 class="dx-h">' + esc(t.to[isEn() ? 1 : 0]) + '</h3>' +
        '<datalist id="dxBuyers">' + buyers.map((b) => '<option value="' + esc(b.name) + '">').join('') + '</datalist><datalist id="dxUnits">' + UNITS.map((u) => '<option value="' + u + '">').join('') + '</datalist>' +
        fld(B('பெயர்', 'Name'), 'to.name', { list: 'dxBuyers' }) + fld(B('முகவரி', 'Address'), 'to.addr', { area: 2 }) +
        (S.type === 'quotation' || S.type === 'bill' || S.type === 'challan' ? '' : '') +
        '<div class="dx-grid"><div>' + fld(t.taxed ? 'GSTIN (' + B('இருந்தால்', 'if any') + ')' : 'GSTIN', 'to.gstin', { hint: 'hToGstin' }) + '</div><div>' + fld(B('கைபேசி', 'Mobile'), 'to.mobile', { type: 'tel', mode: 'tel' }) + '</div></div>' +
        (t.taxed ? '<div class="dx-f"><label>' + B('மாநிலம் (supply இடம்)', 'State (place of supply)') + '</label><select data-p="to.state">' + stateOpts(S.to.state) + '</select><div class="dx-hint" id="hTaxType"></div></div>' : '') +
        '<h3 class="dx-h">' + esc(t.en) + ' ' + B('விவரம்', 'details') + '</h3>' +
        '<div class="dx-grid">' + fld(esc(t.en) + ' ' + B('எண்', 'No.'), 'meta.no') + fld(B('தேதி', 'Date'), 'meta.date', { type: 'date' }) + '</div>' +
        '<div class="dx-grid">' + (t.due[0] ? fld(t.due[isEn() ? 1 : 0], 'meta.due', { type: 'date' }) : '') + (S.type === 'po' ? '' : fld(B('வாடிக்கையாளர் PO எண்', 'Customer PO ref'), 'meta.poRef')) + (S.type === 'challan' ? fld(B('வாகன எண்', 'Vehicle no.'), 'meta.vehicle') : '') + '</div>' +
        '<h3 class="dx-h">' + B('பொருட்கள்', 'Items') + '</h3>' + itemCards +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-add="1">＋ ' + B('பொருள் சேர்', 'Add item') + '</button></div>' +
        (t.taxed ? '<h3 class="dx-h">' + B('வரி', 'Tax') + '</h3><label class="dx-chk"><input type="checkbox" data-p="meta.inclusive"' + (S.meta.inclusive ? ' checked' : '') + '> ' + B('நான் கொடுத்த விலை GST உட்பட', 'Rates I entered already include GST') + '</label>' +
          '<div class="dx-f"><label>' + B('வரி வகை', 'Tax type') + '</label><select data-p="meta.taxMode"><option value="auto"' + (S.meta.taxMode === 'auto' ? ' selected' : '') + '>' + B('தானாக (மாநிலங்களைப் பார்த்து)', 'Automatic (from the two states)') + '</option><option value="intra"' + (S.meta.taxMode === 'intra' ? ' selected' : '') + '>CGST + SGST (' + B('ஒரே மாநிலம்', 'same state') + ')</option><option value="inter"' + (S.meta.taxMode === 'inter' ? ' selected' : '') + '>IGST (' + B('வேறு மாநிலம்', 'other state') + ')</option></select></div>' : '') +
        (t.amounts ? '<label class="dx-chk"><input type="checkbox" data-p="meta.roundOff"' + (S.meta.roundOff ? ' checked' : '') + '> ' + B('முழு ரூபாயாக round-off', 'Round off to the whole rupee') + '</label>' +
          fld(B('முன்பணம் பெற்றது ₹', 'Advance received ₹'), 'meta.advance', { type: 'number', mode: 'decimal' }) : '') +
        '<div class="dx-sum" id="dxSum" aria-live="polite"></div>' +
        '<details><summary>' + B('வங்கி / UPI (விருப்பம்)', 'Bank / UPI (optional)') + '</summary><div class="dx-grid">' + fld(B('கணக்கு பெயர்', 'Account name'), 'bank.name') + fld(B('வங்கி', 'Bank & branch'), 'bank.bank') + fld(B('கணக்கு எண்', 'Account no.'), 'bank.acc', { mode: 'numeric' }) + fld('IFSC', 'bank.ifsc', { hint: 'hIfsc' }) + '</div>' + fld('UPI ID', 'bank.upi', { ph: 'name@bank' }) + '<div class="dx-hint">' + B('UPI ID கொடுத்தால் PDF-ல் QR வரும்', 'A UPI ID adds a pay-by-QR code to the PDF') + '</div></details>' +
        '<details><summary>' + B('நிபந்தனைகள், குறிப்பு, கையொப்பம்', 'Terms, notes, signature') + '</summary>' + fld(B('நிபந்தனைகள் (ஒவ்வொரு வரியும் ஒன்று)', 'Terms (one per line)'), 'terms', { area: 4 }) + fld(B('குறிப்பு', 'Notes'), 'meta.notes', { area: 2 }) + fld(B('அங்கீகரிக்கப்பட்ட கையொப்பதாரர் பெயர்', 'Authorised signatory name'), 'signatory') + '</details>' +
        '<div class="dx-row"><button type="button" class="dx-btn" data-out="pdf">📄 PDF</button><button type="button" class="dx-btn sec" data-out="xlsx">📊 Excel</button><button type="button" class="dx-btn sec" data-out="docx">📝 Word</button><button type="button" class="dx-btn sec" data-out="print">🖨️ ' + B('அச்சு', 'Print') + '</button><button type="button" class="dx-btn sec" data-out="wa">💬 WhatsApp</button></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-new="1">🆕 ' + B('புதிய ஆவணம் (உங்கள் விவரம் இருக்கும்)', 'New document (keeps your details)') + '</button></div>' +
        '<div data-k="msg"></div>';
      refreshHints(); refreshSummary();
    }

    function refreshHints() {
      const setH = (id, cls, txt) => { const e = host.querySelector('#' + id); if (e) { e.className = 'dx-hint ' + cls; e.textContent = txt; } };
      const gh = (id, g, who) => {
        const c = gstinCheck(g);
        if (c.empty) return setH(id, '', '');
        if (!c.formatOk) return setH(id, 'bad', B('GSTIN வடிவம் தவறு (15 எழுத்து: 33AAAAA0000A1Z5)', 'GSTIN format looks wrong (15 characters, e.g. 33AAAAA0000A1Z5)'));
        if (!c.ok) return setH(id, 'bad', B('GSTIN-ல் தவறு இருக்கலாம் (check digit பொருந்தவில்லை) — ஒருமுறை சரிபாருங்கள்', 'GSTIN check digit does not match — please re-check it'));
        setH(id, 'ok', '✓ ' + B('சரியான GSTIN', 'Valid GSTIN') + (c.state ? ' · ' + stateLabel(c.state) : ''));
      };
      gh('hFromGstin', S.from.gstin); gh('hToGstin', S.to.gstin);
      const pan = String(S.from.pan || '').trim().toUpperCase();
      setH('hFromPan', pan && !PAN_RE.test(pan) ? 'bad' : '', pan && !PAN_RE.test(pan) ? B('PAN வடிவம் தவறு (AAAAA0000A)', 'PAN format looks wrong (AAAAA0000A)') : '');
      const ifsc = String(S.bank.ifsc || '').trim().toUpperCase();
      setH('hIfsc', ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? 'bad' : '', ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? B('IFSC வடிவம் தவறு (எ.கா. SBIN0001234)', 'IFSC looks wrong (e.g. SBIN0001234)') : '');
      const tt = host.querySelector('#hTaxType');
      if (tt && T().taxed) {
        const i = inter(), manual = S.meta.taxMode !== 'auto';
        if (!manual && !(S.from.state && S.to.state)) { tt.className = 'dx-hint bad'; tt.textContent = B('இரு மாநிலங்களையும் தேர்வு செய்யுங்கள் — இப்போது ஒரே மாநிலம் (CGST+SGST) எனக் கணக்கிடப்படுகிறது', 'Choose both states — for now it is treated as the same state (CGST+SGST)'); }
        else { tt.className = 'dx-hint ok'; tt.textContent = (i ? 'IGST' : 'CGST + SGST') + ' ' + B('பயன்படுத்தப்படும்', 'will be charged'); }
      }
    }

    function refreshSummary() {
      const box = host.querySelector('#dxSum'); if (!box) return;
      const c = calc(), t = T();
      host.querySelectorAll('[data-amt]').forEach((e) => { const r = c.rows[+e.getAttribute('data-amt')]; e.textContent = r && t.amounts ? inr(P(r.amount)) : ''; });
      if (!t.amounts) { box.style.display = 'none'; return; }
      box.style.display = '';
      const rows = [[B('வரிக்கு முன் மதிப்பு', 'Taxable value'), inr(P(c.taxable))]];
      if (t.taxed) { if (inter()) rows.push(['IGST', inr(P(c.igst))]); else { rows.push(['CGST', inr(P(c.cgst))]); rows.push(['SGST', inr(P(c.sgst))]); } }
      if (c.roundOff) rows.push([B('Round off', 'Round off'), (c.roundOff > 0 ? '+' : '−') + inrPlain(Math.abs(P(c.roundOff)))]);
      if (c.advance) { rows.push([B('முன்பணம்', 'Advance'), '− ' + inr(P(c.advance))]); rows.push([B('செலுத்த வேண்டியது', 'Balance due'), inr(P(c.balance))]); }
      box.innerHTML = '<div style="font-size:12px;opacity:.9">' + B('மொத்தத் தொகை', 'Grand total') + '</div><div class="tot">' + inr(P(c.grand)) + '</div><table>' + rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table><div class="wd">' + esc(words(P(c.grand))) + ' ' + B('மட்டும்', 'only') + '</div>';
    }

    /* ---- events ---- */
    host.addEventListener('input', (e) => onEdit(e));
    host.addEventListener('change', (e) => onEdit(e, true));
    function onEdit(e, isChange) {
      const el0 = e.target, p = el0.getAttribute && el0.getAttribute('data-p');
      if (el0.getAttribute && el0.getAttribute('data-f') != null) {
        const it = S.items[+el0.getAttribute('data-i')], f = el0.getAttribute('data-f');
        if (it) { it[f] = (f === 'gst') ? num(el0.value) : el0.value; saveDraft(); refreshSummary(); }
        return;
      }
      if (!p) return;
      let v = el0.type === 'checkbox' ? el0.checked : el0.value;
      if (p === 'type') { S.type = v; const T2 = DOC_TYPES[v]; S.meta.no = nextNo(v, S.meta.date); S.meta.inclusive = !!T2.inclusive; saveDraft(); paint(); return; }
      if (/gstin$/.test(p) || p === 'from.pan' || p === 'bank.ifsc') v = String(v).toUpperCase();
      setPath(S, p, v);
      if (/gstin$/.test(p) && el0.value !== v) el0.value = v;
      if (/gstin$/.test(p)) { const c = gstinCheck(v), key = p.split('.')[0]; if (c.formatOk && c.state && S[key].state !== c.state) { S[key].state = c.state; const sel = host.querySelector('[data-p="' + key + '.state"]'); if (sel) sel.value = c.state; } }
      if (p === 'to.name' && isChange) { const b = lsGet(BUYERS_KEY, []).find((x) => x.name === v); if (b && !S.to.addr && !S.to.gstin) { S.to = Object.assign({}, S.to, b); paint(); } }
      saveDraft(); refreshHints(); refreshSummary();
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.hasAttribute('data-add')) { S.items.push(newItem(S.items[S.items.length - 1] ? S.items[S.items.length - 1].gst : 18)); saveDraft(); paint(); return; }
      if (b.hasAttribute('data-del')) { S.items.splice(+b.getAttribute('data-del'), 1); if (!S.items.length) S.items.push(newItem()); saveDraft(); paint(); return; }
      if (b.hasAttribute('data-new')) { if (!confirm(B('புதிய ஆவணம் தொடங்கவா? (இப்போதைய பொருட்கள், வாடிக்கையாளர் விவரம் அழிக்கப்படும்; உங்கள் நிறுவன விவரம் இருக்கும்)', 'Start a new document? Items and customer are cleared; your business details stay.'))) return; S = blankDoc(S.type); saveDraft(); paint(); return; }
      const out = b.getAttribute('data-out'); if (out) run(out, b);
    });

    /* ---- validation + model ---- */
    function model() {
      const t = T(), c = calc(), i = inter();
      return { S: JSON.parse(JSON.stringify(S)), t, c, inter: i, taxed: t.taxed, amounts: t.amounts, title: t.en.toUpperCase() };
    }
    function problems() {
      const t = T(), errs = [], warns = [];
      const real = S.items.filter((it) => String(it.desc).trim());
      if (!S.from.name.trim()) errs.push(B('உங்கள் நிறுவனப் பெயரை எழுதுங்கள்', 'Enter your business name'));
      if (!real.length) errs.push(B('குறைந்தது ஒரு பொருளின் விளக்கத்தை எழுதுங்கள்', 'Describe at least one item'));
      real.forEach((it, k) => { if (num(it.qty) <= 0) errs.push(B('பொருள் ' + (k + 1) + ': எண்ணிக்கை 0-க்கு மேல் இருக்க வேண்டும்', 'Item ' + (k + 1) + ': quantity must be above 0')); if (t.amounts && num(it.rate) < 0) errs.push(B('பொருள் ' + (k + 1) + ': விலை எதிர்மறையாக இருக்கக் கூடாது', 'Item ' + (k + 1) + ': rate cannot be negative')); if (num(it.disc) < 0 || num(it.disc) > 100) errs.push(B('பொருள் ' + (k + 1) + ': தள்ளுபடி 0–100%', 'Item ' + (k + 1) + ': discount must be 0–100%')); });
      if (!S.to.name.trim()) warns.push(B('வாடிக்கையாளர் பெயர் காலியாக உள்ளது', 'Customer name is empty'));
      if (t.taxed && ['tax', 'proforma', 'po'].includes(S.type)) {
        const g = gstinCheck(S.from.gstin);
        if (g.empty) warns.push(B('உங்கள் GSTIN இல்லை — வரி விலைப்பட்டியலில் GSTIN கட்டாயம்', 'Your GSTIN is missing — a tax invoice needs it'));
        else if (!g.ok) warns.push(B('உங்கள் GSTIN சரிபார்ப்பில் தவறு காட்டுகிறது', 'Your GSTIN fails the check-digit test'));
        if (!S.from.state && !S.to.state) warns.push(B('மாநிலங்கள் தேர்வு செய்யப்படவில்லை — CGST+SGST எனக் கணக்கிடப்பட்டது', 'States not chosen — CGST+SGST was used'));
      }
      if (S.to.gstin && !gstinCheck(S.to.gstin).ok) warns.push(B('வாடிக்கையாளர் GSTIN சரிபார்ப்பில் தவறு காட்டுகிறது', "Customer's GSTIN fails the check-digit test"));
      const c = calc(); if (c.advance > c.grand && c.grand > 0) warns.push(B('முன்பணம் மொத்தத்தை விட அதிகம்', 'Advance is more than the total'));
      return { errs, warns };
    }

    async function run(kind, btn) {
      const msg = host.querySelector('[data-k=msg]'), { errs, warns } = problems();
      if (errs.length) { msg.innerHTML = '<div class="dx-err" role="alert">' + errs.map(esc).join('<br>') + '</div>'; return; }
      const m = model();
      msg.innerHTML = '<div class="dx-note">⏳ ' + B('தயாராகிறது…', 'Preparing…') + '</div>';
      const btns = host.querySelectorAll('[data-out]'); btns.forEach((x) => (x.disabled = true));
      try {
        const base = fileSafe(m.t.en + '-' + (S.meta.no || 'doc'));
        if (kind === 'pdf') downloadBlob(new Blob([await bizPdf(m)], { type: 'application/pdf' }), base + '.pdf');
        else if (kind === 'xlsx') downloadBlob(bizXlsx(m), base + '.xlsx');
        else if (kind === 'docx') downloadBlob(await bizDocx(m), base + '.docx');
        else if (kind === 'print') bizPrint(m);
        else if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(bizWa(m)), '_blank');
        rememberBuyer(); bumpSeq(S.type, S.meta.no); saveDraft();
        msg.innerHTML = '<div class="dx-ok">✓ ' + esc(m.t.en) + ' ' + B('தயார்', 'ready') + ' — ' + inr(P(m.c.grand)) + '</div>' + (warns.length ? '<div class="dx-warn">⚠ ' + warns.map(esc).join('<br>⚠ ') + '</div>' : '');
      } catch (err) {
        msg.innerHTML = '<div class="dx-err" role="alert">' + B('உருவாக்க முடியவில்லை: ', 'Could not create it: ') + esc(err && err.message || err) + '</div>';
      } finally { btns.forEach((x) => (x.disabled = false)); }
    }
    function rememberBuyer() {
      if (!S.to.name.trim()) return;
      const list = lsGet(BUYERS_KEY, []).filter((b) => b.name !== S.to.name);
      list.unshift({ name: S.to.name, addr: S.to.addr, gstin: S.to.gstin, mobile: S.to.mobile, state: S.to.state });
      lsSet(BUYERS_KEY, list.slice(0, 40));
    }

    paint();
  }

  /* ---- shared pieces of the model for every output ---- */
  function bizCols(m) {
    const rows = m.c.rows, anyDisc = rows.some((r) => r.disc > 0);
    if (!m.amounts) return [{ k: 'n', l: '#', w: 20, a: 'l' }, { k: 'desc', l: 'Description', w: 0, a: 'l' }, { k: 'hsn', l: 'HSN/SAC', w: 60, a: 'l' }, { k: 'qty', l: 'Qty', w: 50, a: 'r' }, { k: 'unit', l: 'Unit', w: 50, a: 'l' }];
    const cols = [{ k: 'n', l: '#', w: 18, a: 'l' }, { k: 'desc', l: 'Description', w: 0, a: 'l' }];
    if (m.taxed) cols.push({ k: 'hsn', l: 'HSN/SAC', w: 46, a: 'l' });
    cols.push({ k: 'qty', l: 'Qty', w: 32, a: 'r' }, { k: 'unit', l: 'Unit', w: 32, a: 'l' }, { k: 'rate', l: m.S.meta.inclusive && m.taxed ? 'Rate (incl.)' : 'Rate', w: 52, a: 'r' });
    if (anyDisc) cols.push({ k: 'disc', l: 'Disc%', w: 30, a: 'r' });
    if (m.taxed) cols.push({ k: 'taxable', l: 'Taxable', w: 58, a: 'r' }, { k: 'gst', l: 'GST%', w: 30, a: 'r' });
    cols.push({ k: 'amount', l: 'Amount', w: 60, a: 'r' });
    return cols;
  }
  function bizCell(k, r, i) {
    switch (k) {
      case 'n': return String(i + 1); case 'desc': return r.desc; case 'hsn': return r.hsn || ''; case 'qty': return String(+r.qty.toFixed(3)); case 'unit': return r.unit || '';
      case 'rate': return inrPlain(r.rate); case 'disc': return r.disc ? String(r.disc) : ''; case 'taxable': return inrPlain(P(r.taxable)); case 'gst': return String(r.gst);
      case 'amount': return inrPlain(P(r.amount)); default: return '';
    }
  }
  const showTaxSummary = (m) => m.taxed && m.c.summary.some((g) => g.gst > 0);
  function metaPairs(m) {
    const S = m.S, p = [[m.t.en + ' No', S.meta.no], ['Date', fmtDMY(S.meta.date)]];
    if (m.t.due[0] && S.meta.due) p.push([m.t.due[1], fmtDMY(S.meta.due)]);
    if (S.meta.poRef) p.push(['Customer PO', S.meta.poRef]);
    if (S.meta.vehicle) p.push(['Vehicle no.', S.meta.vehicle]);
    if (m.taxed && S.to.state) p.push(['Place of supply', stateLabel(S.to.state)]);
    if (S.type === 'tax') p.push(['Reverse charge', 'No']);
    return p.filter((x) => x[1]);
  }
  const partyLines = (p, taxed) => [p.gstin ? 'GSTIN: ' + p.gstin : '', p.pan ? 'PAN: ' + p.pan : '', p.state && taxed ? 'State: ' + stateLabel(p.state) : '', [p.mobile ? 'Mob: ' + p.mobile : '', p.email ? p.email : ''].filter(Boolean).join('   ')].filter(Boolean);

  /* ---- PDF ---- */
  async function bizPdf(m) {
    const S = m.S, c = m.c;
    const doc = await PDFDocument.create();
    doc.setTitle(m.t.en + ' ' + (S.meta.no || '')); doc.setCreator('pdftoolsindia.com');
    const font = await embedUnicodeFont(doc), uni = !!font.__mixedShape;
    const L = (s) => { s = String(s == null ? '' : s); return uni ? s : s.replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); };
    const W = 595.28, H = 841.89, MX = 36, CW = W - 2 * MX, FOOT = 44;
    const INK = rgb(0.1, 0.1, 0.12), GR = rgb(0.38, 0.4, 0.46), LN = rgb(0.8, 0.82, 0.86), BR = rgb(0.16, 0.25, 0.5), HD = rgb(0.92, 0.94, 0.99);
    let page, y; const pages = [];
    const newPage = () => { page = doc.addPage([W, H]); pages.push(page); y = H - MX; };
    const txt = (s, x, yy, size, color) => page.drawText(L(s), { x, y: yy, size: size || 9, font, color: color || INK });
    const bold = (s, x, yy, size, color) => { txt(s, x, yy, size, color); txt(s, x + 0.3, yy, size, color); };
    const wid = (s, size) => font.widthOfTextAtSize(L(s), size);
    const rtxt = (s, xr, yy, size, color) => txt(s, xr - wid(s, size), yy, size, color);
    const hline = (yy, x1, x2, th, col) => page.drawLine({ start: { x: x1 == null ? MX : x1, y: yy }, end: { x: x2 == null ? W - MX : x2, y: yy }, thickness: th || 0.6, color: col || LN });
    const wrap = (s, size, w, max) => wrapLines(font, L(s), size, w, max);
    const ensure = (h, redraw) => { if (y - h < FOOT) { newPage(); if (redraw) redraw(); } };
    newPage();

    // title + seller (left) | document facts (right)
    bold(m.title, MX, y - 14, 18, BR);
    const topY = y - 34; let ly = topY;
    wrap(S.from.name || '—', 12, 280, 2).forEach((ln) => { bold(ln, MX, ly, 12); ly -= 15; });
    wrap(S.from.addr, 8.5, 280, 4).forEach((ln) => { txt(ln, MX, ly, 8.5, GR); ly -= 11; });
    partyLines(S.from, m.taxed).forEach((ln) => { txt(ln, MX, ly, 8.5); ly -= 11; });
    const RX = MX + 305, RW = W - MX - RX; let ry = topY + 6; const facts = metaPairs(m);
    page.drawRectangle({ x: RX - 6, y: ry - facts.length * 14 - 2, width: RW + 6, height: facts.length * 14 + 8, color: HD });
    facts.forEach((f) => { txt(f[0], RX, ry - 8, 8.5, GR); const lines = wrap(f[1], 9, RW - 92, 1); txt(lines[0], RX + 92, ry - 8, 9); ry -= 14; });
    y = Math.min(ly, ry - 10) - 8; hline(y); y -= 16;

    // bill to
    txt(m.t.to[1].toUpperCase(), MX, y, 8, GR); y -= 13;
    wrap(S.to.name || '—', 11, 330, 2).forEach((ln) => { bold(ln, MX, y, 11); y -= 14; });
    wrap(S.to.addr, 8.5, 330, 4).forEach((ln) => { txt(ln, MX, y, 8.5, GR); y -= 11; });
    partyLines(S.to, m.taxed).forEach((ln) => { txt(ln, MX, y, 8.5); y -= 11; });
    y -= 6;

    // items table
    const cols = bizCols(m), fixed = cols.reduce((a, k) => a + k.w, 0), dw = CW - fixed; cols.forEach((k) => { if (!k.w) k.w = dw; });
    let cx = MX; cols.forEach((k) => { k.x = cx; cx += k.w; });
    const head = () => { page.drawRectangle({ x: MX, y: y - 15, width: CW, height: 17, color: HD }); cols.forEach((k) => { const l = k.l; if (k.a === 'r') rtxt(l, k.x + k.w - 3, y - 10, 8, BR); else txt(l, k.x + 3, y - 10, 8, BR); }); y -= 19; };
    ensure(60); head();
    c.rows.forEach((r, i) => {
      const dcol = cols.find((k) => k.k === 'desc'), dl = wrap(r.desc, 8.5, dcol.w - 8, 5), rh = Math.max(dl.length * 10.5, 11) + 6;
      ensure(rh + 4, head);
      cols.forEach((k) => {
        if (k.k === 'desc') dl.forEach((ln, j) => txt(ln, k.x + 3, y - 8 - j * 10.5, 8.5));
        else { const v = bizCell(k.k, r, i); if (k.a === 'r') rtxt(v, k.x + k.w - 3, y - 8, 8.5); else txt(v, k.x + 3, y - 8, 8.5); }
      });
      y -= rh; hline(y + 2, MX, W - MX, 0.4);
    });
    if (m.taxed && S.meta.inclusive) { y -= 11; txt('Rates entered include GST; the Taxable and Amount columns show the split.', MX, y, 7.5, GR); }
    y -= 14;

    // HSN / rate-wise tax summary
    if (showTaxSummary(m)) {
      const head2 = m.inter ? [['HSN/SAC', 110, 'l'], ['Taxable value', 100, 'r'], ['IGST %', 70, 'r'], ['IGST amount', 110, 'r'], ['Total tax', 133, 'r']]
        : [['HSN/SAC', 90, 'l'], ['Taxable value', 90, 'r'], ['CGST %', 52, 'r'], ['CGST amt', 72, 'r'], ['SGST %', 52, 'r'], ['SGST amt', 72, 'r'], ['Total tax', 95, 'r']];
      const hs = () => { let x = MX; page.drawRectangle({ x: MX, y: y - 14, width: CW, height: 16, color: HD }); head2.forEach((h) => { if (h[2] === 'r') rtxt(h[0], x + h[1] - 3, y - 9, 8, BR); else txt(h[0], x + 3, y - 9, 8, BR); x += h[1]; }); y -= 18; };
      ensure(70); bold('Tax summary (HSN / SAC and rate wise)', MX, y, 9, BR); y -= 14; hs();
      c.summary.filter((g) => g.gst > 0 || c.summary.length === 1).forEach((g) => {
        ensure(16, hs);
        const vals = m.inter ? [g.hsn, inrPlain(P(g.taxable)), String(g.gst), inrPlain(P(g.igst)), inrPlain(P(g.tax))]
          : [g.hsn, inrPlain(P(g.taxable)), String(g.gst / 2), inrPlain(P(g.cgst)), String(g.gst / 2), inrPlain(P(g.sgst)), inrPlain(P(g.tax))];
        let x = MX; head2.forEach((h, k) => { if (h[2] === 'r') rtxt(vals[k], x + h[1] - 3, y - 8, 8.5); else txt(vals[k], x + 3, y - 8, 8.5); x += h[1]; });
        y -= 15; hline(y + 2, MX, W - MX, 0.4);
      });
      y -= 12;
    }

    if (m.amounts) {
      // totals (right) beside words / bank / QR (left)
      ensure(130);
      const TX = MX + 300, TW = W - MX - TX; let ty = y;
      const trow = (l, v, strong) => { if (strong) { page.drawRectangle({ x: TX - 4, y: ty - 18, width: TW + 4, height: 22, color: HD }); bold(l, TX, ty - 10, 10.5, BR); const vs = '₹' + inrPlain(v); const w = wid(vs, 11); bold(vs, W - MX - 3 - w, ty - 10, 11, BR); ty -= 24; } else { txt(l, TX, ty - 8, 9, GR); rtxt(inrPlain(v), W - MX - 3, ty - 8, 9); ty -= 15; } };
      trow(m.taxed ? 'Taxable value' : 'Sub-total', P(c.taxable));
      if (m.taxed && c.tax) { if (m.inter) trow('IGST', P(c.igst)); else { trow('CGST', P(c.cgst)); trow('SGST', P(c.sgst)); } }
      if (c.roundOff) trow('Round off', P(c.roundOff));
      trow('GRAND TOTAL', P(c.grand), true);
      if (c.advance) { trow('Advance received', -P(c.advance)); trow('BALANCE DUE', P(c.balance), true); }
      let ly2 = y;
      txt('AMOUNT IN WORDS', MX, ly2 - 8, 8, GR); ly2 -= 20;
      wrap('Rupees ' + words(P(c.grand)) + ' Only', 9.5, 270, 4).forEach((ln) => { bold(ln, MX, ly2, 9.5); ly2 -= 13; });
      y = Math.min(ly2, ty) - 12;
      if (S.bank.acc || S.bank.name || S.bank.upi) {
        const bl = [['Name', S.bank.name], ['Bank', S.bank.bank], ['A/c no.', S.bank.acc], ['IFSC', S.bank.ifsc], ['UPI', S.bank.upi]].filter((p) => p[1]).flatMap((p) => wrap(p[0] + ': ' + p[1], 8.5, 330, 2));
        let qr = null;
        if (S.bank.upi && c.balance > 0) {
          const amt = P(c.advance ? c.balance : c.grand);
          const url = await qrDataUrl('upi://pay?pa=' + encodeURIComponent(S.bank.upi) + '&pn=' + encodeURIComponent(S.from.name || 'Payee') + '&am=' + amt.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent(m.t.en + ' ' + (S.meta.no || '')), 220);
          if (url) qr = await doc.embedPng(dataUrlBytes(url));
        }
        const need = Math.max(30 + bl.length * 11, qr ? 90 : 0); ensure(need);
        bold('Bank details', MX, y, 9, BR); let by = y - 13; bl.forEach((ln) => { txt(ln, MX, by, 8.5); by -= 11; });
        if (qr) { page.drawImage(qr, { x: W - MX - 70, y: y - 70, width: 70, height: 70 }); const lw = wid('Scan to pay (UPI)', 7.5); txt('Scan to pay (UPI)', W - MX - 35 - lw / 2, y - 80, 7.5, GR); }
        y = Math.min(by, qr ? y - 86 : by) - 8;
      }
    }

    const termLines = String(S.terms || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (termLines.length) { ensure(30 + termLines.length * 10); bold('Terms & conditions', MX, y, 9, BR); y -= 12; termLines.forEach((tl, i) => { wrap((i + 1) + '. ' + tl, 8, CW, 3).forEach((ln) => { ensure(11); txt(ln, MX, y, 8, GR); y -= 10.5; }); }); y -= 6; }
    if (S.meta.notes && S.meta.notes.trim()) { ensure(30); bold('Notes', MX, y, 9, BR); y -= 12; wrap(S.meta.notes, 8.5, CW, 6).forEach((ln) => { ensure(11); txt(ln, MX, y, 8.5, GR); y -= 11; }); y -= 6; }

    ensure(80); y -= 8;
    const sx = W - MX - 190;
    txt('For ' + (S.from.name || ''), sx, y, 8.5, GR); hline(y - 50, sx, W - MX, 0.6, GR);
    txt('Authorised Signatory' + (S.signatory ? ' — ' + S.signatory : ''), sx, y - 61, 8.5, GR);
    if (S.type === 'challan') { hline(y - 50, MX, MX + 190, 0.6, GR); txt("Receiver's signature & stamp", MX, y - 61, 8.5, GR); }

    pages.forEach((pg, i) => {
      const f = m.t.en + ' ' + (S.meta.no || '') + '   ·   Page ' + (i + 1) + ' of ' + pages.length, w = wid(f, 7.5);
      pg.drawText(L(f), { x: (W - w) / 2, y: 22, size: 7.5, font, color: GR });
      pg.drawText('pdftoolsindia.com', { x: W - MX - wid('pdftoolsindia.com', 7), y: 22, size: 7, font, color: rgb(0.6, 0.62, 0.68) });
    });
    return await doc.save();
  }

  /* ---- Excel ---- */
  function bizXlsx(m) {
    const S = m.S, c = m.c, rows = [], z = [];
    const add = (...cells) => { rows.push(cells); return rows.length - 1; };
    const money = (r, col) => z.push([r, col, '#,##0.00']);
    add(m.title); add(S.from.name); if (S.from.addr) add(S.from.addr);
    partyLines(S.from, m.taxed).forEach((l) => add(l));
    add();
    metaPairs(m).forEach((p) => add(p[0], p[1]));
    add(); add(m.t.to[1].toUpperCase()); add(S.to.name); if (S.to.addr) add(S.to.addr); partyLines(S.to, m.taxed).forEach((l) => add(l)); add();
    const cols = bizCols(m); add(...cols.map((k) => k.l));
    c.rows.forEach((r, i) => {
      const rr = add(...cols.map((k) => (['qty', 'rate', 'disc', 'taxable', 'gst', 'amount'].includes(k.k) ? (k.k === 'taxable' || k.k === 'amount' ? P(r[k.k]) : k.k === 'rate' ? r.rate : k.k === 'qty' ? r.qty : k.k === 'disc' ? r.disc : r.gst) : bizCell(k.k, r, i))));
      cols.forEach((k, ci) => { if (['rate', 'taxable', 'amount'].includes(k.k)) money(rr, ci); });
    });
    add();
    if (showTaxSummary(m)) {
      add('Tax summary');
      add(...(m.inter ? ['HSN/SAC', 'Taxable value', 'IGST %', 'IGST amount', 'Total tax'] : ['HSN/SAC', 'Taxable value', 'CGST %', 'CGST amount', 'SGST %', 'SGST amount', 'Total tax']));
      c.summary.forEach((g) => { const rr = add(...(m.inter ? [g.hsn, P(g.taxable), g.gst, P(g.igst), P(g.tax)] : [g.hsn, P(g.taxable), g.gst / 2, P(g.cgst), g.gst / 2, P(g.sgst), P(g.tax)])); [1, 3, 5, 6].forEach((ci) => money(rr, ci)); });
      add();
    }
    if (m.amounts) {
      const tr = (l, v) => { const rr = add(l, P(v)); money(rr, 1); };
      tr(m.taxed ? 'Taxable value' : 'Sub-total', c.taxable);
      if (m.taxed && c.tax) { if (m.inter) tr('IGST', c.igst); else { tr('CGST', c.cgst); tr('SGST', c.sgst); } }
      if (c.roundOff) tr('Round off', c.roundOff);
      tr('GRAND TOTAL', c.grand);
      if (c.advance) { tr('Advance received', -c.advance); tr('BALANCE DUE', c.balance); }
      add('Amount in words', 'Rupees ' + words(P(c.grand)) + ' Only'); add();
    }
    if (S.bank.acc || S.bank.name || S.bank.upi) { add('Bank details'); [['Name', S.bank.name], ['Bank', S.bank.bank], ['A/c no.', S.bank.acc], ['IFSC', S.bank.ifsc], ['UPI', S.bank.upi]].filter((p) => p[1]).forEach((p) => add(p[0], p[1])); add(); }
    const tl = String(S.terms || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (tl.length) { add('Terms & conditions'); tl.forEach((x, i) => add((i + 1) + '. ' + x)); }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    z.forEach(([r, col, f]) => { const a = XLSX.utils.encode_cell({ r, c: col }); if (ws[a] && ws[a].t === 'n') ws[a].z = f; });
    ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 9 }, { wch: 13 }, { wch: 9 }, { wch: 14 }, { wch: 8 }, { wch: 14 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, m.t.en.slice(0, 28));
    return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---- Word ---- */
  async function bizDocx(m) {
    const D = getDocxLib(), S = m.S, c = m.c;
    const R = (s, o) => new D.TextRun(Object.assign({ text: String(s == null ? '' : s) }, o || {}));
    const Pg = (s, o) => new D.Paragraph(Object.assign({ children: [R(s, o && o.run)] }, o && o.p));
    const cell = (s, o) => new D.TableCell({ children: [new D.Paragraph({ alignment: o && o.right ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [R(s, { bold: !!(o && o.bold), size: 18 })] })] });
    const cols = bizCols(m);
    const head = new D.TableRow({ tableHeader: true, children: cols.map((k) => cell(k.l, { bold: true, right: k.a === 'r' })) });
    const body = c.rows.map((r, i) => new D.TableRow({ children: cols.map((k) => cell(bizCell(k.k, r, i), { right: k.a === 'r' })) }));
    const kids = [Pg(m.title, { run: { bold: true, size: 36 } }), Pg(S.from.name, { run: { bold: true, size: 26 } })];
    if (S.from.addr) kids.push(Pg(S.from.addr)); partyLines(S.from, m.taxed).forEach((l) => kids.push(Pg(l)));
    kids.push(Pg(''));
    metaPairs(m).forEach((p) => kids.push(Pg(p[0] + ': ' + p[1])));
    kids.push(Pg('')); kids.push(Pg(m.t.to[1].toUpperCase(), { run: { bold: true, size: 18 } })); kids.push(Pg(S.to.name, { run: { bold: true, size: 24 } }));
    if (S.to.addr) kids.push(Pg(S.to.addr)); partyLines(S.to, m.taxed).forEach((l) => kids.push(Pg(l)));
    kids.push(Pg('')); kids.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: [head, ...body] })); kids.push(Pg(''));
    if (showTaxSummary(m)) {
      const hd = m.inter ? ['HSN/SAC', 'Taxable value', 'IGST %', 'IGST amount', 'Total tax'] : ['HSN/SAC', 'Taxable value', 'CGST %', 'CGST amount', 'SGST %', 'SGST amount', 'Total tax'];
      const rr = c.summary.map((g) => new D.TableRow({ children: (m.inter ? [g.hsn, inrPlain(P(g.taxable)), g.gst, inrPlain(P(g.igst)), inrPlain(P(g.tax))] : [g.hsn, inrPlain(P(g.taxable)), g.gst / 2, inrPlain(P(g.cgst)), g.gst / 2, inrPlain(P(g.sgst)), inrPlain(P(g.tax))]).map((v, i) => cell(v, { right: i > 0 })) }));
      kids.push(Pg('Tax summary', { run: { bold: true } })); kids.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: [new D.TableRow({ children: hd.map((h, i) => cell(h, { bold: true, right: i > 0 })) }), ...rr] })); kids.push(Pg(''));
    }
    if (m.amounts) {
      const line = (l, v, b) => kids.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [R(l + ': ₹' + inrPlain(P(v)), { bold: !!b, size: b ? 24 : 20 })] }));
      line(m.taxed ? 'Taxable value' : 'Sub-total', c.taxable);
      if (m.taxed && c.tax) { if (m.inter) line('IGST', c.igst); else { line('CGST', c.cgst); line('SGST', c.sgst); } }
      if (c.roundOff) line('Round off', c.roundOff);
      line('GRAND TOTAL', c.grand, true);
      if (c.advance) { line('Advance received', -c.advance); line('BALANCE DUE', c.balance, true); }
      kids.push(Pg('Amount in words: Rupees ' + words(P(c.grand)) + ' Only', { run: { bold: true } })); kids.push(Pg(''));
    }
    if (S.bank.acc || S.bank.name || S.bank.upi) { kids.push(Pg('Bank details', { run: { bold: true } })); [['Name', S.bank.name], ['Bank', S.bank.bank], ['A/c no.', S.bank.acc], ['IFSC', S.bank.ifsc], ['UPI', S.bank.upi]].filter((p) => p[1]).forEach((p) => kids.push(Pg(p[0] + ': ' + p[1]))); kids.push(Pg('')); }
    const tl = String(S.terms || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (tl.length) { kids.push(Pg('Terms & conditions', { run: { bold: true } })); tl.forEach((x, i) => kids.push(Pg((i + 1) + '. ' + x))); kids.push(Pg('')); }
    kids.push(Pg('')); kids.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [R('For ' + (S.from.name || ''))] }));
    kids.push(Pg('')); kids.push(Pg('')); kids.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [R('Authorised Signatory' + (S.signatory ? ' — ' + S.signatory : ''))] }));
    return await D.Packer.toBlob(new D.Document({ sections: [{ children: kids }] }));
  }

  /* ---- Print (hidden frame, no pop-up) and WhatsApp text ---- */
  function bizPrint(m) {
    const S = m.S, c = m.c, e = esc, cols = bizCols(m);
    const rowsHtml = c.rows.map((r, i) => '<tr>' + cols.map((k) => '<td style="text-align:' + (k.a === 'r' ? 'right' : 'left') + '">' + e(bizCell(k.k, r, i)) + '</td>').join('') + '</tr>').join('');
    const sum = showTaxSummary(m) ? '<h3>Tax summary</h3><table><tr>' + (m.inter ? ['HSN/SAC', 'Taxable value', 'IGST %', 'IGST amount', 'Total tax'] : ['HSN/SAC', 'Taxable value', 'CGST %', 'CGST amount', 'SGST %', 'SGST amount', 'Total tax']).map((h) => '<th>' + h + '</th>').join('') + '</tr>' +
      c.summary.map((g) => '<tr>' + (m.inter ? [g.hsn, inrPlain(P(g.taxable)), g.gst, inrPlain(P(g.igst)), inrPlain(P(g.tax))] : [g.hsn, inrPlain(P(g.taxable)), g.gst / 2, inrPlain(P(g.cgst)), g.gst / 2, inrPlain(P(g.sgst)), inrPlain(P(g.tax))]).map((v, i) => '<td style="text-align:' + (i ? 'right' : 'left') + '">' + e(v) + '</td>').join('') + '</tr>').join('') + '</table>' : '';
    const tot = m.amounts ? '<table class="tot">' + [[m.taxed ? 'Taxable value' : 'Sub-total', c.taxable]].concat(m.taxed && c.tax ? (m.inter ? [['IGST', c.igst]] : [['CGST', c.cgst], ['SGST', c.sgst]]) : [], c.roundOff ? [['Round off', c.roundOff]] : [], [['GRAND TOTAL', c.grand]], c.advance ? [['Advance received', -c.advance], ['BALANCE DUE', c.balance]] : [])
      .map((r) => '<tr' + (/TOTAL|BALANCE/.test(r[0]) ? ' class="b"' : '') + '><td>' + r[0] + '</td><td style="text-align:right">₹' + inrPlain(P(r[1])) + '</td></tr>').join('') + '</table><p><b>Rupees ' + e(words(P(c.grand))) + ' Only</b></p>' : '';
    const party = (p) => '<b>' + e(p.name || '—') + '</b><br>' + e(p.addr || '').replace(/\n/g, '<br>') + (partyLines(p, m.taxed).length ? '<br>' + partyLines(p, m.taxed).map(e).join('<br>') : '');
    const bank = (S.bank.acc || S.bank.name || S.bank.upi) ? '<p><b>Bank details</b><br>' + [['Name', S.bank.name], ['Bank', S.bank.bank], ['A/c no.', S.bank.acc], ['IFSC', S.bank.ifsc], ['UPI', S.bank.upi]].filter((p) => p[1]).map((p) => e(p[0] + ': ' + p[1])).join('<br>') + '</p>' : '';
    const tl = String(S.terms || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const html = '<!doctype html><meta charset="utf-8"><title>' + e(m.t.en + ' ' + S.meta.no) + '</title><link rel="stylesheet" href="/fonts/tamil.css"><style>@page{size:A4;margin:12mm}body{font-family:"Noto Sans Tamil",Arial,sans-serif;color:#222;font-size:12px}h1{margin:0 0 6px;color:#28407F;font-size:22px}h3{margin:14px 0 4px;font-size:13px;color:#28407F}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #bbb;padding:4px 6px;font-size:11.5px;vertical-align:top}th{background:#eaf0ff;text-align:left}.two{display:flex;gap:20px}.two>div{flex:1}table.tot{width:50%;margin-left:auto}table.tot td{border:none;border-bottom:1px solid #ddd}tr.b td{font-weight:800;background:#eaf0ff}</style>' +
      '<h1>' + e(m.title) + '</h1><div class="two"><div>' + party(S.from) + '</div><div>' + metaPairs(m).map((p) => '<b>' + e(p[0]) + ':</b> ' + e(p[1])).join('<br>') + '</div></div><h3>' + e(m.t.to[1]) + '</h3>' + party(S.to) +
      '<table><tr>' + cols.map((k) => '<th style="text-align:' + (k.a === 'r' ? 'right' : 'left') + '">' + e(k.l) + '</th>').join('') + '</tr>' + rowsHtml + '</table>' + sum + tot + bank +
      (tl.length ? '<p><b>Terms &amp; conditions</b><br>' + tl.map((x, i) => e((i + 1) + '. ' + x)).join('<br>') + '</p>' : '') + (S.meta.notes ? '<p>' + e(S.meta.notes).replace(/\n/g, '<br>') + '</p>' : '') +
      '<p style="margin-top:50px;text-align:right">For ' + e(S.from.name || '') + '<br><br><br>_______________________<br>Authorised Signatory' + (S.signatory ? ' — ' + e(S.signatory) : '') + '</p>';
    const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
    const d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (x) { /* ignore */ } }, 600);
    setTimeout(() => fr.remove(), 90000);
  }
  function bizWa(m) {
    const S = m.S, c = m.c;
    const L = ['*' + m.title + '*', m.t.en + ' No: ' + S.meta.no + ' | Date: ' + fmtDMY(S.meta.date), S.from.name ? 'From: ' + S.from.name : '', S.to.name ? 'To: ' + S.to.name : '', ''];
    c.rows.forEach((r) => L.push('• ' + r.desc + ' — ' + +r.qty.toFixed(3) + ' ' + (r.unit || '') + (m.amounts ? ' × ₹' + inrPlain(r.rate) + ' = ₹' + inrPlain(P(r.amount)) : '')));
    if (m.amounts) {
      L.push('', m.taxed ? 'Taxable: ₹' + inrPlain(P(c.taxable)) : '');
      if (m.taxed && c.tax) L.push(m.inter ? 'IGST: ₹' + inrPlain(P(c.igst)) : 'CGST: ₹' + inrPlain(P(c.cgst)) + ' | SGST: ₹' + inrPlain(P(c.sgst)));
      L.push('*Total: ₹' + inrPlain(P(c.grand)) + '*', '(Rupees ' + words(P(c.grand)) + ' Only)');
      if (c.advance) L.push('Advance: ₹' + inrPlain(P(c.advance)), '*Balance due: ₹' + inrPlain(P(c.balance)) + '*');
      if (S.bank.upi) L.push('', 'Pay by UPI: ' + S.bank.upi);
      else if (S.bank.acc) L.push('', 'Bank: ' + [S.bank.name, S.bank.bank, 'A/c ' + S.bank.acc, 'IFSC ' + S.bank.ifsc].filter(Boolean).join(', '));
    }
    return L.filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  }


  /* =====================================================================
     RECEIPTS & VOUCHERS — rent, tuition, money receipt, payment voucher
     One engine; the old tool ids (rentreceipt, tuitionreceipt, paymentvoucher)
     open it locked to their own type so existing links keep working.
     ===================================================================== */
  const RC_SEQ = 'pti-rcpt-seq-v1', RC_ISS = 'pti-rcpt-issuer-v1';
  const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
  const RC = {
    rent: { en: 'Rent Receipt', ta: 'வாடகை ரசீது', prefix: 'RR', icon: '🏠', series: true, issuer: ['வீட்டு உரிமையாளர்', 'Landlord'], payer: ['வாடகைதாரர்', 'Tenant'] },
    tuition: { en: 'Tuition Fee Receipt', ta: 'கல்விக் கட்டண ரசீது', prefix: 'TF', icon: '📚', series: true, issuer: ['ஆசிரியர் / நிறுவனம்', 'Tutor / Institute'], payer: ['மாணவர் / பெற்றோர்', 'Student / Parent'] },
    general: { en: 'Money Receipt', ta: 'பணம் பெற்ற ரசீது', prefix: 'RC', icon: '🧾', issuer: ['பணம் பெற்றவர்', 'Received by'], payer: ['பணம் கொடுத்தவர்', 'Received from'] },
    voucher: { en: 'Payment Voucher', ta: 'பணம் செலுத்தும் சீட்டு', prefix: 'PV', icon: '🧮', issuer: ['நிறுவனம் (செலுத்துபவர்)', 'Company (paying)'], payer: ['பெறுபவர் (Payee)', 'Paid to (Payee)'] },
  };
  const HEADS = ['Salary / Wages', 'Rent', 'Electricity / Water', 'Travel / Fuel', 'Purchase / Materials', 'Office expenses', 'Repairs', 'Professional fees', 'Advance', 'Other'];
  const MODES = ['UPI', 'Cash', 'Bank Transfer', 'Cheque', 'Card', 'DD'];
  const tl = (lang, en, ta) => (lang === 'en' ? en : lang === 'ta' ? ta : en + ' / ' + ta);
  const money = (v) => Math.round(num(v) * 100) / 100;
  const validISO = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return false; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]; };
  const addMonthsISO = (iso, k) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); const idx = +m[1] * 12 + (+m[2] - 1) + k, y = Math.floor(idx / 12), mo = idx % 12, dim = new Date(y, mo + 1, 0).getDate(); return y + '-' + pad2(mo + 1) + '-' + pad2(Math.min(+m[3], dim)); };
  const incNo = (no, k) => { const m = /^(.*?)(\d+)\s*$/.exec(no || ''); return m ? m[1] + String(+m[2] + k).padStart(m[2].length, '0') : (no || '') + (k ? '-' + (k + 1) : ''); };
  function rcNo(type, date) { const seqs = lsGet(RC_SEQ, {}), n = (seqs[type] || 0) + 1; return RC[type].prefix + '/' + fyOf(date) + '/' + String(n).padStart(3, '0'); }
  function rcBump(type, no) { const m = /(\d+)\s*$/.exec(no || ''); if (!m) return; const seqs = lsGet(RC_SEQ, {}); seqs[type] = Math.max(seqs[type] || 0, +m[1]); lsSet(RC_SEQ, seqs); }
  const rcIssuer = (type) => Object.assign({ name: '', addr: '', pan: '', phone: '' }, (lsGet(RC_ISS, {}) || {})[type] || {});
  function blankRc(type) {
    const date = localISO();
    return {
      v: 1, type, lang: 'bi', no: rcNo(type, date), date, issuer: rcIssuer(type), payer: { name: '', addr: '', pan: '', phone: '' },
      amount: '', mode: 'UPI', ref: '', purpose: '',
      x: { months: 1, fromMonth: date.slice(0, 7), single: false, property: '', student: '', cls: '', subjects: '', otherLabel: '', otherAmt: '', head: 'Other', invNo: '', balance: '', stampBox: false },
      rows: [{ d: '', a: '' }],
    };
  }
  const rcTotal = (S) => (S.type === 'voucher' ? S.rows.reduce((a, r) => a + money(r.a), 0) : money(S.amount));
  function rcCount(S) { return RC[S.type].series ? Math.min(12, Math.max(1, Math.floor(num(S.x.months)) || 1)) : 1; }
  function monthLabel(lang, iso, k) {
    const m = /^(\d{4})-(\d{2})/.exec(iso || ''); if (!m) return '';
    const idx = +m[1] * 12 + (+m[2] - 1) + (k || 0), y = Math.floor(idx / 12), mo = idx % 12;
    return tl(lang, MON_EN[mo] + ' ' + y, MON_TA[mo] + ' ' + y);
  }
  function rcWords(lang, n) {
    const en = 'Rupees ' + words(n) + ' Only';
    let ta = en; try { if (typeof TamilCore !== 'undefined' && TamilCore.rupeesToWords) ta = TamilCore.rupeesToWords(n); } catch (e) { /* english only */ }
    return lang === 'en' ? [en] : lang === 'ta' ? [ta] : [en, ta];
  }
  // every slip = one receipt (series types produce one per month)
  function buildSlips(S) {
    const R = RC[S.type], x = S.x, lang = S.lang, t = (en, ta) => tl(lang, en, ta);
    const mode = S.mode + (S.ref.trim() ? ' (' + S.ref.trim() + ')' : '');
    const base = { title: t(R.en, R.ta), role: t(R.issuer[1], R.issuer[0]), payRole: t(R.payer[1], R.payer[0]), issuer: S.issuer, payer: S.payer, mode, stamp: !!x.stampBox, type: S.type };
    if (S.type === 'voucher') {
      const rows = S.rows.filter((r) => String(r.d).trim() || money(r.a)).map((r) => ({ d: String(r.d || '—'), a: money(r.a) }));
      return [Object.assign({}, base, { no: S.no, date: S.date, rows, amount: rcTotal(S), head: x.head, purpose: S.purpose })];
    }
    const per = money(S.amount), n = rcCount(S), other = money(x.otherAmt), out = [];
    const mk = (i, count, amount) => {
      const period = count > 1 ? monthLabel(lang, x.fromMonth, 0) + ' – ' + monthLabel(lang, x.fromMonth, count - 1) : monthLabel(lang, x.fromMonth, i);
      const rows = [];
      if (S.type === 'rent') {
        rows.push([t('Received from', 'பெறப்பட்டது'), S.payer.name + (S.payer.pan ? ' (PAN ' + S.payer.pan + ')' : '')]);
        rows.push([t('Rent for', 'வாடகை காலம்'), period]);
        rows.push([t('Premises', 'இடம்'), x.property]);
      } else if (S.type === 'tuition') {
        rows.push([t('Received from', 'பெறப்பட்டது'), S.payer.name]);
        rows.push([t('Student', 'மாணவர்'), [x.student, x.cls && (t('Class ', 'வகுப்பு ') + x.cls)].filter(Boolean).join(' — ')]);
        if (x.subjects.trim()) rows.push([t('Subjects', 'பாடங்கள்'), x.subjects]);
        rows.push([t('Fee for', 'கட்டணக் காலம்'), period]);
        if (other && i === 0) rows.push([x.otherLabel || t('Other fee', 'பிற கட்டணம்'), '₹' + inrPlain(other)]);
      } else {
        rows.push([t('Received from', 'பெறப்பட்டது'), S.payer.name]);
        rows.push([t('Towards', 'எதற்காக'), S.purpose]);
        if (x.invNo.trim()) rows.push([t('Against invoice', 'விலைப்பட்டியல் எண்'), x.invNo]);
        if (money(x.balance)) rows.push([t('Balance still due', 'நிலுவை'), '₹' + inrPlain(money(x.balance))]);
      }
      rows.push([t('Payment mode', 'செலுத்திய முறை'), mode]);
      return { rows: rows.filter((r) => String(r[1]).trim()), amount };
    };
    if (RC[S.type].series && x.single && n > 1) {
      const s = mk(0, n, per * n + (S.type === 'tuition' ? other : 0)); out.push(Object.assign({}, base, s, { no: S.no, date: S.date }));
    } else {
      for (let i = 0; i < n; i++) { const s = mk(i, 1, per + (S.type === 'tuition' && i === 0 ? other : 0)); out.push(Object.assign({}, base, s, { no: incNo(S.no, i), date: i ? addMonthsISO(S.date, i) : S.date })); }
    }
    return out;
  }
  function rcProblems(S) {
    const errs = [], warns = [], R = RC[S.type], x = S.x, total = rcTotal(S);
    if (!S.issuer.name.trim()) errs.push(B(R.issuer[0] + ' பெயர் தேவை', R.issuer[1] + ' name is required'));
    if (!S.payer.name.trim()) errs.push(B(R.payer[0] + ' பெயர் தேவை', R.payer[1] + ' name is required'));
    if (!(total > 0)) errs.push(B('தொகை 0-ஐ விட அதிகமாக இருக்க வேண்டும்', 'Amount must be more than 0'));
    if (!validISO(S.date)) errs.push(B('சரியான தேதி தேர்வு செய்யுங்கள்', 'Choose a valid date'));
    if (R.series) {
      if (!/^\d{4}-\d{2}$/.test(x.fromMonth || '')) errs.push(B('மாதம் தேர்வு செய்யுங்கள்', 'Choose the month'));
      if (!(num(x.months) >= 1 && num(x.months) <= 12)) errs.push(B('மாதங்கள் 1 முதல் 12 வரை', 'Months must be 1 to 12'));
    }
    if (S.type === 'rent' && !x.property.trim()) errs.push(B('வீட்டு முகவரி தேவை', 'Rented premises address is required'));
    if (S.type === 'tuition' && !x.student.trim()) errs.push(B('மாணவர் பெயர் தேவை', 'Student name is required'));
    if (S.type === 'general' && !S.purpose.trim()) errs.push(B('"எதற்காக" என்பதை எழுதுங்கள்', 'Write what the payment is for'));
    if (S.type === 'voucher' && !S.rows.some((r) => money(r.a) > 0)) errs.push(B('குறைந்தது ஒரு வரியில் தொகை தேவை', 'Add at least one line with an amount'));
    [['issuer', R.issuer], ['payer', R.payer]].forEach((p) => { const v = String(S[p[0]].pan || '').trim().toUpperCase(); if (v && !PAN_RE.test(v)) errs.push(B(p[1][0] + ' PAN வடிவம் தவறு (AAAAA0000A)', p[1][1] + ' PAN format looks wrong (AAAAA0000A)')); });
    const perSlip = S.type === 'voucher' ? total : money(S.amount);
    if (S.type === 'rent' && money(S.amount) * 12 > 100000 && !String(S.issuer.pan || '').trim()) warns.push(B('ஆண்டு வாடகை ₹1,00,000-ஐ தாண்டினால் HRA-க்கு வீட்டு உரிமையாளர் PAN தேவை', 'Annual rent above ₹1,00,000: landlord PAN is needed for an HRA claim'));
    if (S.mode === 'Cash' && perSlip > 5000) warns.push(B('₹5,000-க்கு மேல் ரொக்க ரசீதுக்கு வருவாய் முத்திரை தேவைப்படலாம் (மாநில விதிப்படி) — தேவையெனில் "முத்திரை இடம்" தேர்வு செய்யுங்கள்', 'A revenue stamp may be needed on cash receipts above ₹5,000 (state rules) — tick "Revenue stamp box" if you need one'));
    if (S.mode === 'Cash' && perSlip >= 200000 && S.type !== 'voucher') warns.push(B('₹2 லட்சம் அல்லது அதற்கு மேல் ரொக்கமாகப் பெறுவது வருமான வரிச் சட்டம் 269ST-ன்படி தடை', 'Receiving ₹2 lakh or more in cash is prohibited by Income Tax Act section 269ST'));
    if (S.mode === 'Cash' && perSlip > 10000 && S.type === 'voucher') warns.push(B('ஒரு நாளில் ₹10,000-க்கு மேல் ரொக்கமாகச் செலுத்தினால் வணிகச் செலவாகக் கழிக்க முடியாமல் போகலாம் (பிரிவு 40A(3))', 'Cash payments above ₹10,000 a day to one person may be disallowed as a business expense (section 40A(3))'));
    return { errs, warns };
  }

  function mountReceipts(container, toolId, lockedType) {
    const host = root(container), DKEY = 'pti-rcpt-draft-' + toolId + '-v1';
    let S = lsGet(DKEY, null);
    if (!S || S.v !== 1 || !RC[S.type] || !Array.isArray(S.rows) || !S.rows.length) S = blankRc(lockedType || 'rent');
    if (lockedType && S.type !== lockedType) S = blankRc(lockedType);
    const saveDraft = () => lsSet(DKEY, S);
    const fld = (label, path, o) => { o = o || {}; const v = getPath(S, path); return '<div class="dx-f"><label>' + label + '</label><input type="' + (o.type || 'text') + '" data-p="' + path + '" value="' + esc(v) + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.min != null ? ' min="' + o.min + '"' : '') + (o.max != null ? ' max="' + o.max + '"' : '') + (o.step ? ' step="' + o.step + '"' : '') + ' autocomplete="off"></div>'; };
    const area = (label, path, rows) => '<div class="dx-f"><label>' + label + '</label><textarea data-p="' + path + '" rows="' + rows + '">' + esc(getPath(S, path)) + '</textarea></div>';
    const opts = (list, sel) => list.map((o) => '<option' + (o === sel ? ' selected' : '') + '>' + esc(o) + '</option>').join('');
    const chk = (label, path) => '<label class="dx-chk"><input type="checkbox" data-p="' + path + '"' + (getPath(S, path) ? ' checked' : '') + '> ' + label + '</label>';

    function paint() {
      const R = RC[S.type];
      const typeSel = lockedType ? '' : '<div class="dx-f"><label>' + B('ரசீது வகை', 'Receipt type') + '</label><select data-p="type">' + Object.keys(RC).map((k) => '<option value="' + k + '"' + (k === S.type ? ' selected' : '') + '>' + RC[k].icon + ' ' + esc(isEn() ? RC[k].en + ' · ' + RC[k].ta : RC[k].ta + ' · ' + RC[k].en) + '</option>').join('') + '</select></div>';
      let h = '<div class="dx-note">' + RC[S.type].icon + ' <b>' + esc(isEn() ? R.en : R.ta) + '</b> — ' + B('உங்கள் விவரங்கள் இந்தச் சாதனத்திலேயே சேமிக்கப்படும்; எதுவும் சர்வருக்குப் போகாது.', 'your details stay on this device; nothing is sent to a server.') + '</div>' + typeSel +
        '<div class="dx-grid"><div class="dx-f"><label>' + B('ஆவண மொழி', 'Document language') + '</label><select data-p="lang">' + [['bi', 'தமிழ் + EN'], ['ta', 'தமிழ்'], ['en', 'English']].map((o) => '<option value="' + o[0] + '"' + (S.lang === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' + fld(B('ரசீது எண்', 'Receipt no.'), 'no') + '</div>' +
        '<div class="dx-grid">' + fld(B('தேதி', 'Date'), 'date', { type: 'date' }) + '<div class="dx-f"><label>' + B('செலுத்திய முறை', 'Payment mode') + '</label><select data-p="mode">' + opts(MODES, S.mode) + '</select></div></div>' +
        fld(B('பரிவர்த்தனை / காசோலை எண் (விருப்பம்)', 'UPI ref / cheque no. (optional)'), 'ref') +
        '<h3 class="dx-h">' + esc(R.issuer[isEn() ? 1 : 0]) + '</h3>' + fld(B('பெயர்', 'Name'), 'issuer.name') + area(B('முகவரி', 'Address'), 'issuer.addr', 2) +
        '<div class="dx-grid">' + fld('PAN' + (S.type === 'rent' ? ' ' + B('(HRA-க்கு)', '(for HRA)') : ' ' + B('(விருப்பம்)', '(optional)')), 'issuer.pan', { ph: 'AAAAA0000A' }) + fld(B('கைபேசி', 'Mobile'), 'issuer.phone', { type: 'tel', mode: 'tel' }) + '</div>' +
        '<h3 class="dx-h">' + esc(R.payer[isEn() ? 1 : 0]) + '</h3>' + fld(B('பெயர்', 'Name'), 'payer.name') + (S.type === 'voucher' || S.type === 'general' ? area(B('முகவரி (விருப்பம்)', 'Address (optional)'), 'payer.addr', 2) : '') +
        (S.type === 'rent' || S.type === 'general' ? fld('PAN ' + B('(விருப்பம்)', '(optional)'), 'payer.pan', { ph: 'AAAAA0000A' }) : '');
      if (S.type === 'rent') h += '<h3 class="dx-h">' + B('வாடகை விவரம்', 'Rent details') + '</h3>' + area(B('வாடகை வீட்டு முகவரி', 'Rented premises address'), 'x.property', 2);
      if (S.type === 'tuition') h += '<h3 class="dx-h">' + B('மாணவர் விவரம்', 'Student details') + '</h3><div class="dx-grid">' + fld(B('மாணவர் பெயர்', 'Student name'), 'x.student') + fld(B('வகுப்பு', 'Class'), 'x.cls') + '</div>' + fld(B('பாடங்கள் (விருப்பம்)', 'Subjects (optional)'), 'x.subjects');
      if (S.type === 'general') h += '<h3 class="dx-h">' + B('விவரம்', 'Details') + '</h3>' + fld(B('எதற்காக (Towards)', 'Towards'), 'purpose', { ph: B('எ.கா. முன்பணம் / பொருள் விலை', 'e.g. advance / goods') }) + '<div class="dx-grid">' + fld(B('விலைப்பட்டியல் எண் (விருப்பம்)', 'Invoice no. (optional)'), 'x.invNo') + fld(B('மீதமுள்ள நிலுவை ₹ (விருப்பம்)', 'Balance still due ₹ (optional)'), 'x.balance', { type: 'number', mode: 'decimal', min: 0, step: 'any' }) + '</div>';
      if (S.type === 'voucher') {
        h += '<h3 class="dx-h">' + B('செலவு விவரம்', 'Particulars') + '</h3><div class="dx-f"><label>' + B('கணக்குத் தலைப்பு', 'Account head') + '</label><select data-p="x.head">' + opts(HEADS, S.x.head) + '</select></div>' +
          S.rows.map((r, i) => '<div class="dx-item"><div class="dx-ih"><span>#' + (i + 1) + '</span>' + (S.rows.length > 1 ? '<button type="button" class="dx-del" data-del="' + i + '" aria-label="' + esc(B('வரியை நீக்கு', 'Remove line')) + '">✕</button>' : '') + '</div>' +
            '<input type="text" data-r="' + i + '.d" value="' + esc(r.d) + '" placeholder="' + esc(B('விளக்கம் / எதற்காக', 'Particulars / purpose')) + '" aria-label="' + esc(B('விளக்கம்', 'Particulars')) + '">' +
            '<div class="dx-f"><label>' + B('தொகை ₹', 'Amount ₹') + '</label><input type="number" inputmode="decimal" min="0" step="any" data-r="' + i + '.a" value="' + esc(r.a) + '"></div></div>').join('') +
          '<div class="dx-row"><button type="button" class="dx-btn sec" data-addrow="1">＋ ' + B('வரி சேர்', 'Add line') + '</button></div>' + fld(B('குறிப்பு (விருப்பம்)', 'Remarks (optional)'), 'purpose');
      } else {
        h += '<h3 class="dx-h">' + B('தொகை', 'Amount') + '</h3><div class="dx-grid">' + fld(R.series ? B('ஒரு மாதத்துக்கு ₹', 'Per month ₹') : B('தொகை ₹', 'Amount ₹'), 'amount', { type: 'number', mode: 'decimal', min: 0, step: 'any' }) +
          (S.type === 'tuition' ? fld(B('பிற கட்டணம் ₹ (முதல் ரசீதில்)', 'Other fee ₹ (first receipt)'), 'x.otherAmt', { type: 'number', mode: 'decimal', min: 0, step: 'any' }) : '<div></div>') + '</div>' +
          (S.type === 'tuition' ? fld(B('பிற கட்டணப் பெயர் (எ.கா. புத்தகம்)', 'Other fee name (e.g. books)'), 'x.otherLabel') : '');
        if (R.series) h += '<div class="dx-grid"><div class="dx-f"><label>' + B('தொடக்க மாதம்', 'Starting month') + '</label><input type="month" data-p="x.fromMonth" value="' + esc(S.x.fromMonth) + '"></div>' + fld(B('எத்தனை மாதங்கள் (1–12)', 'How many months (1–12)'), 'x.months', { type: 'number', mode: 'numeric', min: 1, max: 12, step: 1 }) + '</div>' +
          '<div id="rcSingleWrap">' + chk(B('எல்லா மாதங்களுக்கும் ஒரே ரசீது', 'One receipt for all the months'), 'x.single') + '</div>';
      }
      h += chk(B('வருவாய் முத்திரை இடம் (Revenue stamp box) சேர்', 'Add a revenue stamp box'), 'x.stampBox') +
        '<div class="dx-sum" id="rcSum" aria-live="polite"></div><div id="rcWarn"></div><div data-k="msg" aria-live="polite"></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn" data-out="pdf">📄 PDF</button><button type="button" class="dx-btn sec" data-out="print">🖨️ ' + B('திற / அச்சிடு', 'Open / Print') + '</button><button type="button" class="dx-btn sec" data-out="wa">💬 WhatsApp</button></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-new="1">🆕 ' + B('புதிய ரசீது (உங்கள் விவரம் இருக்கும்)', 'New receipt (keeps your details)') + '</button></div>';
      host.innerHTML = h; refresh();
    }
    function refresh() {
      const sum = host.querySelector('#rcSum'); if (!sum) return;
      const total = rcTotal(S), n = rcCount(S), series = RC[S.type].series, extra = S.type === 'tuition' ? money(S.x.otherAmt) : 0;
      const grand = series ? money(S.amount) * n + extra : total;
      const wrap = host.querySelector('#rcSingleWrap'); if (wrap) wrap.style.display = n > 1 ? '' : 'none';
      sum.innerHTML = '<div class="tot">' + inr(grand) + '</div>' + (series && n > 1 ? '<div class="wd">' + n + ' ' + B('ரசீதுகள்', 'receipts') + (S.x.single ? ' → ' + B('ஒரே ரசீதாக', 'as one receipt') : ' × ' + inr(money(S.amount))) + '</div>' : '') +
        (grand > 0 ? '<div class="wd">' + esc(rcWords(S.lang === 'en' ? 'en' : isEn() ? 'en' : 'ta', grand)[0]) + '</div>' : '');
      const pr = rcProblems(S); host.querySelector('#rcWarn').innerHTML = pr.warns.length ? '<div class="dx-warn">⚠ ' + pr.warns.map(esc).join('<br>⚠ ') + '</div>' : '';
    }
    host.addEventListener('input', onIn); host.addEventListener('change', onIn);
    function onIn(e) {
      const t = e.target, p = t.getAttribute && t.getAttribute('data-p'), r = t.getAttribute && t.getAttribute('data-r');
      if (r) { const m = /^(\d+)\.(d|a)$/.exec(r); if (m && S.rows[+m[1]]) S.rows[+m[1]][m[2]] = t.value; refresh(); saveDraft(); return; }
      if (!p) return;
      const v = t.type === 'checkbox' ? t.checked : t.value;
      if (p === 'type') {
        if (RC[v]) { S = blankRc(v); S.lang = host.querySelector('[data-p=lang]').value; S.mode = host.querySelector('[data-p=mode]').value; paint(); saveDraft(); }
        return;
      }
      setPath(S, p, p === 'issuer.pan' || p === 'payer.pan' ? String(v).toUpperCase() : v);
      if (p === 'date' && validISO(v) && /^\w+\/\d{4}-\d{2}\//.test(S.no)) S.no = S.no.replace(/\/\d{4}-\d{2}\//, '/' + fyOf(v) + '/');
      if (p === 'x.months' || p === 'lang') paint(); else refresh();
      saveDraft();
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-addrow')) { S.rows.push({ d: '', a: '' }); paint(); saveDraft(); }
      else if (b.hasAttribute('data-del')) { S.rows.splice(+b.getAttribute('data-del'), 1); paint(); saveDraft(); }
      else if (b.hasAttribute('data-new')) { const keep = { lang: S.lang, mode: S.mode, issuer: S.issuer }; S = blankRc(S.type); Object.assign(S, keep); S.no = rcNo(S.type, S.date); paint(); saveDraft(); }
      else if (b.hasAttribute('data-out')) run(b.getAttribute('data-out'));
    });
    async function run(kind) {
      const msg = host.querySelector('[data-k=msg]'), pr = rcProblems(S);
      if (pr.errs.length) { msg.innerHTML = '<div class="dx-err" role="alert">' + pr.errs.map(esc).join('<br>') + '</div>'; return; }
      const btns = host.querySelectorAll('[data-out]'); btns.forEach((x) => (x.disabled = true));
      msg.innerHTML = '<div class="dx-note">⏳ ' + B('தயாராகிறது…', 'Preparing…') + '</div>';
      try {
        const slips = buildSlips(S), base = fileSafe(RC[S.type].en + '-' + slips[0].no + (slips.length > 1 ? '-x' + slips.length : ''));
        if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(rcWa(S, slips)), '_blank');
        else {
          const blob = new Blob([await rcPdf(S, slips)], { type: 'application/pdf' });
          if (kind === 'print') { const url = URL.createObjectURL(blob); if (!window.open(url, '_blank')) downloadBlob(blob, base + '.pdf'); setTimeout(() => URL.revokeObjectURL(url), 120000); }
          else downloadBlob(blob, base + '.pdf');
        }
        const all = lsGet(RC_ISS, {}) || {}; all[S.type] = S.issuer; lsSet(RC_ISS, all); rcBump(S.type, incNo(S.no, slips.length - 1)); saveDraft();
        msg.innerHTML = '<div class="dx-ok">✓ ' + slips.length + ' ' + B('ரசீது தயார்', 'receipt(s) ready') + ' — ' + inr(slips.reduce((a, s) => a + s.amount, 0)) + '</div>' + (pr.warns.length ? '<div class="dx-warn">⚠ ' + pr.warns.map(esc).join('<br>⚠ ') + '</div>' : '');
      } catch (err) { msg.innerHTML = '<div class="dx-err" role="alert">' + B('உருவாக்க முடியவில்லை: ', 'Could not create it: ') + esc(err && err.message || err) + '</div>'; }
      finally { btns.forEach((x) => (x.disabled = false)); }
    }
    paint();
  }

  function rcWa(S, slips) {
    const s = slips[0], L = ['*' + s.title + '*', 'No: ' + s.no + ' | Date: ' + fmtDMY(s.date), s.issuer.name ? s.role + ': ' + s.issuer.name : ''];
    if (s.type === 'voucher') { L.push(s.payRole + ': ' + s.payer.name); s.rows.forEach((r) => L.push('• ' + r.d + ' — ₹' + inrPlain(r.a))); }
    else s.rows.forEach((r) => L.push(r[0] + ': ' + r[1]));
    L.push('*Amount: ₹' + inrPlain(slips.reduce((a, x) => a + x.amount, 0)) + '*', rcWords('en', slips.reduce((a, x) => a + x.amount, 0))[0]);
    if (slips.length > 1) L.push('(' + slips.length + ' receipts)');
    return L.filter(Boolean).join('\n');
  }

  async function rcPdf(S, slips) {
    const doc = await PDFDocument.create(); doc.setTitle(RC[S.type].en + ' ' + S.no); doc.setCreator('pdftoolsindia.com');
    const font = await embedUnicodeFont(doc), uni = !!font.__mixedShape;
    const L = (s) => { s = String(s == null ? '' : s); return uni ? s : s.replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); };
    const W = 595.28, H = 841.89, MX = 36;
    const INK = rgb(0.1, 0.1, 0.12), GR = rgb(0.38, 0.4, 0.46), LN = rgb(0.78, 0.8, 0.85), BR = rgb(0.16, 0.25, 0.5), HD = rgb(0.92, 0.94, 0.99);
    let page;
    const txt = (s, x, y, size, color) => page.drawText(L(s), { x, y, size: size || 9, font, color: color || INK });
    const bold = (s, x, y, size, color) => { txt(s, x, y, size, color); txt(s, x + 0.3, y, size, color); };
    const wid = (s, size) => font.widthOfTextAtSize(L(s), size);
    const wrap = (s, size, w, max) => wrapLines(font, L(s), size, w, max);
    const hline = (y, x1, x2, th, col) => page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: th || 0.6, color: col || LN });
    const stampBox = (x, y) => { page.drawRectangle({ x, y, width: 80, height: 60, borderColor: LN, borderWidth: 0.8, borderDashArray: [3, 3] }); txt(S.lang === 'ta' ? 'வருவாய் முத்திரை' : S.lang === 'en' ? 'Revenue stamp' : 'Revenue stamp', x + 6, y + 36, 7, GR); if (S.lang === 'bi') txt('வருவாய் முத்திரை', x + 6, y + 26, 7, GR); };
    const party = (p, x, y, w) => { wrap(p.name || '—', 11, w, 2).forEach((ln) => { bold(ln, x, y, 11); y -= 14; }); wrap(p.addr, 8.5, w, 3).forEach((ln) => { txt(ln, x, y, 8.5, GR); y -= 11; }); [p.pan ? 'PAN: ' + p.pan : '', p.phone ? 'Mob: ' + p.phone : ''].filter(Boolean).forEach((ln) => { txt(ln, x, y, 8.5); y -= 11; }); return y; };
    const words = (amount) => rcWords(S.lang, amount);

    function drawSlip(s, top) {
      const SH = (H - 2 * MX) / 2 - 8, x0 = MX, cw = W - 2 * MX, ix = x0 + 16, iw = cw - 32, bottom = top - SH;
      page.drawRectangle({ x: x0, y: bottom, width: cw, height: SH, borderColor: LN, borderWidth: 0.9 });
      let y = top - 30; bold(s.title, ix, y, 15, BR);
      const meta = [tl(S.lang, 'No', 'எண்') + ': ' + s.no, tl(S.lang, 'Date', 'தேதி') + ': ' + fmtDMY(s.date)];
      meta.forEach((m, i) => txt(m, ix + iw - wid(m, 9), y + 2 - i * 12, 9)); y -= 22; hline(y, ix, ix + iw); y -= 18;
      s.rows.forEach((r) => { const v = wrap(r[1], 10, iw - 168, 2); wrap(r[0], 8, 160, 2).forEach((ln, i) => txt(ln, ix, y - i * 10, 8, GR)); v.forEach((ln, i) => txt(ln, ix + 168, y - i * 12, 10)); y -= 12 * v.length + 7; });
      y -= 2; const wl = words(s.amount).flatMap((w) => wrap(w, 8.5, iw - 20, 2)), bh = 38 + wl.length * 11;
      page.drawRectangle({ x: ix, y: y - bh + 10, width: iw, height: bh, color: HD });
      bold('₹ ' + inrPlain(s.amount), ix + 10, y - 14, 17, BR); wl.forEach((w, i) => txt(w, ix + 10, y - 30 - i * 11, 8.5));
      y -= bh + 8;
      const sy = Math.max(bottom + 70, y - 8);
      txt(s.role, ix, sy, 8, GR); const endY = party(s.issuer, ix, sy - 13, iw * 0.55);
      const sigX = ix + iw - 170, lineY = bottom + 30;
      if (s.stamp) stampBox(sigX + 90, lineY + 8);
      hline(lineY, sigX, ix + iw, 0.8, rgb(0.55, 0.57, 0.62)); wrap(tl(S.lang, 'Signature', 'கையொப்பம்') + ' — ' + (s.issuer.name || ''), 8, 170, 2).forEach((ln, i) => txt(ln, sigX, lineY - 11 - i * 10, 8, GR));
      void endY;
    }
    function drawVoucher(s) {
      page = doc.addPage([W, H]); let y = H - MX - 6, cw = W - 2 * MX;
      wrap(s.issuer.name || '—', 15, cw, 2).forEach((ln) => { bold(ln, MX, y, 15); y -= 18; });
      wrap(s.issuer.addr, 9, cw, 3).forEach((ln) => { txt(ln, MX, y, 9, GR); y -= 12; });
      [s.issuer.pan ? 'PAN: ' + s.issuer.pan : '', s.issuer.phone ? 'Mob: ' + s.issuer.phone : ''].filter(Boolean).forEach((ln) => { txt(ln, MX, y, 9); y -= 12; });
      y -= 6; hline(y, MX, W - MX, 1, BR); y -= 24; const tw = wid(s.title, 15); bold(s.title, (W - tw) / 2, y, 15, BR); y -= 26;
      page.drawRectangle({ x: W - MX - 190, y: y - 18, width: 190, height: 40, color: HD });
      txt(tl(S.lang, 'Voucher no', 'சீட்டு எண்') + ': ' + s.no, W - MX - 182, y + 8, 9); txt(tl(S.lang, 'Date', 'தேதி') + ': ' + fmtDMY(s.date), W - MX - 182, y - 8, 9);
      txt(s.payRole, MX, y + 8, 8, GR); y = Math.min(party(s.payer, MX, y - 5, 300), y - 30) - 8;
      txt(tl(S.lang, 'Account head', 'கணக்குத் தலைப்பு') + ': ' + s.head, MX, y, 9.5); txt(tl(S.lang, 'Mode', 'முறை') + ': ' + s.mode, MX + 270, y, 9.5); y -= 20;
      const c1 = MX + 34, c2 = W - MX - 110; page.drawRectangle({ x: MX, y: y - 6, width: cw, height: 20, color: HD });
      bold('#', MX + 8, y, 9, BR); bold(tl(S.lang, 'Particulars', 'விளக்கம்'), c1, y, 9, BR); { const ah = tl(S.lang, 'Amount ₹', 'தொகை ₹'); bold(ah, W - MX - 10 - wid(ah, 9), y, 9, BR); } y -= 22;
      s.rows.forEach((r, i) => { const ln = wrap(r.d, 9.5, c2 - c1 - 12, 3); txt(String(i + 1), MX + 8, y, 9.5); ln.forEach((l, k) => txt(l, c1, y - k * 12, 9.5)); const a = inrPlain(r.a); txt(a, W - MX - 10 - wid(a, 9.5), y, 9.5); y -= 12 * ln.length + 5; hline(y + 2, MX, W - MX); y -= 8; });
      y -= 4; const tt = '₹ ' + inrPlain(s.amount), tlb = tl(S.lang, 'Total', 'மொத்தம்'); bold(tt, W - MX - 10 - wid(tt, 11), y, 11, BR); bold(tlb, W - MX - 10 - wid(tt, 11) - 14 - wid(tlb, 11), y, 11); y -= 20;
      words(s.amount).forEach((w) => wrap(w, 9, cw, 2).forEach((ln) => { txt(ln, MX, y, 9); y -= 12; }));
      if (s.purpose) { y -= 6; wrap(tl(S.lang, 'Remarks', 'குறிப்பு') + ': ' + s.purpose, 9, cw, 3).forEach((ln) => { txt(ln, MX, y, 9, GR); y -= 12; }); }
      const sy = Math.min(y - 60, 190), cols = [[tl(S.lang, 'Prepared by', 'தயாரித்தவர்'), MX], [tl(S.lang, 'Approved by', 'அனுமதித்தவர்'), MX + cw / 3 + 6], [tl(S.lang, 'Received by (Payee)', 'பெற்றவர் (கையொப்பம்)'), MX + 2 * cw / 3 + 12]];
      if (s.stamp) stampBox(MX + cw - 18 - 80 + 0, sy + 12);
      cols.forEach((c) => { hline(sy, c[1], c[1] + cw / 3 - 18, 0.8, rgb(0.55, 0.57, 0.62)); wrap(c[0], 8.5, cw / 3 - 18, 2).forEach((ln, i) => txt(ln, c[1], sy - 12 - i * 11, 8.5, GR)); });
    }
    if (S.type === 'voucher') drawVoucher(slips[0]);
    else for (let i = 0; i < slips.length; i += 2) {
      page = doc.addPage([W, H]); drawSlip(slips[i], H - MX);
      if (slips[i + 1]) { const my = H / 2; page.drawLine({ start: { x: MX, y: my }, end: { x: W - MX, y: my }, thickness: 0.6, color: LN, dashArray: [4, 4] }); drawSlip(slips[i + 1], my - 8); }
    }
    return doc.save();
  }

  TOOL_IMPL.receipts = { mount(container) { mountReceipts(container, 'receipts', null); } };
  TOOL_IMPL.receipts._f = { buildSlips, rcProblems, rcTotal, incNo, addMonthsISO, rcWords, blankRc };


  /* =====================================================================
     SALARY SLIP — LOP pro-rating, PF / ESI auto-calculation, custom rows,
     saved employees, Tamil / English, PDF + print + WhatsApp
     ===================================================================== */
  const SS_EMP = 'pti-salary-emps-v1', SS_CO = 'pti-salary-company-v1';
  const dimOf = (ym) => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ''); return m ? new Date(+m[1], +m[2], 0).getDate() : 30; };
  function blankSal() {
    const co = lsGet(SS_CO, {}), ym = localISO().slice(0, 7);
    return {
      v: 1, lang: 'bi', month: ym, payDate: localISO(), mode: 'Bank Transfer',
      co: Object.assign({ name: '', addr: '', pan: '' }, co),
      emp: { name: '', id: '', desig: '', dept: '', doj: '', pan: '', uan: '', esino: '', bank: '' },
      lop: '', prorate: true,
      basic: '', hra: '', oth: [{ l: '', a: '' }], ot: '', bonus: '',
      pf: { on: true, rate: 12, cap: true }, esi: { on: false, rate: 0.75 }, pt: '', tds: '', adv: '', dd: [{ l: '', a: '' }],
    };
  }
  function salCalc(S) {
    const days = dimOf(S.month), lop = Math.min(days, Math.max(0, num(S.lop))), payable = days - lop, f = S.prorate ? payable / days : 1;
    const pr = (v) => Math.round(num(v) * f), flat = (v) => Math.round(num(v));
    const basic = pr(S.basic), hra = pr(S.hra), oth = S.oth.filter((r) => num(r.a)).map((r) => ({ l: r.l.trim() || 'Allowance', a: pr(r.a) }));
    const ot = flat(S.ot), bonus = flat(S.bonus);
    const gross = basic + hra + oth.reduce((a, r) => a + r.a, 0) + ot + bonus;
    const pfWage = S.pf.cap ? Math.min(basic, 15000) : basic;
    const pf = S.pf.on ? Math.round(pfWage * num(S.pf.rate) / 100) : 0;
    const esiEligible = gross <= 21000, esi = S.esi.on && esiEligible ? Math.ceil(gross * num(S.esi.rate) / 100) : 0;
    const dd = S.dd.filter((r) => num(r.a)).map((r) => ({ l: r.l.trim() || 'Other deduction', a: flat(r.a) }));
    const pt = flat(S.pt), tds = flat(S.tds), adv = flat(S.adv);
    const ded = pf + esi + pt + tds + adv + dd.reduce((a, r) => a + r.a, 0);
    return { days, lop, payable, f, basic, hra, oth, ot, bonus, gross, pf, esi, esiEligible, dd, pt, tds, adv, ded, net: gross - ded };
  }
  function salRows(S, c) {
    const t = (en, ta) => tl(S.lang, en, ta);
    const E = [[t('Basic pay', 'அடிப்படை ஊதியம்'), c.basic], [t('HRA', 'வீட்டு வாடகைப் படி'), c.hra]].concat(c.oth.map((r) => [r.l, r.a]), [[t('Overtime', 'கூடுதல் நேரம்'), c.ot], [t('Bonus / incentive', 'போனஸ் / ஊக்கத்தொகை'), c.bonus]]).filter((r) => r[1]);
    const D = [[t('Provident Fund (PF)', 'வருங்கால வைப்பு நிதி (PF)'), c.pf], ['ESI', c.esi], [t('Professional tax', 'தொழில் வரி'), c.pt], [t('TDS (income tax)', 'TDS (வருமான வரி)'), c.tds], [t('Advance / loan', 'முன்பணம் / கடன்'), c.adv]].concat(c.dd.map((r) => [r.l, r.a])).filter((r) => r[1]);
    return { E, D };
  }
  function salProblems(S, c) {
    const errs = [], warns = [], p = PAN_RE;
    if (!S.co.name.trim()) errs.push(B('நிறுவனப் பெயர் தேவை', 'Company name is required'));
    if (!S.emp.name.trim()) errs.push(B('ஊழியர் பெயர் தேவை', 'Employee name is required'));
    if (!/^\d{4}-\d{2}$/.test(S.month)) errs.push(B('மாதத்தைத் தேர்வு செய்யுங்கள்', 'Choose the month'));
    if (!(c.gross > 0)) errs.push(B('சம்பளத் தொகையை உள்ளிடுங்கள்', 'Enter the salary amounts'));
    if (num(S.lop) < 0 || num(S.lop) > c.days) errs.push(B('LOP நாட்கள் 0 முதல் ' + c.days + ' வரை', 'LOP days must be 0 to ' + c.days));
    if (!validISO(S.payDate)) errs.push(B('சம்பளம் வழங்கிய தேதி தவறு', 'Pay date is not valid'));
    if (S.emp.pan && !p.test(S.emp.pan.trim().toUpperCase())) errs.push(B('ஊழியர் PAN வடிவம் தவறு', 'Employee PAN format looks wrong'));
    if (c.net < 0) errs.push(B('கழிவுகள் வருமானத்தை விட அதிகம் — சரிபார்க்கவும்', 'Deductions are more than earnings — please check'));
    if (S.esi.on && !c.esiEligible) warns.push(B('மொத்த ஊதியம் ₹21,000-ஐ தாண்டியதால் ESI போடப்படவில்லை', 'ESI skipped: gross pay is above ₹21,000'));
    if (S.pf.on && S.pf.cap) warns.push(B('PF ₹15,000 அடிப்படை வரம்பில் கணக்கிடப்பட்டது (தேவையெனில் "வரம்பு" தேர்வை நீக்கவும்)', 'PF is worked out on a ₹15,000 wage ceiling (untick "ceiling" to use full basic)'));
    if (!num(S.pt) && c.gross > 21000) warns.push(B('தொழில் வரி (Professional Tax) உங்கள் மாநில slab-படி கைமுறையாக உள்ளிடவும்', 'Enter Professional Tax by hand as per your state slab'));
    return { errs, warns };
  }

  function mountSalary(container) {
    const host = root(container), DKEY = 'pti-salary-draft-v1';
    let S = lsGet(DKEY, null);
    if (!S || S.v !== 1 || !Array.isArray(S.oth) || !Array.isArray(S.dd)) S = blankSal();
    const saveDraft = () => lsSet(DKEY, S);
    const fld = (label, path, o) => { o = o || {}; return '<div class="dx-f"><label>' + label + '</label><input type="' + (o.type || 'text') + '" data-p="' + path + '" value="' + esc(getPath(S, path)) + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.type === 'number' ? ' min="0" step="any"' : '') + ' autocomplete="off"></div>'; };
    const num2 = (label, path) => fld(label, path, { type: 'number', mode: 'decimal' });
    const rowsHtml = (arr, key, lab, ph) => arr.map((r, i) => '<div class="dx-grid"><div class="dx-f"><input type="text" data-p="' + key + '.' + i + '.l" value="' + esc(r.l) + '" placeholder="' + esc(ph) + '" aria-label="' + esc(lab) + '"></div><div class="dx-f"><input type="number" inputmode="decimal" min="0" step="any" data-p="' + key + '.' + i + '.a" value="' + esc(r.a) + '" placeholder="₹" aria-label="₹"></div></div>').join('') +
      '<div class="dx-row"><button type="button" class="dx-btn sec" data-add="' + key + '">＋ ' + B('வரி சேர்', 'Add row') + '</button>' + (arr.length > 1 ? '<button type="button" class="dx-btn sec" data-rm="' + key + '">－ ' + B('கடைசி வரி நீக்கு', 'Remove last') + '</button>' : '') + '</div>';
    const chk = (label, path) => '<label class="dx-chk"><input type="checkbox" data-p="' + path + '"' + (getPath(S, path) ? ' checked' : '') + '> ' + label + '</label>';

    function paint() {
      const emps = lsGet(SS_EMP, []);
      host.innerHTML = '<div class="dx-note">💵 ' + B('LOP நாட்கள், PF, ESI தானாகக் கணக்கிடப்படும். விவரங்கள் இந்தச் சாதனத்திலேயே சேமிக்கப்படும்.', 'LOP days, PF and ESI are worked out for you. Details stay on this device.') + '</div>' +
        '<div class="dx-grid"><div class="dx-f"><label>' + B('ஆவண மொழி', 'Document language') + '</label><select data-p="lang">' + [['bi', 'தமிழ் + EN'], ['ta', 'தமிழ்'], ['en', 'English']].map((o) => '<option value="' + o[0] + '"' + (S.lang === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
        '<div class="dx-f"><label>' + B('மாதம்', 'Month') + '</label><input type="month" data-p="month" value="' + esc(S.month) + '"></div></div>' +
        '<details open><summary>' + B('நிறுவனம்', 'Company') + (S.co.name ? ' — ' + esc(S.co.name) : '') + '</summary>' + fld(B('நிறுவனப் பெயர்', 'Company name'), 'co.name') + fld(B('முகவரி', 'Address'), 'co.addr') + fld('PAN / TAN ' + B('(விருப்பம்)', '(optional)'), 'co.pan') + '</details>' +
        '<h3 class="dx-h">' + B('ஊழியர்', 'Employee') + '</h3>' +
        (emps.length ? '<div class="dx-f"><label>' + B('சேமித்த ஊழியர்', 'Saved employees') + '</label><select data-load="1"><option value="">' + esc(B('— தேர்வு செய் —', '— choose —')) + '</option>' + emps.map((e, i) => '<option value="' + i + '">' + esc(e.emp.name + (e.emp.id ? ' (' + e.emp.id + ')' : '')) + '</option>').join('') + '</select></div>' : '') +
        '<div class="dx-grid">' + fld(B('பெயர்', 'Name'), 'emp.name') + fld(B('ஊழியர் எண்', 'Employee ID'), 'emp.id') + '</div><div class="dx-grid">' + fld(B('பதவி', 'Designation'), 'emp.desig') + fld(B('துறை', 'Department'), 'emp.dept') + '</div>' +
        '<details><summary>' + B('மேலும் விவரம் (DOJ, PAN, UAN, வங்கி)', 'More details (DOJ, PAN, UAN, bank)') + '</summary><div class="dx-grid">' + fld(B('சேர்ந்த தேதி', 'Date of joining'), 'emp.doj', { type: 'date' }) + fld('PAN', 'emp.pan') + '</div><div class="dx-grid">' + fld('UAN', 'emp.uan') + fld('ESI No.', 'emp.esino') + '</div>' + fld(B('வங்கி கணக்கு (கடைசி 4 இலக்கம்)', 'Bank a/c (last 4 digits)'), 'emp.bank') + '</details>' +
        '<h3 class="dx-h">' + B('வருகை', 'Attendance') + '</h3><div class="dx-grid">' + fld(B('LOP நாட்கள் (சம்பளமில்லா விடுப்பு)', 'LOP days (unpaid leave)'), 'lop', { type: 'number', mode: 'decimal' }) + '<div class="dx-f"><label>' + B('மாதத்தின் நாட்கள்', 'Days in month') + '</label><input type="text" id="ssDays" readonly></div></div>' + chk(B('LOP நாட்களுக்கு ஏற்ப சம்பளத்தைக் குறை', 'Reduce earnings for LOP days'), 'prorate') +
        '<h3 class="dx-h">' + B('வருமானம் (முழு மாதத்துக்கு)', 'Earnings (full month)') + '</h3><div class="dx-grid">' + num2(B('அடிப்படை ஊதியம் ₹', 'Basic pay ₹'), 'basic') + num2(B('HRA ₹', 'HRA ₹'), 'hra') + '</div>' + rowsHtml(S.oth, 'oth', B('படி', 'Allowance'), B('பிற படி (எ.கா. Conveyance)', 'Other allowance (e.g. Conveyance)')) +
        '<div class="dx-grid">' + num2(B('கூடுதல் நேரம் ₹', 'Overtime ₹'), 'ot') + num2(B('போனஸ் ₹', 'Bonus ₹'), 'bonus') + '</div>' +
        '<h3 class="dx-h">' + B('கழிவுகள்', 'Deductions') + '</h3>' + chk('PF ' + B('(ஊழியர் பங்கு)', '(employee share)'), 'pf.on') + '<div class="dx-grid">' + num2('PF %', 'pf.rate') + '<div class="dx-f">' + chk(B('₹15,000 வரம்பு', '₹15,000 ceiling'), 'pf.cap') + '</div></div>' +
        chk('ESI ' + B('(மொத்தம் ≤ ₹21,000 எனில்)', '(if gross ≤ ₹21,000)'), 'esi.on') + '<div class="dx-grid">' + num2('ESI %', 'esi.rate') + '<div></div></div>' +
        '<div class="dx-grid">' + num2(B('தொழில் வரி ₹', 'Professional tax ₹'), 'pt') + num2('TDS ₹', 'tds') + '</div>' + num2(B('முன்பணம் / கடன் ₹', 'Advance / loan ₹'), 'adv') + rowsHtml(S.dd, 'dd', B('கழிவு', 'Deduction'), B('பிற கழிவு', 'Other deduction')) +
        '<h3 class="dx-h">' + B('வழங்கல்', 'Payment') + '</h3><div class="dx-grid">' + fld(B('வழங்கிய தேதி', 'Pay date'), 'payDate', { type: 'date' }) + '<div class="dx-f"><label>' + B('முறை', 'Mode') + '</label><select data-p="mode">' + MODES.concat(['Cheque']).filter((x, i, a) => a.indexOf(x) === i).map((o) => '<option' + (o === S.mode ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div></div>' +
        '<div class="dx-sum" id="ssSum" aria-live="polite"></div><div id="ssWarn"></div><div data-k="msg" aria-live="polite"></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn" data-out="pdf">📄 PDF</button><button type="button" class="dx-btn sec" data-out="print">🖨️ ' + B('திற / அச்சிடு', 'Open / Print') + '</button><button type="button" class="dx-btn sec" data-out="wa">💬 WhatsApp</button></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-save="1">💾 ' + B('இந்த ஊழியரைச் சேமி', 'Save this employee') + '</button><button type="button" class="dx-btn sec" data-next="1">➡️ ' + B('அடுத்த ஊழியர் / மாதம்', 'Next employee / month') + '</button></div>';
      refresh();
    }
    function refresh() {
      const c = salCalc(S), sum = host.querySelector('#ssSum'); if (!sum) return;
      host.querySelector('#ssDays').value = c.days + (c.lop ? ' · ' + B('வேலை நாட்கள்', 'paid') + ' ' + c.payable : '');
      const w = rcWords(S.lang === 'en' ? 'en' : isEn() ? 'en' : 'ta', Math.max(0, c.net))[0];
      sum.innerHTML = '<div class="tot">' + inr(c.net) + '</div><table><tr><td>' + B('மொத்த வருமானம்', 'Gross earnings') + '</td><td>' + inr(c.gross) + '</td></tr><tr><td>PF</td><td>' + inr(c.pf) + '</td></tr>' + (c.esi ? '<tr><td>ESI</td><td>' + inr(c.esi) + '</td></tr>' : '') + '<tr><td>' + B('மொத்தக் கழிவு', 'Total deductions') + '</td><td>' + inr(c.ded) + '</td></tr></table>' + (c.net > 0 ? '<div class="wd">' + esc(w) + '</div>' : '');
      const pr = salProblems(S, c); host.querySelector('#ssWarn').innerHTML = pr.warns.length ? '<div class="dx-warn">⚠ ' + pr.warns.map(esc).join('<br>⚠ ') + '</div>' : '';
    }
    host.addEventListener('input', onIn); host.addEventListener('change', onIn);
    function onIn(e) {
      const t = e.target;
      if (t.hasAttribute && t.hasAttribute('data-load')) { const e0 = lsGet(SS_EMP, [])[+t.value]; if (e0) { S = Object.assign(blankSal(), JSON.parse(JSON.stringify(e0)), { month: S.month, payDate: S.payDate, lang: S.lang, lop: '', ot: '', bonus: '', tds: '', adv: '' }); paint(); saveDraft(); } return; }
      const p = t.getAttribute && t.getAttribute('data-p'); if (!p) return;
      setPath(S, p, t.type === 'checkbox' ? t.checked : (/\.pan$/.test(p) ? String(t.value).toUpperCase() : t.value));
      if (p === 'lang') paint(); else refresh();
      saveDraft();
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-add')) { S[b.getAttribute('data-add')].push({ l: '', a: '' }); paint(); saveDraft(); }
      else if (b.hasAttribute('data-rm')) { const a = S[b.getAttribute('data-rm')]; if (a.length > 1) a.pop(); paint(); saveDraft(); }
      else if (b.hasAttribute('data-save')) saveEmp();
      else if (b.hasAttribute('data-next')) { S.emp = { name: '', id: '', desig: '', dept: '', doj: '', pan: '', uan: '', esino: '', bank: '' }; S.lop = ''; S.ot = ''; S.bonus = ''; S.tds = ''; S.adv = ''; paint(); saveDraft(); }
      else if (b.hasAttribute('data-out')) run(b.getAttribute('data-out'));
    });
    function saveEmp() {
      const msg = host.querySelector('[data-k=msg]'); if (!S.emp.name.trim()) { msg.innerHTML = '<div class="dx-err" role="alert">' + B('முதலில் ஊழியர் பெயர் எழுதுங்கள்', 'Enter the employee name first') + '</div>'; return; }
      const list = lsGet(SS_EMP, []).filter((x) => !(x.emp.name === S.emp.name && x.emp.id === S.emp.id));
      const keep = JSON.parse(JSON.stringify(S)); keep.lop = ''; keep.ot = ''; keep.bonus = ''; keep.tds = ''; keep.adv = ''; list.unshift(keep); lsSet(SS_EMP, list.slice(0, 60)); lsSet(SS_CO, S.co);
      msg.innerHTML = '<div class="dx-ok">✓ ' + B('சேமிக்கப்பட்டது', 'Saved') + ': ' + esc(S.emp.name) + '</div>'; paint();
      host.querySelector('[data-k=msg]').innerHTML = '<div class="dx-ok">✓ ' + B('சேமிக்கப்பட்டது', 'Saved') + ': ' + esc(S.emp.name) + '</div>';
    }
    async function run(kind) {
      const msg = host.querySelector('[data-k=msg]'), c = salCalc(S), pr = salProblems(S, c);
      if (pr.errs.length) { msg.innerHTML = '<div class="dx-err" role="alert">' + pr.errs.map(esc).join('<br>') + '</div>'; return; }
      const btns = host.querySelectorAll('[data-out]'); btns.forEach((x) => (x.disabled = true)); msg.innerHTML = '<div class="dx-note">⏳ ' + B('தயாராகிறது…', 'Preparing…') + '</div>';
      try {
        const base = 'Payslip-' + (fileSafe(S.emp.name) || fileSafe(S.emp.id) || 'employee') + '-' + S.month;
        if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(salWa(S, c)), '_blank');
        else {
          const blob = new Blob([await salPdf(S, c)], { type: 'application/pdf' });
          if (kind === 'print') { const url = URL.createObjectURL(blob); if (!window.open(url, '_blank')) downloadBlob(blob, base + '.pdf'); setTimeout(() => URL.revokeObjectURL(url), 120000); } else downloadBlob(blob, base + '.pdf');
        }
        lsSet(SS_CO, S.co); saveDraft();
        msg.innerHTML = '<div class="dx-ok">✓ ' + B('சம்பளச் சீட்டு தயார்', 'Payslip ready') + ' — ' + inr(c.net) + '</div>' + (pr.warns.length ? '<div class="dx-warn">⚠ ' + pr.warns.map(esc).join('<br>⚠ ') + '</div>' : '');
      } catch (err) { msg.innerHTML = '<div class="dx-err" role="alert">' + B('உருவாக்க முடியவில்லை: ', 'Could not create it: ') + esc(err && err.message || err) + '</div>'; }
      finally { btns.forEach((x) => (x.disabled = false)); }
    }
    paint();
  }

  function salWa(S, c) {
    const r = salRows(S, c), L = ['*Payslip — ' + monthLabel('en', S.month + '-01', 0) + '*', S.co.name, 'Employee: ' + S.emp.name + (S.emp.id ? ' (' + S.emp.id + ')' : ''), c.lop ? 'Paid days: ' + c.payable + ' / ' + c.days : ''];
    r.E.forEach((x) => L.push('+ ' + x[0] + ': ₹' + inrPlain(x[1]))); L.push('Gross: ₹' + inrPlain(c.gross));
    r.D.forEach((x) => L.push('− ' + x[0] + ': ₹' + inrPlain(x[1]))); L.push('*Net pay: ₹' + inrPlain(c.net) + '*', rcWords('en', c.net)[0]);
    return L.filter(Boolean).join('\n');
  }

  async function salPdf(S, c) {
    const doc = await PDFDocument.create(); doc.setTitle('Payslip ' + S.emp.name + ' ' + S.month); doc.setCreator('pdftoolsindia.com');
    const font = await embedUnicodeFont(doc), uni = !!font.__mixedShape, t = (en, ta) => tl(S.lang, en, ta);
    const L = (s) => { s = String(s == null ? '' : s); return uni ? s : s.replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); };
    const W = 595.28, H = 841.89, MX = 40, CW = W - 2 * MX, INK = rgb(0.1, 0.1, 0.12), GR = rgb(0.38, 0.4, 0.46), LN = rgb(0.8, 0.82, 0.86), BR = rgb(0.16, 0.25, 0.5), HD = rgb(0.92, 0.94, 0.99);
    const page = doc.addPage([W, H]); let y = H - MX;
    const txt = (s, x, yy, size, col) => page.drawText(L(s), { x, y: yy, size: size || 9.5, font, color: col || INK });
    const bold = (s, x, yy, size, col) => { txt(s, x, yy, size, col); txt(s, x + 0.3, yy, size, col); };
    const wid = (s, size) => font.widthOfTextAtSize(L(s), size), wrap = (s, size, w, m) => wrapLines(font, L(s), size, w, m);
    const hline = (yy, x1, x2) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.6, color: LN });
    const amt = (v, xr, yy, size, boldIt) => { const s = inrPlain(v); (boldIt ? bold : txt)(s, xr - wid(s, size || 9.5), yy, size || 9.5); };
    wrap(S.co.name, 15, CW, 2).forEach((ln) => { bold(ln, MX, y - 14, 15, BR); y -= 18; }); y -= 2;
    wrap(S.co.addr, 9, CW, 2).forEach((ln) => { txt(ln, MX, y - 10, 9, GR); y -= 12; }); if (S.co.pan) { txt('PAN/TAN: ' + S.co.pan, MX, y - 10, 9, GR); y -= 12; }
    y -= 8; hline(y, MX, W - MX); y -= 22;
    const ttl = t('PAYSLIP', 'சம்பளச் சீட்டு') + ' — ' + monthLabel(S.lang, S.month + '-01', 0); bold(ttl, MX, y, 12.5, BR); y -= 20;
    const t1 = (en, ta) => (S.lang === 'ta' ? ta : en), pairs = [[t1('Employee', 'ஊழியர்'), S.emp.name], [t1('Employee ID', 'ஊழியர் எண்'), S.emp.id], [t1('Designation', 'பதவி'), S.emp.desig], [t1('Department', 'துறை'), S.emp.dept], [t1('Joined', 'சேர்ந்த தேதி'), S.emp.doj && fmtDMY(S.emp.doj)], ['PAN', S.emp.pan], ['UAN', S.emp.uan], ['ESI No.', S.emp.esino], [t1('Bank a/c', 'வங்கி கணக்கு'), S.emp.bank && 'XXXX' + S.emp.bank.replace(/\D/g, '').slice(-4)], [t1('Paid days', 'வேலை நாட்கள்'), c.payable + ' / ' + c.days + (c.lop ? '  (LOP ' + c.lop + ')' : '')]].filter((p) => String(p[1] || '').trim());
    const half = Math.ceil(pairs.length / 2), colW = CW / 2; let yy = y;
    pairs.forEach((p, i) => { const col = i < half ? 0 : 1, row = i < half ? i : i - half, x = MX + col * colW; wrap(p[0], 8, 108, 1).forEach((ln) => txt(ln, x, y - row * 17, 8, GR)); txt(wrap(p[1], 9.5, colW - 126, 1)[0], x + 116, y - row * 17, 9.5); yy = 0; });
    y = y - (half - 1) * 17 - 16; hline(y + 6, MX, W - MX);
    const R = salRows(S, c), n = Math.max(R.E.length, R.D.length, 1), mid = MX + colW + 6; y -= 8;
    page.drawRectangle({ x: MX, y: y - 6, width: colW - 6, height: 19, color: HD }); page.drawRectangle({ x: mid, y: y - 6, width: colW - 6, height: 19, color: HD });
    bold(t('EARNINGS', 'வருமானம்'), MX + 6, y, 9, BR); bold(t('DEDUCTIONS', 'கழிவுகள்'), mid + 6, y, 9, BR); y -= 22;
    for (let i = 0; i < n; i++) {
      const e = R.E[i], d = R.D[i];
      const el = e ? wrap(e[0], 9, colW - 96, 2) : [], dl = d ? wrap(d[0], 9, colW - 96, 2) : [];
      if (e) { el.forEach((ln, k) => txt(ln, MX + 6, y - k * 11, 9)); amt(e[1], MX + colW - 14, y); }
      if (d) { dl.forEach((ln, k) => txt(ln, mid + 6, y - k * 11, 9)); amt(d[1], mid + colW - 14, y); }
      y -= 13 * Math.max(el.length, dl.length, 1) + 4;
    }
    y -= 2; hline(y + 8, MX, W - MX); bold(t('Gross earnings', 'மொத்த வருமானம்'), MX + 6, y - 6, 10); amt(c.gross, MX + colW - 14, y - 6, 10, true); bold(t('Total deductions', 'மொத்தக் கழிவு'), mid + 6, y - 6, 10); amt(c.ded, mid + colW - 14, y - 6, 10, true); y -= 30;
    const wl = rcWords(S.lang, c.net).flatMap((w) => wrap(w, 9, CW - 24, 2)), bh = 40 + wl.length * 12;
    page.drawRectangle({ x: MX, y: y - bh + 14, width: CW, height: bh, color: HD });
    bold(t('NET PAY', 'நிகரச் சம்பளம்'), MX + 12, y - 8, 11, BR); const ns = '₹ ' + inrPlain(c.net); bold(ns, W - MX - 12 - wid(ns, 17), y - 10, 17, BR); wl.forEach((w, i) => txt(w, MX + 12, y - 28 - i * 12, 9)); y -= bh + 6;
    txt(t('Paid on', 'வழங்கிய தேதி') + ' ' + fmtDMY(S.payDate) + ' · ' + S.mode, MX, y - 6, 9, GR); y -= 60;
    hline(y, MX, MX + 170); hline(y, W - MX - 170, W - MX); wrap(t('Employer signature', 'நிறுவன கையொப்பம்'), 8.5, 170, 2).forEach((ln, i) => txt(ln, MX, y - 12 - i * 10, 8.5, GR)); wrap(t('Employee signature', 'ஊழியர் கையொப்பம்'), 8.5, 170, 2).forEach((ln, i) => txt(ln, W - MX - 170, y - 12 - i * 10, 8.5, GR));
    wrap(t('This is a computer-generated payslip.', 'இது கணினி மூலம் உருவாக்கப்பட்ட சம்பளச் சீட்டு.'), 8, CW, 2).forEach((ln, i) => txt(ln, MX, y - 40 - i * 10, 8, GR));
    return doc.save();
  }
  TOOL_IMPL.salaryslip = { mount(container) { mountSalary(container); } };
  TOOL_IMPL.salaryslip._f = { salCalc, salProblems, blankSal };


  /* =====================================================================
     LEAVE LETTER — employee / student / parent, Tamil or English, editable body
     ===================================================================== */
  const LV_KEY = 'pti-leave-draft-v1', LV_ME = 'pti-leave-me-v1';
  const LV_TYPES = [['Casual Leave', 'தற்செயல் விடுப்பு'], ['Sick Leave', 'மருத்துவ விடுப்பு'], ['Earned Leave', 'ஈட்டிய விடுப்பு'], ['Maternity Leave', 'மகப்பேறு விடுப்பு'], ['Paternity Leave', 'தந்தைமை விடுப்பு'], ['Marriage Leave', 'திருமண விடுப்பு'], ['Bereavement Leave', 'துக்க விடுப்பு'], ['Loss of Pay Leave', 'சம்பளமில்லா விடுப்பு'], ['Half-day Permission', 'அரை நாள் அனுமதி'], ['Leave', 'விடுப்பு']];
  const dateLong = (iso, lang) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || ''; return +m[3] + ' ' + (lang === 'ta' ? MON_TA : MON_EN)[+m[2] - 1] + ' ' + m[1]; };
  function leaveDays(S) {
    if (!validISO(S.from) || !validISO(S.to)) return 0;
    const a = new Date(S.from + 'T00:00:00'), b = new Date(S.to + 'T00:00:00'); if (b < a) return 0;
    let n = 0; for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) { if (S.skipSun && d.getDay() === 0) continue; n++; }
    return S.half ? (n === 1 ? 0.5 : n) : n;
  }
  const lvType = (S) => LV_TYPES.find((x) => x[0] === S.type) || LV_TYPES[0];
  const lvDays = (n, lang) => (n === 0.5 ? (lang === 'ta' ? 'அரை நாள்' : 'half a day') : n + (lang === 'ta' ? ' நாட்கள்' : n === 1 ? ' day' : ' days'));
  function leaveBody(S) {
    const ta = S.lang === 'ta', lt = lvType(S)[ta ? 1 : 0], n = leaveDays(S), reason = S.reason.trim() || (ta ? 'சொந்தக் காரணங்கள்' : 'personal reasons');
    const f = dateLong(S.from, S.lang), t = dateLong(S.to, S.lang), same = S.from === S.to, period = ta ? (same ? f + ' அன்று' : f + ' முதல் ' + t + ' வரை') : (same ? 'on ' + f : 'from ' + f + ' to ' + t);
    const sessW = S.half && same ? (ta ? (S.session === 'am' ? 'காலை' : 'பிற்பகல்') : (S.session === 'am' ? 'forenoon' : 'afternoon')) : '', days = ' (' + lvDays(n, S.lang) + (sessW ? ', ' + sessW : '') + ')', sess = '';
    const back = S.contact.trim() ? (ta ? ' விடுப்பில் இருக்கும் போது ' + S.contact.trim() + ' என்ற எண்ணில் தொடர்பு கொள்ளலாம்.' : ' I can be reached on ' + S.contact.trim() + ' during the leave.') : '';
    const hand = S.role === 'employee' && S.handover.trim() ? (ta ? ' எனது பணிகளை ' + S.handover.trim() + ' கவனித்துக் கொள்வார்.' : ' ' + S.handover.trim() + ' will cover my duties in my absence.') : '';
    if (S.role === 'parent') {
      const kid = S.me.name || (ta ? 'என் பிள்ளை' : 'my ward'), cls = S.me.cls ? (ta ? ', ' + S.me.cls + ' வகுப்பு' : ' (' + S.me.cls + ')') : '';
      return ta ? 'என் பிள்ளை ' + kid + cls + ' ' + reason + ' காரணமாக ' + period + days + sess + ' பள்ளிக்கு வர இயலாது. எனவே அந்த நாட்களுக்கு விடுப்பு அளிக்குமாறு தாழ்மையுடன் வேண்டுகிறேன்.' + back + '\n\nதயவுசெய்து விடுப்பை அனுமதிக்க வேண்டுகிறேன்.\n\nநன்றி.'
        : 'I kindly request you to grant leave to ' + kid + cls + ' ' + period + days + sess + ' due to ' + reason + '. My child will not be able to attend school ' + (same ? 'on that day' : 'on these days') + '.' + back + '\n\nI request you to kindly grant the leave. Thank you.';
    }
    const who = S.role === 'student' ? (ta ? 'நான் தங்கள் ' + (S.me.cls ? S.me.cls + ' வகுப்பில் ' : '') + 'பயின்று வருகிறேன். ' : 'I am a student of ' + (S.me.cls || 'your institution') + '. ') : (ta ? 'நான் தங்கள் நிறுவனத்தில் பணிபுரிந்து வருகிறேன்' + (S.me.desig ? ' (பதவி: ' + S.me.desig + ')' : '') + '. ' : 'I work as ' + (S.me.desig || 'an employee') + ' in your organisation. ');
    return ta ? who + reason + ' காரணமாக ' + period + days + sess + ' ' + lt + ' அளிக்குமாறு தாழ்மையுடன் கேட்டுக்கொள்கிறேன்.' + hand + back + '\n\nதயவுசெய்து எனது விடுப்பை அனுமதிக்க வேண்டுகிறேன்.\n\nநன்றி.'
      : who + 'I request you to kindly grant me ' + lt.toLowerCase() + ' ' + period + days + sess + ' due to ' + reason + '.' + hand + back + '\n\nI request you to kindly approve my leave. Thank you.';
  }
  function leaveFull(S) {
    const ta = S.lang === 'ta', lt = lvType(S)[ta ? 1 : 0];
    const to = [S.toName.trim() || (ta ? 'மேலாளர் / தலைமையாசிரியர்' : 'The Manager / Principal'), S.org.trim()].filter(Boolean);
    const subj = ta ? 'பொருள்: ' + lt + ' வேண்டி விண்ணப்பம்' : 'Subject: Application for ' + lt;
    const sal = ta ? 'ஐயா / அம்மையீர்,' : 'Respected Sir / Madam,';
    const sign = [S.me.name, S.me.desig && S.role === 'employee' ? S.me.desig : '', S.role === 'student' && S.me.cls ? (ta ? 'வகுப்பு ' : 'Class ') + S.me.cls + (S.me.roll ? (ta ? ', பதிவு எண் ' : ', Roll no. ') + S.me.roll : '') : '', S.me.id && S.role === 'employee' ? (ta ? 'ஊழியர் எண்: ' : 'Employee ID: ') + S.me.id : ''].filter(Boolean);
    const sender = S.role === 'parent' ? [S.me.parent || '', (ta ? 'பெற்றோர் — ' : 'Parent of ') + (S.me.name || '')].filter((x) => x.trim()) : sign;
    return { date: (ta ? 'இடம்: ' : 'Place: ') + (S.place || '') + '\n' + (ta ? 'நாள்: ' : 'Date: ') + dateLong(S.date, S.lang), to: (ta ? 'பெறுநர்,\n' : 'To,\n') + to.join('\n'), subj, sal, body: S.body, close: ta ? 'இப்படிக்கு,' : 'Yours faithfully,', sender };
  }
  function blankLv() {
    const me = lsGet(LV_ME, {});
    return { v: 1, role: 'employee', lang: 'ta', place: me.place || '', date: localISO(), toName: '', org: me.org || '', type: 'Casual Leave', from: localISO(), to: localISO(), half: false, session: 'am', skipSun: false, reason: '', contact: me.contact || '', handover: '', me: Object.assign({ name: '', desig: '', id: '', cls: '', roll: '', parent: '' }, me.me || {}), body: '', edited: false };
  }
  function mountLeave(container) {
    const host = root(container); let S = lsGet(LV_KEY, null);
    if (!S || S.v !== 1) S = blankLv();
    const save = () => lsSet(LV_KEY, S);
    const fld = (label, path, o) => { o = o || {}; return '<div class="dx-f"><label>' + label + '</label>' + (o.area ? '<textarea data-p="' + path + '" rows="' + o.area + '">' + esc(getPath(S, path)) + '</textarea>' : '<input type="' + (o.type || 'text') + '" data-p="' + path + '" value="' + esc(getPath(S, path)) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' autocomplete="off">') + '</div>'; };
    const sel = (label, path, list) => '<div class="dx-f"><label>' + label + '</label><select data-p="' + path + '">' + list.map((o) => '<option value="' + o[0] + '"' + (getPath(S, path) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
    const regen = () => { if (!S.edited) S.body = leaveBody(S); const b = host.querySelector('[data-p=body]'); if (b && b !== document.activeElement) b.value = S.body; };
    function paint() {
      regen();
      const emp = S.role === 'employee', stu = S.role === 'student', par = S.role === 'parent';
      host.innerHTML = '<div class="dx-note">📝 ' + B('விவரங்களை நிரப்பினால் கடிதம் தானாக உருவாகும் — நீங்கள் திருத்தலாம்.', 'Fill the details and the letter writes itself — you can edit it.') + '</div>' +
        '<div class="dx-grid">' + sel(B('நான்', 'I am a'), 'role', [['employee', B('ஊழியர்', 'Employee')], ['student', B('மாணவர்', 'Student')], ['parent', B('பெற்றோர் (பிள்ளைக்காக)', 'Parent (for my child)')]]) + sel(B('கடிதம் மொழி', 'Letter language'), 'lang', [['ta', 'தமிழ்'], ['en', 'English']]) + '</div>' +
        '<h3 class="dx-h">' + B('யாருக்கு', 'To whom') + '</h3>' + fld(B('பெயர் / பதவி', 'Name / designation'), 'toName', { ph: B('எ.கா. தலைமையாசிரியர்', 'e.g. The Principal') }) + fld(B('நிறுவனம் / பள்ளி', 'Organisation / school'), 'org') + '<div class="dx-grid">' + fld(B('இடம்', 'Place'), 'place') + fld(B('நாள்', 'Date'), 'date', { type: 'date' }) + '</div>' +
        '<h3 class="dx-h">' + B('உங்கள் விவரம்', 'Your details') + '</h3>' + fld(par ? B('பிள்ளையின் பெயர்', "Child's name") : B('பெயர்', 'Name'), 'me.name') + (par ? fld(B('பெற்றோர் பெயர்', "Parent's name"), 'me.parent') : '') +
        (emp ? '<div class="dx-grid">' + fld(B('பதவி', 'Designation'), 'me.desig') + fld(B('ஊழியர் எண்', 'Employee ID'), 'me.id') + '</div>' : '<div class="dx-grid">' + fld(B('வகுப்பு / பிரிவு', 'Class / section'), 'me.cls') + (stu ? fld(B('பதிவு எண்', 'Roll no.'), 'me.roll') : '<div></div>') + '</div>') +
        '<h3 class="dx-h">' + B('விடுப்பு', 'Leave') + '</h3>' + sel(B('வகை', 'Type'), 'type', LV_TYPES.map((x) => [x[0], isEn() ? x[0] + ' · ' + x[1] : x[1] + ' · ' + x[0]])) + '<div class="dx-grid">' + fld(B('முதல் நாள்', 'From'), 'from', { type: 'date' }) + fld(B('கடைசி நாள்', 'To'), 'to', { type: 'date' }) + '</div>' +
        '<label class="dx-chk"><input type="checkbox" data-p="half"' + (S.half ? ' checked' : '') + '> ' + B('அரை நாள் மட்டும்', 'Half day only') + '</label>' + (S.half ? sel(B('நேரம்', 'Session'), 'session', [['am', B('காலை', 'Forenoon')], ['pm', B('பிற்பகல்', 'Afternoon')]]) : '') +
        '<label class="dx-chk"><input type="checkbox" data-p="skipSun"' + (S.skipSun ? ' checked' : '') + '> ' + B('ஞாயிற்றுக்கிழமைகளை எண்ணாதே', 'Do not count Sundays') + '</label><div class="dx-hint" id="lvDays"></div>' +
        fld(B('காரணம்', 'Reason'), 'reason', { area: 2, ph: B('எ.கா. காய்ச்சல் / குடும்ப நிகழ்ச்சி', 'e.g. fever / family function') }) + (emp ? fld(B('என் பணியைக் கவனிப்பவர் (விருப்பம்)', 'Who will cover my work (optional)'), 'handover') : '') + fld(B('விடுப்பில் தொடர்பு எண் (விருப்பம்)', 'Contact number during leave (optional)'), 'contact', { type: 'tel' }) +
        '<h3 class="dx-h">' + B('கடிதம் (திருத்தலாம்)', 'Letter text (editable)') + '</h3><div class="dx-f"><textarea data-p="body" rows="9"></textarea></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-regen="1">↻ ' + B('தானாக மீண்டும் எழுது', 'Rewrite automatically') + '</button></div><div data-k="msg" aria-live="polite"></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn" data-out="pdf">📄 PDF</button><button type="button" class="dx-btn sec" data-out="print">🖨️ ' + B('திற / அச்சிடு', 'Open / Print') + '</button><button type="button" class="dx-btn sec" data-out="copy">📋 ' + B('நகலெடு', 'Copy text') + '</button><button type="button" class="dx-btn sec" data-out="wa">💬 WhatsApp</button></div>';
      host.querySelector('[data-p=body]').value = S.body; hint();
    }
    function hint() { const n = leaveDays(S), h = host.querySelector('#lvDays'); if (!h) return; const bad = validISO(S.from) && validISO(S.to) && S.to < S.from; h.className = 'dx-hint ' + (bad ? 'bad' : 'ok'); h.textContent = bad ? B('கடைசி நாள் முதல் நாளுக்கு முன் இருக்கக் கூடாது', 'The last day cannot be before the first day') : '✓ ' + lvDays(n, isEn() ? 'en' : 'ta'); }
    host.addEventListener('input', onIn); host.addEventListener('change', onIn);
    function onIn(e) {
      const t = e.target, p = t.getAttribute && t.getAttribute('data-p'); if (!p) return;
      setPath(S, p, t.type === 'checkbox' ? t.checked : t.value);
      if (p === 'body') { S.edited = true; save(); return; }
      if (p === 'from' && validISO(t.value) && (!validISO(S.to) || S.to < t.value)) S.to = t.value;
      if (['role', 'lang', 'half', 'from', 'to', 'type'].includes(p)) { if (p === 'role' || p === 'lang') S.edited = false; paint(); } else { regen(); hint(); }
      save();
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-regen')) { S.edited = false; paint(); save(); } else if (b.hasAttribute('data-out')) run(b.getAttribute('data-out'));
    });
    async function run(kind) {
      const msg = host.querySelector('[data-k=msg]'), errs = [];
      if (!S.me.name.trim()) errs.push(B('பெயர் தேவை', 'Name is required'));
      if (!validISO(S.from) || !validISO(S.to)) errs.push(B('தேதிகளைத் தேர்வு செய்யுங்கள்', 'Choose the dates')); else if (S.to < S.from) errs.push(B('கடைசி நாள் முதல் நாளுக்கு முன் உள்ளது', 'The last day is before the first day'));
      if (!S.body.trim()) errs.push(B('கடிதம் காலியாக உள்ளது', 'The letter is empty'));
      if (errs.length) { msg.innerHTML = '<div class="dx-err" role="alert">' + errs.map(esc).join('<br>') + '</div>'; return; }
      const L = leaveFull(S), plain = [L.date, '', L.to, '', L.subj, '', L.sal, '', L.body, '', L.close, ''].concat(L.sender).join('\n');
      try {
        if (kind === 'copy') { if (navigator.clipboard) await navigator.clipboard.writeText(plain); else { const ta = document.createElement('textarea'); ta.value = plain; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } msg.innerHTML = '<div class="dx-ok">✓ ' + B('நகலெடுக்கப்பட்டது', 'Copied') + '</div>'; }
        else if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(plain), '_blank');
        else {
          const blob = new Blob([await leavePdf(S, L)], { type: 'application/pdf' }), name = 'Leave-letter-' + (fileSafe(S.me.name) || 'letter') + '-' + S.from + '.pdf';
          if (kind === 'print') { const url = URL.createObjectURL(blob); if (!window.open(url, '_blank')) downloadBlob(blob, name); setTimeout(() => URL.revokeObjectURL(url), 120000); } else downloadBlob(blob, name);
          msg.innerHTML = '<div class="dx-ok">✓ ' + B('கடிதம் தயார்', 'Letter ready') + ' — ' + lvDays(leaveDays(S), isEn() ? 'en' : 'ta') + '</div>';
        }
        lsSet(LV_ME, { me: S.me, place: S.place, org: S.org, contact: S.contact });
      } catch (err) { msg.innerHTML = '<div class="dx-err" role="alert">' + esc(err && err.message || err) + '</div>'; }
    }
    paint();
  }
  async function leavePdf(S, L) {
    const doc = await PDFDocument.create(); doc.setTitle('Leave letter'); doc.setCreator('pdftoolsindia.com');
    const font = await embedUnicodeFont(doc), uni = !!font.__mixedShape, Lx = (s) => { s = String(s == null ? '' : s); return uni ? s : s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); };
    const W = 595.28, H = 841.89, MX = 64, CW = W - 2 * MX; let page, y;
    const np = () => { page = doc.addPage([W, H]); y = H - 70; }; np();
    const draw = (s, x, size, bold) => { if (y < 80) np(); page.drawText(Lx(s), { x, y, size, font, color: rgb(0.08, 0.08, 0.1) }); if (bold) page.drawText(Lx(s), { x: x + 0.3, y, size, font, color: rgb(0.08, 0.08, 0.1) }); };
    const block = (txt, size, gap, bold, rightX) => { txt.split('\n').forEach((para) => { wrapLines(font, Lx(para), size, CW, 40).forEach((ln) => { const x = rightX ? W - MX - font.widthOfTextAtSize(Lx(ln), size) : MX; draw(ln, x, size, bold); y -= size * 1.6; }); }); y -= gap; };
    block(L.date, 10.5, 12, false, true); block(L.to, 11, 10); block(L.subj, 11.5, 10, true); block(L.sal, 11, 6); block(L.body, 11, 14); block(L.close, 11, 40);
    L.sender.forEach((ln, i) => { draw(ln, MX, i ? 10.5 : 11.5, i === 0); y -= 15; });
    return doc.save();
  }
  TOOL_IMPL.leaveletter = { mount(container) { mountLeave(container); } };
  TOOL_IMPL.leaveletter._f = { leaveDays, leaveBody, blankLv };


  /* =====================================================================
     PRESCRIPTION PAD — structured dosing (morning / noon / night, food timing),
     vitals, follow-up, Tamil or English instructions, saved doctor + patients.
     A formatting tool only — the doctor is responsible for the content.
     ===================================================================== */
  const RX_DOC = 'pti-rx-doctor-v1', RX_PAT = 'pti-rx-patients-v1', RX_DRAFT = 'pti-rx-draft-v1';
  const RX_FORMS = ['Tab', 'Cap', 'Syrup', 'Inj', 'Drops', 'Ointment', 'Cream', 'Inhaler', 'Powder', 'Other'];
  const RX_FOOD = [['', '—', '—'], ['after', 'After food', 'உணவுக்குப் பின்'], ['before', 'Before food', 'உணவுக்கு முன்'], ['with', 'With food', 'உணவுடன்'], ['empty', 'Empty stomach', 'வெறும் வயிற்றில்'], ['bed', 'At bedtime', 'படுக்கும் முன்']];
  const RX_FREQ = [['1-0-1', '1-0-1'], ['1-1-1', '1-1-1'], ['1-0-0', '1-0-0'], ['0-0-1', '0-0-1'], ['0-1-0', '0-1-0'], ['0-1-1', '0-1-1'], ['1-1-0', '1-1-0'], ['1-1-1-1', '1-1-1-1'], ['SOS', 'SOS (needed)'], ['OD', 'Once a day'], ['BD', 'Twice a day'], ['TDS', 'Three times a day'], ['QID', 'Four times a day'], ['HS', 'At bedtime'], ['STAT', 'Immediately']];
  const newMed = () => ({ n: '', f: 'Tab', s: '', q: '1-0-1', fd: 'after', d: '', note: '' });
  function blankRx() {
    const d = lsGet(RX_DOC, {});
    return { v: 1, lang: 'bi', date: localISO(), doc: Object.assign({ name: '', qual: '', reg: '', clinic: '', addr: '', phone: '', timing: '' }, d), pat: { name: '', age: '', unit: 'Yrs', sex: 'Male', wt: '', phone: '', addr: '' }, vit: { bp: '', pulse: '', temp: '', spo2: '' }, co: '', dx: '', meds: [newMed()], tests: '', advice: '', follow: '', size: 'A4' };
  }
  const rxDur = (d, lang) => { const v = String(d || '').trim(); if (!v) return ''; return /^\d+$/.test(v) ? v + (lang === 'ta' ? ' நாட்கள்' : ' days') : v; };
  function rxMedLine(m, lang) {
    const food = RX_FOOD.find((x) => x[0] === m.fd), ft = food && food[0] ? (lang === 'ta' ? food[2] : food[1]) : '';
    return [m.q, ft, rxDur(m.d, lang) && '× ' + rxDur(m.d, lang)].filter(Boolean).join('   ·   ');
  }
  function rxProblems(S) {
    const errs = [], warns = [], meds = S.meds.filter((m) => m.n.trim());
    if (!S.doc.name.trim()) errs.push(B('மருத்துவர் பெயர் தேவை', 'Doctor name is required'));
    if (!S.pat.name.trim()) errs.push(B('நோயாளி பெயர் தேவை', 'Patient name is required'));
    if (!meds.length && !S.advice.trim()) errs.push(B('குறைந்தது ஒரு மருந்து அல்லது அறிவுரை சேர்க்கவும்', 'Add at least one medicine or some advice'));
    if (!validISO(S.date)) errs.push(B('தேதி தவறு', 'Date is not valid'));
    if (S.follow && validISO(S.follow) && S.follow < S.date) errs.push(B('மீண்டும் வர வேண்டிய தேதி இன்றுக்கு முன் உள்ளது', 'Follow-up date is before the prescription date'));
    if (S.pat.age && !(num(S.pat.age) > 0 && num(S.pat.age) < 130)) warns.push(B('வயதைச் சரிபார்க்கவும்', 'Please check the age'));
    if (!S.doc.reg.trim()) warns.push(B('பதிவு எண் (Registration No.) இல்லை — மருந்துச் சீட்டில் இருப்பது நல்லது', 'No registration number — it is normally printed on a prescription'));
    return { errs, warns };
  }
  function rxText(S) {
    const L = ['*' + (S.doc.name || 'Doctor') + '*' + (S.doc.qual ? ' (' + S.doc.qual + ')' : ''), S.doc.clinic, 'Date: ' + fmtDMY(S.date), 'Patient: ' + S.pat.name + (S.pat.age ? ', ' + S.pat.age + ' ' + S.pat.unit : '') + ', ' + S.pat.sex, S.dx ? 'Diagnosis: ' + S.dx : '', '', 'Rx'];
    S.meds.filter((m) => m.n.trim()).forEach((m, i) => L.push((i + 1) + '. ' + [m.f, m.n, m.s].filter(Boolean).join(' ') + ' — ' + rxMedLine(m, 'en') + (m.note ? ' (' + m.note + ')' : '')));
    if (S.tests.trim()) L.push('', 'Tests: ' + S.tests.trim()); if (S.advice.trim()) L.push('', 'Advice: ' + S.advice.trim()); if (S.follow) L.push('', 'Review on: ' + fmtDMY(S.follow));
    return L.filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  }
  function mountRx(container) {
    const host = root(container); let S = lsGet(RX_DRAFT, null);
    if (!S || S.v !== 1 || !Array.isArray(S.meds) || !S.meds.length) S = blankRx();
    const save = () => lsSet(RX_DRAFT, S);
    const fld = (label, path, o) => { o = o || {}; return '<div class="dx-f"><label>' + label + '</label>' + (o.area ? '<textarea data-p="' + path + '" rows="' + o.area + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(getPath(S, path)) + '</textarea>' : '<input type="' + (o.type || 'text') + '" data-p="' + path + '" value="' + esc(getPath(S, path)) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + ' autocomplete="off">') + '</div>'; };
    const sel = (label, path, list, cls) => '<div class="dx-f"><label>' + label + '</label><select data-p="' + path + '">' + list.map((o) => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? (o[2] ? (isEn() ? o[1] : o[2]) : o[1]) : o; return '<option value="' + esc(v) + '"' + (getPath(S, path) === v ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>';
    function paint() {
      const pats = lsGet(RX_PAT, []);
      host.innerHTML = '<div class="dx-note">⚕️ ' + B('இது வடிவமைப்புக் கருவி மட்டுமே — மருந்து விவரங்களுக்கு மருத்துவரே பொறுப்பு. விவரங்கள் இந்தச் சாதனத்திலேயே இருக்கும்.', 'A formatting tool only — the doctor is responsible for the content. Details stay on this device.') + '</div>' +
        '<div class="dx-grid">' + sel(B('மொழி', 'Language'), 'lang', [['bi', 'தமிழ் + EN'], ['ta', 'தமிழ்'], ['en', 'English']]) + sel(B('தாள் அளவு', 'Paper size'), 'size', [['A4', 'A4'], ['A5', 'A5']]) + '</div>' +
        '<details' + (S.doc.name ? '' : ' open') + '><summary>' + B('மருத்துவர் / கிளினிக்', 'Doctor / clinic') + (S.doc.name ? ' — ' + esc(S.doc.name) : '') + '</summary>' + fld(B('மருத்துவர் பெயர்', 'Doctor name'), 'doc.name', { ph: 'Dr. ...' }) + '<div class="dx-grid">' + fld(B('தகுதி', 'Qualification'), 'doc.qual', { ph: 'MBBS, MD' }) + fld(B('பதிவு எண்', 'Registration no.'), 'doc.reg') + '</div>' + fld(B('கிளினிக் / மருத்துவமனை', 'Clinic / hospital'), 'doc.clinic') + fld(B('முகவரி', 'Address'), 'doc.addr', { area: 2 }) + '<div class="dx-grid">' + fld(B('தொலைபேசி', 'Phone'), 'doc.phone', { type: 'tel' }) + fld(B('நேரம்', 'Timings'), 'doc.timing', { ph: '10am–1pm, 5pm–8pm' }) + '</div></details>' +
        '<h3 class="dx-h">' + B('நோயாளி', 'Patient') + '</h3>' + (pats.length ? '<div class="dx-f"><label>' + B('சேமித்த நோயாளி', 'Saved patients') + '</label><select data-load="1"><option value="">' + esc(B('— தேர்வு செய் —', '— choose —')) + '</option>' + pats.map((p, i) => '<option value="' + i + '">' + esc(p.name + (p.age ? ' (' + p.age + ')' : '')) + '</option>').join('') + '</select></div>' : '') +
        fld(B('பெயர்', 'Name'), 'pat.name') + '<div class="dx-grid three">' + fld(B('வயது', 'Age'), 'pat.age', { mode: 'numeric' }) + sel(B('அலகு', 'Unit'), 'pat.unit', ['Yrs', 'Months', 'Days']) + sel(B('பாலினம்', 'Sex'), 'pat.sex', ['Male', 'Female', 'Other']) + '</div><div class="dx-grid">' + fld(B('எடை (kg)', 'Weight (kg)'), 'pat.wt', { mode: 'decimal' }) + fld(B('கைபேசி', 'Mobile'), 'pat.phone', { type: 'tel' }) + '</div>' + fld(B('தேதி', 'Date'), 'date', { type: 'date' }) +
        '<details><summary>' + B('உடல் அளவீடுகள் (BP, Pulse, Temp, SpO₂)', 'Vitals (BP, pulse, temp, SpO₂)') + '</summary><div class="dx-grid">' + fld('BP (mmHg)', 'vit.bp', { ph: '120/80' }) + fld('Pulse (/min)', 'vit.pulse', { mode: 'numeric' }) + '</div><div class="dx-grid">' + fld('Temp (°F)', 'vit.temp', { mode: 'decimal' }) + fld('SpO₂ (%)', 'vit.spo2', { mode: 'numeric' }) + '</div></details>' +
        fld(B('புகார் (Complaints)', 'Complaints'), 'co', { area: 2 }) + fld(B('நோய் கண்டறிதல் (Diagnosis)', 'Diagnosis'), 'dx') +
        '<h3 class="dx-h">Rx — ' + B('மருந்துகள்', 'Medicines') + '</h3>' + S.meds.map((m, i) => '<div class="dx-item"><div class="dx-ih"><span>#' + (i + 1) + '</span>' + (S.meds.length > 1 ? '<button type="button" class="dx-del" data-del="' + i + '" aria-label="' + esc(B('மருந்தை நீக்கு', 'Remove medicine')) + '">✕</button>' : '') + '</div>' +
          '<div class="dx-grid"><div class="dx-f"><label>' + B('வகை', 'Form') + '</label><select data-p="meds.' + i + '.f">' + RX_FORMS.map((o) => '<option' + (m.f === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' + fld(B('வலிமை', 'Strength'), 'meds.' + i + '.s', { ph: '500 mg' }) + '</div>' + fld(B('மருந்தின் பெயர்', 'Medicine name'), 'meds.' + i + '.n') +
          '<div class="dx-grid">' + sel(B('அளவு (காலை-மதியம்-இரவு)', 'Dose (morning-noon-night)'), 'meds.' + i + '.q', RX_FREQ) + sel(B('உணவு', 'Food'), 'meds.' + i + '.fd', RX_FOOD) + '</div><div class="dx-grid">' + fld(B('நாட்கள்', 'Days'), 'meds.' + i + '.d', { ph: '5' }) + fld(B('குறிப்பு', 'Note'), 'meds.' + i + '.note') + '</div></div>').join('') +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-add="1">＋ ' + B('மருந்து சேர்', 'Add medicine') + '</button></div>' +
        fld(B('பரிசோதனைகள் (Tests)', 'Tests advised'), 'tests', { area: 2 }) + fld(B('அறிவுரை (Advice)', 'Advice'), 'advice', { area: 3 }) + fld(B('மீண்டும் வர வேண்டிய நாள்', 'Review on'), 'follow', { type: 'date' }) + '<div data-k="msg" aria-live="polite"></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn" data-out="pdf">📄 PDF</button><button type="button" class="dx-btn sec" data-out="print">🖨️ ' + B('திற / அச்சிடு', 'Open / Print') + '</button><button type="button" class="dx-btn sec" data-out="wa">💬 WhatsApp</button></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn sec" data-savepat="1">💾 ' + B('நோயாளியைச் சேமி', 'Save patient') + '</button><button type="button" class="dx-btn sec" data-next="1">➡️ ' + B('புதிய நோயாளி', 'New patient') + '</button></div>';
    }
    host.addEventListener('input', onIn); host.addEventListener('change', onIn);
    function onIn(e) {
      const t = e.target;
      if (t.hasAttribute && t.hasAttribute('data-load')) { const p = lsGet(RX_PAT, [])[+t.value]; if (p) { S.pat = Object.assign(S.pat, p); paint(); save(); } return; }
      const p = t.getAttribute && t.getAttribute('data-p'); if (!p) return;
      const parts = p.split('.'); if (parts[0] === 'meds') { const i = +parts[1]; if (!S.meds[i]) return; S.meds[i][parts[2]] = t.value; } else setPath(S, p, t.value);
      if (p === 'lang' || p === 'size') paint(); save();
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-add')) { S.meds.push(newMed()); paint(); save(); }
      else if (b.hasAttribute('data-del')) { S.meds.splice(+b.getAttribute('data-del'), 1); paint(); save(); }
      else if (b.hasAttribute('data-savepat')) { if (!S.pat.name.trim()) return; const list = lsGet(RX_PAT, []).filter((x) => !(x.name === S.pat.name && x.phone === S.pat.phone)); list.unshift(Object.assign({}, S.pat)); lsSet(RX_PAT, list.slice(0, 200)); paint(); host.querySelector('[data-k=msg]').innerHTML = '<div class="dx-ok">✓ ' + B('சேமிக்கப்பட்டது', 'Saved') + '</div>'; }
      else if (b.hasAttribute('data-next')) { const d = S.doc, lang = S.lang, size = S.size; S = blankRx(); S.doc = d; S.lang = lang; S.size = size; paint(); save(); }
      else if (b.hasAttribute('data-out')) run(b.getAttribute('data-out'));
    });
    async function run(kind) {
      const msg = host.querySelector('[data-k=msg]'), pr = rxProblems(S);
      if (pr.errs.length) { msg.innerHTML = '<div class="dx-err" role="alert">' + pr.errs.map(esc).join('<br>') + '</div>'; return; }
      try {
        if (kind === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(rxText(S)), '_blank');
        else {
          const blob = new Blob([await rxPdf(S)], { type: 'application/pdf' }), name = 'Prescription-' + (fileSafe(S.pat.name) || 'patient') + '-' + S.date + '.pdf';
          if (kind === 'print') { const url = URL.createObjectURL(blob); if (!window.open(url, '_blank')) downloadBlob(blob, name); setTimeout(() => URL.revokeObjectURL(url), 120000); } else downloadBlob(blob, name);
        }
        lsSet(RX_DOC, S.doc); save();
        msg.innerHTML = '<div class="dx-ok">✓ ' + B('மருந்துச் சீட்டு தயார்', 'Prescription ready') + '</div>' + (pr.warns.length ? '<div class="dx-warn">⚠ ' + pr.warns.map(esc).join('<br>⚠ ') + '</div>' : '');
      } catch (err) { msg.innerHTML = '<div class="dx-err" role="alert">' + esc(err && err.message || err) + '</div>'; }
    }
    paint();
  }
  async function rxPdf(S) {
    const doc = await PDFDocument.create(); doc.setTitle('Prescription ' + S.pat.name); doc.setCreator('pdftoolsindia.com');
    const font = await embedUnicodeFont(doc), uni = !!font.__mixedShape, t = (en, ta) => tl(S.lang, en, ta), Lx = (s) => { s = String(s == null ? '' : s); return uni ? s : s.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); };
    const A5 = S.size === 'A5', W = A5 ? 419.53 : 595.28, H = A5 ? 595.28 : 841.89, MX = A5 ? 30 : 40, CW = W - 2 * MX, FS = A5 ? 0.9 : 1;
    const INK = rgb(0.1, 0.1, 0.12), GR = rgb(0.4, 0.42, 0.48), LN = rgb(0.8, 0.82, 0.86), BR = rgb(0, 0.45, 0.38);
    let page, y, pageNo = 0;
    const header = () => {
      page = doc.addPage([W, H]); pageNo++; y = H - MX;
      const tx = (s, yy, size, col, b) => { page.drawText(Lx(s), { x: MX, y: yy, size, font, color: col || INK }); if (b) page.drawText(Lx(s), { x: MX + 0.3, y: yy, size, font, color: col || INK }); };
      wrapLines(font, Lx(S.doc.name), 16 * FS, CW, 2).forEach((ln) => { tx(ln, y - 14, 16 * FS, BR, true); y -= 19 * FS; });
      if (S.doc.qual || S.doc.reg) { wrapLines(font, Lx(S.doc.qual + (S.doc.reg ? (S.doc.qual ? '  ·  ' : '') + t('Reg. No: ', 'பதிவு எண்: ') + S.doc.reg : '')), 9.5 * FS, CW, 2).forEach((ln) => { tx(ln, y - 10, 9.5 * FS, GR); y -= 12 * FS; }); }
      [S.doc.clinic, S.doc.addr, [S.doc.phone && 'Ph: ' + S.doc.phone, S.doc.timing && t('Timings: ', 'நேரம்: ') + S.doc.timing].filter(Boolean).join('   ')].filter((x) => String(x || '').trim()).forEach((x) => wrapLines(font, Lx(x), 9 * FS, CW, 3).forEach((ln) => { tx(ln, y - 10, 9 * FS, GR); y -= 11.5 * FS; }));
      y -= 6; page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 1.2, color: BR }); y -= 16;
    };
    header();
    const draw = (s, x, size, col, b) => { if (y < 90) { header(); } page.drawText(Lx(s), { x, y, size, font, color: col || INK }); if (b) page.drawText(Lx(s), { x: x + 0.3, y, size, font, color: col || INK }); };
    const para = (s, x, size, col, w, lh) => wrapLines(font, Lx(s), size, w || CW, 60).forEach((ln) => { draw(ln, x, size, col); y -= lh || size * 1.45; });
    const pat = S.pat, ageS = pat.age ? pat.age + ' ' + pat.unit : '—';
    draw(t('Patient', 'நோயாளி') + ': ' + pat.name, MX, 11 * FS, INK, true); const dt = t('Date', 'தேதி') + ': ' + fmtDMY(S.date); page.drawText(Lx(dt), { x: W - MX - font.widthOfTextAtSize(Lx(dt), 10 * FS), y, size: 10 * FS, font, color: INK }); y -= 15 * FS;
    draw([t('Age/Sex', 'வயது/பாலினம்') + ': ' + ageS + ' / ' + pat.sex, pat.wt && t('Wt', 'எடை') + ': ' + pat.wt + ' kg', pat.phone && 'Ph: ' + pat.phone].filter(Boolean).join('    '), MX, 9.5 * FS, GR); y -= 14 * FS;
    const v = S.vit, vit = [v.bp && 'BP ' + v.bp, v.pulse && 'Pulse ' + v.pulse + '/min', v.temp && 'Temp ' + v.temp + '°F', v.spo2 && 'SpO₂ ' + v.spo2 + '%'].filter(Boolean); if (vit.length) { draw(vit.join('    '), MX, 9.5 * FS, GR); y -= 14 * FS; }
    if (S.co.trim()) { para(t('C/O', 'புகார்') + ': ' + S.co.trim(), MX, 10 * FS, INK); }
    if (S.dx.trim()) { para(t('Diagnosis', 'நோய்') + ': ' + S.dx.trim(), MX, 10 * FS, INK); }
    y -= 4; page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.7, color: LN }); y -= 26 * FS;
    draw('Rx', MX, 20 * FS, BR, true); y -= 24 * FS;
    S.meds.filter((m) => m.n.trim()).forEach((m, i) => {
      if (y < 130) header();
      const name = (i + 1) + '.  ' + [m.f, m.n.trim(), m.s].filter(Boolean).join(' ');
      wrapLines(font, Lx(name), 11.5 * FS, CW - 16, 3).forEach((ln) => { draw(ln, MX + 8, 11.5 * FS, INK, true); y -= 15 * FS; });
      const d = rxMedLine(m, S.lang === 'en' ? 'en' : 'ta'); if (d) { draw(d, MX + 26, 9.5 * FS, GR); y -= 13 * FS; } if (m.note.trim()) { para(m.note.trim(), MX + 26, 9 * FS, GR, CW - 34); } y -= 6 * FS;
    });
    if (S.tests.trim()) { y -= 6; draw(t('Tests advised', 'பரிசோதனைகள்') + ':', MX, 10 * FS, GR, true); y -= 14 * FS; para(S.tests.trim(), MX + 8, 10 * FS, INK, CW - 8); }
    if (S.advice.trim()) { y -= 6; draw(t('Advice', 'அறிவுரை') + ':', MX, 10 * FS, GR, true); y -= 14 * FS; para(S.advice.trim(), MX + 8, 10 * FS, INK, CW - 8); }
    if (S.follow) { y -= 6; draw(t('Review on', 'மீண்டும் வர வேண்டிய நாள்') + ': ' + fmtDMY(S.follow), MX, 10 * FS, BR, true); y -= 14 * FS; }
    const sy = Math.max(50, Math.min(y - 40, 80)); page.drawLine({ start: { x: W - MX - 150, y: sy }, end: { x: W - MX, y: sy }, thickness: 0.8, color: rgb(0.55, 0.57, 0.62) });
    wrapLines(font, Lx(t('Doctor signature', 'மருத்துவர் கையொப்பம்')), 8.5 * FS, 150, 2).forEach((ln, i) => page.drawText(ln, { x: W - MX - 150, y: sy - 11 - i * 10, size: 8.5 * FS, font, color: GR }));
    return doc.save();
  }
  TOOL_IMPL.prescription = { mount(container) { mountRx(container); } };
  TOOL_IMPL.prescription._f = { rxProblems, rxMedLine, blankRx };


  /* =====================================================================
     BUSINESS CARD — 4 layouts, colours, Tamil-friendly, QR (UPI / website / contact),
     PNG (300 dpi), 10-up A4 cut sheet with crop marks, single-card PDF, vCard
     ===================================================================== */
  const BC_KEY = 'pti-card-v1';
  const BC_THEMES = { navy: ['#1A3C6E', '#FFFFFF', '#F4C430'], white: ['#FFFFFF', '#20242B', '#1A5276'], green: ['#1F6F54', '#FFFFFF', '#F4D03F'], maroon: ['#7A1233', '#FFFFFF', '#F2C14E'], black: ['#16181D', '#FFFFFF', '#3DDC97'], saffron: ['#FFF4E5', '#3A2A12', '#D9622B'], custom: null };
  const BC_FONT = '"Noto Sans Tamil","Inter","Segoe UI",Arial,sans-serif';
  const hexOk = (s) => /^#[0-9a-fA-F]{6}$/.test(s || '');
  function blankCard() {
    const d = lsGet(BC_KEY, {});
    return Object.assign({ v: 1, layout: 'bar', theme: 'navy', cust: ['#1A3C6E', '#FFFFFF', '#F4C430'], name: '', name2: '', desig: '', company: '', tag: '', phone: '', phone2: '', email: '', web: '', addr: '', gstin: '', upi: '', qr: 'none' }, d);
  }
  const bcColors = (S) => { const t = S.theme === 'custom' ? S.cust : BC_THEMES[S.theme] || BC_THEMES.navy; return { bg: hexOk(t[0]) ? t[0] : '#1A3C6E', tx: hexOk(t[1]) ? t[1] : '#FFFFFF', ac: hexOk(t[2]) ? t[2] : '#F4C430' }; };
  const bcWeb = (w) => { w = String(w || '').trim(); return w && !/^https?:\/\//i.test(w) ? 'https://' + w : w; };
  function bcVcard(S, compact) {
    if (compact) S = Object.assign({}, S, { phone2: '', addr: '' });
    const e = (s) => String(s || '').replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
    return ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + e(S.name), 'N:' + e(S.name) + ';;;;', S.company && 'ORG:' + e(S.company), S.desig && 'TITLE:' + e(S.desig), S.phone && 'TEL;TYPE=CELL:' + S.phone.replace(/[^\d+]/g, ''), S.phone2 && 'TEL;TYPE=WORK:' + S.phone2.replace(/[^\d+]/g, ''), S.email && 'EMAIL:' + S.email, S.web && 'URL:' + bcWeb(S.web), S.addr && 'ADR;TYPE=WORK:;;' + e(S.addr.replace(/\n/g, ', ')) + ';;;;', 'END:VCARD'].filter(Boolean).join('\r\n');
  }
  function bcQrText(S) {
    if (S.qr === 'upi' && S.upi.trim()) return 'upi://pay?pa=' + encodeURIComponent(S.upi.trim()) + '&pn=' + encodeURIComponent(S.name || S.company || '') + '&cu=INR';
    if (S.qr === 'web' && S.web.trim()) return bcWeb(S.web);
    if (S.qr === 'vcard' && S.name.trim()) return bcVcard(S, true); // compact: fewer fields = a sparser, easier-to-scan code
    return '';
  }
  async function drawCard(S, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), k = W / 1050, col = bcColors(S);
    try { await Promise.all([document.fonts.load('700 40px "Noto Sans Tamil"'), document.fonts.load('400 24px "Noto Sans Tamil"')]); } catch (e) { /* fall back to system fonts */ }
    const px = (n) => n * k, font = (w, s) => w + ' ' + px(s) + 'px ' + BC_FONT;
    const fit = (text, maxW, size, w, min) => { let s = size; x.font = font(w, s); while (s > (min || 14) && x.measureText(text).width > px(maxW)) { s -= 1; x.font = font(w, s); } return s; };
    const wrap = (text, maxW, size, w, maxLines) => { x.font = font(w, size); const out = []; String(text || '').split('\n').forEach((para) => { let line = ''; para.split(/\s+/).filter(Boolean).forEach((wd) => { const t = line ? line + ' ' + wd : wd; if (x.measureText(t).width > px(maxW) && line) { out.push(line); line = wd; } else line = t; }); if (line) out.push(line); }); return out.slice(0, maxLines || 3); };
    const qrText = bcQrText(S); let qrImg = null;
    if (qrText) { const u = await qrDataUrl(qrText, 260); if (u) { qrImg = new Image(); await new Promise((r) => { qrImg.onload = r; qrImg.onerror = r; qrImg.src = u; }); } }
    const qsz = 190, hasQr = !!(qrImg && qrImg.width);
    const dark = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 < 140; };
    const icon = (kind, ix, iy, size, color) => {
      x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = px(2.4); x.lineJoin = 'round'; x.lineCap = 'round'; const s = px(size), X = px(ix), Y = px(iy) - s;
      if (kind === 'phone') { x.beginPath(); x.roundRect ? x.roundRect(X + s * .25, Y, s * .5, s, s * .1) : x.rect(X + s * .25, Y, s * .5, s); x.stroke(); x.beginPath(); x.arc(X + s * .5, Y + s * .82, s * .04, 0, 7); x.fill(); }
      else if (kind === 'mail') { x.strokeRect(X, Y + s * .2, s, s * .62); x.beginPath(); x.moveTo(X, Y + s * .2); x.lineTo(X + s / 2, Y + s * .55); x.lineTo(X + s, Y + s * .2); x.stroke(); }
      else if (kind === 'web') { x.beginPath(); x.arc(X + s / 2, Y + s / 2, s * .46, 0, 7); x.stroke(); x.beginPath(); x.ellipse(X + s / 2, Y + s / 2, s * .2, s * .46, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(X + s * .04, Y + s / 2); x.lineTo(X + s * .96, Y + s / 2); x.stroke(); }
      else { x.beginPath(); x.arc(X + s / 2, Y + s * .38, s * .3, Math.PI, 0); x.lineTo(X + s / 2, Y + s * .95); x.closePath(); x.stroke(); x.beginPath(); x.arc(X + s / 2, Y + s * .38, s * .1, 0, 7); x.fill(); }
      x.restore();
    };
    const contacts = [['phone', [S.phone, S.phone2].filter((v) => v.trim()).join('   ')], ['mail', S.email], ['web', S.web.replace(/^https?:\/\//i, '')], ['pin', S.addr]].filter((r) => String(r[1] || '').trim());
    const drawContacts = (left, top, maxW, fg, ac, size, gap) => { let y = top; contacts.forEach((r) => { const lines = r[0] === 'pin' ? wrap(r[1], maxW - 52, size, 400, 2) : [r[1]]; icon(r[0], left, y, size * .95, ac); lines.forEach((ln, i) => { x.font = font(400, size); if (r[0] !== 'pin') x.font = font(400, fit(ln, maxW - 52, size, 400, 16)); x.fillStyle = fg; x.textBaseline = 'alphabetic'; x.fillText(ln, px(left + 46), px(y + i * (size * 1.3))); }); y += lines.length * size * 1.3 + gap; }); return y; };
    const line = (txt, left, y, maxW, size, wgt, color, align) => { if (!String(txt || '').trim()) return; const s = fit(txt, maxW, size, wgt, 16); x.font = font(wgt, s); x.fillStyle = color; x.textAlign = align || 'left'; x.textBaseline = 'alphabetic'; x.fillText(txt, px(left), px(y)); x.textAlign = 'left'; };
    const qrBox = (qx, qy, size, pad) => { if (!hasQr) return; x.fillStyle = '#fff'; x.fillRect(px(qx - pad), px(qy - pad), px(size + 2 * pad), px(size + 2 * pad)); x.drawImage(qrImg, px(qx), px(qy), px(size), px(size)); };
    x.fillStyle = col.bg; x.fillRect(0, 0, W, H); const L = S.layout, tx = col.tx, ac = col.ac;
    if (L === 'bar') {
      x.fillStyle = ac; x.fillRect(0, 0, px(22), H); const left = 70, mw = hasQr ? 640 : 900;
      line((S.company || '').toUpperCase(), left, 82, mw, 26, 700, ac);
      line(S.name || 'Your Name', left, 165, mw, 60, 700, tx); line(S.name2, left, 218, mw, 32, 500, tx); line(S.desig, left, S.name2 ? 264 : 224, mw, 30, 500, ac);
      x.fillStyle = ac; x.fillRect(px(left), px(292), px(90), px(5)); drawContacts(left, 352, mw, tx, ac, 27, 14);
      if (hasQr) { qrBox(1050 - qsz - 70, 160, qsz, 12); } line(S.tag, left, 560, 700, 22, 400, tx);
      if (S.gstin.trim()) line('GSTIN: ' + S.gstin, 1050 - 70, 560, 380, 20, 500, tx, 'right');
    } else if (L === 'band') {
      x.fillStyle = col.bg; x.fillRect(0, 0, W, px(255)); x.fillStyle = '#FFFFFF'; x.fillRect(0, px(255), W, H - px(255)); x.fillStyle = ac; x.fillRect(0, px(255), W, px(8));
      const left = 60, mw = 930; line((S.company || '').toUpperCase(), left, 66, mw, 24, 700, ac); line(S.name || 'Your Name', left, 138, mw, 58, 700, tx); line(S.name2, left, 188, mw, 30, 500, tx); line(S.desig, left, S.name2 ? 232 : 192, mw, 28, 500, ac);
      const ink = dark(col.bg) || col.bg.toLowerCase() === '#ffffff' ? '#20242B' : '#20242B'; drawContacts(left, 335, hasQr ? 640 : 900, ink, dark(col.bg) ? col.bg : ac, 27, 14);
      if (hasQr) qrBox(1050 - qsz - 60, 300, qsz, 10); line(S.tag, left, 565, 700, 21, 400, '#5A6270'); if (S.gstin.trim()) line('GSTIN: ' + S.gstin, 990, 565, 380, 20, 500, '#5A6270', 'right');
    } else if (L === 'center') {
      x.fillStyle = ac; x.fillRect(px(60), px(52), W - px(120), px(4)); x.fillRect(px(60), H - px(56), W - px(120), px(4));
      line((S.company || '').toUpperCase(), 525, 118, 900, 28, 700, ac, 'center'); line(S.name || 'Your Name', 525, 200, 900, 64, 700, tx, 'center'); line(S.name2, 525, 250, 900, 32, 500, tx, 'center'); line(S.desig, 525, S.name2 ? 298 : 256, 900, 30, 500, ac, 'center');
      const items = [S.phone && S.phone, S.phone2, S.email, S.web && S.web.replace(/^https?:\/\//i, '')].filter((v) => v && String(v).trim()), rows = [items.slice(0, 2).join('    ·    '), items.slice(2).join('    ·    ')].filter(Boolean);
      const tcx = hasQr ? 440 : 525, tmw = hasQr ? 740 : 900; rows.forEach((r, i) => line(r, tcx, 358 + i * 42, tmw, 27, 400, tx, 'center')); wrap(S.addr, tmw, 24, 400, 2).forEach((ln, i) => line(ln, tcx, 358 + rows.length * 42 + 6 + i * 32, tmw, 24, 400, tx, 'center'));
      if (hasQr) qrBox(1050 - 60 - 150 - 8, 330, 150, 8); if (S.gstin.trim()) line('GSTIN: ' + S.gstin, 525, 524, 600, 19, 500, ac, 'center');
    } else { // split
      const pw = 410; x.fillStyle = col.bg; x.fillRect(0, 0, px(pw), H); x.fillStyle = '#FFFFFF'; x.fillRect(px(pw), 0, W - px(pw), H); x.fillStyle = ac; x.fillRect(px(pw), 0, px(8), H);
      const left = 44, mw = pw - 80; line((S.company || '').toUpperCase(), left, 80, mw, 22, 700, ac); line(S.name || 'Your Name', left, 190, mw, 46, 700, tx);
      let ny = 190; if (S.name2) { line(S.name2, left, 232, mw, 28, 500, tx); ny = 232; } line(S.desig, left, ny + 46, mw, 26, 500, ac);
      if (hasQr) qrBox(left, 600 - qsz - 44, qsz - 30, 10); const ink = '#20242B'; drawContacts(pw + 60, 190, 1050 - pw - 110, ink, dark(col.bg) ? col.bg : ac, 27, 18); line(S.tag, pw + 60, 548, 1050 - pw - 110, 21, 400, '#5A6270'); if (S.gstin.trim()) line('GSTIN: ' + S.gstin, pw + 60, 100, 1050 - pw - 110, 20, 600, '#5A6270');
    }
    return c;
  }
  function mountCard(container) {
    const host = root(container); let S = blankCard(), seq = 0;
    const save = () => lsSet(BC_KEY, S);
    const fld = (label, key, o) => { o = o || {}; return '<div class="dx-f"><label>' + label + '</label>' + (o.area ? '<textarea data-p="' + key + '" rows="2">' + esc(S[key]) + '</textarea>' : '<input type="' + (o.type || 'text') + '" data-p="' + key + '" value="' + esc(S[key]) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + ' autocomplete="off">') + '</div>'; };
    function paint() {
      host.innerHTML = '<div class="dx-note">💳 ' + B('விவரம் நிரப்பினால் அட்டை உடனே தெரியும். PNG (300 dpi), A4-இல் 10 அட்டைகள் (வெட்டுக் குறிகளுடன்), தனி அட்டை PDF, தொடர்பு கோப்பு (vCard) பதிவிறக்கலாம்.', 'Fill in the details and the card updates live. Download PNG (300 dpi), a 10-up A4 cut sheet with crop marks, a single-card PDF, or a contact file (vCard).') + '</div>' +
        '<div class="dx-grid">' + fld(B('பெயர்', 'Name'), 'name') + fld(B('தமிழ் / 2வது மொழிப் பெயர் (விருப்பம்)', 'Name in 2nd language (optional)'), 'name2') + '</div><div class="dx-grid">' + fld(B('பதவி', 'Designation'), 'desig') + fld(B('நிறுவனம்', 'Company'), 'company') + '</div>' + fld(B('வாசகம் (விருப்பம்)', 'Tagline (optional)'), 'tag') +
        '<div class="dx-grid">' + fld(B('கைபேசி', 'Phone'), 'phone', { type: 'tel' }) + fld(B('2வது எண் (விருப்பம்)', '2nd number (optional)'), 'phone2', { type: 'tel' }) + '</div><div class="dx-grid">' + fld('Email', 'email', { type: 'email' }) + fld(B('இணையதளம்', 'Website'), 'web', { ph: 'www.example.com' }) + '</div>' + fld(B('முகவரி', 'Address'), 'addr', { area: 1 }) + fld('GSTIN ' + B('(விருப்பம்)', '(optional)'), 'gstin') +
        '<h3 class="dx-h">QR</h3><div class="dx-grid"><div class="dx-f"><label>' + B('QR வகை', 'QR type') + '</label><select data-p="qr">' + [['none', B('இல்லை', 'None')], ['vcard', B('தொடர்பு (vCard) — ஸ்கேன் செய்தால் சேமிக்கலாம்', 'Contact (vCard) — scan to save')], ['web', B('இணையதளம்', 'Website')], ['upi', 'UPI ' + B('கட்டணம்', 'payment')]].map((o) => '<option value="' + o[0] + '"' + (S.qr === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>' + (S.qr === 'upi' ? fld('UPI ID', 'upi', { ph: 'name@bank' }) : '<div></div>') + '</div>' +
        '<h3 class="dx-h">' + B('வடிவமைப்பு', 'Design') + '</h3><div class="dx-grid"><div class="dx-f"><label>' + B('அமைப்பு', 'Layout') + '</label><select data-p="layout">' + [['bar', B('பக்கக் கோடு', 'Side bar')], ['band', B('மேல் பட்டை', 'Top band')], ['center', B('மையம்', 'Centered')], ['split', B('இரு பாதி', 'Split panel')]].map((o) => '<option value="' + o[0] + '"' + (S.layout === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div><div class="dx-f"><label>' + B('வண்ணம்', 'Colours') + '</label><select data-p="theme">' + Object.keys(BC_THEMES).map((k) => '<option value="' + k + '"' + (S.theme === k ? ' selected' : '') + '>' + k + '</option>').join('') + '</select></div></div>' +
        (S.theme === 'custom' ? '<div class="dx-grid three">' + ['bg', 'text', 'accent'].map((n, i) => '<div class="dx-f"><label>' + n + '</label><input type="color" data-c="' + i + '" value="' + esc(S.cust[i]) + '" style="width:100%;height:44px;border:1.5px solid var(--line);border-radius:10px;padding:2px"></div>').join('') + '</div>' : '') +
        '<div style="margin-top:14px"><canvas id="bcPrev" width="700" height="400" style="width:100%;max-width:520px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.18);display:block;margin:0 auto" role="img" aria-label="' + esc(B('அட்டை முன்னோட்டம்', 'Card preview')) + '"></canvas></div><div data-k="msg" aria-live="polite"></div>' +
        '<div class="dx-row"><button type="button" class="dx-btn" data-out="sheet">📄 ' + B('A4 தாள் (10 அட்டை)', 'A4 sheet (10 cards)') + '</button><button type="button" class="dx-btn sec" data-out="single">💳 ' + B('தனி அட்டை PDF', 'Single card PDF') + '</button></div><div class="dx-row"><button type="button" class="dx-btn sec" data-out="png">🖼️ PNG</button><button type="button" class="dx-btn sec" data-out="vcf">👤 vCard (.vcf)</button></div>';
      preview();
    }
    async function preview() { const my = ++seq, cv = host.querySelector('#bcPrev'); if (!cv) return; const c = await drawCard(S, 700, 400); if (my !== seq) return; const g = cv.getContext('2d'); g.clearRect(0, 0, 700, 400); g.drawImage(c, 0, 0); }
    let tmr; host.addEventListener('input', onIn); host.addEventListener('change', onIn);
    function onIn(e) {
      const t = e.target, p = t.getAttribute && t.getAttribute('data-p'), ci = t.getAttribute && t.getAttribute('data-c');
      if (ci != null) { S.cust[+ci] = t.value; save(); clearTimeout(tmr); tmr = setTimeout(preview, 120); return; }
      if (!p) return; S[p] = t.value; save();
      if (p === 'theme' || p === 'qr') { paint(); return; } clearTimeout(tmr); tmr = setTimeout(preview, 150);
    }
    host.addEventListener('click', async (e) => {
      const b = e.target.closest && e.target.closest('button[data-out]'); if (!b) return;
      const msg = host.querySelector('[data-k=msg]'), kind = b.getAttribute('data-out'), errs = [];
      if (!S.name.trim()) errs.push(B('பெயர் தேவை', 'Name is required'));
      if (S.qr === 'upi' && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(S.upi.trim())) errs.push(B('சரியான UPI ID தேவை (name@bank)', 'Enter a valid UPI ID (name@bank)'));
      if (S.qr === 'web' && !S.web.trim()) errs.push(B('QR-க்கு இணையதளம் தேவை', 'Website is needed for the website QR'));
      if (S.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.email.trim())) errs.push(B('Email வடிவம் தவறு', 'Email format looks wrong'));
      if (errs.length) { msg.innerHTML = '<div class="dx-err" role="alert">' + errs.map(esc).join('<br>') + '</div>'; return; }
      b.disabled = true; msg.innerHTML = '<div class="dx-note">⏳ ' + B('தயாராகிறது…', 'Preparing…') + '</div>';
      try {
        const base = 'Business-card-' + (fileSafe(S.name) || fileSafe(S.company) || 'card');
        if (kind === 'vcf') downloadBlob(new Blob([bcVcard(S)], { type: 'text/vcard' }), base + '.vcf');
        else {
          const c = await drawCard(S, 1050, 600), blob = await new Promise((r) => c.toBlob(r, 'image/png'));
          if (kind === 'png') downloadBlob(blob, base + '.png');
          else {
            const doc = await PDFDocument.create(), img = await doc.embedPng(new Uint8Array(await blob.arrayBuffer())), CW = 252, CH = 144;
            if (kind === 'single') { const pg = doc.addPage([CW, CH]); pg.drawImage(img, { x: 0, y: 0, width: CW, height: CH }); }
            else {
              const pg = doc.addPage([595.28, 841.89]), gx = 14, gy = 14, tw = 2 * CW + gx, th = 5 * CH + 4 * gy, sx = (595.28 - tw) / 2, sy = (841.89 + th) / 2 - CH, mk = rgb(0.45, 0.45, 0.5);
              for (let r = 0; r < 5; r++) for (let q = 0; q < 2; q++) {
                const cx = sx + q * (CW + gx), cy = sy - r * (CH + gy); pg.drawImage(img, { x: cx, y: cy, width: CW, height: CH });
                [[cx, cy], [cx + CW, cy], [cx, cy + CH], [cx + CW, cy + CH]].forEach((p, i) => { const dx = i % 2 ? 1 : -1, dy = i < 2 ? -1 : 1; pg.drawLine({ start: { x: p[0] + dx * 2, y: p[1] }, end: { x: p[0] + dx * 8, y: p[1] }, thickness: 0.4, color: mk }); pg.drawLine({ start: { x: p[0], y: p[1] + dy * 2 }, end: { x: p[0], y: p[1] + dy * 8 }, thickness: 0.4, color: mk }); });
              }
            }
            downloadBlob(new Blob([await doc.save()], { type: 'application/pdf' }), base + (kind === 'single' ? '-3.5x2in' : '-sheet') + '.pdf');
          }
        }
        msg.innerHTML = '<div class="dx-ok">✓ ' + B('தயார்', 'Ready') + (kind === 'sheet' ? ' — ' + B('அச்சிட்ட பின் குறிகளில் வெட்டுங்கள் (100% அளவில் அச்சிடவும்)', 'cut at the crop marks after printing (print at 100% scale)') : '') + '</div>';
      } catch (err) { msg.innerHTML = '<div class="dx-err" role="alert">' + B('உருவாக்க முடியவில்லை: ', 'Could not create it: ') + esc(err && err.message || err) + '</div>'; } finally { b.disabled = false; }
    });
    paint();
  }
  TOOL_IMPL.businesscard = { mount(container) { mountCard(container); } };
  TOOL_IMPL.businesscard._f = { bcVcard, bcQrText, blankCard };


  /* =====================================================================
     HR ATTENDANCE REGISTER — native (no React / Babel / CDN).
     Same storage keys as the old page (hrreg_employees, hrreg_attendance) so
     existing data carries over. Every write re-reads storage first, so two open
     tabs can never overwrite each other.
     ===================================================================== */
  const HR_ST = {
    P: { en: 'Present', ta: 'வந்தார்', col: '#2F6B46', bg: '#E3F1E8' }, A: { en: 'Absent', ta: 'வரவில்லை', col: '#B23A2E', bg: '#F9E4E0' },
    H: { en: 'Half day', ta: 'அரை நாள்', col: '#9A6B00', bg: '#FBEFCB' }, L: { en: 'Paid leave', ta: 'விடுப்பு', col: '#2F5597', bg: '#E1E9F6' },
    WO: { en: 'Weekly off', ta: 'வார விடுமுறை', col: '#5B5F6B', bg: '#ECEEF2' }, HO: { en: 'Holiday', ta: 'பண்டிகை விடுமுறை', col: '#7B3FA0', bg: '#EEE3F6' },
  };
  const HR_ORDER = ['P', 'A', 'H', 'L', 'WO', 'HO'], WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WD_TA = ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'];
  const hrRd = (k, d) => { try { const v = localStorage.getItem('hrreg_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const hrWr = (k, v) => { try { localStorage.setItem('hrreg_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const hrUid = () => Math.random().toString(36).slice(2, 10);
  const firstChar = (n) => { n = String(n || '').trim(); if (!n) return '?'; try { if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter('ta', { granularity: 'grapheme' }).segment(n)][0].segment; } catch (e) { /* fall through */ } return Array.from(n)[0]; };
  const ymOf = (y, m) => y + '-' + pad2(m + 1), isoOf = (y, m, d) => y + '-' + pad2(m + 1) + '-' + pad2(d);
  const hrActive = (e, iso) => (!e.joinDate || e.joinDate <= iso) && (!e.leftDate || e.leftDate >= iso);
  function hrStats(e, att, y, m, divisorMode) {
    const n = new Date(y, m + 1, 0).getDate(), c = { P: 0, A: 0, H: 0, L: 0, WO: 0, HO: 0, un: 0, days: n };
    for (let d = 1; d <= n; d++) { const iso = isoOf(y, m, d); if (!hrActive(e, iso)) continue; const s = att[e.id + '|' + iso]; if (s && c[s] != null) c[s]++; else c.un++; }
    c.paid = c.P + c.H * 0.5 + c.L + c.WO + c.HO;
    const sal = num(e.salary), div = divisorMode === '26' ? 26 : divisorMode === '30' ? 30 : n;
    c.rate = !sal ? 0 : e.basis === 'day' ? sal : sal / div;
    c.wage = !sal ? 0 : e.basis === 'day' ? Math.round(c.paid * sal) : Math.min(Math.round(c.paid * sal / div), Math.round(sal));
    return c;
  }

  function mountHR(container) {
    const host = root(container), today = localISO(); let tab = 'mark', date = today, vm = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }, edit = null, notice = '';
    const settings = () => Object.assign({ company: '', divisor: 'month' }, hrRd('settings', {}));
    const emps = () => (hrRd('employees', []) || []).filter((e) => e && e.id);
    const att = () => hrRd('attendance', {}) || {};
    const fail = () => { notice = '<div class="dx-err" role="alert">' + B('சேமிக்க முடியவில்லை — உலாவி நினைவகம் நிரம்பியிருக்கலாம். Backup எடுத்து பழைய தரவை நீக்கவும்.', 'Could not save — browser storage may be full. Take a backup and clear old data.') + '</div>'; };
    const css = document.getElementById('hr-style') || (() => { const s = document.createElement('style'); s.id = 'hr-style'; s.textContent = '.hr-tabs{display:flex;gap:6px;margin:4px 0 10px}.hr-tabs button{flex:1;min-height:46px;border:1.5px solid var(--line);background:#fff;border-radius:12px;font:800 12.5px inherit;font-family:inherit;cursor:pointer;color:var(--sub)}.hr-tabs button.on{background:var(--brand);color:#fff;border-color:var(--brand)}.hr-emp{border:1.5px solid var(--line);border-radius:14px;background:#fff;padding:10px;margin-top:8px}.hr-emp .nm{display:flex;align-items:center;gap:10px;font-weight:800}.hr-av{width:38px;height:38px;border-radius:50%;background:#E8EEFB;color:#28407F;display:flex;align-items:center;justify-content:center;font-weight:900;flex:0 0 38px}.hr-st{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.hr-st button{flex:1 1 44px;min-width:44px;min-height:44px;border-radius:10px;border:1.5px solid var(--line);background:#fff;font:800 13px inherit;font-family:inherit;cursor:pointer}.hr-grid{border-collapse:collapse;font-size:12px;background:#fff}.hr-grid th,.hr-grid td{border:1px solid var(--line);text-align:center;padding:0}.hr-grid td.nm,.hr-grid th.nm{position:sticky;left:0;background:#fff;text-align:left;padding:6px 8px;min-width:110px;max-width:140px;z-index:1;font-weight:800}.hr-cell{min-width:34px;min-height:40px;width:34px;height:40px;border:none;background:transparent;font:800 11px inherit;font-family:inherit;cursor:pointer}.hr-sun{background:#F3F4F7}'; document.head.appendChild(s); return s; })(); void css;
    const stBtn = (id, cur, extra) => { const s = HR_ST[id]; return '<button type="button" ' + extra + ' aria-pressed="' + (cur === id) + '" title="' + esc(isEn() ? s.en : s.ta) + '" style="' + (cur === id ? 'background:' + s.bg + ';border-color:' + s.col + ';color:' + s.col : '') + '">' + id + '</button>'; };
    const legend = () => '<div class="dx-hint" style="line-height:1.7">' + HR_ORDER.map((k) => '<b>' + k + '</b> ' + esc(isEn() ? HR_ST[k].en : HR_ST[k].ta)).join(' · ') + '</div>';

    function paint() {
      const S = settings(), E = emps(), A = att(); let h = '';
      h += '<div class="hr-tabs" role="tablist">' + [['mark', '✅', B('வருகை', 'Mark')], ['report', '📊', B('அறிக்கை', 'Report')], ['staff', '👥', B('பணியாளர்', 'Staff')], ['data', '⚙️', B('தரவு', 'Data')]].map((t) => '<button type="button" role="tab" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + ' ' + t[2] + '</button>').join('') + '</div>' + notice;
      notice = '';
      if (tab === 'mark') {
        const dd = new Date(date + 'T00:00:00'), act = E.filter((e) => hrActive(e, date)), mk = act.filter((e) => A[e.id + '|' + date]).length;
        h += '<div class="dx-row" style="margin-top:0"><button type="button" class="dx-btn sec" data-day="-1" aria-label="' + esc(B('முந்தைய நாள்', 'Previous day')) + '" style="flex:0 0 52px">‹</button><input type="date" data-date="1" value="' + date + '" style="flex:1 1 140px" aria-label="' + esc(B('தேதி', 'Date')) + '"><button type="button" class="dx-btn sec" data-day="1" aria-label="' + esc(B('அடுத்த நாள்', 'Next day')) + '" style="flex:0 0 52px">›</button></div>' +
          '<div class="dx-hint">' + (isEn() ? WD_EN[dd.getDay()] : WD_TA[dd.getDay()]) + ' · ' + fmtDMY(date) + ' · ' + mk + '/' + act.length + ' ' + B('பதிவு', 'marked') + (dd.getDay() === 0 ? ' · ' + B('ஞாயிறு — வார விடுமுறை (WO) குறிக்கலாம்', 'Sunday — you can mark weekly off (WO)') : '') + '</div>';
        if (!E.length) h += '<div class="dx-note">' + B('முதலில் "பணியாளர்" தாவலில் ஊழியர்களைச் சேர்க்கவும்.', 'First add your employees in the "Staff" tab.') + '</div>';
        else {
          h += '<div class="dx-row"><button type="button" class="dx-btn" data-all="P">✓ ' + B('மீதமுள்ள அனைவரும் வந்தார்', 'All unmarked present') + '</button><button type="button" class="dx-btn sec" data-all="WO">' + B('மீதமுள்ளவர்கள் WO', 'Unmarked → weekly off') + '</button><button type="button" class="dx-btn sec" data-all="HO">' + B('மீதமுள்ளவர்கள் HO', 'Unmarked → holiday') + '</button></div>';
          h += act.map((e) => { const cur = A[e.id + '|' + date] || ''; return '<div class="hr-emp"><div class="nm"><span class="hr-av">' + esc(firstChar(e.name)) + '</span><span style="min-width:0">' + esc(e.name) + (e.role ? '<div class="dx-hint" style="margin:0">' + esc(e.role) + '</div>' : '') + '</span></div><div class="hr-st">' + HR_ORDER.map((k) => stBtn(k, cur, 'data-mark="' + e.id + '" data-s="' + k + '"')).join('') + '</div></div>'; }).join('') + legend();
        }
      } else if (tab === 'report') {
        const n = new Date(vm.y, vm.m + 1, 0).getDate(), ms = vm.y + '-' + pad2(vm.m + 1), list = E.filter((e) => (!e.joinDate || e.joinDate <= isoOf(vm.y, vm.m, n)) && (!e.leftDate || e.leftDate >= isoOf(vm.y, vm.m, 1))), mname = (isEn() ? MON_EN : MON_TA)[vm.m] + ' ' + vm.y, wages = list.some((e) => num(e.salary));
        h += '<div class="dx-row" style="margin-top:0"><button type="button" class="dx-btn sec" data-mon="-1" aria-label="' + esc(B('முந்தைய மாதம்', 'Previous month')) + '" style="flex:0 0 52px">‹</button><div style="flex:1;text-align:center;font-weight:900;align-self:center">' + esc(mname) + '</div><button type="button" class="dx-btn sec" data-mon="1" aria-label="' + esc(B('அடுத்த மாதம்', 'Next month')) + '" style="flex:0 0 52px">›</button></div>';
        if (!list.length) h += '<div class="dx-note">' + B('இந்த மாதத்துக்குப் பணியாளர் இல்லை.', 'No employees for this month.') + '</div>';
        else {
          h += '<div class="dx-wrap"><table class="dx-tbl"><tr><th>' + B('பெயர்', 'Name') + '</th>' + HR_ORDER.map((k) => '<th>' + k + '</th>').join('') + '<th>' + B('பதிவில்லை', 'Unmarked') + '</th><th>' + B('சம்பள நாட்கள்', 'Paid days') + '</th>' + (wages ? '<th>' + B('சம்பளம் ₹', 'Wages ₹') + '</th>' : '') + '</tr>' +
            list.map((e) => { const s = hrStats(e, A, vm.y, vm.m, S.divisor); return '<tr><td>' + esc(e.name) + (e.leftDate ? ' <small>(' + B('விலகினார்', 'left') + ')</small>' : '') + '</td>' + HR_ORDER.map((k) => '<td>' + s[k] + '</td>').join('') + '<td' + (s.un ? ' style="color:#B23A2E;font-weight:800"' : '') + '>' + s.un + '</td><td><b>' + +s.paid.toFixed(1) + '</b></td>' + (wages ? '<td>' + (num(e.salary) ? inrPlain(s.wage) : '—') + '</td>' : '') + '</tr>'; }).join('') + '</table></div>';
          h += '<h3 class="dx-h">' + B('மாத அட்டவணை (கட்டத்தைத் தட்டினால் மாறும்)', 'Month grid (tap a cell to change)') + '</h3><div class="dx-wrap"><table class="hr-grid"><tr><th class="nm">' + B('பெயர்', 'Name') + '</th>' + Array.from({ length: n }, (_, i) => { const wd = new Date(vm.y, vm.m, i + 1).getDay(); return '<th class="' + (wd === 0 ? 'hr-sun' : '') + '">' + (i + 1) + '<div style="font-weight:600;font-size:10px">' + (isEn() ? WD_EN[wd][0] : WD_TA[wd]) + '</div></th>'; }).join('') + '</tr>' +
            list.map((e) => '<tr><td class="nm">' + esc(e.name) + '</td>' + Array.from({ length: n }, (_, i) => { const iso = isoOf(vm.y, vm.m, i + 1), wd = new Date(vm.y, vm.m, i + 1).getDay(), s = A[e.id + '|' + iso] || ''; if (!hrActive(e, iso)) return '<td class="hr-sun" style="color:#B5B9C4">–</td>'; return '<td class="' + (wd === 0 && !s ? 'hr-sun' : '') + '"><button type="button" class="hr-cell" data-cell="' + e.id + '|' + iso + '" aria-label="' + esc(e.name + ' ' + (i + 1) + ': ' + (s || '—')) + '"' + (s ? ' style="background:' + HR_ST[s].bg + ';color:' + HR_ST[s].col + '"' : '') + '>' + (s || '·') + '</button></td>'; }).join('') + '</tr>').join('') + '</table></div>' + legend();
          h += '<div class="dx-row"><button type="button" class="dx-btn" data-exp="xlsx">📊 Excel</button><button type="button" class="dx-btn sec" data-exp="print">🖨️ ' + B('அச்சிடு / PDF', 'Print / PDF') + '</button></div><div class="dx-hint">' + B('சம்பள நாட்கள் = வந்தார் + அரை நாள் × 0.5 + விடுப்பு + WO + HO.', 'Paid days = Present + Half × 0.5 + Leave + WO + HO.') + '</div>';
        }
      } else if (tab === 'staff') {
        if (edit) {
          const e = edit; h += '<div class="hr-emp"><b>' + (e.id ? B('பணியாளரைத் திருத்து', 'Edit employee') : B('புதிய பணியாளர்', 'New employee')) + '</b>' +
            '<div class="dx-f"><label>' + B('பெயர்', 'Name') + '</label><input type="text" id="hrName" value="' + esc(e.name || '') + '" autocomplete="off"></div><div class="dx-grid"><div class="dx-f"><label>' + B('பணி', 'Role') + '</label><input type="text" id="hrRole" value="' + esc(e.role || '') + '" autocomplete="off"></div><div class="dx-f"><label>' + B('கைபேசி', 'Phone') + '</label><input type="tel" id="hrPhone" value="' + esc(e.phone || '') + '" autocomplete="off"></div></div>' +
            '<div class="dx-grid"><div class="dx-f"><label>' + B('சேர்ந்த நாள்', 'Joined on') + '</label><input type="date" id="hrJoin" value="' + esc(e.joinDate || today) + '"></div><div class="dx-f"><label>' + B('விலகிய நாள் (விருப்பம்)', 'Left on (optional)') + '</label><input type="date" id="hrLeft" value="' + esc(e.leftDate || '') + '"></div></div>' +
            '<div class="dx-grid"><div class="dx-f"><label>' + B('சம்பளம் ₹ (விருப்பம்)', 'Pay ₹ (optional)') + '</label><input type="number" id="hrSal" inputmode="decimal" min="0" step="any" value="' + esc(e.salary || '') + '"></div><div class="dx-f"><label>' + B('கணக்கு', 'Pay basis') + '</label><select id="hrBasis"><option value="month"' + (e.basis !== 'day' ? ' selected' : '') + '>' + B('மாதச் சம்பளம்', 'Monthly salary') + '</option><option value="day"' + (e.basis === 'day' ? ' selected' : '') + '>' + B('தினக்கூலி', 'Daily wage') + '</option></select></div></div>' +
            '<div data-k="form"></div><div class="dx-row"><button type="button" class="dx-btn" data-save="1">💾 ' + B('சேமி', 'Save') + '</button><button type="button" class="dx-btn sec" data-cancel="1">' + B('ரத்து', 'Cancel') + '</button></div></div>';
        } else {
          h += '<div class="dx-row" style="margin-top:0"><button type="button" class="dx-btn" data-new="1">＋ ' + B('பணியாளரைச் சேர்', 'Add employee') + '</button></div>';
          const cur = E.filter((e) => !e.leftDate || e.leftDate > today), gone = E.filter((e) => e.leftDate && e.leftDate <= today);
          const card = (e, g) => '<div class="hr-emp"><div class="nm"><span class="hr-av">' + esc(firstChar(e.name)) + '</span><span style="min-width:0;flex:1">' + esc(e.name) + '<div class="dx-hint" style="margin:0">' + esc([e.role, e.phone, B('சேர்ந்தது', 'joined') + ' ' + fmtDMY(e.joinDate || ''), e.leftDate && B('விலகியது', 'left') + ' ' + fmtDMY(e.leftDate), num(e.salary) && '₹' + inrPlain(num(e.salary)) + (e.basis === 'day' ? '/' + B('நாள்', 'day') : '/' + B('மாதம்', 'month'))].filter(Boolean).join(' · ')) + '</div></span></div><div class="dx-row"><button type="button" class="dx-btn sec" data-edit="' + e.id + '">✏️ ' + B('திருத்து', 'Edit') + '</button>' + (g ? '<button type="button" class="dx-btn sec" data-rejoin="' + e.id + '">↩ ' + B('மீண்டும் சேர்', 'Rejoin') + '</button><button type="button" class="dx-del" style="flex:0 0 46px" data-purge="' + e.id + '" aria-label="' + esc(B('நிரந்தரமாக நீக்கு', 'Delete permanently')) + '">🗑</button>' : '<button type="button" class="dx-btn sec" data-left="' + e.id + '">🚪 ' + B('விலகினார்', 'Mark as left') + '</button>') + '</div></div>';
          h += (cur.length ? cur.map((e) => card(e, false)).join('') : '<div class="dx-note" style="margin-top:10px">' + B('இன்னும் பணியாளர் இல்லை.', 'No employees yet.') + '</div>') + (gone.length ? '<h3 class="dx-h">' + B('விலகியவர்கள் (பழைய மாத அறிக்கையில் தொடர்ந்து தெரிவார்கள்)', 'Former staff (still shown in the months they worked)') + '</h3>' + gone.map((e) => card(e, true)).join('') : '');
        }
      } else {
        h += '<div class="dx-f"><label>' + B('நிறுவனப் பெயர் (Excel / அச்சில் வரும்)', 'Company name (printed on Excel / print)') + '</label><input type="text" id="hrCo" value="' + esc(S.company) + '" autocomplete="off"></div><div class="dx-f"><label>' + B('சம்பளக் கணக்கு: ஒரு நாள் = மாதச் சம்பளம் ÷', 'Daily rate = monthly salary ÷') + '</label><select id="hrDiv">' + [['month', B('மாதத்தின் நாட்கள் (28–31)', 'Days in the month (28–31)')], ['26', '26'], ['30', '30']].map((o) => '<option value="' + o[0] + '"' + (S.divisor === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>' +
          '<div class="dx-row"><button type="button" class="dx-btn" data-savesettings="1">💾 ' + B('சேமி', 'Save') + '</button></div><h3 class="dx-h">' + B('Backup / Restore', 'Backup / Restore') + '</h3><div class="dx-warn" style="margin-top:0">' + B('தரவு இந்த phone / browser-ல் மட்டுமே சேமிக்கப்படுகிறது — வேறு phone-ல் தெரியாது. "Clear browsing data" செய்தால் அழிந்துவிடும். மாதம் ஒருமுறை Backup எடுங்கள்.', 'Data is stored only on this phone / browser — other phones will not see it, and "Clear browsing data" erases it. Take a backup once a month.') + '</div>' +
          '<div class="dx-row"><button type="button" class="dx-btn" data-backup="1">⬇️ Backup (.json)</button><button type="button" class="dx-btn sec" data-restore="1">⬆️ Restore</button></div><input type="file" id="hrFile" accept="application/json,.json" style="display:none"><div data-k="data"></div>';
      }
      host.innerHTML = h;
    }
    const msg = (sel, kind, t) => { const n = host.querySelector('[data-k=' + sel + ']'); if (n) n.innerHTML = '<div class="dx-' + kind + '" role="' + (kind === 'err' ? 'alert' : 'status') + '">' + t + '</div>'; };
    host.addEventListener('click', (ev) => {
      const b = ev.target.closest && ev.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.tab) { tab = d.tab; edit = null; return paint(); }
      if (d.day) { const dt = new Date(date + 'T00:00:00'); dt.setDate(dt.getDate() + +d.day); date = localISO(dt); return paint(); }
      if (d.mon) { vm.m += +d.mon; if (vm.m < 0) { vm.m = 11; vm.y--; } if (vm.m > 11) { vm.m = 0; vm.y++; } return paint(); }
      if (d.mark) { const a = att(), k = d.mark + '|' + date; if (!validISO(date)) return; if (a[k] === d.s) delete a[k]; else a[k] = d.s; if (!hrWr('attendance', a)) fail(); return paint(); }
      if (d.all) { const a = att(); emps().filter((e) => hrActive(e, date)).forEach((e) => { const k = e.id + '|' + date; if (!a[k]) a[k] = d.all; }); if (!hrWr('attendance', a)) fail(); return paint(); }
      if (d.cell) { const a = att(), cur = a[d.cell] || '', i = HR_ORDER.indexOf(cur), nx = i + 1 >= HR_ORDER.length ? '' : HR_ORDER[i + 1]; if (nx) a[d.cell] = nx; else delete a[d.cell]; if (!hrWr('attendance', a)) fail(); return paint(); }
      if (d.new) { edit = { id: '', name: '' }; return paint(); }
      if (d.edit) { edit = Object.assign({}, emps().find((e) => e.id === d.edit)); return paint(); }
      if (d.cancel) { edit = null; return paint(); }
      if (d.save) return saveEmp();
      if (d.left) { const e = emps().find((x) => x.id === d.left); if (!e || !confirm(e.name + ' — ' + B('விலகினார் என்று குறிக்கவா? (பழைய மாத அறிக்கையில் தொடர்ந்து தெரிவார்)', 'Mark as left? (they stay in the months they worked)'))) return; const all = emps().map((x) => (x.id === e.id ? Object.assign({}, x, { leftDate: today }) : x)); if (!hrWr('employees', all)) fail(); return paint(); }
      if (d.rejoin) { const all = emps().map((x) => { if (x.id !== d.rejoin) return x; const y = Object.assign({}, x); delete y.leftDate; return y; }); if (!hrWr('employees', all)) fail(); return paint(); }
      if (d.purge) { const e = emps().find((x) => x.id === d.purge); if (!e || !confirm(e.name + ' — ' + B('நிரந்தரமாக நீக்கவா? இவரது எல்லா வருகைப் பதிவும் அழியும்; மீட்க முடியாது.', 'Delete permanently? All their attendance will be erased and cannot be recovered.'))) return; hrWr('employees', emps().filter((x) => x.id !== e.id)); const a = att(); Object.keys(a).forEach((k) => { if (k.startsWith(e.id + '|')) delete a[k]; }); hrWr('attendance', a); return paint(); }
      if (d.savesettings) { const s = { company: host.querySelector('#hrCo').value.trim(), divisor: host.querySelector('#hrDiv').value }; if (hrWr('settings', s)) msg('data', 'ok', '✓ ' + B('சேமிக்கப்பட்டது', 'Saved')); else msg('data', 'err', B('சேமிக்க முடியவில்லை', 'Could not save')); return; }
      if (d.backup) { const blob = new Blob([JSON.stringify({ app: 'pti-hr-register', v: 1, saved: new Date().toISOString(), employees: emps(), attendance: att(), settings: settings() }, null, 1)], { type: 'application/json' }); downloadBlob(blob, 'HR-register-backup-' + today + '.json'); return msg('data', 'ok', '✓ ' + B('Backup பதிவிறக்கப்பட்டது', 'Backup downloaded')); }
      if (d.restore) return host.querySelector('#hrFile').click();
      if (d.exp) return exportMonth(d.exp);
    });
    host.addEventListener('change', async (ev) => {
      const t = ev.target;
      if (t.hasAttribute && t.hasAttribute('data-date')) { if (validISO(t.value)) { date = t.value; paint(); } return; }
      if (t.id === 'hrFile' && t.files[0]) {
        try {
          const j = JSON.parse(await t.files[0].text());
          if (j.app !== 'pti-hr-register' || !Array.isArray(j.employees) || typeof j.attendance !== 'object') throw new Error('bad');
          if (!confirm(B('இந்த Backup-ஐ restore செய்தால் தற்போதைய தரவு மாற்றப்படும் (' + j.employees.length + ' பணியாளர்). தொடரவா?', 'Restoring replaces the current data (' + j.employees.length + ' employees). Continue?'))) return;
          hrWr('employees', j.employees); hrWr('attendance', j.attendance); if (j.settings) hrWr('settings', j.settings); paint(); msg('data', 'ok', '✓ ' + B('Restore முடிந்தது', 'Restored'));
        } catch (e) { msg('data', 'err', B('இது சரியான Backup கோப்பு அல்ல', 'This is not a valid backup file')); }
        t.value = '';
      }
    });
    function saveEmp() {
      const g = (id) => host.querySelector('#' + id).value.trim(), name = g('hrName'), join = g('hrJoin'), left = g('hrLeft'), sal = g('hrSal');
      const errs = []; if (!name) errs.push(B('பெயர் தேவை', 'Name is required')); if (join && !validISO(join)) errs.push(B('சேர்ந்த நாள் தவறு', 'Join date is not valid')); if (left && !validISO(left)) errs.push(B('விலகிய நாள் தவறு', 'Left date is not valid')); if (join && left && left < join) errs.push(B('விலகிய நாள் சேர்ந்த நாளுக்கு முன் உள்ளது', 'Left date is before the join date')); if (sal && !(num(sal) >= 0)) errs.push(B('சம்பளம் தவறு', 'Pay is not valid'));
      const all = emps(); if (!errs.length && all.some((e) => e.id !== edit.id && e.name.trim().toLowerCase() === name.toLowerCase()) && !confirm(name + ' — ' + B('இதே பெயரில் ஏற்கெனவே ஒருவர் உள்ளார். மீண்டும் சேர்க்கவா?', 'Someone with this name already exists. Add anyway?'))) return;
      if (errs.length) return msg('form', 'err', errs.map(esc).join('<br>'));
      const rec = Object.assign({}, edit, { name, role: g('hrRole'), phone: g('hrPhone'), joinDate: join || today, salary: sal, basis: host.querySelector('#hrBasis').value }); if (left) rec.leftDate = left; else delete rec.leftDate;
      const next = edit.id ? all.map((e) => (e.id === edit.id ? rec : e)) : all.concat([Object.assign(rec, { id: hrUid() })]);
      if (!hrWr('employees', next)) { fail(); } edit = null; paint();
    }
    async function exportMonth(kind) {
      const S = settings(), E = emps(), A = att(), n = new Date(vm.y, vm.m + 1, 0).getDate(), list = E.filter((e) => (!e.joinDate || e.joinDate <= isoOf(vm.y, vm.m, n)) && (!e.leftDate || e.leftDate >= isoOf(vm.y, vm.m, 1)));
      if (!list.length) return; const title = (S.company ? S.company + ' — ' : '') + 'வருகைப் பதிவேடு / Attendance Register — ' + MON_TA[vm.m] + ' / ' + MON_EN[vm.m] + ' ' + vm.y;
      const rows = list.map((e, i) => { const s = hrStats(e, A, vm.y, vm.m, S.divisor); return { e, s, cells: Array.from({ length: n }, (_, d) => { const iso = isoOf(vm.y, vm.m, d + 1); return hrActive(e, iso) ? (A[e.id + '|' + iso] || '') : '–'; }), i }; });
      const wages = list.some((e) => num(e.salary)), legend = HR_ORDER.map((k) => k + ' = ' + HR_ST[k].en + ' / ' + HR_ST[k].ta).join('    ');
      try {
        if (kind === 'xlsx') {
          if (typeof XLSX === 'undefined') throw new Error('Excel library not loaded');
          const head = ['#', 'பெயர் / Name', 'பணி / Role'].concat(Array.from({ length: n }, (_, d) => d + 1), HR_ORDER, ['Unmarked', 'Paid days'], wages ? ['Rate ₹/day', 'Wages ₹'] : []);
          const wdRow = ['', '', ''].concat(Array.from({ length: n }, (_, d) => WD_EN[new Date(vm.y, vm.m, d + 1).getDay()]));
          const aoa = [[title], wdRow, head].concat(rows.map((r) => [r.i + 1, r.e.name, r.e.role || ''].concat(r.cells, HR_ORDER.map((k) => r.s[k]), [r.s.un, +r.s.paid.toFixed(1)], wages ? [num(r.e.salary) ? +r.s.rate.toFixed(2) : '', num(r.e.salary) ? r.s.wage : ''] : [])), [[]], [[legend]], [[]], [['மேலாளர் கையொப்பம் / Manager signature: ____________________']]);
          const ws = XLSX.utils.aoa_to_sheet(aoa.map((r) => (Array.isArray(r) ? r : [r]))), tot = head.length;
          ws['!cols'] = [{ wch: 4 }, { wch: 22 }, { wch: 14 }].concat(Array(n).fill({ wch: 3.6 }), Array(6).fill({ wch: 4.5 }), [{ wch: 9 }, { wch: 9 }], wages ? [{ wch: 10 }, { wch: 11 }] : []);
          ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: tot - 1 } }, { s: { r: aoa.length - 3, c: 0 }, e: { r: aoa.length - 3, c: tot - 1 } }, { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 10 } }];
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, ymOf(vm.y, vm.m)); const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Attendance_' + ymOf(vm.y, vm.m) + '.xlsx');
        } else {
          const e = esc, thc = (h) => '<th>' + e(h) + '</th>', css = '@page{size:A4 landscape;margin:10mm}body{font-family:"Noto Sans Tamil",Arial,sans-serif;font-size:9px;color:#111}h1{font-size:14px;margin:0 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #888;padding:2px 3px;text-align:center}td.l{text-align:left;white-space:nowrap}.sun{background:#ddd}.g{margin-top:8px}';
          const html = '<!doctype html><meta charset="utf-8"><title>Attendance ' + ymOf(vm.y, vm.m) + '</title><link rel="stylesheet" href="/fonts/tamil.css"><style>' + css + '</style><h1>' + e(title) + '</h1><table><tr><th>#</th><th>Name</th>' + Array.from({ length: n }, (_, d) => '<th class="' + (new Date(vm.y, vm.m, d + 1).getDay() === 0 ? 'sun' : '') + '">' + (d + 1) + '<br>' + WD_EN[new Date(vm.y, vm.m, d + 1).getDay()][0] + '</th>').join('') + HR_ORDER.map(thc).join('') + thc('Paid') + (wages ? thc('Wages ₹') : '') + '</tr>' +
            rows.map((r) => '<tr><td>' + (r.i + 1) + '</td><td class="l">' + e(r.e.name) + '</td>' + r.cells.map((c, d) => '<td class="' + (new Date(vm.y, vm.m, d + 1).getDay() === 0 ? 'sun' : '') + '">' + e(c) + '</td>').join('') + HR_ORDER.map((k) => '<td>' + r.s[k] + '</td>').join('') + '<td><b>' + +r.s.paid.toFixed(1) + '</b></td>' + (wages ? '<td>' + (num(r.e.salary) ? inrPlain(r.s.wage) : '') + '</td>' : '') + '</tr>').join('') + '</table><p class="g">' + e(legend) + '</p><p style="margin-top:34px">மேலாளர் கையொப்பம் / Manager signature: ____________________</p>';
          const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr); const dd = fr.contentWindow.document; dd.open(); dd.write(html); dd.close();
          setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (x) { /* ignore */ } }, 700); setTimeout(() => fr.remove(), 90000);
        }
      } catch (err) { notice = '<div class="dx-err" role="alert">' + esc(err && err.message || err) + '</div>'; paint(); }
    }
    window.addEventListener('storage', (ev) => { if (!host.isConnected) return; if (ev.key && ev.key.indexOf('hrreg_') === 0 && !edit && (tab === 'mark' || tab === 'report' || tab === 'staff')) paint(); });
    paint();
  }
  TOOL_IMPL.hrattendance = { mount(container) { mountHR(container); } };
  TOOL_IMPL.hrattendance._f = { hrStats, hrActive };

  TOOL_IMPL.quotepo = { mount(container) { mountBizDoc(container, 'quotepo', null); } };
  TOOL_IMPL.quotepo._f = { calcDoc, gstinCheck, fyOf, wrapLines, bizCols, STATES, numWords: words };

})();
