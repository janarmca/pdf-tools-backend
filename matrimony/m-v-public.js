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
        '<h1>' + t('ஸ்ரீ சௌடேஸ்வரி திருமண அமைப்பகம்', 'Sri Chowdeshwari Thirumana Amaippagam') + '</h1>' +
        '<p class="lead">' + t('நம்பகமான, சரிபார்க்கப்பட்ட சுயவிவரங்கள். உங்கள் தொலைபேசி எண்ணும் email-உம் யாருக்கும் தெரியாது. Interest அனுப்புவது இலவசம்.', 'Verified profiles you can trust. Your phone number and e-mail stay private. Sending interest is free.') + '</p>' +
        '<div class="cta"><a class="btn big" href="#/join">' + t('இலவசமாகப் பதிவு செய்க', 'Register free') + '</a><a class="btn ghost big" href="#/browse">' + t('பதிவு செய்தவர்களைப் பார்க்க', 'Browse profiles') + '</a><a class="btn ghost big" href="#/login">' + t('உள்நுழை', 'Login') + '</a></div>' +
        (members != null ? '<p class="stat"><b>' + members + '</b> ' + t('அங்கீகரிக்கப்பட்ட சுயவிவரங்கள்', 'approved profiles') + (st.devanga ? ' · <b>' + st.devanga + '</b> ' + t('கன்னட தேவாங்கர்', 'Kannada Devanga') : '') + '</p>' : '') +
      '</div></section>' +
      (M.st.bootError ? '<div class="wrap"><div class="notice warn"><b>' + t('இணைப்புப் பிழை', 'Connection problem') + '</b><p>' + t('சேவையகத்துடன் இணைக்க முடியவில்லை. இணையத்தைச் சரிபார்த்து மீண்டும் திறக்கவும்.', 'Could not reach the server. Check your internet and reload.') + '</p></div></div>' : '') +
      (setup ? '<div class="wrap"><div class="notice warn"><b>' + t('தள அமைப்பு முடியவில்லை', 'Site setup not finished') + '</b><p>' + t('Cloudflare API (pdf-tools-api) இன்னும் deploy ஆகவில்லை. README-ல் உள்ள படிகளைப் பின்பற்றுங்கள். அதுவரை டெமோவில் முழு தளத்தையும் பார்க்கலாம்.', 'The Cloudflare API (pdf-tools-api) is not deployed yet. Follow the README. Meanwhile you can try everything in demo mode.') + '</p><a class="btn sm" href="?demo=1">' + t('டெமோவில் பார்க்க', 'Try demo') + '</a></div></div>' : '') +
      '<section class="wrap sec"><h2>' + t('ஏன் எங்கள் அமைப்பகம்?', 'Why choose us?') + '</h2><div class="grid4">' +
        feat('✅', t('நிர்வாகி சரிபார்ப்பு', 'Admin-verified'), t('ஒவ்வொரு சுயவிவரமும் நிர்வாகியால் சரிபார்க்கப்பட்ட பின்னரே மற்றவர்களுக்குத் தெரியும்.', 'Every profile is checked by an admin before others can see it.')) +
        feat('🔒', t('தொடர்பு விவரம் பாதுகாப்பு', 'Contact details protected'), t('chat-ல் தொலைபேசி எண், email, WhatsApp எந்த வடிவில் அனுப்பினாலும் தானாகத் தடுக்கப்படும்.', 'Phone, e-mail or WhatsApp in any disguised form is blocked automatically in chat.')) +
        feat('💌', t('Interest இலவசம்', 'Interest is free'), t('சுயவிவரம் பார்க்கவும் Interest அனுப்பவும் கட்டணம் இல்லை.', 'Browsing profiles and sending interest costs nothing.')) +
        (M.C.FEE_ON ? feat('💬', t('Chat ₹' + M.C.FEE_RS + ' மட்டும்', 'Chat for just ₹' + M.C.FEE_RS), t('இருவரும் ஒப்புக்கொண்ட பின் ஒருமுறை ₹' + M.C.FEE_RS + ' — யாராவது ஒருவர் செலுத்தினால் இருவருக்கும் chat திறக்கும்.', 'Once both agree, a one-time ₹' + M.C.FEE_RS + ' — either person can pay and chat opens for both.')) : feat('💬', t('பாதுகாப்பான Chat — இப்போது இலவசம்', 'Safe chat — free for now'), t('இருவரும் ஒப்புக்கொண்டால் உடனே பேசலாம். தொலைபேசி எண் / email பகிர முடியாது.', 'When both agree you can chat right away. Phone numbers / e-mail cannot be shared.'))) +
      '</div></section>' +
      '<section class="wrap sec"><h2>' + t('எப்படி வேலை செய்கிறது?', 'How it works') + '</h2><ol class="steps">' +
        '<li><b>' + t('பதிவு', 'Register') + '</b><span>' + t('email-ஆல் கணக்கு உருவாக்கி, விவரங்களைப் பூர்த்தி செய்யுங்கள்.', 'Create an account and fill in your details.') + '</span></li>' +
        '<li><b>' + t('சரிபார்ப்பு', 'Verification') + '</b><span>' + t('நிர்வாகி உங்கள் சுயவிவரத்தை அங்கீகரிப்பார்.', 'An admin approves your profile.') + '</span></li>' +
        '<li><b>' + t('தேடி Interest', 'Search & Interest') + '</b><span>' + t('பொருத்தமானவர்களைத் தேடி, இலவசமாக Interest அனுப்புங்கள்.', 'Find matches and send interest for free.') + '</span></li>' +
        '<li><b>' + t('Chat', 'Chat') + '</b><span>' + (M.C.FEE_ON ? t('இருவரும் ஒப்புக்கொண்டால் ₹' + M.C.FEE_RS + ' செலுத்தி பேசுங்கள்.', 'When both accept, unlock chat for ₹' + M.C.FEE_RS + '.') : t('இருவரும் ஒப்புக்கொண்டால் இலவசமாகப் பேசுங்கள்.', 'When both accept, chat for free.')) + '</span></li>' +
      '</ol></section>' +
      '<section class="wrap sec"><div class="comm"><div class="cm1"><span class="star">★</span><div><b>' + t('கன்னட தேவாங்கர் சமூகம்', 'Kannada Devanga community') + '</b><p>' + t('குலம், கோத்திரம், நட்சத்திரம், ராசி — நம் சமூகத்தின் முறைப்படி தேடுங்கள்.', 'Search by kulam, gotra, star and raasi — the way our community looks for a match.') + '</p></div></div>' +
        '<p class="cm2">' + t('மற்ற சமூகத்தினரும் தாராளமாகப் பதிவு செய்யலாம் — ', 'People of other communities are equally welcome — ') + M.D.community.slice(2, 9).map(function (c) { return '<span class="tg">' + esc(M.st.lang === 'en' ? c.en : c.ta) + '</span>'; }).join('') + '<span class="tg">…</span></p></div></section>' +
      '<section class="wrap sec"><h2>' + t('அடிக்கடி கேட்கப்படும் கேள்விகள்', 'FAQ') + '</h2>' +
        faq(t('பதிவு இலவசமா?', 'Is registration free?'), M.C.FEE_ON ? t('ஆம். பதிவு, தேடல், Interest அனுப்புதல் அனைத்தும் இலவசம். Chat திறக்க மட்டும் ஒரு ஜோடிக்கு ஒருமுறை ₹' + M.C.FEE_RS + '.', 'Yes. Registration, search and interest are free. Only opening chat costs ₹' + M.C.FEE_RS + ' once per pair.') : t('ஆம். பதிவு, தேடல், Interest, Chat அனைத்தும் தற்போது முற்றிலும் இலவசம்.', 'Yes. Registration, search, interest and chat are all completely free for now.')) +
        faq(t('என் தொலைபேசி எண் மற்றவர்களுக்குத் தெரியுமா?', 'Will others see my phone number?'), t('இல்லை. எண்ணும் email-உம் நிர்வாகிக்கு மட்டுமே (சரிபார்ப்புக்காக). உறுப்பினர்களுக்கு ஒருபோதும் காட்டப்படாது.', 'No. Your number and e-mail are visible only to the admin for verification, never to members.')) +
        faq(t('chat-ல் எண் அனுப்பினால் என்ன ஆகும்?', 'What if someone shares a number in chat?'), t('செய்தி அனுப்பப்படாது; எச்சரிக்கை கிடைக்கும். மீண்டும் மீண்டும் முயன்றால் chat நிறுத்தப்படும்.', 'The message is not sent and a warning is recorded. Repeated attempts suspend chat.')) +
        faq(t('எனக்கு மேல் வயது / வேறு சமூகம் — பதிவு செய்யலாமா?', 'Can I join from another community?'), t('தாராளமாக. கன்னட தேவாங்கர் சமூகம் முதன்மை; மற்ற சமூகத்தினரும் வரவேற்கப்படுகிறார்கள்.', 'Of course. Kannada Devanga is our focus; every community is welcome.')) +
        faq(t('குறைந்தபட்ச வயது?', 'Minimum age?'), t('சட்டப்படி மணமகனுக்கு 21, மணமகளுக்கு 18.', 'As per law: 21 for grooms, 18 for brides.')) +
      '</section>';
  };
  function feat(i, h, p) { return '<div class="feat"><div class="fi" aria-hidden="true">' + i + '</div><h3>' + esc(h) + '</h3><p>' + esc(p) + '</p></div>'; }
  function faq(q, a) { return '<details class="faq"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>'; }

  function authBox(title, body) { return '<div class="wrap narrow"><div class="box"><h1 class="h2">' + title + '</h1>' + body + '</div></div>'; }
  // login and sign-up are the same thing now: e-mail -> 6-digit code (no passwords), or Google.
  // A new e-mail address gets a new account automatically.
  async function otpFlow(v, isNew) {
    var demo = B.mode === 'demo';
    var googleBtn = demo ? '' : '<button class="btn big full" type="button" data-act="googleLogin">' + t('Google மூலம் தொடர்க', 'Continue with Google') + '</button><p class="mut c">' + t('அல்லது', 'or') + '</p>';
    var agree = isNew ? '<label class="chk"><input id="ragree" type="checkbox"> <span>' + t('நான் ', 'I accept the ') + '<a href="#/terms" target="_blank">' + t('விதிமுறைகள்', 'Terms') + '</a>, <a href="#/privacy" target="_blank">' + t('தனியுரிமை', 'Privacy') + '</a> ' + t('ஆகியவற்றை ஏற்கிறேன்; எனக்கு குறைந்தது 18 வயது.', 'and confirm I am at least 18.') + '</span></label>' : '';
    v.innerHTML = authBox(isNew ? t('புதிய கணக்கு', 'Create account') : t('உள்நுழைய', 'Login'),
      googleBtn +
      '<form id="lf" novalidate><label class="fld"><span>Email</span><input id="le" type="email" autocomplete="email" required></label>' + agree +
      '<p class="mut">' + t('உங்கள் email-க்கு 6 இலக்க code அனுப்புவோம் — கடவுச்சொல் தேவையில்லை.', 'We will e-mail you a 6-digit code — no password needed.') + '</p>' +
      '<p class="err" id="lerr" role="alert"></p><button class="btn big full pri" type="submit">' + t('Code அனுப்பு', 'Send code') + '</button></form>' +
      '<form id="cf" hidden novalidate><p id="csent"></p><label class="fld"><span>' + t('6 இலக்க code', '6-digit code') + '</span><input id="lc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>' +
      '<p class="err" id="cerr" role="alert"></p><button class="btn big full pri" type="submit">' + t('உள்நுழை', 'Login') + '</button>' +
      '<p class="mut c"><a href="#" data-act="otpBack">' + t('← வேறு email', '← Different e-mail') + '</a> · <a href="#" data-act="otpResend">' + t('மீண்டும் அனுப்பு', 'Resend code') + '</a></p></form>' +
      (isNew ? '<p class="mut c">' + t('ஏற்கனவே கணக்கு உள்ளதா?', 'Have an account?') + ' <a href="#/login">' + t('உள்நுழை', 'Login') + '</a></p>'
             : '<p class="mut c">' + t('புதியவரா?', 'New here?') + ' <a href="#/register">' + t('பதிவு செய்க', 'Register') + '</a></p>') +
      (demo ? '<div class="notice"><b>' + t('டெமோ', 'Demo') + '</b><p>' + t('டெமோவில் code எப்போதும்', 'In the demo the code is always') + ' <code>123456</code>. ' + t('நிர்வாகியாகப் பார்க்க:', 'To see the admin side:') + ' <code>admin@demo.test</code> <button class="btn sm ghost" type="button" data-act="fillAdmin">' + t('நிரப்பு', 'Fill') + '</button></p></div>' : ''));
    var email = '';
    var lf = M.$('#lf'), cf = M.$('#cf');
    async function send() {
      var r = await B.sendCode(email);
      if (!r.ok) return r.status === 429 ? t('சற்று காத்திருந்து மீண்டும் முயற்சிக்கவும்', 'Please wait a moment and try again') : (r.message || t('Code அனுப்ப முடியவில்லை', 'Could not send the code'));
      return '';
    }
    lf.addEventListener('submit', async function (e) {
      e.preventDefault(); var err = M.$('#lerr'); err.textContent = '';
      email = M.$('#le').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = t('சரியான email உள்ளிடுங்கள்', 'Enter a valid e-mail'); return; }
      if (isNew && !M.$('#ragree').checked) { err.textContent = t('விதிமுறைகளை ஏற்க வேண்டும்', 'Please accept the terms'); return; }
      var btn = lf.querySelector('button[type=submit]'); btn.disabled = true;
      var m = await send(); btn.disabled = false;
      if (m) { err.textContent = m; return; }
      M.$('#csent').textContent = t(email + ' -க்கு code அனுப்பப்பட்டது (10 நிமிடம் செல்லும்; spam folder-ஐயும் பாருங்கள்).', 'Code sent to ' + email + ' (valid 10 minutes; check spam too).');
      lf.hidden = true; cf.hidden = false; M.$('#lc').focus();
    });
    cf.addEventListener('submit', async function (e) {
      e.preventDefault(); var err = M.$('#cerr'); err.textContent = '';
      var code = M.$('#lc').value.replace(/\D/g, '');
      if (code.length !== 6) { err.textContent = t('6 இலக்க code-ஐ உள்ளிடுங்கள்', 'Enter the 6-digit code'); return; }
      var btn = cf.querySelector('button[type=submit]'); btn.disabled = true;
      var r = await B.verifyCode(email, code); btn.disabled = false;
      if (!r.ok) { err.textContent = /expired|new one|new code/i.test(r.message || '') ? t('Code காலாவதியானது — மீண்டும் அனுப்புங்கள்', 'The code expired — please resend') : t('Code தவறு', 'Wrong code'); return; }
      await M.setUser(await B.user());
      var next = sessionStorage.getItem('mat_next'); sessionStorage.removeItem('mat_next');
      M.nav(isNew ? '#/wizard' : next && next !== '#/login' ? next : '#/');
    });
    M.acts.otpBack = function () { cf.hidden = true; lf.hidden = false; };
    M.acts.otpResend = async function () { var m = await send(); M.toast(m || t('புதிய code அனுப்பப்பட்டது', 'A new code was sent'), m ? 'err' : 'ok'); };
  }
  M.acts.googleLogin = async function () { var r = await B.google(); if (!r.ok) M.toast(r.message || 'Google sign-in failed', 'err'); };

  M.views.login = async function (v) { if (M.st.user) return M.nav('#/'); return otpFlow(v, false); };
  M.acts.fillAdmin = function () { M.$('#le').value = 'admin@demo.test'; };
  M.views.register = async function (v) { if (M.st.user) return M.nav('#/'); return otpFlow(v, true); };
  M.views.forgot = async function () { M.nav('#/login'); }; // no passwords any more

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
        M.C.FEE_ON ? t('Chat கட்டணம் ₹' + M.C.FEE_RS + ' ஒரு ஜோடிக்கு ஒருமுறை; செலுத்தியபின் திருப்பித் தரப்படாது (தொழில்நுட்பக் கோளாறு தவிர).', 'Chat fee is ₹' + M.C.FEE_RS + ' once per pair and is non-refundable (except technical failure).') : t('தற்போது அனைத்து சேவைகளும் இலவசம். எதிர்காலத்தில் தொடர்புக்கு (chat) மட்டும் கட்டணம் வரலாம்; முன்கூட்டியே அறிவிக்கப்படும்.', 'All services are currently free. A fee for contact (chat) only may be introduced later, with prior notice.'),
        t('இந்தத் தளம் அறிமுகம் மட்டுமே செய்கிறது; திருமண முடிவு, உறுப்பினர்களின் நடத்தை, தகவல்களின் உண்மைத்தன்மைக்கு நிர்வாகம் உத்தரவாதம் அளிக்காது.', 'The site only introduces members; it does not guarantee the conduct of members, accuracy of information or the outcome of any match.'),
        t('துன்புறுத்தல், மோசடி, பணம் கேட்டல் ஆகியவை தடை; அவை கணக்கு நீக்கத்துக்கும் சட்ட நடவடிக்கைக்கும் வழிவகுக்கும்.', 'Harassment, fraud or asking for money is prohibited and may lead to removal and legal action.'),
        t('நிர்வாகம் எந்த சுயவிவரத்தையும் காரணத்துடன் நிராகரிக்க/நீக்க உரிமை உண்டு.', 'The administrators may reject or remove any profile with reason.')
      ].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>')(v);
  };
  M.views.privacy = function (v) {
    return page(t('தனியுரிமைக் கொள்கை', 'Privacy policy'),
      '<p class="mut">' + t('வரைவு — சட்ட மதிப்பாய்வுக்குப் பின் இறுதி செய்யவும்.', 'Draft — finalise after legal review.') + '</p><ol>' + [
        t('சேகரிக்கும் தகவல்கள்: email, சுயவிவர விவரங்கள், படங்கள், தொலைபேசி எண் (சரிபார்ப்புக்காக மட்டும்), chat செய்திகள்.', 'We collect: e-mail, profile details, photos, phone number (for verification only) and chat messages.'),
        t('உள்நுழையாமலே பதிவு படிவத்தைச் சமர்ப்பிக்கலாம்; நிர்வாகம் அங்கீகரித்துப் பட்டியலிட்ட பிறகு மட்டுமே பாதுகாப்பான விவரங்களும் படங்களும் அனைவருக்கும் தெரியும்; தொலைபேசி, email, பிறந்த தேதி, ஜாதகம் நிர்வாகத்துக்கு மட்டுமே.', 'You can submit the sign-up form without logging in. Only after the administrator approves and lists it are the safe details and photos shown publicly; phone, e-mail, date of birth and horoscope stay with the administrators.'),
        t('தொலைபேசி எண்ணும் email-உம் நிர்வாகிக்கு மட்டுமே தெரியும்; பிற உறுப்பினர்களுக்குக் காட்டப்படாது, விற்கப்படாது.', 'Phone and e-mail are visible only to the admin; never shown to members and never sold.'),
        t('உறுப்பினர் கணக்கு சுயவிவரங்களை (படங்கள் உட்பட) உள்நுழைந்த, அங்கீகரிக்கப்பட்ட உறுப்பினர்கள் மட்டுமே காணலாம். சுயவிவரத்தை எப்போது வேண்டுமானாலும் மறைக்கலாம்/நீக்கலாம்.', 'Member-account profiles (with photos) are visible only to logged-in approved members. You can hide or delete your profile anytime.'),
        t('கணக்கை நீக்கினால் சுயவிவரம், Interest, செய்திகள் நீக்கப்படும்.', 'Deleting your account removes your profile, interests and messages.'),
        t('கட்டணங்கள் Razorpay மூலம் செயல்படுத்தப்படுகின்றன; அட்டை/UPI விவரங்களை நாங்கள் சேமிப்பதில்லை.', 'Payments are processed by Razorpay; we never store card/UPI details.'),
        t('கேள்விகளுக்கு: ', 'Questions: ') + M.C.SUPPORT_EMAIL + ' · ' + M.C.SUPPORT_PHONE
      ].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>')(v);
  };
  M.views.contact = function (v) {
    var C = M.C, ph = C.SUPPORT_PHONE, phs = ph.replace(/(\d{5})(\d{5})/, '$1 $2');
    var wa = C.SUPPORT_WHATSAPP ? 'https://wa.me/' + encodeURIComponent(C.SUPPORT_WHATSAPP) + '?text=' + encodeURIComponent(t('வணக்கம், திருமண அமைப்பகம் குறித்து ஒரு சந்தேகம்.', 'Hello, I have a question about the matrimony service.')) : '';
    M.pageTitle = t('தொடர்பு கொள்ள', 'Contact us');
    v.innerHTML = '<div class="wrap narrow doc"><h1>' + t('தொடர்பு கொள்ள', 'Contact us') + '</h1>' +
      '<p class="mut">' + t('பதிவு, படங்கள், ஜாதகம், கணக்கு அல்லது எந்த சந்தேகமாக இருந்தாலும் எங்களிடம் கேளுங்கள். நாங்கள் உதவ தயார்.', 'Questions about registration, photos, horoscope or your account? We are happy to help.') + '</p>' +
      '<div class="ctc"><div class="ctc-card"><div class="ctc-ic" aria-hidden="true">📞</div><div><b>' + t('தொலைபேசி', 'Phone') + '</b><span>' + esc(t(C.SUPPORT_NAME, C.SUPPORT_NAME_EN)) + ' · <a href="tel:+91' + esc(ph) + '">+91 ' + esc(phs) + '</a></span></div><a class="btn pri sm" href="tel:+91' + esc(ph) + '">' + t('அழைக்க', 'Call') + '</a></div>' +
      (wa ? '<div class="ctc-card"><div class="ctc-ic" aria-hidden="true">💬</div><div><b>WhatsApp</b><span>+91 ' + esc(C.SUPPORT_WHATSAPP.replace(/^91/, '').replace(/(\d{5})(\d{5})/, '$1 $2')) + '</span></div><a class="btn sm" href="' + esc(wa) + '" target="_blank" rel="noopener">' + t('திற', 'Open') + '</a></div>' : '') +
      '<div class="ctc-card"><div class="ctc-ic" aria-hidden="true">✉️</div><div><b>Email</b><span><a href="mailto:' + esc(C.SUPPORT_EMAIL) + '">' + esc(C.SUPPORT_EMAIL) + '</a></span></div><a class="btn sm" href="mailto:' + esc(C.SUPPORT_EMAIL) + '?subject=' + encodeURIComponent('Matrimony enquiry') + '">' + t('எழுத', 'Write') + '</a></div></div>' +
      '<h2 class="h3">' + t('தொடர்புகொள்ளும் முன்', 'Before you write') + '</h2><ul class="tick">' +
      '<li>' + t('உங்கள் பதிவு செய்த email-ஐ குறிப்பிடுங்கள்.', 'Mention the e-mail you registered with.') + '</li>' +
      '<li>' + t('பாதுகாப்புக்காக உங்கள் கடவுச்சொல்லை யாரிடமும் பகிராதீர்கள் — நாங்கள் ஒருபோதும் கேட்கமாட்டோம்.', 'For your safety never share your password — we will never ask for it.') + '</li>' +
      '<li>' + t('தவறான நடத்தை அல்லது போலி சுயவிவரத்தை சுயவிவரப் பக்கத்தில் "புகார்" மூலம் தெரிவிக்கலாம்.', 'Report misuse or a fake profile with "Report" on the profile page.') + '</li></ul>' +
      '<p><a href="#/">← ' + t('முகப்பு', 'Home') + '</a></p></div>';
  };

  /* ---- public browsing: anyone can see the safe fields of listed sign-ups (no login) ---- */
  var BR = { f: { gender: '', min_age: '', max_age: '', community: '' }, items: [], total: 0, loaded: false };
  function codeOf(p) { return 'SC-' + (p.code || ''); }
  function waLink(p) {
    var C = M.C; if (!C.SUPPORT_WHATSAPP) return '';
    return 'https://wa.me/' + encodeURIComponent(C.SUPPORT_WHATSAPP) + '?text=' + encodeURIComponent(t('வணக்கம், சுயவிவர எண் ', 'Hello, about profile ') + codeOf(p) + ' (' + p.name + ') ' + t('பற்றி பேச வேண்டும்.', 'I would like to talk.'));
  }
  function pcard(c) {
    return '<a class="pc" href="#/p/' + esc(c.id) + '">' + M.avatar(c) +
      '<div class="pi"><div class="pn">' + esc(c.name) + (c.community === 'kannada_devanga' ? ' <span class="kd" title="Kannada Devanga">★</span>' : '') + '</div>' +
      '<div class="ps">' + esc(M.sub(c)) + '</div>' +
      '<div class="pt"><span class="tg">' + esc(M.commLabel(c)) + '</span>' + (c.star ? '<span class="tg">' + esc(M.label('star', c.star)) + '</span>' : '') + '<span class="tg">' + esc(codeOf(c)) + '</span></div></div></a>';
  }
  async function browseLoad(reset) {
    var f = {}; Object.keys(BR.f).forEach(function (k) { if (BR.f[k]) f[k] = BR.f[k]; });
    var r = await M.api('mat_public_list', { f: f, lim: 12, off: reset ? 0 : BR.items.length });
    if (!r.ok) return r;
    BR.items = reset ? r.items : BR.items.concat(r.items); BR.total = r.total; BR.loaded = true; return r;
  }
  function browseHtml() {
    var f = BR.f, sel = function (k, list, blank) { return '<select data-bf="' + k + '"><option value="">' + esc(blank) + '</option>' + M.D[list].map(function (x) { return '<option value="' + esc(x.v) + '"' + (f[k] === x.v ? ' selected' : '') + '>' + esc(M.st.lang === 'en' ? x.en : x.ta) + '</option>'; }).join('') + '</select>'; };
    return '<div class="wrap"><h1 class="h2">' + t('பதிவு செய்தவர்கள்', 'Registered profiles') + '</h1>' +
      '<p class="mut">' + t('பாதுகாப்பான விவரங்கள் மட்டும் இங்கே தெரியும். தொலைபேசி எண், email, பிறந்த தேதி, ஜாதகம் வெளியிடப்படாது. தொடர்புக்கு சுயவிவரப் பக்கத்தில் "தொடர்பு கோரிக்கை" அனுப்புங்கள்.', 'Only safe details are shown here. Phone, e-mail, date of birth and horoscope are never published. To get in touch, send a contact request from the profile page.') + '</p>' +
      '<form class="bfilter" id="bf" novalidate><label class="fld"><span>' + t('பாலினம்', 'Gender') + '</span><select data-bf="gender"><option value="">' + t('அனைவரும்', 'All') + '</option><option value="F"' + (f.gender === 'F' ? ' selected' : '') + '>' + t('மணமகள்', 'Brides') + '</option><option value="M"' + (f.gender === 'M' ? ' selected' : '') + '>' + t('மணமகன்', 'Grooms') + '</option></select></label>' +
      '<label class="fld"><span>' + t('வயது', 'Age') + '</span><span class="two"><input data-bf="min_age" type="number" min="18" max="80" placeholder="18" value="' + esc(f.min_age) + '"><input data-bf="max_age" type="number" min="18" max="80" placeholder="40" value="' + esc(f.max_age) + '"></span></label>' +
      '<label class="fld"><span>' + t('சமூகம்', 'Community') + '</span>' + sel('community', 'community', t('அனைத்தும்', 'All')) + '</label>' +
      '<button class="btn pri" type="submit">' + t('தேடு', 'Search') + '</button></form>' +
      '<div id="bres">' + (BR.items.length ? BR.items.map(pcard).join('') : '<p class="mut">' + t('இன்னும் சுயவிவரங்கள் இல்லை. முதலில் பதிவு செய்யுங்கள்!', 'No profiles yet. Be the first to register!') + '</p>') + '</div>' +
      (BR.items.length < BR.total ? '<p class="c"><button class="btn" data-act="bMore">' + t('மேலும் காட்டு', 'Show more') + '</button></p>' : '') +
      '<div class="cta c"><a class="btn big" href="#/join">' + t('இலவசமாகப் பதிவு செய்க', 'Register free') + '</a></div></div>';
  }
  M.views.browse = async function (v) {
    M.pageTitle = t('பதிவு செய்தவர்கள்', 'Registered profiles');
    var r = await browseLoad(true);
    if (!v.isConnected) return;
    if (r && !r.ok) { v.innerHTML = '<div class="wrap narrow"><div class="box"><p class="mut">' + t('இந்த வசதி இப்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயலுங்கள்.', 'This is not available right now. Please try again shortly.') + '</p><a class="btn" href="#/">' + t('முகப்பு', 'Home') + '</a></div></div>'; return; }
    v.innerHTML = browseHtml(); rebind(v);
  };
  M.acts.bMore = async function (a) {
    var v = a.closest('.vh'); await browseLoad(false); if (!v || !v.isConnected) return;
    v.innerHTML = browseHtml(); M.hydrate(v); rebind(v);
  };
  function rebind(v) {
    v.querySelector('#bf').addEventListener('submit', async function (e) {
      e.preventDefault();
      v.querySelectorAll('[data-bf]').forEach(function (el) { BR.f[el.getAttribute('data-bf')] = el.value; });
      await browseLoad(true); if (v.isConnected) { v.innerHTML = browseHtml(); M.hydrate(v); rebind(v); }
    });
  }

  M.views.p = async function (v, id) {
    var r = await M.api('mat_public_profile', { id: id });
    if (!v.isConnected) return;
    if (!r.ok) { v.innerHTML = '<div class="wrap narrow"><div class="box"><p>' + t('இந்த சுயவிவரம் கிடைக்கவில்லை.', 'This profile is not available.') + '</p><a class="btn" href="#/browse">' + t('பட்டியல்', 'All profiles') + '</a></div></div>'; return; }
    var p = r.profile, row = function (k, val) { return val ? '<dt>' + esc(k) + '</dt><dd>' + esc(val) + '</dd>' : ''; };
    var sec = function (title, rows) { var h = rows.join(''); return h ? '<section class="psec"><h3>' + esc(title) + '</h3><dl class="sdl">' + h + '</dl></section>' : ''; };
    M.pageTitle = p.name + ' · ' + codeOf(p);
    var photos = (p.photos || []).map(function (x) { return '<img alt="' + esc(p.name) + '" data-ph="' + esc(x) + '">'; }).join('');
    var wa = waLink(p);
    v.innerHTML = '<div class="wrap narrow"><p><a href="#/browse">← ' + t('பட்டியல்', 'All profiles') + '</a></p>' +
      '<div class="box pv"><div class="pvh">' + M.avatar(p, true) + '<div><h1 class="h2">' + esc(p.name) + '</h1><div class="mut">' + esc(M.sub(p)) + '</div><div class="pt"><span class="tg">' + esc(M.commLabel(p)) + '</span><span class="tg">' + esc(codeOf(p)) + '</span></div></div></div>' +
      (photos ? '<div class="aph">' + photos + '</div>' : (p.photo_count ? '<p class="mut sm">📷 ' + t('படங்கள் காட்டப்படவில்லை.', 'Photos are not shown.') + '</p>' : '')) +
      sec(t('அடிப்படை', 'Basics'), [row(t('வயது', 'Age'), p.age ? String(p.age) : ''), row(t('உயரம்', 'Height'), p.height_cm ? M.cm(p.height_cm) : ''), row(t('திருமண நிலை', 'Marital status'), M.label('marital', p.marital)), row(t('மதம்', 'Religion'), M.label('religion', p.religion)), row(t('தாய்மொழி', 'Mother tongue'), M.label('mother_tongue', p.mother_tongue)), row(t('உணவு', 'Diet'), M.label('diet', p.diet))]) +
      sec(t('ஜாதகம்', 'Horoscope'), [row(t('குலம்', 'Kulam'), p.kulam), row(t('கோத்திரம்', 'Gotra'), p.gotra), row(t('நட்சத்திரம்', 'Star'), M.label('star', p.star)), row(t('ராசி', 'Raasi'), M.label('raasi', p.raasi)), row(t('தோஷம்', 'Dosham'), M.label('dosham', p.dosham))]) +
      sec(t('கல்வி & தொழில்', 'Education & work'), [row(t('கல்வி', 'Education'), [M.label('education', p.education), p.education_detail].filter(Boolean).join(' – ')), row(t('தொழில்', 'Occupation'), p.occupation), row(t('பணி வகை', 'Employment'), M.label('employer_type', p.employer_type))]) +
      sec(t('குடும்பம்', 'Family'), [row(t('தந்தை தொழில்', "Father's occupation"), p.father_occ), row(t('தாய் தொழில்', "Mother's occupation"), p.mother_occ), row(t('சகோதரர்கள்', 'Brothers'), p.brothers != null ? String(p.brothers) : ''), row(t('சகோதரிகள்', 'Sisters'), p.sisters != null ? String(p.sisters) : ''), row(t('குடும்ப வகை', 'Family type'), M.label('family_type', p.family_type)), row(t('குடும்ப நிலை', 'Family status'), M.label('family_status', p.family_status))]) +
      sec(t('இருப்பிடம்', 'Place'), [row(t('ஊர்', 'City'), p.city), row(t('மாநிலம்', 'State'), M.label('state', p.state))]) +
      (p.about ? '<section class="psec"><h3>' + t('பற்றி', 'About') + '</h3><p>' + esc(p.about) + '</p></section>' : '') + '</div>' +
      '<div class="box cr"><h2 class="h3">' + t('தொடர்பு கொள்ள', 'Get in touch') + '</h2>' +
      '<p class="mut">' + t('சுயவிவர எண்: ', 'Profile no.: ') + '<b>' + esc(codeOf(p)) + '</b> — ' + t('இந்த எண்ணைக் குறிப்பிடுங்கள். நாங்கள் இருவீட்டாரையும் இணைத்து வைக்கிறோம்.', 'quote this number. We will connect both families.') + '</p>' +
      '<div class="rowb">' + (wa ? '<a class="btn pri" href="' + esc(wa) + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '') + '<a class="btn" href="tel:+91' + esc(M.C.SUPPORT_PHONE) + '">📞 ' + t('அழைக்க', 'Call') + '</a></div>' +
      '<form id="crf" novalidate><h3 class="h3">' + t('அல்லது தொடர்பு கோரிக்கை அனுப்புங்கள்', 'Or send a contact request') + '</h3>' +
      '<label class="fld"><span>' + t('உங்கள் பெயர்', 'Your name') + '</span><input id="crn" maxlength="60" autocomplete="name"></label>' +
      '<label class="fld"><span>' + t('உங்கள் மொபைல் எண்', 'Your mobile number') + '</span><input id="crp" type="tel" inputmode="numeric" maxlength="15" autocomplete="tel"></label>' +
      '<label class="fld"><span>' + t('செய்தி (விருப்பம்)', 'Message (optional)') + '</span><textarea id="crm" rows="2" maxlength="300"></textarea></label>' +
      '<p class="err" id="crerr" role="alert"></p><button class="btn pri big full" type="submit">' + t('கோரிக்கை அனுப்பு', 'Send request') + '</button></form></div></div>';
    M.$('#crf', v).addEventListener('submit', async function (e) {
      e.preventDefault(); var er = M.$('#crerr', v); er.textContent = '';
      var name = M.$('#crn', v).value.trim(), ph = M.$('#crp', v).value.replace(/[^\d+ ]/g, ''), note = M.$('#crm', v).value.trim();
      if (name.length < 2) { er.textContent = t('பெயரை உள்ளிடுங்கள்', 'Enter your name'); return; }
      if (ph.replace(/\D/g, '').length < 10) { er.textContent = t('சரியான மொபைல் எண்ணை உள்ளிடுங்கள்', 'Enter a valid mobile number'); return; }
      var btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
      var rr = await M.api('mat_request_contact', { target: id, name: name, phone: ph, note: note || null }); btn.disabled = false;
      if (!rr.ok) { er.textContent = rr.code === 'rate_limited' ? t('இன்று அதிக கோரிக்கைகள் அனுப்பப்பட்டுவிட்டன; நாளை முயலுங்கள்.', 'Too many requests today; please try tomorrow.') : t('அனுப்ப முடியவில்லை; மீண்டும் முயலுங்கள்.', 'Could not send; please try again.'); return; }
      e.target.outerHTML = '<div class="notice"><b>✓ ' + t('கோரிக்கை அனுப்பப்பட்டது', 'Request sent') + '</b><p>' + t('எங்கள் குழு உங்களை விரைவில் தொடர்புகொள்ளும்.', 'Our team will contact you shortly.') + '</p></div>';
    });
  };
  M.views.about = M.views.safety;
  M.views.notfound = function (v) { v.innerHTML = '<div class="wrap narrow"><div class="box"><h1 class="h2">404</h1><p>' + t('பக்கம் கிடைக்கவில்லை.', 'Page not found.') + '</p><a class="btn" href="#/">' + t('முகப்பு', 'Home') + '</a></div></div>'; };
})();
