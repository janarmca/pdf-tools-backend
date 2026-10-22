/* pdf-edit-core.js — real "edit existing text" for the PDF Editor (pdftoolsindia.com).
 *
 * Instead of covering old text with a white box, this rewrites the page's own content stream:
 *   1. parse the content stream into operators (byte-exact, everything we do not touch stays identical),
 *   2. run a small text-state interpreter (q/Q, cm, BT/ET, Tm/Td/TD/T*, Tc/Tw/Tz/TL/Ts/Tf, Tj/TJ/'/")
 *      to know where every glyph of every text-show operator lands on the page (PDF user space),
 *   3. find the glyphs that belong to the text the user clicked (pdf.js text item: origin, width, size),
 *   4a. SAME FONT: if the new text can be written with the font already in the PDF (via its ToUnicode
 *       map / encoding — e.g. a subset that already contains the digits), the glyph codes are replaced
 *       in place → same font, same size, same colour, nothing else on the page moves;
 *   4b. otherwise the old glyphs are removed (replaced by an equal-width gap, so later text on the same
 *       line keeps its position) and the caller draws the new text with a close substitute font.
 *
 * Works in the browser (window.PDFLib) and in Node (require('pdf-lib')) — create(PDFLib) returns the API.
 * No network, no server: everything runs on the visitor's device.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PdfEditCore = factory;
})(typeof self !== 'undefined' ? self : this, function create(PDFLib) {
  'use strict';
  const { PDFName, PDFDict, PDFArray, PDFNumber, PDFRawStream, PDFRef, PDFString, PDFHexString, decodePDFRawStream } = PDFLib;

  /* ------------------------------------------------------------------ bytes <-> latin1 */
  function bytesToLatin1(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }
  function latin1ToBytes(s) { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  function streamBytes(obj) {
    if (!obj) return null;
    if (obj instanceof PDFRawStream) return decodePDFRawStream(obj).decode();
    if (typeof obj.getUnencodedContents === 'function') return obj.getUnencodedContents();
    if (typeof obj.getContents === 'function') return obj.getContents();
    return null;
  }

  /* ------------------------------------------------------------------ tokenizer */
  const WS = { 0: 1, 9: 1, 10: 1, 12: 1, 13: 1, 32: 1 };
  const DELIM = { 40: 1, 41: 1, 60: 1, 62: 1, 91: 1, 93: 1, 123: 1, 125: 1, 47: 1, 37: 1 };
  function parseContent(s) {
    let i = 0; const n = s.length, ops = [];
    let operands = [], opStart = -1;
    const code = (k) => s.charCodeAt(k);
    function skipWs() {
      for (;;) {
        while (i < n && WS[code(i)]) i++;
        if (i < n && s[i] === '%') { while (i < n && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
        break;
      }
    }
    function readLiteral() { // after '('
      let depth = 1, out = '';
      while (i < n) {
        const c = s[i++];
        if (c === '\\') {
          const d = s[i++];
          if (d === 'n') out += '\n'; else if (d === 'r') out += '\r'; else if (d === 't') out += '\t'; else if (d === 'b') out += '\b'; else if (d === 'f') out += '\f';
          else if (d === '\r') { if (s[i] === '\n') i++; } else if (d === '\n') { /* line continuation */ }
          else if (d >= '0' && d <= '7') { let o = d; for (let k = 0; k < 2 && s[i] >= '0' && s[i] <= '7'; k++) o += s[i++]; out += String.fromCharCode(parseInt(o, 8) & 255); }
          else out += d;
        } else if (c === '(') { depth++; out += c; } else if (c === ')') { if (--depth === 0) break; out += c; } else out += c;
      }
      return { t: 's', v: out };
    }
    function readHex() { // after '<'
      let h = '';
      while (i < n && s[i] !== '>') { const c = s[i++]; if (/[0-9a-fA-F]/.test(c)) h += c; }
      i++; if (h.length & 1) h += '0';
      let out = ''; for (let k = 0; k < h.length; k += 2) out += String.fromCharCode(parseInt(h.substr(k, 2), 16));
      return { t: 's', v: out, hex: true };
    }
    function readValue() {
      skipWs(); if (i >= n) return null;
      const c = s[i];
      if (c === '(') { i++; return readLiteral(); }
      if (c === '<') { if (s[i + 1] === '<') { i += 2; const d = {}; for (;;) { skipWs(); if (s[i] === '>' && s[i + 1] === '>') { i += 2; break; } if (i >= n) break; const k = readValue(); const v = readValue(); if (k && k.t === 'name') d[k.v] = v; } return { t: 'd', v: d }; } i++; return readHex(); }
      if (c === '[') { i++; const arr = []; for (;;) { skipWs(); if (i >= n) break; if (s[i] === ']') { i++; break; } const v = readValue(); if (!v) break; arr.push(v); } return { t: 'a', v: arr }; }
      if (c === '/') { i++; let nm = ''; while (i < n && !WS[code(i)] && !DELIM[code(i)]) nm += s[i++]; return { t: 'name', v: nm.replace(/#([0-9a-fA-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))) }; }
      let w = ''; while (i < n && !WS[code(i)] && !DELIM[code(i)]) w += s[i++];
      if (!w) { i++; return { t: 'x', v: c }; } // stray delimiter — skip it
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) return { t: 'n', v: parseFloat(w) };
      if (w === 'true' || w === 'false') return { t: 'b', v: w === 'true' };
      if (w === 'null') return { t: 'null' };
      return { t: 'op', v: w };
    }
    while (i < n) {
      skipWs(); if (i >= n) break;
      const before = i; if (opStart < 0) opStart = before;
      const v = readValue(); if (!v) break;
      if (v.t === 'op') {
        if (v.v === 'BI') { // inline image: skip to EI
          const m = /\sID[\s]/g; m.lastIndex = i; const idm = m.exec(s);
          let j = idm ? idm.index + idm[0].length : i;
          const e = /\sEI(?=[\s]|$)/g; e.lastIndex = j; const em = e.exec(s);
          i = em ? em.index + em[0].length : n;
          ops.push({ op: 'BI', operands: [], start: opStart, end: i });
        } else ops.push({ op: v.v, operands: operands, start: opStart, end: i });
        operands = []; opStart = -1;
      } else operands.push(v);
    }
    return ops;
  }

  /* ------------------------------------------------------------------ matrices */
  const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];
  const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const ID = [1, 0, 0, 1, 0, 0];

  /* ------------------------------------------------------------------ fonts */
  const GLYPHS = { space: ' ', exclam: '!', quotedbl: '"', numbersign: '#', dollar: '$', percent: '%', ampersand: '&', quotesingle: "'", quoteright: '’', quoteleft: '‘', parenleft: '(', parenright: ')', asterisk: '*', plus: '+', comma: ',', hyphen: '-', minus: '−', period: '.', slash: '/', zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', colon: ':', semicolon: ';', less: '<', equal: '=', greater: '>', question: '?', at: '@', bracketleft: '[', backslash: '\\', bracketright: ']', asciicircum: '^', underscore: '_', grave: '`', braceleft: '{', bar: '|', braceright: '}', asciitilde: '~', bullet: '•', endash: '–', emdash: '—', quotedblleft: '“', quotedblright: '”', ellipsis: '…', copyright: '©', registered: '®', degree: '°', rupee: '₹', Euro: '€', sterling: '£', nbspace: ' ' };
  const WINANSI_HI = { 128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž', 145: '‘', 146: '’', 147: '“', 148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›', 156: 'œ', 158: 'ž', 159: 'Ÿ' };
  function glyphNameToUni(nm) {
    if (GLYPHS[nm]) return GLYPHS[nm];
    if (nm.length === 1) return nm;
    let m = /^uni([0-9A-Fa-f]{4})/.exec(nm); if (m) return String.fromCharCode(parseInt(m[1], 16));
    m = /^u([0-9A-Fa-f]{4,6})$/.exec(nm); if (m) return String.fromCodePoint(parseInt(m[1], 16));
    return null;
  }
  function utf16be(str) { let out = ''; for (let k = 0; k + 1 < str.length; k += 2) out += String.fromCharCode((str.charCodeAt(k) << 8) | str.charCodeAt(k + 1)); return out; }
  function hexStrBytes(h) { let o = ''; for (let k = 0; k < h.length; k += 2) o += String.fromCharCode(parseInt(h.substr(k, 2), 16)); return o; }
  function parseToUnicode(text) {
    const map = new Map(); let csLen = 0;
    const toks = (t) => t.match(/<[0-9A-Fa-f\s]*>|\[|\]|[^\s<>\[\]]+/g) || [];
    let m; const cs = /begincodespacerange([\s\S]*?)endcodespacerange/g;
    while ((m = cs.exec(text))) { const h = (m[1].match(/<([0-9A-Fa-f]+)>/) || [])[1]; if (h) csLen = Math.max(csLen, h.length / 2); }
    const bc = /beginbfchar([\s\S]*?)endbfchar/g;
    while ((m = bc.exec(text))) { const t = toks(m[1]); for (let k = 0; k + 1 < t.length; k += 2) { const src = t[k].replace(/[<>\s]/g, ''), dst = t[k + 1].replace(/[<>\s]/g, ''); map.set(hexStrBytes(src), utf16be(hexStrBytes(dst))); if (!csLen) csLen = src.length / 2; } }
    const br = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((m = br.exec(text))) {
      const t = toks(m[1]); let k = 0;
      while (k + 2 < t.length) {
        const lo = t[k].replace(/[<>\s]/g, ''), hi = t[k + 1].replace(/[<>\s]/g, ''); const L = lo.length / 2; if (!csLen) csLen = L;
        const a = parseInt(lo, 16), b = parseInt(hi, 16);
        if (t[k + 2] === '[') { let j = k + 3, c = a; while (j < t.length && t[j] !== ']') { map.set(hexStrBytes(c.toString(16).padStart(L * 2, '0')), utf16be(hexStrBytes(t[j].replace(/[<>\s]/g, '')))); c++; j++; } k = j + 1; }
        else { const d0 = t[k + 2].replace(/[<>\s]/g, ''); const dl = d0.length; const base = parseInt(d0.slice(-4) || '0', 16), pre = d0.slice(0, dl - 4);
          if (b - a < 65536) for (let c = a; c <= b; c++) map.set(hexStrBytes(c.toString(16).padStart(L * 2, '0')), utf16be(hexStrBytes(pre + (base + c - a).toString(16).padStart(4, '0'))));
          k += 3; }
      }
    }
    return { map, csLen };
  }

  function num(o) { return o instanceof PDFNumber ? o.asNumber() : (typeof o === 'number' ? o : null); }
  function nameStr(o) { return o ? String(o.toString()).replace(/^\//, '') : ''; }

  function loadFont(doc, fontDict, key) {
    const ctx = doc.context, L = (o) => (o instanceof PDFRef ? ctx.lookup(o) : o);
    const f = { key, ok: true, bytesPerCode: 1, vertical: false, toUni: new Map(), fromUni: new Map(), widthOf: () => 500, scale: 0.001, name: '', type: '' };
    try {
      f.type = nameStr(fontDict.get(PDFName.of('Subtype')));
      f.name = nameStr(fontDict.get(PDFName.of('BaseFont'))).replace(/^[A-Z]{6}\+/, '');
      const tu = L(fontDict.get(PDFName.of('ToUnicode')));
      let tuMap = null;
      if (tu && (tu instanceof PDFRawStream || typeof tu.getUnencodedContents === 'function')) { try { const b = streamBytes(tu); if (b) tuMap = parseToUnicode(bytesToLatin1(b)); } catch (e) { tuMap = null; } }
      if (f.type === 'Type0') {
        const enc = nameStr(fontDict.get(PDFName.of('Encoding')));
        f.bytesPerCode = 2; f.vertical = /-V$/.test(enc);
        if (enc && !/^Identity-[HV]$/.test(enc) && !(tuMap && tuMap.csLen)) f.ok = false; // unusual CMap — we cannot split codes reliably
        if (tuMap && tuMap.csLen) f.bytesPerCode = tuMap.csLen;
        const desc = L((L(fontDict.get(PDFName.of('DescendantFonts'))) || { get: () => null }).get(0));
        let dw = 1000; const W = new Map();
        if (desc instanceof PDFDict) {
          const d = num(L(desc.get(PDFName.of('DW')))); if (d != null) dw = d;
          const w = L(desc.get(PDFName.of('W')));
          if (w instanceof PDFArray) {
            const a = w.asArray().map(L); let k = 0;
            while (k < a.length) {
              const c0 = num(a[k]);
              if (a[k + 1] instanceof PDFArray) { const ws = a[k + 1].asArray().map(L); ws.forEach((x, j) => W.set(c0 + j, num(x))); k += 2; }
              else { const c1 = num(a[k + 1]), wv = num(a[k + 2]); if (c1 - c0 < 70000) for (let c = c0; c <= c1; c++) W.set(c, wv); k += 3; }
            }
          }
        }
        f.widthOf = (codeStr) => { let c = 0; for (let k = 0; k < codeStr.length; k++) c = c * 256 + codeStr.charCodeAt(k); return W.has(c) ? W.get(c) : dw; };
      } else {
        const fc = num(L(fontDict.get(PDFName.of('FirstChar')))) || 0;
        const ws = L(fontDict.get(PDFName.of('Widths')));
        const arr = ws instanceof PDFArray ? ws.asArray().map((x) => num(L(x))) : null;
        let missing = 500;
        const fd = L(fontDict.get(PDFName.of('FontDescriptor')));
        if (fd instanceof PDFDict) { const mw = num(L(fd.get(PDFName.of('MissingWidth')))); if (mw != null) missing = mw; }
        if (f.type === 'Type3') { const fm = L(fontDict.get(PDFName.of('FontMatrix'))); if (fm instanceof PDFArray) f.scale = num(L(fm.get(0))) || 0.001; }
        // the 14 standard fonts usually come without /Widths — take their real metrics from pdf-lib
        let std = null;
        if (!arr && PDFLib.StandardFontEmbedder) {
          const nm = f.name.replace(/[,-]/g, ''), low = nm.toLowerCase(), bold = /bold/.test(low), ital = /italic|oblique/.test(low);
          const fam = /times|roman|serif/.test(low) && !/sans/.test(low) ? 'Times' : /courier|mono/.test(low) ? 'Courier' : /helvetica|arial|sans/.test(low) ? 'Helvetica' : null;
          const id = fam === 'Times' ? (bold && ital ? 'Times-BoldItalic' : bold ? 'Times-Bold' : ital ? 'Times-Italic' : 'Times-Roman')
            : fam ? fam + (bold && ital ? '-BoldOblique' : bold ? '-Bold' : ital ? '-Oblique' : '') : null;
          try { if (id) std = PDFLib.StandardFontEmbedder.for(id); } catch (e) { std = null; }
        }
        f.hasCode = (codeStr) => { if (!arr) return true; const c = codeStr.charCodeAt(0); const v = arr[c - fc]; return v != null && v > 0; };
        f.widthOf = (codeStr) => {
          const c = codeStr.charCodeAt(0); const v = arr ? arr[c - fc] : null; if (v != null) return v;
          if (std) { const u = f.toUni.get(codeStr); if (u) { try { return std.widthOfTextAtSize(u, 1000); } catch (e) { /* not encodable */ } } }
          return missing;
        };
        // encoding (for fonts without ToUnicode, and for the reverse map)
        const enc = L(fontDict.get(PDFName.of('Encoding')));
        const base = {}; for (let c = 32; c < 256; c++) base[c] = WINANSI_HI[c] || (c < 127 || c >= 160 ? String.fromCharCode(c) : null);
        if (enc instanceof PDFDict) {
          const diff = L(enc.get(PDFName.of('Differences')));
          if (diff instanceof PDFArray) { let c = 0; diff.asArray().map(L).forEach((x) => { const nv = num(x); if (nv != null) c = nv; else { const u = glyphNameToUni(nameStr(x)); base[c] = u; c++; } }); }
        }
        for (let c = 0; c < 256; c++) if (base[c]) f.toUni.set(String.fromCharCode(c), base[c]);
      }
      if (tuMap) for (const [k, v] of tuMap.map) f.toUni.set(k, v);
      // reverse map (letter → code) only from codes the font really has: its ToUnicode entries when present
      // (encoding-only codes may have no glyph at all), else encoding codes that have a width
      const real = tuMap ? tuMap.map : f.toUni;
      for (const [k, v] of real) {
        if (!v || Array.from(v).length !== 1 || f.fromUni.has(v)) continue;
        if (!tuMap && f.hasCode && !f.hasCode(k)) continue;
        f.fromUni.set(v, k);
      }
      // a few look-alikes so typing a normal space / hyphen still uses the PDF's own glyph
      if (!f.fromUni.has(' ') && f.fromUni.has(' ')) f.fromUni.set(' ', f.fromUni.get(' '));
      if (!f.fromUni.has('-') && f.fromUni.has('‐')) f.fromUni.set('-', f.fromUni.get('‐'));
    } catch (e) { f.ok = false; }
    return f;
  }

  /* ------------------------------------------------------------------ page analysis */
  function pageFonts(doc, page) {
    const fonts = {};
    try {
      const ne = page.node.normalizedEntries();
      const fd = ne.Font || (ne.Resources && ne.Resources.lookup(PDFName.of('Font'), PDFDict));
      if (fd) for (const [k, ref] of fd.entries()) { const d = doc.context.lookup(ref); if (d instanceof PDFDict) fonts[nameStr(k)] = loadFont(doc, d, nameStr(k)); }
    } catch (e) { /* no fonts */ }
    return fonts;
  }
  function pageContent(page) {
    const c = page.node.Contents(); const parts = [];
    const ctx = page.doc.context;
    const add = (o) => { const x = o instanceof PDFRef ? ctx.lookup(o) : o; const b = streamBytes(x); if (b) parts.push(bytesToLatin1(b)); };
    if (!c) return '';
    if (c instanceof PDFArray) c.asArray().forEach(add); else add(c);
    return parts.join('\n');
  }

  // run the interpreter; returns the list of text-show operators with every glyph's position
  function analyze(s, ops, fonts) {
    const runs = [];
    let gs = { ctm: ID.slice(), Tc: 0, Tw: 0, Th: 1, TL: 0, Ts: 0, font: null, Tfs: 0 };
    const stack = []; let Tm = ID.slice(), Tlm = ID.slice();
    const N = (o) => (o && o.t === 'n' ? o.v : 0);
    function show(op, idx, elems) {
      const f = gs.font ? fonts[gs.font] : null;
      const run = { idx, op: op.op, font: gs.font, Tfs: gs.Tfs, Th: gs.Th, Tc: gs.Tc, Tw: gs.Tw, Ts: gs.Ts, glyphs: [], elems: [], ok: !!(f && f.ok && !f.vertical) };
      const bpc = f ? f.bytesPerCode : 1;
      elems.forEach((e, ei) => {
        if (e.t === 'n') { const tx = -e.v / 1000 * gs.Tfs * gs.Th; run.elems.push({ kern: e.v }); Tm = mul([1, 0, 0, 1, tx, 0], Tm); return; }
        if (e.t !== 's') return;
        const str = e.v;
        for (let k = 0; k + bpc <= str.length; k += bpc) {
          const codeStr = str.substr(k, bpc);
          const w0 = f ? f.widthOf(codeStr) * f.scale : 0.5;
          const spaceAdj = (bpc === 1 && codeStr === ' ') ? gs.Tw : 0;
          const adv = (w0 * gs.Tfs + gs.Tc + spaceAdj) * gs.Th;
          const trm = mul([gs.Tfs * gs.Th, 0, 0, gs.Tfs, 0, gs.Ts], mul(Tm, gs.ctm));
          const p = apply(trm, 0, 0);
          const uni = f ? (f.toUni.get(codeStr) || '') : '';
          run.glyphs.push({ code: codeStr, uni, x: p[0], y: p[1], adv, ei: run.elems.length });
          run.elems.push({ g: run.glyphs.length - 1 });
          Tm = mul([1, 0, 0, 1, adv, 0], Tm);
        }
      });
      const m = mul(Tm, gs.ctm); run.endX = m[4]; run.endY = m[5];
      const mm = mul([gs.Tfs * gs.Th, 0, 0, gs.Tfs, 0, 0], mul(Tm, gs.ctm));
      run.uScale = Math.hypot(m[0], m[1]) || 1; run.size = Math.hypot(mm[2], mm[3]); run.dir = [mm[0], mm[1]]; const dl = Math.hypot(mm[0], mm[1]) || 1; run.dir = [mm[0] / dl, mm[1] / dl];
      runs.push(run);
    }
    ops.forEach((op, idx) => {
      const a = op.operands;
      switch (op.op) {
        case 'q': stack.push(Object.assign({}, gs, { ctm: gs.ctm.slice() })); break;
        case 'Q': if (stack.length) gs = stack.pop(); break;
        case 'cm': if (a.length >= 6) gs.ctm = mul(a.slice(0, 6).map(N), gs.ctm); break;
        case 'BT': Tm = ID.slice(); Tlm = ID.slice(); break;
        case 'Td': Tlm = mul([1, 0, 0, 1, N(a[0]), N(a[1])], Tlm); Tm = Tlm.slice(); break;
        case 'TD': gs.TL = -N(a[1]); Tlm = mul([1, 0, 0, 1, N(a[0]), N(a[1])], Tlm); Tm = Tlm.slice(); break;
        case 'Tm': if (a.length >= 6) { Tlm = a.slice(0, 6).map(N); Tm = Tlm.slice(); } break;
        case 'T*': Tlm = mul([1, 0, 0, 1, 0, -gs.TL], Tlm); Tm = Tlm.slice(); break;
        case 'Tc': gs.Tc = N(a[0]); break;
        case 'Tw': gs.Tw = N(a[0]); break;
        case 'Tz': gs.Th = N(a[0]) / 100; break;
        case 'TL': gs.TL = N(a[0]); break;
        case 'Ts': gs.Ts = N(a[0]); break;
        case 'Tf': gs.font = a[0] && a[0].t === 'name' ? a[0].v : null; gs.Tfs = N(a[1]); break;
        case 'Tj': show(op, idx, [a[0] || { t: 's', v: '' }]); break;
        case "'": Tlm = mul([1, 0, 0, 1, 0, -gs.TL], Tlm); Tm = Tlm.slice(); show(op, idx, [a[0] || { t: 's', v: '' }]); break;
        case '"': gs.Tw = N(a[0]); gs.Tc = N(a[1]); Tlm = mul([1, 0, 0, 1, 0, -gs.TL], Tlm); Tm = Tlm.slice(); show(op, idx, [a[2] || { t: 's', v: '' }]); break;
        case 'TJ': show(op, idx, (a[0] && a[0].t === 'a') ? a[0].v : []); break;
      }
    });
    return runs;
  }

  /* ------------------------------------------------------------------ matching a pdf.js text item */
  // item: { x, y (baseline origin, user space), width, size, dir:[dx,dy] (unit), str }
  function findGlyphs(runs, item) {
    const dir = item.dir || [1, 0], nrm = [-dir[1], dir[0]], size = item.size || 10;
    const hits = []; // {run, from, to}
    runs.forEach((run) => {
      let from = -1, to = -1;
      run.glyphs.forEach((g, gi) => {
        const dx = g.x - item.x, dy = g.y - item.y;
        const along = dx * dir[0] + dy * dir[1], perp = dx * nrm[0] + dy * nrm[1];
        const inside = Math.abs(perp) < size * 0.35 && along > -size * 0.3 && along < item.width - Math.min(size * 0.15, Math.abs(g.adv) * 0.5 + 0.01);
        if (inside) { if (from < 0) from = gi; to = gi; }
      });
      // never take a neighbour's edge space (e.g. "Road — " before a bold word) — trim blanks at both ends
      while (from >= 0 && from <= to && !String(run.glyphs[from].uni || 'x').trim()) from++;
      while (to >= from && from >= 0 && !String(run.glyphs[to].uni || 'x').trim()) to--;
      if (from >= 0 && from <= to) hits.push({ run, from, to });
    });
    return hits;
  }
  const norm = (t) => String(t || '').replace(/\s+/g, '');

  /* ------------------------------------------------------------------ writing operators back */
  function pdfStr(bytes) { let h = ''; for (let k = 0; k < bytes.length; k++) h += bytes.charCodeAt(k).toString(16).padStart(2, '0'); return '<' + h + '>'; }
  const fmt = (v) => { const r = Math.round(v * 1000) / 1000; return (Object.is(r, -0) ? 0 : r).toString(); };
  // advance (text space, before the text matrix) of glyphs [from..to] including any kerning between them
  function rangeAdvance(run, from, to) {
    const pf = run.glyphs[from].ei, pt = run.glyphs[to].ei; let adv = 0;
    for (let i = pf; i <= pt; i++) { const e = run.elems[i]; adv += e.g != null ? run.glyphs[e.g].adv : -e.kern / 1000 * run.Tfs * run.Th; }
    return adv;
  }
  // rebuild one text-show operator as a TJ array: glyphs [from..to] are replaced by `insert` (code bytes)
  // with `before` / `after` gaps (TJ units: thousandths of the font size, positive = move left)
  function rebuildOp(op, run, from, to, insert, before, after) {
    const pf = run.glyphs[from].ei, pt = run.glyphs[to].ei, parts = []; let cur = '';
    const flush = () => { if (cur) { parts.push(pdfStr(cur)); cur = ''; } };
    run.elems.forEach((e, i) => {
      if (i > pf && i <= pt) return;
      if (i === pf) { flush(); if (before) parts.push(fmt(before)); cur += insert || ''; flush(); if (after) parts.push(fmt(after)); return; }
      if (e.g != null) cur += run.glyphs[e.g].code; else { flush(); parts.push(fmt(e.kern)); }
    });
    flush();
    let prefix = '';
    if (op.op === "'") prefix = 'T* ';
    if (op.op === '"') prefix = fmt(op.operands[0].v) + ' Tw ' + fmt(op.operands[1].v) + ' Tc T* ';
    return prefix + '[' + parts.join(' ') + '] TJ';
  }

  /* ------------------------------------------------------------------ public: replace the text of one item */
  // opts: { align: 'left'|'right'|'center', allowSameFont: true }
  // returns { ok, mode: 'same-font' | 'removed', font, fontName, size, x, y, dir, oldText, oldWidth }
  function replaceText(doc, pageIndex, item, newText, opts) {
    opts = opts || {};
    const page = doc.getPage(pageIndex);
    const s = pageContent(page);
    const ops = parseContent(s), fonts = pageFonts(doc, page);
    const runs = analyze(s, ops, fonts);
    const hits = findGlyphs(runs, item).filter((h) => h.run.ok);
    if (!hits.length) return { ok: false, reason: 'not-found' };
    // reading order along the line; the FIRST piece carries the new text (so it starts where the old text started)
    const dir = item.dir || [1, 0], along = (g) => (g.x - item.x) * dir[0] + (g.y - item.y) * dir[1];
    hits.sort((a, b) => along(a.run.glyphs[a.from]) - along(b.run.glyphs[b.from]));
    // pdf.js and the PDF's own widths can disagree a little (complex scripts, odd fonts): if fewer letters were
    // found than pdf.js shows, extend the last piece over glyphs that directly follow it (no gap) until they match
    {
      const want = norm(item.str).length, have = () => norm(hits.map((h) => h.run.glyphs.slice(h.from, h.to + 1).map((g) => g.uni).join('')).join('')).length;
      const h = hits[hits.length - 1], gl = h.run.glyphs, sz = item.size || 10;
      while (want && have() < want && h.to + 1 < gl.length) {
        const cur = gl[h.to], nx = gl[h.to + 1];
        const gap = Math.hypot(nx.x - cur.x, nx.y - cur.y) - Math.abs(cur.adv) * h.run.uScale;
        if (Math.abs(gap) > sz * 0.6 || !nx.uni) break;
        h.to++;
      }
    }
    let oldText = hits.map((h) => h.run.glyphs.slice(h.from, h.to + 1).map((g) => g.uni).join('')).join('');
    // sanity: the glyphs we found should be the text pdf.js showed (ignoring spaces); if the font has no
    // usable ToUnicode we cannot check — positions alone are then trusted
    const known = hits.every((h) => h.run.glyphs.slice(h.from, h.to + 1).every((g) => g.uni));
    if (known && item.str && norm(oldText) && norm(item.str) && norm(oldText) !== norm(item.str) && !norm(item.str).includes(norm(oldText)) && !norm(oldText).includes(norm(item.str))) return { ok: false, reason: 'mismatch', oldText };
    const first = hits[0], run = first.run, font = fonts[run.font];
    const lastH = hits[hits.length - 1], lastG = lastH.run.glyphs[lastH.to];
    const oldWUser = along(lastG) + lastG.adv * lastH.run.uScale - along(run.glyphs[first.from]);
    const oldW = oldWUser / run.uScale; // whole old text, in the host run's text space
    // can the PDF's own font write the new text?
    let codes = '', newAdv = 0, same = opts.allowSameFont !== false && !!font && font.ok;
    if (same) for (const ch of Array.from(newText)) {
      const c = font.fromUni.get(ch);
      if (c == null) { same = false; break; }
      codes += c;
      const w0 = font.widthOf(c) * font.scale;
      newAdv += (w0 * run.Tfs + run.Tc + ((font.bytesPerCode === 1 && c === ' ') ? run.Tw : 0)) * run.Th;
    }
    const k = run.Tfs * run.Th; if (!k) return { ok: false, reason: 'zero-size' };
    const toTJ = (adv) => -adv * 1000 / k;
    const edits = [];
    const firstOldAdv = rangeAdvance(run, first.from, first.to);
    if (same) {
      const diff = oldW - newAdv; // >0 → new text is shorter
      const align = opts.align || 'left';
      const before = align === 'right' ? toTJ(diff) : align === 'center' ? toTJ(diff / 2) : 0;
      // the first run carries the new text; its replaced range must keep the SAME total width so nothing after it moves
      const after = toTJ(firstOldAdv - newAdv) - before;
      edits.push({ op: ops[run.idx], text: rebuildOp(ops[run.idx], run, first.from, first.to, codes, before, after) });
    } else {
      edits.push({ op: ops[run.idx], text: rebuildOp(ops[run.idx], run, first.from, first.to, '', 0, toTJ(firstOldAdv)) });
    }
    hits.filter((h) => h !== first).forEach((h) => { const r = h.run; const kk = r.Tfs * r.Th || 1; edits.push({ op: ops[r.idx], text: rebuildOp(ops[r.idx], r, h.from, h.to, '', 0, -rangeAdvance(r, h.from, h.to) * 1000 / kk) }); });
    // splice (back to front so offsets stay valid)
    edits.sort((a, b) => b.op.start - a.op.start);
    let out = s; const seen = new Set();
    for (const e of edits) { if (seen.has(e.op.start)) continue; seen.add(e.op.start); out = out.slice(0, e.op.start) + e.text + out.slice(e.op.end); }
    // balance q/Q so anything drawn later on this page starts from the default coordinate system
    out = 'q\n' + out + '\nQ\n';
    const stream = doc.context.flateStream(latin1ToBytes(out));
    page.node.set(PDFName.of('Contents'), doc.context.obj([doc.context.register(stream)])); // an array, so pdf-lib can append its own drawing later
    const g0 = run.glyphs[first.from];
    return { ok: true, mode: same ? 'same-font' : 'removed', fontName: font ? font.name : '', size: run.size || item.size, x: g0.x, y: g0.y, dir: run.dir, oldText, oldWidth: oldW * run.uScale, newWidth: same ? newAdv * run.uScale : null };
  }

  // the text items of a page as this engine sees them (used by tests and for checking coverage)
  function pageRuns(doc, pageIndex) {
    const page = doc.getPage(pageIndex), s = pageContent(page), ops = parseContent(s), fonts = pageFonts(doc, page);
    return analyze(s, ops, fonts).map((r) => ({ font: r.font, fontName: fonts[r.font] ? fonts[r.font].name : '', size: r.size, text: r.glyphs.map((g) => g.uni).join(''), x: r.glyphs[0] ? r.glyphs[0].x : r.endX, y: r.glyphs[0] ? r.glyphs[0].y : r.endY, ok: r.ok }));
  }
  function canWrite(doc, pageIndex, fontKey, text) { const f = pageFonts(doc, doc.getPage(pageIndex))[fontKey]; return !!f && Array.from(text).every((c) => f.fromUni.has(c)); }

  return { replaceText, pageRuns, canWrite, _parseContent: parseContent, _parseToUnicode: parseToUnicode };
});
