import React from 'react';
import { AppLanguage } from '../../types';
import { FileText, ShieldCheck, Heart } from 'lucide-react';

interface NavbarProps {
  lang: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onNavigateHome: () => void;
  onOpenHub: (hub: 'govt' | 'students' | 'farmer' | 'kalvi' | 'matrimony') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageChange,
  onNavigateHome,
  onOpenHub,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#F6F7FB]/95 backdrop-blur-md border-b border-[#E6E8EC] transition-all">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3752A6] to-[#28407F] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-lg md:text-xl text-[#20242B] tracking-tight leading-tight flex items-center gap-2">
              PDF Tools India
              <span className="hidden sm:inline-block bg-[#E3F6EB] text-[#1E8E5A] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                100% Free
              </span>
            </div>
            <div className="text-xs text-[#566070] font-semibold">
              {lang === 'ta' ? 'இலவச PDF & ஆவணக் கருவிகள்' : 'Free PDF & Document Tools'}
            </div>
          </div>
        </div>

        {/* Hub shortcut links on desktop */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-bold text-[#566070]">
          <button
            onClick={() => onOpenHub('govt')}
            className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-[#3752A6] transition-colors"
          >
            🏛️ {lang === 'ta' ? 'அரசு ஊழியர்கள்' : 'Govt Employees'}
          </button>
          <button
            onClick={() => onOpenHub('students')}
            className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-[#3752A6] transition-colors"
          >
            🎓 {lang === 'ta' ? 'மாணவர்கள்' : 'Students'}
          </button>
          <button
            onClick={() => onOpenHub('farmer')}
            className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-[#3752A6] transition-colors"
          >
            🌾 {lang === 'ta' ? 'உழவர்கள்' : 'Farmers'}
          </button>
          <button
            onClick={() => onOpenHub('kalvi')}
            className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-[#3752A6] transition-colors"
          >
            📚 {lang === 'ta' ? 'களஞ்சியம்' : 'Kalvi'}
          </button>
          <button
            onClick={() => onOpenHub('matrimony')}
            className="px-3 py-1.5 rounded-lg bg-[#FFF1F4] text-[#7A1233] hover:bg-[#FCE3E8] transition-colors flex items-center gap-1"
          >
            <Heart className="w-3.5 h-3.5 text-[#7A1233]" />
            {lang === 'ta' ? 'திருமணம்' : 'Matrimony'}
          </button>
        </nav>

        {/* Language Segment Control */}
        <div className="flex items-center gap-2">
          <div className="flex border-1.5 border-[#B9C4E6] rounded-xl overflow-hidden bg-white shadow-xs">
            <button
              onClick={() => onLanguageChange('ta')}
              className={`px-3 py-1.5 text-xs font-extrabold transition-colors ${
                lang === 'ta'
                  ? 'bg-[#28407F] text-white'
                  : 'text-[#28407F] hover:bg-[#F3F6FF]'
              }`}
            >
              தமிழ்
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 text-xs font-extrabold transition-colors ${
                lang === 'en'
                  ? 'bg-[#28407F] text-white'
                  : 'text-[#28407F] hover:bg-[#F3F6FF]'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
