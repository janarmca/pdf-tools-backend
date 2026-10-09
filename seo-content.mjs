// Hand-written search content for the tools people actually search for.
// generate-tool-pages.mjs merges this into the generated /tools/<slug> pages.
export const SEO_EXTRA = {
  img2excel: {
    title: 'Image to Excel Converter Free — Screenshot to .xlsx Online | PDF Tools India',
    desc: 'Convert a screenshot or photo of a table into an editable Excel (.xlsx) file free online. Fixes grid lines, dark mode and tilted photos, cleans numbers and dates. No signup, no AI, works in your browser.',
    intro: 'Turn a picture of a table into a real Excel sheet. Upload or paste (Ctrl+V) a screenshot of an Excel sheet, a bank statement, a bill or a photo of a printed table. The tool straightens tilted photos, removes grid lines that confuse text reading, fixes dark-mode and white-on-green headers, then places every value in the right row and column. Numbers (₹, %, 1,23,456.00), dates and text are recognised and written as proper Excel cells with a styled header, filters and optional TOTAL formulas.',
    steps: ['Open Image → Excel and drop a screenshot or photo of the table (or press Ctrl+V to paste).', 'Choose the language if it is not English, then tap Convert to Excel.', 'Check the preview: yellow cells are the ones to double-check; click any cell to correct it.', 'Download the .xlsx (or CSV), or copy the table straight into Excel or Google Sheets.'],
    uses: ['Moving a table from a screenshot or WhatsApp image into Excel', 'Bank statements, bills and price lists received as pictures', 'Printed marks lists, registers and invoices', 'Combining several screenshots into one sheet'],
    faqs: [['Is it free and private?', 'Yes. It runs in your browser with open-source text reading — no AI credits, no signup, and your image is never uploaded to a server.'], ['Will it be 100% exact?', 'Clear screenshots come out almost perfectly. Blurry photos can misread a few characters, so uncertain cells are highlighted yellow for a quick check before you download.'], ['Does it handle dates and Indian number format?', 'Yes. Dates like 01/10/2026 become real Excel dates (day-first or month-first, your choice) and amounts like 1,23,456.00 become numbers with Indian grouping.']]
  },
  bgremove: {
    title: 'Remove Background from Image Free — Online Background Remover | PDF Tools India',
    desc: 'Remove the background from any photo free online, then keep it transparent or swap in a colour or another photo. Works on mobile, no signup, no watermark.',
    intro: 'Upload a photo of a person, product or logo and the background is cut out automatically. You can download it with a transparent background, fill it with a solid colour (white for passport and ID photos, for example), or place the subject on another picture, then touch up the edges by hand if needed.',
    steps: ['Open the tool and choose a JPG, PNG or WEBP photo.', 'Wait a few seconds while the background is removed automatically.', 'Pick transparent, a solid colour or a new background photo, and fix any rough edges with the touch-up brush.', 'Download the result as a PNG.'],
    uses: ['Product photos for online shops and WhatsApp catalogues', 'White or blue background for passport, visa and ID photos', 'Profile pictures and thumbnails', 'Logos and signatures on transparent PNG'],
    faqs: [['Can I remove the background from a PDF?', 'Convert the PDF page to an image first with the PDF → Image tool, then remove its background here and, if you like, turn the result back into a PDF with Image → PDF.'], ['Does the result keep a transparent background?', 'Yes. Download the PNG and the background stays transparent, so you can place it on any slide, poster or document.']]
  },
  askai: {
    title: 'Ask PDF Questions with AI — Chat with Your Document | PDF Tools India',
    desc: 'Upload a PDF or document and ask questions in plain English or Tamil. AI finds the answer in your file. Pay only per question, 2 credits each.',
    intro: 'Instead of reading a 60-page document, upload it and ask what you need to know: "What is the notice period?", "Summarise clause 7", "What are the payment dates?". The AI answers using the contents of your file.',
    steps: ['Open the tool and add your PDF or document.', 'Type your question in English or Tamil.', 'Confirm the credit cost shown before it runs.', 'Read the answer and ask follow-up questions.'],
    uses: ['Contracts, rental agreements and loan documents', 'Study material and research papers', 'Long reports and government circulars', 'Bank and insurance policy documents'],
    faqs: [['Can the AI be wrong?', 'Yes. AI can misread a scanned or complicated page, so check important answers (amounts, dates, legal clauses) against the original document.']]
  },
  pdf2word: {
    title: 'PDF to Word Converter Free — Editable .docx Online | PDF Tools India',
    desc: 'Convert a PDF into an editable Word (.docx) file free online. No signup, no watermark, works on mobile and desktop, Tamil text supported.',
    intro: 'Turn a PDF into a Word document you can edit. Text, headings and paragraphs are carried across so you can correct, reformat and reuse the content.',
    steps: ['Open PDF → Word and choose your PDF.', 'Wait for the conversion to finish.', 'Download the .docx file and open it in Word, Google Docs or LibreOffice.'],
    uses: ['Editing a resume or letter you only have as a PDF', 'Reusing text from reports and forms', 'Correcting a document when the original file is lost'],
    faqs: [['Will the layout be identical?', 'Simple text documents convert very closely. Complex layouts with many columns, tables or images may need small manual adjustments in Word.'], ['What about scanned PDFs?', 'A scanned PDF is a picture of text. Use Image → Text (OCR) first to read the text, then paste it into Word.']]
  },
  merge: {
    title: 'Merge PDF Files Free — Combine PDFs into One Online | PDF Tools India',
    desc: 'Combine several PDF files into one document free online. Drag to reorder, no signup, no watermark, files stay in your browser.',
    intro: 'Join multiple PDFs into a single file in the order you choose. Useful for application forms, certificates, invoices and anything else that has to be sent as one document.',
    steps: ['Open Merge PDF and add two or more PDF files.', 'Arrange them in the order you want.', 'Click merge and download the combined PDF.'],
    uses: ['Job and college applications with several certificates', 'Combining scanned pages into one file', 'Bundling invoices or bank statements for a CA'],
    faqs: [['Is there a file size limit?', 'Because the work happens in your browser, the limit is your device memory. Very large files may be slow on older phones.'], ['Will the PDF quality drop?', 'No. Merging only joins the pages; it does not recompress them.']]
  },
  compress: {
    title: 'Compress PDF Free — Reduce PDF File Size Online | PDF Tools India',
    desc: 'Shrink a PDF to a smaller file size free online, ideal for email and WhatsApp upload limits. No signup, runs in your browser.',
    intro: 'Make a large PDF smaller so it fits an upload form, email or WhatsApp limit, while keeping it readable.',
    steps: ['Open Compress PDF and choose your file.', 'Select the compression level.', 'Download the smaller PDF and check that it is still clear.'],
    uses: ['Government and exam portals with a 100 KB or 1 MB limit', 'Sending documents on email or WhatsApp', 'Saving storage on your phone'],
    faqs: [['How small can a PDF get?', 'PDFs made of scanned photos shrink the most. A PDF that is already mostly text will not change much.']]
  },
  split: {
    title: 'Split PDF — Extract Pages from a PDF Free Online | PDF Tools India',
    desc: 'Pull selected pages out of a PDF into a new file, free online with no signup. Runs in your browser.',
    intro: 'Keep only the pages you need from a long PDF, for example one certificate out of a scanned bundle or a single chapter from a book.',
    steps: ['Open Split PDF and add the file.', 'Enter the pages you want, such as 1-3, 7.', 'Download the new PDF.'],
    uses: ['Sending only the relevant pages of a contract', 'Separating one document from a combined scan', 'Reducing a file before sharing'],
    faqs: [['Does the original file change?', 'No. Your original PDF is untouched; you download a new file.']]
  },
  img2pdf: {
    title: 'JPG to PDF — Convert Images to PDF Free Online | PDF Tools India',
    desc: 'Turn JPG and PNG photos into a single PDF free online. Reorder pages, no signup, works on mobile.',
    intro: 'Combine photos of documents, certificates or notes into one neat PDF straight from your phone gallery.',
    steps: ['Open Image → PDF and select your pictures.', 'Put them in order.', 'Download the PDF.'],
    uses: ['Photographed Aadhaar, PAN and certificates for an application', 'School notes and homework', 'Receipts for expense claims'],
    faqs: [['Can I add many images?', 'Yes, add as many pages as your device can handle.']]
  },
  imgcompress: {
    title: 'Compress Image Online Free — Reduce JPG & PNG Size | PDF Tools India',
    desc: 'Reduce JPG and PNG file size free online, no signup and no quality surprises. Runs in your browser.',
    intro: 'Make photos smaller for forms, websites and messaging while keeping them sharp enough to read.',
    steps: ['Open Compress Image and choose a photo.', 'Pick the quality level.', 'Compare, then download the smaller file.'],
    uses: ['Exam and job portal photo size limits', 'Faster website and blog images', 'Sending photos over slow mobile data'],
    faqs: [['Is my photo uploaded?', 'No. The compression happens in your browser, so the photo stays on your device.']]
  },
  word2pdf: {
    title: 'Word to PDF Converter Free — DOCX to PDF Online | PDF Tools India',
    desc: 'Convert a Word .docx file to PDF free online with fonts preserved. No signup, no watermark.',
    intro: 'Save a Word document as a PDF so it looks the same on every phone and computer.',
    steps: ['Open Word → PDF and choose your .docx file.', 'Wait for the conversion.', 'Download the PDF.'],
    uses: ['Resumes and cover letters', 'Letters, applications and invoices', 'Documents that must not be edited'],
    faqs: [['Are Tamil fonts kept?', 'Fonts are preserved in the converted PDF.']]
  },
  emicalc: {
    title: 'EMI Calculator — Home, Car & Personal Loan EMI with Schedule | PDF Tools India',
    desc: 'Calculate loan EMI, total interest and the full month-by-month repayment schedule for home, car and personal loans. Free, no signup.',
    intro: 'Enter the loan amount, annual interest rate and tenure to get the monthly EMI, the total interest you will pay and a full amortisation schedule showing principal and interest in each instalment.',
    steps: ['Enter the loan amount.', 'Enter the annual interest rate (reducing balance).', 'Choose the tenure in years or months.', 'Read the EMI, total interest and the schedule.'],
    uses: ['Comparing home loan offers from different banks', 'Checking whether a personal loan EMI fits your salary', 'Seeing how a part-prepayment cuts interest'],
    faqs: [['How is EMI calculated?', 'EMI = P × R × (1+R)^n ÷ [(1+R)^n − 1], where R is the monthly rate and n the number of months. Our guide "How is EMI calculated" walks through an example.']]
  },
  incometaxcalc: {
    title: 'Income Tax Calculator FY 2026-27 — Old vs New Regime | PDF Tools India',
    desc: 'Compare old and new income tax regimes for FY 2026-27 and see which one saves you more. Free, no signup.',
    intro: 'Enter your income and deductions to see the tax under both regimes side by side so you can choose the cheaper one before filing.',
    steps: ['Enter your annual income.', 'Add your deductions such as 80C, HRA and standard deduction.', 'Compare tax under the old and new regimes.'],
    uses: ['Salaried employees choosing a regime for TDS', 'Planning investments under 80C', 'Quick what-if checks before filing'],
    faqs: [['Is this official advice?', 'It is an estimate based on published slabs. Confirm with a chartered accountant or the income tax portal before filing.']]
  },
  pdfpwrecover: {
    title: 'Forgot PDF Password? Document Password Recovery for Your Own Files | PDF Tools India',
    desc: 'Locked out of your own PDF, Excel or Word file? Try common and weak passwords automatically, free in your browser.',
    intro: 'If you forgot the password of a file that belongs to you, this tool tries commonly used passwords automatically. It only works for weak passwords and only on your own documents.',
    steps: ['Open the tool and add your protected file.', 'Start the automatic attempt.', 'If a password is found it is shown so you can open the file.'],
    uses: ['Old bank statements or payslips you protected yourself', 'Excel or Word files whose password you forgot'],
    faqs: [['Will it always work?', 'No. Strong passwords cannot be recovered this way.'], ['Is it legal?', 'Use it only on files you own. Do not use it on documents belonging to other people.']]
  },
  qrgen: {
    title: 'QR Code Generator Free — Link, Text & Wi-Fi QR Online | PDF Tools India',
    desc: 'Create a QR code for a link, text or Wi-Fi network and download it as a PNG, free with no signup.',
    intro: 'Turn a website link, message or Wi-Fi login into a QR code you can print on a shop board, card or poster.',
    steps: ['Choose link, text or Wi-Fi.', 'Type the content.', 'Download the QR image.'],
    uses: ['Shop and menu boards', 'Business cards', 'Sharing Wi-Fi without typing a password'],
    faqs: [['Do these QR codes expire?', 'No. The code simply contains your text or link, so it works as long as that link does.']]
  },
  heic2jpg: {
    title: 'HEIC to JPG Converter Free — iPhone Photos to JPG/PNG | PDF Tools India',
    desc: 'Convert iPhone HEIC photos to JPG or PNG free in your browser. No upload, no signup.',
    intro: 'iPhone photos saved as HEIC will not open on many websites and Windows PCs. Convert them to JPG or PNG here.',
    steps: ['Open the tool and choose your HEIC photos.', 'Select JPG or PNG.', 'Download the converted pictures.'],
    uses: ['Uploading iPhone photos to government and job portals', 'Opening iPhone pictures on Windows'],
    faqs: [['Is anything uploaded?', 'No, the conversion runs in your browser.']]
  },
  ocr: {
    title: 'Image to Text (OCR) Free — Extract Tamil & English Text | PDF Tools India',
    desc: 'Extract text from photos and scans in 20+ languages including Tamil, free online with no signup.',
    intro: 'Take a photo of a page or upload a scan and copy out the text, in Tamil, English and many other languages.',
    steps: ['Open the tool and choose an image.', 'Pick the language.', 'Copy or download the recognised text.'],
    uses: ['Typing out printed Tamil documents', 'Making scanned PDFs searchable', 'Copying text from screenshots'],
    faqs: [['How accurate is it?', 'Clear, well-lit prints give the best results. Handwriting and blurry photos are less reliable, so proofread the output.']]
  },
  aitranslate: {
    title: 'Translate PDF & Documents with AI — Any Language to Tamil | PDF Tools India',
    desc: 'Upload a document in any language and get it translated into Tamil or English with AI. 2 credits per use.',
    intro: 'Read a letter, notice or agreement written in another language. The AI translates the document so you can understand it.',
    steps: ['Upload your document.', 'Choose the language you want.', 'Confirm the credit cost and read the translation.'],
    uses: ['Government orders and legal notices', 'Letters from other states or countries', 'Study material in another language'],
    faqs: [['Is the translation legally valid?', 'No. It is for understanding. Use a certified translator for legal or official purposes.']]
  },
  agecalc: {
    title: 'Age Calculator — Exact Age in Years, Months & Days | PDF Tools India',
    desc: 'Find your exact age in years, months and days, plus days left until your next birthday. Free and instant.',
    intro: 'Enter a date of birth to see exact age today, or any other date, useful for forms with a cut-off date.',
    steps: ['Enter the date of birth.', 'Optionally choose the date to calculate age on.', 'Read the result.'],
    uses: ['Age on the date of an exam or admission', 'Retirement and eligibility checks'],
    faqs: [['Can I check age on a past or future date?', 'Yes, choose the date to calculate against.']]
  },
  sign: {
    title: 'Sign PDF Online Free — Draw Your Signature on a PDF | PDF Tools India',
    desc: 'Draw your signature and place it on any PDF page free online. No signup, no watermark.',
    intro: 'Sign forms and agreements from your phone or computer without printing.',
    steps: ['Open Sign PDF and add the document.', 'Draw your signature.', 'Place it where you need it and download the signed PDF.'],
    uses: ['Rental and employment agreements', 'School and bank forms'],
    faqs: [['Is this a legally certified e-signature?', 'It places an image of your signature. For documents needing a certified digital signature, use a licensed provider.']]
  },
};
export const PAGE_TITLES = {
  'tn-rent-agreement': ['Rent Agreement Format in Tamil (வாடகை ஒப்பந்தம்) — Free Tamil Nadu Draft', 'Free Tamil Nadu rent agreement format in Tamil or English (வீட்டு வாடகை ஒப்பந்தம்) following the TN Regulation of Rights and Responsibilities of Landlords and Tenants Act, 2017. Print-ready, no signup.'],
  'tn-sale-deed': ['Sale Deed Format in Tamil (கிரைய சாசனம்) — Free Tamil Nadu Draft', 'Free Tamil Nadu sale deed (கிரைய சாசனம்) draft in Tamil or English with vendor, purchaser, title history, payment and property schedule. Print-ready, no signup.'],
};
