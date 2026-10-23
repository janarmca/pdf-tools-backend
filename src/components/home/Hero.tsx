import React from 'react';
import { Search } from 'lucide-react';
import { AppLanguage } from '../../types';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickSelect: (toolId: string) => void;
  lang: AppLanguage;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  onSearchChange,
  onQuickSelect,
  lang,
}) => {
  const quickPicks = [
    { id: 'merge', label: lang === 'ta' ? 'PDF இணைக்க' : 'Merge PDF' },
    { id: 'split', label: lang === 'ta' ? 'PDF பிரிக்க' : 'Split PDF' },
    { id: 'compress', label: lang === 'ta' ? 'அளவு சுருக்க' : 'Compress PDF' },
    { id: 'quotepo', label: lang === 'ta' ? 'ஜிஎஸ்டி பில்' : 'GST Invoice' },
    { id: 'photoresize', label: lang === 'ta' ? 'தேர்வு போட்டோ' : 'Photo Resizer' },
    { id: 'tamiltyping', label: lang === 'ta' ? 'தமிழ் தட்டச்சு' : 'Tamil Typing' },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#EEF2FF] via-[#F6F7FB] to-[#FFF6ED] border border-[#E6E8EC] p-6 sm:p-10 mb-8 shadow-xs">
      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#E6E8EC] text-xs font-bold text-[#3752A6] mb-4 backdrop-blur-xs">
          <span>✨</span>
          <span>
            {lang === 'ta'
              ? '120+ இலவசக் கருவிகள் — பதிவு தேவையில்லை'
              : '120+ Free Tools — No Signup, 100% Private'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-[#20242B] tracking-tight leading-tight mb-3">
          {lang === 'ta' ? (
            <>
              அனைத்து <span className="text-[#3752A6]">PDF, படம், வணிகம்</span> &amp;{' '}
              <span className="text-[#E8894A]">கல்விக் கருவிகள்</span> ஒரே இடத்தில்
            </>
          ) : (
            <>
              All-in-One <span className="text-[#3752A6]">PDF, Image, Business</span> &amp;{' '}
              <span className="text-[#E8894A]">Tamil Tools</span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-[#566070] font-medium leading-relaxed mb-6 max-w-2xl">
          {lang === 'ta'
            ? 'PDF இணைக்க, பிரிக்க, ஜிஎஸ்டி பில் தயாரிக்க, தேர்வு போட்டோ அளவு மாற்ற மற்றும் தமிழ் கருவிகள் — முற்றிலும் இலவசம், உங்கள் பிரவுசரிலேயே செயல்படும்.'
            : 'Merge, split, compress PDFs, generate GST invoices & salary slips, resize photos for exams, and type in Tamil. Private and free.'}
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#566070]">
            <Search className="w-5 h-5 text-[#3752A6]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              lang === 'ta'
                ? 'கருவியைத் தேடவும்... (எ.கா: merge, gst, photo, tamil, salary)'
                : 'Search any tool... (e.g. merge, invoice, resize, compress, tax)'
            }
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#CBD6F2] focus:border-[#3752A6] rounded-2xl shadow-sm outline-none text-sm font-semibold transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-[#566070] hover:text-[#20242B]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Picks */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
          <span className="font-bold text-[#566070] mr-1">
            {lang === 'ta' ? 'அடிக்கடி பயன்படுபவை:' : 'Quick tasks:'}
          </span>
          {quickPicks.map((pick) => (
            <button
              key={pick.id}
              onClick={() => onQuickSelect(pick.id)}
              className="bg-white/90 hover:bg-white border border-[#E6E8EC] hover:border-[#3752A6] text-[#20242B] font-bold px-3 py-1.5 rounded-full transition-all shadow-2xs hover:scale-105 active:scale-95"
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
