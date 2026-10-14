/* Admin panel */
(function () {
  'use strict';
  var M = window.MAT, t = M.t, esc = M.esc;

  M.views.admin = async function (v, tab) {
    if (!M.st.me || !M.st.me.is_admin) { v.innerHTML = '<div class="wrap narrow"><div class="box"><p>' + esc(t(M.ERR.forbidden[0], M.ERR.forbidden[1])) + '</p></div></div>'; return; }
    tab = tab || 'subs';
    var tabs = [['subs', t('புதிய பதிவுகள்', 'New sign-ups')], ['reqs', t('தொடர்பு கோரிக்கைகள்', 'Contact requests')], ['pending', t('காத்திருப்பவை', 'Pending')], ['approved', t('அங்கீகரிக்கப்பட்டவை', 'Approved')], ['rejected', t('நிராகரிக்கப்பட்டவை', 'Rejected')], ['hidden', t('மறைக்கப்பட்டவை', 'Hidden')], ['reports', t('புகார்கள்', 'Reports')], ['promo', t('விளம்பரம்', 'Promotion')], ['stats', t('புள்ளிவிவரம்', 'Stats')]];
    var head = '<div class="wrap"><h1 class="h2">🛡 ' + t('நிர்வாகம்', 'Admin') + '</h1><div class="tabsx">' + tabs.map(function (x) { return '<a class="' + (tab === x[0] ? 'on' : '') + '" href="#/admin/' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '</div>';
    if (tab === 'promo') {
      if (!M.B.promo) { v.innerHTML = head + '<p class="mut">' + t('demo-வில் இது இல்லை.', 'Not available in demo mode.') + '</p></div>'; return; }
      var ps = await M.B.promo('status');
      if (!v.isConnected) return;
      if (ps.ok === false) { v.innerHTML = head + '<p class="err">' + esc(ps.message) + '</p></div>'; return; }
      var tg = (ps.platforms || []).filter(function (p) { return p.name === 'telegram'; })[0];
      v.innerHTML = head + '<div class="box"><p>' + t('தினமும் காலை 9:05-க்கு ஒரு tool பற்றிய தமிழ் + English post (படம், link உடன்) தானாகப் போகும்.', 'Every day at 9:05 AM one tool is posted automatically in Tamil + English with its picture and link.') + '</p>' +
        '<p><b>' + t('நிலை', 'Status') + ':</b> ' + (ps.enabled ? '🟢 ' + t('இயங்குகிறது', 'On') : '🔴 ' + t('நிறுத்தப்பட்டது', 'Off')) + ' · Telegram: ' + (tg && tg.ready ? '✅' : '❌ ' + t('secrets இல்லை', 'secrets missing')) + ' · ' + ps.tools + ' tools</p>' +
        '<div class="rowb"><button class="btn pri" data-act="pRun">📣 ' + t('இப்போதே ஒரு post', 'Post one now') + '</button>' +
        '<button class="btn" data-act="pOn" data-on="' + (ps.enabled ? '0' : '1') + '">' + (ps.enabled ? '⏸ ' + t('நிறுத்து', 'Turn off') : '▶ ' + t('தொடங்கு', 'Turn on')) + '</button></div></div>' +
        '<h3 class="h3">' + t('தளங்கள்', 'Platforms') + '</h3><div class="box">' +
        '<div class="arow">✈️ <b>Telegram</b> · ' + (tg && tg.ready ? '✅ ' + t('இணைந்தது', 'connected') : '❌') + '</div>' +
        (ps.social || []).map(function (x) {
          var nm = { facebook: '📘 Facebook Page', instagram: '📸 Instagram', x: '𝕏 X (Twitter)', pinterest: '📌 Pinterest', youtube: '▶️ YouTube Shorts' }[x.name] || x.name;
          var btn = x.name === 'instagram' || x.name === 'x' ? '' : x.canConnect ? '<button class="btn sm' + (x.connected ? ' ghost' : ' pri') + '" data-act="pConnect" data-p="' + esc(x.name) + '">' + (x.connected ? t('மீண்டும் இணை', 'Reconnect') : t('இணை (Connect)', 'Connect')) + '</button>' +
            (x.connected ? ' <button class="btn sm ghost" data-act="pDisc" data-p="' + esc(x.name) + '">' + t('துண்டி', 'Disconnect') + '</button>' : '') : '<span class="mut sm">' + t('App keys இன்னும் சேர்க்கப்படவில்லை', 'App keys not added yet') + '</span>';
          return '<div class="arow"><b>' + esc(nm) + '</b> · ' + (x.connected ? '✅ ' + esc(x.detail || t('இணைந்தது', 'connected')) : '❌ ' + t('இணைக்கப்படவில்லை', 'not connected')) +
            (x.name === 'instagram' ? ' <span class="mut sm">' + t('(Facebook Page மூலம்)', '(through the Facebook Page)') + '</span>' : x.name === 'x' ? ' <span class="mut sm">(GitHub secrets)</span>' : '') + (btn ? '<div class="rowb">' + btn + '</div>' : '') + '</div>';
        }).join('') + '</div>' +
        '<h3 class="h3">' + t('சமீபத்திய posts', 'Recent posts') + '</h3>' +
        ((ps.recent || []).length ? ps.recent.map(function (x) {
          return '<div class="arow"><b>' + esc(x.tool_id) + '</b> · ' + esc(x.platform) + ' · ' + (x.status === 'sent' ? '✅' : '❌ ' + esc(x.error || '')) + ' <span class="mut sm">' + M.ago(x.created_at) + '</span></div>';
        }).join('') : '<p class="mut">' + t('இன்னும் post இல்லை.', 'No posts yet.') + '</p>') + '</div>';
      return;
    }
    if (tab === 'reqs') {
      var rq = await M.api('mat_admin_contact_requests', { st: 'new' });
      if (!v.isConnected) return;
      v.innerHTML = head + '<p class="mut">' + t('இருவீட்டாரையும் அழைத்து இணைத்து வையுங்கள்; முடிந்ததும் "முடிந்தது" அழுத்துங்கள்.', 'Phone both families to connect them, then press Done.') + '</p>' +
        ((rq.items || []).length ? rq.items.map(function (x) {
          return '<div class="arow big"><div class="ahd"><b>' + esc(x.from_name) + '</b> → <b>' + esc(x.target_name || '?') + '</b> <span class="tg">SC-' + esc(x.code) + '</span> <span class="mut sm">' + M.ago(x.created_at) + '</span></div>' +
            '<div class="pvt2">📞 ' + esc(t('கேட்பவர்: ', 'Requester: ')) + '<a href="tel:' + esc(x.from_phone) + '"><b>' + esc(x.from_phone) + '</b></a></div>' +
            '<div class="pvt2">📞 ' + esc(t('சுயவிவரம்: ', 'Profile: ')) + (x.target_phone ? '<a href="tel:' + esc(x.target_phone) + '"><b>' + esc(x.target_phone) + '</b></a>' : '—') + '</div>' +
            (x.note ? '<p class="about">' + esc(x.note) + '</p>' : '') +
            '<div class="rowb"><button class="btn pri sm" data-act="aReq" data-id="' + esc(x.id) + '">✓ ' + t('முடிந்தது', 'Done') + '</button></div></div>';
        }).join('') : '<p class="mut">' + t('புதிய கோரிக்கைகள் இல்லை.', 'No new requests.') + '</p>') + '</div>';
      return;
    }
    if (tab === 'subs' || tab === 'subs-contacted' || tab === 'subs-done') {
      var sst = tab === 'subs' ? 'new' : tab === 'subs-contacted' ? 'contacted' : 'done';
      var sq = await M.api('mat_admin_submissions', { st: sst });
      if (!v.isConnected) return;
      var sub = '<div class="tabsx">' + [['subs', t('புதியவை', 'New')], ['subs-contacted', t('தொடர்பு கொண்டவை', 'Contacted')], ['subs-done', t('முடிந்தவை', 'Done')]].map(function (x) { return '<a class="' + (tab === x[0] ? 'on' : '') + '" href="#/admin/' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '</div>';
      var bar = '<div class="rowb"><input id="asq" type="search" placeholder="' + esc(t('பெயர் / எண் / ஊர் தேடு…', 'Search name / phone / city…')) + '" style="flex:1;min-width:160px"><button class="btn sm" data-act="aExport">⬇ ' + t('Excel/CSV பதிவிறக்கம்', 'Download CSV') + '</button></div>';
      v.innerHTML = head + sub + bar + ((sq.items || []).length ? sq.items.map(function (r) {
        var d = r.data || {}, ph = (r.photos || []).map(function (x) { return '<img alt="" data-ph="' + esc(x) + '">'; }).join('');
        var rows = [['கல்வி', M.label('education', d.education)], [t('கல்வி விவரம்', 'Course'), d.education_detail], [t('தொழில்', 'Occupation'), d.occupation], [t('வருமானம்', 'Income'), M.label('income_band', d.income_band)], [t('உயரம்', 'Height'), d.height_cm ? d.height_cm + ' cm' : ''],
          [t('குலம்', 'Kulam'), d.kulam], [t('கோத்திரம்', 'Gotra'), d.gotra], [t('நட்சத்திரம்', 'Star'), M.label('star', d.star)], [t('ராசி', 'Raasi'), M.label('raasi', d.raasi)], [t('தோஷம்', 'Dosham'), M.label('dosham', d.dosham)],
          [t('தந்தை', 'Father'), [d.father_name, d.father_occ].filter(Boolean).join(' – ')], [t('தாய்', 'Mother'), [d.mother_name, d.mother_occ].filter(Boolean).join(' – ')],
          [t('சகோதரர்/சகோதரி', 'Siblings'), (d.brothers != null ? d.brothers + ' B' + (d.brothers_married != null ? ' (' + d.brothers_married + ' married)' : '') : '') + ' ' + (d.sisters != null ? d.sisters + ' S' + (d.sisters_married != null ? ' (' + d.sisters_married + ' married)' : '') : '')],
          [t('சொந்த ஊர்', 'Native'), d.native_place], [t('ஊர்', 'City'), [d.city, d.district, M.label('state', d.state), d.country].filter(Boolean).join(', ')], [t('குடும்பம்', 'Family'), [M.label('family_type', d.family_type), M.label('family_status', d.family_status)].filter(Boolean).join(' · ')],
          [t('குடும்பம் பற்றி', 'About family'), d.family_about], [t('பற்றி', 'About'), d.about], [t('பதிவு செய்தவர்', 'By'), M.label('created_for', d.created_for)]].filter(function (x) { return x[1] && String(x[1]).trim(); });
        return '<div class="arow big asub" data-q="' + esc([d.name, r.phone, r.email, d.city, d.district].join(' ').toLowerCase()) + '"><div class="ahd"><b>' + esc(d.name || '?') + '</b> · ' + (d.gender === 'M' ? t('ஆண்', 'M') : t('பெண்', 'F')) + ' · ' + (r.age != null ? r.age : '') + ' · ' + esc(M.commLabel(d)) + ' <span class="mut sm">' + M.ago(r.created_at) + '</span>' + (r.listed ? ' <span class="tg">🌐 ' + t('பட்டியலில் உள்ளது', 'Public') + '</span>' : '') + '</div>' +
          '<div class="aph">' + (ph || '<span class="mut">' + t('படம் இல்லை', 'No photo') + '</span>') + '</div>' +
          (r.horoscope ? '<div class="horo"><a href="#" data-act="aHoro" data-p="' + esc(r.horoscope) + '"><img alt="" data-ph="' + esc(r.horoscope) + '"><span>📄 ' + t('ஜாதகத்தைப் பெரிதாகப் பார்க்க / பதிவிறக்க', 'Open / download horoscope') + '</span></a></div>' : '<p class="mut sm">📄 ' + t('ஜாதகம் பதிவேற்றப்படவில்லை', 'No horoscope uploaded') + '</p>') +
          '<div class="pvt2">📞 <a href="tel:' + esc(r.phone) + '"><b>' + esc(r.phone) + '</b></a> &nbsp; ✉ <b>' + esc(r.email || '—') + '</b></div>' +
          '<dl class="sdl">' + rows.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' +
          (r.note ? '<p class="mut sm">' + t('குறிப்பு: ', 'Note: ') + esc(r.note) + '</p>' : '') +
          '<div class="rowb">' + (r.status !== 'contacted' ? '<button class="btn sm" data-act="aSub" data-id="' + esc(r.id) + '" data-s="contacted">📞 ' + t('தொடர்பு கொண்டேன்', 'Contacted') + '</button>' : '') + (r.status !== 'done' ? '<button class="btn pri sm" data-act="aSub" data-id="' + esc(r.id) + '" data-s="done">✓ ' + t('முடிந்தது', 'Done') + '</button>' : '') + (r.status !== 'new' ? '<button class="btn ghost sm" data-act="aSub" data-id="' + esc(r.id) + '" data-s="new">↺ ' + t('புதியது', 'New') + '</button>' : '') + '<button class="btn sm ' + (r.listed ? 'ghost' : 'pri') + '" data-act="aList" data-id="' + esc(r.id) + '" data-on="' + (r.listed ? '0' : '1') + '">' + (r.listed ? '🚫 ' + t('பட்டியலிலிருந்து நீக்கு', 'Remove from public list') : '🌐 ' + t('பொதுப் பட்டியலில் சேர்', 'Publish to public list')) + '</button>' + '<button class="btn ghost sm" data-act="aSubDel" data-id="' + esc(r.id) + '">🗑 ' + t('நீக்கு', 'Delete') + '</button></div></div>';
      }).join('') : '<p class="mut">' + t('இங்கு எதுவும் இல்லை.', 'Nothing here.') + '</p>') + '</div>';
      M.hydrate(v);
      var sbx = M.$('#asq', v); if (sbx) sbx.addEventListener('input', function () { var q = sbx.value.trim().toLowerCase(); M.$$('.asub', v).forEach(function (el) { el.style.display = !q || el.getAttribute('data-q').indexOf(q) >= 0 ? '' : 'none'; }); });
      
      return;
    }
    if (tab === 'stats') {
      var s = await M.api('mat_admin_stats');
      if (!v.isConnected) return;
      v.innerHTML = head + '<div class="stats">' + [['new_submissions', t('புதிய பதிவுகள்', 'New sign-ups')], ['pending', t('காத்திருப்பு', 'Pending')], ['approved', t('அங்கீகரிக்கப்பட்டவை', 'Approved')], ['men', t('ஆண்கள்', 'Men')], ['women', t('பெண்கள்', 'Women')], ['submissions_total', t('மொத்த பதிவுகள் (login இன்றி)', 'Total sign-ups')], ['listed', t('பொதுப் பட்டியலில்', 'Publicly listed')], ['requests_total', t('தொடர்பு கோரிக்கைகள்', 'Contact requests')], ['new_requests', t('புதிய கோரிக்கைகள்', 'New requests')], ['members_total', t('உறுப்பினர் கணக்குகள்', 'Member accounts')], ['unlocks', t('Chat திறப்புகள்', 'Chat unlocks')], ['open_reports', t('திறந்த புகார்கள்', 'Open reports')]].map(function (k) { return '<div><b>' + (s[k[0]] || 0) + '</b><span>' + esc(k[1]) + '</span></div>'; }).join('') + '<div><b>₹' + ((s.revenue_paise || 0) / 100) + '</b><span>' + t('வருவாய்', 'Revenue') + '</span></div></div></div>';
      return;
    }
    if (tab === 'reports') {
      var r = await M.api('mat_admin_reports');
      if (!v.isConnected) return;
      v.innerHTML = head + '<h2>' + t('புகார்கள்', 'Reports') + '</h2>' + ((r.reports || []).length ? (r.reports || []).map(function (x) {
        return '<div class="arow"><b>' + esc(M.label('report_reason', x.reason)) + '</b> — ' + esc(x.reported || '?') + ' <span class="mut sm">(' + esc(t('புகார்: ', 'by ')) + esc(x.reporter || '?') + ', ' + M.ago(x.created_at) + ')</span>' + (x.detail ? '<p>' + esc(x.detail) + '</p>' : '') +
          '<div class="rowb"><a class="btn sm ghost" href="#/profile/' + esc(x.reported_id) + '">' + t('சுயவிவரம்', 'Profile') + '</a>' + (x.status === 'open' ? '<button class="btn sm" data-act="aClose" data-id="' + x.id + '">' + t('முடித்தது', 'Close') + '</button>' : '<span class="mut sm">' + t('முடிந்தது', 'closed') + '</span>') + '</div></div>';
      }).join('') : '<p class="mut">' + t('புகார்கள் இல்லை.', 'No reports.') + '</p>') +
        '<h2>' + t('தொடர்பு விவரம் பகிர முயற்சிகள்', 'Contact-sharing attempts') + '</h2>' + ((r.violations || []).length ? (r.violations || []).map(function (x) {
          return '<div class="arow"><b>' + esc(x.name || '?') + '</b> <span class="tg">' + esc(x.kind) + '</span> <span class="mut sm">' + M.ago(x.created_at) + '</span><p class="mono">' + esc(x.sample) + '</p><div class="rowb"><button class="btn sm ghost" data-act="aBan" data-id="' + esc(x.user_id) + '" data-v="0">' + t('chat மீட்டெடு', 'Restore chat') + '</button><button class="btn sm bad" data-act="aBan" data-id="' + esc(x.user_id) + '" data-v="1">' + t('chat நிறுத்து', 'Suspend chat') + '</button></div></div>';
        }).join('') : '<p class="mut">' + t('இல்லை.', 'None.') + '</p>') + '</div>';
      return;
    }
    var q = await M.api('mat_admin_queue', { st: tab });
    if (!v.isConnected) return;
    var items = q.items || [];
    v.innerHTML = head + (items.length ? items.map(function (p) {
      var ph = (p.photos || []).map(function (x) { return '<img alt="" data-ph="' + esc(x) + '">'; }).join('');
      return '<div class="arow big"><div class="ahd"><b>' + esc(p.name) + '</b> · ' + (p.gender === 'M' ? t('ஆண்', 'M') : t('பெண்', 'F')) + ' · ' + p.age + ' · ' + esc(M.commLabel(p)) + '</div>' +
        '<div class="aph">' + (ph || '<span class="mut">' + t('படம் இல்லை', 'No photo') + '</span>') + '</div>' +
        '<div class="adt">' + [M.label('education', p.education), p.occupation, [p.city, p.state].filter(Boolean).join(', '), p.kulam, p.gotra, M.label('star', p.star), M.label('raasi', p.raasi)].filter(Boolean).map(esc).join(' · ') + '</div>' +
        (p.about ? '<p class="about">' + esc(p.about) + '</p>' : '') +
        '<div class="pvt2">📞 <b>' + esc(p.phone || '—') + '</b> &nbsp; ✉ <b>' + esc(p.email || '—') + '</b> <span class="mut sm">(' + t('நிர்வாகிக்கு மட்டும்', 'admin only') + ')</span></div>' +
        (p.admin_note ? '<p class="mut sm">' + t('குறிப்பு: ', 'Note: ') + esc(p.admin_note) + '</p>' : '') +
        '<div class="rowb">' + (tab !== 'approved' ? '<button class="btn pri sm" data-act="aSet" data-id="' + esc(p.user_id) + '" data-s="approved">✓ ' + t('அங்கீகரி', 'Approve') + '</button>' : '') +
        (tab !== 'rejected' ? '<button class="btn bad sm" data-act="aSet" data-id="' + esc(p.user_id) + '" data-s="rejected">✕ ' + t('நிராகரி', 'Reject') + '</button>' : '') +
        (tab === 'approved' ? '<button class="btn ghost sm" data-act="aSet" data-id="' + esc(p.user_id) + '" data-s="hidden">🙈 ' + t('மறை', 'Hide') + '</button>' : '') +
        '<a class="btn ghost sm" href="#/profile/' + esc(p.user_id) + '">' + t('முழு சுயவிவரம்', 'Full profile') + '</a></div></div>';
    }).join('') : '<p class="mut c pad">' + t('இங்கே எதுவும் இல்லை 🎉', 'Nothing here 🎉') + '</p>') + '</div>';
  };
  M.acts.aHoro = async function (a, e) {
    e.preventDefault(); var w = window.open('', '_blank');
    var u = await M.B.photoUrl(a.getAttribute('data-p'));
    if (u && w) w.location = u; else if (w) w.close();
  };
  M.acts.aList = async function (a) {
    var r = await M.api('mat_admin_submission_list', { sid: a.getAttribute('data-id'), on: a.getAttribute('data-on') === '1' });
    if (!r.ok) return M.toast(M.err(r), 'bad'); M.toast('✓', 'ok'); M.route();
  };
  M.acts.pRun = async function (a) {
    a.disabled = true; var r = await M.B.promo('run', {}); a.disabled = false;
    if (r.ok) M.toast('✓ ' + r.tool, 'ok'); else M.toast(r.message || (r.results && r.results[0] && r.results[0].error) || r.skipped || 'error', 'bad');
    M.route();
  };
  M.acts.pConnect = async function (a) {
    var r = await M.B.promo('connect/' + a.getAttribute('data-p'));
    if (r.url) location.href = r.url; else M.toast(r.message || 'error', 'bad');
  };
  M.acts.pDisc = async function (a) {
    if (!confirm(t('துண்டிக்கவா?', 'Disconnect?'))) return;
    await M.B.promo('disconnect', { platform: a.getAttribute('data-p') }); M.route();
  };
  M.acts.pOn = async function (a) {
    var r = await M.B.promo('enabled', { on: a.getAttribute('data-on') === '1' });
    if (r.ok === false) return M.toast(r.message, 'bad'); M.route();
  };
  M.acts.aSubDel = async function (a) {
    if (!confirm(t('இந்தப் பதிவை (படங்களுடன்) நிரந்தரமாக நீக்கவா?', 'Delete this sign-up and its photos permanently?'))) return;
    var r = await M.api('mat_admin_submission_delete', { sid: a.getAttribute('data-id') });
    if (!r.ok) return M.toast(M.err(r), 'bad'); M.toast('✓', 'ok'); M.route();
  };
  M.acts.aExport = async function (a) {
    a.disabled = true; var r = await M.api('mat_admin_export'); a.disabled = false;
    if (!r.ok) return M.toast(M.err(r), 'bad');
    var cols = ['code', 'name', 'gender', 'age', 'phone', 'email', 'community', 'kulam', 'star', 'raasi', 'education', 'occupation', 'city', 'state', 'status', 'listed', 'created_at'];
    var q = function (x) { x = x == null ? '' : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    var csv = '\ufeff' + cols.join(',') + '\n' + (r.items || []).map(function (it) { return cols.map(function (c) { return q(it[c]); }).join(','); }).join('\n');
    var l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); l.download = 'sign-ups-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(l); l.click(); l.remove();
  };
  M.acts.aReq = async function (a) {
    var r = await M.api('mat_admin_contact_request_set', { rid: a.getAttribute('data-id'), st: 'done' });
    if (!r.ok) return M.toast(M.err(r), 'bad'); M.toast('✓', 'ok'); M.route();
  };
  M.acts.aSub = async function (a) {
    var r = await M.api('mat_admin_submission_set', { sid: a.getAttribute('data-id'), st: a.getAttribute('data-s'), note: null });
    if (!r.ok) return M.toast(M.err(r), 'bad'); M.toast('✓', 'ok'); M.route();
  };
  M.acts.aSet = async function (a) {
    var s = a.getAttribute('data-s'), note = null;
    if (s === 'rejected') { note = prompt(t('நிராகரிக்கும் காரணம் (உறுப்பினருக்குக் காட்டப்படும்):', 'Reason for rejection (shown to the member):')); if (note === null) return; }
    var r = await M.api('mat_admin_set_status', { pid: a.getAttribute('data-id'), st: s, note: note }); if (!r.ok) return M.toast(M.err(r), 'bad');
    M.toast('✓', 'ok'); M.route();
  };
  M.acts.aClose = async function (a) { await M.api('mat_admin_resolve_report', { rid: +a.getAttribute('data-id') }); M.route(); };
  M.acts.aBan = async function (a) { await M.api('mat_admin_set_chat_ban', { pid: a.getAttribute('data-id'), banned: a.getAttribute('data-v') === '1' }); M.toast('✓', 'ok'); M.route(); };
})();
