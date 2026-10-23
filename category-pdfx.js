/* category-pdfx.js — more free PDF tools (lazy-loaded, UPDATE_67). Everything runs in the browser; nothing is uploaded.
 *   pdfaltmix      — Merge two-sided scans: fronts + backs (Alternate & Mix), backs can be reversed
 *   pdfsplithalf   — Split every page into two halves (A3 → two A4, book scans with two pages per sheet)
 *   pdfresize      — Resize all pages to A4 / Letter / Legal / A5 (fit, keep text sharp)
 *   pdfbates       — Bates / document numbering with prefix, digits and start number, across many PDFs
 *   pdfletterhead  — Put your letterhead (PDF or image) behind or over every page
 *   pdfremoveblank — Find and remove blank pages (scans), with a preview you can correct
 *   pdfautoredact  — Find and black out Aadhaar, PAN, phone numbers, e-mails or your own words
 *   pdf2md         — PDF → Markdown / HTML (headings, lists, paragraphs)
 *   md2pdf         — Markdown / text → PDF (Tamil works), live preview
 *   pdflongimg     — All pages as ONE long image (easy to send on WhatsApp)
 * Host globals: TOOL_IMPL, el, mountUploader, mountFileList, mountResult, mountProgress, downloadBlob, escapeHtml,
 * readFileAsArrayBuffer, loadPdfJs, PDFDocument, StandardFonts, rgb, degrees, embedUnicodeFont, JSZip.
 * Pure helpers on window.PdfxCore for tests.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ pure helpers */
  // order for two-sided scans. fronts = number of front pages, backs = number of back pages
  function altOrder(fronts, backs, reverseBacks) {
    const out = [], n = Math.max(fronts, backs);
    for (let i = 0; i < n; i++) {
      if (i < fronts) out.push(['A', i]);
      if (i < backs) out.push(['B', reverseBacks ? backs - 1 - i : i]);
    }
    return out;
  }
  function batesLabel(prefix, n, digits, suffix) { return (prefix || '') + String(n).padStart(Math.max(1, digits | 0), '0') + (suffix || ''); }
  // Aadhaar: 12 digits (first digit 2-9), optionally in 4-4-4 groups. PAN: AAAAA9999A. Indian mobile: optional +91/0, 10 digits starting 6-9.
  const PATTERNS = {
    aadhaar: /(?<![\d])[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}(?![\d])/g,
    pan: /(?<![A-Z0-9])[A-Z]{3}[ABCFGHLJPTK][A-Z]\d{4}[A-Z](?![A-Z0-9])/g,
    phone: /(?<![\d])(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\d])/g,
    email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    ifsc: /(?<![A-Z0-9])[A-Z]{4}0[A-Z0-9]{6}(?![A-Z0-9])/g
  };
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Verhoeff check for Aadhaar numbers (rejects most random 12-digit numbers such as bank account numbers)
  const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  function verhoeffOk(num) { let c = 0; const d = String(num).replace(/\D/g, '').split('').reverse(); for (let i = 0; i < d.length; i++) c = VD[c][VP[i % 8][+d[i]]]; return c === 0; }
  // matches inside a string → [{start,end,kind,text}]. opts: {aadhaar,pan,phone,email,ifsc,words:[...], strictAadhaar}
  function findMatches(str, opts) {
    const out = [];
    Object.keys(PATTERNS).forEach(function (k) {
      if (!opts[k]) return;
      const re = new RegExp(PATTERNS[k].source, 'g'); let m;
      while ((m = re.exec(str))) {
        if (k === 'aadhaar' && opts.strictAadhaar !== false && !verhoeffOk(m[0])) continue;
        out.push({ start: m.index, end: m.index + m[0].length, kind: k, text: m[0] });
      }
    });
    (opts.words || []).filter(Boolean).forEach(function (w) {
      const re = new RegExp(escRe(w.trim()), 'gi'); let m;
      if (!w.trim()) return;
      while ((m = re.exec(str))) out.push({ start: m.index, end: m.index + m[0].length, kind: 'word', text: m[0] });
    });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }
  // for an Aadhaar match, "mask first 8" keeps the last 4 digits visible (UIDAI masked-Aadhaar style)
  function maskRange(m, keepLast4) {
    if (m.kind !== 'aadhaar' || !keepLast4) return [m.start, m.end];
    let digits = 0, i = m.end;
    while (i > m.start && digits < 4) { i--; if (/\d/.test(m.text[i - m.start])) digits++; }
    return [m.start, i];
  }
  // tiny Markdown → HTML (headings, bold/italic/code, links, lists, quotes, tables, rules, code blocks)
  function md2html(md) {
    const esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    const inline = function (s) {
      s = esc(s);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
      s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_]*)_/g, '$1<i>$2</i>');
      s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
      s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
      return s;
    };
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    const out = []; let i = 0;
    while (i < lines.length) {
      const L = lines[i];
      if (/^```/.test(L)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(esc(lines[i++])); i++; out.push('<pre><code>' + buf.join('\n') + '</code></pre>'); continue; }
      let m;
      if ((m = /^(#{1,6})\s+(.*)$/.exec(L))) { out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(L)) { out.push('<hr>'); i++; continue; }
      if (/^\s*>/.test(L)) { const buf = []; while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(inline(lines[i++].replace(/^\s*>\s?/, ''))); out.push('<blockquote>' + buf.join('<br>') + '</blockquote>'); continue; }
      if (/\|/.test(L) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const cells = function (r) { return r.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return inline(c.trim()); }); };
        const head = cells(L); i += 2; const rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) rows.push(cells(lines[i++]));
        out.push('<table><thead><tr>' + head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(L)) {
        const ordered = /^\s*\d/.test(L), buf = [];
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          let t = lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, ''), box = '';
          if (/^\[( |x|X)\]\s/.test(t)) { box = /^\[ \]/.test(t) ? '☐ ' : '☑ '; t = t.slice(4); }
          buf.push('<li>' + box + inline(t) + '</li>');
        }
        out.push((ordered ? '<ol>' : '<ul>') + buf.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      if (!L.trim()) { i++; continue; }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s+)/.test(lines[i])) buf.push(inline(lines[i++]));
      out.push('<p>' + buf.join('<br>') + '</p>');
    }
    return out.join('\n');
  }
  // pdf.js text items of one page → structured blocks [{type:'h1'|'h2'|'h3'|'li'|'p', text}]
  function itemsToBlocks(items, pageH) {
    const runs = items.filter(function (it) { return it.str && it.str.trim(); }).map(function (it) {
      const t = it.transform, size = Math.hypot(t[2], t[3]) || 10;
      return { x: t[4], y: t[5], size: size, w: it.width || it.str.length * size * 0.5, str: it.str, bold: /bold|black|heavy/i.test(it.fontName || '') };
    });
    if (!runs.length) return [];
    runs.sort(function (a, b) { return Math.abs(b.y - a.y) > Math.min(a.size, b.size) * 0.4 ? b.y - a.y : a.x - b.x; });
    const lines = [];
    runs.forEach(function (r) {
      const L = lines[lines.length - 1];
      if (L && Math.abs(L.y - r.y) <= Math.min(L.size, r.size) * 0.4) {
        const gap = r.x - (L.x1);
        L.text += (gap > r.size * 0.15 && !/\s$/.test(L.text) && !/^\s/.test(r.str) ? ' ' : '') + r.str;
        L.x1 = r.x + r.w; L.size = Math.max(L.size, r.size); L.bold = L.bold && r.bold;
      } else lines.push({ y: r.y, x: r.x, x1: r.x + r.w, size: r.size, text: r.str, bold: r.bold });
    });
    const sizes = lines.map(function (l) { return l.size; }).sort(function (a, b) { return a - b; });
    const body = sizes[Math.floor(sizes.length / 2)] || 10, maxW = Math.max.apply(null, lines.map(function (l) { return l.x1 - l.x; }));
    const blocks = []; let prev = null;
    lines.forEach(function (l) {
      const text = l.text.replace(/\s+/g, ' ').trim(); if (!text) return;
      let type = 'p';
      if (l.size >= body * 1.6) type = 'h1'; else if (l.size >= body * 1.3) type = 'h2'; else if (l.size >= body * 1.12 || (l.bold && text.length < 80 && !/[.:;,]$/.test(text))) type = 'h3';
      let t = text;
      if (/^([•●▪◦‣\-–*]|\d+[.)])\s+/.test(text)) { type = 'li'; t = text.replace(/^([•●▪◦‣\-–*])\s+/, ''); }
      const gap = prev ? prev.y - l.y : 0;
      // a wrapped paragraph line runs (almost) to the right margin; short lines (forms, addresses) stay separate
      const cont = prev && type === 'p' && prev.type === 'p' && gap < l.size * 1.9 && Math.abs(prev.size - l.size) < 0.6 && prev.w > maxW * 0.72 && !/[:]$/.test(prev.text) && !/^[^\s:]{1,20}( [^\s:]{1,20})?:\s/.test(t);
      if (cont) { const b = blocks[blocks.length - 1]; b.text = /-$/.test(b.text) ? b.text.slice(0, -1) + t : b.text + ' ' + t; }
      else blocks.push({ type: type, text: t });
      prev = { y: l.y, size: l.size, type: type, w: l.x1 - l.x, text: text };
    });
    return blocks;
  }
  function blocksToMarkdown(pages) {
    return pages.map(function (blocks) {
      return blocks.map(function (b) {
        if (b.type === 'h1') return '# ' + b.text; if (b.type === 'h2') return '## ' + b.text; if (b.type === 'h3') return '### ' + b.text;
        if (b.type === 'li') return (/^\d+[.)]\s/.test(b.text) ? '' : '- ') + b.text;
        return b.text;
      }).join('\n\n').replace(/\n\n(- |\d+[.)] )/g, '\n$1');
    }).join('\n\n---\n\n') + '\n';
  }
  window.PdfxCore = { altOrder: altOrder, batesLabel: batesLabel, findMatches: findMatches, maskRange: maskRange, verhoeffOk: verhoeffOk, md2html: md2html, itemsToBlocks: itemsToBlocks, blocksToMarkdown: blocksToMarkdown };
  if (typeof TOOL_IMPL === 'undefined') return; // loaded by a test

  /* ------------------------------------------------------------------ shared UI bits */
  const base = function (f) { return (f && f.name || 'document').replace(/\.[^.]+$/, ''); };
  const fail = function (body, e) { const b = mountResult(body, 'Error: ' + escapeHtml(String(e && e.message || e))); b.style.background = '#FDEDEC'; };
  const savePdf = async function (doc, name) { const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), name); return bytes.length; };
  const kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  function pdfUploader(body, label, onFile, multiple) {
    mountUploader(body, { accept: 'application/pdf', multiple: !!multiple, label: label || 'PDF கோப்பைத் தேர்ந்தெடுக்கவும் · Choose a PDF', sublabel: '',
      onAdd: async function (fl) { for (const f of fl) f._buf = await readFileAsArrayBuffer(f); onFile(fl); } });
  }
  function btnRow(body, label, fn) { const row = el('<div class="btn-row"></div>'); const b = el('<button class="btn">' + label + '</button>'); b.onclick = fn; row.appendChild(b); body.appendChild(row); return b; }
  async function renderThumb(pdf, n, maxW) {
    const p = await pdf.getPage(n), vp1 = p.getViewport({ scale: 1 }), s = Math.min(2, (maxW || 160) / vp1.width), vp = p.getViewport({ scale: s });
    const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: g, viewport: vp }).promise; return c;
  }
  const SIZES = { A4: [595.28, 841.89], A5: [419.53, 595.28], A3: [841.89, 1190.55], Letter: [612, 792], Legal: [612, 1008] };

  /* ================================================================== ALTERNATE & MIX (two-sided scans) */
  TOOL_IMPL.pdfaltmix = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let A = null, B = null, mode = 'two';
      function paint() {
        body.innerHTML = '';
        body.appendChild(el(`<div class="note" style="line-height:1.7">🖨️ A scanner that scans only one side: scan all <b>front sides</b> first, turn the pile over and scan all <b>back sides</b>. This tool puts the pages back in the right order: 1, 2, 3, 4…</div>`));
        const m = el(`<div class="opts one"><div class="field"><label>My scans are in</label><select id="amMode"><option value="two">Two files — fronts PDF and backs PDF</option><option value="one">One file — all fronts, then all backs</option></select></div></div>`);
        m.querySelector('select').value = mode; m.querySelector('select').onchange = function (e) { mode = e.target.value; A = B = null; paint(); };
        body.appendChild(m);
        if (!A) { pdfUploader(body, mode === 'two' ? '① Front pages PDF · முன்பக்கங்கள்' : 'PDF with fronts then backs', function (fl) { A = fl[0]; paint(); }); return; }
        mountFileList(body, [A], function () { A = null; paint(); });
        if (mode === 'two' && !B) { pdfUploader(body, '② Back pages PDF · பின்பக்கங்கள்', function (fl) { B = fl[0]; paint(); }); return; }
        if (B) mountFileList(body, [B], function () { B = null; paint(); });
        body.appendChild(el(`<div class="opts one"><div class="field-inline"><input type="checkbox" id="amRev" checked><label for="amRev">Back pages were scanned last-to-first (the pile was turned over) — reverse them</label></div></div>`));
        btnRow(body, '🔀 Mix pages & Download', run);
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          prog.set(10, 'Reading…');
          const rev = body.querySelector('#amRev').checked;
          const a = await PDFDocument.load(A._buf, { ignoreEncryption: true });
          let b = mode === 'two' ? await PDFDocument.load(B._buf, { ignoreEncryption: true }) : a;
          let fronts, backs, aOff = 0, bOff = 0;
          if (mode === 'two') { fronts = a.getPageCount(); backs = b.getPageCount(); }
          else { const n = a.getPageCount(); fronts = Math.ceil(n / 2); backs = n - fronts; bOff = fronts; }
          if (mode === 'two' && Math.abs(fronts - backs) > 1) throw new Error('The two files have very different page counts (' + fronts + ' and ' + backs + '). Please check you chose the right files.');
          const out = await PDFDocument.create();
          const order = altOrder(fronts, backs, rev);
          const pa = await out.copyPages(a, order.filter(function (o) { return o[0] === 'A'; }).map(function (o) { return aOff + o[1]; }));
          const pb = await out.copyPages(b, order.filter(function (o) { return o[0] === 'B'; }).map(function (o) { return bOff + o[1]; }));
          let ia = 0, ib = 0;
          order.forEach(function (o) { out.addPage(o[0] === 'A' ? pa[ia++] : pb[ib++]); });
          prog.set(90, 'Saving…');
          const n = await savePdf(out, base(A) + '-mixed.pdf');
          prog.remove(); mountResult(body, `Done — ${order.length} pages in order (${kb(n)}).`);
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== SPLIT PAGES IN HALF */
  TOOL_IMPL.pdfsplithalf = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null, thumb = null;
      function paint() {
        body.innerHTML = '';
        if (!file) { pdfUploader(body, null, async function (fl) { file = fl[0]; try { const pdf = await loadPdfJs(file._buf); thumb = await renderThumb(pdf, 1, 260); } catch (e) { thumb = null; } paint(); }); return; }
        mountFileList(body, [file], function () { file = null; paint(); });
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Cut each page</label><select id="shDir"><option value="v">Down the middle (left | right) — book / A3 scans</option><option value="h">Across the middle (top / bottom)</option></select></div>
          <div class="field"><label>Reading order</label><select id="shOrder"><option value="ltr">Left (or top) half first</option><option value="rtl">Right half first (some Urdu/Arabic books)</option></select></div>
          <div class="field"><label>Do not cut these pages (e.g. 1 or 1,last)</label><input id="shSkip" placeholder="e.g. 1, last"></div>
        </div>`));
        if (thumb) {
          const wrap = el('<div style="position:relative; width:max-content; max-width:100%; margin:6px auto; border:1px solid var(--line); border-radius:8px; overflow:hidden;"></div>');
          thumb.style.cssText = 'display:block; max-width:100%;'; wrap.appendChild(thumb);
          const line = el('<div style="position:absolute; background:#E53935;"></div>'); wrap.appendChild(line);
          const setLine = function () { const v = body.querySelector('#shDir').value === 'v'; line.style.cssText = 'position:absolute; background:#E53935; ' + (v ? 'left:50%; top:0; bottom:0; width:2px;' : 'top:50%; left:0; right:0; height:2px;'); };
          body.appendChild(wrap); setLine(); body.querySelector('#shDir').onchange = setLine;
        }
        btnRow(body, '✂️ Split pages & Download', run);
      }
      function skipSet(txt, n) {
        const s = new Set();
        String(txt || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean).forEach(function (x) {
          if (x === 'last') s.add(n); else { const m = /^(\d+)\s*-\s*(\d+)$/.exec(x); if (m) { for (let i = +m[1]; i <= +m[2]; i++) s.add(i); } else if (/^\d+$/.test(x)) s.add(+x); }
        });
        return s;
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const dir = body.querySelector('#shDir').value, rtl = body.querySelector('#shOrder').value === 'rtl';
          const src = await PDFDocument.load(file._buf, { ignoreEncryption: true });
          const n = src.getPageCount(), skip = skipSet(body.querySelector('#shSkip').value, n);
          const out = await PDFDocument.create();
          for (let i = 0; i < n; i++) {
            prog.set(5 + i / n * 85, 'Page ' + (i + 1) + ' / ' + n);
            if (skip.has(i + 1)) { const [p] = await out.copyPages(src, [i]); out.addPage(p); continue; }
            const [p1, p2] = await out.copyPages(src, [i, i]);
            const box = p1.getCropBox ? p1.getCropBox() : p1.getMediaBox();
            const rot = ((p1.getRotation().angle % 360) + 360) % 360;
            // a page shown rotated 90/270 is cut along the other axis of the stored page; halves = [left,right] or [top,bottom]
            const vert = (dir === 'v') !== (rot === 90 || rot === 270);
            const halves = vert
              ? [[box.x, box.y, box.width / 2, box.height], [box.x + box.width / 2, box.y, box.width / 2, box.height]]
              : [[box.x, box.y + box.height / 2, box.width, box.height / 2], [box.x, box.y, box.width, box.height / 2]];
            // which stored half the reader sees first (left / top on screen), per rotation and cut direction
            const FIRST = { 0: { v: 0, h: 0 }, 90: { v: 1, h: 0 }, 180: { v: 1, h: 1 }, 270: { v: 0, h: 1 } };
            let first = (FIRST[rot] || FIRST[0])[dir];
            if (rtl) first = 1 - first;
            const pages = [p1, p2], order = [first, 1 - first];
            order.forEach(function (h, k) { const pg = pages[k], r = halves[h]; pg.setMediaBox(r[0], r[1], r[2], r[3]); pg.setCropBox(r[0], r[1], r[2], r[3]); try { pg.setTrimBox(r[0], r[1], r[2], r[3]); pg.setBleedBox(r[0], r[1], r[2], r[3]); } catch (e) {} out.addPage(pg); });
          }
          const bytes = await savePdf(out, base(file) + '-split-half.pdf');
          prog.remove(); mountResult(body, `Done — ${out.getPageCount()} pages (${kb(bytes)}).`);
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== RESIZE PAGES (A4 / Letter …) */
  TOOL_IMPL.pdfresize = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null;
      function paint() {
        body.innerHTML = '';
        if (!file) { pdfUploader(body, null, function (fl) { file = fl[0]; paint(); }); return; }
        mountFileList(body, [file], function () { file = null; paint(); });
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>New page size</label><select id="rzSize"><option>A4</option><option>A5</option><option>A3</option><option>Letter</option><option>Legal</option></select></div>
          <div class="field"><label>Orientation</label><select id="rzOri"><option value="auto">Same as each page</option><option value="p">Portrait</option><option value="l">Landscape</option></select></div>
          <div class="field"><label>Margin (mm)</label><input id="rzMargin" type="number" min="0" max="40" value="0"></div>
          <div class="field"><label>Fit</label><select id="rzFit"><option value="fit">Fit whole page (no cut)</option><option value="fill">Fill the sheet (edges may be cut)</option></select></div>
        </div>`));
        body.appendChild(el('<div class="note">Text and drawings stay sharp (vector) — the page is scaled, not turned into a picture. Use this when a portal asks for "A4 size PDF".</div>'));
        btnRow(body, '📏 Resize & Download', run);
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const sz = SIZES[body.querySelector('#rzSize').value], ori = body.querySelector('#rzOri').value, fit = body.querySelector('#rzFit').value;
          const margin = Math.max(0, +body.querySelector('#rzMargin').value || 0) * 72 / 25.4;
          const src = await PDFDocument.load(file._buf, { ignoreEncryption: true });
          const out = await PDFDocument.create();
          const pages = src.getPages();
          for (let i = 0; i < pages.length; i++) {
            prog.set(5 + i / pages.length * 85, 'Page ' + (i + 1) + ' / ' + pages.length);
            const sp = pages[i], rot = ((sp.getRotation().angle % 360) + 360) % 360, box = sp.getCropBox();
            const emb = await out.embedPage(sp, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height });
            const sw = (rot === 90 || rot === 270) ? box.height : box.width, sh = (rot === 90 || rot === 270) ? box.width : box.height;
            const land = ori === 'l' || (ori === 'auto' && sw > sh);
            const W = land ? sz[1] : sz[0], H = land ? sz[0] : sz[1];
            const pg = out.addPage([W, H]);
            const aw = W - 2 * margin, ah = H - 2 * margin;
            const k = fit === 'fill' ? Math.max(aw / sw, ah / sh) : Math.min(aw / sw, ah / sh);
            const dw = sw * k, dh = sh * k, x = (W - dw) / 2, y = (H - dh) / 2;
            // draw the stored page rotated so it appears the way the viewer showed it
            const ew = box.width * k, eh = box.height * k;
            if (rot === 0) pg.drawPage(emb, { x: x, y: y, width: ew, height: eh });
            else if (rot === 90) pg.drawPage(emb, { x: x, y: y + dh, width: ew, height: eh, rotate: degrees(-90) });
            else if (rot === 180) pg.drawPage(emb, { x: x + dw, y: y + dh, width: ew, height: eh, rotate: degrees(180) });
            else pg.drawPage(emb, { x: x + dw, y: y, width: ew, height: eh, rotate: degrees(90) });
          }
          const bytes = await savePdf(out, base(file) + '-' + body.querySelector('#rzSize').value + '.pdf');
          prog.remove(); mountResult(body, `Done — ${pages.length} pages resized (${kb(bytes)}).`);
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== BATES NUMBERING */
  TOOL_IMPL.pdfbates = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let files = [];
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note">⚖️ Bates numbering puts a running number like <b>CASE-000001</b> on every page — used for court documents, audits, file notings. With many PDFs the numbers continue from one file to the next.</div>'));
        pdfUploader(body, 'PDF கோப்புகள் · Choose one or more PDFs', function (fl) { files = files.concat(fl); paint(); }, true);
        if (!files.length) return;
        mountFileList(body, files, function (i) { files.splice(typeof i === 'number' ? i : files.indexOf(i), 1); paint(); }, function (i, d) { const j = i + d; if (j < 0 || j >= files.length) return; const f = files.splice(i, 1)[0]; files.splice(j, 0, f); paint(); });
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Prefix</label><input id="btPre" value="DOC-"></div>
          <div class="field"><label>Suffix (optional)</label><input id="btSuf" value=""></div>
          <div class="field"><label>Start number</label><input id="btStart" type="number" min="0" value="1"></div>
          <div class="field"><label>Digits</label><input id="btDig" type="number" min="1" max="12" value="6"></div>
          <div class="field"><label>Position</label><select id="btPos"><option value="br">Bottom right</option><option value="bc">Bottom centre</option><option value="bl">Bottom left</option><option value="tr">Top right</option><option value="tc">Top centre</option><option value="tl">Top left</option></select></div>
          <div class="field"><label>Text size</label><input id="btSize" type="number" min="6" max="30" value="10"></div>
          <div class="field-inline"><input type="checkbox" id="btBox" checked><label for="btBox">White box behind the number (readable on any page)</label></div>
        </div>`));
        const pv = el('<div class="note" id="btPrev"></div>'); body.appendChild(pv);
        const upd = function () { const p = body.querySelector('#btPre').value, s = body.querySelector('#btSuf').value, st = +body.querySelector('#btStart').value || 0, d = +body.querySelector('#btDig').value || 6; pv.innerHTML = 'First page: <b>' + escapeHtml(batesLabel(p, st, d, s)) + '</b>'; };
        body.querySelectorAll('#btPre,#btSuf,#btStart,#btDig').forEach(function (x) { x.oninput = upd; }); upd();
        btnRow(body, '🔢 Number pages & Download', run);
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const pre = body.querySelector('#btPre').value, suf = body.querySelector('#btSuf').value, dig = +body.querySelector('#btDig').value || 6;
          let n = +body.querySelector('#btStart').value || 0; const pos = body.querySelector('#btPos').value, size = +body.querySelector('#btSize').value || 10, boxOn = body.querySelector('#btBox').checked;
          const outs = [], ranges = [];
          for (let fi = 0; fi < files.length; fi++) {
            const doc = await PDFDocument.load(files[fi]._buf, { ignoreEncryption: true });
            let font; const plain = /^[\x20-\x7E]*$/.test(pre + suf);
            font = plain ? await doc.embedFont(StandardFonts.HelveticaBold) : await embedUnicodeFont(doc);
            const first = n;
            doc.getPages().forEach(function (pg, i) {
              prog.set(5 + (fi + i / doc.getPageCount()) / files.length * 85, 'File ' + (fi + 1) + ' page ' + (i + 1));
              const label = batesLabel(pre, n++, dig, suf), w = font.widthOfTextAtSize(label, size), cb = pg.getCropBox(), m = 18;
              const rot = ((pg.getRotation().angle % 360) + 360) % 360;
              // work in the page as the viewer shows it, then map back for rotated pages
              const VW = (rot % 180) ? cb.height : cb.width, VH = (rot % 180) ? cb.width : cb.height;
              let vx = pos[1] === 'l' ? m : pos[1] === 'c' ? (VW - w) / 2 : VW - w - m, vy = pos[0] === 'b' ? m : VH - m - size;
              const map = function (x, y) { if (rot === 90) return [cb.x + cb.width - y, cb.y + x]; if (rot === 180) return [cb.x + cb.width - x, cb.y + cb.height - y]; if (rot === 270) return [cb.x + y, cb.y + cb.height - x]; return [cb.x + x, cb.y + y]; };
              const p0 = map(vx, vy), ang = degrees(rot);
              if (boxOn) { const b0 = map(vx - 3, vy - 3); pg.drawRectangle({ x: b0[0], y: b0[1], width: w + 6, height: size + 6, color: rgb(1, 1, 1), rotate: ang }); }
              pg.drawText(label, { x: p0[0], y: p0[1] + size * 0.18, size: size, font: font, color: rgb(0, 0, 0), rotate: ang });
            });
            ranges.push(files[fi].name + ': ' + batesLabel(pre, first, dig, suf) + ' – ' + batesLabel(pre, n - 1, dig, suf));
            outs.push({ name: base(files[fi]) + '-bates.pdf', bytes: await doc.save() });
          }
          if (outs.length === 1) downloadBlob(new Blob([outs[0].bytes], { type: 'application/pdf' }), outs[0].name);
          else { const z = new JSZip(); outs.forEach(function (o) { z.file(o.name, o.bytes); }); downloadBlob(await z.generateAsync({ type: 'blob' }), 'bates-numbered.zip'); }
          prog.remove(); mountResult(body, 'Done.<br>' + ranges.map(escapeHtml).join('<br>'));
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== LETTERHEAD */
  TOOL_IMPL.pdfletterhead = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let doc = null, head = null;
      function paint() {
        body.innerHTML = '';
        if (!doc) { pdfUploader(body, '① Your document (PDF) · ஆவணம்', function (fl) { doc = fl[0]; paint(); }); return; }
        mountFileList(body, [doc], function () { doc = null; paint(); });
        if (!head) {
          mountUploader(body, { accept: 'application/pdf,image/png,image/jpeg', label: '② Letterhead — a PDF page or a PNG/JPG image · லெட்டர்ஹெட்', sublabel: 'Tip: a PNG with a transparent middle works best "over" the page',
            onAdd: async function (fl) { head = fl[0]; head._buf = await readFileAsArrayBuffer(head); paint(); } });
          return;
        }
        mountFileList(body, [head], function () { head = null; paint(); });
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Put the letterhead</label><select id="lhMode"><option value="under">Behind the page (for typed/Word PDFs)</option><option value="over">On top of the page (for scans with white background)</option></select></div>
          <div class="field"><label>On which pages</label><select id="lhPages"><option value="all">Every page</option><option value="first">First page only</option><option value="rest">All except the first</option></select></div>
          <div class="field"><label>Letterhead size</label><select id="lhFit"><option value="full">Stretch to the full page</option><option value="width">Full width, keep shape (top)</option></select></div>
        </div>`));
        btnRow(body, '📨 Add letterhead & Download', run);
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const mode = body.querySelector('#lhMode').value, which = body.querySelector('#lhPages').value, fit = body.querySelector('#lhFit').value;
          const src = await PDFDocument.load(doc._buf, { ignoreEncryption: true });
          const out = await PDFDocument.create();
          let lh, lw, lhh;
          if (/pdf/i.test(head.type) || /\.pdf$/i.test(head.name)) { const hd = await PDFDocument.load(head._buf, { ignoreEncryption: true }); lh = await out.embedPage(hd.getPage(0)); }
          else lh = /png/i.test(head.type) || /\.png$/i.test(head.name) ? await out.embedPng(head._buf) : await out.embedJpg(head._buf);
          lw = lh.width; lhh = lh.height;
          const pages = src.getPages();
          for (let i = 0; i < pages.length; i++) {
            prog.set(5 + i / pages.length * 85, 'Page ' + (i + 1) + ' / ' + pages.length);
            const sp = pages[i], box = sp.getCropBox(), rot = ((sp.getRotation().angle % 360) + 360) % 360;
            const W = (rot % 180) ? box.height : box.width, H = (rot % 180) ? box.width : box.height;
            const emb = await out.embedPage(sp, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height });
            const pg = out.addPage([W, H]);
            const apply = which === 'all' || (which === 'first' && i === 0) || (which === 'rest' && i > 0);
            const drawHead = function () {
              if (!apply) return;
              const o = fit === 'full' ? { x: 0, y: 0, width: W, height: H } : { x: 0, y: H - W * lhh / lw, width: W, height: W * lhh / lw };
              if (lh.embed) pg.drawPage(lh, o); else pg.drawImage(lh, o);
            };
            if (mode === 'under') drawHead();
            if (rot === 0) pg.drawPage(emb, { x: 0, y: 0 });
            else if (rot === 90) pg.drawPage(emb, { x: 0, y: H, rotate: degrees(-90) });
            else if (rot === 180) pg.drawPage(emb, { x: W, y: H, rotate: degrees(180) });
            else pg.drawPage(emb, { x: W, y: 0, rotate: degrees(90) });
            if (mode === 'over') drawHead();
          }
          const bytes = await savePdf(out, base(doc) + '-letterhead.pdf');
          prog.remove();
          mountResult(body, `Done (${kb(bytes)}).` + (mode === 'under' ? '<br><span style="font-size:12px">If the letterhead does not show, your PDF has a white background on every page (common for scans) — choose “On top of the page”.</span>' : ''));
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== REMOVE BLANK PAGES */
  TOOL_IMPL.pdfremoveblank = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null, info = [], sens = 3;
      function inkRatio(c) {
        const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, mx = Math.round(c.width * 0.04), my = Math.round(c.height * 0.04);
        let ink = 0, tot = 0;
        for (let y = my; y < c.height - my; y++) for (let x = mx; x < c.width - mx; x++) { const i = (y * c.width + x) * 4; tot++; if (d[i] + d[i + 1] + d[i + 2] < 600) ink++; }
        return tot ? ink / tot : 0;
      }
      function paint() {
        body.innerHTML = '';
        if (!file) {
          pdfUploader(body, null, async function (fl) {
            file = fl[0]; info = [];
            body.innerHTML = '<div class="note">⏳ Looking at every page…</div>';
            try {
              const pdf = await loadPdfJs(file._buf);
              for (let i = 1; i <= pdf.numPages; i++) { const c = await renderThumb(pdf, i, 140); const p = await pdf.getPage(i); const tc = await p.getTextContent(); info.push({ n: i, c: c, ink: inkRatio(c), text: tc.items.some(function (t) { return t.str && t.str.trim(); }) }); }
            } catch (e) { fail(body, e); return; }
            mark(); paint();
          });
          return;
        }
        mountFileList(body, [file], function () { file = null; info = []; paint(); });
        const s = el(`<div class="opts one"><div class="field"><label>How strict (1 = only fully white pages, 5 = also nearly-empty scans with specks)</label><input id="rbSens" type="range" min="1" max="5" value="${sens}"></div></div>`);
        s.querySelector('input').oninput = function (e) { sens = +e.target.value; mark(); paint(); };
        body.appendChild(s);
        const del = info.filter(function (x) { return x.del; }).length;
        body.appendChild(el(`<div class="note">${del} of ${info.length} pages look blank (red). Tap a page to change it.</div>`));
        const grid = el('<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:8px; margin:8px 0;"></div>');
        info.forEach(function (x) {
          const cell = el(`<div style="cursor:pointer; border:3px solid ${x.del ? '#E53935' : 'var(--line)'}; border-radius:8px; padding:3px; text-align:center; font-size:11px; background:${x.del ? '#FFEBEE' : '#fff'};"></div>`);
          x.c.style.cssText = 'width:100%; display:block; opacity:' + (x.del ? 0.45 : 1); cell.appendChild(x.c);
          cell.appendChild(el(`<div>${x.n} ${x.del ? '🗑️ remove' : '✓ keep'}</div>`));
          cell.onclick = function () { x.del = !x.del; x.manual = true; paint(); };
          grid.appendChild(cell);
        });
        body.appendChild(grid);
        btnRow(body, '🧹 Remove ' + del + ' page(s) & Download', run);
      }
      function mark() { const lim = [0.0004, 0.0015, 0.004, 0.009, 0.018][sens - 1]; info.forEach(function (x) { if (!x.manual) x.del = !x.text && x.ink <= lim; }); }
      async function run() {
        const keep = info.filter(function (x) { return !x.del; }).map(function (x) { return x.n - 1; });
        if (!keep.length) { fail(body, 'Every page is marked for removal — keep at least one.'); return; }
        const prog = mountProgress(body);
        try {
          const src = await PDFDocument.load(file._buf, { ignoreEncryption: true });
          const out = await PDFDocument.create();
          (await out.copyPages(src, keep)).forEach(function (p) { out.addPage(p); });
          const bytes = await savePdf(out, base(file) + '-no-blank.pdf');
          prog.remove(); mountResult(body, `Done — ${info.length - keep.length} blank page(s) removed, ${keep.length} kept (${kb(bytes)}).`);
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== AUTO-REDACT (Aadhaar / PAN / phone …) */
  TOOL_IMPL.pdfautoredact = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null, pdf = null, found = [];
      function opts() {
        const q = function (id) { const x = body.querySelector(id); return x && x.checked; };
        return { aadhaar: q('#arA'), pan: q('#arP'), phone: q('#arM'), email: q('#arE'), ifsc: q('#arI'), keepLast4: q('#arK'), strictAadhaar: true,
          words: (body.querySelector('#arW') ? body.querySelector('#arW').value : '').split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean) };
      }
      function paint() {
        body.innerHTML = '';
        body.appendChild(el('<div class="note" style="background:#FFF3E0; border-color:#FFD699;">🔒 Finds personal numbers in the PDF text and covers them with black boxes. The result is saved as page images, so the hidden numbers are really gone (they cannot be copied back). For a scanned PDF (photo of paper), first run “OCR PDF → Searchable PDF”.</div>'));
        if (!file) { pdfUploader(body, null, async function (fl) { file = fl[0]; pdf = await loadPdfJs(file._buf); paint(); }); return; }
        mountFileList(body, [file], function () { file = null; pdf = null; found = []; paint(); });
        body.appendChild(el(`<div class="opts">
          <div class="field-inline"><input type="checkbox" id="arA" checked><label for="arA">Aadhaar numbers (12 digits)</label></div>
          <div class="field-inline"><input type="checkbox" id="arK"><label for="arK">…keep the last 4 digits visible (masked Aadhaar)</label></div>
          <div class="field-inline"><input type="checkbox" id="arP" checked><label for="arP">PAN (ABCDE1234F)</label></div>
          <div class="field-inline"><input type="checkbox" id="arM" checked><label for="arM">Mobile numbers</label></div>
          <div class="field-inline"><input type="checkbox" id="arE"><label for="arE">E-mail addresses</label></div>
          <div class="field-inline"><input type="checkbox" id="arI"><label for="arI">IFSC codes</label></div>
          <div class="field"><label>Also hide these words (comma separated — names, account numbers…)</label><input id="arW" placeholder="e.g. Ramesh Kumar, 50100123456789"></div>
        </div>`));
        btnRow(body, '🔍 Find', find);
      }
      async function scan(o) {
        const res = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const p = await pdf.getPage(i), tc = await p.getTextContent();
          tc.items.forEach(function (it) {
            if (!it.str) return;
            findMatches(it.str, o).forEach(function (m) { const r = maskRange(m, o.keepLast4); if (r[1] > r[0]) res.push({ page: i, item: it, s: r[0], e: r[1], kind: m.kind, text: m.text }); });
          });
        }
        return res;
      }
      async function find() {
        const o = opts();
        const note = el('<div class="note">⏳ Searching…</div>'); body.appendChild(note);
        try { found = await scan(o); } catch (e) { note.remove(); fail(body, e); return; }
        note.remove();
        const old = body.querySelector('#arRes'); if (old) old.remove();
        const box = el('<div id="arRes"></div>'); body.appendChild(box);
        if (!found.length) { box.appendChild(el('<div class="note">Nothing found. If this is a scan, run “OCR PDF → Searchable PDF” first, then try again.</div>')); return; }
        const by = {}; found.forEach(function (f) { by[f.kind] = (by[f.kind] || 0) + 1; });
        const names = { aadhaar: 'Aadhaar', pan: 'PAN', phone: 'mobile', email: 'e-mail', ifsc: 'IFSC', word: 'your words' };
        box.appendChild(el('<div class="note">Found: ' + Object.keys(by).map(function (k) { return by[k] + ' ' + names[k]; }).join(', ') + ' on ' + new Set(found.map(function (f) { return f.page; })).size + ' page(s). Check the preview, then download.</div>'));
        const c = await drawPage(found[0].page, 1.2);
        c.style.cssText = 'max-width:100%; border:1px solid var(--line); border-radius:8px; display:block; margin:6px auto;';
        box.appendChild(el('<div style="font-size:12px; color:var(--sub); text-align:center;">Preview of page ' + found[0].page + '</div>')); box.appendChild(c);
        const row = el('<div class="btn-row"></div>'); const b = el('<button class="btn">⬛ Black out & Download</button>'); b.onclick = run; row.appendChild(b); box.appendChild(row);
      }
      // render a page with the black boxes drawn on it
      async function drawPage(n, s) {
        const p = await pdf.getPage(n), vp = p.getViewport({ scale: s });
        const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        await p.render({ canvasContext: g, viewport: vp }).promise;
        g.fillStyle = '#000';
        found.filter(function (f) { return f.page === n; }).forEach(function (f) {
          const it = f.item, t = it.transform, size = Math.hypot(t[2], t[3]) || 10, len = it.str.length || 1, wU = it.width || len * size * 0.5;
          const dir = [t[0] / (Math.hypot(t[0], t[1]) || 1), t[1] / (Math.hypot(t[0], t[1]) || 1)], nrm = [-dir[1], dir[0]];
          // character positions measured with a canvas font of the same family look (better than equal widths)
          g.save(); g.font = '100px Arial'; const full = g.measureText(it.str).width || 1, a = g.measureText(it.str.slice(0, f.s)).width / full, b = g.measureText(it.str.slice(0, f.e)).width / full; g.restore();
          const x0 = a * wU - size * 0.12, x1 = b * wU + size * 0.12;
          const pts = [[x0, -0.3], [x1, -0.3], [x1, 1.0], [x0, 1.0]].map(function (q) { return vp.convertToViewportPoint(t[4] + dir[0] * q[0] + nrm[0] * q[1] * size, t[5] + dir[1] * q[0] + nrm[1] * q[1] * size); });
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(function (q) { g.lineTo(q[0], q[1]); }); g.closePath(); g.fill();
        });
        return c;
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const out = await PDFDocument.create();
          for (let i = 1; i <= pdf.numPages; i++) {
            prog.set(5 + i / pdf.numPages * 85, 'Page ' + i + ' / ' + pdf.numPages);
            const p = await pdf.getPage(i), vp1 = p.getViewport({ scale: 1 });
            const c = await drawPage(i, 2.2);
            const jpg = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.9); });
            const img = await out.embedJpg(await jpg.arrayBuffer());
            out.addPage([vp1.width, vp1.height]).drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
          }
          const bytes = await savePdf(out, base(file) + '-redacted.pdf');
          prog.remove(); mountResult(body, `Done — ${found.length} item(s) blacked out (${kb(bytes)}). Pages are images now, so text is no longer selectable.`);
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };

  /* ================================================================== PDF → MARKDOWN / HTML */
  TOOL_IMPL.pdf2md = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null, md = '';
      function paint() {
        body.innerHTML = '';
        if (!file) {
          pdfUploader(body, null, async function (fl) {
            file = fl[0]; body.innerHTML = '<div class="note">⏳ Reading the text…</div>';
            try {
              const pdf = await loadPdfJs(file._buf), pages = [];
              for (let i = 1; i <= pdf.numPages; i++) { const p = await pdf.getPage(i); const tc = await p.getTextContent(); pages.push(itemsToBlocks(tc.items, p.getViewport({ scale: 1 }).height)); }
              md = blocksToMarkdown(pages);
              if (!md.replace(/[-\s]/g, '')) md = '';
            } catch (e) { fail(body, e); return; }
            paint();
          });
          return;
        }
        mountFileList(body, [file], function () { file = null; md = ''; paint(); });
        if (!md) { body.appendChild(el('<div class="note">This PDF has no text layer (it is a scan). Run “OCR PDF → Searchable PDF” first.</div>')); return; }
        body.appendChild(el('<div class="note">Headings are guessed from bigger / bold text. You can correct the Markdown below before downloading.</div>'));
        const ta = el('<textarea style="width:100%; min-height:260px; font-family:monospace; font-size:12.5px; padding:10px; border:1px solid var(--line); border-radius:10px;"></textarea>');
        ta.value = md; ta.oninput = function () { md = ta.value; };
        body.appendChild(ta);
        const row = el('<div class="btn-row"></div>');
        const b1 = el('<button class="btn">⬇️ Markdown (.md)</button>'), b2 = el('<button class="btn secondary">⬇️ Web page (.html)</button>'), b3 = el('<button class="btn secondary">📋 Copy</button>');
        b1.onclick = function () { downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), base(file) + '.md'); };
        b2.onclick = function () { downloadBlob(new Blob(['<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(base(file)) + '</title><style>body{font-family:system-ui,"Noto Sans Tamil",sans-serif;max-width:800px;margin:24px auto;padding:0 16px;line-height:1.6}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head><body>' + md2html(md) + '</body></html>'], { type: 'text/html;charset=utf-8' }), base(file) + '.html'); };
        b3.onclick = async function () { try { await navigator.clipboard.writeText(md); b3.textContent = '✓ Copied'; } catch (e) { ta.select(); document.execCommand('copy'); b3.textContent = '✓ Copied'; } };
        row.appendChild(b1); row.appendChild(b2); row.appendChild(b3); body.appendChild(row);
      }
      paint();
    }
  };

  /* ================================================================== MARKDOWN / TEXT → PDF */
  const MD_CSS = 'body{margin:0}.mdp{font-family:"Noto Sans Tamil",Arial,sans-serif;color:#111;font-size:12pt;line-height:1.55;padding:0}.mdp h1{font-size:22pt;margin:.2em 0 .4em}.mdp h2{font-size:17pt;margin:.9em 0 .3em}.mdp h3{font-size:14pt;margin:.8em 0 .3em}.mdp p{margin:.45em 0}.mdp ul,.mdp ol{margin:.3em 0 .5em 1.4em;padding:0}.mdp blockquote{border-left:4px solid #9aa9d6;margin:.6em 0;padding:.2em .8em;color:#333;background:#f4f6fb}.mdp code{font-family:"Courier New",monospace;background:#f1f1f1;padding:0 3px;border-radius:3px}.mdp pre{background:#f4f4f4;padding:8px;border-radius:6px;white-space:pre-wrap}.mdp table{border-collapse:collapse;margin:.5em 0;width:100%}.mdp td,.mdp th{border:1px solid #999;padding:4px 6px;text-align:left}.mdp th{background:#eef1f8}.mdp hr{border:none;border-top:1px solid #bbb;margin:1em 0}.mdp a{color:#1a4fb4}';
  TOOL_IMPL.md2pdf = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      const SAMPLE = '# தலைப்பு / Title\n\nஇங்கே எழுதுங்கள். **Bold**, *italic*, `code`.\n\n## பட்டியல்\n- முதல் வரி\n- இரண்டாம் வரி\n\n| பொருள் | விலை |\n|---|---|\n| பேனா | ₹10 |\n| நோட்டு | ₹40 |\n\n> குறிப்பு: Tamil and English both work.\n';
      let src = SAMPLE;
      try { src = localStorage.getItem('pti-md2pdf') || SAMPLE; } catch (e) {}
      body.appendChild(el('<div class="note">Write or paste Markdown (or plain text). The preview shows the PDF. # = heading, - = list, **bold**, | tables |.</div>'));
      const grid = el('<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:10px;"></div>');
      const ta = el('<textarea style="width:100%; min-height:340px; font-family:monospace; font-size:13px; padding:10px; border:1px solid var(--line); border-radius:10px;"></textarea>');
      const pv = el('<div style="border:1px solid var(--line); border-radius:10px; background:#fff; padding:18px; min-height:340px; max-height:520px; overflow:auto;"><style>' + MD_CSS + '</style><div class="mdp"></div></div>');
      grid.appendChild(ta); grid.appendChild(pv); body.appendChild(grid);
      ta.value = src;
      const upd = function () { pv.querySelector('.mdp').innerHTML = md2html(ta.value); try { localStorage.setItem('pti-md2pdf', ta.value); } catch (e) {} };
      ta.oninput = upd; upd();
      body.appendChild(el(`<div class="opts"><div class="field"><label>Page size</label><select id="mdSize"><option>A4</option><option>Letter</option><option>A5</option></select></div>
        <div class="field"><label>File name</label><input id="mdName" value="document"></div></div>`));
      const row = el('<div class="btn-row"></div>');
      const b1 = el('<button class="btn">⬇️ Download PDF</button>'), b2 = el('<button class="btn secondary">🖨️ Print / Save as PDF (sharpest text)</button>');
      row.appendChild(b1); row.appendChild(b2); body.appendChild(row);
      b2.onclick = function () {
        const w = window.open('', '_blank'); if (!w) { alert('Please allow pop-ups for this site to print.'); return; }
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(body.querySelector('#mdName').value || 'document') + '</title><link rel="stylesheet" href="/fonts/tamil.css"><style>@page{size:' + body.querySelector('#mdSize').value + ';margin:18mm}' + MD_CSS + '</style></head><body><div class="mdp">' + md2html(ta.value) + '</div><script>document.fonts.ready.then(function(){setTimeout(function(){print()},300)})<\/script></body></html>');
        w.document.close();
      };
      b1.onclick = async function () {
        const prog = mountProgress(body);
        try {
          prog.set(10, 'Preparing…');
          const sz = SIZES[body.querySelector('#mdSize').value], mm = 72 / 25.4, M = 18 * mm;
          const host = el('<div style="position:fixed; left:-10000px; top:0; width:' + Math.round((sz[0] - 2 * M) * 1.3333) + 'px; background:#fff;"><style>' + MD_CSS + '</style><div class="mdp"></div></div>');
          host.querySelector('.mdp').innerHTML = md2html(ta.value);
          document.body.appendChild(host);
          try { await document.fonts.ready; } catch (e) {}
          // page breaks: never cut through a line — break between top-level blocks
          const blocks = [...host.querySelector('.mdp').children], pagePx = (sz[1] - 2 * M) * 1.3333, cuts = [0];
          let start = 0; blocks.forEach(function (b) { const top = b.offsetTop, bot = top + b.offsetHeight; if (bot - start > pagePx && top > start) { cuts.push(top); start = top; } });
          prog.set(40, 'Drawing…');
          const hostW = host.offsetWidth;
          const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#fff', logging: false });
          host.remove();
          const out = await PDFDocument.create(), k = hostW ? canvas.width / hostW : 2;
          cuts.push(Math.max(canvas.height / k, cuts[cuts.length - 1] + 1));
          for (let i = 0; i < cuts.length - 1; i++) {
            const y0 = Math.round(cuts[i] * k), y1 = Math.min(canvas.height, Math.round(Math.min(cuts[i + 1], cuts[i] + pagePx) * k));
            if (y1 - y0 < 4) continue;
            const part = document.createElement('canvas'); part.width = canvas.width; part.height = y1 - y0;
            part.getContext('2d').drawImage(canvas, 0, y0, canvas.width, y1 - y0, 0, 0, canvas.width, y1 - y0);
            const png = await new Promise(function (r) { part.toBlob(r, 'image/png'); });
            const img = await out.embedPng(await png.arrayBuffer());
            const w = sz[0] - 2 * M, h = w * part.height / part.width;
            out.addPage(sz).drawImage(img, { x: M, y: sz[1] - M - h, width: w, height: h });
          }
          const name = (body.querySelector('#mdName').value || 'document').replace(/[\\/:*?"<>|]+/g, '').trim() || 'document';
          await savePdf(out, name + '.pdf');
          prog.remove(); mountResult(body, 'PDF downloaded (' + out.getPageCount() + ' page' + (out.getPageCount() > 1 ? 's' : '') + '). For selectable text use “Print / Save as PDF”.');
        } catch (e) { prog.remove(); fail(body, e); }
      };
    }
  };

  /* ================================================================== PDF → ONE LONG IMAGE */
  TOOL_IMPL.pdflongimg = {
    mount: function (container) {
      const body = el('<div></div>'); container.appendChild(body);
      let file = null;
      function paint() {
        body.innerHTML = '';
        if (!file) { pdfUploader(body, null, function (fl) { file = fl[0]; paint(); }); return; }
        mountFileList(body, [file], function () { file = null; paint(); });
        body.appendChild(el(`<div class="opts">
          <div class="field"><label>Width of the image</label><select id="liW"><option value="800">800 px (small, WhatsApp)</option><option value="1200" selected>1200 px (clear)</option><option value="1800">1800 px (very sharp)</option></select></div>
          <div class="field"><label>Format</label><select id="liF"><option value="image/jpeg">JPG (smaller)</option><option value="image/png">PNG (exact)</option></select></div>
          <div class="field"><label>Gap between pages</label><select id="liG"><option value="0">None</option><option value="12" selected>Small grey line</option><option value="30">Wide</option></select></div>
          <div class="field"><label>Pages (empty = all, e.g. 1-3)</label><input id="liP" placeholder="all"></div>
        </div>`));
        btnRow(body, '🧻 Make one long image', run);
      }
      async function run() {
        const prog = mountProgress(body);
        try {
          const W = +body.querySelector('#liW').value, type = body.querySelector('#liF').value, gap = +body.querySelector('#liG').value;
          const pdf = await loadPdfJs(file._buf);
          let list = []; const txt = body.querySelector('#liP').value.trim();
          if (!txt) for (let i = 1; i <= pdf.numPages; i++) list.push(i);
          else txt.split(',').forEach(function (p) { const m = /^(\d+)\s*-\s*(\d+)$/.exec(p.trim()); if (m) { for (let i = +m[1]; i <= +m[2]; i++) list.push(i); } else if (/^\d+$/.test(p.trim())) list.push(+p.trim()); });
          list = list.filter(function (n) { return n >= 1 && n <= pdf.numPages; });
          if (!list.length) throw new Error('No valid pages chosen.');
          const parts = [];
          for (let k = 0; k < list.length; k++) { prog.set(5 + k / list.length * 70, 'Page ' + list[k]); parts.push(await renderThumb(pdf, list[k], W)); }
          const H = parts.reduce(function (a, c) { return a + c.height; }, 0) + gap * (parts.length - 1);
          if (H > 32000) throw new Error('That is too long for one image (' + H + ' px). Choose fewer pages or a smaller width.');
          const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
          g.fillStyle = '#d9dde3'; g.fillRect(0, 0, W, H);
          let y = 0; parts.forEach(function (p) { g.drawImage(p, Math.round((W - p.width) / 2), y); y += p.height + gap; });
          prog.set(90, 'Saving…');
          const blob = await new Promise(function (r) { c.toBlob(r, type, 0.88); });
          downloadBlob(blob, base(file) + '-long.' + (type === 'image/png' ? 'png' : 'jpg'));
          prog.remove(); mountResult(body, `Done — ${list.length} pages in one ${W}×${H} image (${kb(blob.size)}).`);
        } catch (e) { prog.remove(); fail(body, e); }
      }
      paint();
    }
  };
})();
