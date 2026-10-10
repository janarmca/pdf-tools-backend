// Shared look for the static pages (hub pages + per-tool landing pages) — same visual language as the home page:
// colourful gradient header, big icon tiles, Tamil first, no photos.
export const CAT_THEME = {
  pdf:       { g:'linear-gradient(135deg,#4263EB,#2B3F9E)', icon:'📄', ta:'PDF கருவிகள்', en:'PDF Tools',       line:'PDF-ஐ இணை, பிரி, சுருக்கு, மாற்று, கையொப்பமிடு' },
  image:     { g:'linear-gradient(135deg,#9C36B5,#5F2A8A)', icon:'🖼️', ta:'படக் கருவிகள்', en:'Image Tools',     line:'படத்தைச் சுருக்கு, மாற்று, Background நீக்கு' },
  video:     { g:'linear-gradient(135deg,#F08C00,#C2410C)', icon:'🎬', ta:'வீடியோ கருவிகள்', en:'Video Tools',   line:'வீடியோ வெட்டு, இணை, சுருக்கு, GIF ஆக்கு' },
  business:  { g:'linear-gradient(135deg,#2F9E44,#17613A)', icon:'💼', ta:'வணிகக் கருவிகள்', en:'Business Tools', line:'GST பில், கணிப்பான்கள், படிவங்கள், ஆவணங்கள்' },
  ai:        { g:'linear-gradient(135deg,#0CA5A5,#0B6070)', icon:'🤖', ta:'AI கருவிகள்', en:'AI Tools',          line:'AI உதவியுடன் படி, சுருக்கு, மொழிபெயர் (credit தேவை)' },
  education: { g:'linear-gradient(135deg,#E64980,#B02A5B)', icon:'🎓', ta:'கல்விக் கருவிகள்', en:'Education Tools', line:'கல்வி களஞ்சியம், விளையாட்டு, தமிழ் மற்றும் மாணவர் கருவிகள்' },
};
export const BASE_CSS = `
  :root{--ink:#20242B;--sub:#6B7280;--line:#E6E8EC;--bg:#F6F7FB;--brand:#3752A6;}
  *{box-sizing:border-box;}
  html{-webkit-text-size-adjust:100%;}
  body{margin:0;font-family:'Noto Sans Tamil',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55;}
  a{color:inherit;}
  .top{max-width:1000px;margin:0 auto;padding:14px 16px 4px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
  .top img{height:40px;width:auto;display:block;}
  .home{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 14px;font-weight:800;font-size:13px;text-decoration:none;color:var(--brand);}
  .wrap{max-width:1000px;margin:0 auto;padding:10px 16px 60px;}
  .hero{border-radius:24px;padding:26px 22px;color:#fff;position:relative;overflow:hidden;box-shadow:0 10px 26px rgba(20,30,60,.2);}
  .hero::after{content:'';position:absolute;right:-50px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.25),transparent 70%);}
  .hero .row{display:flex;align-items:center;gap:16px;position:relative;z-index:1;}
  .hero .big{width:70px;height:70px;border-radius:20px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:36px;flex:0 0 auto;}
  .hero h1{margin:0;font-size:26px;line-height:1.3;font-weight:900;}
  .hero .en{font-size:13px;font-weight:700;opacity:.9;margin-top:2px;}
  .hero p{position:relative;z-index:1;margin:14px 0 0;font-size:14.5px;line-height:1.7;opacity:.96;max-width:720px;}
  .cta{position:relative;z-index:1;display:inline-block;margin-top:18px;background:#fff;color:#20242B;font-weight:900;font-size:16px;padding:14px 30px;border-radius:14px;text-decoration:none;box-shadow:0 6px 16px rgba(0,0,0,.2);}
  .cta:hover{transform:translateY(-2px);}
  .pills{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}
  .pill{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;}
  .section{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px 22px;}
  .section h2{font-size:17px;margin:0 0 10px;font-weight:900;}
  .section h2 small{font-weight:600;color:var(--sub);font-size:12px;margin-left:8px;}
  .section p,.section li{font-size:14.5px;line-height:1.75;color:#333;}
  .section p{margin:0;} .section ol,.section ul{margin:0;padding-left:22px;}
  .faq h3{font-size:14.5px;margin:16px 0 4px;} .faq h3:first-of-type{margin-top:4px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px;}
  .tc{display:flex;align-items:center;gap:13px;padding:12px 14px;background:#fff;border:1px solid var(--line);border-radius:16px;text-decoration:none;color:var(--ink);transition:transform .12s,box-shadow .12s;}
  .tc:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(20,30,60,.1);}
  .tc .ic{flex:0 0 auto;width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;}
  .tc .tx{flex:1;min-width:0;} .tc .nm{font-weight:900;font-size:15px;line-height:1.3;}
  .tc .nm small{display:block;font-weight:600;font-size:11px;color:var(--sub);}
  .tc .ds{font-size:12.5px;color:var(--sub);line-height:1.45;margin-top:2px;}
  .tc .bd{flex:0 0 auto;align-self:flex-start;font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:20px;background:#E3F6EB;color:#176B45;}
  .tc .bd.ai{background:#FFF3E0;color:#9A6700;}
  .crumb{font-size:12.5px;color:var(--sub);margin:6px 2px 12px;} .crumb a{text-decoration:none;color:var(--sub);} .crumb a:hover{text-decoration:underline;}
  footer{margin-top:30px;text-align:center;font-size:12.5px;color:var(--sub);} footer a{color:var(--sub);margin:0 6px;}
  @media (max-width:600px){.hero h1{font-size:21px}.hero{padding:20px 16px;border-radius:20px}.hero .big{width:56px;height:56px;font-size:28px}.grid{grid-template-columns:1fr}}
`;
export const HEADER = `<div class="top"><a href="/"><img src="/lockup.svg" alt="PDF Tools India" height="40"></a><a class="home" href="/">← முதன்மைப் பக்கம்</a></div>`;
export const FOOTER = `<footer><div><a href="/">முதன்மை</a><a href="/pdf-tools">PDF</a><a href="/image-tools">படம்</a><a href="/video-tools">வீடியோ</a><a href="/business-tools">வணிகம்</a><a href="/ai-tools">AI</a><a href="/education-tools">கல்வி</a><a href="/learn/">கல்வி களஞ்சியம்</a></div><div style="margin-top:8px;"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a></div><div style="margin-top:8px;">உங்கள் கோப்புகள் உங்கள் சாதனத்திலேயே இருக்கும் · Your files stay on your device</div></footer>`;
