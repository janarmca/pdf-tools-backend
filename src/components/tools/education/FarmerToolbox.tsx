import React, { useState } from 'react';
import { AppLanguage } from '../../../types';
import { Sprout, Calculator, Droplets, Coins } from 'lucide-react';

interface FarmerToolboxProps {
  lang: AppLanguage;
}

export const FarmerToolbox: React.FC<FarmerToolboxProps> = ({ lang }) => {
  const [tab, setTab] = useState<'fertilizer' | 'spray' | 'cost'>('fertilizer');

  // Fertilizer calculator states
  const [acres, setAcres] = useState<number>(1);
  const [soilType, setSoilType] = useState<'delta' | 'other'>('delta');

  // TNAU recommended N:P:K for transplanted rice in kg/hectare (1 ha = 2.47 acres)
  // Per acre approx: N 60kg, P 20kg, K 20kg
  // 1 bag DAP (50kg) has 9kg N, 23kg P
  // Urea (50kg) has 23kg N
  // MOP (50kg) has 30kg K
  const dapBags = Math.max(1, Math.round(acres * 1.0));
  const ureaBags = Math.max(1, Math.round(acres * 2.2));
  const mopBags = Math.max(1, Math.round(acres * 0.7));

  // Spray mix states
  const [recDosePerLiter, setRecDosePerLiter] = useState<number>(2.5); // ml/L
  const [tankSize, setTankSize] = useState<number>(16); // 16 Liter knapsack
  const sprayPerTank = recDosePerLiter * tankSize;

  // Cost & Break-even states
  const [plowingCost, setPlowingCost] = useState<number>(3500);
  const [seedFertilizerCost, setSeedFertilizerCost] = useState<number>(6000);
  const [harvestCost, setHarvestCost] = useState<number>(4500);
  const [laborCost, setLaborCost] = useState<number>(5000);
  const [expectedBags, setExpectedBags] = useState<number>(35); // 35 bags of 75kg
  const [pricePerBag, setPricePerBag] = useState<number>(1600); // ₹1600 per bag

  const totalCost = plowingCost + seedFertilizerCost + harvestCost + laborCost;
  const totalRevenue = expectedBags * pricePerBag;
  const netProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🌾</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'உழவர் கருவிகள் (Farmer Toolbox)' : 'Farmer Agriculture Toolbox'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழக (TNAU) பரிந்துரைப்படி நெல் உரம், தெளிப்பான் மருந்து & வரவு செலவு'
                : 'Scientific fertilizer estimation (TNAU norms), knapsack spray ratio and crop break-even'}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-[#CBD6F2] p-1 bg-[#F8FAFF] text-xs font-extrabold">
          <button
            onClick={() => setTab('fertilizer')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'fertilizer' ? 'bg-[#2F7D32] text-white shadow-xs' : 'text-[#566070]'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>நெல் உரக் கணக்கீடு (Fertilizer)</span>
          </button>
          <button
            onClick={() => setTab('spray')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'spray' ? 'bg-[#2F7D32] text-white shadow-xs' : 'text-[#566070]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>தெளிப்பான் மருந்து (Spray Mix)</span>
          </button>
          <button
            onClick={() => setTab('cost')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'cost' ? 'bg-[#2F7D32] text-white shadow-xs' : 'text-[#566070]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>சாகுபடி செலவு &amp; லாபம்</span>
          </button>
        </div>

        {/* Tab 1: Fertilizer */}
        {tab === 'fertilizer' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <label className="block text-[#566070] mb-1 font-bold">நிலப்பரப்பு (ஏக்கர் / Acre):</label>
                <input
                  type="number"
                  step="0.5"
                  value={acres}
                  onChange={(e) => setAcres(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-black text-base text-[#20242B]"
                />
              </div>

              <div>
                <label className="block text-[#566070] mb-1 font-bold">மண் / பகுதி வகை:</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value as any)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#20242B]"
                >
                  <option value="delta">காவிரி டெல்டா மண்டலம் (Delta Tract)</option>
                  <option value="other">இதர மண்டலங்கள் (Other Tracts)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="bg-[#E8F8EE] border border-[#B9E9CA] p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-[#0D5C2E] uppercase block mb-1">
                  டி.ஏ.பி (DAP - 50 kg)
                </span>
                <span className="text-2xl font-black text-[#0D5C2E] font-mono">
                  {dapBags} மூட்டை
                </span>
                <span className="text-[11px] text-[#566070] block mt-1">அடி உரமாக இடவும்</span>
              </div>

              <div className="bg-[#EEF2FF] border border-[#C4D3FA] p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-[#1E3A8A] uppercase block mb-1">
                  யுரியா (Urea - 50 kg)
                </span>
                <span className="text-2xl font-black text-[#1E3A8A] font-mono">
                  {ureaBags} மூட்டை
                </span>
                <span className="text-[11px] text-[#566070] block mt-1">3 பிரிவுகளாக இடவும்</span>
              </div>

              <div className="bg-[#FFF8EE] border border-[#FDE6B8] p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-[#9A6700] uppercase block mb-1">
                  பொட்டாஷ் (MOP - 50 kg)
                </span>
                <span className="text-2xl font-black text-[#9A6700] font-mono">
                  {mopBags} மூட்டை
                </span>
                <span className="text-[11px] text-[#566070] block mt-1">அடி உரம் &amp; கதிர் பருவத்தில்</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Spray */}
        {tab === 'spray' && (
          <div className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#566070] mb-1 font-bold">
                  மருந்து பரிந்துரை அளவு (மிலி / லிட்டருக்கு):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={recDosePerLiter}
                  onChange={(e) => setRecDosePerLiter(parseFloat(e.target.value) || 1)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block text-[#566070] mb-1 font-bold">தெளிப்பான் டேங்க் கொள்ளளவு (லிட்டர்):</label>
                <select
                  value={tankSize}
                  onChange={(e) => setTankSize(parseInt(e.target.value, 10))}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
                >
                  <option value="16">16 லிட்டர் (கை தெளிப்பான் / Battery Tank)</option>
                  <option value="10">10 லிட்டர்</option>
                  <option value="20">20 லிட்டர் (Power Sprayer)</option>
                </select>
              </div>
            </div>

            <div className="bg-[#E8F8EE] border-2 border-[#1E8E5A] rounded-xl p-5 text-center">
              <span className="text-xs font-bold text-[#0D5C2E] uppercase block mb-1">
                ஒரு டேங்கிற்கு சேர்க்க வேண்டிய மருந்து அளவு:
              </span>
              <span className="text-3xl font-black text-[#1E8E5A] font-mono">
                {sprayPerTank.toFixed(1)} மிலி (ml) / கிராம்
              </span>
              <p className="text-xs text-[#566070] mt-2">
                {tankSize} லிட்டர் தண்ணீரில் {sprayPerTank} மிலி மருந்தை நன்கு கலக்கவும்.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Cost */}
        {tab === 'cost' && (
          <div className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[#566070] mb-1">உழவு &amp; நாற்று (₹):</label>
                <input
                  type="number"
                  value={plowingCost}
                  onChange={(e) => setPlowingCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-[#566070] mb-1">விதை &amp; உரம் (₹):</label>
                <input
                  type="number"
                  value={seedFertilizerCost}
                  onChange={(e) => setSeedFertilizerCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-[#566070] mb-1">களை &amp; ஆட்கள் கூலி (₹):</label>
                <input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="block text-[#566070] mb-1">அறுவடை மெஷின் (₹):</label>
                <input
                  type="number"
                  value={harvestCost}
                  onChange={(e) => setHarvestCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-lg p-2 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[#566070] mb-1">விளைச்சல் மூட்டைகள் (75kg Bags):</label>
                <input
                  type="number"
                  value={expectedBags}
                  onChange={(e) => setExpectedBags(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-lg p-2 font-bold"
                />
              </div>
              <div>
                <label className="block text-[#566070] mb-1">ஒரு மூட்டை விலை (₹):</label>
                <input
                  type="number"
                  value={pricePerBag}
                  onChange={(e) => setPricePerBag(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-lg p-2 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-2">
              <div className="bg-[#F8FAFF] border border-[#CBD6F2] p-3.5 rounded-xl">
                <span className="text-[11px] text-[#566070] block">மொத்த சாகுபடி செலவு:</span>
                <span className="font-mono font-black text-base text-[#C0392B]">
                  ₹{totalCost.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-[#F8FAFF] border border-[#CBD6F2] p-3.5 rounded-xl">
                <span className="text-[11px] text-[#566070] block">மொத்த வருவாய்:</span>
                <span className="font-mono font-black text-base text-[#1E8E5A]">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-[#E8F8EE] border border-[#B9E9CA] p-3.5 rounded-xl">
                <span className="text-[11px] text-[#0D5C2E] font-bold block">நிகர லாபம் (Profit):</span>
                <span className="font-mono font-black text-lg text-[#0D5C2E]">
                  ₹{netProfit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
