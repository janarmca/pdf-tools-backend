import React from 'react';
import { CheckCircle2, Download, Share2, RefreshCw } from 'lucide-react';
import { getWhatsAppShareUrl } from '../../utils/pdfHelper';
import { AppLanguage } from '../../types';

interface DownloadSuccessModalProps {
  toolName: string;
  onDownload: () => void;
  onReset: () => void;
  lang: AppLanguage;
  fileSizeText?: string;
}

export const DownloadSuccessModal: React.FC<DownloadSuccessModalProps> = ({
  toolName,
  onDownload,
  onReset,
  lang,
  fileSizeText,
}) => {
  const whatsappUrl = getWhatsAppShareUrl(toolName);

  return (
    <div className="bg-[#F0FAF4] border border-[#CDEBDA] rounded-2xl p-6 text-center shadow-sm my-6 animate-in fade-in">
      <div className="w-14 h-14 rounded-full bg-[#E3F6EB] text-[#1E8E5A] flex items-center justify-center mx-auto mb-3">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h3 className="font-extrabold text-lg text-[#175C3B] mb-1">
        {lang === 'ta' ? 'கோப்பு வெற்றிகரமாக தயாராகியுள்ளது!' : 'Your File is Ready!'}
      </h3>
      <p className="text-sm text-[#4E7D67] mb-4">
        {fileSizeText
          ? `${fileSizeText} — `
          : ''}
        {lang === 'ta'
          ? 'கீழே உள்ள பட்டனை அழுத்தி தரவிறக்கம் செய்துகொள்ளலாம்.'
          : 'Click the button below to download your processed file.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onDownload}
          className="bg-[#1E8E5A] hover:bg-[#157347] text-white font-extrabold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          <Download className="w-5 h-5" />
          {lang === 'ta' ? 'இப்போதே பதிவிறக்கு' : 'Download Now'}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold px-5 py-3 rounded-xl flex items-center gap-2 shadow-md transition-all"
        >
          <Share2 className="w-5 h-5" />
          {lang === 'ta' ? 'WhatsApp-ல் பகிருங்கள்' : 'Share on WhatsApp'}
        </a>

        <button
          onClick={onReset}
          className="bg-white border border-[#CDEBDA] text-[#20242B] font-bold px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-[#F6FBF8] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {lang === 'ta' ? 'மீண்டும் செய்' : 'Start Over'}
        </button>
      </div>
    </div>
  );
};
