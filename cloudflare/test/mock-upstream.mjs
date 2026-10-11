// Stand-in for Gemini / NVIDIA / Razorpay / Astrologer API during tests (the Worker's *_API_BASE vars point here).
// Every request is recorded in `calls` so tests can check what the Worker sent.
import http from 'node:http';

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
      calls.push({ method: req.method, url: req.url, headers: req.headers, body: j });
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
      if (req.method === 'DELETE' && req.url.startsWith('/v1beta/files/')) { deleted.push(req.url.split('?')[0]); return send(200, {}); }
      if (req.url.startsWith('/v1beta/models/')) {
        if (behaviour.geminiFail) return send(500, { error: { message: 'mock gemini down' } });
        const parts = j?.contents?.[0]?.parts || [];
        const txt = parts[0]?.text || '';
        if (/social media post/.test(txt)) return send(200, { candidates: [{ content: { parts: [{ text: '{"ta":"தமிழ் பதிவு <b>சோதனை</b>","en":"English post"}' }] } }] });
        if (/horoscope/.test(txt)) return send(200, { candidates: [{ content: { parts: [{ text: '{"name":"Kavya R","gender":"F","dob":"1999-04-12","star":"rohini","raasi":"rishabam","phone":"9876543210"}' }] } }] });
        const fd = parts.find((p) => p.file_data);
        if (fd) { const f = files[+fd.file_data.file_uri.split('/f').pop()]; return send(200, { candidates: [{ content: { parts: [{ text: `file ${f.mime} ${f.size} bytes (first ${f.first})` }] } }] }); }
        const img = parts.find((p) => p.inline_data);
        return send(200, { candidates: [{ content: { parts: [{ text: img ? `saw ${img.inline_data.mime_type} ${img.inline_data.data}` : `answer to: ${txt.slice(0, 40)}` }] } }] });
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
