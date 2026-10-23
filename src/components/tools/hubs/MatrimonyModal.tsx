import React from 'react';
import { AppLanguage } from '../../../types';
import { ArrowLeft, Phone, Mail, ShieldCheck, Heart, Sparkles, FileText } from 'lucide-react';

interface MatrimonyModalProps {
  lang: AppLanguage;
  onOpenBiodata: () => void;
  onBack: () => void;
}

export const MatrimonyModal: React.FC<MatrimonyModalProps> = ({
  lang,
  onOpenBiodata,
  onBack,
}) => {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A1233] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{lang === 'ta' ? 'முதன்மைப் பக்கத்திற்குத் திரும்பு' : 'Back to All Tools'}</span>
      </button>

      {/* Main card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#7A1233] to-[#B5532B] text-white p-6 sm:p-10 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">💍</span>
          <span className="bg-[#F2C14E] text-[#3A0B19] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
            100% Free Registration
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black mb-3">
          ஸ்ரீ சௌடேஸ்வரி திருமண அமைப்பகம்
        </h2>
        <h3 className="text-sm sm:text-lg text-white/90 font-bold mb-4">
          Sri Chowdeshwari Thirumana Amaippagam — Matrimony Service
        </h3>

        <p className="text-xs sm:text-sm text-white/90 max-w-2xl leading-relaxed mb-6">
          {lang === 'ta'
            ? 'கன்னட தேவாங்கர் மற்றும் அனைத்து சமூகத்தினருக்கான நம்பகமான திருமணத் தகவல் மையம். குடும்ப விவரங்கள் மற்றும் புகைப்படங்களுடன் இலவசமாகப் பதிவு செய்யலாம். தொலைபேசி எண்கள் ரகசியமாகப் பாதுகாக்கப்படும்.'
            : 'A trusted matrimony service for the Kannada Devanga community and open to all communities. Free registration with family details, horoscope, and photos. Phone numbers stay completely private.'}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpenBiodata}
            className="bg-[#F2C14E] hover:bg-[#E5B33C] text-[#3A0B19] font-black px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>{lang === 'ta' ? 'இலவச பயோடேட்டா தயாரிப்பாளர்' : 'Free Biodata Maker'}</span>
          </button>
          <a
            href="tel:+919698777639"
            className="bg-white/15 hover:bg-white/25 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all border border-white/20"
          >
            <Phone className="w-4 h-4" />
            <span>+91 96987 77639 (தியாகராஜன்)</span>
          </a>
        </div>
      </div>

      {/* Trust Points */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#F2C6D0] rounded-2xl p-5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F4] text-[#7A1233] flex items-center justify-center font-bold mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm text-[#20242B] mb-1">
            {lang === 'ta' ? 'தனிநபர் பாதுகாப்பு' : 'Privacy First'}
          </h4>
          <p className="text-xs text-[#566070] leading-relaxed">
            {lang === 'ta'
              ? 'தொலைபேசி எண்கள் மற்ற உறுப்பினர்களுக்கு நேரடியாகக் காட்டப்படாது.'
              : 'Phone numbers & emails stay private and are never shared publicly.'}
          </p>
        </div>

        <div className="bg-white border border-[#F2C6D0] rounded-2xl p-5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F4] text-[#7A1233] flex items-center justify-center font-bold mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm text-[#20242B] mb-1">
            {lang === 'ta' ? 'அனைத்து சமூகத்தினரும்' : 'Open to All'}
          </h4>
          <p className="text-xs text-[#566070] leading-relaxed">
            {lang === 'ta'
              ? 'கன்னட தேவாங்கர் மற்றும் அனைத்து சமூகத்தினரும் கட்டணமின்றி பதிவு செய்யலாம்.'
              : 'Built for Kannada Devanga, open and welcoming to every community.'}
          </p>
        </div>

        <div className="bg-white border border-[#F2C6D0] rounded-2xl p-5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F4] text-[#7A1233] flex items-center justify-center font-bold mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm text-[#20242B] mb-1">
            {lang === 'ta' ? 'நேரடித் தொடர்பு' : 'Direct Support'}
          </h4>
          <p className="text-xs text-[#566070] leading-relaxed">
            support@pdftoolsindia.com அல்லது 96987 77639 எண்ணில் தொடர்பு கொள்ளலாம்.
          </p>
        </div>
      </div>
    </div>
  );
};
