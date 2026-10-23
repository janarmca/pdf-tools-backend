import React, { useState } from 'react';
import { transliterateTanglish } from '../../../utils/tamilCore';
import { AppLanguage } from '../../../types';
import { Copy, Check, Download } from 'lucide-react';
import { downloadFile } from '../../../utils/pdfHelper';

interface TamilTypingToolProps {
  lang: AppLanguage;
}

export const TamilTypingTool: React.FC<TamilTypingToolProps> = ({ lang }) => {
  const [text, setText] = useState('வணக்கம், PDF Tools India வலைத்தளத்திற்கு வரவேற்கிறோம்!');
  const [copied, setCopied] = useState(false);

  // When user types in English and presses space or punctuation, transliterate the last word
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const textarea = e.currentTarget;
      const pos = textarea.selectionStart;
      const textBefore = text.slice(0, pos);
      const textAfter = text.slice(pos);

      const words = textBefore.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (lastWord && /^[a-zA-Z]+$/.test(lastWord)) {
        e.preventDefault();
        const converted = transliterateTanglish(lastWord);
        const replacedBefore = textBefore.slice(0, textBefore.length - lastWord.length) + converted + (e.key === 'Enter' ? '\n' : ' ');
        setText(replacedBefore + textAfter);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadFile(text, 'tamil-text.txt', 'text/plain;charset=utf-8');
  };

  const quickWords = [
    { en: 'vanakkam', ta: 'வணக்கம்' },
    { en: 'nandri', ta: 'நன்றி' },
    { en: 'tamil', ta: 'தமிழ்' },
    { en: 'unakkaga', ta: 'உனக்காக' },
    { en: 'anbu', ta: 'அன்பு' },
    { en: 'vaazhga', ta: 'வாழ்க' },
    { en: 'vetri', ta: 'வெற்றி' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8EC] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⌨️</span>
            <div>
              <h3 className="font-black text-lg text-[#20242B]">
                {lang === 'ta' ? 'தமிழ் தட்டச்சு (தங்கிலீஷ் வழியில்)' : 'Tamil Typing (Tanglish to Tamil)'}
              </h3>
              <p className="text-xs text-[#566070]">
                {lang === 'ta'
                  ? 'ஆங்கில எழுத்துக்களில் தட்டச்சு செய்து Space அழுத்தினால் தானாக தமிழில் மாறும்'
                  : 'Type English letters (e.g. vanakkam, nandri, tamil) and press Space to get Tamil Unicode text'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="bg-[#D81B60] hover:bg-[#B3134D] text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'நகலெடுக்கப்பட்டது!' : 'நகலெடு (Copy)'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="bg-[#F8FAFF] hover:bg-[#EEF2FF] border border-[#CBD6F2] text-[#20242B] font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-[#3752A6]" />
              <span>Text சேமி</span>
            </button>
          </div>
        </div>

        {/* Quick words helper */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-[#566070]">முக்கிய சொற்கள்:</span>
          {quickWords.map((w) => (
            <button
              key={w.en}
              onClick={() => setText((prev) => (prev ? `${prev} ${w.ta}` : w.ta))}
              className="bg-[#F8FAFF] border border-[#CBD6F2] hover:bg-white text-[#20242B] font-bold px-2.5 py-1 rounded-lg text-xs"
            >
              {w.ta} <span className="text-[10px] text-[#566070]">({w.en})</span>
            </button>
          ))}
        </div>

        {/* Text Area */}
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={8}
            placeholder="Type here in English (e.g. vanakkam...) and press space..."
            className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#D81B60] rounded-2xl p-4 text-base font-semibold leading-relaxed text-[#20242B] tamil-font outline-none"
          />
        </div>

        {/* Word/Letter Counter */}
        <div className="flex justify-between text-xs font-bold text-[#566070]">
          <div>
            எழுத்துக்கள் (Characters): <span className="text-[#20242B]">{text.length}</span> • சொற்கள் (Words):{' '}
            <span className="text-[#20242B]">{text.trim() ? text.trim().split(/\s+/).length : 0}</span>
          </div>
          <div>100% Free &amp; Offline Unicode</div>
        </div>
      </div>
    </div>
  );
};
