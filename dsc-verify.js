/* dsc-verify.js — PDF digital-signature (DSC / e-Sign / Adobe) checker.
 * Runs 100% in the browser (or Node 20+): no upload, no server, no libraries.
 * Public API:  DscVerify.analyze(arrayBuffer) -> Promise<report>
 *              DscVerify.signedInfo(arrayBuffer) -> { signed:boolean, count:number }  (fast, no crypto)
 * What it proves: (1) the signed bytes still hash to the value the signer signed,
 * (2) the signature really was made by the key inside the embedded certificate,
 * (3) whether the PDF was changed after signing, (4) the embedded certificate chain links up,
 * (5) validity dates, key usage, issuer names (CCA India hierarchy is recognised by name).
 * What it can NOT prove offline: revocation (OCSP/CRL) and that the root is in a trust store.
 * The UI says so plainly. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(globalThis.crypto && globalThis.crypto.subtle ? globalThis.crypto : require('node:crypto').webcrypto);
  else root.DscVerify = factory(root.crypto);
}(typeof self !== 'undefined' ? self : this, function (webcrypto) {
  'use strict';
  const subtle = webcrypto && webcrypto.subtle;

  /* ---------- tiny DER reader ---------- */
  function readTLV(buf, pos) {
    const start = pos;
    if (pos >= buf.length) throw new Error('DER: out of data');
    const tag = buf[pos++];
    let len = buf[pos++];
    if (len === undefined) throw new Error('DER: truncated');
    if (len & 0x80) {
      const n = len & 0x7f;
      if (n === 0) { // indefinite length (BER, seen in some CMS blobs)
        const out = { tag, hStart: start, vStart: pos, indefinite: true };
        const kids = []; let p = pos;
        while (!(buf[p] === 0 && buf[p + 1] === 0)) { const k = readTLV(buf, p); kids.push(k); p = k.end; if (p >= buf.length) throw new Error('DER: bad indefinite'); }
        out.vEnd = p; out.end = p + 2; out.kids = kids; out.buf = buf; return out;
      }
      if (n > 4) throw new Error('DER: length too large');
      len = 0; for (let i = 0; i < n; i++) len = len * 256 + buf[pos++];
    }
    const o = { tag, hStart: start, vStart: pos, vEnd: pos + len, end: pos + len, buf };
    if (o.end > buf.length) throw new Error('DER: length beyond data');
    return o;
  }
  function kids(n) {
    if (n.kids) return n.kids;
    const out = []; let p = n.vStart;
    while (p < n.vEnd) { const k = readTLV(n.buf, p); out.push(k); p = k.end; }
    n.kids = out; return out;
  }
  const val = n => n.buf.subarray(n.vStart, n.vEnd);
  const raw = n => n.buf.subarray(n.hStart, n.end);
  function oid(n) {
    const b = val(n); if (!b.length) return '';
    const parts = []; let first = b[0];
    parts.push(Math.floor(first / 40), first % 40);
    let v = 0;
    for (let i = 1; i < b.length; i++) { v = v * 128 + (b[i] & 0x7f); if (!(b[i] & 0x80)) { parts.push(v); v = 0; } }
    return parts.join('.');
  }
  function str(n) {
    const b = val(n);
    if (n.tag === 0x1e) { let s = ''; for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] * 256 + b[i + 1]); return s; } // BMPString
    if (n.tag === 0x0c) return new TextDecoder('utf-8').decode(b);
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s;
  }
  function bigHex(n) { return Array.from(val(n)).map(x => x.toString(16).padStart(2, '0')).join('').replace(/^(00)+(?=.)/, ''); }
  function parseTime(n) {
    const s = str(n); let m;
    if (n.tag === 0x17) { m = /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(s); if (!m) return null; const y = +m[1]; return new Date(Date.UTC(y >= 50 ? 1900 + y : 2000 + y, +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))); }
    m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?/.exec(s); if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  }

  const OID = {
    '2.5.4.3': 'CN', '2.5.4.4': 'SN', '2.5.4.5': 'serialNumber', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.12': 'T',
    '1.2.840.113549.1.9.1': 'E', '2.5.4.17': 'PC', '2.5.4.9': 'street', '2.5.4.42': 'GN', '2.5.4.65': 'pseudonym'
  };
  const HASH = { '1.3.14.3.2.26': 'SHA-1', '2.16.840.1.101.3.4.2.1': 'SHA-256', '2.16.840.1.101.3.4.2.2': 'SHA-384', '2.16.840.1.101.3.4.2.3': 'SHA-512' };
  // signature OID -> {alg, hash}
  const SIGALG = {
    '1.2.840.113549.1.1.1': { alg: 'RSA' }, '1.2.840.113549.1.1.5': { alg: 'RSA', hash: 'SHA-1' }, '1.2.840.113549.1.1.11': { alg: 'RSA', hash: 'SHA-256' },
    '1.2.840.113549.1.1.12': { alg: 'RSA', hash: 'SHA-384' }, '1.2.840.113549.1.1.13': { alg: 'RSA', hash: 'SHA-512' }, '1.2.840.113549.1.1.10': { alg: 'RSA-PSS' },
    '1.2.840.10045.4.1': { alg: 'ECDSA', hash: 'SHA-1' }, '1.2.840.10045.4.3.2': { alg: 'ECDSA', hash: 'SHA-256' }, '1.2.840.10045.4.3.3': { alg: 'ECDSA', hash: 'SHA-384' },
    '1.2.840.10045.4.3.4': { alg: 'ECDSA', hash: 'SHA-512' }, '1.2.840.10045.2.1': { alg: 'ECDSA' }
  };
  const CURVE = { '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521' };

  function parseName(n) {
    const out = []; const map = {};
    for (const set of kids(n)) for (const atv of kids(set)) {
      const k = kids(atv); const key = OID[oid(k[0])] || oid(k[0]); const v = str(k[1]);
      out.push([key, v]); if (!(key in map)) map[key] = v;
    }
    const text = out.map(([k, v]) => k + '=' + v).join(', ');
    return { text, map, der: raw(n), cn: map.CN || map.O || text };
  }

  function parseCert(der) {
    const top = readTLV(der, 0);
    const [tbs, sigAlgN, sigValN] = kids(top);
    const t = kids(tbs); let i = 0;
    if (t[0].tag === 0xa0) i = 1;
    const serial = bigHex(t[i]); const sigAlg = oid(kids(t[i + 1])[0]);
    const issuer = parseName(t[i + 2]);
    const validity = kids(t[i + 3]);
    const notBefore = parseTime(validity[0]), notAfter = parseTime(validity[1]);
    const subject = parseName(t[i + 4]);
    const spki = t[i + 5];
    const cert = { serial, sigAlg, issuer, subject, notBefore, notAfter, spkiDer: raw(spki), tbsDer: raw(tbs), der, outerSigAlg: oid(kids(sigAlgN)[0]), signature: val(sigValN).subarray(1), ext: {} };
    const spkiK = kids(spki); const algK = kids(spkiK[0]);
    cert.pubAlgOid = oid(algK[0]);
    cert.pubParam = algK[1] ? (algK[1].tag === 0x06 ? oid(algK[1]) : null) : null;
    const bits = val(spkiK[1]).subarray(1);
    if (cert.pubAlgOid === '1.2.840.113549.1.1.1') {
      try { const rk = kids(readTLV(bits, 0)); const mod = val(rk[0]); let b = mod.length; for (let q = 0; q < mod.length && mod[q] === 0; q++) b--; cert.keyBits = b * 8; } catch (e) { /* ignore */ }
    } else if (cert.pubParam && CURVE[cert.pubParam]) cert.keyBits = +CURVE[cert.pubParam].slice(2);
    // extensions
    const extWrap = t.find(x => x.tag === 0xa3);
    if (extWrap) {
      for (const e of kids(kids(extWrap)[0])) {
        const ek = kids(e); const id = oid(ek[0]); const octet = ek[ek.length - 1];
        const inner = octet.buf.subarray(octet.vStart, octet.vEnd);
        try {
          if (id === '2.5.29.15') { // keyUsage
            const bs = readTLV(inner, 0); const b = val(bs); const bitsByte = b[1] || 0, b2 = b[2] || 0;
            const names = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment', 'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly'];
            cert.ext.keyUsage = names.filter((_, k) => bitsByte & (0x80 >> k)); if (b2 & 0x80) cert.ext.keyUsage.push('decipherOnly');
          } else if (id === '2.5.29.19') { // basicConstraints
            const seq = kids(readTLV(inner, 0)); cert.ext.isCA = !!(seq[0] && seq[0].tag === 0x01 && val(seq[0])[0]);
          } else if (id === '2.5.29.31') { // CRL distribution points
            const urls = []; const scan = (n) => { if (n.tag === 0x86) urls.push(str(n)); else if (n.tag & 0x20) kids(n).forEach(scan); };
            scan(readTLV(inner, 0)); cert.ext.crl = urls;
          } else if (id === '1.3.6.1.5.5.7.1.1') { // AIA
            const o = []; for (const ad of kids(readTLV(inner, 0))) { const a = kids(ad); if (a[1] && a[1].tag === 0x86) o.push((oid(a[0]) === '1.3.6.1.5.5.7.48.1' ? 'OCSP: ' : 'CA: ') + str(a[1])); } cert.ext.aia = o;
          } else if (id === '2.5.29.32') { // certificate policies
            cert.ext.policies = kids(readTLV(inner, 0)).map(p => oid(kids(p)[0]));
          }
        } catch (err) { /* ignore a broken optional extension */ }
      }
    }
    cert.selfSigned = cert.issuer.text === cert.subject.text;
    return cert;
  }

  /* ---------- PKCS#7 / CMS ---------- */
  function parseCms(der) {
    const top = readTLV(der, 0);
    const ci = kids(top); if (oid(ci[0]) !== '1.2.840.113549.1.7.2') throw new Error('Not a PKCS#7 SignedData');
    const sd = kids(kids(ci[1])[0]);
    // sd: version, digestAlgs, encap, [0] certs, [1] crls, signerInfos
    let idx = 3; const certs = []; let hasCrl = false;
    if (sd[idx] && sd[idx].tag === 0xa0) { for (const c of kids(sd[idx])) { try { certs.push(parseCert(raw(c))); } catch (e) { /* skip non-X509 */ } } idx++; }
    if (sd[idx] && sd[idx].tag === 0xa1) { hasCrl = true; idx++; }
    const signerInfos = kids(sd[idx]);
    const signers = signerInfos.map(si => {
      const s = kids(si); let i = 1; const sid = s[i++];
      const digestOid = oid(kids(s[i++])[0]);
      let signedAttrs = null; if (s[i].tag === 0xa0) { signedAttrs = s[i]; i++; }
      const sigAlgNode = kids(s[i++]); const sigOid = oid(sigAlgNode[0]); const sigParams = sigAlgNode[1] || null;
      const signature = val(s[i++]);
      let unsigned = null; if (s[i] && s[i].tag === 0xa1) unsigned = s[i];
      const o = { digestOid, sigOid, sigParams, signature, signedAttrsNode: signedAttrs, attrs: {}, hasTimestamp: false };
      if (sid.tag === 0x30) { const k = kids(sid); o.sidIssuer = parseName(k[0]); o.sidSerial = bigHex(k[1]); } else if (sid.tag === 0x80) o.sidSki = Array.from(val(sid)).map(x => x.toString(16).padStart(2, '0')).join('');
      if (signedAttrs) for (const a of kids(signedAttrs)) { const ak = kids(a); const id = oid(ak[0]); const v = kids(ak[1])[0]; o.attrs[id] = v; }
      if (unsigned) for (const a of kids(unsigned)) { if (oid(kids(a)[0]) === '1.2.840.113549.1.9.16.2.14') o.hasTimestamp = true; }
      return o;
    });
    let eContent = null;
    try { const ec = kids(sd[2]); if (ec[1]) { const oct = kids(ec[1])[0]; eContent = (oct.tag === 0x24 && oct.kids) ? null : val(oct); } } catch (e) { /* none */ }
    return { certs, signers, hasCrl, eContent };
  }

  /* ---------- crypto helpers ---------- */
  function derSigToRaw(sig, size) { // ECDSA DER -> r||s
    const k = kids(readTLV(sig, 0)); const out = new Uint8Array(size * 2);
    [val(k[0]), val(k[1])].forEach((v, n) => { let b = v; while (b.length > size && b[0] === 0) b = b.subarray(1); out.set(b, n * size + (size - b.length)); });
    return out;
  }
  async function verifyWithCert(cert, hashName, sigAlgOid, signature, data, params) {
    if (!subtle) throw new Error('Web Crypto not available (open the site over https)');
    const sa = SIGALG[sigAlgOid] || {}; const hn = hashName || sa.hash;
    if (!hn) throw new Error('unknown hash');
    if (cert.pubAlgOid === '1.2.840.113549.1.1.1') {
      if (sa.alg === 'RSA-PSS') {
        // RSASSA-PSS-params: [0] hash, [1] mask generation, [2] salt length (default 20)
        let pHash = hn, salt = 20;
        try {
          if (params && params.tag === 0x30) for (const k of kids(params)) {
            if (k.tag === 0xa0) { const h = HASH[oid(kids(kids(k)[0])[0])]; if (h) pHash = h; }
            if (k.tag === 0xa2) { const iv = val(kids(k)[0]); salt = 0; for (const b of iv) salt = salt * 256 + b; }
          }
        } catch (e) { /* keep defaults */ }
        const key = await subtle.importKey('spki', cert.spkiDer, { name: 'RSA-PSS', hash: pHash }, false, ['verify']);
        return subtle.verify({ name: 'RSA-PSS', saltLength: salt }, key, signature, data);
      }
      const key = await subtle.importKey('spki', cert.spkiDer, { name: 'RSASSA-PKCS1-v1_5', hash: hn }, false, ['verify']);
      return subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
    }
    if (cert.pubAlgOid === '1.2.840.10045.2.1') {
      const curve = CURVE[cert.pubParam]; if (!curve) throw new Error('unsupported curve');
      const key = await subtle.importKey('spki', cert.spkiDer, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
      const size = { 'P-256': 32, 'P-384': 48, 'P-521': 66 }[curve];
      return subtle.verify({ name: 'ECDSA', hash: hn }, key, derSigToRaw(signature, size), data);
    }
    throw new Error('unsupported key type ' + cert.pubAlgOid);
  }
  async function digest(hn, data) { return new Uint8Array(await subtle.digest(hn, data)); }
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const hexToBytes = h => { const o = new Uint8Array(h.length >> 1); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; };

  /* ---------- PDF scanning ---------- */
  function latin1(u8) { let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return s; }
  function pdfString(txt, key) {
    const re = new RegExp('/' + key + '\\s*(\\((?:\\\\.|[^\\\\)])*\\)|<[0-9A-Fa-f\\s]*>)');
    const m = re.exec(txt); if (!m) return '';
    let v = m[1];
    if (v[0] === '<') { const h = v.slice(1, -1).replace(/\s+/g, ''); const b = hexToBytes(h.length % 2 ? h + '0' : h); return decodePdfText(b); }
    v = v.slice(1, -1).replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c] || String.fromCharCode(parseInt(c, 8))));
    const b = new Uint8Array(v.length); for (let i = 0; i < v.length; i++) b[i] = v.charCodeAt(i) & 255; return decodePdfText(b);
  }
  function decodePdfText(b) {
    if (b[0] === 0xfe && b[1] === 0xff) { let s = ''; for (let i = 2; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] * 256 + b[i + 1]); return s; }
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(b.subarray(3));
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s;
  }
  function pdfDate(s) {
    const m = /D:(\d{4})(\d\d)?(\d\d)?(\d\d)?(\d\d)?(\d\d)?(Z|[+-]\d\d'?\d\d'?)?/.exec(s || ''); if (!m) return null;
    let off = 0; if (m[7] && m[7] !== 'Z') { const t = /([+-])(\d\d)'?(\d\d)/.exec(m[7]); if (t) off = (t[1] === '-' ? -1 : 1) * (+t[2] * 60 + +t[3]); }
    return new Date(Date.UTC(+m[1], +(m[2] || 1) - 1, +(m[3] || 1), +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - off * 60000);
  }
  function findSignatures(u8) {
    const txt = latin1(u8); const sigs = [];
    const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g; let m;
    while ((m = re.exec(txt))) {
      const br = [+m[1], +m[2], +m[3], +m[4]];
      if (br[0] !== 0 || br[1] <= 0 || br[2] <= br[1] || br[2] + br[3] > u8.length + 2) continue;
      const gap = txt.slice(br[1], br[2]); const g = /^\s*<([0-9A-Fa-f\s]*)>\s*$/.exec(gap);
      if (!g) continue;
      const hex = g[1].replace(/\s+/g, '');
      // CMS blobs are zero-padded to a fixed size; trim by reading the DER length
      let contents = hexToBytes(hex.length % 2 ? hex + '0' : hex);
      try { const t = readTLV(contents, 0); contents = contents.subarray(0, t.end); } catch (e) { /* leave as is */ }
      const dictStart = Math.max(0, txt.lastIndexOf('<<', m.index));
      const win = txt.slice(Math.max(dictStart, m.index - 2500), br[1]) + ' ' + txt.slice(br[2], br[2] + 1500);
      sigs.push({
        byteRange: br, contents, dict: win,
        subFilter: (/\/SubFilter\s*\/([^\s/<>\[\]()]+)/.exec(win) || [])[1] || '',
        name: pdfString(win, 'Name'), reason: pdfString(win, 'Reason'), location: pdfString(win, 'Location'), contact: pdfString(win, 'ContactInfo'),
        m: pdfDate(pdfString(win, 'M')), isDocTimeStamp: /\/Type\s*\/DocTimeStamp/.test(win)
      });
    }
    return sigs;
  }
  function trimEnd(u8) { let n = u8.length; while (n > 0 && (u8[n - 1] === 10 || u8[n - 1] === 13 || u8[n - 1] === 32 || u8[n - 1] === 0)) n--; return n; }

  const INDIAN_CA = /CCA India|\(n\)Code|nCode|eMudhra|e-Mudhra|Sify|Safescrypt|Capricorn|NIC CA|NIC Sub-CA|National Informatics|Protean|NSDL|IDRBT|TCS CA|Tata Consultancy|Pantasign|Vsign|Xtra Trust|SIFY|Verasys|CDAC|C-DAC|Indian Air Force|Indian Army|Indian Navy|India PKI|GNFC|e-Sign|eSign/i;
  const hex = u8 => Array.from(u8).map(x => x.toString(16).padStart(2, '0')).join('');

  async function checkSignature(sig, u8, fileLen) {
    const r = {
      index: 0, subFilter: sig.subFilter, fieldName: sig.name, reason: sig.reason, location: sig.location, contact: sig.contact,
      claimedTime: sig.m, isDocTimeStamp: sig.isDocTimeStamp, byteRange: sig.byteRange,
      integrity: 'unknown', signatureValid: null, coversWholeFile: false, bytesAfter: 0, problems: [], notes: [],
      chain: [], signer: null, hash: '', sigAlg: '', signTime: null, hasTimestamp: false
    };
    const br = sig.byteRange;
    const endCovered = br[2] + br[3];
    const real = trimEnd(u8);
    r.bytesAfter = Math.max(0, real - endCovered);
    r.coversWholeFile = r.bytesAfter === 0;
    if (!r.coversWholeFile) r.problems.push({ level: 'warn', code: 'APPENDED', extra: r.bytesAfter });
    let cms;
    try { cms = parseCms(sig.contents); } catch (e) { r.integrity = 'broken'; r.problems.push({ level: 'bad', code: 'CMS_PARSE', extra: e.message }); return r; }
    if (!cms.signers.length) { r.problems.push({ level: 'bad', code: 'NO_SIGNER' }); return r; }
    const si = cms.signers[0]; r.hasTimestamp = si.hasTimestamp;
    r.hash = HASH[si.digestOid] || si.digestOid;
    r.sigAlg = (SIGALG[si.sigOid] && SIGALG[si.sigOid].alg) || si.sigOid;
    if (r.hash === 'SHA-1') r.problems.push({ level: 'warn', code: 'SHA1' });
    // find signer certificate
    const certs = cms.certs;
    let signerCert = certs.find(c => (si.sidSerial && c.serial === si.sidSerial && (!si.sidIssuer || c.issuer.text === si.sidIssuer.text)));
    if (!signerCert && si.sidSki) signerCert = certs[0];
    if (!signerCert) { signerCert = certs[0]; }
    if (!signerCert) { r.problems.push({ level: 'bad', code: 'NO_CERT' }); return r; }
    r.signer = describeCert(signerCert);
    // content digest
    const part = new Uint8Array(br[1] + br[3]); part.set(u8.subarray(0, br[1]), 0); part.set(u8.subarray(br[2], br[2] + br[3]), br[1]);
    const hn = HASH[si.digestOid];
    if (!hn) { r.problems.push({ level: 'bad', code: 'HASH_UNSUPPORTED', extra: si.digestOid }); return r; }
    const contentDigest = await digest(hn, part);
    let tsInfo = null;
    if ((sig.isDocTimeStamp || /RFC3161/i.test(sig.subFilter)) && cms.eContent) {
      // a time-stamp token signs its own TSTInfo; the PDF hash lives inside TSTInfo.messageImprint
      try {
        const t = kids(readTLV(cms.eContent, 0)); const imp = kids(t[2]); const impHash = HASH[oid(kids(imp[0])[0])]; const impVal = val(imp[1]);
        const gen = t.find(x => x.tag === 0x18); tsInfo = { hash: impHash, value: impVal, genTime: gen ? parseTime(gen) : null };
      } catch (e) { tsInfo = null; }
    }
    let signedData;
    if (si.signedAttrsNode) {
      const md = si.attrs['1.2.840.113549.1.9.4'];
      const mdBytes = md ? val(md) : null;
      if (tsInfo) {
        const tokenOk = !!(mdBytes && cms.eContent && eq(mdBytes, await digest(hn, cms.eContent)));
        const docOk = !!(tsInfo.hash && eq(tsInfo.value, await digest(tsInfo.hash, part)));
        r.integrity = (tokenOk && docOk) ? 'ok' : 'broken'; r.isTimestampToken = true;
        if (tsInfo.genTime) r.signTime = tsInfo.genTime;
      } else r.integrity = (mdBytes && eq(mdBytes, contentDigest)) ? 'ok' : 'broken';
      if (r.integrity === 'broken') r.problems.push({ level: 'bad', code: 'DIGEST_MISMATCH' });
      // the signature is over the DER of the attributes with SET tag
      const ra = raw(si.signedAttrsNode).slice(); ra[0] = 0x31; signedData = ra;
      const st = si.attrs['1.2.840.113549.1.9.5'];
      if (st) { try { r.signTime = parseTime(st); } catch (e) { /* ignore */ } }
    } else { signedData = part; r.integrity = 'ok'; }
    try {
      r.signatureValid = await verifyWithCert(signerCert, hn, si.sigOid, si.signature, signedData, si.sigParams);
      if (!r.signatureValid) r.problems.push({ level: 'bad', code: 'SIG_INVALID' });
    } catch (e) { r.signatureValid = null; r.problems.push({ level: 'warn', code: 'SIG_UNCHECKED', extra: e.message }); }
    // key usage
    const ku = signerCert.ext.keyUsage;
    if (ku && !(ku.includes('digitalSignature') || ku.includes('nonRepudiation'))) r.problems.push({ level: 'warn', code: 'KEYUSAGE' });
    // validity
    const when = r.signTime || r.claimedTime;
    r.timeUsed = when; r.timeSource = r.signTime ? 'signed' : (r.claimedTime ? 'claimed' : 'none');
    if (when) {
      if (when < signerCert.notBefore) r.problems.push({ level: 'bad', code: 'NOT_YET_VALID' });
      else if (when > signerCert.notAfter) r.problems.push({ level: 'bad', code: 'EXPIRED_AT_SIGNING' });
    }
    const now = new Date();
    r.certExpiredNow = now > signerCert.notAfter;
    if (r.certExpiredNow && r.problems.every(p => p.code !== 'EXPIRED_AT_SIGNING')) r.notes.push('EXPIRED_NOW');
    // chain
    const pool = certs.slice(); const chain = [signerCert]; let cur = signerCert; const seen = new Set([signerCert.serial + signerCert.issuer.text]);
    while (!cur.selfSigned) {
      const parent = pool.find(c => c !== cur && c.subject.text === cur.issuer.text && !seen.has(c.serial + c.issuer.text));
      if (!parent) break; chain.push(parent); seen.add(parent.serial + parent.issuer.text); cur = parent;
    }
    let linksOk = true;
    for (let i = 0; i < chain.length; i++) {
      const c = chain[i]; const parent = chain[i + 1] || (c.selfSigned ? c : null); const d = describeCert(c);
      d.signedByNext = null;
      if (parent) {
        try { const hh = (SIGALG[c.outerSigAlg] || {}).hash; d.signedByNext = await verifyWithCert(parent, hh, c.outerSigAlg, c.signature, c.tbsDer); } catch (e) { d.signedByNext = null; }
        if (d.signedByNext === false) linksOk = false;
      }
      d.role = i === 0 ? 'signer' : (c.selfSigned ? 'root' : 'ca');
      r.chain.push(d);
    }
    const top = chain[chain.length - 1];
    r.chainComplete = top.selfSigned; r.chainLinksOk = linksOk;
    r.rootName = top.subject.cn; r.topIssuer = top.issuer.cn;
    r.indianCA = chain.some(c => INDIAN_CA.test(c.subject.text) || INDIAN_CA.test(c.issuer.text));
    r.cca = chain.some(c => /CCA India/i.test(c.subject.text) || /CCA India/i.test(c.issuer.text));
    if (!linksOk) r.problems.push({ level: 'bad', code: 'CHAIN_BROKEN' });
    if (!r.chainComplete) r.problems.push({ level: 'warn', code: 'CHAIN_INCOMPLETE' });
    r.revocation = { crl: signerCert.ext.crl || [], aia: signerCert.ext.aia || [] };
    r.certsEmbedded = certs.length;
    return r;
  }
  function describeCert(c) {
    return {
      subject: c.subject.text, subjectCn: c.subject.cn, subjectMap: c.subject.map, issuer: c.issuer.text, issuerCn: c.issuer.cn, serial: c.serial,
      notBefore: c.notBefore, notAfter: c.notAfter, keyBits: c.keyBits, keyAlg: c.pubAlgOid === '1.2.840.113549.1.1.1' ? 'RSA' : (c.pubAlgOid === '1.2.840.10045.2.1' ? 'ECDSA' : c.pubAlgOid),
      keyUsage: c.ext.keyUsage || null, isCA: !!c.ext.isCA, selfSigned: c.selfSigned, policies: c.ext.policies || []
    };
  }

  async function analyze(ab) {
    const u8 = ab instanceof Uint8Array ? ab : new Uint8Array(ab);
    const head = latin1(u8.subarray(0, 8));
    const report = { size: u8.length, isPdf: head.startsWith('%PDF'), encrypted: false, signatures: [], cryptoAvailable: !!subtle };
    if (!report.isPdf) return report;
    const tail = latin1(u8.subarray(Math.max(0, u8.length - 4096)));
    report.encrypted = /\/Encrypt\s/.test(tail) || /\/Encrypt\s*\d+\s+\d+\s+R/.test(tail);
    const sigs = findSignatures(u8);
    for (let i = 0; i < sigs.length; i++) { const r = await checkSignature(sigs[i], u8, u8.length); r.index = i + 1; report.signatures.push(r); }
    // a later revision may legitimately add signatures: an earlier signature not covering the whole file is normal then
    const sorted = report.signatures.slice().sort((a, b) => a.byteRange[2] + a.byteRange[3] - (b.byteRange[2] + b.byteRange[3]));
    const last = sorted[sorted.length - 1];
    report.signatures.forEach(s => { s.isLatest = s === last; });
    return report;
  }
  function signedInfo(ab) {
    const u8 = ab instanceof Uint8Array ? ab : new Uint8Array(ab);
    if (latin1(u8.subarray(0, 8)).indexOf('%PDF') !== 0) return { signed: false, count: 0 };
    let n = 0; try { n = findSignatures(u8).length; } catch (e) { n = 0; }
    return { signed: n > 0, count: n };
  }
  return { analyze, signedInfo, _internals: { parseCert, parseCms, findSignatures, readTLV } };
}));
