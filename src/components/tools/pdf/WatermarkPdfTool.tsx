import React, { useState } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { addWatermarkToPdf, downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { Droplet, Loader2, FileText } from 'lucide-react';

interface WatermarkPdfToolProps {
  lang: AppLanguage;
}

export const WatermarkPdfTool: React.FC<WatermarkPdfToolProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError(lang === 'ta' ? 'PDF கோப்பை மட்டுமே தேர்ந்தெடுக்கவும்.' : 'Please choose a PDF file.');
      return;
    }
    setError(null);
    setFile(f);
    setResultBytes(null);
  };

  const handleApply = async () => {
    if (!file || !text.trim()) return;
    try {
      setIsProcessing(true);
      setError(null);
      const bytes = await addWatermarkToPdf(file, text.trim(), opacity);
      setResultBytes(bytes);
    } catch (err: any) {
      setError(err?.message || 'Failed to apply watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBytes) return;
    const baseName = file?.name.replace(/\.[^/.]+$/, '') || 'document';
    downloadFile(resultBytes, `${baseName}-watermarked.pdf`, 'application/pdf');
  };

  const handleReset = () => {
    setFile(null);
    setResultBytes(null);
    setError(null);
  };

  if (resultBytes) {
    return (
      <DownloadSuccessModal
        toolName="Add Watermark"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={`Watermark "${text}" stamped on all pages`}
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
              ? 'வாட்டர்மார்க் சேர்க்க வேண்டிய PDF கோப்பை தேர்ந்தெடுக்கவும்'
              : 'Select PDF to add watermark'
          }
          lang={lang}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E8EC]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2980B9]/10 text-[#2980B9] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20242B]">{file.name}</div>
                <div className="text-xs text-[#566070]">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
            <button onClick={handleReset} className="text-xs text-[#3752A6] font-bold hover:underline">
              {lang === 'ta' ? 'வேறு கோப்பு' : 'Change File'}
            </button>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[#566070] mb-1 font-bold">
                வாட்டர்மார்க் வாசகம் / Watermark Text:
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL / DO NOT COPY / DRAFT"
                className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-3 font-bold text-sm text-[#20242B]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#566070]">வெளிப்படைத் தன்மை / Opacity:</span>
                <span className="font-mono text-[#3752A6] font-bold">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#2980B9]"
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={isProcessing || !text.trim()}
            className="w-full bg-[#2980B9] hover:bg-[#1C638E] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'வாட்டர்மார்க் சேர்க்கப்படுகிறது...' : 'Applying Watermark...'}
              </>
            ) : (
              <>
                <Droplet className="w-5 h-5" />
                {lang === 'ta' ? 'வாட்டர்மார்க் சேர்த்து பதிவிறக்கு' : 'Apply Watermark & Download'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
