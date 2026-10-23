import React, { useState } from 'react';
import { AppLanguage } from '../../../types';
import { BookOpen, Star, Award, CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface KalviKalanjiyamViewProps {
  lang: AppLanguage;
}

interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

const SAMPLE_QUIZ: Record<string, Question[]> = {
  science: [
    {
      q: 'தாவரங்கள் ஒளிச்சேர்க்கை (Photosynthesis) செய்ய எதனைப் பயன்படுத்துகின்றன?',
      options: ['சூரிய ஒளி, நீர், கார்பன்-டை-ஆக்சைடு', 'ஆக்சிஜன் மற்றும் நைட்ரஜன்', 'சூரிய ஒளி மட்டும்', 'மண் மற்றும் உரம் மட்டும்'],
      correct: 0,
      explanation: 'தாவரங்கள் பச்சையம் (Chlorophyll) மூலம் சூரிய ஒளி, நீர் மற்றும் காற்றில் உள்ள CO2-வை கொண்டு உணவு தயாரிக்கின்றன.',
    },
    {
      q: 'மனித உடலில் உள்ள இரத்தத்தில் ஆக்சிஜனை எடுத்துச் செல்லும் மூலக்கூறு எது?',
      options: ['ஹீமோகுளோபின் (Hemoglobin)', 'பிளாஸ்மா', 'வெள்ளை இரத்த அணுக்கள்', 'பிளேட்லெட்'],
      correct: 0,
      explanation: 'சிவப்பு இரத்த அணுக்களில் உள்ள ஹீமோகுளோபின் நுரையீரலில் இருந்து ஆக்சிஜனை அனைத்து செல்களுக்கும் எடுத்துச் செல்கிறது.',
    },
    {
      q: 'ஒலியானது (Sound) எதன் வழியே பயணிக்க முடியாது?',
      options: ['காற்று', 'நீர்', 'வெற்றிடம் (Vacuum)', 'இரும்பு'],
      correct: 2,
      explanation: 'ஒலி அலைகள் பரவ காற்று, நீர் போன்ற ஊடகம் அவசியம். வெற்றிடத்தில் ஊடகம் இல்லாததால் ஒலி பயணிக்காது.',
    },
  ],
  maths: [
    {
      q: 'ஒரு முக்கோணத்தின் (Triangle) மூன்று கோணங்களின் கூடுதல் என்ன?',
      options: ['90°', '180°', '360°', '270°'],
      correct: 1,
      explanation: 'எந்தவொரு முக்கோணத்தின் மூன்று உள் கோணங்களையும் கூட்டினால் 180° வரும்.',
    },
    {
      q: '25-ன் வர்க்கமூலம் (Square Root of 25) என்ன?',
      options: ['4', '5', '10', '12.5'],
      correct: 1,
      explanation: '5 × 5 = 25, எனவே 25-ன் வர்க்கமூலம் 5 ஆகும்.',
    },
  ],
};

export const KalviKalanjiyamView: React.FC<KalviKalanjiyamViewProps> = ({ lang }) => {
  const [selectedClass, setSelectedClass] = useState<number>(10);
  const [subject, setSubject] = useState<'science' | 'maths'>('science');
  const [currIdx, setCurrIdx] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const questions = SAMPLE_QUIZ[subject] || [];
  const currQ = questions[currIdx];

  const handleSelectOption = (idx: number) => {
    if (selectedOpt !== null) return; // already answered
    setSelectedOpt(idx);
    if (idx === currQ.correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currIdx < questions.length - 1) {
      setCurrIdx((i) => i + 1);
      setSelectedOpt(null);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrIdx(0);
    setSelectedOpt(null);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#3B2FC9] to-[#7B2CBF] text-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-2">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>100% இலவசம் • தமிழ்நாடு பாடத்திட்டம் (Samacheer)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">📚 கல்விக் களஞ்சியம்</h2>
            <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
              1 முதல் 10 ஆம் வகுப்பு வரை — தமிழில் விளையாடிக் கற்கும் இலவசக் களஞ்சியம். பதிவு இல்லை, கட்டணம் இல்லை.
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-center shrink-0">
            <div className="text-xs font-bold opacity-80">நட்சத்திரங்கள்</div>
            <div className="text-2xl font-black font-mono">⭐ {score * 10}</div>
          </div>
        </div>

        {/* Classes Bar */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="text-xs font-bold mb-2 opacity-90">வகுப்பைத் தேர்ந்தெடுக்கவும் (Class 1 to 10):</div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
              <button
                key={c}
                onClick={() => { setSelectedClass(c); handleRestart(); }}
                className={`w-10 h-10 rounded-xl font-black text-sm shrink-0 transition-transform ${
                  selectedClass === c
                    ? 'bg-white text-[#3B2FC9] scale-105 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subject switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSubject('science'); handleRestart(); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors ${
            subject === 'science' ? 'bg-[#0B7A75] text-white shadow-xs' : 'bg-white border border-[#CBD6F2] text-[#20242B]'
          }`}
        >
          🔬 அறிவியல் (Science)
        </button>
        <button
          onClick={() => { setSubject('maths'); handleRestart(); }}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors ${
            subject === 'maths' ? 'bg-[#3B2FC9] text-white shadow-xs' : 'bg-white border border-[#CBD6F2] text-[#20242B]'
          }`}
        >
          📐 கணிதம் (Maths)
        </button>
      </div>

      {/* Interactive Quiz Area */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 sm:p-8 shadow-xs">
        {!quizFinished && currQ ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center text-xs font-bold text-[#566070] border-b border-[#E6E8EC] pb-3">
              <span>{selectedClass}-ஆம் வகுப்பு {subject === 'science' ? 'அறிவியல்' : 'கணிதம்'} வினாடி வினா</span>
              <span>கேள்வி {currIdx + 1} / {questions.length}</span>
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-[#20242B] leading-snug">
              {currQ.q}
            </h3>

            <div className="space-y-2.5">
              {currQ.options.map((opt, idx) => {
                const isChosen = selectedOpt === idx;
                const isCorrect = idx === currQ.correct;

                let optClass = 'bg-[#F8FAFF] border-[#E6E8EC] text-[#20242B] hover:border-[#3B2FC9] hover:bg-white';
                if (selectedOpt !== null) {
                  if (isCorrect) {
                    optClass = 'bg-[#E8F8EE] border-[#1E8E5A] text-[#0D5C2E] font-bold';
                  } else if (isChosen) {
                    optClass = 'bg-[#FFEBEE] border-[#C0392B] text-[#C0392B] font-bold';
                  }
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(idx)}
                    disabled={selectedOpt !== null}
                    className={`w-full text-left p-4 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-between ${optClass}`}
                  >
                    <span>{opt}</span>
                    {selectedOpt !== null && (
                      <span>
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-[#1E8E5A]" />
                        ) : isChosen ? (
                          <XCircle className="w-5 h-5 text-[#C0392B]" />
                        ) : null}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <div className="p-4 rounded-xl bg-[#F0F4FF] border border-[#CBD6F2] text-xs space-y-2 animate-in fade-in">
                <div className="font-black text-[#3B2FC9]">விளக்கம் (Explanation):</div>
                <div className="text-[#20242B] leading-relaxed">{currQ.explanation}</div>
                <button
                  onClick={handleNext}
                  className="mt-2 bg-[#3B2FC9] hover:bg-[#2C21A5] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>{currIdx < questions.length - 1 ? 'அடுத்த கேள்வி' : 'முடிவுகளைக் காண்க'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">🏆</div>
            <h3 className="font-black text-2xl text-[#20242B]">வாழ்த்துகள்! பயிற்சி முடிந்தது</h3>
            <p className="text-sm text-[#566070]">
              நீங்கள் {questions.length} கேள்விகளில் <b className="text-[#3B2FC9] text-base">{score}</b> சரியான பதில்களை அளித்துள்ளீர்கள்!
            </p>
            <div className="text-3xl font-black text-amber-500 font-mono">
              ⭐ {score * 10} புள்ளிகள்
            </div>
            <button
              onClick={handleRestart}
              className="bg-[#3B2FC9] text-white font-extrabold px-6 py-3 rounded-xl flex items-center gap-2 mx-auto shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>மீண்டும் பயிற்சி செய்</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
