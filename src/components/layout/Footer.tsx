import React from 'react';
import { AppLanguage } from '../../types';
import { Mail, Instagram, Youtube, Facebook, ShieldCheck } from 'lucide-react';

interface FooterProps {
  lang: AppLanguage;
  onOpenHub: (hub: 'govt' | 'students' | 'farmer' | 'kalvi' | 'matrimony') => void;
  onSelectCategory: (cat: 'pdf' | 'image' | 'business' | 'video' | 'ai' | 'education') => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, onOpenHub, onSelectCategory }) => {
  return (
    <footer className="mt-16 border-t border-[#E6E8EC] bg-white pt-12 pb-16 text-sm text-[#566070]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: About */}
          <div className="space-y-3">
            <div className="font-black text-lg text-[#20242B]">PDF Tools India</div>
            <p className="text-xs leading-relaxed">
              {lang === 'ta'
                ? 'அனைத்து PDF, படங்கள், ஜிஎஸ்டி பில், அரசு ஊழியர் & மாணவர் கருவிகள் முற்றிலும் இலவசமாகவும் உங்கள் பாதுகாப்பை உறுதி செய்தும் வழங்கப்படுகிறது.'
                : 'Free, privacy-first PDF, Image, Video, Business and Education tools made for India. 100% browser-side processing.'}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E8E5A]">
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'ta' ? 'தனிநபர் தகவல் பாதுகாப்பு' : 'Device-local & Private'}</span>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wider text-[#20242B] mb-3">
              {lang === 'ta' ? 'கருவிப் பிரிவுகள்' : 'Tool Categories'}
            </div>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <button onClick={() => onSelectCategory('pdf')} className="hover:text-[#3752A6]">
                  📄 {lang === 'ta' ? 'PDF கருவிகள்' : 'PDF Tools'}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('business')} className="hover:text-[#3752A6]">
                  💼 {lang === 'ta' ? 'வணிக & ஜிஎஸ்டி பில்' : 'Business & GST'}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('image')} className="hover:text-[#3752A6]">
                  🖼️ {lang === 'ta' ? 'படக் கருவிகள் & போட்டோ' : 'Image & Photo Resizer'}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('education')} className="hover:text-[#3752A6]">
                  📚 {lang === 'ta' ? 'கல்வி & தமிழ் தட்டச்சு' : 'Education & Tamil Tools'}
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('video')} className="hover:text-[#3752A6]">
                  🎬 {lang === 'ta' ? 'வீடியோ & ஆடியோ' : 'Video & Audio Tools'}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Audience Hubs */}
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wider text-[#20242B] mb-3">
              {lang === 'ta' ? 'உங்களுக்கான பக்கங்கள்' : 'Made For You'}
            </div>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <button onClick={() => onOpenHub('govt')} className="hover:text-[#3752A6]">
                  🏛️ {lang === 'ta' ? 'அரசு ஊழியர்கள் பக்கம்' : 'Government Employees Hub'}
                </button>
              </li>
              <li>
                <button onClick={() => onOpenHub('students')} className="hover:text-[#3752A6]">
                  🎓 {lang === 'ta' ? 'மாணவர்கள் பக்கம்' : 'Students Hub'}
                </button>
              </li>
              <li>
                <button onClick={() => onOpenHub('farmer')} className="hover:text-[#3752A6]">
                  🌾 {lang === 'ta' ? 'உழவர் கருவிகள்' : 'Farmer Toolbox'}
                </button>
              </li>
              <li>
                <button onClick={() => onOpenHub('kalvi')} className="hover:text-[#3752A6]">
                  📚 {lang === 'ta' ? 'கல்விக் களஞ்சியம் (1-10)' : 'Kalvi Kalanjiyam'}
                </button>
              </li>
              <li>
                <button onClick={() => onOpenHub('matrimony')} className="hover:text-[#7A1233] text-[#7A1233]">
                  💍 {lang === 'ta' ? 'ஸ்ரீ சௌடேஸ்வரி மேட்ரிமனி' : 'Chowdeshwari Matrimony'}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Social */}
          <div>
            <div className="font-extrabold text-xs uppercase tracking-wider text-[#20242B] mb-3">
              {lang === 'ta' ? 'தொடர்புக்கு' : 'Connect'}
            </div>
            <a
              href="mailto:support@pdftoolsindia.com"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#3752A6] hover:underline mb-4"
            >
              <Mail className="w-4 h-4" />
              support@pdftoolsindia.com
            </a>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/pdftoolsindia/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-[#EEF1FA] flex items-center justify-center text-[#20242B] hover:text-[#E1306C] transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.youtube.com/@pdftoolsindia"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-lg bg-[#EEF1FA] flex items-center justify-center text-[#20242B] hover:text-[#FF0000] transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61595156705561"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-lg bg-[#EEF1FA] flex items-center justify-center text-[#20242B] hover:text-[#1877F2] transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-[#E6E8EC] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div>© {new Date().getFullYear()} PDF Tools India. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>{lang === 'ta' ? 'பதிவு தேவையில்லை' : 'No Signup Required'}</span>
            <span>•</span>
            <span>{lang === 'ta' ? '100% இலவசம்' : '100% Free'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
