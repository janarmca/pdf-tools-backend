// node tests/watch-tax-rules.test.mjs — local mock server, no internet
import http from 'node:http';
import { checkSources, normalise, markdown } from '../.github/scripts/watch-tax-rules.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
let page = '<html><script>var t=1</script><body><h1>Form 138</h1><p>Due 31 July</p><!-- c --></body></html>', down = false;
const srv = http.createServer((q, r) => {
  if (down) { r.writeHead(503); return r.end('x'); }
  if (q.url === '/a') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(page); }
  if (q.url === '/p') { r.writeHead(200, { 'content-type': 'application/pdf' }); return r.end(Buffer.from('%PDF-1.4 fixed bytes ' + 'x'.repeat(500))); }
  r.writeHead(404); r.end('no');
}).listen(0);
const port = srv.address().port; const S = [{ id: 'a', title: 'A', url: `http://127.0.0.1:${port}/a` }, { id: 'p', title: 'P', url: `http://127.0.0.1:${port}/p` }];
ok(normalise('<p>Hello&nbsp;<b>world</b></p><script>x()</script>') === 'Hello world', 'normalise keeps visible text only');
let r = await checkSources(S, {}); ok(r.report.every(x => x.status === 'new') && !r.changed, 'first run records a baseline, no alert');
let lock = r.next;
r = await checkSources(S, lock); ok(r.report.every(x => x.status === 'unchanged') && !r.changed, 'second run: unchanged');
page = page.replace('var t=1', 'var t=2'); r = await checkSources(S, lock); ok(!r.changed, 'script-only change is ignored');
page = page.replace('31 July', '31 August'); r = await checkSources(S, lock); ok(r.changed && r.report[0].status === 'changed' && r.report[1].status === 'unchanged', 'visible text change is reported');
ok(/changed/.test(markdown(r)) && /Re-verify/i.test(markdown(r)), 'report explains what to do');
lock = r.next; down = true;
r = await checkSources(S, lock); ok(r.report.every(x => x.status === 'unreachable') && !r.changed && r.next.allDownStreak === 1, 'unreachable pages do not raise a change alert');
ok(r.next.sources.a.hash === lock.sources.a.hash, 'old baseline kept when unreachable');
for (let i = 0; i < 3; i++) r = await checkSources(S, r.next); ok(r.alertDown, 'after 4 weeks fully unreachable a separate alert is raised');
down = false; r = await checkSources(S, r.next); ok(!r.alertDown && r.next.allDownStreak === 0 && !r.changed, 'recovers quietly');
srv.close(); console.log(fail ? 'FAILED ' + fail : 'ALL WATCHER TESTS PASS'); process.exit(fail ? 1 : 0);
