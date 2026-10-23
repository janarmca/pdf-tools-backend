import React, { useState } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { Loader2, Sliders } from 'lucide-react';

interface CompressImageToolProps {
  lang: AppLanguage;
}

export const CompressImageTool: React.FC<CompressImageToolProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [sizeText, setSizeText] = useState<string>('');

  const handleFile = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setCompressedBlob(null);
  };

  const handleCompress = async () => {
    if (!file || !previewUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((res) => { img.onload = res; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), 'image/jpeg', quality / 100)
      );

      const origKb = (file.size / 1024).toFixed(1);
      const newKb = (blob.size / 1024).toFixed(1);
      const savedPct = Math.round(((file.size - blob.size) / file.size) * 100);

      setCompressedBlob(blob);
      setSizeText(`${origKb} KB → ${newKb} KB (${savedPct}% reduction)`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedBlob) return;
    downloadFile(compressedBlob, 'compressed-image.jpg', 'image/jpeg');
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setCompressedBlob(null);
  };

  if (compressedBlob) {
    return (
      <DownloadSuccessModal
        toolName="Compress Image"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={sizeText}
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
              ? 'அளவு சுருக்க வேண்டிய படத்தை இங்கே சேர்க்கவும்'
              : 'Select image to compress'
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
                <div className="text-xs text-[#566070]">Original: {(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button onClick={handleReset} className="text-xs text-[#3752A6] font-bold hover:underline">
              {lang === 'ta' ? 'வேறு படம்' : 'Change Photo'}
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-[#566070]">சுருக்கும் தரம் / Compression Quality:</span>
              <span className="font-mono text-base font-black text-[#3752A6]">{quality}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="95"
              step="5"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value, 10))}
              className="w-full accent-[#3752A6]"
            />
            <div className="flex justify-between text-[11px] text-[#566070] mt-1 font-semibold">
              <span>சிறிய அளவு (Smallest KB)</span>
              <span>அதிக தரம் (Best Quality)</span>
            </div>
          </div>

          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="w-full bg-[#7A5C1E] hover:bg-[#5C4516] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'சுருக்கப்படுகிறது...' : 'Compressing...'}
              </>
            ) : (
              <>
                <Sliders className="w-5 h-5" />
                {lang === 'ta' ? 'சுருக்கி பதிவிறக்கு' : 'Compress & Download'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
