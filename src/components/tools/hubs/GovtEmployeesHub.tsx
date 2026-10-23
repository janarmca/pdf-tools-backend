import React from 'react';
import { AppLanguage } from '../../../types';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

interface GovtEmployeesHubProps {
  lang: AppLanguage;
  onSelectTool: (toolId: string) => void;
  onBack: () => void;
}

export const GovtEmployeesHub: React.FC<GovtEmployeesHubProps> = ({
  lang,
  onSelectTool,
  onBack,
}) => {
  const govtTools = [
    {
      id: 'daarrears',
      title: 'DA / DR Arrears Calculator',
      titleTa: 'அகவிலைப்படி நிலுவைத்தொகை கணிப்பான்',
      desc: 'Calculate month-by-month DA / DR arrears when the dearness allowance rate increases',
      icon: '🧾',
    },
    {
      id: 'salaryslip',
      title: 'Salary Slip Generator',
      titleTa: 'சம்பள சீட்டு தயாரிப்பாளர்',
      desc: 'Monthly payslip with basic pay, HRA, PF 12%, ESI, professional tax & LOP',
      icon: '💵',
    },
    {
      id: 'incometaxcalc',
      title: 'Income Tax Calculator (FY 2026-27)',
      titleTa: 'வருமான வரி கணிப்பான் (Old vs New)',
      desc: 'Old vs New Tax Regime side-by-side comparison with all deductions (80C, 80D, HRA)',
      icon: '🧾',
    },
    {
      id: 'leaveletter',
      title: 'Leave Application Letter',
      titleTa: 'விடுப்பு விண்ணப்பக் கடிதம்',
      desc: 'Formal leave letter for government employees in Tamil or English',
      icon: '📝',
    },
    {
      id: 'rupeewords',
      title: 'Amount in Words (Rupees)',
      titleTa: 'ரூபாய் எழுத்தில் (Amount in Words)',
      desc: 'Convert any amount to words in Tamil and English for bills and vouchers',
      icon: '🔢',
    },
    {
      id: 'dscverify',
      title: 'DSC / e-Sign Verifier',
      titleTa: 'டிஜிட்டல் கையொப்பம் சரிபார்ப்பு',
      desc: 'Verify digital signatures on official certificates and circulars',
      icon: '🔏',
    },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3752A6] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{lang === 'ta' ? 'முதன்மைப் பக்கத்திற்குத் திரும்பு' : 'Back to All Tools'}</span>
      </button>

      <div className="rounded-3xl bg-gradient-to-r from-[#1F2A44] to-[#3B4D75] text-white p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">
          <span>🏛️</span>
          <span>{lang === 'ta' ? 'தமிழக அரசு ஊழியர்களுக்காக' : 'For Government Employees'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">
          {lang === 'ta' ? 'அரசு ஊழியர்கள் மற்றும் ஓய்வூதியர் கருவிகள்' : 'Government Employees & Pensioners Hub'}
        </h2>
        <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-2xl leading-relaxed">
          {lang === 'ta'
            ? 'அகவிலைப்படி (DA) நிலுவைத் தொகை, சம்பள சீட்டு, விடுப்பு கடிதம் மற்றும் வருமான வரி ஒப்பீடு — அனைத்தும் இலவசமாக.'
            : 'DA arrears calculation, payslips, leave application letters, and income tax comparisons.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {govtTools.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className="bg-white border border-[#E6E8EC] hover:border-[#3752A6] rounded-2xl p-5 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="text-3xl mb-3">{t.icon}</div>
              <h4 className="font-extrabold text-base text-[#20242B] group-hover:text-[#3752A6] transition-colors">
                {lang === 'ta' ? t.titleTa : t.title}
              </h4>
              <p className="text-xs text-[#566070] mt-1 line-clamp-2 leading-relaxed">
                {t.desc}
              </p>
            </div>
            <div className="pt-3 border-t border-[#F1F3F8] mt-4 flex items-center justify-between text-xs font-bold text-[#3752A6]">
              <span>{lang === 'ta' ? 'கருவியைத் திற' : 'Open Tool'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
