/* Backend adapter. Two modes with the SAME function names/arguments:
 *   live  -> Cloudflare Worker pdf-tools-api (login, matrimony functions, photos) + your Cloud Run server for the Rs 50 payment
 *   demo  -> real schema.sql running inside the browser (PGlite) — for trying the site without any setup (?demo=1)
 */
(function () {
  'use strict';
  var C = window.MAT_CONFIG, demo = /[?&]demo=1/.test(location.search) || (function () { try { return localStorage.getItem('mat_demo') === '1'; } catch (e) { return false; } })();
  if (/[?&]demo=0/.test(location.search)) { demo = false; try { localStorage.removeItem('mat_demo'); } catch (e) {} }
  if (demo) try { localStorage.setItem('mat_demo', '1'); } catch (e) {}
  var B = { mode: demo ? 'demo' : 'live' }, listeners = [];
  function emit(u) { listeners.forEach(function (f) { try { f(u); } catch (e) {} }); }
  B.onAuth = function (f) { listeners.push(f); };
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); }); }

  /* ======================= LIVE (Cloudflare Worker) ======================= */
  var sb;
  async function authHeader() { var s = (await sb.auth.getSession()).data.session; return s ? { Authorization: 'Bearer ' + s.access_token } : {}; }
  var live = {
    init: async function () {
      if (!window.CfAuth) await loadScript('/cf-auth.js?v=1');
      sb = window.CfAuth.createClient(C.API_URL);
      sb.auth.onAuthStateChange(function (ev, session) {
        emit(session ? { id: session.user.id, email: session.user.email } : null);
      });
    },
    user: async function () { var r = await sb.auth.getSession(); var s = r.data && r.data.session; return s ? { id: s.user.id, email: s.user.email } : null; },
    // login = 6-digit code by e-mail (no passwords) or Google
    sendCode: async function (email) { var r = await sb.auth.signInWithOtp({ email: email }); return r.error ? { ok: false, message: r.error.message, status: r.error.status } : { ok: true }; },
    verifyCode: async function (email, code) { var r = await sb.auth.verifyOtp({ email: email, token: code, type: 'email' }); return r.error ? { ok: false, message: r.error.message } : { ok: true }; },
    google: async function () { await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: C.SITE_URL } }); return { ok: true }; },
    signOut: async function () { await sb.auth.signOut(); },
    rpc: async function (name, args) {
      var r = await sb.rpc(name, args || {});
      if (r.error) {
        var m = r.error.message || '';
        if (r.error.status === 404) return { ok: false, code: 'not_installed' };
        if (r.error.status === 401 || /JWT|not_logged_in/i.test(m)) return { ok: false, code: 'not_logged_in' };
        return { ok: false, code: 'error', message: m };
      }
      return r.data;
    },
    // the server picks the file name: <your user id>/... or submissions/... (public sign-up form)
    uploadPhoto: async function (blob, uid) {
      var folder = uid === 'submissions' ? 'submissions' : 'me';
      var h = folder === 'me' ? await authHeader() : {};
      h['Content-Type'] = blob.type || 'image/jpeg';
      var r = await fetch(C.API_URL + '/mat/photo?folder=' + folder, { method: 'POST', headers: h, body: blob });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'upload failed');
      return j.path;
    },
    removePhoto: async function (path) {
      try { await fetch(C.API_URL + '/mat/photo?path=' + encodeURIComponent(path), { method: 'DELETE', headers: await authHeader() }); } catch (e) {}
    },
    photoUrl: async function (path) {
      var r = await fetch(C.API_URL + '/mat/photo-url?path=' + encodeURIComponent(path), { headers: await authHeader() });
      var j = await r.json().catch(function () { return {}; });
      return j.url || '';
    },
    jathagam: async function (file) {
      var s = (await sb.auth.getSession()).data.session; if (!s) return { ok: false, code: 'not_logged_in' };
      var fd = new FormData(); fd.append('file', file);
      try {
        var r = await fetch(C.BACKEND_URL + '/api/matrimony/jathagam-extract', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token }, body: fd });
        var j = await r.json().catch(function () { return {}; });
        if (r.status === 402) return { ok: false, code: 'no_credits', message: j.error };
        if (!r.ok) return { ok: false, code: 'ai_failed', message: j.error || 'AI error' };
        return { ok: true, fields: j.fields || {}, credits: j.credits };
      } catch (e) { return { ok: false, code: 'network', message: String(e.message || e) }; }
    },
    pay: async function (otherId) {
      var s = (await sb.auth.getSession()).data.session; if (!s) return { ok: false, code: 'not_logged_in' };
      var H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token };
      var r = await fetch(C.BACKEND_URL + '/api/matrimony/create-order', { method: 'POST', headers: H, body: JSON.stringify({ other_id: otherId }) });
      var o = await r.json().catch(function () { return {}; });
      if (!r.ok) return { ok: false, message: o.error || 'order error' };
      if (o.unlocked) return { ok: true };
      if (!window.Razorpay) await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      return new Promise(function (resolve) {
        var done = false;
        var rz = new window.Razorpay({
          key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: 'ஸ்ரீ சௌடேஸ்வரி திருமண அமைப்பகம்', description: 'Chat unlock',
          prefill: { email: s.user.email }, theme: { color: '#7A1233' },
          modal: { ondismiss: function () { if (!done) resolve({ ok: false, code: 'cancelled' }); } },
          handler: async function (resp) {
            done = true;
            var v = await fetch(C.BACKEND_URL + '/api/matrimony/verify', { method: 'POST', headers: H, body: JSON.stringify(resp) });
            var j = await v.json().catch(function () { return {}; });
            resolve(v.ok ? { ok: true } : { ok: false, message: j.error || 'verify error' });
          }
        });
        rz.open();
      });
    }
  };

  /* ======================= DEMO (PGlite in the browser) ======================= */
  var db, queue = Promise.resolve(), demoUid = null;
  var PGLITE = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.8/dist/index.js';
  function serial(fn) { var p = queue.then(fn, fn); queue = p.catch(function () {}); return p; }
  function jv(a) { return a !== null && typeof a === 'object' ? JSON.stringify(a) : a; }
  async function asRole(role, uid, fn) {
    return serial(async function () {
      await db.exec('set role ' + role);
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
      try { return await fn(); } finally { await db.exec('reset role'); }
    });
  }
  var demoImpl = {
    init: async function () {
      var mod = await import(window.MAT_PGLITE_URL || PGLITE);
      db = new mod.PGlite(window.MAT_PGLITE_DATADIR || 'idb://mat-demo-v1');
      await db.waitReady;
      var has = (await db.query("select to_regclass('public.mat_profiles') as t")).rows[0].t;
      if (!has) {
        await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin; create schema auth;" +
          "create table auth.users (id uuid primary key default gen_random_uuid(), email text);" +
          "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;" +
          "create table public.demo_users (id uuid primary key, email text unique, pw text);" +
          "create table public.demo_photos (path text primary key, data text);" +
          "grant usage on schema public, auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;" +
          "grant select, insert on public.demo_photos to authenticated;");
        var sql = await (await fetch('supabase/schema.sql')).text();
        await db.exec(sql);
        await seed();
      }
      demoUid = null; try { demoUid = localStorage.getItem('mat_demo_uid'); } catch (e) {}
    },
    user: async function () { if (!demoUid) return null; var r = await serial(function () { return db.query('select id, email from demo_users where id = $1', [demoUid]); }); return r.rows[0] || null; },
    // demo login: the "e-mail code" is always 123456 (nothing is really sent)
    sendCode: async function () { return { ok: true, demo: true }; },
    verifyCode: async function (email, code) {
      if (String(code) !== '123456') return { ok: false, message: 'Wrong code' };
      email = String(email).trim().toLowerCase();
      var id = await serial(async function () {
        var ex = await db.query('select id from demo_users where email = $1', [email]);
        if (ex.rows.length) return ex.rows[0].id;
        var nid = (await db.query('insert into auth.users(email) values ($1) returning id', [email])).rows[0].id;
        await db.query('insert into demo_users(id, email, pw) values ($1,$2,$3)', [nid, email, '']);
        return nid;
      });
      demoUid = id; try { localStorage.setItem('mat_demo_uid', id); } catch (e) {} emit({ id: id, email: email });
      return { ok: true };
    },
    google: async function () { return { ok: false, message: 'Google sign-in is not available in demo mode' }; },
    signOut: async function () { demoUid = null; try { localStorage.removeItem('mat_demo_uid'); } catch (e) {} emit(null); },
    rpc: async function (name, args) {
      args = args || {}; var keys = Object.keys(args);
      var sql = 'select ' + name + '(' + keys.map(function (k, i) { return k + ' => $' + (i + 1); }).join(', ') + ') as r';
      try {
        var rows = await asRole(demoUid ? 'authenticated' : 'anon', demoUid, async function () { return (await db.query(sql, keys.map(function (k) { return jv(args[k]); }))).rows; });
        return rows[0].r;
      } catch (e) {
        if (/does not exist/i.test(e.message)) return { ok: false, code: 'not_installed' };
        return { ok: false, code: 'error', message: e.message };
      }
    },
    uploadPhoto: async function (blob, uid) {
      var data = await new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(blob); });
      var path = uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
      await serial(function () { return db.query('insert into demo_photos(path, data) values ($1,$2)', [path, data]); });
      return path;
    },
    removePhoto: async function () {},
    photoUrl: async function (path) {
      if (/^data:|^https?:/.test(path)) return path;
      var r = await serial(function () { return db.query('select data from demo_photos where path = $1', [path]); });
      return r.rows[0] ? r.rows[0].data : '';
    },
    jathagam: async function (file) {
      if (!window.confirm('டெமோ முறை: AI ஜாதகம் படித்ததாகக் கருதி மாதிரி விவரங்களை நிரப்பவா? (உண்மையில் 2 credits)\nDemo mode: simulate the AI reading the horoscope?')) return { ok: false, code: 'cancelled' };
      return { ok: true, credits: 2, fields: { name: 'Kavya', gender: 'F', dob: '1999-04-12', star: 'rohini', raasi: 'rishabam' } };
    },
    pay: async function (otherId) {
      if (!window.confirm('டெமோ முறை: ₹50 செலுத்தியதாகக் கருதி chat திறக்கவா?\nDemo mode: pretend ₹50 was paid and unlock chat?')) return { ok: false, code: 'cancelled' };
      var r = await asRole('service_role', '', async function () { return (await db.query("select mat_record_unlock($1, $2, $3, $4, $5, 5000) as r", [demoUid, otherId, demoUid, 'demo_order_' + Date.now(), 'demo_pay_' + Date.now()])).rows[0].r; });
      return r.ok ? { ok: true } : { ok: false, message: r.code };
    },
    resetDemo: async function () {
      try { await db.close(); } catch (e) {}
      await new Promise(function (res) { var q = indexedDB.deleteDatabase('/pglite/mat-demo-v1'); q.onsuccess = q.onerror = q.onblocked = res; });
      try { localStorage.removeItem('mat_demo_uid'); } catch (e) {}
      location.reload();
    }
  };

  /* demo sample members — clearly fake */
  async function seed() {
    var M = [
      ['Demo Arun K', 'M', '1994-03-12', 'kannada_devanga', 'Salem', 'Tamil Nadu', 'be', 'Software engineer', 172, 'bharani', 'mesham'],
      ['Demo Vijay R', 'M', '1992-08-21', 'kannada_devanga', 'Erode', 'Tamil Nadu', 'mba', 'Textile business', 175, 'rohini', 'rishabam'],
      ['Demo Kiran S', 'M', '1996-01-05', 'kannada_devanga', 'Bengaluru', 'Karnataka', 'be', 'Product manager', 178, 'hastham', 'kanni'],
      ['Demo Suresh M', 'M', '1990-11-30', 'devanga_other', 'Coimbatore', 'Tamil Nadu', 'diploma', 'Mill supervisor', 168, 'swathi', 'thulam'],
      ['Demo Manoj P', 'M', '1995-06-17', 'mudaliar', 'Chennai', 'Tamil Nadu', 'ca', 'Chartered accountant', 174, 'pooram', 'simmam'],
      ['Demo Ravi N', 'M', '1993-02-09', 'nadar', 'Madurai', 'Tamil Nadu', 'pg', 'School teacher', 170, 'uthiram', 'kanni'],
      ['Demo Prakash D', 'M', '1991-09-25', 'kannada_devanga', 'Hosur', 'Tamil Nadu', 'be', 'Mechanical engineer', 176, 'anusham', 'viruchigam']
    ];
    var F = [
      ['Demo Priya A', 'F', '1997-04-18', 'kannada_devanga', 'Salem', 'Tamil Nadu', 'ug', 'Bank officer', 160, 'ashwini', 'mesham'],
      ['Demo Kavya R', 'F', '1998-12-02', 'kannada_devanga', 'Bengaluru', 'Karnataka', 'be', 'Software engineer', 163, 'revathi', 'meenam'],
      ['Demo Divya S', 'F', '1995-07-14', 'kannada_devanga', 'Erode', 'Tamil Nadu', 'pg', 'Lecturer', 158, 'pusam', 'kadagam'],
      ['Demo Meena T', 'F', '1999-10-09', 'devanga_other', 'Tiruppur', 'Tamil Nadu', 'ug', 'Garment designer', 155, 'chithirai', 'kanni'],
      ['Demo Lakshmi V', 'F', '1996-05-27', 'chettiar', 'Karaikudi', 'Tamil Nadu', 'medical', 'Staff nurse', 162, 'moolam', 'dhanusu'],
      ['Demo Anitha G', 'F', '1994-03-03', 'kannada_devanga', 'Mysuru', 'Karnataka', 'mba', 'HR manager', 165, 'magam', 'simmam'],
      ['Demo Sowmya B', 'F', '2000-01-21', 'gounder', 'Namakkal', 'Tamil Nadu', 'be', 'Civil engineer', 159, 'karthigai', 'rishabam']
    ];
    var n = 0;
    for (var row of M.concat(F)) {
      n++;
      var u = (await db.query("insert into auth.users(email) values ($1) returning id", ['demo' + n + '@example.invalid'])).rows[0].id;
      await db.query("insert into mat_profiles(user_id, name, gender, dob, community, city, state, education, occupation, height_cm, star, raasi, kulam, about, consent_at, status, diet, family_type) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now(), 'approved', $15, 'nuclear')",
        [u, row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9] === 'karthigai' ? 'krittika' : row[9], row[10], row[3] === 'kannada_devanga' ? 'Demo kulam' : null, 'இது ஒரு மாதிரி (demo) சுயவிவரம் — உண்மையான நபர் அல்லர். This is a sample profile for trying the site.', n % 3 ? 'veg' : 'nonveg']);
    }
    var adm = (await db.query("insert into auth.users(email) values ('admin@demo.test') returning id")).rows[0].id;
    await db.query("insert into demo_users(id,email,pw) values ($1,'admin@demo.test','admin123')", [adm]);
    await db.query("insert into mat_admins values ($1)", [adm]);
  }

  var impl = demo ? demoImpl : live;
  ['init', 'user', 'sendCode', 'verifyCode', 'google', 'signOut', 'rpc', 'uploadPhoto', 'removePhoto', 'photoUrl', 'pay', 'jathagam'].forEach(function (k) { B[k] = function () { return impl[k].apply(null, arguments); }; });
  B.resetDemo = demoImpl.resetDemo;
  window.MatBackend = B;
})();
