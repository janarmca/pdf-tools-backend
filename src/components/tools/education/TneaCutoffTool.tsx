import React, { useState } from 'react';
import { AppLanguage } from '../../../types';
import { Target, Award, CheckCircle2 } from 'lucide-react';

interface TneaCutoffToolProps {
  lang: AppLanguage;
}

export const TneaCutoffTool: React.FC<TneaCutoffToolProps> = ({ lang }) => {
  const [maths, setMaths] = useState<number>(95);
  const [physics, setPhysics] = useState<number>(92);
  const [chemistry, setChemistry] = useState<number>(90);

  // TNEA Formula: Maths + (Physics/2) + (Chemistry/2) -> Max 200
  const cutoff = (maths || 0) + ((physics || 0) / 2) + ((chemistry || 0) / 2);
  const totalMarks = (maths || 0) + (physics || 0) + (chemistry || 0);
  const percentage = (totalMarks / 300) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-[#E6E8EC] pb-4">
          <span className="text-2xl">🎯</span>
          <div>
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'பொறியியல் கட்-ஆஃப் கணிப்பான் (TNEA Cut-off)' : 'TNEA Engineering Cut-off Calculator'}
            </h3>
            <p className="text-xs text-[#566070]">
              {lang === 'ta'
                ? '12-ஆம் வகுப்பு கணிதம், இயற்பியல், வேதியியல் மதிப்பெண்களில் கட்-ஆஃப் (200-க்கு)'
                : 'Calculate your engineering admission cut-off mark out of 200 based on Anna University TNEA norms'}
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">கணிதம் / Mathematics (Max 100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={maths || ''}
              onChange={(e) => setMaths(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#0B7285] rounded-xl p-3 font-mono font-black text-base text-[#20242B]"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">இயற்பியல் / Physics (Max 100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={physics || ''}
              onChange={(e) => setPhysics(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#0B7285] rounded-xl p-3 font-mono font-black text-base text-[#20242B]"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">வேதியியல் / Chemistry (Max 100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={chemistry || ''}
              onChange={(e) => setChemistry(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full bg-[#F8FAFF] border-2 border-[#CBD6F2] focus:border-[#0B7285] rounded-xl p-3 font-mono font-black text-base text-[#20242B]"
            />
          </div>
        </div>
      </div>

      {/* Results Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-gradient-to-br from-[#0B7285] to-[#085260] text-white rounded-2xl p-6 shadow-md col-span-1 sm:col-span-2 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider opacity-90">
              உங்கள் TNEA கட்-ஆஃப் மதிப்பெண்
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono my-2">
              {cutoff.toFixed(2)}
              <span className="text-xl font-normal opacity-80"> / 200</span>
            </div>
          </div>
          <div className="text-xs opacity-90 font-medium">
            Formula: கணிதம் (100) + [இயற்பியல் (50) + வேதியியல் (50)] = 200
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#CBD6F2] p-6 shadow-xs flex flex-col justify-center">
          <span className="text-xs font-bold text-[#566070] uppercase mb-1">
            PCM மொத்த சதவீதம்
          </span>
          <div className="text-3xl font-black text-[#20242B] font-mono">
            {percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-[#566070] mt-1 font-semibold">
            {totalMarks} / 300 Marks
          </div>
        </div>
      </div>
    </div>
  );
};
