Self-hosted copies of the libraries the PDF tools need for Tamil text, so documents still work when a public CDN
is slow or blocked:
  fontkit.umd.min.js        @pdf-lib/fontkit 1.1.1 (MIT)  — embeds and shapes the Tamil font in PDFs
  regenerator-runtime.js    regenerator-runtime (MIT)     — fontkit 1.1.1 needs this global; without it Tamil PDFs fail
../fonts/NotoSansTamil.ttf  Noto Sans Tamil (SIL OFL 1.1, see ../fonts/OFL-noto-sans-tamil.txt)
  qrcode-generator.js       qrcode-generator 1.4.4 (MIT, Kazuhiko Arase) — draws QR codes for UPI / website / contact on invoices and business cards
