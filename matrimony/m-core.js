/* Core: state, i18n, helpers, router, shell */
(function () {
  'use strict';
  var C = window.MAT_CONFIG, D = window.MAT_DATA, B = window.MatBackend;
  var M = window.MAT = { views: {}, acts: {}, st: { user: null, me: null, counts: {}, lang: 'ta', ready: false }, timers: [], B: B, C: C, D: D };
  try { M.st.lang = localStorage.getItem('mat_lang') || 'ta'; } catch (e) {}
  M.t = function (ta, en) { return M.st.lang === 'en' ? en : ta; };
  M.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = M.esc, t = M.t;
  M.$ = function (s, r) { return (r || document).querySelector(s); };
  M.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  M.label = function (list, v) {
    if (v == null || v === '') return '';
    var a = (D[list] || []).filter(function (x) { return x.v === v; })[0];
    return a ? (M.st.lang === 'en' ? a.en : a.ta) : String(v);
  };
  M.opts = function (list, sel, blank) {
    return (blank === false ? '' : '<option value="">' + esc(blank || t('தேர்வு செய்க', 'Select')) + '</option>') +
      D[list].map(function (x) { return '<option value="' + esc(x.v) + '"' + (String(sel) === x.v ? ' selected' : '') + '>' + esc(M.st.lang === 'en' ? x.en : x.ta) + '</option>'; }).join('');
  };
  M.age = function (dob) { if (!dob) return ''; var d = new Date(dob), n = new Date(), a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  M.cm = function (c) { if (!c) return ''; var inch = Math.round(c / 2.54); return c + ' cm (' + Math.floor(inch / 12) + "′" + (inch % 12) + '″)'; };
  M.ago = function (iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return t('இப்போது', 'now'); if (s < 3600) return Math.floor(s / 60) + t(' நிமி', 'm'); if (s < 86400) return Math.floor(s / 3600) + t(' மணி', 'h');
    return new Date(iso).toLocaleDateString(M.st.lang === 'en' ? 'en-IN' : 'ta-IN', { day: 'numeric', month: 'short' });
  };

  M.ERR = {
    not_logged_in: ['முதலில் உள்நுழையுங்கள்', 'Please log in first'], no_profile: ['முதலில் உங்கள் சுயவிவரத்தை உருவாக்குங்கள்', 'Please create your profile first'],
    not_approved: ['உங்கள் சுயவிவரம் இன்னும் அங்கீகரிக்கப்படவில்லை', 'Your profile is not approved yet'], not_found: ['கிடைக்கவில்லை', 'Not found'],
    self: ['இது உங்கள் சொந்த சுயவிவரம்', 'This is your own profile'], age: ['திருமண வயது: ஆண் 21, பெண் 18 அல்லது அதற்கு மேல்', 'Minimum age: groom 21, bride 18'],
    dob: ['பிறந்த தேதி சரியில்லை', 'Date of birth is not valid'], gender: ['பாலினத்தைத் தேர்வு செய்க', 'Choose gender'], consent: ['விதிமுறைகளுக்கு ஒப்புதல் தேவை', 'You must accept the terms'],
    photos: ['படங்கள் சரியில்லை (அதிகபட்சம் 6)', 'Photos invalid (max 6)'], rate_limit: ['இன்றைய வரம்பை எட்டிவிட்டீர்கள், சிறிது நேரம் கழித்து முயலுங்கள்', 'Limit reached, try again later'],
    not_accepted: ['இருவரின் Interest ஏற்கப்பட்ட பின்னரே chat', 'Chat opens after the interest is accepted'], not_unlocked: ['Chat இன்னும் திறக்கப்படவில்லை', 'Chat is not unlocked yet'],
    chat_banned: ['விதிமீறல்களால் உங்கள் chat நிறுத்தப்பட்டுள்ளது. நிர்வாகியைத் தொடர்பு கொள்ளுங்கள்', 'Your chat is suspended for rule violations. Contact admin'],
    too_long: ['செய்தி மிக நீளம் (500 எழுத்துகள் வரை)', 'Message too long (max 500)'], empty: ['செய்தியை எழுதுங்கள்', 'Write a message'], forbidden: ['அனுமதி இல்லை', 'Not allowed'],
    not_installed: ['தரவுத்தளம் இன்னும் அமைக்கப்படவில்லை', 'Database is not set up yet'], error: ['பிழை ஏற்பட்டது, மீண்டும் முயலுங்கள்', 'Something went wrong, try again'],
    contact_blocked: ['தொலைபேசி எண், email, WhatsApp போன்ற தொடர்பு விவரங்களை அனுப்ப அனுமதி இல்லை', 'Phone numbers, e-mail, WhatsApp etc. are not allowed'],
    contact_in_profile: ['சுயவிவர எழுத்துகளில் தொடர்பு விவரங்கள் (எண்/email/social) இருக்கக்கூடாது', 'No contact details allowed in profile text']
  };
  M.err = function (r) { var e = M.ERR[r && r.code]; return e ? t(e[0], e[1]) : (r && r.message) || t(M.ERR.error[0], M.ERR.error[1]); };

  M.toast = function (msg, kind) {
    var el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, 3600);
  };
  M.modal = function (html, cls) {
    M.closeModal();
    var w = document.createElement('div'); w.className = 'modal'; w.id = 'modal'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="mbox ' + (cls || '') + '"><button class="mx" data-act="closeModal" aria-label="close">×</button>' + html + '</div>';
    w.addEventListener('click', function (e) { if (e.target === w) M.closeModal(); });
    document.body.appendChild(w); var f = w.querySelector('textarea,input,select,button.pri'); if (f) f.focus(); return w;
  };
  M.closeModal = function () { var m = M.$('#modal'); if (m) m.remove(); };
  M.acts.closeModal = M.closeModal;

  M.api = async function (name, args) {
    var r; try { r = await B.rpc(name, args); } catch (e) { r = { ok: false, code: 'error', message: String(e && e.message || e) }; }
    if (r && r.code === 'not_installed') M.st.notInstalled = true;
    if (r && r.code === 'not_logged_in' && M.st.user) { M.st.user = null; }
    return r || { ok: false, code: 'error' };
  };

  /* ---- photos: <img data-ph="path"> gets its (signed) URL after render ---- */
  var photoCache = {};
  M.hydrate = function (root) {
    M.$$('img[data-ph]', root || document).forEach(function (img) {
      var p = img.getAttribute('data-ph'); img.removeAttribute('data-ph');
      var go = function (u) { if (u) { img.src = u; img.classList.add('ok'); } };
      if (photoCache[p] && photoCache[p].exp > Date.now()) return go(photoCache[p].u);
      B.photoUrl(p).then(function (u) { photoCache[p] = { u: u, exp: Date.now() + 3000000 }; go(u); }).catch(function () {});
    });
  };
  M.avatar = function (c, big) {
    var ini = esc((c.name || '?').replace(/^Demo /, '').trim().charAt(0).toUpperCase());
    return '<div class="av ' + (c.gender === 'F' ? 'f' : 'm') + (big ? ' big' : '') + '"><span>' + ini + '</span>' + (c.photo ? '<img alt="" data-ph="' + esc(c.photo) + '">' : '') + '</div>';
  };
  M.sub = function (c) {
    return [c.age ? c.age + t(' வயது', ' yrs') : '', c.height_cm ? M.cm(c.height_cm) : '', M.label('education', c.education), c.occupation, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  };
  M.commLabel = function (c) { return c.community === 'other' && c.community_other ? c.community_other : M.label('community', c.community); };
  M.card = function (c) {
    var st = c.interest ? c.interest.status : '';
    var badge = st === 'accepted' ? '<span class="bdg ok">' + t('பொருத்தம் ✓', 'Matched ✓') + '</span>' : st === 'pending' ? '<span class="bdg">' + (c.interest.dir === 'in' ? t('உங்களுக்கு Interest', 'Interested in you') : t('அனுப்பப்பட்டது', 'Sent')) + '</span>' : '';
    return '<a class="pc" href="#/profile/' + esc(c.id) + '">' + M.avatar(c) +
      '<div class="pi"><div class="pn">' + esc(c.name) + (c.community === 'kannada_devanga' ? ' <span class="kd" title="Kannada Devanga">★</span>' : '') + '</div>' +
      '<div class="ps">' + esc(M.sub(c)) + '</div>' +
      '<div class="pt"><span class="tg">' + esc(M.commLabel(c)) + '</span>' + (c.star ? '<span class="tg">' + esc(M.label('star', c.star)) + '</span>' : '') + badge + '</div></div>' +
      (c.shortlisted ? '<span class="sl" title="Shortlisted">♥</span>' : '') + '</a>';
  };

  /* ---- navigation ---- */
  M.nav = function (h) { if (location.hash === h) M.route(); else location.hash = h; };
  M.clearTimers = function () { M.timers.forEach(clearInterval); M.timers = []; };
  M.go = function (h) { M.nav(h); };

  M.refreshMe = async function () {
    if (!M.st.user) { M.st.me = null; M.st.counts = {}; return; }
    var me = await M.api('mat_my_profile');
    M.st.me = me && !me.code ? me : { none: true };
    if (M.st.me && M.st.me.status === 'approved') {
      var c = await M.api('mat_counts'); M.st.counts = c && !c.code ? c : {};
    } else M.st.counts = {};
  };

  var NAV = [['search', '🔍', 'தேடல்', 'Search'], ['interests', '💌', 'Interest', 'Interests'], ['messages', '💬', 'செய்திகள்', 'Messages'], ['shortlist', '♥', 'விருப்பம்', 'Shortlist'], ['me', '👤', 'என் கணக்கு', 'Me']];
  M.shell = function () {
    var u = M.st.user, c = M.st.counts || {}, approved = M.st.me && M.st.me.status === 'approved';
    var badge = function (n, k) { return '<i class="nb" data-badge="' + k + '"' + (n > 0 ? '' : ' hidden') + '>' + (n > 99 ? '99+' : (n || 0)) + '</i>'; };
    var links = u ? NAV.map(function (n) {
      var b = n[0] === 'interests' ? badge(c.interests_in, 'interests_in') : n[0] === 'messages' ? badge(c.unread, 'unread') : '';
      return '<a href="#/' + n[0] + '" data-nav="' + n[0] + '"><span class="ic" aria-hidden="true">' + n[1] + '</span><span class="lb">' + esc(t(n[2], n[3])) + '</span>' + b + '</a>';
    }).join('') : '';
    var hd = '<header class="hd"><div class="hdin"><a class="logo" href="#/"><span class="em" aria-hidden="true">ௐ</span><span class="lt"><b>' + t('சௌடேஸ்வரி', 'Chowdeshwari') + '</b><small>' + t('திருமண அமைப்பகம்', 'Thirumana Amaippagam') + '</small></span></a>' +
      '<nav class="dn" aria-label="main">' + links + '</nav>' +
      '<div class="hr"><div class="langseg" role="group" aria-label="language"><button data-act="lang" data-v="ta" class="' + (M.st.lang === 'ta' ? 'on' : '') + '">த</button><button data-act="lang" data-v="en" class="' + (M.st.lang === 'en' ? 'on' : '') + '">EN</button></div>' +
      (u ? '' : '<a class="btn sm" href="#/login">' + t('உள்நுழை', 'Login') + '</a>') + '</div></div></header>';
    var demo = B.mode === 'demo' ? '<div class="demo">' + t('🧪 டெமோ முறை — இது உங்கள் உலாவியில் மட்டுமே இயங்கும் மாதிரி; உண்மையான தரவு இல்லை.', '🧪 Demo mode — runs only in your browser with sample data.') +
      ' <a href="#/" data-act="exitDemo">' + t('வெளியேறு', 'Exit demo') + '</a> · <a href="#/" data-act="resetDemo">' + t('மீட்டமை', 'Reset') + '</a></div>' : '';
    var tabs = u ? '<nav class="tabs" aria-label="tabs">' + links + '</nav>' : '';
    return demo + hd + '<main id="view" tabindex="-1"></main>' + tabs + M.footer();
  };
  M.footer = function () {
    return '<footer class="ft"><div class="ftin"><div><b>' + t('சௌடேஸ்வரி திருமண அமைப்பகம்', 'Chowdeshwari Thirumana Amaippagam') + '</b><p>' + t('கன்னட தேவாங்கர் சமூகத்திற்காக உருவாக்கப்பட்டது — அனைத்து சமூகத்தினருக்கும் திறந்தது.', 'Built for the Kannada Devanga community — open to all communities.') + '</p></div>' +
      '<div class="fl"><a href="#/safety">' + t('பாதுகாப்பு', 'Safety') + '</a><a href="#/terms">' + t('விதிமுறைகள்', 'Terms') + '</a><a href="#/privacy">' + t('தனியுரிமை', 'Privacy') + '</a><a href="../">' + t('PDF Tools இந்தியா', 'PDF Tools India') + '</a>' +
      (C.SUPPORT_WHATSAPP ? '<a href="https://wa.me/' + esc(C.SUPPORT_WHATSAPP) + '" rel="noopener">' + t('உதவி', 'Help') + '</a>' : '<a href="mailto:' + esc(C.SUPPORT_EMAIL) + '">' + t('உதவி', 'Help') + '</a>') + '</div></div></footer>';
  };
  M.mountShell = function () {
    document.getElementById('app').innerHTML = M.shell();
    document.body.classList.toggle('li', !!M.st.user);
    M.markNav();
  };
  M.markNav = function () {
    var r = (location.hash.replace(/^#\/?/, '').split('/')[0]) || '';
    var key = r === 'chat' ? 'messages' : r === 'profile' || r === 'wizard' || r === 'settings' || r === 'admin' ? 'me' : r;
    M.$$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === key); });
  };

  var PUBLIC = { '': 1, login: 1, register: 1, terms: 1, privacy: 1, safety: 1, about: 1, forgot: 1 };
  M.route = async function () {
    M.clearTimers();
    var parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/'), name = parts[0] || '', arg = parts[1];
    var view = $v();
    if (!M.st.ready) return;
    if (M.st.notInstalled && !M.st.shownSetup) { /* handled in home */ }
    if (!PUBLIC[name] && !M.st.user) { sessionStorage.setItem('mat_next', location.hash); return M.nav('#/login'); }
    if (M.st.user && !M.st.me) await M.refreshMe();
    var needsProfile = !PUBLIC[name] && name !== 'wizard' && name !== 'settings' && name !== 'me' && name !== 'admin';
    if (M.st.user && M.st.me && M.st.me.none && needsProfile) return M.nav('#/wizard');
    var fn = M.views[name === '' ? (M.st.user ? 'dash' : 'home') : name];
    if (!fn) fn = M.views.notfound;
    var seq = M.seq = (M.seq || 0) + 1;
    var holder = document.createElement('div'); holder.className = 'vh';
    holder.innerHTML = '<div class="loading">…</div>'; view.replaceChildren(holder);   // a newer navigation detaches this holder, so a slow older view can never overwrite it
    try { await fn(holder, arg, parts.slice(1)); } catch (e) { console.error(e); if (seq === M.seq) holder.innerHTML = '<div class="wrap"><p class="err">' + esc(t('பிழை ஏற்பட்டது. பக்கத்தை refresh செய்யுங்கள்.', 'Something went wrong. Please refresh.')) + '</p></div>'; }
    if (seq !== M.seq) return;
    M.hydrate(holder); M.markNav();
    document.title = (M.pageTitle || t('சௌடேஸ்வரி திருமண அமைப்பகம்', 'Chowdeshwari Thirumana Amaippagam')) + ' | ' + t('சௌடேஸ்வரி திருமண அமைப்பகம்', 'Chowdeshwari Matrimony');
    M.pageTitle = '';
    window.scrollTo(0, 0);
  };
  function $v() { return document.getElementById('view'); }

  /* ---- event delegation ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var f = M.acts[a.getAttribute('data-act')]; if (f) { if (a.tagName === 'A' && a.getAttribute('href') === '#/') { /* let hash change */ } else if (a.tagName === 'A') e.preventDefault(); f(a, e); }
  });
  M.acts.lang = function (a) {
    M.st.lang = a.getAttribute('data-v'); try { localStorage.setItem('mat_lang', M.st.lang); } catch (e) {}
    document.documentElement.lang = M.st.lang === 'en' ? 'en' : 'ta'; M.mountShell(); M.route();
  };
  M.acts.exitDemo = function () { try { localStorage.removeItem('mat_demo'); } catch (e) {} location.href = location.pathname + '?demo=0'; };
  M.acts.resetDemo = function () { if (confirm(t('டெமோ தரவு அனைத்தும் அழிக்கப்படும். தொடரவா?', 'All demo data will be erased. Continue?'))) B.resetDemo(); };

  M.setUser = async function (u) {
    M.st.user = u; M.st.me = null; await M.refreshMe(); M.mountShell();
  };

  M.updateBadges = function () {
    M.$$('[data-badge]').forEach(function (el) { var n = (M.st.counts || {})[el.getAttribute('data-badge')] || 0; el.hidden = !(n > 0); el.textContent = n > 99 ? '99+' : n; });
  };
  M.pollCounts = async function () {
    if (!M.st.user || !M.st.me || M.st.me.status !== 'approved' || document.hidden) return;
    var c = await M.api('mat_counts'); if (c && !c.code) { M.st.counts = c; M.updateBadges(); }
  };

  M.start = async function () {
    document.documentElement.lang = M.st.lang === 'en' ? 'en' : 'ta';
    document.getElementById('app').innerHTML = '<div class="boot">…</div>';
    try {
      await B.init();
      M.st.user = await B.user();
      await M.refreshMe();
    } catch (e) { console.error(e); M.st.bootError = String(e && e.message || e); }
    B.onAuth(async function (u) {
      var changed = (u && u.id) !== (M.st.user && M.st.user.id);
      if (!changed) return; await M.setUser(u);
      if (!/^#\/(login|register|forgot)/.test(location.hash)) M.route();   // the login/register forms navigate by themselves
    });
    B.onRecovery(function () {
      var w = M.modal('<h2>' + t('புதிய கடவுச்சொல்', 'Set a new password') + '</h2><label class="fld"><span>' + t('புதிய கடவுச்சொல் (8+ எழுத்து)', 'New password (8+ characters)') + '</span><input id="np" type="password" autocomplete="new-password" minlength="8"></label><p class="err" id="nperr"></p><button class="btn pri full" id="npok">' + t('சேமி', 'Save') + '</button>');
      M.$('#npok', w).addEventListener('click', async function () {
        var pw = M.$('#np').value; if (pw.length < 8) { M.$('#nperr').textContent = t('குறைந்தது 8 எழுத்து', 'At least 8 characters'); return; }
        var r = await B.setPassword(pw); if (r.ok) { M.closeModal(); M.toast(t('கடவுச்சொல் மாற்றப்பட்டது ✓', 'Password changed ✓'), 'ok'); } else M.$('#nperr').textContent = r.message || '';
      });
    });
    M.st.ready = true; M.mountShell();
    window.addEventListener('hashchange', function () { M.markNav(); M.route(); });
    M.route();
    setInterval(M.pollCounts, 30000);
  };
})();
