import React, { useState } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { imagesToPdf, downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { Image, ArrowUp, ArrowDown, Trash2, Loader2, Sparkles } from 'lucide-react';

interface ImageToPdfToolProps {
  lang: AppLanguage;
}

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = ({ lang }) => {
  const [images, setImages] = useState<{ file: File; previewUrl: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/'));
    if (valid.length < files.length) {
      setError(lang === 'ta' ? 'படங்களை மட்டுமே தேர்ந்தெடுக்கவும் (JPG, PNG).' : 'Please choose image files (JPG, PNG).');
    } else {
      setError(null);
    }

    const newItems = valid.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));

    setImages((prev) => [...prev, ...newItems]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  const removeImg = (idx: number) => {
    URL.revokeObjectURL(images[idx].previewUrl);
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    try {
      setIsProcessing(true);
      setError(null);
      const filesOnly = images.map((i) => i.file);
      const bytes = await imagesToPdf(filesOnly);
      setPdfBytes(bytes);
    } catch (err: any) {
      setError(err?.message || 'Failed to convert images to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBytes) return;
    downloadFile(pdfBytes, 'photos-converted.pdf', 'application/pdf');
  };

  const handleReset = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setPdfBytes(null);
    setError(null);
  };

  if (pdfBytes) {
    return (
      <DownloadSuccessModal
        toolName="Image to PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={`${images.length} images converted into 1 PDF`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DropZone
        onFilesSelected={handleFiles}
        accept="image/*"
        multiple={true}
        title={
          lang === 'ta'
            ? 'PDF-ஆக மாற்ற வேண்டிய புகைப்படங்களை இங்கே சேர்க்கவும்'
            : 'Select or drop images to convert to PDF'
        }
        subTitle={
          lang === 'ta'
            ? 'JPG, PNG மற்றும் WEBP படங்களை சேர்க்கலாம்'
            : 'Supports multiple JPG, PNG, and WEBP photos'
        }
        lang={lang}
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-[#20242B]">
              {lang === 'ta'
                ? `புகைப்படங்கள் (${images.length}) — வரிசைப்படி PDF ஆகும்`
                : `Photos (${images.length}) — Arranged in page order`}
            </h4>
            <button onClick={handleReset} className="text-xs text-red-600 font-bold hover:underline">
              {lang === 'ta' ? 'அனைத்தும் நீக்கு' : 'Clear All'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((item, idx) => (
              <div
                key={item.previewUrl}
                className="group relative border border-[#E6E8EC] rounded-xl overflow-hidden bg-[#F8FAFF] flex flex-col"
              >
                <div className="relative aspect-4/3 bg-black/5 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.previewUrl}
                    alt={`Preview ${idx + 1}`}
                    className="object-contain w-full h-full"
                  />
                  <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/75 text-white text-[11px] font-extrabold flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <div className="p-2 flex items-center justify-between text-xs border-t border-[#E6E8EC]">
                  <span className="font-bold text-[#20242B] truncate max-w-[90px]">
                    {item.file.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-[#3752A6] hover:bg-white rounded disabled:opacity-20"
                      title="Move backward"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === images.length - 1}
                      className="p-1 text-[#3752A6] hover:bg-white rounded disabled:opacity-20"
                      title="Move forward"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeImg(idx)}
                      className="p-1 text-red-600 hover:bg-white rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="w-full bg-[#2E86C1] hover:bg-[#206899] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'PDF ஆக்கப்படுகிறது...' : 'Generating PDF...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {lang === 'ta'
                  ? `${images.length} படங்களை ஒரே PDF-ஆக மாற்று`
                  : `Convert ${images.length} Images to Single PDF`}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
