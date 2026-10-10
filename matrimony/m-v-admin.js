/* Admin panel */
(function () {
  'use strict';
  var M = window.MAT, t = M.t, esc = M.esc;

  M.views.admin = async function (v, tab) {
    if (!M.st.me || !M.st.me.is_admin) { v.innerHTML = '<div class="wrap narrow"><div class="box"><p>' + esc(t(M.ERR.forbidden[0], M.ERR.forbidden[1])) + '</p></div></div>'; return; }
    tab = tab || 'pending';
    var tabs = [['pending', t('காத்திருப்பவை', 'Pending')], ['approved', t('அங்கீகரிக்கப்பட்டவை', 'Approved')], ['rejected', t('நிராகரிக்கப்பட்டவை', 'Rejected')], ['hidden', t('மறைக்கப்பட்டவை', 'Hidden')], ['reports', t('புகார்கள்', 'Reports')], ['stats', t('புள்ளிவிவரம்', 'Stats')]];
    var head = '<div class="wrap"><h1 class="h2">🛡 ' + t('நிர்வாகம்', 'Admin') + '</h1><div class="tabsx">' + tabs.map(function (x) { return '<a class="' + (tab === x[0] ? 'on' : '') + '" href="#/admin/' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '</div>';
    if (tab === 'stats') {
      var s = await M.api('mat_admin_stats');
      if (!v.isConnected) return;
      v.innerHTML = head + '<div class="stats">' + [['pending', t('காத்திருப்பு', 'Pending')], ['approved', t('அங்கீகரிக்கப்பட்டவை', 'Approved')], ['men', t('ஆண்கள்', 'Men')], ['women', t('பெண்கள்', 'Women')], ['unlocks', t('Chat திறப்புகள்', 'Chat unlocks')], ['open_reports', t('திறந்த புகார்கள்', 'Open reports')]].map(function (k) { return '<div><b>' + (s[k[0]] || 0) + '</b><span>' + esc(k[1]) + '</span></div>'; }).join('') + '<div><b>₹' + ((s.revenue_paise || 0) / 100) + '</b><span>' + t('வருவாய்', 'Revenue') + '</span></div></div></div>';
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
  M.acts.aSet = async function (a) {
    var s = a.getAttribute('data-s'), note = null;
    if (s === 'rejected') { note = prompt(t('நிராகரிக்கும் காரணம் (உறுப்பினருக்குக் காட்டப்படும்):', 'Reason for rejection (shown to the member):')); if (note === null) return; }
    var r = await M.api('mat_admin_set_status', { pid: a.getAttribute('data-id'), st: s, note: note }); if (!r.ok) return M.toast(M.err(r), 'bad');
    M.toast('✓', 'ok'); M.route();
  };
  M.acts.aClose = async function (a) { await M.api('mat_admin_resolve_report', { rid: +a.getAttribute('data-id') }); M.route(); };
  M.acts.aBan = async function (a) { await M.api('mat_admin_set_chat_ban', { pid: a.getAttribute('data-id'), banned: a.getAttribute('data-v') === '1' }); M.toast('✓', 'ok'); M.route(); };
})();
