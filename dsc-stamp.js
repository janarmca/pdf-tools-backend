/* dsc-stamp.js — adds a visible "signature checked" tick band to a PDF WITHOUT touching a single original byte.
 * It appends a PDF "incremental update" (new objects + a new xref section pointing back with /Prev), which is the
 * same mechanism Adobe uses to add a second signature or a comment. The signed byte range of every existing digital
 * signature therefore still hashes to exactly the same value — the signature stays cryptographically intact.
 *
 *   DscStamp.stamp(bytes: Uint8Array, opts, PDFLib) -> Promise<{ bytes: Uint8Array, page: number, band: number }>
 *   opts = { signer, signedAt, checkedAt, sha256, count, pageIndex }       (all optional, plain text)
 *
 * What the stamp is: OUR note ("pdftoolsindia.com checked this signature"). It is not an Adobe or CA mark, and viewers
 * may say the document was "modified after signing" because the file now has an extra section. The UI tells the user
 * to keep and upload the ORIGINAL file for portals. pdf-lib is only used to READ the file (never to save it).
 * Works in the browser and in Node. Limits: encrypted PDFs are refused; very damaged files may fail to parse. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DscStamp = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MARK = '%PTI-VERIFIED-STAMP';
  const asc = s => String(s == null ? '' : s).normalize('NFKD').replace(/[^\x20-\x7E]/g, '?').replace(/\?{2,}/g, '?');
  const esc = s => asc(s).replace(/([()\\])/g, '\\$1');
  const num = n => (Math.round(n * 100) / 100).toString();

  function findPrevXref(u8) { // last "startxref <offset>" in the original file
    const n = u8.length, from = Math.max(0, n - 2048); let tail = '';
    for (let i = from; i < n; i++) tail += String.fromCharCode(u8[i]);
    const m = [...tail.matchAll(/startxref\s+(\d+)/g)]; if (!m.length) throw new Error('This PDF has no startxref marker');
    return +m[m.length - 1][1];
  }
  function origSize(u8, prev) { // /Size of the last xref section (classic trailer or xref-stream dictionary): new object numbers must start at or after it
    let t = ''; for (let i = prev; i < Math.min(u8.length, prev + 4096); i++) t += String.fromCharCode(u8[i]);
    const m = /\/Size\s+(\d+)/.exec(t); return m ? +m[1] : 0;
  }
  function fit(text, size, maxW) { // Helvetica averages ~0.52 em per character: keep a line inside the band
    const per = size * 0.52, max = Math.max(8, Math.floor(maxW / per)); text = asc(text);
    return text.length <= max ? text : text.slice(0, max - 3) + '...';
  }

  // visible signature boxes of the PDF (where a viewer draws its own "valid / ?" mark)
  function sigWidgets(doc, PDFLib) {
    const { PDFName, PDFDict, PDFArray } = PDFLib, out = [];
    doc.getPages().forEach((pg, pi) => {
      const an = pg.node.Annots && pg.node.Annots(); if (!an) return;
      for (let i = 0; i < an.size(); i++) {
        const d = doc.context.lookupMaybe(an.get(i), PDFDict); if (!d) continue;
        const st = d.get(PDFName.of('Subtype')); if (!st || String(st) !== '/Widget') continue;
        let ft = d.get(PDFName.of('FT')); if (!ft) { const par = d.lookupMaybe(PDFName.of('Parent'), PDFDict); ft = par && par.get(PDFName.of('FT')); }
        if (!ft || String(ft) !== '/Sig') continue;
        const ra = d.lookupMaybe(PDFName.of('Rect'), PDFArray); if (!ra) continue; const q = ra.asRectangle();
        const x = Math.min(q.x, q.x + q.width), w = Math.abs(q.width), y = Math.min(q.y, q.y + q.height), h = Math.abs(q.height);
        if (w >= 8 && h >= 8) out.push({ pageIndex: pi, x, y, w, h });
      }
    });
    return out;
  }
  async function stamp(input, opts, PDFLib) {
    opts = opts || {};
    const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
    const { PDFDocument, PDFName, PDFArray, PDFRef } = PDFLib;
    let doc;
    try { doc = await PDFDocument.load(u8, { updateMetadata: false, throwOnInvalidObject: false }); }
    catch (e) { throw new Error(/encrypt/i.test(e && e.message || '') ? 'This PDF is password-protected, so it cannot be stamped.' : 'Could not read this PDF: ' + (e && e.message || e)); }
    const ctx = doc.context; let pages; try { pages = doc.getPages(); } catch (e) { throw new Error('Could not read this PDF: its page structure is damaged.'); }
    if (!pages.length) throw new Error('This PDF has no pages');
    let place = ['strip', 'sigbox', 'br', 'bl', 'tr', 'tl'].includes(opts.place) ? opts.place : 'strip', sigRect = null;
    if (place === 'sigbox') { const sw = sigWidgets(doc, PDFLib); if (sw.length) sigRect = sw[0]; else place = 'br'; } // no visible signature box: fall back to the bottom-right corner
    const pageIndex = sigRect ? sigRect.pageIndex : Math.min(Math.max(0, opts.pageIndex | 0), pages.length - 1), page = pages[pageIndex], node = page.node, pageRef = page.ref;
    const mb = page.getMediaBox(), cbArr = node.CropBox && node.CropBox(), cb = cbArr ? cbArr.asRectangle() : null;
    const mode = place === 'strip' ? 'band' : 'overlay', BAND = mode === 'band' ? 40 : 0;   // band = empty strip under the page (nothing covered, but the page box changes); overlay = annotation only
    const nMB = [mb.x, mb.y - BAND, mb.x + mb.width, mb.y + mb.height];
    const nCB = cb ? [cb.x, cb.y - BAND, cb.x + cb.width, cb.y + cb.height] : null;
    const prev = findPrevXref(u8);
    let next = Math.max(ctx.largestObjectNumber + 1, origSize(u8, prev), 1);
    const apRef = next++, annRef = next++, objs = new Map();     // objNum -> body text (without "N 0 obj"/"endobj")

    // ---- appearance stream (vector tick + Helvetica text) ----
    const h = 30, M = 14, w = sigRect ? Math.min(Math.max(sigRect.w, 170), 300, mb.width - 2 * M) : Math.min(mb.width - 28, mode === 'band' ? 470 : 330);
    let ox, oy;
    if (sigRect) { ox = Math.min(Math.max(sigRect.x + (sigRect.w - w) / 2, mb.x + 4), mb.x + mb.width - w - 4); oy = Math.min(Math.max(sigRect.y + (sigRect.h - h) / 2, mb.y + 4), mb.y + mb.height - h - 4); }
    else { ox = /l$/.test(place) ? mb.x + M : mb.x + mb.width - w - M; oy = mode === 'band' ? mb.y - BAND + 5 : (/^t/.test(place) ? mb.y + mb.height - h - M : mb.y + M); }
    const cy = h / 2, cx = 17, r = 10.5, k = 0.5523 * r, tw = w - 40;
    const l1 = fit('SIGNATURE CHECKED: VALID', 9, tw), l2 = fit('Signer: ' + (opts.signer || '-') + (opts.count > 1 ? '  (+' + (opts.count - 1) + ' more)' : '') + (opts.signedAt ? '   Signed: ' + opts.signedAt : ''), 6.8, tw),
      l3 = fit('Checked ' + (opts.checkedAt || '') + ' by pdftoolsindia.com  |  original file SHA-256 ' + String(opts.sha256 || '').slice(0, 12) + '  |  revocation not checked  |  not an official CA / Adobe mark', 5.8, tw);
    const content = [
      'q', '0.93 0.98 0.94 rg', '0.12 0.52 0.25 RG', '0.8 w', num(0.4) + ' ' + num(0.4) + ' ' + num(w - 0.8) + ' ' + num(h - 0.8) + ' re B',
      '0.12 0.52 0.25 rg', `${num(cx + r)} ${num(cy)} m`, `${num(cx + r)} ${num(cy + k)} ${num(cx + k)} ${num(cy + r)} ${num(cx)} ${num(cy + r)} c`, `${num(cx - k)} ${num(cy + r)} ${num(cx - r)} ${num(cy + k)} ${num(cx - r)} ${num(cy)} c`,
      `${num(cx - r)} ${num(cy - k)} ${num(cx - k)} ${num(cy - r)} ${num(cx)} ${num(cy - r)} c`, `${num(cx + k)} ${num(cy - r)} ${num(cx + r)} ${num(cy - k)} ${num(cx + r)} ${num(cy)} c`, 'f',
      '1 1 1 RG', '2.6 w', '1 J', '1 j', `${num(cx - 5.5)} ${num(cy)} m`, `${num(cx - 1.5)} ${num(cy - 4.6)} l`, `${num(cx + 6)} ${num(cy + 5)} l`, 'S',
      'BT', '/F2 9 Tf', '0.07 0.35 0.16 rg', `34 ${num(h - 11)} Td`, `(${esc(l1)}) Tj`, 'ET',
      'BT', '/F1 6.8 Tf', '0.2 0.22 0.28 rg', `34 ${num(h - 20.5)} Td`, `(${esc(l2)}) Tj`, 'ET',
      'BT', '/F1 5.8 Tf', '0.42 0.44 0.5 rg', `34 ${num(h - 27.2)} Td`, `(${esc(l3)}) Tj`, 'ET', 'Q'].join('\n');
    objs.set(apRef, `<< /Type /XObject /Subtype /Form /BBox [0 0 ${num(w)} ${num(h)}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> >> >> /Length ${content.length} >>\nstream\n${content}\nendstream`);
    objs.set(annRef, `<< /Type /Annot /Subtype /Stamp /Rect [${num(ox)} ${num(oy)} ${num(ox + w)} ${num(oy + h)}] /F 132 /NM (pdftoolsindia-signature-check) /T (pdftoolsindia.com) /Contents (${esc('Signature checked: valid. ' + (opts.signer || ''))}) /AP << /N ${apRef} 0 R >> /P ${pageRef.objectNumber} ${pageRef.generationNumber} R >>`);

    // ---- page: enlarge the box and register the annotation ----
    const ann = `${annRef} 0 R`, annots = node.get(PDFName.of('Annots'));
    let dictText = null;
    const clone = node.clone(ctx); let extra = '';
    if (BAND) { clone.delete(PDFName.of('MediaBox')); if (nCB || cbArr) clone.delete(PDFName.of('CropBox')); extra = `/MediaBox [${nMB.map(num).join(' ')}]\n` + (nCB ? `/CropBox [${nCB.map(num).join(' ')}]\n` : ''); }
    if (annots instanceof PDFRef) { // the page points at a shared array object: re-write that array with our entry appended
      const arr = ctx.lookup(annots, PDFArray); objs.set(annots.objectNumber, arr.toString().replace(/\]\s*$/, ' ' + ann + ' ]'));
    } else if (annots instanceof PDFArray) { clone.delete(PDFName.of('Annots')); extra += '/Annots ' + annots.toString().replace(/\]\s*$/, ' ' + ann + ' ]') + '\n'; }
    else extra += `/Annots [ ${ann} ]\n`;
    dictText = clone.toString().replace(/>>\s*$/, extra + '>>'); objs.set(pageRef.objectNumber, dictText);

    // ---- write the incremental update ----
    const enc = new TextEncoder(), parts = []; let len = u8.length;
    const push = s => { const b = enc.encode(s); parts.push(b); len += b.length; return b.length; };
    if (u8[u8.length - 1] !== 10) push('\n');
    push(MARK + ' ' + asc(opts.checkedAt || '') + '\n');
    const offs = new Map();
    for (const [n, body] of [...objs.entries()].sort((a, b) => a[0] - b[0])) { offs.set(n, len); push(`${n} 0 obj\n${body}\nendobj\n`); }
    const xrefAt = len, nums = [...offs.keys()].sort((a, b) => a - b); let xr = 'xref\n';
    for (let i = 0; i < nums.length;) { let j = i; while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++; xr += `${nums[i]} ${j - i + 1}\n`; for (let q = i; q <= j; q++) xr += String(offs.get(nums[q])).padStart(10, '0') + ' 00000 n \n'; i = j + 1; }
    const ti = ctx.trailerInfo, size = Math.max(ctx.largestObjectNumber + 1, origSize(u8, prev), next, nums[nums.length - 1] + 1);
    xr += `trailer\n<< /Size ${size} /Root ${ti.Root.objectNumber} ${ti.Root.generationNumber} R` + (ti.Info ? ` /Info ${ti.Info.objectNumber} ${ti.Info.generationNumber} R` : '') + (ti.ID ? ` /ID ${ti.ID.toString()}` : '') + ` /Prev ${prev} >>\nstartxref\n${xrefAt}\n%%EOF\n`;
    push(xr);
    const out = new Uint8Array(len); out.set(u8, 0); let p = u8.length; for (const b of parts) { out.set(b, p); p += b.length; }
    return { bytes: out, page: pageIndex + 1, band: BAND, mode, place, onSignatureBox: !!sigRect };
  }
  return { stamp, MARK };
}));
