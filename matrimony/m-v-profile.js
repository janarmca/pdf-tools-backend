/* Profile wizard (register/edit), profile view, account hub */
(function () {
  'use strict';
  var M = window.MAT, t = M.t, esc = M.esc, D = M.D, B = M.B, F = window.MatFilter;
  var W = null; // wizard state {step, d, phone, saved}
  var STEPS = [
    { ta: 'அடிப்படை விவரம்', en: 'Basic details' }, { ta: 'ஜாதகம்', en: 'Horoscope' }, { ta: 'கல்வி & தொழில்', en: 'Education & work' },
    { ta: 'குடும்பம் & இருப்பிடம்', en: 'Family & location' }, { ta: 'பற்றி & எதிர்பார்ப்பு', en: 'About & preferences' }, { ta: 'படங்கள் & சமர்ப்பிப்பு', en: 'Photos & submit' }
  ];
  var DRAFT = 'mat_wiz_draft';

  function initWizard() {
    var me = M.st.me, d = {};
    if (me && !me.none) {
      ['created_for', 'name', 'gender', 'dob', 'religion', 'community', 'community_other', 'kulam', 'gotra', 'mother_tongue', 'star', 'raasi', 'dosham', 'marital', 'height_cm', 'diet', 'education', 'education_detail', 'occupation', 'employer_type', 'income_band', 'city', 'district', 'state', 'country', 'father_occ', 'mother_occ', 'brothers', 'sisters', 'family_type', 'family_status', 'about'].forEach(function (k) { if (me[k] != null) d[k] = me[k]; });
      d.pref = me.pref || {}; d.photos = (me.photos || []).slice(); d.consent = true;
      return { step: 0, d: d, phone: '', edit: true };
    }
    try { var s = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (s && s.d) { s.step = s.step || 0; return s; } } catch (e) {}
    return { step: 0, d: { created_for: 'self', religion: 'hindu', community: 'kannada_devanga', marital: 'never', dosham: 'no', country: 'India', pref: {}, photos: [] }, phone: '' };
  }
  function saveDraft() { if (!W.edit) try { localStorage.setItem(DRAFT, JSON.stringify({ step: W.step, d: W.d, phone: W.phone })); } catch (e) {} }

  function fld(label, inner, hint, cls) { return '<label class="fld ' + (cls || '') + '"><span>' + label + '</span>' + inner + (hint ? '<small>' + hint + '</small>' : '') + '</label>'; }
  function inp(k, type, extra) { var v = W.d[k]; return '<input data-f="' + k + '" type="' + (type || 'text') + '" value="' + esc(v == null ? '' : v) + '" ' + (extra || '') + '>'; }
  function sel(k, list, blank) { return '<select data-f="' + k + '">' + M.opts(list, W.d[k], blank) + '</select>'; }
  function chips(k, list, arrKey) {
    var cur = (arrKey ? W.d.pref[k] : W.d[k]) || [];
    return '<div class="chips">' + D[list].map(function (x) { return '<label class="chip"><input type="checkbox" data-pref="' + k + '" value="' + esc(x.v) + '"' + (cur.indexOf(x.v) >= 0 ? ' checked' : '') + '><span>' + esc(M.st.lang === 'en' ? x.en : x.ta) + '</span></label>'; }).join('') + '</div>';
  }

  function stepHtml(i) {
    var d = W.d;
    if (i === 0) return '<div class="gridf">' +
      fld(t('யாருக்காகப் பதிவு?', 'Registering for'), sel('created_for', 'created_for', false)) +
      fld(t('பெயர்', 'Name'), inp('name', 'text', 'maxlength="60" autocomplete="off"'), t('முதல் பெயர் போதும். தொலைபேசி எண் எழுதக்கூடாது.', 'First name is enough. Do not write phone numbers.')) +
      '<div class="fld"><span>' + t('பாலினம்', 'Gender') + '</span><div class="rad">' + D.gender.map(function (x) { return '<label class="chip"><input type="radio" name="gender" data-f="gender" value="' + x.v + '"' + (d.gender === x.v ? ' checked' : '') + '><span>' + esc(M.st.lang === 'en' ? x.en : x.ta) + '</span></label>'; }).join('') + '</div></div>' +
      fld(t('பிறந்த தேதி', 'Date of birth'), inp('dob', 'date', 'max="' + new Date().toISOString().slice(0, 10) + '"')) +
      fld(t('திருமண நிலை', 'Marital status'), sel('marital', 'marital', false)) +
      fld(t('மதம்', 'Religion'), sel('religion', 'religion', false)) +
      fld(t('சமூகம்', 'Community'), sel('community', 'community', false)) +
      (d.community === 'other' ? fld(t('சமூகத்தின் பெயர்', 'Community name'), inp('community_other', 'text', 'maxlength="40"')) : '') +
      fld(t('குலம்', 'Kulam'), inp('kulam', 'text', 'maxlength="40"')) + fld(t('கோத்திரம்', 'Gotra'), inp('gotra', 'text', 'maxlength="40"')) +
      fld(t('தாய்மொழி', 'Mother tongue'), sel('mother_tongue', 'mother_tongue')) + '</div>';
    if (i === 1) return '<p class="mut">' + t('தெரியாவிட்டால் காலியாக விடலாம்; பின்னர் சேர்க்கலாம்.', 'Leave blank if unknown; you can add it later.') + '</p><div class="gridf">' +
      fld(t('நட்சத்திரம்', 'Star (Nakshatra)'), sel('star', 'star')) + fld(t('ராசி', 'Raasi'), sel('raasi', 'raasi')) + fld(t('தோஷம்', 'Dosham'), sel('dosham', 'dosham', false)) + '</div>';
    if (i === 2) return '<div class="gridf">' +
      fld(t('கல்வி', 'Education'), sel('education', 'education')) + fld(t('படிப்பு விவரம்', 'Course / college'), inp('education_detail', 'text', 'maxlength="80"'), t('எ.கா. B.E ECE', 'e.g. B.E ECE')) +
      fld(t('பணி வகை', 'Employment type'), sel('employer_type', 'employer_type')) + fld(t('தொழில் / பதவி', 'Occupation'), inp('occupation', 'text', 'maxlength="60"')) +
      fld(t('ஆண்டு வருமானம்', 'Annual income'), sel('income_band', 'income_band'), t('விரும்பினால் மட்டும்', 'Optional')) +
      fld(t('உயரம் (செ.மீ)', 'Height (cm)'), inp('height_cm', 'number', 'min="120" max="230"')) + fld(t('உணவுப் பழக்கம்', 'Diet'), sel('diet', 'diet')) + '</div>';
    if (i === 3) return '<div class="gridf">' +
      fld(t('தந்தை தொழில்', "Father's occupation"), inp('father_occ', 'text', 'maxlength="60"')) + fld(t('தாய் தொழில்', "Mother's occupation"), inp('mother_occ', 'text', 'maxlength="60"')) +
      fld(t('சகோதரர்கள்', 'Brothers'), inp('brothers', 'number', 'min="0" max="15"')) + fld(t('சகோதரிகள்', 'Sisters'), inp('sisters', 'number', 'min="0" max="15"')) +
      fld(t('குடும்ப வகை', 'Family type'), sel('family_type', 'family_type')) + fld(t('குடும்ப நிலை', 'Family status'), sel('family_status', 'family_status')) +
      fld(t('ஊர் / நகரம்', 'City'), inp('city', 'text', 'maxlength="50"')) + fld(t('மாவட்டம்', 'District'), inp('district', 'text', 'maxlength="50"')) +
      fld(t('மாநிலம்', 'State'), sel('state', 'state')) + fld(t('நாடு', 'Country'), inp('country', 'text', 'maxlength="40"')) + '</div>' +
      '<div class="notice"><b>🔒 ' + t('தொலைபேசி எண் (நிர்வாகிக்கு மட்டும்)', 'Phone number (admin only)') + '</b>' + fld(t('மொபைல் எண்', 'Mobile number'), '<input id="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" value="' + esc(W.phone) + '">', t('சரிபார்ப்புக்காக மட்டும். எந்த உறுப்பினருக்கும் ஒருபோதும் காட்டப்படாது.', 'Only for verification. Never shown to any member.')) + '</div>';
    if (i === 4) return fld(t('உங்களைப் பற்றி', 'About'), '<textarea data-f="about" rows="5" maxlength="600" placeholder="' + esc(t('குடும்பம், விருப்பங்கள், எதிர்பார்ப்பு... (எண்/email எழுதக்கூடாது)', 'Family, interests, expectations... (no numbers / e-mail)')) + '">' + esc(d.about || '') + '</textarea><div class="cnt"><span id="aboutcnt">' + (d.about || '').length + '</span>/600</div>') +
      '<h3 class="h3">' + t('துணையிடம் எதிர்பார்ப்பு', 'Partner preferences') + '</h3><div class="gridf">' +
      fld(t('குறைந்த வயது', 'Min age'), '<input data-pref="min_age" type="number" min="18" max="80" value="' + esc(d.pref.min_age || '') + '">') + fld(t('அதிகபட்ச வயது', 'Max age'), '<input data-pref="max_age" type="number" min="18" max="80" value="' + esc(d.pref.max_age || '') + '">') + '</div>' +
      '<div class="fld"><span>' + t('சமூகம் (தேர்வு செய்யாவிட்டால் அனைத்தும்)', 'Community (none = any)') + '</span>' + chips('community', 'community', true) + '</div>' +
      '<div class="fld"><span>' + t('திருமண நிலை', 'Marital status') + '</span>' + chips('marital', 'marital', true) + '</div>';
    var n = (d.photos || []).length, hasConsent = !!d.consent;
    return '<p class="mut">' + t('தெளிவான முகப் படம் உங்களுக்கு அதிக Interest பெற்றுத் தரும். அங்கீகரிக்கப்பட்ட உறுப்பினர்கள் மட்டுமே பார்க்க முடியும். (அதிகபட்சம் 6)', 'A clear face photo gets more interest. Only approved members can see it. (max 6)') + '</p>' +
      '<div class="ph-grid" id="phg">' + (d.photos || []).map(function (p, i) { return '<div class="ph"><img alt="" data-ph="' + esc(p) + '"><div class="phb">' + (i ? '<button type="button" data-act="phMain" data-i="' + i + '">★</button>' : '<span class="main">' + t('முதன்மை', 'Main') + '</span>') + '<button type="button" data-act="phDel" data-i="' + i + '" aria-label="delete">🗑</button></div></div>'; }).join('') +
      (n < 6 ? '<label class="ph add"><input id="phin" type="file" accept="image/*" multiple hidden><span>＋<br>' + t('படம் சேர்', 'Add photo') + '</span></label>' : '') + '</div><p class="err" id="pherr"></p>' +
      '<div class="notice">' + t('நிர்வாகி சரிபார்த்த பின்பே உங்கள் சுயவிவரம் மற்றவர்களுக்குத் தெரியும் (பொதுவாக 24 மணி நேரத்தில்).', 'Your profile becomes visible after admin verification (usually within 24 hours).') + '</div>' +
      (W.edit ? '' : '<label class="chk"><input id="consent" type="checkbox"' + (hasConsent ? ' checked' : '') + '> <span>' + t('நான் கொடுத்த தகவல்கள் உண்மை; என் சுயவிவரத்தை அங்கீகரிக்கப்பட்ட உறுப்பினர்கள் பார்க்க ஒப்புக்கொள்கிறேன்; ', 'The details are true; I agree that approved members may view my profile; ') + '<a href="#/terms" target="_blank">' + t('விதிமுறைகள்', 'Terms') + '</a></span></label>');
  }

  function renderWizard() {
    var v = M.$('#view'), i = W.step, last = i === STEPS.length - 1;
    v.innerHTML = '<div class="wrap narrow"><div class="box wz"><div class="prog" aria-label="progress">' + STEPS.map(function (s, k) { return '<button type="button" class="pdot ' + (k === i ? 'on' : k < i ? 'done' : '') + '" data-act="wzGo" data-i="' + k + '" aria-label="' + esc(t(s.ta, s.en)) + '"><b>' + (k + 1) + '</b></button>'; }).join('') + '</div>' +
      '<h1 class="h2">' + esc(t(STEPS[i].ta, STEPS[i].en)) + ' <small>' + (i + 1) + '/' + STEPS.length + '</small></h1>' +
      '<div id="stepbody">' + stepHtml(i) + '</div><p class="err" id="wzerr" role="alert"></p>' +
      '<div class="wzbar">' + (i ? '<button class="btn ghost" data-act="wzBack">← ' + t('பின்', 'Back') + '</button>' : '<span></span>') +
      (last ? '<button class="btn pri big" data-act="wzSubmit">' + (W.edit ? t('சேமி', 'Save') : t('சமர்ப்பி', 'Submit')) + '</button>' : '<button class="btn pri big" data-act="wzNext">' + t('அடுத்து', 'Next') + ' →</button>') + '</div></div></div>';
    M.hydrate(v); bindWizard();
    var first = v.querySelector('#stepbody input,#stepbody select,#stepbody textarea'); if (first && window.innerWidth > 700) first.focus();
  }
  function bindWizard() {
    var body = M.$('#stepbody');
    body.addEventListener('input', onField); body.addEventListener('change', onField);
    var ph = M.$('#phin'); if (ph) ph.addEventListener('change', onPhotos);
  }
  function onField(e) {
    var el = e.target;
    if (el.id === 'phone') { W.phone = el.value.replace(/[^\d+ ]/g, ''); saveDraft(); return; }
    if (el.id === 'consent') { W.d.consent = el.checked; return; }
    if (el.hasAttribute('data-f')) {
      var k = el.getAttribute('data-f'), val = el.type === 'radio' ? (el.checked ? el.value : W.d[k]) : el.value;
      W.d[k] = val; if (k === 'about') M.$('#aboutcnt').textContent = val.length;
      if (k === 'community' && e.type === 'change') { saveDraft(); renderWizard(); return; }
    } else if (el.hasAttribute('data-pref')) {
      var pk = el.getAttribute('data-pref');
      if (el.type === 'checkbox') { var a = W.d.pref[pk] || []; a = a.filter(function (x) { return x !== el.value; }); if (el.checked) a.push(el.value); W.d.pref[pk] = a; }
      else W.d.pref[pk] = el.value ? parseInt(el.value, 10) : '';
    }
    saveDraft();
  }
  function textFields() { return ['name', 'community_other', 'kulam', 'gotra', 'education_detail', 'occupation', 'father_occ', 'mother_occ', 'about', 'city', 'district']; }
  function validate(i) {
    var d = W.d, e = '';
    if (i === 0) {
      if (!d.name || d.name.trim().length < 2) e = t('பெயரை உள்ளிடுங்கள்', 'Enter a name');
      else if (!d.gender) e = t('பாலினத்தைத் தேர்வு செய்க', 'Choose gender');
      else if (!d.dob) e = t('பிறந்த தேதியை உள்ளிடுங்கள்', 'Enter date of birth');
      else { var a = M.age(d.dob); if (a > 80 || a < 0) e = M.ERR.dob[M.st.lang === 'en' ? 1 : 0]; else if ((d.gender === 'M' && a < 21) || (d.gender === 'F' && a < 18)) e = t(M.ERR.age[0], M.ERR.age[1]); }
      if (!e && d.community === 'other' && !(d.community_other || '').trim()) e = t('சமூகத்தின் பெயரை உள்ளிடுங்கள்', 'Enter the community name');
    }
    if (i === 2 && !e) { if (!d.education) e = t('கல்வியைத் தேர்வு செய்க', 'Choose education'); else if (!(d.occupation || '').trim()) e = t('தொழிலை உள்ளிடுங்கள்', 'Enter occupation'); }
    if (i === 3 && !e) {
      if (!(d.city || '').trim()) e = t('ஊர் / நகரத்தை உள்ளிடுங்கள்', 'Enter city'); else if (!d.state) e = t('மாநிலத்தைத் தேர்வு செய்க', 'Choose state');
      else if (!W.edit && W.phone.replace(/\D/g, '').length < 10) e = t('சரியான மொபைல் எண்ணை உள்ளிடுங்கள் (நிர்வாகிக்கு மட்டும்)', 'Enter a valid mobile number (admin only)');
    }
    if (i === 4 && !e) {
      var p = d.pref; if (p.min_age && p.max_age && +p.min_age > +p.max_age) e = t('குறைந்த வயது அதிகபட்சத்தை விடப் பெரிதாக இருக்கக்கூடாது', 'Min age cannot exceed max age');
    }
    if (!e) for (var k of textFields()) { var r = F && d[k] ? F.check(d[k]) : null; if (r) { e = t(M.ERR.contact_in_profile[0], M.ERR.contact_in_profile[1]); break; } }
    if (i === 5 && !e && !W.edit && !d.consent) e = t(M.ERR.consent[0], M.ERR.consent[1]);
    return e;
  }
  function showErr(e) { var el = M.$('#wzerr'); if (el) { el.textContent = e || ''; if (e) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }

  M.acts.wzNext = function () { var e = validate(W.step); if (e) return showErr(e); W.step++; saveDraft(); renderWizard(); window.scrollTo(0, 0); };
  M.acts.wzBack = function () { W.step = Math.max(0, W.step - 1); renderWizard(); window.scrollTo(0, 0); };
  M.acts.wzGo = function (a) { var to = +a.getAttribute('data-i'); if (to <= W.step) { W.step = to; renderWizard(); return; } for (var s = W.step; s < to; s++) { var e = validate(s); if (e) { W.step = s; renderWizard(); showErr(e); return; } } W.step = to; renderWizard(); };
  M.acts.phDel = function (a) { var i = +a.getAttribute('data-i'); var p = W.d.photos.splice(i, 1)[0]; B.removePhoto(p); saveDraft(); renderWizard(); };
  M.acts.phMain = function (a) { var i = +a.getAttribute('data-i'); var p = W.d.photos.splice(i, 1)[0]; W.d.photos.unshift(p); saveDraft(); renderWizard(); };

  function resize(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 900, s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); }; img.src = url;
    });
  }
  async function onPhotos(e) {
    var files = Array.prototype.slice.call(e.target.files || []), err = M.$('#pherr'); err.textContent = '';
    for (var f of files) {
      if (W.d.photos.length >= 6) break;
      if (!/^image\//.test(f.type)) { err.textContent = t('படக் கோப்பு மட்டும்', 'Images only'); continue; }
      if (f.size > 15 * 1024 * 1024) { err.textContent = t('படம் மிகப் பெரியது (15MB வரை)', 'Image too large (max 15MB)'); continue; }
      try { var blob = await resize(f); W.d.photos.push(await B.uploadPhoto(blob, M.st.user.id)); }
      catch (x) { err.textContent = t('படத்தைப் பதிவேற்ற முடியவில்லை: ', 'Upload failed: ') + (x.message || ''); }
    }
    saveDraft(); renderWizard();
  }
  M.acts.wzSubmit = async function (a) {
    for (var s = 0; s < STEPS.length; s++) { var e = validate(s); if (e) { W.step = s; renderWizard(); showErr(e); return; } }
    a.disabled = true;
    var p = Object.assign({}, W.d); p.consent = 'true';
    ['height_cm', 'brothers', 'sisters'].forEach(function (k) { if (p[k] === '' || p[k] == null) delete p[k]; });
    var r = await M.api('mat_save_profile', { p: p, phone: W.phone || null, email: M.st.user.email || null });
    a.disabled = false;
    if (!r.ok) {
      if (r.code === 'contact_in_profile') { showErr(t(M.ERR.contact_in_profile[0], M.ERR.contact_in_profile[1]) + ' (' + (r.field || '') + ')'); return; }
      return showErr(M.err(r));
    }
    try { localStorage.removeItem(DRAFT); } catch (x) {}
    W = null; await M.refreshMe(); M.mountShell();
    M.toast(r.status === 'approved' ? t('சேமிக்கப்பட்டது ✓', 'Saved ✓') : t('சமர்ப்பிக்கப்பட்டது — நிர்வாகி சரிபார்ப்பார்', 'Submitted — admin will verify'), 'ok');
    M.nav('#/');
  };

  M.views.wizard = async function (v) {
    if (!M.st.me) await M.refreshMe();
    if (!W || (W.edit && M.st.me && M.st.me.none) ) W = initWizard();
    if (!W || (M.st.me && !M.st.me.none && !W.edit) ) W = initWizard();
    renderWizard();
  };

  /* ---------------- profile view ---------------- */
  function row(k, v) { return v ? '<div class="kv"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>' : ''; }
  function sec(title, rows) { var h = rows.join(''); return h ? '<section class="psec"><h3>' + esc(title) + '</h3>' + h + '</section>' : ''; }

  M.views.profile = async function (v, id) {
    var r = await M.api('mat_get_profile', { pid: id });
    if (!v.isConnected) return;
    if (!r.ok) { v.innerHTML = '<div class="wrap narrow"><div class="box"><p>' + esc(M.err(r)) + '</p><a class="btn" href="#/search">← ' + t('தேடல்', 'Search') + '</a></div></div>'; return; }
    var p = r.profile, self = r.self, pref = p.pref || {};
    M.pageTitle = p.name;
    var photos = (p.photos || []);
    var gallery = '<div class="gal"><div class="gmain">' + (photos.length ? '<img alt="' + esc(p.name) + '" id="gm" data-ph="' + esc(photos[0]) + '">' : M.avatar(p, true)) + '</div>' +
      (photos.length > 1 ? '<div class="gth">' + photos.map(function (x, i) { return '<button type="button" data-act="gal" data-i="' + i + '" aria-label="photo ' + (i + 1) + '"><img alt="" data-ph="' + esc(x) + '"></button>'; }).join('') + '</div>' : '') + '</div>';
    var prefTxt = [pref.min_age || pref.max_age ? (pref.min_age || '18') + '–' + (pref.max_age || '') + t(' வயது', ' yrs') : '', (pref.community || []).map(function (c) { return M.label('community', c); }).join(', '), (pref.marital || []).map(function (c) { return M.label('marital', c); }).join(', ')].filter(Boolean).join(' · ');
    var status = self && p.status !== 'approved' ? '<div class="notice ' + (p.status === 'rejected' ? 'warn' : '') + '"><b>' + t('நிலை', 'Status') + ': ' + esc(p.status === 'pending' ? t('சரிபார்ப்புக்காகக் காத்திருக்கிறது', 'Waiting for verification') : p.status === 'rejected' ? t('நிராகரிக்கப்பட்டது', 'Rejected') : t('மறைக்கப்பட்டுள்ளது', 'Hidden')) + '</b>' + (p.admin_note ? '<p>' + esc(p.admin_note) + '</p>' : '') + '</div>' : '';
    v.innerHTML = '<div class="wrap pv">' + status +
      '<div class="pvh">' + gallery + '<div class="pvt"><h1>' + esc(p.name) + (p.community === 'kannada_devanga' ? ' <span class="kd">★</span>' : '') + '</h1><p class="sub">' + esc(M.sub(p)) + '</p><div class="pt"><span class="tg">' + esc(M.commLabel(p)) + '</span>' + (p.marital ? '<span class="tg">' + esc(M.label('marital', p.marital)) + '</span>' : '') + (p.dosham && p.dosham !== 'no' ? '<span class="tg">' + esc(M.label('dosham', p.dosham)) + '</span>' : '') + '</div>' +
      (self ? '<div class="acts"><a class="btn pri" href="#/wizard">✎ ' + t('திருத்து', 'Edit profile') + '</a></div>' : actionsHtml(p, r)) + '</div></div>' +
      (p.about ? '<section class="psec"><h3>' + t('பற்றி', 'About') + '</h3><p class="about">' + esc(p.about) + '</p></section>' : '') +
      '<div class="pgrid">' +
      sec(t('சமூகம் & ஜாதகம்', 'Community & horoscope'), [row(t('மதம்', 'Religion'), M.label('religion', p.religion)), row(t('சமூகம்', 'Community'), M.commLabel(p)), row(t('குலம்', 'Kulam'), p.kulam), row(t('கோத்திரம்', 'Gotra'), p.gotra), row(t('தாய்மொழி', 'Mother tongue'), M.label('mother_tongue', p.mother_tongue)), row(t('நட்சத்திரம்', 'Star'), M.label('star', p.star)), row(t('ராசி', 'Raasi'), M.label('raasi', p.raasi)), row(t('தோஷம்', 'Dosham'), M.label('dosham', p.dosham))]) +
      sec(t('கல்வி & தொழில்', 'Education & career'), [row(t('கல்வி', 'Education'), [M.label('education', p.education), p.education_detail].filter(Boolean).join(' – ')), row(t('தொழில்', 'Occupation'), p.occupation), row(t('பணி வகை', 'Employment'), M.label('employer_type', p.employer_type)), row(t('வருமானம்', 'Income'), M.label('income_band', p.income_band))]) +
      sec(t('தனிப்பட்ட விவரம்', 'Personal'), [row(t('உயரம்', 'Height'), p.height_cm ? M.cm(p.height_cm) : ''), row(t('உணவு', 'Diet'), M.label('diet', p.diet)), row(t('பதிவு செய்தவர்', 'Profile by'), M.label('created_for', p.created_for))]) +
      sec(t('குடும்பம்', 'Family'), [row(t('தந்தை', 'Father'), p.father_occ), row(t('தாய்', 'Mother'), p.mother_occ), row(t('சகோதரர்கள்', 'Brothers'), p.brothers != null ? String(p.brothers) : ''), row(t('சகோதரிகள்', 'Sisters'), p.sisters != null ? String(p.sisters) : ''), row(t('குடும்ப வகை', 'Family type'), M.label('family_type', p.family_type)), row(t('குடும்ப நிலை', 'Family status'), M.label('family_status', p.family_status))]) +
      sec(t('இருப்பிடம்', 'Location'), [row(t('ஊர்', 'City'), p.city), row(t('மாவட்டம்', 'District'), p.district), row(t('மாநிலம்', 'State'), M.label('state', p.state)), row(t('நாடு', 'Country'), p.country)]) +
      sec(t('துணையிடம் எதிர்பார்ப்பு', 'Partner preferences'), [prefTxt ? '<p>' + esc(prefTxt) + '</p>' : '']) + '</div>' +
      (self ? '' : '<p class="mut c"><a href="#" data-act="moreMenu" data-id="' + esc(p.id) + '">' + t('தடு / புகார் செய்', 'Block / Report') + '</a></p>') + '</div>';
    M.$$('.gth button', v).forEach(function () {});
  };
  M.acts.gal = function (a) { var im = a.querySelector('img'), g = M.$('#gm'); if (im && g) g.src = im.src; };

  function actionsHtml(p, r) {
    var it = p.interest, id = esc(p.id), h = '';
    if (!it) h += '<button class="btn pri" data-act="interest" data-id="' + id + '">💌 ' + t('Interest அனுப்பு', 'Send interest') + '</button>';
    else if (it.status === 'pending' && it.dir === 'out') h += '<button class="btn" disabled>✓ ' + t('Interest அனுப்பப்பட்டது', 'Interest sent') + '</button>';
    else if (it.status === 'pending' && it.dir === 'in') h += '<button class="btn pri" data-act="respond" data-yes="1" data-iid="' + it.id + '">✓ ' + t('ஏற்கிறேன்', 'Accept') + '</button><button class="btn ghost" data-act="respond" data-yes="0" data-iid="' + it.id + '">✕ ' + t('மறுக்கிறேன்', 'Decline') + '</button>';
    else if (it.status === 'accepted') h += '<a class="btn pri" href="#/chat/' + id + '">💬 ' + (r.unlocked ? t('Chat', 'Chat') : t('Chat திறக்க (₹' + M.C.FEE_RS + ')', 'Unlock chat (₹' + M.C.FEE_RS + ')')) + '</a>';
    else h += '<button class="btn" disabled>' + t('இந்த Interest மறுக்கப்பட்டது', 'Interest declined') + '</button>';
    h += '<button class="btn ghost" data-act="shortlist" data-id="' + id + '" aria-pressed="' + (p.shortlisted ? 'true' : 'false') + '">' + (p.shortlisted ? '♥ ' + t('விருப்பப்பட்டியலில்', 'Shortlisted') : '♡ ' + t('விருப்பப்பட்டியல்', 'Shortlist')) + '</button>';
    return '<div class="acts">' + h + '</div>';
  }

  M.acts.shortlist = async function (a) {
    var r = await M.api('mat_toggle_shortlist', { pid: a.getAttribute('data-id') }); if (!r.ok) return M.toast(M.err(r), 'bad');
    a.setAttribute('aria-pressed', r.shortlisted); a.textContent = r.shortlisted ? '♥ ' + t('விருப்பப்பட்டியலில்', 'Shortlisted') : '♡ ' + t('விருப்பப்பட்டியல்', 'Shortlist');
  };
  M.acts.interest = function (a) {
    var id = a.getAttribute('data-id');
    var w = M.modal('<h2>💌 ' + t('Interest அனுப்பு', 'Send interest') + '</h2><p class="mut">' + t('ஒரு சிறிய அறிமுகம் எழுதலாம் (விரும்பினால்). தொலைபேசி எண்/email எழுதக்கூடாது.', 'Add a short intro (optional). Do not write phone numbers or e-mail.') + '</p><textarea id="inote" rows="3" maxlength="200" placeholder="' + esc(t('வணக்கம், உங்கள் சுயவிவரம் பிடித்திருந்தது...', 'Hello, we liked your profile...')) + '"></textarea><p class="err" id="ierr"></p><button class="btn pri full" id="isend">' + t('அனுப்பு', 'Send') + '</button>');
    M.$('#isend', w).addEventListener('click', async function () {
      var note = M.$('#inote').value.trim(), err = M.$('#ierr');
      if (note && F.check(note)) { err.textContent = t(M.ERR.contact_blocked[0], M.ERR.contact_blocked[1]); return; }
      this.disabled = true; var r = await M.api('mat_send_interest', { pid: id, note: note || null }); this.disabled = false;
      if (!r.ok) { err.textContent = M.err(r); return; }
      M.closeModal(); M.toast(r.mutual ? t('இருவரும் விரும்புகிறீர்கள்! 🎉', "It's a mutual match! 🎉") : t('Interest அனுப்பப்பட்டது ✓', 'Interest sent ✓'), 'ok'); M.pollCounts(); M.route();
    });
  };
  M.acts.respond = async function (a) {
    var r = await M.api('mat_respond_interest', { iid: +a.getAttribute('data-iid'), accept: a.getAttribute('data-yes') === '1' }); if (!r.ok) return M.toast(M.err(r), 'bad');
    M.toast(a.getAttribute('data-yes') === '1' ? t('ஏற்கப்பட்டது ✓', 'Accepted ✓') : t('மறுக்கப்பட்டது', 'Declined'), 'ok'); M.pollCounts(); M.route();
  };
  M.acts.moreMenu = function (a) {
    var id = a.getAttribute('data-id');
    var w = M.modal('<h2>' + t('தடு / புகார்', 'Block / Report') + '</h2><label class="fld"><span>' + t('காரணம்', 'Reason') + '</span><select id="rrs">' + M.opts('report_reason', 'other', false) + '</select></label><label class="fld"><span>' + t('விவரம் (விரும்பினால்)', 'Details (optional)') + '</span><textarea id="rdt" rows="3" maxlength="500"></textarea></label><p class="err" id="rerr2"></p><div class="rowb"><button class="btn pri" id="rrep">' + t('புகார் அனுப்பு', 'Report') + '</button><button class="btn ghost" id="rblk">' + t('தடு', 'Block') + '</button></div>');
    M.$('#rrep', w).addEventListener('click', async function () { var r = await M.api('mat_report', { pid: id, reason: M.$('#rrs').value, detail: M.$('#rdt').value || null }); if (r.ok) { M.closeModal(); M.toast(t('புகார் பெறப்பட்டது', 'Report received'), 'ok'); } else M.$('#rerr2').textContent = M.err(r); });
    M.$('#rblk', w).addEventListener('click', async function () { if (!confirm(t('இவரைத் தடுக்கவா? இருவருக்கும் சுயவிவரம் தெரியாது.', 'Block this member? You will not see each other.'))) return; var r = await M.api('mat_block', { pid: id, on_off: true }); if (r.ok) { M.closeModal(); M.toast(t('தடுக்கப்பட்டது', 'Blocked'), 'ok'); M.nav('#/search'); } else M.$('#rerr2').textContent = M.err(r); });
  };

  /* ---------------- account hub ---------------- */
  M.views.me = M.views.settings = async function (v) {
    await M.refreshMe();
    if (!v.isConnected) return;
    var me = M.st.me, u = M.st.user;
    var st = me.none ? '' : me.status, isAdm = me.is_admin;
    v.innerHTML = '<div class="wrap narrow"><div class="box"><h1 class="h2">' + t('என் கணக்கு', 'My account') + '</h1><p class="mut">' + esc(u.email) + '</p>' +
      (me.none ? '<a class="btn pri" href="#/wizard">' + t('சுயவிவரம் உருவாக்கு', 'Create profile') + '</a>' :
        '<div class="kv"><span>' + t('சுயவிவர நிலை', 'Profile status') + '</span><b>' + esc(st === 'approved' ? t('அங்கீகரிக்கப்பட்டது', 'Approved') : st === 'pending' ? t('காத்திருக்கிறது', 'Pending') : st === 'rejected' ? t('நிராகரிக்கப்பட்டது', 'Rejected') : t('மறைக்கப்பட்டுள்ளது', 'Hidden')) + '</b></div>' +
        '<div class="menu"><a href="#/profile/' + esc(u.id) + '">👁 ' + t('என் சுயவிவரத்தைப் பார்', 'View my profile') + '</a><a href="#/wizard">✎ ' + t('சுயவிவரத்தைத் திருத்து', 'Edit my profile') + '</a>' +
        (st === 'approved' ? '<a href="#" data-act="hideMe" data-v="1">🙈 ' + t('என் சுயவிவரத்தை மறை', 'Hide my profile') + '</a>' : st === 'hidden' ? '<a href="#" data-act="hideMe" data-v="0">👁 ' + t('சுயவிவரத்தை மீண்டும் காட்டு', 'Show my profile again') + '</a>' : '') + '</div>') +
      (isAdm ? '<div class="menu"><a href="#/admin">🛡 ' + t('நிர்வாகப் பக்கம்', 'Admin panel') + '</a></div>' : '') +
      '<div class="menu"><a href="#/safety">🛟 ' + t('பாதுகாப்பு வழிகாட்டி', 'Safety guide') + '</a><a href="#" data-act="logout">⎋ ' + t('வெளியேறு', 'Logout') + '</a></div>' +
      (me.none ? '' : '<details class="danger"><summary>' + t('கணக்கு நீக்கம்', 'Delete account data') + '</summary><p>' + t('உங்கள் சுயவிவரம், Interest, செய்திகள் நிரந்தரமாக நீக்கப்படும்.', 'Your profile, interests and messages will be permanently deleted.') + '</p><button class="btn bad" data-act="delMe">' + t('என் தரவை நீக்கு', 'Delete my data') + '</button></details>') + '</div></div>';
  };
  M.acts.hideMe = async function (a) { var r = await M.api('mat_set_visibility', { hide: a.getAttribute('data-v') === '1' }); if (r.ok) { M.toast(t('சேமிக்கப்பட்டது ✓', 'Saved ✓'), 'ok'); await M.refreshMe(); M.route(); } };
  M.acts.logout = async function () { await B.signOut(); await M.setUser(null); M.nav('#/'); };
  M.acts.delMe = async function () {
    if (!confirm(t('உறுதியாக நீக்கவா? இதை மீட்க முடியாது.', 'Delete for sure? This cannot be undone.'))) return;
    var r = await M.api('mat_delete_me'); if (!r.ok) return M.toast(M.err(r), 'bad');
    try { localStorage.removeItem(DRAFT); } catch (e) {} W = null; await M.refreshMe(); M.mountShell(); M.toast(t('நீக்கப்பட்டது', 'Deleted'), 'ok'); M.nav('#/wizard');
  };
})();
