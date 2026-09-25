import sys

with open('index.source.html', encoding='utf-8') as f:
    c = f.read()

edits = []

edits.append((
'<title>PDF Tools India - இலவச PDF, GST Bill, Image, Video Tools | 87+ கருவிகள்</title>\n<meta name="description" content="இலவச PDF Merge, Split, Compress, GST Invoice Maker, Bill/Quotation Maker, Image Background Remover, Video Compressor - 87+ tools ஒரே இடத்தில். No signup needed for most tools. Tamil & English support.">\n<meta name="keywords" content="PDF tools India, free PDF merge, PDF split online, GST invoice maker free, GST bill software Tamil Nadu, image background remover free, video compressor online, PDF tools Tamil">\n<link rel="canonical" href="https://pdftoolsindia.com/">\n<meta property="og:title" content="PDF Tools India - 87+ இலவச கருவிகள்">\n<meta property="og:description" content="PDF, GST Bill, Image, Video, AI, Education tools - அனைத்தும் ஒரே இடத்தில், இலவசமாக.">\n<meta property="og:type" content="website">',
'<title>PDF Tools India - இலவச PDF, GST Bill, Image, Video Tools | 122+ கருவிகள்</title>\n<meta name="description" content="இலவச PDF Merge, Split, Compress, GST Invoice Maker, Bill/Quotation Maker, Image Background Remover, Video Compressor - 122+ tools ஒரே இடத்தில். No signup needed for most tools. Tamil & English support.">\n<meta name="keywords" content="PDF tools India, free PDF merge, PDF split online, GST invoice maker free, GST bill software Tamil Nadu, image background remover free, video compressor online, PDF tools Tamil">\n<link rel="canonical" href="https://pdftoolsindia.com/">\n<meta property="og:title" content="PDF Tools India - 122+ இலவச கருவிகள்">\n<meta property="og:description" content="PDF, GST Bill, Image, Video, AI, Education tools - அனைத்தும் ஒரே இடத்தில், இலவசமாக.">\n<meta property="og:type" content="website">'
))

edits.append((
"      ['\N{ELECTRIC LIGHT BULB} What\\'s New', ()=> { try{ localStorage.removeItem('pdfToolsDiscoverShown_v5'); }catch(e){} maybeShowDiscoverModal(true); }],",
"      ['\N{ELECTRIC LIGHT BULB} What\\'s New', ()=> { try{ localStorage.removeItem('pdfToolsDiscoverShown_v6'); }catch(e){} maybeShowDiscoverModal(true); }],"
))

edits.append((
"    try{ shown = localStorage.getItem('pdfToolsDiscoverShown_v5'); }catch(e){}",
"    try{ shown = localStorage.getItem('pdfToolsDiscoverShown_v6'); }catch(e){}"
))

old_block = (
    "  try{ localStorage.setItem('pdfToolsDiscoverShown_v5','1'); }catch(e){}\n"
    "  const overlay = el(`<div style=\"position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px;\"></div>`);\n"
    "  const cards = [\n"
    "    ['\N{SPARKLES} NEW', '112+ tools, all in one place', 'PDF, Image, Video, Business/GST, Education, and Games \N{EM DASH} merge, split, compress, OCR, watermark, invoicing, and much more.', '\N{TOOLBOX}'],"
)

new_block = (
    "  try{ localStorage.setItem('pdfToolsDiscoverShown_v6','1'); }catch(e){}\n"
    "  const overlay = el(`<div style=\"position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px;\"></div>`);\n"
    "  const cards = [\n"
    "    ['\N{SQUARED NEW} NEW', '8 new PDF tools just added', 'PDF \N{RIGHTWARDS ARROW} PNG, PDF \N{LEFT RIGHT ARROW} PowerPoint, OCR \N{RIGHTWARDS ARROW} Searchable PDF, Extract Pages, Flatten PDF, Repair PDF, and PDF Metadata Remover \N{EM DASH} all free.', '\N{PAGE FACING UP}'],\n"
    "    ['\N{SPARKLES} NEW', '122+ tools, all in one place', 'PDF, Image, Video, Business/GST, Education, and Games \N{EM DASH} merge, split, compress, OCR, watermark, invoicing, and much more.', '\N{TOOLBOX}'],"
)

edits.append((old_block, new_block))

applied, skipped, missing = 0, 0, 0
for old, new in edits:
    if new in c:
        skipped += 1
    elif old in c:
        c = c.replace(old, new, 1)
        applied += 1
    else:
        print("WARNING: pattern not found, check manually:\n", old[:150])
        missing += 1

with open('index.source.html', 'w', encoding='utf-8') as f:
    f.write(c)

print(f"Applied {applied}, already-present {skipped}, missing {missing}")
if missing:
    sys.exit(1)
