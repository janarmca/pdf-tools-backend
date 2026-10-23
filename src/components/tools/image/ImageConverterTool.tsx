import React, { useState } from 'react';
import { DropZone } from '../../common/DropZone';
import { DownloadSuccessModal } from '../../common/DownloadSuccessModal';
import { downloadFile } from '../../../utils/pdfHelper';
import { AppLanguage } from '../../../types';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ImageConverterToolProps {
  lang: AppLanguage;
}

export const ImageConverterTool: React.FC<ImageConverterToolProps> = ({ lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFmt, setTargetFmt] = useState<'jpeg' | 'png' | 'webp'>('png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFile = (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResultBlob(null);
  };

  const handleConvert = async () => {
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
      if (targetFmt === 'jpeg') {
        ctx!.fillStyle = '#FFFFFF';
        ctx!.fillRect(0, 0, img.width, img.height);
      }
      ctx?.drawImage(img, 0, 0);

      const mime = `image/${targetFmt}`;
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), mime, 0.92));
      setResultBlob(blob);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const ext = targetFmt === 'jpeg' ? 'jpg' : targetFmt;
    const baseName = file?.name.replace(/\.[^/.]+$/, '') || 'converted-image';
    downloadFile(resultBlob, `${baseName}.${ext}`, `image/${targetFmt}`);
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
        toolName="Convert Image Format"
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={`Converted to .${targetFmt.toUpperCase()}`}
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
              ? 'வடிவம் மாற்ற வேண்டிய படத்தை இங்கே சேர்க்கவும்'
              : 'Select image to convert format'
          }
          subTitle="JPG ⇄ PNG ⇄ WEBP"
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
            <label className="block text-xs font-bold text-[#566070] mb-2">
              {lang === 'ta' ? 'எந்த வடிவத்திற்கு மாற்ற வேண்டும்?' : 'Convert to Format:'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setTargetFmt(fmt)}
                  className={`py-3 rounded-xl font-black text-sm uppercase transition-all border ${
                    targetFmt === fmt
                      ? 'bg-[#2E86C1] text-white border-[#2E86C1] shadow-sm'
                      : 'bg-[#F8FAFF] text-[#20242B] border-[#CBD6F2] hover:bg-white'
                  }`}
                >
                  {fmt === 'jpeg' ? 'JPG' : fmt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="w-full bg-[#2E86C1] hover:bg-[#206899] text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {lang === 'ta' ? 'மாற்றப்படுகிறது...' : 'Converting...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                {lang === 'ta'
                  ? `.${targetFmt.toUpperCase()}-ஆக மாற்றி பதிவிறக்கு`
                  : `Convert to .${targetFmt.toUpperCase()} & Download`}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
