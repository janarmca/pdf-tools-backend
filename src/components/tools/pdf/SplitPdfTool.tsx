import React, { useState } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { splitPdf, downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { FileText, Loader2, Scissors } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface SplitPdfToolProps {
  lang: AppLanguage;
}

export const SplitPdfTool: React.FC<SplitPdfToolProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageInput, setPageInput] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitBytes, setSplitBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError(lang === 'ta' ? 'PDF கோப்பை மட்டுமே தேர்ந்தெடுக்கவும்.' : 'Please select a PDF file.');
      return;
    }
    setError(null);
    setFile(selected);

    try {
      const buffer = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const count = doc.getPageCount();
      setTotalPages(count);
      setPageInput(count > 1 ? `1-${Math.min(count, 2)}` : '1');
    } catch (e: any) {
      setError(lang === 'ta' ? 'PDF பக்கங்களை படிக்க முடியவில்லை.' : 'Failed to read PDF page count.');
    }
  };

  const parsePageNumbers = (input: string, max: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(',').map((p) => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const high = Math.max(start, end);
          for (let i = min; i <= high; i++) {
            if (i >= 1 && i <= max) pages.add(i);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= max) {
          pages.add(p);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    if (!file || totalPages === 0) return;

    const selectedPages = parsePageNumbers(pageInput, totalPages);
    if (selectedPages.length === 0) {
      setError(
        lang === 'ta'
          ? `சரியான பக்க எண்களை உள்ளிடவும் (1 முதல் ${totalPages} வரை).`
          : `Please specify valid page numbers (1 to ${totalPages}).`
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const result = await splitPdf(file, selectedPages);
      setSplitBytes(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to extract PDF pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!splitBytes) return;
    const baseName = file?.name.replace(/\.[^/.]+$/, '') || 'document';
    downloadFile(splitBytes, `${baseName}-extracted.pdf`, 'application/pdf');
  };

  const handleReset = () => {
    setFile(null);
    setTotalPages(0);
    setSplitBytes(null);
    setError(null);
  };

  if (splitBytes) {
    return (
      <DownloadSuccessModal
        toolName="Split PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={`${totalPages} pages processed`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="application/pdf"
          multiple={false}
          title={
            lang === 'ta'
              ? 'பிரிக்க வேண்டிய PDF கோப்பை இங்கே தேர்ந்தெடுக்கவும்'
              : 'Select or drop a PDF file to split'
          }
          lang={lang}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E8EC]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8894A]/10 text-[#E8894A] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20242B]">{file.name}</div>
                <div className="text-xs text-[#566070]">
                  {totalPages} {lang === 'ta' ? 'பக்கங்கள்' : 'pages'} • {(file.size / 1024).toFixed(0)} KB
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="text-xs text-[#3752A6] font-bold hover:underline">
              {lang === 'ta' ? 'வேறு கோப்பு' : 'Change File'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#20242B] mb-1.5">
              {lang === 'ta'
                ? `பிரித்தெடுக்க வேண்டிய பக்கங்கள் (1 முதல் ${totalPages} வரை)`
                : `Pages to Extract (1 to ${totalPages})`}
            </label>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder="e.g. 1, 3-5, 8"
              className="w-full px-4 py-2.5 bg-[#F8FAFF] border border-[#CBD6F2] focus:border-[#3752A6] rounded-xl text-sm font-bold text-[#20242B] outline-none"
            />
            <p className="text-[11px] text-[#566070] mt-1.5">
              {lang === 'ta'
                ? 'குறிப்பிட்ட பக்கங்கள்: 1, 3 அல்லது தொடர் பக்கங்கள்: 2-5 என உள்ளிடலாம்.'
                : 'Example: 1, 3 or ranges like 2-5. Commas and hyphens supported.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSplit}
            disabled={isProcessing}
            className="w-full bg-[#E8894A] hover:bg-[#C96A2C] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'பிரித்தெடுக்கப்படுகிறது...' : 'Extracting Pages...'}
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                {lang === 'ta' ? 'பக்கங்களை பிரித்தெடுத்து பதிவிறக்கு' : 'Extract & Download Pages'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
