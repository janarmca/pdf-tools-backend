import React, { useState } from 'react';
import { numberToWordsEnglish, numberToWordsTamil } from '../../../utils/tamilCore';
import { AppLanguage } from '../../../types';
import { Copy, Check } from 'lucide-react';

interface AmountInWordsToolProps {
  lang: AppLanguage;
}

export const AmountInWordsTool: React.FC<AmountInWordsToolProps> = ({ lang }) => {
  const [num, setNum] = useState<number>(145000);
  const [copiedEn, setCopiedEn] = useState(false);
  const [copiedTa, setCopiedTa] = useState(false);

  const enWords = numberToWordsEnglish(num);
  const taWords = numberToWordsTamil(num);

  const copyText = (txt: string, isTa: boolean) => {
    navigator.clipboard.writeText(txt);
    if (isTa) {
      setCopiedTa(true);
      setTimeout(() => setCopiedTa(false), 2000);
    } else {
      setCopiedEn(true);
      setTimeout(() => setCopiedEn(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🔢</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'தொகை எழுத்தில் (Amount in Words)' : 'Amount in Words (Rupees)'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'காசோலை (Cheque), ரசீது மற்றும் வங்கிப் படிவங்களுக்காக எண்களை தமிழ் மற்றும் ஆங்கிலத்தில் மாற்ற'
                : 'Convert numbers into words in English and Tamil for cheques, vouchers and bank deposit slips'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#566070] mb-1.5">
            தொகையை உள்ளிடவும் / Enter Rupee Amount:
          </label>
          <input
            type="number"
            value={num || ''}
            onChange={(e) => setNum(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#3752A6] rounded-xl p-3 text-lg font-black font-mono text-[#20242B] outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* English */}
        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase text-[#3752A6] mb-2 tracking-wider">
              In English Words:
            </div>
            <div className="text-base font-black text-[#20242B] leading-relaxed">
              {enWords}
            </div>
          </div>
          <button
            onClick={() => copyText(enWords, false)}
            className="mt-4 self-start bg-[#F8FAFF] hover:bg-[#EEF2FF] border border-[#CBD6F2] text-[#3752A6] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copiedEn ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEn ? 'Copied!' : 'Copy in English'}</span>
          </button>
        </div>

        {/* Tamil */}
        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase text-[#1E8E5A] mb-2 tracking-wider">
              தமிழில் (In Tamil Words):
            </div>
            <div className="text-base font-black text-[#20242B] leading-relaxed tamil-font">
              {taWords}
            </div>
          </div>
          <button
            onClick={() => copyText(taWords, true)}
            className="mt-4 self-start bg-[#F8FAFF] hover:bg-[#E8F8EE] border border-[#CBD6F2] text-[#1E8E5A] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copiedTa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTa ? 'நகலெடுக்கப்பட்டது!' : 'தமிழில் நகலெடு (Copy)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
