// node generate-photo-pages.mjs — builds the photo-resizer landing pages from photo-resizer.template.html.
// Each page is the same working tool with different default size + its own title/description/FAQ (one page = one search need).
import fs from 'node:fs';
const T = fs.readFileSync(new URL('./photo-resizer.template.html', import.meta.url), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const BODY = 'இந்த கருவி உங்கள் படத்தை JPG ஆக மாற்றி, நீங்கள் கொடுத்த KB அளவுக்குள் வரும் வரை தரத்தைத் தானாகக் குறைக்கிறது. அகலம், உயரம் இரண்டையும் கொடுத்தால் படம் நடுவில் வெட்டப்பட்டு அதே px அளவில் வரும். படம் உங்கள் போன் அல்லது கணினியின் browser-க்குள்ளேயே செயல்படுகிறது; எங்கள் சர்வருக்கு அனுப்பப்படுவதில்லை. இலவசம், Login தேவையில்லை, Watermark இல்லை.';
const kbFaq = (kb) => [
  [`படத்தை ${kb} KB-க்குள் எப்படிக் கொண்டுவருவது?`, `படத்தைத் தேர்ந்தெடுத்து, அதிகபட்ச அளவில் ${kb} என்று வைத்து “அளவு மாற்று” அழுத்துங்கள். முடிவின் KB அளவு உடனே காட்டப்படும்.`],
  ['படம் மங்கலாகுமா?', 'KB குறைய குறைய தரம் சற்றுக் குறையும். படிவம் அனுமதிக்கும் பெரிய KB-ஐ வைத்தால் தெளிவு அதிகம். முகம் அல்லது கையொப்பம் தெளிவாக இருக்கிறதா என்று முன்னோட்டத்தில் பாருங்கள்.'],
  ['px அளவையும் மாற்ற முடியுமா?', 'ஆம். அகலம், உயரம் இரண்டையும் உள்ளிடுங்கள். படிவம் கேட்கும் சரியான px அளவைப் படிவ வழிமுறையில் பார்த்து உள்ளிடுங்கள்.'],
  ['என் படம் எங்காவது அனுப்பப்படுமா?', 'இல்லை. எல்லாம் உங்கள் சாதனத்தின் browser-க்குள் நடக்கிறது.'],
];
const TNPSC_NOTE = '<div class="note" style="background:#fff8e6;border-radius:10px;padding:10px"><b>TNPSC அளவுகள்:</b> புகைப்படம் 20–50 KB; கையொப்பம் 10–20 KB (200 dpi, JPG). px அளவுகள் செ.மீ.-ஐ 200 dpi-ல் மாற்றிக் கணக்கிட்டவை (புகைப்படம் 3.5×4.5 செ.மீ. ≈ 276×354 px; கையொப்பம் 6×2 செ.மீ. ≈ 472×157 px). இந்தத் தகவல் மூன்றாம் தரப்பு தளத்தில் (Prepp, பிப்ரவரி 2026) உள்ளது, அதிகாரப்பூர்வ அறிவிப்பு அல்ல — விண்ணப்பிக்கும் முன் <b>tnpsc.gov.in</b>-ல் சரிபார்க்கவும்.</div>';
const PAGES = [
  { file: 'photo-resizer.html', path: '/photo-resizer', kb: 50, title: 'Photo Resizer Free — Resize Photo to 20KB, 50KB, 100KB', desc: 'Resize and compress a photo to an exact KB and pixel size for exam forms and online applications. Free, in your browser, nothing uploaded.', h1: 'படத்தை KB, px அளவுக்கு மாற்று — Photo Resizer', lead: 'தேர்வு, வேலை விண்ணப்பம், அரசுப் படிவங்களுக்குத் தேவையான KB, px அளவில் படத்தை உடனே மாற்றுங்கள்.', h2: 'Photo Resizer — பயன்படுத்தும் முறை' },
  { file: 'photo-20kb.html', path: '/photo-20kb', kb: 20, title: 'Resize Photo to 20KB Online Free | PDF Tools India', desc: 'Compress a photo or signature to under 20KB for exam and job application forms. Free, works on your phone, no upload, no watermark.', h1: 'படத்தை 20 KB-க்குள் மாற்று — Photo to 20KB', lead: 'படிவத்தில் “20 KB-க்குள்” என்று கேட்டால் இங்கே படத்தைப் போடுங்கள்; உடனே தயாராகும்.', h2: '20 KB படம் தயாரிக்கும் முறை' },
  { file: 'photo-50kb.html', path: '/photo-50kb', kb: 50, title: 'Resize Photo to 50KB Online Free | PDF Tools India', desc: 'Reduce a photo to under 50KB for online forms and applications. Free, runs in your browser, nothing is uploaded, no watermark.', h1: 'படத்தை 50 KB-க்குள் மாற்று — Photo to 50KB', lead: '50 KB வரம்புள்ள படிவங்களுக்கு படத்தை ஒரே தட்டலில் சுருக்குங்கள்.', h2: '50 KB படம் தயாரிக்கும் முறை' },
  { file: 'photo-100kb.html', path: '/photo-100kb', kb: 100, title: 'Resize Photo to 100KB Online Free | PDF Tools India', desc: 'Compress a photo to under 100KB for online forms, portals and applications. Free, private, in your browser, no watermark.', h1: 'படத்தை 100 KB-க்குள் மாற்று — Photo to 100KB', lead: '100 KB-க்குள் படம் தேவைப்படும் இடங்களுக்கு, தெளிவு குறையாமல் அளவைக் குறையுங்கள்.', h2: '100 KB படம் தயாரிக்கும் முறை' },
  { file: 'photo-200kb.html', path: '/photo-200kb', kb: 200, title: 'Resize Photo to 200KB Online Free | PDF Tools India', desc: 'Compress a photo to under 200KB for online forms and applications. Free, private, runs in your browser, no watermark.', h1: 'படத்தை 200 KB-க்குள் மாற்று — Photo to 200KB', lead: 'பெரிய படத்தை 200 KB வரம்புக்குள் கொண்டுவர இங்கே பயன்படுத்துங்கள்.', h2: '200 KB படம் தயாரிக்கும் முறை' },
  { file: 'tnpsc-photo-signature.html', path: '/tnpsc-photo-signature', kb: 50, min: 20, w: 276, h: 354, presets: [['TNPSC புகைப்படம்', 50, 20, 276, 354], ['TNPSC கையொப்பம்', 20, 10, 472, 157]], source: TNPSC_NOTE, title: 'TNPSC Photo & Signature Resize (20-50KB) Free', desc: 'Resize your photo to 20-50KB and signature to 10-20KB for TNPSC Group 4 and OTR applications. Free, in your browser, nothing uploaded.', h1: 'TNPSC புகைப்படம், கையொப்பம் அளவு மாற்று', lead: 'TNPSC விண்ணப்பம் / OTR-க்கான புகைப்படம் (20–50 KB), கையொப்பம் (10–20 KB) ஒரே தட்டலில் தயார். கீழே உள்ள பொத்தானைத் தேர்ந்தெடுங்கள்.', h2: 'TNPSC படம், கையொப்பம் தயாரிக்கும் முறை' },
  { file: 'signature-resize.html', path: '/signature-resize', kb: 20, w: 140, h: 60, title: 'Resize Signature to 140x60 px, 20KB Online Free', desc: 'Resize a scanned signature to 140x60 pixels and under 20KB for exam forms. Free, in your browser, nothing uploaded. Edit size if your form differs.', h1: 'கையொப்பப் படத்தை அளவு மாற்று — Signature Resize', lead: 'கையொப்பப் படத்தை படிவம் கேட்கும் px, KB அளவுக்கு மாற்றுங்கள். இங்கே 140×60 px, 20 KB முன்னிருப்பு; உங்கள் படிவத்தின் அளவுக்கு மாற்றிக்கொள்ளுங்கள்.', h2: 'கையொப்பப் படம் தயாரிக்கும் முறை' },
];
for (const p of PAGES) {
  const faqs = kbFaq(p.kb);
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: p.title.split(' | ')[0], url: 'https://pdftoolsindia.com' + p.path, applicationCategory: 'MultimediaApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
    { '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } ] }).replace(/</g, '\\u003c');
  const links = PAGES.filter((x) => x !== p).map((x) => `<a href="${x.path}">${esc(x.title.split(' | ')[0].replace(/ Online Free/, ''))}</a>`).join('');
  const html = T.replace(/{{TITLE}}/g, esc(p.title)).replace(/{{DESC}}/g, esc(p.desc)).replace(/{{PATH}}/g, p.path)
    .replace('{{JSONLD}}', jsonld).replace('{{H1}}', p.h1).replace('{{LEAD}}', p.lead).replace('{{H2}}', p.h2).replace('{{BODY}}', BODY)
    .replace('{{PRESETS}}', JSON.stringify(p.presets || [])).replace('{{SOURCE}}', p.source || '').replace('{{MIN}}', p.min || '').replace('{{KB}}', p.kb).replace('{{W}}', p.w || '').replace('{{H}}', p.h || '').replace('{{WPH}}', 'எ.கா. 200').replace('{{HPH}}', 'எ.கா. 230')
    .replace('{{FAQHTML}}', faqs.map(([q, a]) => `<p><b>${esc(q)}</b><br>${esc(a)}</p>`).join('\n    ')).replace('{{LINKS}}', links);
  if (p.title.length > 60 || p.desc.length > 160) throw new Error('SEO length: ' + p.file);
  fs.writeFileSync(new URL('./' + p.file, import.meta.url), html);
}
console.log('wrote', PAGES.length, 'photo pages');
