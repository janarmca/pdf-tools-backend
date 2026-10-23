import React from 'react';
import { AppLanguage } from '../../types';
import { ArrowRight, Heart } from 'lucide-react';

interface AudienceHubsProps {
  lang: AppLanguage;
  onOpenHub: (hub: 'govt' | 'students' | 'farmer' | 'kalvi' | 'matrimony') => void;
}

export const AudienceHubs: React.FC<AudienceHubsProps> = ({ lang, onOpenHub }) => {
  const hubs = [
    {
      id: 'govt' as const,
      icon: '🏛️',
      titleEn: 'Government Employees',
      titleTa: 'அரசு ஊழியர்கள்',
      descEn: 'DA arrears, payslips, leave letters, tax & attendance',
      descTa: 'அகவிலைப்படி நிலுவை, சம்பள சீட்டு, விடுப்பு, வரி',
      bgGradient: 'from-[#1F2A44] to-[#3B4D75]',
    },
    {
      id: 'students' as const,
      icon: '🎓',
      titleEn: 'School & College Students',
      titleTa: 'பள்ளி & கல்லூரி மாணவர்கள்',
      descEn: 'TNEA cut-off, study timer, exam photo resize & CGPA',
      descTa: 'பொறியியல் கட்-ஆஃப், படிப்பு கடிகாரம், தேர்வு படம்',
      bgGradient: 'from-[#1A5D8A] to-[#2E86AB]',
    },
    {
      id: 'farmer' as const,
      icon: '🌾',
      titleEn: 'Farmer Toolbox',
      titleTa: 'உழவர் கருவிகள்',
      descEn: 'Land cent/acre converter, rice fertilizer & spray ratios',
      descTa: 'நில அளவு மாற்றி, நெல் உரக் கணக்கீடு, பூச்சி மருந்து',
      bgGradient: 'from-[#1B5E20] to-[#2E7D32]',
    },
    {
      id: 'kalvi' as const,
      icon: '📚',
      titleEn: 'Kalvi Kalanjiyam (Classes 1–10)',
      titleTa: 'கல்விக் களஞ்சியம்',
      descEn: 'Free Tamil Samacheer lessons, experiments & games',
      descTa: '1–10 வகுப்பு பாடங்கள், அறிவியல் ஆய்வுகள் & வினாடி வினா',
      bgGradient: 'from-[#6A1B9A] to-[#8E24AA]',
    },
  ];

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-[#20242B]">
            {lang === 'ta' ? 'உங்களுக்கான சிறப்புப் பக்கங்கள்' : 'Made For You — Audience Hubs'}
          </h2>
          <p className="text-xs text-[#566070] font-semibold mt-0.5">
            {lang === 'ta'
              ? 'உங்கள் தேவைக்கேற்ற கருவிகள் ஒரே இடத்தில் தொகுக்கப்பட்டுள்ளது'
              : 'Curated toolsets tailored for daily needs'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hubs.map((hub) => (
          <div
            key={hub.id}
            onClick={() => onOpenHub(hub.id)}
            className={`rounded-2xl p-5 text-white bg-gradient-to-br ${hub.bgGradient} cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-150 flex flex-col justify-between min-h-[140px] group`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{hub.icon}</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <div className="font-black text-base mt-3">
                {lang === 'ta' ? hub.titleTa : hub.titleEn}
              </div>
              <div className="text-xs text-white/80 line-clamp-2 mt-1">
                {lang === 'ta' ? hub.descTa : hub.descEn}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Matrimony row */}
      <div
        onClick={() => onOpenHub('matrimony')}
        className="mt-4 p-4 rounded-2xl bg-[#FFF1F4] border border-[#F2C6D0] text-[#7A1233] cursor-pointer hover:bg-[#FFE8ED] transition-colors flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl p-2 rounded-xl bg-white shadow-xs">💍</span>
          <div>
            <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              {lang === 'ta'
                ? 'ஸ்ரீ சௌடேஸ்வரி திருமண அமைப்பகம்'
                : 'Sri Chowdeshwari Matrimony Service'}
              <span className="bg-[#7A1233] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {lang === 'ta' ? 'இலவச பதிவு' : 'Free Registration'}
              </span>
            </div>
            <div className="text-xs text-[#9A5A6B]">
              {lang === 'ta'
                ? 'கன்னட தேவாங்கர் மற்றும் அனைத்து சமூகத்தினருக்கான திருமணத் தகவல் மையம். 100% பாதுகாப்பானது.'
                : 'Trusted matrimony portal for Kannada Devanga & all communities. Privacy first.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 font-bold text-xs bg-white px-3 py-1.5 rounded-xl border border-[#F2C6D0]">
          <Heart className="w-3.5 h-3.5 fill-[#7A1233]" />
          <span>{lang === 'ta' ? 'விவரம் காண்க' : 'Learn More'}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </div>
      </div>
    </div>
  );
};
