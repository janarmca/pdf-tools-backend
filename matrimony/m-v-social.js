/* Dashboard, search, interests, shortlist, messages, chat */
(function () {
  'use strict';
  var M = window.MAT, t = M.t, esc = M.esc, B = M.B, F = window.MatFilter;
  var FLT = 'mat_filters';

  function gate(v) {
    var me = M.st.me;
    if (!me || me.none) { M.nav('#/wizard'); return false; }
    if (me.status !== 'approved') {
      var msg = me.status === 'pending' ? t('உங்கள் சுயவிவரம் நிர்வாகியின் சரிபார்ப்புக்காகக் காத்திருக்கிறது (பொதுவாக 24 மணி நேரத்தில்). அதுவரை தேடல், Interest, Chat கிடைக்காது.', 'Your profile is waiting for admin verification (usually within 24 hours). Search, interest and chat unlock after approval.') :
        me.status === 'rejected' ? t('உங்கள் சுயவிவரம் நிராகரிக்கப்பட்டது.', 'Your profile was rejected.') + (me.admin_note ? ' ' + me.admin_note : '') : t('உங்கள் சுயவிவரம் மறைக்கப்பட்டுள்ளது. "என் கணக்கு"-ல் மீண்டும் காட்டலாம்.', 'Your profile is hidden. Show it again from My account.');
      v.innerHTML = '<div class="wrap narrow"><div class="box c"><div class="big-ic">' + (me.status === 'pending' ? '⏳' : '🙈') + '</div><p>' + esc(msg) + '</p><div class="rowb"><a class="btn" href="#/profile/' + esc(M.st.user.id) + '">' + t('என் சுயவிவரம்', 'My profile') + '</a><a class="btn ghost" href="#/wizard">' + t('திருத்து', 'Edit') + '</a></div></div></div>';
      return false;
    }
    return true;
  }
  M.gate = gate;
  function grid(items, empty) { return items.length ? '<div class="pgridc">' + items.map(M.card).join('') + '</div>' : '<p class="mut c pad">' + esc(empty) + '</p>'; }

  M.views.dash = async function (v) {
    if (!gate(v)) return;
    var me = M.st.me, c = M.st.counts || {}, pref = me.pref || {};
    var f = {}; if (pref.min_age) f.min_age = pref.min_age; if (pref.max_age) f.max_age = pref.max_age; if (pref.community && pref.community.length) f.community = pref.community; if (pref.marital && pref.marital.length) f.marital = pref.marital;
    var r = await M.api('mat_search', { f: f, lim: 6, off: 0 });
    var nw = await M.api('mat_search', { f: {}, lim: 6, off: 0 });
    if (!v.isConnected) return;
    v.innerHTML = '<div class="wrap"><h1 class="h2">' + t('வணக்கம், ', 'Welcome, ') + esc(me.name) + ' 👋</h1>' +
      '<div class="stats"><a href="#/interests"><b>' + (c.interests_in || 0) + '</b><span>' + t('புதிய Interest', 'New interests') + '</span></a><a href="#/messages"><b>' + (c.unread || 0) + '</b><span>' + t('படிக்காத செய்திகள்', 'Unread messages') + '</span></a><a href="#/shortlist"><b>' + (c.shortlist || 0) + '</b><span>' + t('விருப்பப்பட்டியல்', 'Shortlisted') + '</span></a></div>' +
      '<div class="rowh"><h2>' + t('உங்களுக்குப் பொருத்தமானவர்கள்', 'Matches for you') + '</h2><a href="#/search">' + t('அனைத்தும்', 'See all') + ' →</a></div>' +
      grid(r.items || [], t('இப்போது பொருத்தங்கள் இல்லை. தேடலில் வடிகட்டிகளை மாற்றிப் பாருங்கள்.', 'No matches yet. Try the search filters.')) +
      ((nw.items || []).length ? '<div class="rowh"><h2>' + t('புதிய உறுப்பினர்கள்', 'New members') + '</h2></div>' + grid(nw.items, '') : '') + '</div>';
  };

  /* ---------------- search ---------------- */
  var flt = {}, off = 0, LIM = 20;
  try { flt = JSON.parse(sessionStorage.getItem(FLT) || '{}'); } catch (e) {}
  function chipsF(k, list) {
    var cur = flt[k] || [];
    return '<div class="chips">' + M.D[list].map(function (x) { return '<label class="chip"><input type="checkbox" data-fa="' + k + '" value="' + esc(x.v) + '"' + (cur.indexOf(x.v) >= 0 ? ' checked' : '') + '><span>' + esc(M.st.lang === 'en' ? x.en : x.ta) + '</span></label>'; }).join('') + '</div>';
  }
  function fsel(k, list) { return '<select data-fs="' + k + '">' + M.opts(list, (flt[k] || [])[0] || '', t('எதுவும்', 'Any')) + '</select>'; }
  function fnum(k, ph) { return '<input data-fn="' + k + '" type="number" inputmode="numeric" placeholder="' + esc(ph) + '" value="' + esc(flt[k] || '') + '">'; }
  function ftxt(k, ph) { return '<input data-ft="' + k + '" type="text" placeholder="' + esc(ph) + '" value="' + esc(flt[k] || '') + '">'; }

  M.views.search = async function (v) {
    if (!gate(v)) return;
    var open = window.innerWidth > 800;
    v.innerHTML = '<div class="wrap"><h1 class="h2">' + t('துணையைத் தேடுங்கள்', 'Find a match') + '</h1>' +
      '<details class="filters" id="fbox"' + (open ? ' open' : '') + '><summary>🎛 ' + t('வடிகட்டிகள்', 'Filters') + '</summary><form id="ff" class="fform">' +
      '<div class="gridf">' +
      '<div class="fld"><span>' + t('வயது', 'Age') + '</span><div class="two">' + fnum('min_age', t('இருந்து', 'from')) + fnum('max_age', t('வரை', 'to')) + '</div></div>' +
      '<div class="fld"><span>' + t('உயரம் (செ.மீ)', 'Height (cm)') + '</span><div class="two">' + fnum('min_height', t('இருந்து', 'from')) + fnum('max_height', t('வரை', 'to')) + '</div></div>' +
      '<label class="fld"><span>' + t('நட்சத்திரம்', 'Star') + '</span>' + fsel('star', 'star') + '</label><label class="fld"><span>' + t('ராசி', 'Raasi') + '</span>' + fsel('raasi', 'raasi') + '</label>' +
      '<label class="fld"><span>' + t('கல்வி', 'Education') + '</span>' + fsel('education', 'education') + '</label><label class="fld"><span>' + t('மாநிலம்', 'State') + '</span>' + fsel('state', 'state') + '</label>' +
      '<label class="fld"><span>' + t('உணவு', 'Diet') + '</span>' + fsel('diet', 'diet') + '</label><label class="fld"><span>' + t('ஊர் / மாவட்டம்', 'City / district') + '</span>' + ftxt('city', '') + '</label>' +
      '<label class="fld"><span>' + t('குலம் / கோத்திரம்', 'Kulam / gotra') + '</span>' + ftxt('kulam', '') + '</label><label class="fld"><span>' + t('பெயர்', 'Name') + '</span>' + ftxt('q', '') + '</label></div>' +
      '<div class="fld"><span>' + t('சமூகம்', 'Community') + '</span>' + chipsF('community', 'community') + '</div>' +
      '<div class="fld"><span>' + t('திருமண நிலை', 'Marital status') + '</span>' + chipsF('marital', 'marital') + '</div>' +
      '<label class="chk"><input type="checkbox" data-fb="with_photo"' + (flt.with_photo ? ' checked' : '') + '> <span>' + t('படம் உள்ளவர்கள் மட்டும்', 'With photo only') + '</span></label>' +
      '<label class="chk"><input type="checkbox" data-fb="no_dosham"' + (flt.no_dosham ? ' checked' : '') + '> <span>' + t('தோஷம் இல்லாதவர்கள்', 'No dosham') + '</span></label>' +
      '<div class="rowb"><button class="btn pri" type="submit">🔍 ' + t('தேடு', 'Search') + '</button><button class="btn ghost" type="button" data-act="fReset">' + t('அழி', 'Reset') + '</button></div></form></details>' +
      '<div id="res" aria-live="polite"></div></div>';
    M.$('#ff').addEventListener('submit', function (e) { e.preventDefault(); readFilters(); M.$('#fbox').open = window.innerWidth > 800; runSearch(true); });
    runSearch(true);
  };
  function readFilters() {
    var f = {};
    ['min_age', 'max_age', 'min_height', 'max_height'].forEach(function (k) { var e = M.$('[data-fn="' + k + '"]'); if (e && e.value) f[k] = parseInt(e.value, 10); });
    M.$$('[data-fs]').forEach(function (e) { if (e.value) f[e.getAttribute('data-fs')] = [e.value]; });
    M.$$('[data-ft]').forEach(function (e) { if (e.value.trim()) f[e.getAttribute('data-ft')] = e.value.trim(); });
    ['community', 'marital'].forEach(function (k) { var a = M.$$('[data-fa="' + k + '"]:checked').map(function (e) { return e.value; }); if (a.length) f[k] = a; });
    M.$$('[data-fb]').forEach(function (e) { if (e.checked) f[e.getAttribute('data-fb')] = true; });
    flt = f; try { sessionStorage.setItem(FLT, JSON.stringify(f)); } catch (e) {}
  }
  M.acts.fReset = function () { flt = {}; try { sessionStorage.removeItem(FLT); } catch (e) {} M.route(); };
  async function runSearch(reset) {
    var box = M.$('#res'); if (reset) { off = 0; box.innerHTML = '<div class="loading">…</div>'; }
    var f = Object.assign({}, flt); if (f.with_photo) f.with_photo = 'true'; if (f.no_dosham) f.no_dosham = 'true';
    ['min_age', 'max_age', 'min_height', 'max_height'].forEach(function (k) { if (f[k] != null) f[k] = String(f[k]); });
    var r = await M.api('mat_search', { f: f, lim: LIM, off: off });
    if (!box.isConnected) return;
    if (!r.ok) { box.innerHTML = '<p class="err">' + esc(M.err(r)) + '</p>'; return; }
    var items = r.items || [];
    if (reset) box.innerHTML = '<p class="mut" id="rcount"></p><div class="pgridc" id="rl"></div><div class="c"><button class="btn ghost" id="more" hidden data-act="moreRes">' + t('மேலும் காட்டு', 'Show more') + '</button></div>';
    if (reset && !items.length) { box.innerHTML = '<p class="mut c pad">' + t('பொருத்தமான சுயவிவரங்கள் இல்லை. வடிகட்டிகளைத் தளர்த்திப் பாருங்கள்.', 'No profiles match. Try relaxing the filters.') + '</p>'; return; }
    M.$('#rl').insertAdjacentHTML('beforeend', items.map(M.card).join('')); M.hydrate(box);
    off += items.length; M.$('#rcount').textContent = off + t(' சுயவிவரங்கள்', ' profiles shown'); M.$('#more').hidden = items.length < LIM;
  }
  M.acts.moreRes = function () { runSearch(false); };

  /* ---------------- interests ---------------- */
  M.views.interests = async function (v, tab) {
    if (!gate(v)) return;
    tab = tab || 'in';
    var r = await M.api('mat_inbox');
    if (!v.isConnected) return;
    var all = r.items || [];
    var sets = { in: all.filter(function (i) { return i.dir === 'in' && i.status === 'pending'; }), out: all.filter(function (i) { return i.dir === 'out' && i.status === 'pending'; }), ok: all.filter(function (i) { return i.status === 'accepted'; }), no: all.filter(function (i) { return i.status === 'declined'; }) };
    var tabs = [['in', t('வந்தவை', 'Received')], ['out', t('அனுப்பியவை', 'Sent')], ['ok', t('பொருத்தங்கள்', 'Matches')], ['no', t('மறுக்கப்பட்டவை', 'Declined')]];
    v.innerHTML = '<div class="wrap"><h1 class="h2">' + t('Interest', 'Interests') + '</h1><div class="tabsx" role="tablist">' + tabs.map(function (x) { return '<a role="tab" aria-selected="' + (tab === x[0]) + '" class="' + (tab === x[0] ? 'on' : '') + '" href="#/interests/' + x[0] + '">' + esc(x[1]) + ' <i>' + sets[x[0]].length + '</i></a>'; }).join('') + '</div>' +
      (sets[tab].length ? sets[tab].map(function (i) {
        var acts = tab === 'in' ? '<button class="btn pri sm" data-act="respond" data-yes="1" data-iid="' + i.id + '">✓ ' + t('ஏற்கிறேன்', 'Accept') + '</button><button class="btn ghost sm" data-act="respond" data-yes="0" data-iid="' + i.id + '">✕ ' + t('மறு', 'Decline') + '</button>' :
          tab === 'ok' ? '<a class="btn pri sm" href="#/chat/' + esc(i.other.id) + '">💬 ' + (i.unlocked ? t('Chat', 'Chat') : t('Chat திற (₹' + M.C.FEE_RS + ')', 'Unlock chat (₹' + M.C.FEE_RS + ')')) + '</a>' : '';
        return '<div class="irow">' + M.card(i.other) + (i.note ? '<p class="inote">“' + esc(i.note) + '”</p>' : '') + '<div class="rowb">' + acts + '<span class="mut sm">' + M.ago(i.created_at) + '</span></div></div>';
      }).join('') : '<p class="mut c pad">' + t('இங்கே எதுவும் இல்லை.', 'Nothing here yet.') + '</p>') + '</div>';
  };

  M.views.shortlist = async function (v) {
    if (!gate(v)) return;
    var r = await M.api('mat_shortlist_list');
    if (!v.isConnected) return;
    v.innerHTML = '<div class="wrap"><h1 class="h2">♥ ' + t('விருப்பப்பட்டியல்', 'Shortlist') + '</h1>' + grid(r.items || [], t('சுயவிவரத்தில் ♡ அழுத்தினால் இங்கே சேரும்.', 'Tap ♡ on a profile to save it here.')) + '</div>';
  };

  /* ---------------- messages ---------------- */
  M.views.messages = async function (v) {
    if (!gate(v)) return;
    var r = await M.api('mat_conversations');
    if (!v.isConnected) return;
    var items = r.items || [];
    v.innerHTML = '<div class="wrap narrow"><h1 class="h2">💬 ' + t('செய்திகள்', 'Messages') + '</h1>' +
      (items.length ? items.map(function (c) {
        var o = c.other;
        return '<a class="crow" href="#/chat/' + esc(o.id) + '">' + M.avatar(o) + '<div class="ci"><b>' + esc(o.name) + '</b><span>' + (c.unlocked ? esc(c.last_body || t('உரையாடலைத் தொடங்குங்கள்', 'Start the conversation')) : '🔒 ' + t('Chat திறக்க ₹' + M.C.FEE_RS, 'Unlock chat for ₹' + M.C.FEE_RS)) + '</span></div>' + (c.unread > 0 ? '<i class="nb">' + c.unread + '</i>' : '') + '</a>';
      }).join('') : '<p class="mut c pad">' + t('பொருத்தங்கள் ஏற்கப்பட்டதும் இங்கே உரையாடல்கள் தோன்றும்.', 'Conversations appear here once an interest is accepted.') + '</p>') + '</div>';
  };

  M.views.chat = async function (v, pid) {
    if (!gate(v)) return;
    var pr = await M.api('mat_get_profile', { pid: pid });
    if (!v.isConnected) return;
    if (!pr.ok) { v.innerHTML = '<div class="wrap narrow"><div class="box"><p>' + esc(M.err(pr)) + '</p></div></div>'; return; }
    var p = pr.profile, accepted = pr.accepted, unlocked = pr.unlocked;
    var head = '<div class="chead"><a href="#/messages" class="back" aria-label="back">←</a>' + M.avatar(p) + '<a class="cn" href="#/profile/' + esc(p.id) + '"><b>' + esc(p.name) + '</b><span>' + esc(M.sub(p)) + '</span></a></div>';
    if (!accepted) { v.innerHTML = '<div class="wrap narrow chatw">' + head + '<div class="box c"><p>' + t('இருவரில் ஒருவர் Interest அனுப்பி, மற்றவர் ஏற்ற பின்னரே chat சாத்தியம்.', 'Chat is possible only after one sends an interest and the other accepts.') + '</p><a class="btn" href="#/profile/' + esc(p.id) + '">' + t('சுயவிவரம்', 'Profile') + '</a></div></div>'; return; }
    if (!unlocked) {
      v.innerHTML = '<div class="wrap narrow chatw">' + head + '<div class="box c unlock"><div class="big-ic">🔓</div><h2>' + t('Chat திறக்க ₹' + M.C.FEE_RS, 'Unlock chat for ₹' + M.C.FEE_RS) + '</h2>' +
        '<ul class="tick"><li>' + t('ஒருமுறை மட்டும் — இந்த ஜோடிக்கு எப்போதும் செல்லுபடியாகும்', 'One time only — valid for this pair forever') + '</li><li>' + t('உங்களில் யாராவது ஒருவர் செலுத்தினால் இருவருக்கும் திறக்கும்', 'If either of you pays, chat opens for both') + '</li><li>' + t('தொலைபேசி எண் / email / WhatsApp chat-ல் அனுப்ப முடியாது', 'Phone / e-mail / WhatsApp cannot be shared in chat') + '</li></ul>' +
        '<button class="btn pri big" data-act="unlock" data-id="' + esc(p.id) + '">' + t('₹' + M.C.FEE_RS + ' செலுத்தி திற', 'Pay ₹' + M.C.FEE_RS + ' & unlock') + '</button><p class="err" id="uerr"></p><p class="mut sm">' + t('பாதுகாப்பான Razorpay (UPI / அட்டை / Net banking).', 'Secure Razorpay (UPI / card / net banking).') + '</p></div></div>';
      return;
    }
    v.innerHTML = '<div class="wrap narrow chatw">' + head + '<div class="cwarn">🔒 ' + t('தொலைபேசி எண், email, WhatsApp போன்றவற்றைப் பகிர முடியாது — அவை தானாகத் தடுக்கப்படும்.', 'Phone numbers, e-mail and WhatsApp cannot be shared — they are blocked automatically.') + '</div>' +
      '<div class="msgs" id="msgs" aria-live="polite"></div><div class="cerr" id="cerr" role="alert"></div>' +
      '<form class="compose" id="cf"><textarea id="ct" rows="1" maxlength="500" placeholder="' + esc(t('செய்தியை எழுதுங்கள்…', 'Write a message…')) + '" aria-label="message"></textarea><button class="btn pri" type="submit" aria-label="send">➤</button></form></div>';
    var last = 0, mine = [], box = M.$('#msgs');
    async function load(first) {
      var r = await M.api('mat_messages_list', { pid: pid, after_id: last });
      if (!box.isConnected) return;
      if (!r.ok) { if (first) box.innerHTML = '<p class="err">' + esc(M.err(r)) + '</p>'; return; }
      if (r.items.length) {
        var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80 || first;
        box.insertAdjacentHTML('beforeend', r.items.map(function (m) { last = Math.max(last, m.id); if (m.mine) mine.push(m.body); return '<div class="m ' + (m.mine ? 'me' : 'th') + '"><p>' + esc(m.body) + '</p><time>' + M.ago(m.created_at) + '</time></div>'; }).join(''));
        if (atBottom) box.scrollTop = box.scrollHeight;
        M.pollCounts();
      } else if (first) box.innerHTML = '<p class="mut c pad">' + t('வணக்கம் சொல்லி உரையாடலைத் தொடங்குங்கள் 🙏', 'Say hello to begin 🙏') + '</p>';
      if (first && r.items.length === 0) box.dataset.empty = '1';
    }
    var ta = M.$('#ct'), cerr = M.$('#cerr');
    ta.addEventListener('input', function () {
      ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
      var w = ta.value.trim() ? F.check(ta.value, mine.slice(-3)) : null;
      cerr.textContent = w ? '⚠ ' + t(M.ERR.contact_blocked[0], M.ERR.contact_blocked[1]) : '';
    });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); M.$('#cf').requestSubmit(); } });
    M.$('#cf').addEventListener('submit', async function (e) {
      e.preventDefault(); var txt = ta.value.trim(); if (!txt) return;
      var w = F.check(txt, mine.slice(-3)); if (w) { cerr.textContent = '⚠ ' + t(M.ERR.contact_blocked[0], M.ERR.contact_blocked[1]); return; }
      var btn = this.querySelector('button'); btn.disabled = true;
      var r = await M.api('mat_send_message', { pid: pid, body: txt }); btn.disabled = false;
      if (!r.ok) {
        cerr.textContent = r.code === 'contact_blocked' ? '⛔ ' + t(M.ERR.contact_blocked[0], M.ERR.contact_blocked[1]) + ' — ' + t('எச்சரிக்கை ', 'warning ') + r.strikes + '/3' + (r.banned ? ' — ' + t(M.ERR.chat_banned[0], M.ERR.chat_banned[1]) : '') : M.err(r);
        return;
      }
      ta.value = ''; ta.style.height = 'auto'; cerr.textContent = ''; var em = box.querySelector('p.mut'); if (em) em.remove(); await load(false); ta.focus();
    });
    await load(true);
    if (!v.isConnected) return;
    M.timers.push(setInterval(function () { if (!box.isConnected) return; if (!document.hidden) load(false); }, 4000));
  };
  M.acts.unlock = async function (a) {
    var id = a.getAttribute('data-id'), err = M.$('#uerr'); a.disabled = true; err.textContent = '';
    var r = await B.pay(id); a.disabled = false;
    if (r.ok) { M.toast(t('Chat திறக்கப்பட்டது ✓', 'Chat unlocked ✓'), 'ok'); M.route(); }
    else if (r.code !== 'cancelled') err.textContent = r.message || M.err(r);
  };
})();
