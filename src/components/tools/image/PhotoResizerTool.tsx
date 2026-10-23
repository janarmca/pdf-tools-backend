import React, { useState, useRef } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { Image as ImageIcon, Sliders, Loader2 } from 'lucide-react';

interface PhotoResizerToolProps {
  lang: AppLanguage;
}

export const PhotoResizerTool: React.FC<PhotoResizerToolProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetKb, setTargetKb] = useState<number>(50);
  const [widthPx, setWidthPx] = useState<number>(350);
  const [heightPx, setHeightPx] = useState<number>(450);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSizeText, setResultSizeText] = useState<string>('');

  const handleFile = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResultBlob(null);
  };

  const applyPreset = (preset: 'tnpsc_photo' | 'tnpsc_sign' | 'upsc_photo' | 'upsc_sign') => {
    switch (preset) {
      case 'tnpsc_photo':
        setTargetKb(50);
        setWidthPx(350);
        setHeightPx(450);
        break;
      case 'tnpsc_sign':
        setTargetKb(20);
        setWidthPx(350);
        setHeightPx(150);
        break;
      case 'upsc_photo':
        setTargetKb(100);
        setWidthPx(350);
        setHeightPx(450);
        break;
      case 'upsc_sign':
        setTargetKb(50);
        setWidthPx(350);
        setHeightPx(150);
        break;
    }
  };

  const handleResize = async () => {
    if (!file || !previewUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((res) => { img.onload = res; });

      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.drawImage(img, 0, 0, widthPx, heightPx);

      // Binary search for target KB quality
      let minQ = 0.05;
      let maxQ = 0.98;
      let bestBlob: Blob | null = null;
      const targetBytes = targetKb * 1024;

      for (let i = 0; i < 7; i++) {
        const midQ = (minQ + maxQ) / 2;
        const blob: Blob = await new Promise((res) =>
          canvas.toBlob((b) => res(b!), 'image/jpeg', midQ)
        );

        if (blob.size <= targetBytes) {
          bestBlob = blob;
          minQ = midQ; // try higher quality
        } else {
          maxQ = midQ; // reduce quality
        }
      }

      const finalBlob: Blob =
        bestBlob ||
        (await new Promise<Blob>((res) =>
          canvas.toBlob((b) => res(b || new Blob([], { type: 'image/jpeg' })), 'image/jpeg', 0.1)
        ));

      const finalSizeKb = (finalBlob.size / 1024).toFixed(1);
      setResultBlob(finalBlob);
      setResultSizeText(`${finalSizeKb} KB (${widthPx} × ${heightPx} px)`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob, 'resized-photo.jpg', 'image/jpeg');
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResultBlob(null);
  };

  if (resultBlob) {
    return (
      <DownloadSuccessModal
        toolName="Photo Resizer"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={resultSizeText}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*"
          multiple={false}
          title={
            lang === 'ta'
              ? 'அளவு மாற்ற வேண்டிய புகைப்படத்தை இங்கே தேர்ந்தெடுக்கவும்'
              : 'Select photo or signature to resize'
          }
          subTitle={
            lang === 'ta'
              ? 'தேர்வு படிவங்களுக்கு தேவையான KB அளவுக்கு மாற்றலாம்'
              : 'Set exact KB limit and dimensions for exam applications'
          }
          lang={lang}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E8EC]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F8FAFF] border border-[#CBD6F2] overflow-hidden flex items-center justify-center">
                {previewUrl && <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />}
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20242B]">{file.name}</div>
                <div className="text-xs text-[#566070]">
                  Original: {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="text-xs text-[#3752A6] font-bold hover:underline">
              {lang === 'ta' ? 'வேறு படம்' : 'Change Photo'}
            </button>
          </div>

          {/* Exam Presets */}
          <div>
            <label className="block text-xs font-bold text-[#566070] mb-2">
              {lang === 'ta' ? 'தேர்வு விரைவு அமைப்புகள் (Exam Presets):' : 'Exam Presets:'}
            </label>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => applyPreset('tnpsc_photo')}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFF] border border-[#CBD6F2] hover:bg-[#EEF2FF] text-[#3752A6]"
              >
                🎓 TNPSC Photo (20-50 KB)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tnpsc_sign')}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFF] border border-[#CBD6F2] hover:bg-[#EEF2FF] text-[#3752A6]"
              >
                ✍️ TNPSC Sign (10-20 KB)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('upsc_photo')}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFF] border border-[#CBD6F2] hover:bg-[#EEF2FF] text-[#3752A6]"
              >
                🏛️ UPSC Photo (20-100 KB)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('upsc_sign')}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFF] border border-[#CBD6F2] hover:bg-[#EEF2FF] text-[#3752A6]"
              >
                🖋️ UPSC Sign (20-50 KB)
              </button>
            </div>
          </div>

          {/* Custom Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
            <div>
              <label className="block text-[#566070] mb-1 font-bold">
                இலக்கு அளவு / Target Size (Max KB)
              </label>
              <input
                type="number"
                value={targetKb}
                onChange={(e) => setTargetKb(parseInt(e.target.value, 10) || 50)}
                className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-black text-sm text-[#20242B]"
              />
            </div>

            <div>
              <label className="block text-[#566070] mb-1 font-bold">அகலம் / Width (Pixels)</label>
              <input
                type="number"
                value={widthPx}
                onChange={(e) => setWidthPx(parseInt(e.target.value, 10) || 350)}
                className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-black text-sm text-[#20242B]"
              />
            </div>

            <div>
              <label className="block text-[#566070] mb-1 font-bold">உயரம் / Height (Pixels)</label>
              <input
                type="number"
                value={heightPx}
                onChange={(e) => setHeightPx(parseInt(e.target.value, 10) || 450)}
                className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-black text-sm text-[#20242B]"
              />
            </div>
          </div>

          <button
            onClick={handleResize}
            disabled={isProcessing}
            className="w-full bg-[#1B6B5A] hover:bg-[#144F43] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'அளவு மாற்றப்படுகிறது...' : 'Resizing to Target KB...'}
              </>
            ) : (
              <>
                <Sliders className="w-5 h-5" />
                {lang === 'ta' ? `அளவு மாற்றி பதிவிறக்கு (Max ${targetKb} KB)` : `Resize & Download (Under ${targetKb} KB)`}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
