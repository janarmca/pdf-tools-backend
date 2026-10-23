import React from 'react';
import { AppLanguage } from '../../../types';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

interface StudentsHubProps {
  lang: AppLanguage;
  onSelectTool: (toolId: string) => void;
  onBack: () => void;
}

export const StudentsHub: React.FC<StudentsHubProps> = ({
  lang,
  onSelectTool,
  onBack,
}) => {
  const studentTools = [
    {
      id: 'studytimer',
      title: 'Study Timer (Pomodoro)',
      titleTa: 'படிப்பு நேரக் கடிகாரம்',
      desc: '25 min focus + 5 min break timer with daily study goal logs',
      icon: '⏱️',
    },
    {
      id: 'tneacutoff',
      title: 'TNEA Cut-off Calculator',
      titleTa: 'பொறியியல் கட்-ஆஃப் கணிப்பான்',
      desc: 'Anna University engineering admission cut-off out of 200 from 12th Maths, Physics, Chemistry',
      icon: '🎯',
    },
    {
      id: 'photoresize',
      title: 'Photo Resizer for Exam Forms',
      titleTa: 'தேர்வு புகைப்பட அளவு மாற்றி',
      desc: 'Resize photo or signature to exact KB limit and dimensions (UPSC, TNPSC, SSC, NEET)',
      icon: '📐',
    },
    {
      id: 'kalvikalanjiyam',
      title: 'Kalvi Kalanjiyam (Class 1–10)',
      titleTa: 'கல்விக் களஞ்சியம் (1–10 ஆம் வகுப்பு)',
      desc: 'Free Tamil Samacheer syllabus lessons, experiments & quiz games in Tamil',
      icon: '📚',
    },
    {
      id: 'tamiltyping',
      title: 'Tamil Typing (Tanglish to Tamil)',
      titleTa: 'தமிழ் தட்டச்சு (தங்கிலீஷ் வழியில்)',
      desc: 'Type phonetically in English (vanakkam -> வணக்கம்) for school/college projects and assignments',
      icon: '⌨️',
    },
    {
      id: 'leaveletter',
      title: 'Leave Application Letter',
      titleTa: 'விடுப்பு விண்ணப்பக் கடிதம்',
      desc: 'Ready-made leave letters for school and college students in Tamil and English',
      icon: '📝',
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

      <div className="rounded-3xl bg-gradient-to-r from-[#1A5D8A] to-[#2E86AB] text-white p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">
          <span>🎓</span>
          <span>{lang === 'ta' ? 'மாணவர்களுக்காக' : 'For Students'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">
          {lang === 'ta' ? 'பள்ளி & கல்லூரி மாணவர்கள் பக்கம்' : 'Students Hub & Learning Tools'}
        </h2>
        <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-2xl leading-relaxed">
          {lang === 'ta'
            ? 'பொறியியல் கட்-ஆஃப், படிப்பு நேரக் கடிகாரம், தேர்வு விண்ணப்ப புகைப்பட அளவு மாற்றி மற்றும் தமிழ் தட்டச்சு.'
            : 'Engineering cut-off calculators, Pomodoro study timer, exam photo resizers and Tamil typing.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {studentTools.map((t) => (
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
