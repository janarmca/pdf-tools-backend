import React, { useState } from 'react';
import { AppLanguage } from '../../../types';
import { Copy, Check, Printer, FileText } from 'lucide-react';

interface LeaveLetterToolProps {
  lang: AppLanguage;
}

export const LeaveLetterTool: React.FC<LeaveLetterToolProps> = ({ lang }) => {
  const [applicantType, setApplicantType] = useState<'employee' | 'student'>('employee');
  const [letterLang, setLetterLang] = useState<'ta' | 'en' | 'bi'>('ta');
  const [name, setName] = useState('K. Saravanan');
  const [role, setRole] = useState('Software Engineer / Grade 10-A');
  const [recipientTitle, setRecipientTitle] = useState('The Manager / The Principal');
  const [companySchool, setCompanySchool] = useState('ABC Infotech / Govt Higher Secondary School, Chennai');
  const [reason, setReason] = useState<'sick' | 'personal' | 'function' | 'exam'>('sick');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  const getReasonText = (l: 'ta' | 'en') => {
    if (l === 'ta') {
      switch (reason) {
        case 'sick': return 'திடீர் உடல்நலக்குறைவு (காய்ச்சல்) காரணமாக';
        case 'personal': return 'குடும்பத்தின் தவிர்க்க முடியாத முக்கிய காரியம் காரணமாக';
        case 'function': return 'குடும்பத்தில் நடைபெறும் சுப நிகழ்ச்சி காரணமாக';
        case 'exam': return 'தேர்வு எழுதச் செல்ல வேண்டியிருப்பதால்';
      }
    } else {
      switch (reason) {
        case 'sick': return 'due to sudden fever and medical advice to rest';
        case 'personal': return 'due to urgent and unavoidable personal family matters';
        case 'function': return 'to attend an auspicious family function';
        case 'exam': return 'to appear for competitive examination';
      }
    }
  };

  const getEnglishLetter = () => `Date: ${new Date().toLocaleDateString('en-GB')}

To:
${recipientTitle},
${companySchool}.

Respected Sir / Madam,

Subject: Leave Application for ${fromDate === toDate ? `1 day (${fromDate})` : `${fromDate} to ${toDate}`} - Reg.

I would like to bring to your kind notice that I am unable to attend ${applicantType === 'employee' ? 'office' : 'classes'} from ${fromDate} to ${toDate} ${getReasonText('en')}.

Hence, I kindly request you to grant me leave of absence for the above mentioned period. I will ensure all pending ${applicantType === 'employee' ? 'tasks' : 'lessons'} are completed promptly upon my return.

Thanking you,

Yours faithfully,
${name}
(${role})`;

  const getTamilLetter = () => `தேதி: ${new Date().toLocaleDateString('en-GB')}

பெறுநர்:
${recipientTitle},
${companySchool}.

மதிப்பிற்குரிய ஐயா / அம்மா,

பொருள்: விடுப்பு வேண்டி விண்ணப்பம் - தொடர்பாக.

வணக்கம். ${getReasonText('ta')}, என்னால் ${fromDate} முதல் ${toDate} வரை ${applicantType === 'employee' ? 'பணிக்கு' : 'பள்ளிக்கு'} வர இயலாது என்பதைத் பணிவுடன் தெரிவித்துக் கொள்கிறேன்.

ஆகவே, மேற்கண்ட நாட்களில் எனக்கு விடுப்பு அளித்து உதவுமாறு பணிவுடன் கேட்டுக்கொள்கிறேன்.

நன்றி,

இப்படிக்கு தங்கள் உண்மையுள்ள,
${name}
(${role})`;

  const fullLetter =
    letterLang === 'ta'
      ? getTamilLetter()
      : letterLang === 'en'
      ? getEnglishLetter()
      : `${getEnglishLetter()}\n\n----------------- தமிழில் (Tamil Version) -----------------\n\n${getTamilLetter()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8EC] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h3 className="font-black text-lg text-[#20242B]">
                {lang === 'ta' ? 'விடுப்பு விண்ணப்பக் கடிதம் தயாரிப்பாளர்' : 'Leave Application Letter Generator'}
              </h3>
              <p className="text-xs text-[#566070]">
                {lang === 'ta' ? 'பள்ளி மற்றும் அலுவலக விடுப்பு விண்ணப்பம் தமிழ் & ஆங்கிலத்தில்' : 'Ready-made formal leave application for school, college & office'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="bg-[#3752A6] hover:bg-[#28407F] text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (lang === 'ta' ? 'நகலெடு (Copy)' : 'Copy Letter')}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-[#2E86AB] hover:bg-[#206886] text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              {lang === 'ta' ? 'அச்சிடு' : 'Print'}
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">விண்ணப்பதாரர் வகை</label>
            <select
              value={applicantType}
              onChange={(e) => setApplicantType(e.target.value as any)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            >
              <option value="employee">அலுவலக பணியாளர் (Employee)</option>
              <option value="student">பள்ளி / கல்லூரி மாணவர் (Student)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">மொழி / Language</label>
            <select
              value={letterLang}
              onChange={(e) => setLetterLang(e.target.value as any)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#3752A6]"
            >
              <option value="ta">தமிழ் மட்டும் (Tamil)</option>
              <option value="en">English Only</option>
              <option value="bi">இரு மொழிகளிலும் (Bilingual)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">விடுப்பு காரணம் (Reason)</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            >
              <option value="sick">உடல்நலக்குறைவு (Medical / Sick)</option>
              <option value="personal">தனிப்பட்ட காரணம் (Personal)</option>
              <option value="function">சுப நிகழ்ச்சி (Family Function)</option>
              <option value="exam">தேர்வு எழுதுதல் (Exam)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">உங்கள் பெயர்</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பதவி / வகுப்பு (Role/Class)</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பெறுநர் (Manager/Principal)</label>
            <input
              type="text"
              value={recipientTitle}
              onChange={(e) => setRecipientTitle(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">தொடக்கத் தேதி (From Date)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">முடிவுத் தேதி (To Date)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">நிறுவனம் / பள்ளி பெயர்</label>
            <input
              type="text"
              value={companySchool}
              onChange={(e) => setCompanySchool(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>
        </div>
      </div>

      {/* Letter Preview Sheet */}
      <div className="bg-white border border-[#CBD6F2] rounded-2xl p-8 sm:p-12 shadow-sm max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
        <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-[#20242B]">
          {fullLetter}
        </pre>
      </div>
    </div>
  );
};
