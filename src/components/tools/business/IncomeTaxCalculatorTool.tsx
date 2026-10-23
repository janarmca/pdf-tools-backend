import React, { useState } from 'react';
import { calculateIncomeTax } from '../../../utils/billingCalc';
import { AppLanguage } from '../../../types';
import { CheckCircle2, TrendingDown, HelpCircle } from 'lucide-react';

interface IncomeTaxCalculatorToolProps {
  lang: AppLanguage;
}

export const IncomeTaxCalculatorTool: React.FC<IncomeTaxCalculatorToolProps> = ({ lang }) => {
  const [grossIncome, setGrossIncome] = useState<number>(1200000);
  const [ded80C, setDed80C] = useState<number>(150000);
  const [ded80D, setDed80D] = useState<number>(25000);
  const [hraExempt, setHraExempt] = useState<number>(120000);
  const [homeLoanInt, setHomeLoanInt] = useState<number>(0);

  const res = calculateIncomeTax(grossIncome, ded80C, ded80D, hraExempt, homeLoanInt);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🧾</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'வருமான வரி கணிப்பான் (FY 2026-27)' : 'Income Tax Calculator (FY 2026-27)'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'பழைய மற்றும் புதிய வரி முறை நேரடி ஒப்பீடு — எதில் அதிக மிச்சம்?'
                : 'Old vs New Tax Regime side-by-side comparison with deductions'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="sm:col-span-3">
            <label className="block text-[#566070] mb-1 font-bold">
              ஆண்டு மொத்த வருமானம் / Annual Gross Salary (₹)
            </label>
            <input
              type="number"
              value={grossIncome || ''}
              onChange={(e) => setGrossIncome(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#3752A6] rounded-xl p-3 text-base font-black text-[#20242B] font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">
              Section 80C (PPF, EPF, LIC, ELSS - Max 1.5L)
            </label>
            <input
              type="number"
              value={ded80C || ''}
              onChange={(e) => setDed80C(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">
              Section 80D (Health Insurance)
            </label>
            <input
              type="number"
              value={ded80D || ''}
              onChange={(e) => setDed80D(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">
              HRA Exemption (வீட்டு வாடகை விலக்கு)
            </label>
            <input
              type="number"
              value={hraExempt || ''}
              onChange={(e) => setHraExempt(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Comparison Verdict Banner */}
      <div
        className={`p-5 rounded-2xl border text-sm font-bold flex flex-col sm:flex-row items-center justify-between gap-4 ${
          res.better === 'new'
            ? 'bg-[#E8F8EE] border-[#B9E9CA] text-[#0D5C2E]'
            : res.better === 'old'
            ? 'bg-[#EEF2FF] border-[#C4D3FA] text-[#1E3A8A]'
            : 'bg-[#F8FAFF] border-[#E6E8EC] text-[#20242B]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-base">
              {res.better === 'new'
                ? lang === 'ta'
                  ? 'புதிய வரி முறை உங்களுக்கு சிறந்தது! (New Regime is Better)'
                  : 'New Tax Regime is Better for You!'
                : res.better === 'old'
                ? lang === 'ta'
                  ? 'பழைய வரி முறையில் அதிக சேமிப்பு! (Old Regime is Better)'
                  : 'Old Tax Regime is Better for You!'
                : 'இரண்டு முறைகளிலும் ஒரே வரித் தொகை! (Both Equal)'}
            </div>
            <div className="text-xs opacity-90 font-medium">
              {res.savings > 0
                ? lang === 'ta'
                  ? `இதில் நீங்கள் ₹${res.savings.toLocaleString('en-IN')} வரை வரியை மிச்சப்படுத்தலாம்.`
                  : `You save ₹${res.savings.toLocaleString('en-IN')} in tax under this regime.`
                : 'Choose either regime based on your convenience.'}
            </div>
          </div>
        </div>

        {res.savings > 0 && (
          <div className="text-right shrink-0">
            <span className="text-xs uppercase font-extrabold block">வரி மிச்சம் / Savings</span>
            <span className="text-2xl font-black font-mono">₹{res.savings.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Slabs Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* New Regime */}
        <div
          className={`bg-white rounded-2xl border p-6 shadow-xs relative ${
            res.better === 'new' ? 'border-[#1E8E5A] ring-2 ring-[#1E8E5A]/20' : 'border-[#E6E8EC]'
          }`}
        >
          {res.better === 'new' && (
            <span className="absolute top-4 right-4 bg-[#1E8E5A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Recommended
            </span>
          )}
          <h4 className="font-black text-lg text-[#20242B] mb-1">
            {lang === 'ta' ? 'புதிய வரி முறை (New Regime)' : 'New Tax Regime (Default)'}
          </h4>
          <p className="text-xs text-[#566070] mb-4">Standard Deduction ₹75,000 • FY 2026-27 Slabs</p>

          <div className="space-y-3 text-xs divide-y divide-[#E6E8EC]">
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Gross Income:</span>
              <span className="font-mono font-bold">₹{grossIncome.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Standard Deduction:</span>
              <span className="font-mono font-bold text-[#1E8E5A]">-₹75,000</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Taxable Income:</span>
              <span className="font-mono font-bold">₹{res.newRegime.taxableIncome.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Tax before Cess:</span>
              <span className="font-mono">₹{res.newRegime.taxBeforeCess.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Rebate u/s 87A:</span>
              <span className="font-mono text-[#1E8E5A]">-₹{res.newRegime.rebate87A.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Health &amp; Edu Cess (4%):</span>
              <span className="font-mono">₹{res.newRegime.cess.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-3 text-base font-black text-[#20242B]">
              <span>மொத்த வரி (Total Tax):</span>
              <span className="font-mono text-[#3752A6]">₹{res.newRegime.totalTax.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Old Regime */}
        <div
          className={`bg-white rounded-2xl border p-6 shadow-xs relative ${
            res.better === 'old' ? 'border-[#3752A6] ring-2 ring-[#3752A6]/20' : 'border-[#E6E8EC]'
          }`}
        >
          {res.better === 'old' && (
            <span className="absolute top-4 right-4 bg-[#3752A6] text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Recommended
            </span>
          )}
          <h4 className="font-black text-lg text-[#20242B] mb-1">
            {lang === 'ta' ? 'பழைய வரி முறை (Old Regime)' : 'Old Tax Regime'}
          </h4>
          <p className="text-xs text-[#566070] mb-4">Standard Deduction ₹50,000 + 80C, 80D, HRA</p>

          <div className="space-y-3 text-xs divide-y divide-[#E6E8EC]">
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Gross Income:</span>
              <span className="font-mono font-bold">₹{grossIncome.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Total Deductions (Std + 80C + 80D + HRA):</span>
              <span className="font-mono font-bold text-[#1E8E5A]">
                -₹{(50000 + Math.min(150000, ded80C) + Math.min(75000, ded80D) + hraExempt).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Taxable Income:</span>
              <span className="font-mono font-bold">₹{res.oldRegime.taxableIncome.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Tax before Cess:</span>
              <span className="font-mono">₹{res.oldRegime.taxBeforeCess.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Rebate u/s 87A:</span>
              <span className="font-mono text-[#1E8E5A]">-₹{res.oldRegime.rebate87A.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-[#566070]">Health &amp; Edu Cess (4%):</span>
              <span className="font-mono">₹{res.oldRegime.cess.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-3 text-base font-black text-[#20242B]">
              <span>மொத்த வரி (Total Tax):</span>
              <span className="font-mono text-[#3752A6]">₹{res.oldRegime.totalTax.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
