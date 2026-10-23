import React, { useState } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { mergePdfFiles, downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { ArrowUp, ArrowDown, Trash2, FileText, Loader2 } from 'lucide-react';

interface MergePdfToolProps {
  lang: AppLanguage;
}

export const MergePdfTool: React.FC<MergePdfToolProps> = ({ lang }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedBytes, setMergedBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (newFiles: File[]) => {
    const pdfOnly = newFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfOnly.length < newFiles.length) {
      setError(
        lang === 'ta'
          ? 'PDF கோப்புகளை மட்டுமே தேர்ந்தெடுக்கவும்.'
          : 'Please select PDF files only.'
      );
    } else {
      setError(null);
    }
    setFiles((prev) => [...prev, ...pdfOnly]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError(
        lang === 'ta'
          ? 'இணைக்க குறைந்தபட்சம் 2 PDF கோப்புகளைத் தேர்ந்தெடுக்கவும்.'
          : 'Please select at least 2 PDF files to merge.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const result = await mergePdfFiles(files);
      setMergedBytes(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to merge PDF files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!mergedBytes) return;
    downloadFile(mergedBytes, 'merged-document.pdf', 'application/pdf');
  };

  const handleReset = () => {
    setFiles([]);
    setMergedBytes(null);
    setError(null);
  };

  if (mergedBytes) {
    const sizeInMb = (mergedBytes.byteLength / (1024 * 1024)).toFixed(2);
    return (
      <DownloadSuccessModal
        toolName="Merge PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={`Size: ${sizeInMb} MB`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DropZone
        onFilesSelected={handleFiles}
        accept="application/pdf"
        multiple={true}
        title={
          lang === 'ta'
            ? 'இணைக்க வேண்டிய PDF கோப்புகளை இங்கே சேர்க்கவும்'
            : 'Select or drop PDF files to merge'
        }
        lang={lang}
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-extrabold text-sm text-[#20242B]">
              {lang === 'ta'
                ? `தேர்ந்தெடுக்கப்பட்ட கோப்புகள் (${files.length}) — வரிசையை மாற்றலாம்`
                : `Selected Files (${files.length}) — Arrange order`}
            </h4>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              {lang === 'ta' ? 'அனைத்தையும் நீக்கு' : 'Clear All'}
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between bg-[#F8FAFF] border border-[#E6E8EC] rounded-xl p-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[#3752A6] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {idx + 1}
                  </span>
                  <FileText className="w-4 h-4 text-[#3752A6] shrink-0" />
                  <span className="font-bold text-[#20242B] truncate">{file.name}</span>
                  <span className="text-[#566070] shrink-0">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-white text-[#3752A6] disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === files.length - 1}
                    className="p-1 rounded hover:bg-white text-[#3752A6] disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 rounded hover:bg-white text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleMerge}
            disabled={files.length < 2 || isProcessing}
            className="w-full mt-5 bg-[#3752A6] hover:bg-[#28407F] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'இணைக்கப்படுகிறது...' : 'Merging PDFs...'}
              </>
            ) : (
              <>
                <span>🧩</span>
                {lang === 'ta'
                  ? `${files.length} கோப்புகளையும் ஒன்றாக இணை`
                  : `Merge ${files.length} PDFs into One`}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
