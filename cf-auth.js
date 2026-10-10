/* cf-auth.js — login client for the pdf-tools-api Cloudflare Worker (replaces supabase-js).
 * Exposes window.supabase.createClient(url) with supabase-js style `auth` methods and { data, error } answers:
 * getSession, onAuthStateChange, signInWithOtp + verifyOtp (6-digit e-mail code — there are no passwords),
 * signInWithOAuth (Google), signOut.
 * Also: client.rpc(name, args) -> POST <url>/mat/rpc/<name> (matrimony functions).
 */
(function () {
  'use strict';
  var KEY = 'cf-auth-session';

  function decodeJwt(t) {
    try {
      var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(p + '==='.slice((p.length + 3) % 4)))));
    } catch (e) { return null; }
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function store(s) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {} }
  function errObj(message, status) { return { message: message || 'Something went wrong', status: status || 0, name: 'AuthApiError' }; }

  function createClient(url) {
    var base = String(url || '').replace(/\/$/, ''), auth = base + '/auth/v1';
    var session = load(), listeners = [], pending = null, timer = null, refreshing = null;

    function emit(ev, s) { listeners.slice().forEach(function (f) { try { f(ev, s); } catch (e) { console.error(e); } }); }
    function setSession(s, ev) { session = s; store(s); schedule(); if (ev) emit(ev, s); }

    async function call(path, body, token, method) {
      var h = { 'Content-Type': 'application/json' };
      if (token) h.Authorization = 'Bearer ' + token;
      var r = await fetch(auth + path, { method: method || 'POST', headers: h, body: body ? JSON.stringify(body) : undefined });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw errObj(j.error || j.message || ('Error ' + r.status), r.status);
      return j;
    }

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!session || !session.expires_at) return;
      var ms = session.expires_at * 1000 - Date.now() - 60000;
      timer = setTimeout(function () { refresh().catch(function () {}); }, Math.max(ms, 1000));
    }

    async function refresh() {
      if (refreshing) return refreshing;
      var used = session && session.refresh_token;
      if (!used) return null;
      refreshing = (async function () {
        try {
          setSession(await call('/token?grant_type=refresh_token', { refresh_token: used }), 'TOKEN_REFRESHED');
          return session;
        } catch (e) {
          // another tab may have rotated the token already — use its newer session
          var other = load();
          if (other && other.refresh_token !== used && other.expires_at * 1000 > Date.now()) { session = other; schedule(); return session; }
          if (e.status === 401) setSession(null, 'SIGNED_OUT');
          return null;
        } finally { refreshing = null; }
      })();
      return refreshing;
    }

    async function current() {
      if (session && session.expires_at * 1000 - Date.now() < 60000) await refresh();
      return session;
    }

    // tokens handed back in the URL hash after Google sign-in
    (function readHash() {
      if (!/access_token=|error_description=/.test(location.hash)) return;
      var q = new URLSearchParams(location.hash.slice(1));
      var at = q.get('access_token');
      if (at) {
        var c = decodeJwt(at) || {};
        var s = { access_token: at, refresh_token: q.get('refresh_token'), token_type: 'bearer', expires_in: +q.get('expires_in') || 3600,
                  expires_at: +q.get('expires_at') || c.exp, user: { id: c.sub, email: c.email } };
        session = s; store(s);
        pending = 'SIGNED_IN';
      } else if (q.get('error_description')) {
        setTimeout(function () { try { alert(q.get('error_description')); } catch (e) {} }, 300);
      }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    })();
    schedule();

    // keep tabs in step
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      var s = load(), had = !!session;
      session = s; schedule();
      if (!s && had) emit('SIGNED_OUT', null);
      else if (s && !had) emit('SIGNED_IN', s);
    });

    var client = {
      auth: {
        getSession: async function () { return { data: { session: await current() }, error: null }; },
        getUser: async function () { var s = await current(); return { data: { user: s ? s.user : null }, error: null }; },
        onAuthStateChange: function (cb) {
          listeners.push(cb);
          setTimeout(function () {
            cb('INITIAL_SESSION', session);
            if (pending) cb(pending, session);
          }, 0);
          return { data: { subscription: { unsubscribe: function () { listeners = listeners.filter(function (f) { return f !== cb; }); } } } };
        },
        // step 1: e-mail a 6-digit code (a new address gets a new account on first sign-in)
        signInWithOtp: async function (o) {
          try { await call('/otp', { email: o.email }); return { data: {}, error: null }; }
          catch (e) { return { data: null, error: e }; }
        },
        // step 2: the code -> session
        verifyOtp: async function (o) {
          try {
            var s = await call('/verify', { email: o.email, token: o.token, type: o.type || 'email' });
            setSession(s, 'SIGNED_IN');
            return { data: { session: s, user: s.user }, error: null };
          } catch (e) { return { data: { session: null, user: null }, error: e }; }
        },
        signInWithOAuth: async function (o) {
          var to = (o.options && o.options.redirectTo) || location.href.split('#')[0];
          location.assign(auth + '/authorize?provider=' + encodeURIComponent(o.provider) + '&redirect_to=' + encodeURIComponent(to));
          return { data: { provider: o.provider }, error: null };
        },
        signOut: async function () {
          var s = session;
          setSession(null, 'SIGNED_OUT');
          if (s && s.refresh_token) { try { await call('/logout', { refresh_token: s.refresh_token }, s.access_token); } catch (e) {} }
          return { error: null };
        }
      },
      // matrimony functions: same { data, error } shape as supabase.rpc
      rpc: async function (name, args) {
        var s = await current(), h = { 'Content-Type': 'application/json' };
        if (s) h.Authorization = 'Bearer ' + s.access_token;
        try {
          var r = await fetch(base + '/mat/rpc/' + encodeURIComponent(name), { method: 'POST', headers: h, body: JSON.stringify(args || {}) });
          var j = await r.json().catch(function () { return null; });
          if (!r.ok) return { data: null, error: errObj((j && j.error) || ('Error ' + r.status), r.status) };
          return { data: j, error: null };
        } catch (e) { return { data: null, error: errObj(String(e.message || e)) }; }
      },
      apiUrl: base
    };
    return client;
  }

  window.supabase = { createClient: createClient };
  window.CfAuth = { createClient: createClient };
})();
