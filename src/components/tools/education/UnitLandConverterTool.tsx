import React, { useState } from 'react';
import { convertLandArea } from '../../../utils/billingCalc';
import { AppLanguage } from '../../../types';

interface UnitLandConverterToolProps {
  lang: AppLanguage;
}

export const UnitLandConverterTool: React.FC<UnitLandConverterToolProps> = ({ lang }) => {
  const [val, setVal] = useState<number>(1);
  const [fromUnit, setFromUnit] = useState<string>('cent');

  const res = convertLandArea(val, fromUnit);

  const units = [
    { id: 'cent', nameTa: 'சென்ட் (Cent)', nameEn: 'Cent (435.6 sq ft)' },
    { id: 'ground', nameTa: 'கிரவுண்ட் (Ground)', nameEn: 'Ground (2,400 sq ft)' },
    { id: 'acre', nameTa: 'ஏக்கர் (Acre)', nameEn: 'Acre (100 cents / 43,560 sq ft)' },
    { id: 'kuzhi', nameTa: 'குழி (Kuzhi)', nameEn: 'Kuzhi (144 sq ft)' },
    { id: 'sqft', nameTa: 'சதுர அடி (Sq Ft)', nameEn: 'Square Feet' },
    { id: 'hectare', nameTa: 'ஹெக்டேர் (Hectare)', nameEn: 'Hectare (2.47 acres)' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">📐</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta'
                ? 'நில அளவு மாற்றி (சென்ட், ஏக்ர், கிரவுண்ட், குழி)'
                : 'Tamil Nadu Land Area Converter'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? 'தமிழகப் பாரம்பரிய மற்றும் அரசு ஆவண நில அளவீடுகளின் துல்லியமான கணக்கீடு'
                : 'Cent, Acre, Ground, Kuzhi, Square Feet and Hectare conversion'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">அளவை உள்ளிடவும் (Value):</label>
            <input
              type="number"
              value={val || ''}
              onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#0B7285] rounded-xl p-3 font-mono font-black text-base text-[#20242B]"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">அளவீட்டு அலகு (From Unit):</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-3 font-bold text-sm text-[#20242B]"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {lang === 'ta' ? u.nameTa : u.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conversion Result Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-4 text-center shadow-2xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">சென்ட் (Cent)</div>
          <div className="text-xl sm:text-2xl font-black text-[#0B7285] font-mono">{res.cent}</div>
          <div className="text-[10px] text-[#566070] mt-1">1 Cent = 435.6 Sq Ft</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-4 text-center shadow-2xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">ஏக்கர் (Acre)</div>
          <div className="text-xl sm:text-2xl font-black text-[#0B7285] font-mono">{res.acre}</div>
          <div className="text-[10px] text-[#566070] mt-1">1 Acre = 100 Cents</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-4 text-center shadow-2xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">கிரவுண்ட் (Ground)</div>
          <div className="text-xl sm:text-2xl font-black text-[#0B7285] font-mono">{res.ground}</div>
          <div className="text-[10px] text-[#566070] mt-1">1 Ground = 2,400 Sq Ft</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-4 text-center shadow-2xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">குழி (Kuzhi)</div>
          <div className="text-xl sm:text-2xl font-black text-[#0B7285] font-mono">{res.kuzhi}</div>
          <div className="text-[10px] text-[#566070] mt-1">1 Kuzhi = 144 Sq Ft</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-4 text-center shadow-2xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">சதுர அடி (Sq Ft)</div>
          <div className="text-xl sm:text-2xl font-black text-[#0B7285] font-mono">{res.sqft.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-[#566070] mt-1">Square Feet</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-4 text-center shadow-2xs">
          <div className="text-xs font-bold text-[#566070] uppercase mb-1">ஹெக்டேர் (Hectare)</div>
          <div className="text-xl sm:text-2xl font-black text-[#0B7285] font-mono">{res.hectare}</div>
          <div className="text-[10px] text-[#566070] mt-1">1 Hectare ≈ 2.47 Acres</div>
        </div>
      </div>
    </div>
  );
};
