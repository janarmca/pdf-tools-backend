import React, { useState } from 'react';
import { AppLanguage } from '../../../types';
import { Printer, Share2, Upload } from 'lucide-react';
import { getWhatsAppShareUrl } from '../../../utils/pdfHelper';

interface BiodataMakerToolProps {
  lang: AppLanguage;
}

export const BiodataMakerTool: React.FC<BiodataMakerToolProps> = ({ lang }) => {
  const [name, setName] = useState('S. Soundarya');
  const [dob, setDob] = useState('15/06/1998');
  const [time, setTime] = useState('10:45 AM');
  const [pob, setPob] = useState('Coimbatore');
  const [raasi, setRaasi] = useState('கும்பம் (Aquarius)');
  const [star, setStar] = useState('சதயம் (Satabhisha)');
  const [kulam, setKulam] = useState('தேவாங்கர் (Devanga)');
  const [height, setHeight] = useState('5 ft 4 in');
  const [education, setEducation] = useState('B.E. Computer Science, Anna University');
  const [occupation, setOccupation] = useState('Senior Software Engineer at MNC, Chennai');
  const [salary, setSalary] = useState('₹14,00,000 per annum');
  const [father, setFather] = useState('K. Subramanian (Retired Government Official)');
  const [mother, setMother] = useState('S. Lakshmi (Homemaker)');
  const [siblings, setSiblings] = useState('1 Younger Brother (Studying MBA)');
  const [contactPhone, setContactPhone] = useState('9876543210');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8EC] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💍</span>
            <div>
              <h3 className="font-black text-lg text-[#20242B]">
                {lang === 'ta' ? 'திருமணப் பயோடேட்டா தயாரிப்பாளர்' : 'Marriage Biodata Maker'}
              </h3>
              <p className="text-xs text-[#566070]">
                {lang === 'ta'
                  ? 'புகைப்படம், ஜாதகக் குறிப்பு மற்றும் குடும்ப விவரங்களுடன் சுத்தமான பயோடேட்டா அச்சிட'
                  : 'Clean, printable marriage biodata with photo, horoscope and family details'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-[#9C1F4E] hover:bg-[#7A1233] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              {lang === 'ta' ? 'அச்சிடு / PDF சேமி' : 'Print / Save PDF'}
            </button>
            <a
              href={getWhatsAppShareUrl('Marriage Biodata')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </a>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">முழுப் பெயர் (Full Name)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பிறந்த தேதி (Date of Birth)</label>
            <input
              type="text"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பிறந்த நேரம் &amp; இடம்</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-1/2 bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
              />
              <input
                type="text"
                placeholder="Place"
                value={pob}
                onChange={(e) => setPob(e.target.value)}
                className="w-1/2 bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">ராசி (Raasi)</label>
            <input
              type="text"
              value={raasi}
              onChange={(e) => setRaasi(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">நட்சத்திரம் (Star / Nakshatra)</label>
            <input
              type="text"
              value={star}
              onChange={(e) => setStar(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">சமூகம் / குலம் (Community/Gotra)</label>
            <input
              type="text"
              value={kulam}
              onChange={(e) => setKulam(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">படிப்பு (Education)</label>
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">வேலை (Occupation &amp; Company)</label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">ஆண்டு வருமானம் (Income)</label>
            <input
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">தந்தை பெயர் &amp; பணி</label>
            <input
              type="text"
              value={father}
              onChange={(e) => setFather(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">தாய் பெயர் &amp; பணி</label>
            <input
              type="text"
              value={mother}
              onChange={(e) => setMother(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">உடன்பிறப்புகள் (Siblings)</label>
            <input
              type="text"
              value={siblings}
              onChange={(e) => setSiblings(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[#566070] mb-1 font-bold">தொடர்பு எண் (Phone Number)</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">புகைப்படம் பதிவேற்ற (Photo)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border-2 border-[#CBD6F2] rounded-2xl p-8 sm:p-12 shadow-md max-w-3xl mx-auto print:border-none print:shadow-none print:p-0 text-[#20242B]">
        <div className="border-4 border-double border-[#9C1F4E] p-8 rounded-2xl relative">
          <div className="text-center pb-4 mb-6 border-b-2 border-[#9C1F4E]">
            <div className="text-xl font-black text-[#9C1F4E] tracking-widest uppercase">
              || ஸ்ரீ விநாயகர் துணை ||
            </div>
            <h1 className="text-2xl font-black text-[#20242B] mt-1 uppercase">
              திருமணப் பயோடேட்டா / BIODATA
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-8">
            <div className="space-y-2 text-sm flex-1">
              <div className="text-xl font-black text-[#9C1F4E]">{name}</div>
              <div className="text-xs text-[#566070] font-bold">
                {education} • {occupation}
              </div>
            </div>

            {photoUrl ? (
              <div className="w-32 h-40 border-2 border-[#9C1F4E] rounded-xl overflow-hidden shrink-0 shadow-sm">
                <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-36 border border-dashed border-[#CBD6F2] rounded-xl flex items-center justify-center text-[10px] text-[#566070] text-center p-2 shrink-0">
                Photo Space
              </div>
            )}
          </div>

          {/* Details Tables */}
          <div className="space-y-6 text-xs">
            {/* Personal & Horoscope */}
            <div>
              <div className="bg-[#FFF1F4] text-[#9C1F4E] font-black p-2 rounded-lg uppercase tracking-wider mb-2">
                1. தனிப்பட்ட &amp; ஜாதக விவரங்கள் (Personal &amp; Horoscope Details)
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 p-2">
                <div><span className="text-[#566070]">பிறந்த தேதி (DOB):</span> <b>{dob}</b></div>
                <div><span className="text-[#566070]">பிறந்த நேரம் &amp; இடம்:</span> <b>{time}, {pob}</b></div>
                <div><span className="text-[#566070]">ராசி (Raasi):</span> <b>{raasi}</b></div>
                <div><span className="text-[#566070]">நட்சத்திரம் (Star):</span> <b>{star}</b></div>
                <div><span className="text-[#566070]">சமூகம் &amp; குலம்:</span> <b>{kulam}</b></div>
                <div><span className="text-[#566070]">உயரம் (Height):</span> <b>{height}</b></div>
              </div>
            </div>

            {/* Education & Career */}
            <div>
              <div className="bg-[#FFF1F4] text-[#9C1F4E] font-black p-2 rounded-lg uppercase tracking-wider mb-2">
                2. கல்வி &amp; தொழில் (Education &amp; Career)
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 p-2">
                <div className="col-span-2"><span className="text-[#566070]">படிப்பு (Degree):</span> <b>{education}</b></div>
                <div><span className="text-[#566070]">பணி (Occupation):</span> <b>{occupation}</b></div>
                <div><span className="text-[#566070]">வருமானம் (Salary):</span> <b>{salary}</b></div>
              </div>
            </div>

            {/* Family Details */}
            <div>
              <div className="bg-[#FFF1F4] text-[#9C1F4E] font-black p-2 rounded-lg uppercase tracking-wider mb-2">
                3. குடும்ப விவரங்கள் (Family Details)
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 p-2">
                <div className="col-span-2"><span className="text-[#566070]">தந்தை:</span> <b>{father}</b></div>
                <div className="col-span-2"><span className="text-[#566070]">தாய்:</span> <b>{mother}</b></div>
                <div className="col-span-2"><span className="text-[#566070]">உடன்பிறப்புகள்:</span> <b>{siblings}</b></div>
                <div className="col-span-2 pt-2 border-t border-[#E6E8EC]">
                  <span className="text-[#566070]">தொடர்புக்கு (Contact):</span> <b className="font-mono text-sm text-[#9C1F4E]">{contactPhone}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
