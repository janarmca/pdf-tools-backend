import React, { useState } from 'react';
import { calculateEmi } from '../../../utils/billingCalc';
import { AppLanguage } from '../../../types';
import { Landmark, TrendingUp, IndianRupee } from 'lucide-react';

interface EmiCalculatorToolProps {
  lang: AppLanguage;
}

export const EmiCalculatorTool: React.FC<EmiCalculatorToolProps> = ({ lang }) => {
  const [principal, setPrincipal] = useState<number>(2500000); // 25 Lakhs
  const [interestRate, setInterestRate] = useState<number>(8.5); // 8.5%
  const [tenureYears, setTenureYears] = useState<number>(20); // 20 years

  const res = calculateEmi(principal, interestRate, tenureYears);
  const interestRatio = res.totalPayment > 0 ? (res.totalInterest / res.totalPayment) * 100 : 0;
  const principalRatio = 100 - interestRatio;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🏦</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'இஎம்ஐ & கடன் தவணைக் கணிப்பான்' : 'EMI & Loan Calculator'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'வீட்டுக் கடன், வாகனக் கடன் மற்றும் தனிநபர் கடன் மாதாந்திர தவணை கணக்கீடு'
                : 'Calculate monthly EMI, total interest and repayment breakdown for Home, Car & Personal Loans'}
            </p>
          </div>
        </div>

        {/* Sliders and number inputs */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-[#566070]">கடன் தொகை / Loan Amount:</span>
              <span className="font-mono text-base font-black text-[#3752A6]">
                ₹{principal.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="50000"
              max="10000000"
              step="50000"
              value={principal}
              onChange={(e) => setPrincipal(parseFloat(e.target.value))}
              className="w-full accent-[#3752A6]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-[#566070]">ஆண்டு வட்டி விகிதம் / Interest Rate (% p.a):</span>
              <span className="font-mono text-base font-black text-[#3752A6]">
                {interestRate}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="24"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(parseFloat(e.target.value))}
              className="w-full accent-[#3752A6]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-[#566070]">கால அளவு / Tenure (Years):</span>
              <span className="font-mono text-base font-black text-[#3752A6]">
                {tenureYears} {lang === 'ta' ? 'ஆண்டுகள்' : 'Years'} ({tenureYears * 12} மாதங்கள்)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={tenureYears}
              onChange={(e) => setTenureYears(parseInt(e.target.value, 10))}
              className="w-full accent-[#3752A6]"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs text-center">
          <div className="text-xs font-bold text-[#566070] uppercase tracking-wider mb-1">
            மாதாந்திர தவணை / Monthly EMI
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#3752A6] font-mono">
            ₹{res.monthlyEmi.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#566070] mt-1 font-semibold">Per Month</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs text-center">
          <div className="text-xs font-bold text-[#566070] uppercase tracking-wider mb-1">
            மொத்த வட்டி / Total Interest
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#E8894A] font-mono">
            ₹{res.totalInterest.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#566070] mt-1 font-semibold">{interestRatio.toFixed(1)}% of total</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs text-center">
          <div className="text-xs font-bold text-[#566070] uppercase tracking-wider mb-1">
            மொத்த திருப்பிச் செலுத்துதல் / Total
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1E8E5A] font-mono">
            ₹{res.totalPayment.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#566070] mt-1 font-semibold">Principal + Interest</div>
        </div>
      </div>

      {/* Visual Proportion Bar */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-5 shadow-xs space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[#3752A6]">அசல் தொகை (Principal): {principalRatio.toFixed(1)}%</span>
          <span className="text-[#E8894A]">வட்டி தொகை (Interest): {interestRatio.toFixed(1)}%</span>
        </div>
        <div className="w-full h-4 bg-[#F8FAFF] rounded-full overflow-hidden flex border border-[#E6E8EC]">
          <div style={{ width: `${principalRatio}%` }} className="bg-[#3752A6] h-full" />
          <div style={{ width: `${interestRatio}%` }} className="bg-[#E8894A] h-full" />
        </div>
      </div>
    </div>
  );
};
