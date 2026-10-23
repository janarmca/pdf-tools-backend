import { PDFDocument, rgb, degrees } from 'pdf-lib';

export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

export async function splitPdf(file: File, pageNumbers: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newPdf = await PDFDocument.create();

  const totalPages = sourcePdf.getPageCount();
  // Filter valid 1-based page numbers and convert to 0-based
  const validZeroIndices = pageNumbers
    .filter((p) => p >= 1 && p <= totalPages)
    .map((p) => p - 1);

  if (validZeroIndices.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  const copiedPages = await newPdf.copyPages(sourcePdf, validZeroIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

export async function imagesToPdf(imageFiles: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const buffer = await file.arrayBuffer();
    let embeddedImg;

    if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
      embeddedImg = await pdfDoc.embedJpg(buffer);
    } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      embeddedImg = await pdfDoc.embedPng(buffer);
    } else {
      // Fallback: draw on canvas to png
      embeddedImg = await convertImageToEmbeddedPng(file, pdfDoc);
    }

    const { width, height } = embeddedImg;
    // Standard A4 aspect: 595.28 x 841.89 pt
    const a4W = 595.28;
    const a4H = 841.89;

    // Scale to fit A4 page with margins
    const margin = 20;
    const availW = a4W - margin * 2;
    const availH = a4H - margin * 2;
    const scale = Math.min(availW / width, availH / height, 1);

    const drawW = width * scale;
    const drawH = height * scale;

    const page = pdfDoc.addPage([a4W, a4H]);
    const x = (a4W - drawW) / 2;
    const y = (a4H - drawH) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  return await pdfDoc.save();
}

async function convertImageToEmbeddedPng(file: File, pdfDoc: PDFDocument) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise((res) => { img.onload = res; });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0);

  const pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  const pngBuf = await pngBlob.arrayBuffer();
  return await pdfDoc.embedPng(pngBuf);
}

export async function addWatermarkToPdf(
  file: File,
  watermarkText: string,
  opacity: number = 0.3
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = Math.max(24, Math.min(width, height) / 10);

    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 2,
      size: fontSize,
      opacity: Math.max(0.05, Math.min(1, opacity)),
      rotate: degrees(45),
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return await pdfDoc.save();
}

export function downloadFile(
  data: Uint8Array | Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
) {
  const blob =
    data instanceof Blob
      ? data
      : typeof data === 'string'
      ? new Blob([data], { type: mimeType })
      : new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getWhatsAppShareUrl(toolName: string): string {
  const text = encodeURIComponent(
    `இலவச PDF, ஆவண மற்றும் தமிழ் கருவிகள் (PDF Tools India): ${toolName} பயன்படுத்தலாம்! 100% இலவசம், பாதுகாப்பானது:\nhttps://pdftoolsindia.com/`
  );
  return `https://wa.me/?text=${text}`;
}
