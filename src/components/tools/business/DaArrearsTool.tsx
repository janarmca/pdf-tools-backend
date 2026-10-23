import React, { useState } from 'react';
import { calculateDAArrears } from '../../../utils/billingCalc';
import { AppLanguage } from '../../../types';

interface DaArrearsToolProps {
  lang: AppLanguage;
}

export const DaArrearsTool: React.FC<DaArrearsToolProps> = ({ lang }) => {
  const [basicPay, setBasicPay] = useState<number>(45000);
  const [oldDa, setOldDa] = useState<number>(50); // e.g. 50%
  const [newDa, setNewDa] = useState<number>(54); // e.g. 54%
  const [months, setMonths] = useState<number>(3); // 3 months arrears

  const { diffPerMonth, totalArrears } = calculateDAArrears(basicPay, oldDa, newDa, months);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🧾</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'அகவிலைப்படி நிலுவைத்தொகை கணிப்பான்' : 'DA / DR Arrears Calculator'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'அரசு ஊழியர்கள் & ஓய்வூதியர்களுக்கான அகவிலைப்படி (DA/DR) உயர்வு நிலுவைத் தொகை'
                : 'Calculate month-by-month DA / DR arrears when the dearness allowance rate increases'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">அடிப்படை ஊதியம் / Basic Pay (₹)</label>
            <input
              type="number"
              value={basicPay || ''}
              onChange={(e) => setBasicPay(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-black text-base text-[#20242B] font-mono"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">நிலுவை மாதங்கள் / Months</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பழைய DA விகிதம் / Old DA (%)</label>
            <input
              type="number"
              value={oldDa}
              onChange={(e) => setOldDa(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">புதிய DA விகிதம் / New DA (%)</label>
            <input
              type="number"
              value={newDa}
              onChange={(e) => setNewDa(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#1E8E5A]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs text-center">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">
            மாதாந்திர DA உயர்வு / Increase Per Month ({newDa - oldDa}%)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#3752A6] font-mono">
            ₹{diffPerMonth.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs text-center">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">
            மொத்த நிலுவைத் தொகை ({months} Months Arrears)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1E8E5A] font-mono">
            ₹{totalArrears.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};
