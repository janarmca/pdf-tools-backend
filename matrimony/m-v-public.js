/* Public views: landing, login, register, forgot, static pages */
(function () {
  'use strict';
  var M = window.MAT, t = M.t, esc = M.esc, B = M.B;

  M.views.home = async function (v) {
    var st = await M.api('mat_public_stats');
    if (!v.isConnected) return;
    var setup = st && st.code === 'not_installed';
    var members = st && st.members != null ? st.members : null;
    v.innerHTML =
      '<section class="hero"><div class="wrap">' +
        '<p class="kick">' + t('கன்னட தேவாங்கர் சமூகத்திற்காக • அனைத்து சமூகத்தினரும் வரவேற்கப்படுகிறார்கள்', 'Made for the Kannada Devanga community • All communities welcome') + '</p>' +
        '<h1>' + t('சௌடேஸ்வரி திருமண அமைப்பகம்', 'Chowdeshwari Thirumana Amaippagam') + '</h1>' +
        '<p class="lead">' + t('நம்பகமான, சரிபார்க்கப்பட்ட சுயவிவரங்கள். உங்கள் தொலைபேசி எண்ணும் email-உம் யாருக்கும் தெரியாது. Interest அனுப்புவது இலவசம்.', 'Verified profiles you can trust. Your phone number and e-mail stay private. Sending interest is free.') + '</p>' +
        '<div class="cta"><a class="btn big" href="#/register">' + t('இலவசமாகப் பதிவு செய்க', 'Register free') + '</a><a class="btn ghost big" href="#/login">' + t('உள்நுழை', 'Login') + '</a></div>' +
        (members != null ? '<p class="stat"><b>' + members + '</b> ' + t('அங்கீகரிக்கப்பட்ட சுயவிவரங்கள்', 'approved profiles') + (st.devanga ? ' · <b>' + st.devanga + '</b> ' + t('கன்னட தேவாங்கர்', 'Kannada Devanga') : '') + '</p>' : '') +
      '</div></section>' +
      (M.st.bootError ? '<div class="wrap"><div class="notice warn"><b>' + t('இணைப்புப் பிழை', 'Connection problem') + '</b><p>' + t('சேவையகத்துடன் இணைக்க முடியவில்லை. இணையத்தைச் சரிபார்த்து மீண்டும் திறக்கவும்.', 'Could not reach the server. Check your internet and reload.') + '</p></div></div>' : '') +
      (setup ? '<div class="wrap"><div class="notice warn"><b>' + t('தள அமைப்பு முடியவில்லை', 'Site setup not finished') + '</b><p>' + t('Supabase-ல் schema.sql இன்னும் இயக்கப்படவில்லை. README-ல் உள்ள படிகளைப் பின்பற்றுங்கள். அதுவரை டெமோவில் முழு தளத்தையும் பார்க்கலாம்.', 'schema.sql has not been run in Supabase yet. Follow the README. Meanwhile you can try everything in demo mode.') + '</p><a class="btn sm" href="?demo=1">' + t('டெமோவில் பார்க்க', 'Try demo') + '</a></div></div>' : '') +
      '<section class="wrap sec"><h2>' + t('ஏன் எங்கள் அமைப்பகம்?', 'Why choose us?') + '</h2><div class="grid4">' +
        feat('✅', t('நிர்வாகி சரிபார்ப்பு', 'Admin-verified'), t('ஒவ்வொரு சுயவிவரமும் நிர்வாகியால் சரிபார்க்கப்பட்ட பின்னரே மற்றவர்களுக்குத் தெரியும்.', 'Every profile is checked by an admin before others can see it.')) +
        feat('🔒', t('தொடர்பு விவரம் பாதுகாப்பு', 'Contact details protected'), t('chat-ல் தொலைபேசி எண், email, WhatsApp எந்த வடிவில் அனுப்பினாலும் தானாகத் தடுக்கப்படும்.', 'Phone, e-mail or WhatsApp in any disguised form is blocked automatically in chat.')) +
        feat('💌', t('Interest இலவசம்', 'Interest is free'), t('சுயவிவரம் பார்க்கவும் Interest அனுப்பவும் கட்டணம் இல்லை.', 'Browsing profiles and sending interest costs nothing.')) +
        feat('💬', t('Chat ₹' + M.C.FEE_RS + ' மட்டும்', 'Chat for just ₹' + M.C.FEE_RS), t('இருவரும் ஒப்புக்கொண்ட பின் ஒருமுறை ₹' + M.C.FEE_RS + ' — யாராவது ஒருவர் செலுத்தினால் இருவருக்கும் chat திறக்கும்.', 'Once both agree, a one-time ₹' + M.C.FEE_RS + ' — either person can pay and chat opens for both.')) +
      '</div></section>' +
      '<section class="wrap sec"><h2>' + t('எப்படி வேலை செய்கிறது?', 'How it works') + '</h2><ol class="steps">' +
        '<li><b>' + t('பதிவு', 'Register') + '</b><span>' + t('email-ஆல் கணக்கு உருவாக்கி, விவரங்களைப் பூர்த்தி செய்யுங்கள்.', 'Create an account and fill in your details.') + '</span></li>' +
        '<li><b>' + t('சரிபார்ப்பு', 'Verification') + '</b><span>' + t('நிர்வாகி உங்கள் சுயவிவரத்தை அங்கீகரிப்பார்.', 'An admin approves your profile.') + '</span></li>' +
        '<li><b>' + t('தேடி Interest', 'Search & Interest') + '</b><span>' + t('பொருத்தமானவர்களைத் தேடி, இலவசமாக Interest அனுப்புங்கள்.', 'Find matches and send interest for free.') + '</span></li>' +
        '<li><b>' + t('Chat', 'Chat') + '</b><span>' + t('இருவரும் ஒப்புக்கொண்டால் ₹' + M.C.FEE_RS + ' செலுத்தி பேசுங்கள்.', 'When both accept, unlock chat for ₹' + M.C.FEE_RS + '.') + '</span></li>' +
      '</ol></section>' +
      '<section class="wrap sec"><div class="comm"><div class="cm1"><span class="star">★</span><div><b>' + t('கன்னட தேவாங்கர் சமூகம்', 'Kannada Devanga community') + '</b><p>' + t('குலம், கோத்திரம், நட்சத்திரம், ராசி — நம் சமூகத்தின் முறைப்படி தேடுங்கள்.', 'Search by kulam, gotra, star and raasi — the way our community looks for a match.') + '</p></div></div>' +
        '<p class="cm2">' + t('மற்ற சமூகத்தினரும் தாராளமாகப் பதிவு செய்யலாம் — ', 'People of other communities are equally welcome — ') + M.D.community.slice(2, 9).map(function (c) { return '<span class="tg">' + esc(M.st.lang === 'en' ? c.en : c.ta) + '</span>'; }).join('') + '<span class="tg">…</span></p></div></section>' +
      '<section class="wrap sec"><h2>' + t('அடிக்கடி கேட்கப்படும் கேள்விகள்', 'FAQ') + '</h2>' +
        faq(t('பதிவு இலவசமா?', 'Is registration free?'), t('ஆம். பதிவு, தேடல், Interest அனுப்புதல் அனைத்தும் இலவசம். Chat திறக்க மட்டும் ஒரு ஜோடிக்கு ஒருமுறை ₹' + M.C.FEE_RS + '.', 'Yes. Registration, search and interest are free. Only opening chat costs ₹' + M.C.FEE_RS + ' once per pair.')) +
        faq(t('என் தொலைபேசி எண் மற்றவர்களுக்குத் தெரியுமா?', 'Will others see my phone number?'), t('இல்லை. எண்ணும் email-உம் நிர்வாகிக்கு மட்டுமே (சரிபார்ப்புக்காக). உறுப்பினர்களுக்கு ஒருபோதும் காட்டப்படாது.', 'No. Your number and e-mail are visible only to the admin for verification, never to members.')) +
        faq(t('chat-ல் எண் அனுப்பினால் என்ன ஆகும்?', 'What if someone shares a number in chat?'), t('செய்தி அனுப்பப்படாது; எச்சரிக்கை கிடைக்கும். மீண்டும் மீண்டும் முயன்றால் chat நிறுத்தப்படும்.', 'The message is not sent and a warning is recorded. Repeated attempts suspend chat.')) +
        faq(t('எனக்கு மேல் வயது / வேறு சமூகம் — பதிவு செய்யலாமா?', 'Can I join from another community?'), t('தாராளமாக. கன்னட தேவாங்கர் சமூகம் முதன்மை; மற்ற சமூகத்தினரும் வரவேற்கப்படுகிறார்கள்.', 'Of course. Kannada Devanga is our focus; every community is welcome.')) +
        faq(t('குறைந்தபட்ச வயது?', 'Minimum age?'), t('சட்டப்படி மணமகனுக்கு 21, மணமகளுக்கு 18.', 'As per law: 21 for grooms, 18 for brides.')) +
      '</section>';
  };
  function feat(i, h, p) { return '<div class="feat"><div class="fi" aria-hidden="true">' + i + '</div><h3>' + esc(h) + '</h3><p>' + esc(p) + '</p></div>'; }
  function faq(q, a) { return '<details class="faq"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>'; }

  function authBox(title, body) { return '<div class="wrap narrow"><div class="box"><h1 class="h2">' + title + '</h1>' + body + '</div></div>'; }
  var pwField = function (id, label, ac) { return '<label class="fld"><span>' + label + '</span><div class="pw"><input id="' + id + '" type="password" autocomplete="' + ac + '" minlength="8" required><button type="button" class="eye" data-act="eye" data-for="' + id + '" aria-label="show">👁</button></div></label>'; };
  M.acts.eye = function (a) { var i = document.getElementById(a.getAttribute('data-for')); i.type = i.type === 'password' ? 'text' : 'password'; };

  M.views.login = async function (v) {
    if (M.st.user) return M.nav('#/');
    var demo = B.mode === 'demo';
    v.innerHTML = authBox(t('உள்நுழைய', 'Login'),
      '<form id="lf" novalidate><label class="fld"><span>Email</span><input id="le" type="email" autocomplete="email" required></label>' + pwField('lp', t('கடவுச்சொல்', 'Password'), 'current-password') +
      '<p class="err" id="lerr" role="alert"></p><button class="btn big full pri" type="submit">' + t('உள்நுழை', 'Login') + '</button></form>' +
      '<p class="mut c"><a href="#/forgot">' + t('கடவுச்சொல் மறந்துவிட்டதா?', 'Forgot password?') + '</a></p>' +
      '<p class="mut c">' + t('புதியவரா?', 'New here?') + ' <a href="#/register">' + t('பதிவு செய்க', 'Register') + '</a></p>' +
      (demo ? '<div class="notice"><b>' + t('டெமோ', 'Demo') + '</b><p>' + t('நிர்வாகியாகப் பார்க்க:', 'To see the admin side:') + ' <code>admin@demo.test</code> / <code>admin123</code> <button class="btn sm ghost" type="button" data-act="fillAdmin">' + t('நிரப்பு', 'Fill') + '</button></p></div>' : ''));
    var f = M.$('#lf');
    f.addEventListener('submit', async function (e) {
      e.preventDefault(); var err = M.$('#lerr'); err.textContent = '';
      var email = M.$('#le').value.trim(), pw = M.$('#lp').value;
      if (!/^\S+@\S+\.\S+$/.test(email) || !pw) { err.textContent = t('Email மற்றும் கடவுச்சொல்லை உள்ளிடுங்கள்', 'Enter e-mail and password'); return; }
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      var r = await B.signIn(email, pw); btn.disabled = false;
      if (!r.ok) { err.textContent = /Email not confirmed/i.test(r.message || '') ? t('உங்கள் email-ஐ உறுதிப்படுத்துங்கள் (இன்பாக்ஸில் உள்ள link).', 'Please confirm your e-mail (link in your inbox).') : t('Email அல்லது கடவுச்சொல் தவறு', 'Wrong e-mail or password'); return; }
      await M.setUser(await B.user());
      var next = sessionStorage.getItem('mat_next'); sessionStorage.removeItem('mat_next');
      M.nav(next && next !== '#/login' ? next : '#/');
    });
  };
  M.acts.fillAdmin = function () { M.$('#le').value = 'admin@demo.test'; M.$('#lp').value = 'admin123'; };

  M.views.register = async function (v) {
    if (M.st.user) return M.nav('#/');
    v.innerHTML = authBox(t('புதிய கணக்கு', 'Create account'),
      '<form id="rf" novalidate><label class="fld"><span>Email</span><input id="re" type="email" autocomplete="email" required></label>' + pwField('rp', t('கடவுச்சொல் (8+ எழுத்து)', 'Password (8+ characters)'), 'new-password') + pwField('rp2', t('மீண்டும் கடவுச்சொல்', 'Confirm password'), 'new-password') +
      '<label class="chk"><input id="ragree" type="checkbox"> <span>' + t('நான் ', 'I accept the ') + '<a href="#/terms" target="_blank">' + t('விதிமுறைகள்', 'Terms') + '</a>, <a href="#/privacy" target="_blank">' + t('தனியுரிமை', 'Privacy') + '</a> ' + t('ஆகியவற்றை ஏற்கிறேன்; எனக்கு குறைந்தது 18 வயது.', 'and confirm I am at least 18.') + '</span></label>' +
      '<p class="err" id="rerr" role="alert"></p><button class="btn big full pri" type="submit">' + t('கணக்கு உருவாக்கு', 'Create account') + '</button></form>' +
      '<p class="mut c">' + t('ஏற்கனவே கணக்கு உள்ளதா?', 'Have an account?') + ' <a href="#/login">' + t('உள்நுழை', 'Login') + '</a></p>');
    var f = M.$('#rf');
    f.addEventListener('submit', async function (e) {
      e.preventDefault(); var err = M.$('#rerr'); err.textContent = '';
      var email = M.$('#re').value.trim(), p1 = M.$('#rp').value, p2 = M.$('#rp2').value;
      if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = t('சரியான email உள்ளிடுங்கள்', 'Enter a valid e-mail'); return; }
      if (p1.length < 8) { err.textContent = t('கடவுச்சொல் குறைந்தது 8 எழுத்து', 'Password must be at least 8 characters'); return; }
      if (p1 !== p2) { err.textContent = t('கடவுச்சொற்கள் பொருந்தவில்லை', 'Passwords do not match'); return; }
      if (!M.$('#ragree').checked) { err.textContent = t('விதிமுறைகளை ஏற்க வேண்டும்', 'Please accept the terms'); return; }
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      var r = await B.signUp(email, p1); btn.disabled = false;
      if (!r.ok) { err.textContent = /already/i.test(r.message || '') ? t('இந்த email ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது — உள்நுழையுங்கள்', 'This e-mail is already registered — please login') : (r.message || t('பதிவு தோல்வி', 'Sign-up failed')); return; }
      if (r.needsConfirm) { M.$('#view').innerHTML = authBox(t('Email-ஐ உறுதிப்படுத்துங்கள்', 'Confirm your e-mail'), '<p>' + t('உங்கள் email-க்கு ஒரு உறுதிப்படுத்தும் link அனுப்பப்பட்டுள்ளது. அதைத் திறந்த பின் உள்நுழையுங்கள். (Spam folder-ஐயும் பாருங்கள்.)', 'We sent a confirmation link to your e-mail. Open it, then login. (Check spam too.)') + '</p><a class="btn" href="#/login">' + t('உள்நுழை', 'Login') + '</a>'); return; }
      await M.setUser(await B.user()); M.nav('#/wizard');
    });
  };

  M.views.forgot = async function (v) {
    v.innerHTML = authBox(t('கடவுச்சொல் மீட்பு', 'Reset password'), '<form id="ff"><label class="fld"><span>Email</span><input id="fe" type="email" required></label><p class="err" id="ferr" role="alert"></p><p class="ok" id="fok"></p><button class="btn big full pri" type="submit">' + t('Reset link அனுப்பு', 'Send reset link') + '</button></form>');
    M.$('#ff').addEventListener('submit', async function (e) {
      e.preventDefault(); var em = M.$('#fe').value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { M.$('#ferr').textContent = t('சரியான email உள்ளிடுங்கள்', 'Enter a valid e-mail'); return; }
      var r = await B.reset(em); if (r.ok) { M.$('#ferr').textContent = ''; M.$('#fok').textContent = t('Link அனுப்பப்பட்டது (email இருந்தால்).', 'Link sent (if the e-mail exists).'); } else M.$('#ferr').textContent = r.message || '';
    });
  };

  /* ---- static pages ---- */
  function page(title, html) { return function (v) { M.pageTitle = title; v.innerHTML = '<div class="wrap narrow doc"><h1>' + esc(title) + '</h1>' + html + '<p><a href="#/">← ' + t('முகப்பு', 'Home') + '</a></p></div>'; }; }
  M.views.safety = function (v) {
    return page(t('பாதுகாப்பு வழிகாட்டி', 'Safety guide'),
      '<ul>' + [
        [t('பணம் கேட்டால் கொடுக்காதீர்கள்', 'Never send money'), t('திருமணம் நிச்சயமாகும் முன் யாருக்கும் பணம், பரிசு அட்டை, OTP எதுவும் கொடுக்காதீர்கள்.', 'Never send money, gift cards or OTPs before a match is finalised.')],
        [t('குடும்பத்தோடு சந்தியுங்கள்', 'Meet with family'), t('முதல் சந்திப்பை பொது இடத்தில், குடும்பத்தினர் முன்னிலையில் வையுங்கள்.', 'Meet first in a public place, with family present.')],
        [t('சரிபார்த்துக் கொள்ளுங்கள்', 'Verify details'), t('கல்வி, வேலை, குடும்ப விவரங்களை உறவினர்கள் மூலம் நேரில் உறுதி செய்யுங்கள்.', 'Confirm education, job and family details through relatives.')],
        [t('சந்தேகமா? புகார் செய்யுங்கள்', 'Suspicious? Report'), t('ஒவ்வொரு சுயவிவரத்திலும் "புகார்" மற்றும் "தடு" பொத்தான்கள் உள்ளன. நிர்வாகி விரைவில் பார்ப்பார்.', 'Every profile has Report and Block. Admin reviews quickly.')],
        [t('தொடர்பு விவரங்கள்', 'Contact details'), t('chat-ல் எண்/email பகிர முடியாது. இருவரும் உறுதியாக இருக்கும்போது குடும்பங்கள் நேரடியாகத் தொடர்பு கொள்ளலாம் — அது இந்தத் தளத்துக்கு வெளியே நடைபெறும்.', 'Numbers and e-mails cannot be shared in chat. When both families are serious, they can contact each other outside this site.')]
      ].map(function (x) { return '<li><b>' + esc(x[0]) + '</b> — ' + esc(x[1]) + '</li>'; }).join('') + '</ul>')(v);
  };
  M.views.terms = function (v) {
    return page(t('பயன்பாட்டு விதிமுறைகள்', 'Terms of use'),
      '<p class="mut">' + t('இது பொதுவான வரைவு; சட்ட ஆலோசகரின் மதிப்பாய்வுக்குப் பின் இறுதி செய்யப்பட வேண்டும்.', 'General draft; to be finalised after legal review.') + '</p><ol>' + [
        t('பயனர்கள் குறைந்தது 18 (மணமகன் 21) வயது நிரம்பியவர்களாக இருக்க வேண்டும். குடும்பத்தினர் தங்கள் பிள்ளைக்காகப் பதிவு செய்தால் அவர்களின் ஒப்புதல் அவசியம்.', 'Members must be 18+ (grooms 21+). Parents/guardians registering on behalf of someone need that person’s consent.'),
        t('கொடுக்கும் தகவல்கள் உண்மையாக இருக்க வேண்டும். போலி சுயவிவரங்கள் நீக்கப்படும்.', 'Information must be true. Fake profiles will be removed.'),
        t('தொடர்பு விவரங்களை (எண், email, சமூக ஊடகம்) chat/சுயவிவர எழுத்தில் பகிரக்கூடாது. மீறினால் chat நிறுத்தப்படும்.', 'Contact details (numbers, e-mail, social handles) must not be shared in chat or profile text. Violations suspend chat.'),
        t('Chat கட்டணம் ₹' + M.C.FEE_RS + ' ஒரு ஜோடிக்கு ஒருமுறை; செலுத்தியபின் திருப்பித் தரப்படாது (தொழில்நுட்பக் கோளாறு தவிர).', 'Chat fee is ₹' + M.C.FEE_RS + ' once per pair and is non-refundable (except technical failure).'),
        t('இந்தத் தளம் அறிமுகம் மட்டுமே செய்கிறது; திருமண முடிவு, உறுப்பினர்களின் நடத்தை, தகவல்களின் உண்மைத்தன்மைக்கு நிர்வாகம் உத்தரவாதம் அளிக்காது.', 'The site only introduces members; it does not guarantee the conduct of members, accuracy of information or the outcome of any match.'),
        t('துன்புறுத்தல், மோசடி, பணம் கேட்டல் ஆகியவை தடை; அவை கணக்கு நீக்கத்துக்கும் சட்ட நடவடிக்கைக்கும் வழிவகுக்கும்.', 'Harassment, fraud or asking for money is prohibited and may lead to removal and legal action.'),
        t('நிர்வாகம் எந்த சுயவிவரத்தையும் காரணத்துடன் நிராகரிக்க/நீக்க உரிமை உண்டு.', 'The administrators may reject or remove any profile with reason.')
      ].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>')(v);
  };
  M.views.privacy = function (v) {
    return page(t('தனியுரிமைக் கொள்கை', 'Privacy policy'),
      '<p class="mut">' + t('வரைவு — சட்ட மதிப்பாய்வுக்குப் பின் இறுதி செய்யவும்.', 'Draft — finalise after legal review.') + '</p><ol>' + [
        t('சேகரிக்கும் தகவல்கள்: email, சுயவிவர விவரங்கள், படங்கள், தொலைபேசி எண் (சரிபார்ப்புக்காக மட்டும்), chat செய்திகள்.', 'We collect: e-mail, profile details, photos, phone number (for verification only) and chat messages.'),
        t('தொலைபேசி எண்ணும் email-உம் நிர்வாகிக்கு மட்டுமே தெரியும்; பிற உறுப்பினர்களுக்குக் காட்டப்படாது, விற்கப்படாது.', 'Phone and e-mail are visible only to the admin; never shown to members and never sold.'),
        t('அங்கீகரிக்கப்பட்ட சுயவிவரங்களை (படங்கள் உட்பட) உள்நுழைந்த, அங்கீகரிக்கப்பட்ட உறுப்பினர்கள் மட்டுமே காணலாம். சுயவிவரத்தை எப்போது வேண்டுமானாலும் மறைக்கலாம்/நீக்கலாம்.', 'Approved profiles (with photos) are visible only to logged-in approved members. You can hide or delete your profile anytime.'),
        t('கணக்கை நீக்கினால் சுயவிவரம், Interest, செய்திகள் நீக்கப்படும்.', 'Deleting your account removes your profile, interests and messages.'),
        t('கட்டணங்கள் Razorpay மூலம் செயல்படுத்தப்படுகின்றன; அட்டை/UPI விவரங்களை நாங்கள் சேமிப்பதில்லை.', 'Payments are processed by Razorpay; we never store card/UPI details.'),
        t('கேள்விகளுக்கு: ', 'Questions: ') + M.C.SUPPORT_EMAIL
      ].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>')(v);
  };
  M.views.about = M.views.safety;
  M.views.notfound = function (v) { v.innerHTML = '<div class="wrap narrow"><div class="box"><h1 class="h2">404</h1><p>' + t('பக்கம் கிடைக்கவில்லை.', 'Page not found.') + '</p><a class="btn" href="#/">' + t('முகப்பு', 'Home') + '</a></div></div>'; };
})();
