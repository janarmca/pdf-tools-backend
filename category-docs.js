/* category-docs.js — lazy-loaded business & personal document tools for pdftoolsindia.com
 *
 *   quotepo, gstinvoice   — Quotation / Proforma / Tax Invoice / Cash Bill / Bill of Supply / Purchase Order / Delivery Challan
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
  const fileSafe = (s) => String(s || '').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

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
  async function qrDataUrl(text, px) {
    try {
      if (typeof ensureQrLib === 'function') await ensureQrLib();
      if (typeof QRCode === 'undefined') return null;
      const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(holder);
      new QRCode(holder, { text, width: px, height: px, correctLevel: QRCode.CorrectLevel.M });
      await new Promise((r) => setTimeout(r, 60));
      const c = holder.querySelector('canvas'), img = holder.querySelector('img');
      const url = c ? c.toDataURL('image/png') : img ? img.src : null;
      holder.remove(); return url;
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
  TOOL_IMPL.rentreceipt = { mount(container) { mountReceipts(container, 'rentreceipt', 'rent'); } };
  TOOL_IMPL.tuitionreceipt = { mount(container) { mountReceipts(container, 'tuitionreceipt', 'tuition'); } };
  TOOL_IMPL.paymentvoucher = { mount(container) { mountReceipts(container, 'paymentvoucher', 'voucher'); } };
  TOOL_IMPL.receipts._f = { buildSlips, rcProblems, rcTotal, incNo, addMonthsISO, rcWords, blankRc };

  TOOL_IMPL.quotepo = { mount(container) { mountBizDoc(container, 'quotepo', null); } };
  TOOL_IMPL.gstinvoice = { mount(container) { mountBizDoc(container, 'gstinvoice', 'tax'); } };
  TOOL_IMPL.quotepo._f = TOOL_IMPL.gstinvoice._f = { calcDoc, gstinCheck, fyOf, wrapLines, bizCols, STATES, numWords: words };

})();
