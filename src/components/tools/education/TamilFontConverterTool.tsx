import React, { useState } from 'react';
import { baminiToUnicode } from '../../../utils/tamilCore';
import { AppLanguage } from '../../../types';
import { ArrowLeftRight, Copy, Check } from 'lucide-react';

interface TamilFontConverterToolProps {
  lang: AppLanguage;
}

export const TamilFontConverterTool: React.FC<TamilFontConverterToolProps> = ({ lang }) => {
  const [inputText, setInputText] = useState('tzf;fk;');
  const [copied, setCopied] = useState(false);

  const convertedText = baminiToUnicode(inputText);

  const handleCopy = () => {
    navigator.clipboard.writeText(convertedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🔤</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'பாமினி ⇄ யுனிகோட் மாற்றி' : 'Bamini to Unicode Font Converter'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'பழைய பாமினி மற்றும் TSCII எழுத்துருக்களை வாட்ஸ்அப் மற்றும் இணையத்தில் படிக்கக்கூடிய யுனிகோடாக மாற்ற'
                : 'Convert legacy Bamini/TSCII Tamil fonts to modern Unicode for web, mobile and social media'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input */}
          <div>
            <label className="block text-xs font-bold text-[#566070] mb-1.5">
              பாமினி உரை (Bamini Text):
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
              placeholder="Paste Bamini encoded text here..."
              className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#6A1B9A] rounded-2xl p-4 text-sm font-semibold text-[#20242B] font-mono outline-none"
            />
          </div>

          {/* Output */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#6A1B9A]">
                  யுனிகோட் உரை (Unicode Output):
                </label>
                <button
                  onClick={handleCopy}
                  className="bg-[#6A1B9A] hover:bg-[#4A148C] text-white text-xs font-extrabold px-3 py-1 rounded-lg flex items-center gap-1 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'நகலெடுக்கப்பட்டது!' : 'நகலெடு (Copy)'}</span>
                </button>
              </div>
              <div className="w-full h-[190px] bg-[#FAF5FF] border-2 border-[#E9D5FF] rounded-2xl p-4 text-base font-bold text-[#20242B] tamil-font overflow-y-auto leading-relaxed">
                {convertedText || (
                  <span className="text-[#566070] font-normal text-xs">
                    இடதுபுறம் பாமினி உரையை உள்ளிட்டால் இங்கே யுனிகோட் வடிவம் தோன்றும்...
                  </span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-[#566070] mt-2 font-semibold">
              வாட்ஸ்அப், பேஸ்புக் மற்றும் வேர்ட் கோப்புகளில் அப்படியே பயன்படுத்தலாம்.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
