// Hand-written search content for the tools people actually search for.
// generate-tool-pages.mjs merges this into the generated /tools/<slug> pages.
export const SEO_EXTRA = {
  dscbulk: {
    title: 'Bulk Form 16 / Form 130 Signature Check Free — Verify Many Signed PDFs or TRACES ZIP | PDF Tools India',
    desc: 'Check the digital signature of many Form 16, Form 130 or other signed PDFs, or a whole TRACES ZIP, in your browser. See which are signed, valid or broken, and download a CSV. Files never leave your device.',
    intro: 'Deductors and accountants often receive Form 16 / Form 130 certificates as a ZIP from TRACES. Drop the ZIP (or many PDFs) here and get a list showing which certificates carry a digital signature, which signatures are intact and which were broken by editing or re-saving. The check runs in your browser; nothing is uploaded.',
    steps: ['Open Bulk Form 16 / 130 Signature Check.', 'Drop the PDFs or the TRACES ZIP.', 'Read the status list: valid, check, broken or unsigned.', 'Download the CSV for your records and re-download any broken certificate from TRACES.'],
    uses: ['Checking a batch of Form 16 / Form 130 before sending to employees', 'Finding certificates broken by compression or re-saving', 'Auditing signed PDFs received from a client', 'Keeping a CSV record of signer and certificate validity'],
    faqs: [['Is the ZIP uploaded?', 'No. It is opened inside your browser.'], ['Does an unsigned certificate mean it is invalid?', 'Not necessarily. The Income Tax Department says a TDS certificate downloaded from TRACES may be signed digitally or manually. An unsigned PDF is just listed as unsigned.'], ['Does a green tick prove the Income Tax Department accepts it?', 'It proves the signature is mathematically intact and the content unchanged. Revocation and official trust checks cannot be done offline.']]
  },
  pantan: {
    title: 'PAN TAN Validator Free — Check PAN and TAN Format in Bulk Online | PDF Tools India',
    desc: 'Paste many PAN or TAN numbers and see wrong formats, holder type and duplicates instantly. Free, runs in your browser, nothing uploaded. Catch mistakes before a TDS return.',
    intro: 'A PAN has 5 letters, 4 digits and 1 letter; the fourth letter shows the holder type (P individual, C company, F firm, H HUF and so on). A TAN has 4 letters, 5 digits and 1 letter. Paste a list, even a column copied from Excel, and every number is checked and explained. Download the result as CSV.',
    steps: ['Paste PAN / TAN numbers, one per line.', 'Read the result table: format OK, wrong, duplicate.', 'Fix the numbers marked wrong; letter O versus digit 0 mistakes are pointed out.', 'Download the CSV or copy the valid list.'],
    uses: ['Cleaning a deductee list before a TDS return', 'Finding O/0 and I/1 typing mistakes', 'Spotting duplicate PANs in a vendor list', 'Telling a company PAN from an individual PAN'],
    faqs: [['Does this confirm that a PAN exists?', 'No. It checks the format only. To confirm a PAN exists and belongs to a name, use Verify PAN on the Income Tax e-filing portal or TRACES.'], ['Is my list uploaded?', 'No. It is checked inside your browser.']]
  },
  tdsdates: {
    title: 'TDS Due Date Calendar FY 2026-27 — TDS Deposit and Return Dates (Form 138, 140, 24Q, 26Q) | PDF Tools India',
    desc: 'TDS payment dates and quarterly return due dates for any financial year, under the new Income-tax Act 2025 (Form 138, 140, 144, 130) and the old Act (24Q, 26Q, 27Q, 16). Free, from official FAQs.',
    intro: 'Pick a financial year and see the TDS deposit date for every month (7th of the next month, 30 April for March), the four quarterly return due dates (31 July, 31 October, 31 January, 31 May) and the annual certificate date (15 June). The tool uses the new form numbers for periods from 1 April 2026 and the old ones before that.',
    steps: ['Open TDS Due Date Calendar.', 'Choose the financial year.', 'Check the next dates card and the tables.', 'Confirm on TRACES if CBDT has extended a date.'],
    uses: ['Planning monthly TDS deposits', 'Knowing which quarter return is next', 'Finding the Form 130 / Form 16 issue date', 'Checking which form number applies to which period'],
    faqs: [['Which forms replace 24Q and 26Q?', 'Form 138 replaces 24Q (salary), Form 140 replaces 26Q (non-salary) and Form 144 replaces 27Q for payments from 1 April 2026.'], ['Are these dates ever extended?', 'CBDT sometimes extends dates. This tool shows the statutory dates; check TRACES or the e-filing portal for notices.']]
  },
  tdslatefee: {
    title: 'TDS Late Filing Fee Calculator — ₹200 per Day (Section 427 / 234E) | PDF Tools India',
    desc: 'Work out the late fee for a delayed quarterly TDS statement: ₹200 for every day, limited to the TDS amount, under section 427 of the Income-tax Act 2025 (earlier 234E). Free.',
    intro: 'Pick the financial year and quarter, enter the total TDS for that quarter and the date the statement is (or will be) filed. The tool counts the days after the due date, multiplies by ₹200 and limits the fee to the TDS amount, as in section 427 of the Income-tax Act 2025 (section 234E before 2026-27). The fee must be paid before the statement is filed. Interest and the section 271H penalty are not included.',
    steps: ['Choose the financial year and the quarter.', 'Enter the total TDS for the quarter.', 'Enter the filing date.', 'Compare the result with the amount shown on TRACES.'],
    uses: ['Knowing the fee before filing a late TDS statement', 'Checking a TRACES default notice', 'Planning cash for a late filing'],
    faqs: [['What is the late fee per day?', '₹200 for every day the failure continues, never more than the tax deductible.'], ['Is the penalty included?', 'No. A section 271H penalty of ₹10,000 to ₹1,00,000 may be levied separately; it is not calculated here.']]
  },
  tdsinterest: {
    title: 'TDS Late Payment Interest Calculator — 1% and 1.5% per Month (Section 398) | PDF Tools India',
    desc: 'Calculate interest on TDS not deducted or deducted late (1% per month) and TDS deducted but deposited late (1.5% per month). Counts month or part of a month. Free, many challans, CSV.',
    intro: 'Enter the TDS amount and the dates to get the interest for late deduction (1% per month or part of a month) or late deposit (1.5% per month or part of a month), as in section 398(3)(a) of the Income-tax Act 2025. Add many challans and download a CSV. The figure is an estimate; the TRACES Justification Report is final.',
    steps: ['Choose the case: not deducted / late deducted, or deducted but deposited late.', 'Enter the TDS amount and the two dates.', 'Add more rows for more challans.', 'Compare the total with your TRACES Justification Report.'],
    uses: ['Working out interest before paying a TDS challan', 'Estimating the cost of a late deposit', 'Explaining a TRACES default notice', 'Keeping a CSV of interest worked out'],
    faqs: [['Is a part of a month counted as a full month?', 'Yes, the interest is for every month or part of a month.'], ['Does it include the late filing fee?', 'No. The late fee and penalty are not included.']]
  },
  dscverify: {
    title: 'DSC Signature Verifier Free — Check Digital Signature in PDF Online (Form 16, TRACES, e-Sign) | PDF Tools India',
    desc: 'Check the digital signature (DSC / Aadhaar e-Sign / Adobe) of any PDF free in your browser: who signed, whether the PDF was changed after signing, certificate validity and Indian CA chain. No upload, no signup.',
    intro: 'Upload a signed PDF such as Form 16, a TRACES certificate, a GST or e-filing document, or an Aadhaar e-Sign PDF. The tool reads the signature inside the file and tells you in plain language whether the signature is intact, whether the content was changed after signing, who signed it, when the certificate is valid and which CA issued it. The file stays on your device.',
    steps: ['Open DSC / e-Sign Verifier and drop the signed PDF.', 'Read the green, yellow or red result at the top.', 'Open each signature card for the signer, issuer, validity dates and certificate chain.', 'If it says the document changed after signing, download the original again from the source website and upload that without editing.'],
    uses: ['Checking a Form 16 or TRACES PDF before filing', 'Finding out why a portal says signature invalid', 'Confirming an e-Signed agreement was not edited', 'Checking whether a DSC certificate had expired when the PDF was signed'],
    faqs: [['Is my PDF uploaded?', 'No. The check runs inside your browser and the file never leaves your device.'], ['Does a green tick mean the government portal will accept it?', 'It means the signature is mathematically intact and the signed content is unchanged. Certificate revocation (OCSP/CRL) and the official trust list cannot be checked offline, so for an official verdict also open the file in Adobe Acrobat Reader.'], ['Can this tool sign a PDF with my USB DSC token?', 'No. A browser cannot access a USB token by itself; signing needs your token driver and your CA signer utility. See DSC Token Help for fixes.'], ['Why did my signature become invalid?', 'Any edit, compression, merge, rotate, print-to-PDF or re-save after signing breaks a digital signature. Make all changes first and sign last.']]
  },
  dscguide: {
    title: 'DSC Token Not Working? Fix DSC USB Token, emSigner and Signature Invalid Problems | PDF Tools India',
    desc: 'Step-by-step help for DSC USB token not detected, emSigner or Java not connecting, signature invalid after editing a PDF, expired certificate and Aadhaar e-Sign questions.',
    intro: 'A short checklist for the most common DSC problems: token not detected, PIN locked, signer utility not connecting, certificate expired or signature invalid on TRACES, GST and e-filing uploads. It also explains what this site can and cannot do: it verifies signatures and warns you before you break one, but signing with a USB token needs your token driver and CA utility.',
    steps: ['Check that the token driver from your CA is installed and the token shows in its manager.', 'Make sure the signer utility (for example emSigner) is running and not blocked by antivirus.', 'Keep the system date and time correct and use an up-to-date Chrome or Edge.', 'Never edit or compress a PDF after signing; verify it with the DSC Verifier.'],
    uses: ['DSC token not detected in the browser', 'Signer utility not connecting', 'Signature invalid after compressing a PDF', 'Understanding Aadhaar e-Sign vs USB DSC'],
    faqs: [['Do I still need Java for DSC?', 'Most government portals no longer use the old Java applet; they use a small utility on your computer. Follow the current instructions on the portal you are using.'], ['Can you remove the need for the signer utility?', 'No. A website cannot read a USB token without software on your computer; that is a browser security rule.'], ['Can I compress a signed PDF?', 'Compressing rewrites the file and breaks the signature. Compress before signing instead.']]
  },
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
  remove: {
    title: 'Delete Pages from PDF Free — Remove Unwanted PDF Pages Online | PDF Tools India',
    desc: 'Remove blank, wrong or confidential pages from a PDF free online. Pick the pages, download the cleaned file. No signup, runs in your browser.',
    intro: 'Take pages out of a PDF without re-creating the whole document. Choose the pages you do not want, and the rest stay in their original order. (தேவையற்ற பக்கங்களை PDF-லிருந்து நீக்கலாம்.)',
    steps: ['Open Delete Pages and choose your PDF.', 'Select the pages to remove.', 'Click delete and download the new PDF.', 'Open it once to confirm the right pages are gone.'],
    uses: ['Removing a blank last page from a scan', 'Dropping a cover page or advertisement before sending a file', 'Taking out pages that contain private details', 'Trimming a long document to the pages an office asked for'],
    faqs: [['Does it change the original file?', 'No. Your original PDF is untouched; you download a new file.'], ['Can I undo a delete?', 'Download is a new file, so just run the tool again on your original PDF.']]
  },
  organize: {
    title: 'Reorder PDF Pages Free — Rearrange PDF Pages Online | PDF Tools India',
    desc: 'Drag PDF pages into a new order and download the rearranged file. Free, no signup, files stay in your browser.',
    intro: 'Fix a scan that came out in the wrong order, or move a page to the front. Drag the page thumbnails into the sequence you want and save a new PDF.',
    steps: ['Open Reorder Pages and choose your PDF.', 'Drag pages into the order you want.', 'Save and download the rearranged PDF.'],
    uses: ['Correcting pages scanned in the wrong order', 'Moving a signed page to the end', 'Putting certificates in the order an application asks for', 'Rearranging a presentation exported as PDF'],
    faqs: [['Will page quality change?', 'No. Pages are only moved, not recompressed.'], ['Can I also delete or rotate pages?', 'Yes — PDF Tools India has separate Delete Pages and Rotate Pages tools you can use before or after.']]
  },
  extractpages: {
    title: 'Extract Pages from PDF Free — Save Selected Pages as a New PDF | PDF Tools India',
    desc: 'Pick specific pages from a PDF and save them as one new PDF. Free, no signup, nothing is uploaded.',
    intro: 'When you only need a few pages of a large PDF, extract them into a new, smaller file instead of sending the whole document.',
    steps: ['Open Extract Pages and choose your PDF.', 'Select the pages you want to keep.', 'Download the new PDF that contains only those pages.'],
    uses: ['Sending only the relevant pages of a long contract', 'Saving one certificate out of a combined scan', 'Making a small PDF to fit an upload limit', 'Sharing a single chapter of a book PDF you own'],
    faqs: [['How is this different from Split PDF?', 'Extract Pages gathers chosen pages into one new PDF. Split PDF is for cutting a document into separate parts.'], ['Is my file uploaded?', 'No, the work happens in your browser.']]
  },
  rotate: {
    title: 'Rotate PDF Pages Free — Turn PDF 90, 180 or 270 Degrees | PDF Tools India',
    desc: 'Rotate PDF pages by 90, 180 or 270 degrees and save the fixed file. Free, no signup, runs in your browser.',
    intro: 'Sideways or upside-down scans are common when a phone camera or scanner app is used. Rotate the pages and save a PDF that opens the right way up.',
    steps: ['Open Rotate Pages and choose your PDF.', 'Pick 90, 180 or 270 degrees.', 'Download the corrected PDF.'],
    uses: ['Fixing a scan that opens sideways', 'Turning landscape pages to portrait for printing', 'Correcting a document photographed upside down'],
    faqs: [['Does rotating reduce quality?', 'No. Only the page orientation changes.'], ['Does it work on a signed PDF?', 'Rotating rewrites the file, which can invalidate a digital signature. Use the original signed file when a signature must stay valid.']]
  },
  watermark: {
    title: 'Add Watermark to PDF Free — Text Watermark on Every Page | PDF Tools India',
    desc: 'Stamp text such as CONFIDENTIAL or DRAFT across every page of a PDF. Free, no signup, runs in your browser.',
    intro: 'Mark a document so everyone knows its status before you share it. Type the text and it is stamped across every page.',
    steps: ['Open Add Watermark and choose your PDF.', 'Type the watermark text.', 'Apply it and download the marked PDF.'],
    uses: ['Marking a file DRAFT or COPY', 'Adding the recipient name to a confidential document', 'Showing "For application only" on a shared ID copy', 'Branding a document with your business name'],
    faqs: [['Can the watermark be removed later?', 'A watermark added with this tool becomes part of the page. Keep your original file if you may need a clean copy.'], ['Can I use an image logo?', 'Yes, PDF Tools India also has a separate Logo Watermark on PDF tool.']]
  },
  pagenum: {
    title: 'Add Page Numbers to PDF Free — Number PDF Pages Online | PDF Tools India',
    desc: 'Automatically number every page of a PDF and download the result. Free, no signup, runs in your browser.',
    intro: 'Add page numbers to assignments, reports or legal bundles that have none, so readers and offices can refer to a page exactly.',
    steps: ['Open Add Page Numbers and choose your PDF.', 'Choose how the numbers should appear.', 'Download the numbered PDF.'],
    uses: ['Numbering a project report or thesis', 'Preparing a bundle of documents for a court or office', 'Numbering merged certificates for an application'],
    faqs: [['Can I start numbering from a later page?', 'Use the options shown in the tool before you apply the numbers.'], ['Is my file uploaded?', 'No, it is processed in your browser.']]
  },
  pdfprotect: {
    title: 'Protect PDF with Password Free — Lock a PDF Online | PDF Tools India',
    desc: 'Add a password to a PDF so only people who know it can open the file. Free, no signup, done in your browser.',
    intro: 'Lock a PDF before you send it by email or WhatsApp. Choose a password, share it separately, and only the right person can open the document.',
    steps: ['Open Protect PDF and choose your file.', 'Type a password you will remember.', 'Download the locked PDF and test opening it.'],
    uses: ['Sending salary slips, bank statements or ID copies', 'Sharing medical or legal papers', 'Protecting a resume or business proposal'],
    faqs: [['What if I forget the password?', 'Keep it safe. A forgotten password cannot be recovered by this tool, so keep your original unlocked file.'], ['Is the PDF sent to a server?', 'No. The password is added inside your browser.']]
  },
  pdfunlock: {
    title: 'Unlock PDF — Remove PDF Password Free When You Know It | PDF Tools India',
    desc: 'Remove password protection from your own PDF when you know the current password. Free, no signup, runs in your browser.',
    intro: 'If you are tired of typing the same password every time you open a PDF you own, enter it once and save an unlocked copy.',
    steps: ['Open Unlock PDF and choose the locked file.', 'Enter the current password.', 'Download the unlocked PDF.'],
    uses: ['Saving a bank or salary statement without a password for your own records', 'Preparing a PDF to merge or edit', 'Removing a password you set yourself and no longer need'],
    faqs: [['Can it unlock a PDF without the password?', 'This tool needs the current password. Use it only on files you own or are allowed to open.'], ['Is the password stored?', 'No. It is used inside your browser and not sent anywhere.']]
  },
  pdfeditor: {
    title: 'Free PDF Text Editor Online — Add Text, Images, Shapes and Signature | PDF Tools India',
    desc: 'Edit a PDF online: add text, images, signatures and shapes. Core editing is free, no signup, runs in your browser.',
    intro: 'Fill in a form, add a line of text, place a signature or draw a shape on a PDF without installing software.',
    steps: ['Open PDF Editor and choose your PDF.', 'Pick text, image, signature or shape and place it on the page.', 'Download the edited PDF.'],
    uses: ['Filling a printed-style form on a phone', 'Adding a signature or stamp image', 'Writing a note on a document before returning it', 'Covering a small area with a shape'],
    faqs: [['Is this a free online PDF text editor?', 'Yes — you can add new text anywhere on a page, plus images, shapes and a signature, free and in your browser. It writes on top of the page; it does not rewrite the original text inside the PDF.'], ['Can I change the existing text of a scanned PDF?', 'This editor adds new text, images and shapes on top of pages. Scanned pages are pictures, so their original text is not editable.'], ['Is the editing free?', 'Core editing is free.']]
  },
  pdfocrsearchable: {
    title: 'OCR PDF to Searchable PDF Free — Make Scans Searchable | PDF Tools India',
    desc: 'Add an invisible text layer to a scanned PDF so you can search and copy its text. Free, runs in your browser.',
    intro: 'A scanned PDF is just pictures. This tool reads the text in those pictures and adds it as an invisible layer, so the file looks the same but can be searched and copied.',
    steps: ['Open OCR PDF and choose your scanned PDF.', 'Start the text recognition and wait for it to finish.', 'Download the searchable PDF and try searching a word.'],
    uses: ['Searching a long scanned document', 'Copying text out of a scanned certificate or letter', 'Making old records easier to find on your computer'],
    faqs: [['How accurate is it?', 'Accuracy depends on how clear and straight the scan is. Always check important numbers and names.'], ['Is the scan uploaded?', 'No. Recognition happens in your browser, so large scans can take time on a phone.']]
  },
  pdf2img: {
    title: 'PDF to JPG Free — Convert Every PDF Page to Image | PDF Tools India',
    desc: 'Turn each page of a PDF into a JPG image. Free, no signup, runs in your browser.',
    intro: 'Convert PDF pages into pictures you can share on WhatsApp, insert into a presentation or upload where only images are accepted.',
    steps: ['Open PDF to Image and choose your PDF.', 'Convert the pages.', 'Download the images.'],
    uses: ['Sharing one page as a picture on WhatsApp', 'Putting a PDF page into a slide or document', 'Uploading a page to a form that accepts only JPG'],
    faqs: [['Do I get one image per page?', 'Yes, every page becomes a separate image.'], ['Is the PDF uploaded?', 'No, conversion happens on your device.']]
  },
  pdfgray: {
    title: 'PDF to Grayscale Free — Convert PDF to Black and White | PDF Tools India',
    desc: 'Convert a colour PDF to grayscale or black and white to save ink and reduce size. Free, runs in your browser.',
    intro: 'Printing a colour PDF in black and white wastes ink on colours you will not see. Convert it first and print a cleaner copy.',
    steps: ['Open PDF to Grayscale and choose your file.', 'Convert to grayscale.', 'Download and check the result before printing.'],
    uses: ['Printing documents cheaply', 'Making scanned pages look more uniform', 'Preparing a form for photocopying'],
    faqs: [['Will the text stay readable?', 'Usually yes, but light coloured text can become faint. Preview before printing.'], ['Does it make the file smaller?', 'It can, but it is not a compression tool. Use Compress PDF for size limits.']]
  },
  pdfredact: {
    title: 'Redact PDF Free — Permanently Black Out and Remove Text | PDF Tools India',
    desc: 'Black out sensitive text in a PDF and remove it from the file, not just cover it. Free, runs in your browser.',
    intro: 'Hiding text with a black box is not enough if the text is still in the file underneath. Redaction blacks out the area and removes the text so it cannot be copied back out.',
    steps: ['Open Redact PDF and choose your file.', 'Mark the text or areas to hide.', 'Apply the redaction and download the new PDF.', 'Try selecting the hidden area to confirm nothing can be copied.'],
    uses: ['Hiding Aadhaar, PAN or account numbers before sharing a document', 'Removing names from a document for a case study', 'Protecting private details on a statement'],
    faqs: [['Is redaction reversible?', 'The redacted copy is permanent, so keep your original file separately.'], ['Does it work on scanned pages?', 'Scanned pages are pictures; check the result carefully and keep the original safe.']]
  },
  videotrim: {
    title: 'Video Trimmer — Cut Video Online for Free (MP4, MOV, WEBM) | PDF Tools India',
    desc: 'Cut or trim a video online: drag the handles on the timeline, keep or remove a part, add fade in/out. Free, no signup, nothing is uploaded.',
    intro: 'Trim the start and end of a video, cut a clip out of the middle, or remove a part you do not want — right in your browser, with a visual timeline.',
    steps: ['Open Trim / Cut Video and choose your video.', 'Drag the two handles (or type the times) to select the part.', 'Pick Keep or Remove, then press Cut & download.'],
    uses: ['Trimming a long recording to the part you need', 'Cutting a clip for WhatsApp status or Reels', 'Removing a mistake from the middle of a video', 'Adding a smooth fade at the start and end'],
    faqs: [['Is my video uploaded anywhere?', 'No. The cut happens inside your browser, so the video never leaves your device.'], ['What is the difference between Exact and Fast?', 'Exact re-encodes and cuts at the precise frame. Fast copies the video without re-encoding, which is instant and lossless, but it may start a little earlier at the nearest key-frame.'], ['Which formats work?', 'MP4, MOV, WEBM and other formats your browser can open. The result is saved as MP4 (or the same format when you use Fast).']]
  },
  videocrop: {
    title: 'Crop Video Online Free — Square, 9:16, 16:9 | PDF Tools India',
    desc: 'Crop a video online: drag a box on the picture or pick a ratio (1:1, 9:16, 16:9, 4:5). Free, no signup, runs in your browser.',
    intro: 'Keep only the part of the picture you want — turn a wide video into a square or vertical one for Instagram, Reels and Shorts.',
    steps: ['Open Crop Video and choose your video.', 'Pick a ratio or drag the yellow box and its corners.', 'Press Crop & download.'],
    uses: ['Making a vertical 9:16 video from a landscape one', 'Square 1:1 crop for Instagram posts', 'Cutting away black bars or an unwanted corner'],
    faqs: [['Does cropping lower the quality?', 'The video is re-encoded at good quality. The picture inside the box keeps its original pixels; the output is simply smaller in size.'], ['Is my video uploaded?', 'No, everything runs in your browser.']]
  },
  videoresize: {
    title: 'Resize Video Online Free — 1080p, 720p, Reels, Shorts | PDF Tools India',
    desc: 'Change the size (resolution) of a video for YouTube, Shorts, Reels, Instagram or a smaller file. Free, no signup, runs in your browser.',
    intro: 'Pick a ready size — 1080p, 720p, 480p, vertical 9:16, square, 4:5 — or type your own width and height.',
    steps: ['Open Resize Video and choose your video.', 'Pick a size and, for a new shape, Fit / Fill / Stretch.', 'Press Resize & download.'],
    uses: ['Making a video smaller to share on WhatsApp', 'Fitting a landscape video into a 9:16 Reels frame with bars', 'Exporting a 720p copy for a slow connection'],
    faqs: [['What do Fit, Fill and Stretch mean?', 'Fit keeps the whole picture and adds black bars. Fill crops the edges so the frame is fully covered. Stretch squeezes the picture to the new shape.'], ['Will making the video bigger improve quality?', 'No. A larger size only enlarges the same pixels; the tool warns you when the new size is larger than the original.']]
  },
  screenrec: {
    title: 'Free Online Screen Recorder — Record Screen with Sound | PDF Tools India',
    desc: 'Record your computer screen, a window or a browser tab with sound, free in your browser. Save as WebM or convert to MP4.',
    intro: 'Record what is on your screen — a tutorial, a meeting window or a browser tab — with system sound and/or your voice. Nothing is uploaded.',
    steps: ['Open Screen Recorder and press Start recording.', 'Choose the screen, window or tab to share.', 'Press Stop & save, then download (WebM or MP4).'],
    uses: ['Recording a how-to for students or customers', 'Capturing a browser tab with its sound', 'Saving a presentation with your voice-over'],
    faqs: [['Does it work on a phone?', 'No. Phone browsers do not let websites record the screen. Use Chrome, Edge or Firefox on a computer, or your phone\'s built-in screen recorder.'], ['Can I record the sound?', 'Yes. Tick the sound option and, in Chrome, tick “Share tab audio” / “Share system audio” in the box that appears. You can also add your microphone.']]
  },
  audiocut: {
    title: "Audio Cutter & Ringtone Maker — Cut MP3 Online Free | PDF Tools India",
    desc: "Cut an MP3 or any audio on its waveform: keep or remove a part, fade in/out, save as MP3, WAV or OGG. Free, no signup, nothing is uploaded.",
    intro: "Make a ringtone, cut a song intro, or remove a mistake from a recording — drag the two handles on the waveform and save.",
    steps: ["Open Audio Cutter and choose a song, recording or video.", "Drag the handles (or type the times) and pick Keep or Remove.", "Choose MP3 / WAV and press Cut & download."],
    uses: ["Making a 30-second ringtone", "Cutting the silence at the start of a recording", "Taking one song out of a long audio file"],
    faqs: [["Can I cut audio from a video?", "Yes. Choose the video file; the tool uses its sound."], ["Is my file uploaded?", "No. Everything happens in your browser."]]
  },
  audioconvert: {
    title: "Audio Converter Online Free — MP3, WAV, M4A, OGG | PDF Tools India",
    desc: "Convert audio to MP3, WAV, M4A or OGG in your browser — many files at once, optional mono and even volume. Free, no signup.",
    intro: "Change WAV, M4A, AAC, OGG, FLAC or a video's sound into MP3 (or the other way round) without installing anything.",
    steps: ["Open Audio Converter and add one or more files.", "Pick the format and quality.", "Press Convert & download."],
    uses: ["WAV to MP3 to save space", "M4A voice notes to MP3", "Making a voice recording mono and evenly loud"],
    faqs: [["Which formats can I make?", "MP3 and WAV always; M4A and OGG when your browser supports them (the menu shows only what works)."], ["Is there a file limit?", "Files up to about 400 MB each."]]
  },
  videotomp3: {
    title: "Video to MP3 Converter Online Free — Extract Audio from MP4 | PDF Tools India",
    desc: "Take the sound out of an MP4, MOV or WEBM video as MP3, WAV or M4A. Free, in your browser, nothing is uploaded.",
    intro: "Save the song, speech or class audio from a video so you can listen to it like music.",
    steps: ["Open Video to MP3 and choose one or more videos.", "Pick MP3 (or WAV) and the quality.", "Press Convert & download."],
    uses: ["Saving a lecture video as audio", "Keeping a song from your own video", "Smaller files to share on WhatsApp"],
    faqs: [["Does it work with phone videos?", "Yes — MP4 and MOV from phones work."], ["Is the video uploaded?", "No, it stays on your device."]]
  },
  audiomerge: {
    title: "Merge Audio Files Online Free — Join MP3 Songs | PDF Tools India",
    desc: "Join MP3, WAV, M4A or OGG files one after another, with silence between or a smooth cross-fade. Free, in your browser.",
    intro: "Put several songs or recordings together into one file — choose the order, add a gap or cross-fade.",
    steps: ["Open Merge Audio and add the files.", "Set the order with the arrows and pick back-to-back, silence or cross-fade.", "Press Join & download."],
    uses: ["A song medley for a function", "Joining several voice recordings", "Adding an intro before a speech"],
    faqs: [["Can I mix different formats?", "Yes, MP3, WAV, M4A, OGG and video sound can be joined together."]]
  },
  audioeffects: {
    title: "Audio Volume Booster & Effects Online Free — Louder, Bass, Speed | PDF Tools India",
    desc: "Make audio louder or softer, normalise, change speed, boost bass or treble, fade, reverse and remove low hum — free in your browser.",
    intro: "Fix a quiet recording or give a song more bass, then save as MP3 or WAV.",
    steps: ["Open Audio Volume & Effects and choose a file.", "Move the sliders and tick the options; press Preview to listen.", "Press Apply & download."],
    uses: ["Making a quiet phone recording louder", "Bass boost for a song", "Removing fan or AC hum"],
    faqs: [["Does changing speed change the pitch?", "Yes — like a faster tape, a higher speed also raises the pitch."]]
  },
  voicerec: {
    title: "Online Voice Recorder Free — Record and Save as MP3 | PDF Tools India",
    desc: "Record your voice with the microphone and save it as MP3 or WAV. Free, works on phones and computers, nothing is uploaded.",
    intro: "A simple microphone recorder with a level meter, pause and noise reduction.",
    steps: ["Open Voice Recorder and press Start recording.", "Allow the microphone; speak; press Stop.", "Listen, then save as MP3 or WAV."],
    uses: ["Voice notes and dictation", "Recording a speech or song practice", "Making a voice-over for a video"],
    faqs: [["Is the recording stored online?", "No, it stays on your device until you download it."]]
  },
  imgblur: {
    title: "Blur or Hide Part of a Photo Online Free — Mask Aadhaar, Face | PDF Tools India",
    desc: "Pixelate, blur or black-out any part of a photo — mask an Aadhaar or PAN number, a face, a number plate or an address. Free, in your browser.",
    intro: "Before sharing a photo or ID copy, hide what others should not see. Drag a box, choose pixelate, blur or a solid box, and save.",
    steps: ["Open the tool and choose the photo.", "Drag boxes over what must be hidden and pick the style.", "Press Download."],
    uses: ["Masked Aadhaar copy (hide the first 8 digits)", "Hiding faces of children before posting", "Covering a vehicle number plate or address"],
    faqs: [["Can the hidden part be recovered?", "No — the saved copy contains only the pixelated / blurred / filled pixels."], ["Is my photo uploaded?", "No. It never leaves your device."]]
  },
  imgsplit: {
    title: "Split Image into Grid Online Free — Instagram 3×3 Grid Maker | PDF Tools India",
    desc: "Cut a picture into 1×2, 1×3, 2×3 or 3×3 tiles for an Instagram carousel or profile grid, downloaded as one ZIP. Free, in your browser.",
    intro: "Make a seamless carousel or a big picture across your profile grid by cutting one image into equal tiles.",
    steps: ["Open the tool and choose a picture.", "Pick the grid and square tiles.", "Download the ZIP of tiles."],
    uses: ["Instagram 3×3 profile puzzle", "Panorama carousel in 3 slides", "Printing a big poster on A4 sheets"],
    faqs: [["In which order do I post the tiles?", "For a profile grid, post from the last number to the first so they line up."]]
  },
  imgsketch: {
    title: "Photo to Sketch & Cartoon Online Free — Pencil, Comic, Oil, Watercolour | PDF Tools India",
    desc: "Turn a photo into a pencil sketch, colour pencil, charcoal, line art, cartoon, comic, oil painting, watercolour, pop art, neon or pixel art — 14 free styles in your browser.",
    intro: "Pick a style, move the sliders and compare with the original before you download. Made by image-processing code on your device — no AI, no upload, no credits.",
    steps: ["Open Photo → Sketch & Art and choose a photo.", "Tap a style and adjust Detail, Colours and Line thickness.", "Download JPG or PNG."],
    uses: ["Pencil sketch of a family photo", "Cartoon profile picture", "Comic-style poster image", "Watercolour greeting card"],
    faqs: [["Is it free?", "Yes — all 14 styles are free and work offline after the page loads."], ["How is it different from AI Photo Style?", "These styles are filters on your own photo. AI Photo Style re-draws the picture with an AI model (5 credits)."]]
  },
  aistyle: {
    title: "AI Photo Style — Convert Photo to Anime, 3D Cartoon, Tanjore Painting | PDF Tools India",
    desc: "Turn your photo into anime, 3D cartoon, comic, watercolour, oil painting, Tanjore painting, clay or caricature with an AI image model. 5 credits per picture.",
    intro: "An AI image model re-draws your photo in the style you choose while keeping the faces, pose and clothes. Add an extra wish in Tamil or English.",
    steps: ["Sign in and open AI Photo Style.", "Choose a photo and a style (anime, 3D, Tanjore…).", "Press Make AI picture and download."],
    uses: ["Anime profile picture", "3D cartoon of your child", "Tanjore-style family portrait", "Sticker of your pet"],
    faqs: [["How much does it cost?", "5 credits per picture; if the AI fails the credits are refunded automatically."], ["Is my photo kept?", "It is sent to the AI service only to make the picture; we do not store it."]]
  },
  texttospeech: {
    title: "Text to Speech in Tamil — Free Online TTS to MP3 | PDF Tools India",
    desc: "Type Tamil, English, Hindi or 100+ languages and get a natural AI voice as MP3 or WAV. Listen free in the browser; downloads cost 2 credits per 1,000 characters.",
    intro: "Make a voice-over for a video, an announcement or a lesson — pick a voice and a style (calm, cheerful, news reader, story telling).",
    steps: ["Open Text to Speech and type or paste the text.", "Choose a voice and style; press Listen free to try.", "Press Make voice file and download MP3."],
    uses: ["Voice-over for YouTube / Reels", "Announcement for a shop or school", "Reading a lesson aloud for students"],
    faqs: [["Does it speak Tamil properly?", "Yes — the AI voice reads Tamil script. The free preview uses your phone’s own voice, which may not have Tamil."], ["How much does it cost?", "2 credits per 1,000 characters (minimum 2), refunded if it fails."]]
  },
  audiopitch: {
    title: "Change Pitch or Speed of Audio Online Free — Without Chipmunk Effect | PDF Tools India",
    desc: "Make a voice higher or lower without changing speed, or change speed without changing the voice. Free, in your browser.",
    intro: "Uses a time-stretch method (WSOLA) so slowing a song for practice keeps its tune, and a pitch change keeps the timing.",
    steps: ["Open the tool and choose a file.", "Move Speed and/or Pitch; press Preview.", "Press Apply & download."],
    uses: ["Slowing a song to learn it", "Funny cartoon voice", "Deeper voice for a narration"],
    faqs: [["Can I change only the pitch?", "Yes — leave Speed at 1.00× and move Pitch."]]
  },
  audioeq: {
    title: "Audio Equalizer Online Free — Bass Boost, Voice Clarity | PDF Tools India",
    desc: "10-band equaliser with presets (bass boost, voice clarity, podcast, treble, telephone). Free, in your browser.",
    intro: "Shape the sound of a song or a recording and save it as MP3 or WAV — with a limiter so boosts do not crackle.",
    steps: ["Open Audio Equalizer and choose a file.", "Pick a preset or move the 10 sliders.", "Apply & download."],
    uses: ["Bass boost for a song", "Clearer voice in a phone recording", "Podcast sound"],
    faqs: [["Will boosting cause distortion?", "A built-in limiter stops the sound from clipping."]]
  },
  vocalremove: {
    title: "Vocal Remover Online Free — Make Karaoke from a Song | PDF Tools India",
    desc: "Remove the singer from a stereo song or music video to make a karaoke track, or keep a rough vocals-only track. Free, in your browser.",
    intro: "Uses centre-channel cancellation with the bass kept — works on studio songs where the voice is in the centre.",
    steps: ["Open Vocal Remover and choose a song or video.", "Choose Remove vocals or Keep vocals.", "Process & download (MP3, WAV or video)."],
    uses: ["Karaoke for a function", "Practising a song", "Instrumental for a video"],
    faqs: [["Does it work on every song?", "Best on stereo studio songs; mono recordings or live recordings cannot be separated without AI."]]
  },
  audiodenoise: {
    title: "Reduce Background Noise from Audio & Video Online Free | PDF Tools India",
    desc: "Lower fan, AC hum, hiss and traffic noise in a voice recording or a video. Free, in your browser.",
    intro: "Learns the noise from the quietest moments and reduces it everywhere; can save the result back into the video.",
    steps: ["Open Reduce Noise and choose a recording or video.", "Set the strength; press Preview.", "Clean & download."],
    uses: ["Online class recording", "Phone video with fan noise", "Voice-over cleanup"],
    faqs: [["Can it remove music or talking behind me?", "No — it removes steady noise (fan, hiss, hum). Changing sounds need AI separation."]]
  },
  videochroma: {
    title: "Remove Green Screen from Video Online Free — Chroma Key | PDF Tools India",
    desc: "Remove a green or blue background from a video and put a colour or your own picture behind it. Free, in your browser.",
    intro: "Tap the background colour on the picture, adjust how much to remove, choose the new background, download MP4.",
    steps: ["Open Remove Green Screen and choose the video.", "Tap the green background and adjust the sliders.", "Pick a colour or picture and download."],
    uses: ["YouTube intro with a new background", "Product video on a white background", "Fun videos with a picture behind"],
    faqs: [["Does it need a real green screen?", "Yes — an even green or blue background gives the cleanest edges."]]
  },
  txt2pdf: {
    title: 'Text to PDF Free Online — Convert TXT or Typed Text to PDF | PDF Tools India',
    desc: 'Turn a .txt file or text you type into a PDF. Free, no signup, runs in your browser.',
    intro: 'Make a clean PDF from plain text such as notes, a letter draft or log output, ready to print or share.',
    steps: ['Open Text to PDF.', 'Type or paste text, or choose a .txt file.', 'Download the PDF.'],
    uses: ['Turning notes into a shareable file', 'Saving a copied message as a document', 'Preparing text for printing'],
    faqs: [['Does it support Tamil text?', 'Tamil text typed in Unicode can be added; check the preview before downloading.'], ['Is my text stored?', 'No, it stays on your device.']]
  },
  excel2pdf: {
    title: 'Excel to PDF Free — Convert XLSX to PDF Online | PDF Tools India',
    desc: 'Convert an .xlsx spreadsheet to a PDF you can print or share. Free, no signup, runs in your browser.',
    intro: 'Share a spreadsheet as a fixed-layout PDF so the recipient cannot accidentally change the numbers.',
    steps: ['Open Excel to PDF and choose your .xlsx file.', 'Convert the sheet.', 'Download the PDF and check page breaks.'],
    uses: ['Sending a price list or marks sheet', 'Printing a report from Excel without Excel installed', 'Sharing a statement that should not be edited'],
    faqs: [['Are formulas kept?', 'The PDF shows the values, not the formulas.'], ['Will wide sheets fit one page?', 'Very wide sheets may split across pages; check the preview.']]
  },
  imgpassport: {
    title: 'Passport Size Photo Maker Free — Photo, Background and 4-up Print Sheet | PDF Tools India',
    desc: 'Make a standard-size passport or ID photo with a plain background and a print sheet with four copies. Free, runs in your browser.',
    intro: 'Create passport or ID photos at home. Choose the size, set a plain background and get a sheet with four photos you can print on one page. (பாஸ்போர்ட் அளவு புகைப்படம்.)',
    steps: ['Open Passport / ID Photo and choose a clear front-facing photo.', 'Pick the size and background colour.', 'Download the single photo or the 4-up print sheet.'],
    uses: ['Photos for ID cards, school and college forms', 'Preparing a print sheet to take to a shop', 'Fixing a photo with a messy background'],
    faqs: [['Which size should I choose?', 'Use the exact size written in your form or application; sizes differ between offices.'], ['Is my photo uploaded?', 'No, the photo is processed on your device.']]
  },
  examphoto: {
    title: 'Exam Photo and Signature Resizer — Resize to Exact KB and cm | PDF Tools India',
    desc: 'Resize your photo and signature to the exact file size in KB and dimensions in cm that an exam or job form asks for. Free, runs in your browser.',
    intro: 'Application portals reject photos that are even slightly too large. Enter the size limit from your notification and get a file that fits. (தேர்வு விண்ணப்பத்துக்கான புகைப்படம் / கையெழுத்து அளவு.)',
    steps: ['Read the photo and signature rules in your exam notification.', 'Open the resizer and choose your photo or signature.', 'Enter the required KB and size.', 'Download and upload the result on the portal.'],
    uses: ['Government exam and recruitment forms', 'College admission and scholarship portals', 'Passport-style uploads with a KB limit'],
    faqs: [['Does the tool know each exam\'s rules?', 'No. You enter the numbers from the official notification, so the result matches the current rule.'], ['Is my photo uploaded?', 'No, it is processed in your browser.']]
  },
  imgcompresskb: {
    title: 'Compress Image to Target KB Free — Reduce Photo to 20KB, 50KB, 100KB | PDF Tools India',
    desc: 'Shrink a JPG or PNG to the file size in KB that a form requires. Free, automatic quality search, runs in your browser.',
    intro: 'Forms often say "photo must be under 50 KB". Enter the number and the tool tries qualities automatically to get as close as possible without going over.',
    steps: ['Open Compress to Target KB and choose your image.', 'Enter the maximum size in KB.', 'Download the compressed image and check it still looks clear.'],
    uses: ['Job, exam and scholarship portals', 'Uploading photos to bank or insurance forms', 'Sending images on slow mobile data'],
    faqs: [['Can every image reach a very small size?', 'Very large photos squeezed to a tiny size will look blurry. Crop first if the result is poor.'], ['Is my image uploaded?', 'No, it is compressed in your browser.']]
  },
  imgconvert: {
    title: 'Convert Image Format Free — JPG, PNG and WEBP Converter | PDF Tools India',
    desc: 'Convert pictures between JPG, PNG and WEBP. Free, no signup, runs in your browser.',
    intro: 'Some websites accept only JPG, others only PNG. Convert in one step without any software.',
    steps: ['Open Convert Image Format and choose your image.', 'Select the format you need.', 'Download the converted image.'],
    uses: ['Uploading to a portal that accepts only JPG', 'Converting WEBP downloads to something your editor opens', 'Keeping transparency by choosing PNG'],
    faqs: [['Does JPG support transparency?', 'No. PNG and WEBP keep transparent areas; JPG fills them with a solid colour.'], ['Does the picture lose quality?', 'Converting to JPG is lossy; keep your original.']]
  },
  imgcrop: {
    title: 'Crop and Resize Image Free — Crop Photos Online | PDF Tools India',
    desc: 'Crop a region of a photo or change its size. Free, no signup, runs in your browser.',
    intro: 'Cut away what you do not need or set an exact size for a profile picture, form or document.',
    steps: ['Open Crop / Resize Image and choose your photo.', 'Drag to select the area, or enter a new size.', 'Download the result.'],
    uses: ['Profile pictures', 'Cropping a certificate or ID from a larger photo', 'Resizing for an upload form'],
    faqs: [['Will resizing change quality?', 'Making an image larger cannot add detail; making it smaller is safe.'], ['Is the photo uploaded?', 'No.']]
  },
  colorpicker: {
    title: 'Image Color Picker Free — Get Colour Codes from a Photo | PDF Tools India',
    desc: 'Pick any colour from an image and get its code, then build a palette. Free, runs in your browser.',
    intro: 'Click on any point of a picture to read its colour code. Useful for matching a brand colour, a website or a design.',
    steps: ['Open Color Picker and choose an image.', 'Click the colour you want.', 'Copy the colour code or build a palette.'],
    uses: ['Matching a logo colour on a website', 'Choosing colours for a poster', 'Finding the exact shade in a photo'],
    faqs: [['What format is the colour code?', 'The tool shows the colour so you can copy it in common web formats.'], ['Is my image uploaded?', 'No.']]
  },
  receipts: {
    title: 'Rent Receipt Generator for HRA — Free Rent, Fee and Money Receipts | PDF Tools India',
    desc: 'Make rent receipts (up to 12 months at once), tuition fee receipts, money receipts and payment vouchers in Tamil or English. Free PDF.',
    intro: 'Employees need rent receipts to claim HRA, schools and tuition centres need fee receipts, and shops need money receipts. Fill the details once and generate the PDF, with the amount written in words. (வாடகை ரசீது, கட்டண ரசீது.)',
    steps: ['Open Receipts & Vouchers and choose the type.', 'Enter names, amount and dates; for rent, pick the months.', 'Preview and download the PDF.', 'Sign and keep the printout; your details can be saved for next time.'],
    uses: ['Claiming HRA from an employer', 'Fee receipts for tuition or classes', 'Receipt for cash received', 'Payment voucher for small expenses'],
    faqs: [['Is a rent receipt enough for HRA?', 'Employers set their own proof rules; high rent usually also needs the landlord PAN. Check with your employer.'], ['Are my details stored online?', 'Saved details stay on your device.']]
  },
  quotepo: {
    title: 'GST Invoice, Quotation, Bill and Purchase Order Maker Free | PDF Tools India',
    desc: 'Create a GST tax invoice, quotation, proforma, cash bill, bill of supply, purchase order or delivery challan with correct IGST or CGST+SGST. Free PDF, Excel and Word.',
    intro: 'One tool for the business documents small shops and freelancers write every day. Enter the customer and items; the tool works out CGST+SGST or IGST, discounts and totals. (GST பில், மேற்கோள் படிவம்.)',
    steps: ['Open the tool and choose the document type.', 'Enter seller, customer and items with HSN and GST rate.', 'Check the totals, then download as PDF, Excel or Word, or share on WhatsApp.'],
    uses: ['Billing customers with GST', 'Sending a quotation before an order', 'Raising a purchase order to a supplier', 'Delivery challan for goods in transit'],
    faqs: [['Does it choose IGST or CGST+SGST automatically?', 'It uses the states you enter to apply the correct tax split.'], ['Is it a replacement for accounting software?', 'It creates documents; keep your accounts and GST returns in your accounting system.']]
  },
  resumebuilder: {
    title: 'Free Resume Builder — ATS-Friendly Resume in 4 Templates | PDF Tools India',
    desc: 'Build a resume with four templates, auto-saved details and an ATS-friendly layout. Free, no signup, runs in your browser.',
    intro: 'Fill your details once and see the resume update as you type. Your information is saved in your browser so you can come back and edit later. (ரெஸ்யூம் உருவாக்கி.)',
    steps: ['Open Resume Builder and choose a template.', 'Fill personal details, education, experience and skills.', 'Preview and download the PDF.'],
    uses: ['First job or campus placements', 'Government and private job applications', 'Updating an old resume quickly'],
    faqs: [['What does ATS-friendly mean?', 'A simple layout that recruiting software can read reliably — avoid heavy graphics.'], ['Is my information uploaded?', 'Your details are saved on your device.']]
  },
  salaryslip: {
    title: 'Salary Slip Generator Free — Payslip with PF, ESI and LOP | PDF Tools India',
    desc: 'Create a salary slip with LOP days, PF and ESI calculation, allowances and saved employees in Tamil or English. Free PDF.',
    intro: 'Small businesses can produce a clear payslip in minutes. Enter earnings and deductions; PF and ESI can be calculated, and loss-of-pay days are accounted for. (சம்பளச் சீட்டு.)',
    steps: ['Open Salary Slip Generator.', 'Enter employee, month, earnings and deductions.', 'Check PF / ESI and LOP amounts.', 'Download the PDF.'],
    uses: ['Monthly payslips for staff', 'Salary proof for loan or visa applications', 'Keeping employee records'],
    faqs: [['Are PF and ESI rates fixed?', 'Rates and wage limits change; verify them against current rules before issuing.'], ['Are employee details stored online?', 'Saved employees stay on your device.']]
  },
  leaveletter: {
    title: 'Leave Application Letter Generator — Tamil and English | PDF Tools India',
    desc: 'Write a leave letter for office, school or college in Tamil or English, including half-day leave. Free PDF.',
    intro: 'Choose who is writing (employee, student or parent), the reason and the dates, and the letter is written for you. (விடுப்புக் கடிதம்.)',
    steps: ['Open Leave Application Letter.', 'Choose the writer type, language and dates.', 'Edit the text if you wish and download the PDF.'],
    uses: ['Casual or sick leave at work', 'Student leave letters to a class teacher', 'Parent letters to a school', 'Half-day leave requests'],
    faqs: [['Can I change the wording?', 'Yes, edit the text before downloading.'], ['Is my letter stored?', 'No.']]
  },
  percentcalc: {
    title: 'Percentage Calculator — X% of Y, % Change and Increase/Decrease | PDF Tools India',
    desc: 'Find X percent of a number, what percent one number is of another, and percentage increase or decrease. Free.',
    intro: 'Quick percentages for marks, discounts, price changes and interest without opening a spreadsheet.',
    steps: ['Open Percentage Calculator.', 'Choose the type of question.', 'Enter the numbers and read the answer.'],
    uses: ['Marks and results', 'Discount and sale price checks', 'Salary or price hike percentage'],
    faqs: [['How is percentage change calculated?', '(new − old) ÷ old × 100.'], ['Is there a limit?', 'No.']]
  },
  rupeewords: {
    title: 'Amount in Words — Write Rupees in Tamil and English for Cheques and Invoices | PDF Tools India',
    desc: 'Convert any rupee amount into words in Tamil and English for cheques, invoices and receipts. Free.',
    intro: 'Cheques and receipts require the amount in words, and a mistake can cause rejection. Type the figure and copy the words. (ரூபாய் எழுத்தில்.)',
    steps: ['Open Amount in Words.', 'Type the amount in numbers.', 'Copy the Tamil or English words.'],
    uses: ['Writing cheques', 'Invoices and receipts', 'Legal papers'],
    faqs: [['Does it handle lakhs and crores?', 'Yes, using the Indian numbering system.'], ['Does it work offline?', 'It runs in your browser.']]
  },
  gstcalc: {
    title: 'GST Calculator — Add or Remove GST, CGST SGST Split | PDF Tools India',
    desc: 'Add GST to a price or remove it from a GST-inclusive price, at any rate you enter, with the CGST / SGST split. Free.',
    intro: 'Find the pre-tax price or the final price quickly. Enter the amount and the GST rate; you also see the CGST and SGST split. (ஜிஎஸ்டி கணிப்பான்.)',
    steps: ['Open GST Calculator.', 'Choose add or remove GST.', 'Enter the amount and rate.'],
    uses: ['Billing with GST', 'Checking a supplier invoice', 'Finding the base price from an inclusive price'],
    faqs: [['Which rate should I use?', 'Use the rate that applies to your goods or service under the current GST notification.'], ['Does it handle IGST?', 'IGST equals the total GST rate.']]
  },
  tamiltyping: {
    title: 'Tamil Typing Online — Type Tamil with English Letters | PDF Tools India',
    desc: 'Type Tamil by typing English letters (unakkaga → உனக்காக), with word suggestions, voice typing and Word/print export. Free.',
    intro: 'No Tamil keyboard needed. Type in English letters and the tool converts to Tamil as you go. Files are auto-saved on your device. (தமிழ் தட்டச்சு.)',
    steps: ['Open Tamil Typing.', 'Type words in English letters.', 'Pick suggestions or use voice typing.', 'Export to Word or print.'],
    uses: ['Letters and applications in Tamil', 'Student assignments', 'Social media posts'],
    faqs: [['Is it free?', 'Yes, no signup and no AI.'], ['Where are my files saved?', 'On your own device.']]
  },
  tamilfont: {
    title: 'Tamil Font Converter — Bamini to Unicode, TSCII, TAB and More | PDF Tools India',
    desc: 'Convert Bamini, TSCII, TAB, Anjal, Dinakaran and about 20 older Tamil fonts to Unicode and back. Free, runs in your browser.',
    intro: 'Old Tamil documents typed in legacy fonts show strange English letters elsewhere. Paste the text and convert it to Unicode so it displays everywhere. (பாமினி → யூனிகோட்.)',
    steps: ['Open Tamil Font Converter.', 'Choose the source font.', 'Paste your text and copy the converted result.'],
    uses: ['Converting old Word files', 'Using Tamil text on websites and WhatsApp', 'Searching old Tamil documents'],
    faqs: [['Can I convert back to Bamini?', 'Yes, conversion works in both directions.'], ['Is my text uploaded?', 'No.']]
  },
  readaloud: {
    title: 'Read Aloud — Listen to PDF or Text with Text-to-Speech | PDF Tools India',
    desc: 'Listen to a PDF or text read aloud using your device voice. Free, runs in your browser.',
    intro: 'Rest your eyes or revise while walking: the tool reads your document out loud using your device speech voice.',
    steps: ['Open Read Aloud.', 'Choose a PDF or paste text.', 'Press play and choose the voice.'],
    uses: ['Listening to notes before an exam', 'Proof-listening to your own writing', 'Reading support'],
    faqs: [['Is a Tamil voice available?', 'Voices come from your device, so availability depends on your phone or computer.'], ['Is my file uploaded?', 'No.']]
  },
  qrscan: {
    title: 'Scan QR Code from Image Free — Read QR Codes Online | PDF Tools India',
    desc: 'Read the QR code in a picture or screenshot and see the link or text it holds. Free, runs in your browser.',
    intro: 'Got a QR code as an image instead of seeing it on a poster? Upload the picture and read what it contains.',
    steps: ['Open Scan QR / Barcode.', 'Choose an image with a QR code.', 'Read the result.'],
    uses: ['Reading a QR from a screenshot', 'Checking a link before you open it', 'Recovering a Wi-Fi code'],
    faqs: [['Is it safe to open the link?', 'Check the web address first; do not open links you do not trust.'], ['Is my image uploaded?', 'No.']]
  },
  studytimer: {
    title: 'Study Timer — 25-Minute Pomodoro with Study Log | PDF Tools India',
    desc: 'Focus for 25 minutes, rest for 5, and keep a log of your study. Free Pomodoro timer.',
    intro: 'The Pomodoro method breaks study into short focused sessions with breaks. Start the timer and the tool keeps a study log. (படிப்பு நேரம்.)',
    steps: ['Open Study Timer.', 'Start a 25-minute focus session.', 'Rest for 5 minutes when it ends.'],
    uses: ['Exam preparation', 'Homework time', 'Office focus sessions'],
    faqs: [['Can I change the times?', 'Use the options shown in the tool.'], ['Is my log uploaded?', 'No, it stays on your device.']]
  },
  sipcalc: {
    title: 'SIP, FD and RD Calculator — Savings Growth Calculator | PDF Tools India',
    desc: 'See how monthly savings or a deposit can grow at a rate you enter, with an honest note on returns. Free.',
    intro: 'Enter the monthly amount or deposit, the years and an assumed rate to see the future value. Returns on investments are not guaranteed. (சேமிப்புக் கணிப்பான்.)',
    steps: ['Open SIP / FD / RD Calculator.', 'Choose SIP, FD or RD.', 'Enter amount, years and rate.'],
    uses: ['Planning savings goals', 'Comparing FD and RD', 'Understanding compounding'],
    faqs: [['Are returns guaranteed?', 'No. Market returns vary; use the rate only as an assumption.'], ['Is this financial advice?', 'No. Check with a qualified adviser before investing.']]
  }
};
export const PAGE_TITLES = {
  'tn-rent-agreement': ['Rent Agreement Format in Tamil (வாடகை ஒப்பந்தம்) — Free Tamil Nadu Draft', 'Free Tamil Nadu rent agreement format in Tamil or English (வீட்டு வாடகை ஒப்பந்தம்) following the TN Regulation of Rights and Responsibilities of Landlords and Tenants Act, 2017. Print-ready, no signup.'],
  'tn-sale-deed': ['Sale Deed Format in Tamil (கிரைய சாசனம்) — Free Tamil Nadu Draft', 'Free Tamil Nadu sale deed (கிரைய சாசனம்) draft in Tamil or English with vendor, purchaser, title history, payment and property schedule. Print-ready, no signup.'],
};
