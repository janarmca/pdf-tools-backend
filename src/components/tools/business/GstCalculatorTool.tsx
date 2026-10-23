import React, { useState } from 'react';
import { AppLanguage } from '../../../types';

interface GstCalculatorToolProps {
  lang: AppLanguage;
}

export const GstCalculatorTool: React.FC<GstCalculatorToolProps> = ({ lang }) => {
  const [amount, setAmount] = useState<number>(10000);
  const [rate, setRate] = useState<number>(18);
  const [mode, setMode] = useState<'add' | 'remove'>('add');

  let baseAmount = 0;
  let gstAmount = 0;
  let totalAmount = 0;

  if (mode === 'add') {
    baseAmount = amount;
    gstAmount = (amount * rate) / 100;
    totalAmount = baseAmount + gstAmount;
  } else {
    totalAmount = amount;
    baseAmount = (amount * 100) / (100 + rate);
    gstAmount = totalAmount - baseAmount;
  }

  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🧾</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'ஜிஎஸ்டி கணிப்பான் (GST Calculator)' : 'GST Calculator'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'ஜிஎஸ்டி சேர்த்தல் அல்லது கழித்தல் மற்றும் மத்திய/மாநில வரி பிரித்தல்'
                : 'Add or remove GST with intra-state (CGST+SGST) and inter-state (IGST) split'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">கணக்கீட்டு முறை / Calculation Mode</label>
            <div className="flex rounded-xl overflow-hidden border border-[#CBD6F2] bg-[#F8FAFF]">
              <button
                onClick={() => setMode('add')}
                className={`flex-1 py-2.5 font-bold transition-colors ${
                  mode === 'add' ? 'bg-[#3752A6] text-white' : 'text-[#20242B] hover:bg-white'
                }`}
              >
                + GST சேர்க்க (Add GST)
              </button>
              <button
                onClick={() => setMode('remove')}
                className={`flex-1 py-2.5 font-bold transition-colors ${
                  mode === 'remove' ? 'bg-[#3752A6] text-white' : 'text-[#20242B] hover:bg-white'
                }`}
              >
                - GST கழிக்க (Remove GST)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">தொகை / Initial Amount (₹)</label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-black text-base text-[#20242B] font-mono"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">ஜிஎஸ்டி விகிதம் / GST Slab</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 12, 18, 28].map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`py-2 rounded-lg font-bold border text-xs transition-colors ${
                    rate === r
                      ? 'bg-[#E8894A] text-white border-[#E8894A]'
                      : 'bg-white border-[#CBD6F2] text-[#20242B] hover:bg-[#F8FAFF]'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">
            வரிக்கு முந்தைய தொகை (Net Amount)
          </div>
          <div className="text-2xl font-black text-[#20242B] font-mono">
            ₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">
            மொத்த ஜிஎஸ்டி ({rate}%)
          </div>
          <div className="text-2xl font-black text-[#E8894A] font-mono">
            ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#566070] mt-1">
            CGST ({rate / 2}%): ₹{cgst.toFixed(2)} | SGST ({rate / 2}%): ₹{sgst.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-5 shadow-xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">
            மொத்தத் தொகை (Gross Amount)
          </div>
          <div className="text-2xl font-black text-[#1E8E5A] font-mono">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
};
