/* சௌடேஸ்வரி திருமண அமைப்பகம் — contact-information filter (single source of truth).
 * Works in browser (window.MatFilter) and Node (module.exports).
 * The SQL version in supabase/schema.sql is GENERATED from this file by tools/build-schema.mjs,
 * so the browser pre-check and the database rule always agree.
 * check(text, prev[]) -> null (ok)  |  'phone' | 'email' | 'link' | 'social' | 'phrase'
 */
(function (root) {
  'use strict';

  // ---------- separators: everything that is "not a letter or digit" (ASCII punctuation, spaces, symbols, emoji blocks)
  var SEP = '[\\s\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E\\u00A0-\\u00BF\\u2000-\\u2BFF\\u3000-\\u303F]';

  // ---------- Indic / Arabic digit blocks -> ASCII (explicit table, same in SQL translate())
  var DIGIT_BLOCKS = [0x0660, 0x06F0, 0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66];
  var HOMOGLYPH_FROM = 'асеорхіјѕ', HOMOGLYPH_TO = 'aceopxijs'; // Cyrillic look-alikes
  var LEET_FROM = '@$4310', LEET_TO = 'asaeio'; // only used for the "squeezed" keyword copy
  var STRIP = '[\\u00AD\\u200B-\\u200D\\u2060\\uFEFF\\uFE0E\\uFE0F\\u20E3]';

  // ---------- number words (English, Tanglish, Tamil, Hindi, Kannada, Telugu) -> digit
  var W = {
    0: ['zero', 'sifar', 'sunna', 'sonne', 'shunya', 'poojyam', 'poojiyam', 'pujyam', 'பூஜ்ஜியம்', 'பூஜ்யம்', 'சைபர்', 'ஜீரோ', 'ஜீரோ', 'सिफर', 'शून्य', 'जीरो', 'ಸೊನ್ನೆ', 'ಜೀರೋ', 'సున్నా', 'జీరో'],
    1: ['one', 'onnu', 'ondru', 'ondhu', 'ondu', 'okati', 'ek', 'ஒன்று', 'ஒண்ணு', 'ஒன்னு', 'एक', 'ಒಂದು', 'ఒకటి'],
    2: ['two', 'do', 'rendu', 'irandu', 'randu', 'eradu', 'erdu', 'ரெண்டு', 'இரண்டு', 'दो', 'ಎರಡು', 'రెండు'],
    3: ['three', 'moonu', 'moondru', 'mooru', 'moodu', 'teen', 'மூணு', 'மூன்று', 'तीन', 'ಮೂರು', 'మూడు'],
    4: ['four', 'naalu', 'naangu', 'nangu', 'nalku', 'naalku', 'naalugu', 'chaar', 'char', 'நாலு', 'நான்கு', 'चार', 'ನಾಲ್ಕು', 'నాలుగు'],
    5: ['five', 'anju', 'ainthu', 'aindhu', 'aidu', 'paanch', 'panch', 'pach', 'அஞ்சு', 'ஐந்து', 'पांच', 'पाँच', 'ಐದು', 'ఐదు'],
    6: ['six', 'aaru', 'aru', 'chhe', 'chah', 'chhah', 'cheh', 'ஆறு', 'छह', 'छः', 'छे', 'ಆರು', 'ఆరు'],
    7: ['seven', 'ezhu', 'eazhu', 'elu', 'edu', 'saat', 'sat', 'ஏழு', 'सात', 'ಏಳು', 'ఏడు'],
    8: ['eight', 'ettu', 'entu', 'aath', 'ath', 'enimidi', 'எட்டு', 'आठ', 'ಎಂಟು', 'ఎనిమిది'],
    9: ['nine', 'onbathu', 'onbadhu', 'ombathu', 'ombodhu', 'ombadhu', 'ombattu', 'tommidi', 'nau', 'ஒன்பது', 'ஒம்பது', 'ஒம்போது', 'नौ', 'ಒಂಬತ್ತು', 'తొమ్మిది']
  };
  var MULT2 = ['double', 'dabal', 'dubal', 'டபுள்', 'डबल'];
  var MULT3 = ['triple', 'tripple', 'ட்ரிபிள்', 'ट्रिपल'];

  // ---------- Stage-A regex rules (on normalised text). id = reason returned.
  var NB = '(?<![a-z0-9])', NA = '(?![a-z0-9])'; // Latin word edges
  var RULES = [
    ['email', '@'],                                              // anything with @
    ['email', '[a-z0-9]' + SEP + '{0,2}[\\(\\[\\{<]' + SEP + '*at' + SEP + '*[\\)\\]\\}>]'],  // x (at) y
    ['email', NB + 'at' + SEP + '+the' + SEP + '+rate'],           // "at the rate"
    ['email', '[\\(\\[\\{<]' + SEP + '*dot' + SEP + '*[\\)\\]\\}>]'],
    ['email', NB + 'dot' + SEP + '+(com|in|net|org|co)' + NA],
    ['email', NB + '(e' + SEP + '?mail|mail' + SEP + '?id)' + NA],
    ['link', '(https?|ftp)://'],
    ['link', NB + 'www' + SEP + '?\\.'],
    ['link', NB + '[a-z0-9][a-z0-9-]*\\.(com|in|net|org|co|me|link|app|io|xyz|info|ly|us|biz|online|site|club|gl|be|page|dev)' + NA],
    ['social', NB + '(insta|ig|fb|dm|snap|wapp|wa|tg|telegram|whatsapp|watsapp|whtsapp|instagram|facebook|snapchat)' + NA],
    ['phrase', NB + '(phone|fone|mobile|cell|contact|whatsapp|watsapp|call|ph|mob|tel)' + SEP + '{0,2}(no|num|nbr|nmbr|number|nambar|numbar)' + NA],
    ['phrase', NB + '(phone|fone|cellphone)' + NA],
    ['phrase', NB + '(call|ring|miss|missed|voice|video)' + SEP + '{1,2}(me|you|u|call|chat)' + NA],
    ['phrase', NB + '(give|have)' + SEP + '+(me' + SEP + '+)?a' + SEP + '+(call|ring)' + NA],
    ['phrase', NB + '(on|over)' + SEP + '+(call|phone)' + NA],
    ['phrase', NB + '(unga|ungal|un|enn?oda|en|ur|your|my|his|her|avanga|neenga|tumhara|aapka|aapke|mera|meri|nimma|nanna|mee|naa)' + SEP + '+(number|numbar|nambar|nambaru|nambr|num|no|nbr|mobile|phone|fone|cell|contact|whatsapp|watsapp|email|mail|id|insta|telegram)' + NA],
    ['phrase', NB + '(send|give|share|kudu|kodu|kodunga|bhejo|ivvu|sollunga|sollu|anuppunga|anuppu|tell|text|drop|note)' + SEP + '+((me|us|the|a|your|ur|ungal|unga)' + SEP + '+)?(number|numbar|nambar|nambr|num|no|mobile|phone|fone|whatsapp|email|mail|id)' + NA]
  ];
  // substrings in native scripts (matched on normalised text, no word edges: suffixes are common)
  var NATIVE = [
    'நம்பர்', 'நெம்பர்', 'தொலைபேசி', 'அலைபேசி', 'கைபேசி', 'மொபைல்', 'மொபைலில்', 'வாட்ஸ்அப்', 'வாட்ஸப்', 'வாட்சப்', 'வாட்ஸாப்', 'வாட்ஸ் அப்', 'வாட்சாப்',
    'டெலிகிராம்', 'இன்ஸ்டா', 'பேஸ்புக்', 'ஃபேஸ்புக்', 'ஃபேஸ்புக்', 'ஜிமெயில்', 'ஜி மெயில்', 'ஜீமெயில்', 'ஜிமெய்ல்', 'யாகூ', 'மின்னஞ்சல்', 'ஈமெயில்', 'இமெயில்', 'ஈ-மெயில்',
    'போன் எண்', 'போன் நம்பர்', 'போன் பண்ண', 'போன் செய்', 'போன் பன்ன', 'கால் பண்ண', 'கால் பன்ன', 'கால் செய்', 'மிஸ்டு கால்', 'மிஸ்ட் கால்', 'எண்ணை கொடு', 'எண் கொடு', 'எண்ணை அனுப்பு', 'வீடியோ கால்', 'வாய்ஸ் கால்',
    'नंबर', 'नम्बर', 'मोबाइल', 'मोबाईल', 'फोन', 'फ़ोन', 'व्हाट्सएप', 'व्हाट्सऐप', 'वॉट्सऐप', 'वाट्सएप', 'व्हॉट्सअॅप', 'व्हाट्स', 'टेलीग्राम', 'इंस्टा', 'जीमेल', 'ईमेल', 'मेल आईडी', 'कॉल',
    'ನಂಬರ್', 'ನಂಬರ', 'ಫೋನ್', 'ಮೊಬೈಲ್', 'ವಾಟ್ಸಪ್', 'ವಾಟ್ಸ್ಆ್ಯಪ್', 'ವಾಟ್ಸಾಪ್', 'ವಾಟ್ಸ್ ಆಪ್', 'ಟೆಲಿಗ್ರಾಂ', 'ಇನ್ಸ್ಟಾ', 'ಜಿಮೇಲ್', 'ಇಮೇಲ್', 'ಕಾಲ್ ಮಾಡಿ', 'ಕಾಲ್ ಮಾಡು',
    'నంబర్', 'ఫోన్', 'మొబైల్', 'వాట్సాప్', 'టెలిగ్రామ్', 'ఇన్స్టా', 'జీమెయిల్', 'ఈమెయిల్', 'కాల్ చేయి', 'కాల్ చెయ్యి'
  ];
  // Latin squeezed keywords (separators removed, leet undone): "w h a t s a p p", "g.m@il", "wh4tsapp"
  var SQUEEZE = ['whatsapp', 'whatsap', 'watsapp', 'wattsapp', 'whtsapp', 'wtsapp', 'whatsaap', 'telegram', 'instagram', 'facebook', 'snapchat', 'gmail', 'gmial', 'googlemail', 'yahoo', 'hotmail', 'outlook', 'protonmail', 'rediff', 'icloud', 'skype', 'linkedin', 'dotcom', 'dotin', 'dotnet', 'dotorg', 'attherate', 'atrate'];

  // ---------- helpers
  function norm(s) {
    s = String(s == null ? '' : s).normalize('NFKC').toLowerCase();
    s = s.replace(new RegExp(STRIP, 'g'), '');
    for (var i = 0; i < HOMOGLYPH_FROM.length; i++) s = s.split(HOMOGLYPH_FROM[i]).join(HOMOGLYPH_TO[i]);
    DIGIT_BLOCKS.forEach(function (z) { for (var k = 0; k < 10; k++) s = s.split(String.fromCharCode(z + k)).join(String(k)); });
    return s;
  }
  var WORDS = []; // [word, digit] longest first
  Object.keys(W).forEach(function (d) { W[d].forEach(function (w) { WORDS.push([norm(w), d]); }); });
  WORDS.sort(function (a, b) { return b[0].length - a[0].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); });
  var MULT2N = MULT2.map(norm), MULT3N = MULT3.map(norm);
  var NATIVEN = NATIVE.map(norm);
  var RULE_RE = RULES.map(function (r) { return [r[0], new RegExp(r[1])]; });
  var DATE_RE = new RegExp('(?<![0-9])(0?[1-9]|[12][0-9]|3[01])[-/. ](0?[1-9]|1[0-2])[-/. ](19|20)[0-9][0-9](?![0-9])', 'g');
  var YEARS_RE = new RegExp('(?<![0-9])(19|20)[0-9][0-9]' + SEP + '{0,3}(19|20)[0-9][0-9](?![0-9])', 'g');
  var STREAK_RE = new RegExp('[0-9](' + SEP + '{0,3}[0-9]){7,}');
  var OBETWEEN = new RegExp('([0-9])(' + SEP + '{0,2})o(' + SEP + '{0,2})([0-9])', 'g');
  var SEP_G = new RegExp(SEP, 'g');

  function toDigits(a) {
    var t = a;
    WORDS.forEach(function (p) { t = t.split(p[0]).join(p[1]); });
    MULT2N.forEach(function (m) { t = t.replace(new RegExp(m + SEP + '*([0-9])', 'g'), '$1$1'); });
    MULT3N.forEach(function (m) { t = t.replace(new RegExp(m + SEP + '*([0-9])', 'g'), '$1$1$1'); });
    for (var i = 0; i < 3; i++) t = t.replace(OBETWEEN, function (m, a, b, c, d) { return a + b + '0' + c + d; });
    t = t.replace(DATE_RE, ' d ').replace(YEARS_RE, ' d ');
    return t;
  }
  function hasStreak(a) { return STREAK_RE.test(toDigits(a)); }
  function hasDigit(a) { return /[0-9]/.test(toDigits(a)); }

  function check(text, prev) {
    var a = norm(text);
    if (!a) return null;
    for (var i = 0; i < RULE_RE.length; i++) if (RULE_RE[i][1].test(a)) return RULE_RE[i][0];
    for (var j = 0; j < NATIVEN.length; j++) if (a.indexOf(NATIVEN[j]) >= 0) return 'phrase';
    var sq = a;
    for (var k = 0; k < LEET_FROM.length; k++) sq = sq.split(LEET_FROM[k]).join(LEET_TO[k]);
    sq = sq.replace(SEP_G, '');
    for (var m = 0; m < SQUEEZE.length; m++) if (sq.indexOf(SQUEEZE[m]) >= 0) return /mail|yahoo|hotmail|outlook|proton|rediff|icloud|dot|rate/.test(SQUEEZE[m]) ? 'email' : 'social';
    if (hasStreak(a)) return 'phone';
    // rolling window: digits split across the last few messages of the same sender
    var P = (prev || []).slice(-3).map(norm).filter(function (x) { return x; });
    if (P.length && hasDigit(a)) {
      if (hasStreak(P.concat([a]).join(' '))) return 'phone';
    }
    return null;
  }

  var API = {
    check: check, norm: norm,
    DATA: { SEP: SEP, STRIP: STRIP, DIGIT_BLOCKS: DIGIT_BLOCKS, HOMOGLYPH_FROM: HOMOGLYPH_FROM, HOMOGLYPH_TO: HOMOGLYPH_TO, LEET_FROM: LEET_FROM, LEET_TO: LEET_TO, WORDS: WORDS, MULT2: MULT2N, MULT3: MULT3N, RULES: RULES, NATIVE: NATIVEN, SQUEEZE: SQUEEZE }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.MatFilter = API;
})(typeof window !== 'undefined' ? window : this);
