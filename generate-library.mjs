// Generates /tamil-library.html — "தமிழ் களஞ்சியம்": a searchable, Tamil-first directory of legally free
// books, laws, textbooks and courses (links to the original sites; we host none of their files),
// plus our own tools to read, convert, search, listen to and share what you download.
import { writeFileSync } from 'node:fs';
import { BASE_CSS } from './pages-style.mjs';
const SITE = 'https://pdftoolsindia.com';
// [name_ta, name_en, what_ta, url, tags]
const SECTIONS = [
 { id:'books', icon:'📚', ta:'தமிழ் நூல்கள் & இலக்கியம்', en:'Tamil books & literature', items:[
  ['தமிழ் விக்கிமூலம்','Tamil Wikisource','பழந்தமிழ் இலக்கியம் முதல் பொதுக்களத்து நூல்கள் வரை — படிக்கலாம், நகலெடுக்கலாம்','https://ta.wikisource.org','thirukkural sangam ilakkiyam புத்தகம் நூல் novel திருக்குறள் சங்க இலக்கியம் கவிதை பாரதியார் கம்பராமாயணம் சிலப்பதிகாரம்'],
  ['மதுரைத் திட்டம்','Project Madurai','தமிழ்ப் பழம் நூல்கள், நாவல்கள் — இலவச மின்னூல்கள் (PDF / ePub)','https://projectmadurai.org','ponniyin selvan epub pdf நாவல் மின்னூல் பொன்னியின் செல்வன் கல்கி திருக்குறள் புத்தகம்'],
  ['தமிழ் இணையக் கல்விக் கழகம்','Tamil Virtual Academy','தமிழ்நாடு அரசின் இணைய நூலகம், அகராதி, இலக்கணம்','https://www.tamilvu.org','dictionary agarathi grammar ilakkanam அகராதி'],
  ['நூலகம் (noolaham)','Noolaham Foundation','ஈழத் தமிழ் நூல்கள், இதழ்கள், ஆவணங்கள் — மின்னூலகம்','https://noolaham.org','eelam sri lanka magazines இதழ்கள்'],
  ['Internet Archive — தமிழ்','Internet Archive','பொதுக்களத்து தமிழ் நூல்கள், பழைய இதழ்கள் (ஒவ்வொரு நூலின் உரிமைக் குறிப்பைப் பாருங்கள்)','https://archive.org/search?query=language%3ATamil','archive tamil books free download'],
  ['Project Gutenberg','Project Gutenberg','பொதுக்களத்து (அமெரிக்கா) உலக இலக்கியம் — இந்தியாவில் ஒவ்வொரு நூலின் உரிமையைப் பார்க்கவும்','https://www.gutenberg.org','classics english novels public domain'],
  ['தமிழ் விக்கிப்பீடியா','Tamil Wikipedia','தமிழில் கலைக்களஞ்சியம் — யார், என்ன, எங்கே என்று தேட','https://ta.wikipedia.org','encyclopedia kalaikalanjiyam'],
 ]},
 { id:'school', icon:'🎒', ta:'பள்ளி பாடநூல்கள்', en:'School textbooks', items:[
  ['தமிழ்நாடு பாடநூல் கழகம்','TN Textbook & Educational Services Corp.','சமச்சீர் கல்வி பாடநூல்கள் — 1 முதல் 12 வகுப்பு','https://textbookcorp.tn.gov.in','samacheer kalvi books class 1 to 12 பாடநூல் சமச்சீர் கல்வி வகுப்பு 10ஆம் 12ஆம் புத்தகம்'],
  ['NCERT பாடநூல்கள்','NCERT','CBSE / தேசியப் பாடநூல்கள் — இலவசப் பதிவிறக்கம்','https://ncert.nic.in/textbook.php','ncert cbse textbooks'],
  ['SWAYAM','SWAYAM','இந்திய அரசின் இலவச ஆன்லைன் பாடப்பிரிவுகள்','https://swayam.gov.in','free online courses degree'],
  ['NPTEL','NPTEL','IIT / IISc பேராசிரியர்களின் இலவச பாடங்கள், வீடியோக்கள்','https://nptel.ac.in','iit engineering lectures free'],
 ]},
 { id:'law', icon:'⚖️', ta:'சட்டம், அரசாணை & அரசு ஆவணங்கள்', en:'Laws, orders & government documents', items:[
  ['இந்தியச் சட்டங்கள் (India Code)','India Code','மத்திய, மாநிலச் சட்டங்களின் அதிகாரப்பூர்வ தொகுப்பு','https://www.indiacode.nic.in','acts laws bare act சட்டம்'],
  ['மின் அரசிதழ் (e-Gazette)','e-Gazette of India','அரசிதழ் அறிவிப்புகள் — இலவசம்','https://egazette.gov.in','gazette notification'],
  ['தமிழ்நாடு அரசு','Tamil Nadu Government','அரசாணைகள் (G.O.), துறை அறிவிப்புகள், படிவங்கள்','https://www.tn.gov.in','go government order படிவம் அரசாணை'],
  ['DigiLocker','DigiLocker','ஆதார், PAN, சான்றிதழ்கள் — அரசு அங்கீகாரம் பெற்ற மின்-ஆவணங்கள்','https://www.digilocker.gov.in','certificates documents aadhaar'],
  ['Right to Information','RTI Online','தகவல் அறியும் உரிமை மனு — இணையத்தில்','https://rtionline.gov.in','rti petition தகவல் உரிமை'],
 ]},
 { id:'media', icon:'🖼️', ta:'படங்கள், இசை & பொதுக்கள ஊடகம்', en:'Free images, audio & media', items:[
  ['Wikimedia Commons','Wikimedia Commons','படங்கள், ஒலி, வரைபடங்கள் — ஒவ்வொன்றுக்கும் தனி உரிமை; பயன்படுத்தும் முன் உரிமைக் குறிப்பைப் படியுங்கள்','https://commons.wikimedia.org','images maps photos free licence'],
  ['Openverse','Openverse','Creative Commons படங்கள், ஒலிகள் தேடல் — ஒவ்வொன்றின் நிபந்தனையையும் பாருங்கள்','https://openverse.org','creative commons search'],
 ]},
];
const TOOLS = [
 ['pdfocrsearchable','🔎','ஸ்கேன் PDF-ஐத் தேடக்கூடியதாக மாற்று','OCR PDF → Searchable PDF'],
 ['ocr','🔤','படத்திலிருந்து தமிழ் எழுத்து எடு','Image → Text (OCR)'],
 ['pdf2text','📝','PDF-இல் இருந்து உரை எடு','PDF → Text'],
 ['pdf2word','📄','PDF → Word','PDF → Word'],
 ['texttospeech','🔊','உரையைத் தமிழ்க் குரலில் கேள்','Text to Speech'],
 ['compress','🗜️','பெரிய PDF-ஐச் சுருக்கு','Compress PDF'],
 ['merge','➕','பல PDF-ஐ ஒன்றாக்கு','Merge PDF'],
 ['split','✂️','தேவையான பக்கங்களை மட்டும் எடு','Split PDF'],
 ['pdfeditor','✏️','PDF-இல் நேரடியாகத் திருத்து','PDF Editor'],
];
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const host = u => u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
const secHtml = SECTIONS.map(s => `<section class="section" id="${s.id}"><h2>${s.icon} ${esc(s.ta)}<small>${esc(s.en)}</small></h2><div class="lib">${s.items.map(i=>`<a class="it" target="_blank" rel="noopener noreferrer" href="${esc(i[3])}" data-q="${esc((i[0]+' '+i[1]+' '+i[2]+' '+i[4]).toLowerCase())}"><b>${esc(i[0])}</b><em>${esc(i[1])}</em><span>${esc(i[2])}</span><u>${esc(host(i[3]))} ↗</u></a>`).join('')}</div></section>`).join('\n');
const toolHtml = TOOLS.map(t=>`<a class="tl" href="/?tool=${t[0]}"><i>${t[1]}</i><b>${esc(t[2])}</b><small>${esc(t[3])}</small></a>`).join('');
const title = 'தமிழ் களஞ்சியம் — இலவச தமிழ் நூல்கள், பாடநூல்கள், சட்டங்கள் | PDF Tools India';
const desc = 'தமிழ் நூல்கள், சமச்சீர் பாடநூல்கள், அரசாணைகள், சட்டங்கள், இலவசப் படிப்புகள் — இலவசமாகப் படிக்கக்கூடிய அதிகாரப்பூர்வ தளங்களுக்கான இணைப்புகள் ஒரே பக்கத்தில். Links to free official and open sites for Tamil books, textbooks, laws and courses.';
const ld = { '@context':'https://schema.org','@type':'CollectionPage',name:'தமிழ் களஞ்சியம்',url:SITE+'/tamil-library',inLanguage:'ta',description:desc,
  hasPart: SECTIONS.flatMap(s=>s.items.map(i=>({'@type':'WebSite',name:i[1],url:i[3]}))) };
const html = `<!DOCTYPE html>
<html lang="ta"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/tamil-library"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${SITE}/tamil-library">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${BASE_CSS}
.hero{background:linear-gradient(135deg,#7A3B06,#B45309);}
.q{width:100%;font:inherit;font-size:16px;padding:14px 16px;border:2px solid var(--line);border-radius:14px;margin-top:16px;background:#fff;color:var(--ink);}
.lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;}
.it{display:flex;flex-direction:column;gap:3px;text-decoration:none;border:1px solid var(--line);border-radius:14px;padding:14px;background:#fff;min-width:0;}
.it:hover{border-color:var(--brand);} .it b{font-size:15px;} .it em{font-size:12px;color:var(--sub);font-style:normal;font-weight:700;} .it span{font-size:13px;color:#333;line-height:1.6;} .it u{font-size:12px;color:var(--brand);text-decoration:none;font-weight:800;margin-top:4px;}
.tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;}
.tl{display:flex;flex-direction:column;gap:2px;text-decoration:none;border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff;min-width:0;} .tl i{font-style:normal;font-size:22px;} .tl b{font-size:14px;} .tl small{color:var(--sub);font-size:12px;}
.none{display:none;margin-top:14px;color:var(--sub);font-weight:700;}
</style></head><body>
<div class="top"><a href="/"><img src="/logo.png" alt="PDF Tools India" onerror="this.style.display='none'"></a><a class="home" href="/">🏠 முகப்பு</a></div>
<main class="wrap">
<div class="hero"><div class="row"><div class="big">📖</div><div><h1>தமிழ் களஞ்சியம்</h1><div class="en">Tamil Library — links to free official and open sites for books, textbooks, laws &amp; courses</div></div></div>
<p>நூல், பாடநூல், அரசாணை, சட்டம், படிப்பு — பணம் கேட்காமல் படிக்கக்கூடிய அதிகாரப்பூர்வ, திறந்த தளங்களுக்கான இணைப்புகளை ஒரே பக்கத்தில் சேர்த்துள்ளோம். கீழே தேடுங்கள்; பிறகு எங்கள் கருவிகளால் அதைப் படிக்க, சுருக்க, உரையாக மாற்ற, கேட்க முடியும்.</p>
<input class="q" id="q" type="search" placeholder="தேடுங்கள்: திருக்குறள், அரசாணை, 10ஆம் வகுப்பு, சட்டம்…" aria-label="Search"></div>
<div class="none" id="none">எதுவும் கிடைக்கவில்லை — வேறு சொல்லில் தேடுங்கள்.</div>
${secHtml}
<section class="section"><h2>🛠️ பதிவிறக்கியதை இங்கேயே பயன்படுத்துங்கள்<small>Use what you download — free tools</small></h2><div class="tools">${toolHtml}</div></section>
<section class="section faq"><h2>தெரிந்துகொள்ளுங்கள்<small>Good to know</small></h2>
<h3>இங்கே புத்தகங்கள் சேமிக்கப்பட்டுள்ளனவா?</h3><p>இல்லை. இது அசல் தளங்களுக்கான வழிகாட்டி. நூல்கள் அந்தந்தத் தளங்களிலேயே உள்ளன; ஒவ்வொன்றின் உரிம விதிகளும் அங்கேயே பொருந்தும்.</p>
<h3>பதிப்புரிமை</h3><p>இந்தப் பக்கம் இணைப்புகளை மட்டுமே தருகிறது; எந்த நூலும் உள்ளடக்கமும் எங்களுடையது அல்ல. ஒவ்வொரு தளத்திலும் உள்ள உரிம விதிகளே பொருந்தும். பதிப்புரிமை உள்ள நூல்களை அனுமதியின்றி நகலெடுக்கவோ பகிரவோ வேண்டாம். உங்கள் உரிமைப் படைப்பு தவறாகக் குறிப்பிடப்பட்டிருந்தால் support@pdftoolsindia.com-க்கு எழுதுங்கள்; உடனே நீக்குவோம்.</p>
<h3>இணைப்புகள் சரிபார்ப்பு</h3><p>தளங்களின் முகவரிகள் மாறலாம். ஒரு இணைப்பு வேலை செய்யாவிட்டால் support@pdftoolsindia.com-க்குத் தெரிவியுங்கள்.</p></section>
</main>
<script>(function(){var q=document.getElementById('q'),none=document.getElementById('none');q.addEventListener('input',function(){var v=q.value.trim().toLowerCase(),any=false;document.querySelectorAll('.it').forEach(function(a){var m=!v||a.dataset.q.indexOf(v)>-1;a.style.display=m?'':'none';if(m)any=true;});document.querySelectorAll('section[id]').forEach(function(s){var vis=s.querySelectorAll('.it:not([style*="none"])').length;s.style.display=vis?'':'none';});none.style.display=any?'none':'block';});})();</script>
</body></html>`;
writeFileSync('tamil-library.html', html);
console.log('tamil-library.html', html.length, 'bytes');
