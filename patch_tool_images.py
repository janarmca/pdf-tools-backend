import sys

with open('generate-tool-images.mjs', encoding='utf-8') as f:
    c = f.read()

old = "  pdf2text: 'a woman copying plain text extracted from a PDF document on a laptop',\n  excel2word:"
new = """  pdf2text: 'a woman copying plain text extracted from a PDF document on a laptop',
  pdf2png: 'a man exporting every page of a PDF as separate image files on a laptop screen, thumbnails visible',
  extractpages: 'a woman pulling a few specific pages out of a long PDF document on a laptop, page thumbnails highlighted',
  pdfflatten: 'a man flattening an editable PDF form into a locked final document on a laptop screen',
  pdfrepair: 'a woman fixing a corrupted PDF file that would not open, laptop screen showing a repair progress bar',
  pdfmetaremove: 'a man clearing hidden author and title details from a PDF file on a laptop screen',
  pdfocrsearchable: 'a woman scanning an old paper document and watching it turn into searchable text on a laptop screen',
  pdf2ppt: 'a man turning PDF pages into presentation slides on a laptop screen',
  ppt2pdf: 'a woman exporting a PowerPoint presentation into a PDF document on a laptop screen',
  excel2word:"""

if new in c:
    print("Already present, skipped")
elif old in c:
    c = c.replace(old, new, 1)
    with open('generate-tool-images.mjs', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Applied 1")
else:
    print("WARNING: pattern not found, check manually")
    sys.exit(1)
