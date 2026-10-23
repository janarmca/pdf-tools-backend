# PDF Tools India — pdftoolsindia.com (React + Vite)

120+ free, privacy-first PDF, Image, Video, Business, Education and Tamil tools built for India. All tools execute client-side in the browser (Merge, Split, Watermark, Invoices, Receipts, Salary Slips, Exam Photo Resizer, Tamil Typing, Pomodoro Study Timer, Land Converter) with zero forced data upload and device-local privacy.

## Features & Architecture

- **Framework**: React 18 SPA built with Vite and Tailwind CSS.
- **Client-Side PDF Processing**: Browser-based PDF manipulation (merging, splitting, watermarking, images-to-PDF) powered by `pdf-lib`.
- **Tamil Language & Transliteration**:
  - Full Tamil and English UI with instant language toggle.
  - Tanglish phonetic transliteration (`vanakkam` -> `வணக்கம்`, `nandri` -> `நன்றி`).
  - Bamini/TSCII legacy fonts to modern Unicode converter.
  - Number to Words converter in both English and Tamil words (e.g. `1,25,000` -> `ஒரு லட்சத்து இருபத்தைந்தாயிரம் ரூபாய் மட்டும்`).
- **Business & Office Tools**:
  - GST Invoice, Quotation, Cash Bill & Purchase Order generator with state tax split (CGST+SGST or IGST), round-off, and print/PDF export.
  - Receipts & Vouchers (Rent receipt with landlord PAN for HRA proof, tuition fee, cash receipt, payment voucher).
  - Salary Slip (Monthly payslip with basic, HRA, PF 12%, ESI, professional tax, LOP deductions).
  - Formal Leave Application Letter generator in Tamil, English, and Bilingual format.
  - Income Tax Calculator comparing Old vs New Tax Regime side-by-side for FY 2026-27 with rebate u/s 87A.
  - EMI & Loan Repayment Calculator with amortization breakdown.
  - GST Calculator (Add/Remove GST with 5%, 12%, 18%, 28% slabs).
- **Exam & Image Tools**:
  - Exam Photo & Signature Resizer with presets for TNPSC, UPSC, SSC, IBPS, and NEET.
  - Image compressor with quality tuning and before/after size readout.
  - Image format converter (JPG ⇄ PNG ⇄ WEBP).
- **Audience Hubs**:
  - **Government Employees Hub**: DA/DR Arrears calculator, salary slip, leave letter, income tax comparison.
  - **Students Hub**: Pomodoro study timer, TNEA engineering cut-off calculator, exam photo resizer.
  - **Farmer Toolbox**: TNAU rice fertilizer dosage (Urea, DAP, MOP), knapsack spray ratio, and crop economics.
  - **Kalvi Kalanjiyam**: Classes 1–10 Samacheer syllabus quiz games and science/math concepts.
  - **Matrimony & Marriage Biodata**: Sri Chowdeshwari Thirumana Amaippagam and printable biodata maker.

## Development & Build

```bash
# Start development server on port 3000
npm run dev

# Compile TypeScript and build for production
npm run build

# Preview production build
npm run preview
```
