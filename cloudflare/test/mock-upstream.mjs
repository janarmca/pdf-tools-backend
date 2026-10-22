// Stand-in for Gemini / NVIDIA / Razorpay / Astrologer API during tests (the Worker's *_API_BASE vars point here).
// Every request is recorded in `calls` so tests can check what the Worker sent.
import http from 'node:http';
import crypto from 'node:crypto';

export const calls = [];
export const behaviour = { geminiFail: false, telegramPhotoFail: false };
export const files = [], deleted = [];

export function startMock(port = 8790) {
  const srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const bytes = Buffer.concat(chunks), body = bytes.toString();
      let j = null; try { j = JSON.parse(body); } catch {}
      calls.push({ method: req.method, url: req.url, headers: req.headers, body: j, raw: body });
      const send = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      // Gemini Files API (resumable upload)
      if (req.url.startsWith('/upload/v1beta/files')) {
        res.writeHead(200, { 'x-goog-upload-url': `http://127.0.0.1:${port}/upload-session/${files.length}` });
        files.push({ mime: req.headers['x-goog-upload-header-content-type'], declared: +req.headers['x-goog-upload-header-content-length'] });
        return res.end('{}');
      }
      if (req.url.startsWith('/upload-session/')) {
        const f = files[+req.url.split('/').pop()];
        f.size = bytes.length; f.first = bytes[0];
        return send(200, { file: { name: 'files/f' + files.indexOf(f), uri: 'mock://files/f' + files.indexOf(f), mimeType: f.mime } });
      }
      if (req.method === 'GET' && req.url.startsWith('/v1beta/files/')) return send(200, { name: req.url.split('?')[0].slice(8), state: 'ACTIVE' });
      if (req.method === 'DELETE' && req.url.startsWith('/v1beta/files/')) { deleted.push(req.url.split('?')[0]); return send(200, {}); }
      if (req.url.startsWith('/v1beta/models/')) {
        if (behaviour.geminiFail) return send(500, { error: { message: 'mock gemini down' } });
        const parts = j?.contents?.[0]?.parts || [];
        const txt = parts[0]?.text || '';
        if (/general physician/.test(txt)) return send(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ urgency: 'see_doctor_soon', urgency_reason: 'r', summary: 's', possible_causes: [{ cause: 'Viral fever', likelihood: 'high', angle: 'infection', why: 'w' }, { cause: 'x', likelihood: 'weird', angle: 'nope' }], self_care: ['rest', 3], siddha_keys: ['nilavembu', 'made_up_herb'], medicine_advice: 'paracetamol as per label', tests_to_consider: [], see_doctor_if: ['fever > 3 days'], questions_for_doctor: [], missing_info: [] }) }] } }] });
        if (/senior Tamil poster designer/.test(txt)) { calls.push({ url: req.url.split('?')[0], body: j }); return send(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ designs: [{ layout: 'band', decor: 'rays', palette: { bg1: '#b91c1c', bg2: '#f97316', accent: '#facc15', text: '#ffffff', soft: '#fff7ed' }, headline: 'தீபாவளி சலுகை', subline: 'அனைத்து புத்தாடைகளுக்கும்', highlight: '30% OFF', body: ['பட்டுச் சேலை', 'குழந்தை ஆடைகள்'], cta: 'இன்றே வாருங்கள்', emoji: '🪔', photo: true }, { layout: 'nope', palette: { bg1: 'red' }, headline: 'இரண்டாவது' }, { headline: '' }] }) }] } }] }); }
        if (/social media post/.test(txt)) return send(200, { candidates: [{ content: { parts: [{ text: '{"ta":"தமிழ் பதிவு <b>சோதனை</b>","en":"English post"}' }] } }] });
        if (/horoscope/.test(txt)) return send(200, { candidates: [{ content: { parts: [{ text: '{"name":"Kavya R","gender":"F","dob":"1999-04-12","star":"rohini","raasi":"rishabam","phone":"9876543210"}' }] } }] });
        const fd = parts.find((p) => p.file_data);
        if (fd) { const f = files[+fd.file_data.file_uri.split('/f').pop()]; return send(200, { candidates: [{ content: { parts: [{ text: `file ${f.mime} ${f.size} bytes (first ${f.first})` }] } }] }); }
        const img = parts.find((p) => p.inline_data);
        return send(200, { candidates: [{ content: { parts: [{ text: img ? `saw ${img.inline_data.mime_type} ${img.inline_data.data}` : `answer to: ${txt.slice(0, 40)}` }] } }] });
      }
      // Facebook Graph API (+ Instagram)
      if (req.url.startsWith('/graph/v23.0/')) {
        const u = new URL(req.url, 'http://x'), p = u.pathname.slice('/graph/v23.0'.length), f = new URLSearchParams(body);
        if (p === '/oauth/access_token') return send(200, u.searchParams.get('code') === 'fbcode' ? { access_token: 'short' } : u.searchParams.get('fb_exchange_token') === 'short' ? { access_token: 'long' } : { error: { message: 'bad code' } });
        if (p === '/me/accounts') return send(200, u.searchParams.get('access_token') === 'long' ? { data: [{ id: 'other', name: 'Other', access_token: 'x' }, { id: 'pg1', name: 'PDF Tools India', access_token: 'pagetok', instagram_business_account: { id: 'ig1' } }] } : { error: { message: 'bad token' } });
        if (f.get('access_token') !== 'pagetok' && u.searchParams.get('access_token') !== 'pagetok') return send(400, { error: { message: 'bad page token' } });
        if (p === '/pg1/photos') return send(200, { id: 'ph1', post_id: 'pg1_1' });
        if (p === '/pg1/feed') return send(200, { id: 'pg1_2' });
        if (p === '/ig1/media') return send(200, { id: 'c1' });
        if (p === '/c1') return send(200, { status_code: 'FINISHED', id: 'c1' });
        if (p === '/ig1/media_publish') return send(200, f.get('creation_id') === 'c1' ? { id: 'igm1' } : { error: { message: 'no container' } });
      }
      // Pinterest API v5
      if (req.url.startsWith('/pin/v5/')) {
        const p = req.url.split('?')[0].slice(4), f = new URLSearchParams(body);
        if (p === '/v5/oauth/token') {
          if (req.headers.authorization !== 'Basic ' + Buffer.from('pinapp:pinsec').toString('base64')) return send(401, { message: 'bad client' });
          if (f.get('grant_type') === 'authorization_code') return send(200, f.get('code') === 'pincode' ? { access_token: 'pa1', refresh_token: 'pr1', expires_in: 2592000 } : { message: 'bad code' });
          return send(200, f.get('refresh_token') === 'pr1' ? { access_token: 'pa2', expires_in: 2592000 } : { message: 'bad refresh' });
        }
        if (!/^Bearer pa[12]$/.test(req.headers.authorization || '')) return send(401, { message: 'bad token' });
        if (p === '/v5/boards' && req.method === 'GET') return send(200, { items: [] });
        if (p === '/v5/boards') return send(201, { id: 'b1', name: j.name });
        if (p === '/v5/pins') return send(201, j.board_id === 'b1' && j.media_source?.url ? { id: 'pin1' } : { message: 'bad pin' });
      }
      // X API v2 — checks the OAuth 1.0a signature exactly like X does
      if (req.url === '/x/2/tweets') {
        const h = Object.fromEntries((req.headers.authorization || '').replace(/^OAuth /, '').split(', ').map((kv) => kv.split('=')).map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v.slice(1, -1))]));
        const pe = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
        const params = Object.keys(h).filter((k) => k !== 'oauth_signature').sort().map((k) => `${pe(k)}=${pe(h[k])}`).join('&');
        const base = `POST&${pe(`http://127.0.0.1:${port}/x/2/tweets`)}&${pe(params)}`;
        const sig = crypto.createHmac('sha1', `${pe('xsec')}&${pe('xtoksec')}`).update(base).digest('base64');
        if (sig !== h.oauth_signature || h.oauth_consumer_key !== 'xkey' || h.oauth_token !== 'xtok') return send(401, { title: 'Unauthorized', detail: 'bad signature' });
        return send(201, { data: { id: 'tw1', text: j.text } });
      }
      // Telegram Bot API
      if (/^\/botTG-TOKEN\/send(Photo|Message)$/.test(req.url)) {
        if (req.url.endsWith('sendPhoto') && behaviour.telegramPhotoFail) return send(400, { ok: false, description: 'Bad Request: wrong file identifier/HTTP URL specified' });
        return send(200, { ok: true, result: { message_id: calls.length } });
      }
      if (req.url === '/v1/chat/completions') return send(200, { choices: [{ message: { content: 'nvidia: ' + j.messages[1].content.slice(0, 30) } }] });
      if (req.url === '/v1/orders') return send(200, { id: 'order_' + Math.random().toString(36).slice(2, 10), amount: j.amount, currency: j.currency });
      if (req.url.startsWith('/api/v5/chart-data/')) {
        const moon = { sign: 'Tau', abs_pos: 45.5, position: 15.5 };
        const subject = { sun: { sign: 'Ari', position: 10, house: 'First_House' }, moon, ascendant: { sign: 'Leo' }, mars: { sign: 'Cap', position: 2, retrograde: true } };
        if (req.url.endsWith('/transit')) return send(200, { chart_data: { transit_subject: { sun: { sign: 'Lib' } } } });
        return send(200, { chart_data: { subject } });
      }
      send(404, { error: 'mock: no route ' + req.url });
    });
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r(srv)));
}
