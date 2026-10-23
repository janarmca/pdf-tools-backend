import React, { useState, useEffect } from 'react';
import { AppLanguage } from '../../../types';
import { Play, Pause, RotateCcw, CheckCircle2, Coffee, BookOpen } from 'lucide-react';

interface StudyTimerToolProps {
  lang: AppLanguage;
}

export const StudyTimerTool: React.FC<StudyTimerToolProps> = ({ lang }) => {
  const [mode, setMode] = useState<'study' | 'break'>('study');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // 25 mins
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [taskText, setTaskText] = useState('Physics Chapter 4 Numerical Problems');

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'study') {
        setCompletedSessions((s) => s + 1);
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('study');
        setTimeLeft(25 * 60);
      }
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const toggleRun = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'study' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'study' | 'break') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === 'study' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = mode === 'study' ? 25 * 60 : 5 * 60;
  const progressPct = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-5 text-center max-w-xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-4">
          <div className="text-left">
            <h3 className="font-black text-lg text-[#20242B]">
              {lang === 'ta' ? 'படிப்பு நேரக் கடிகாரம் (Pomodoro)' : 'Pomodoro Study Timer'}
            </h3>
            <p className="text-xs text-[#566070]">
              25 நிமிடம் ஆழ்ந்த படிப்பு + 5 நிமிடம் ஓய்வு
            </p>
          </div>
          <div className="text-xs font-bold text-[#1E8E5A] bg-[#E8F8EE] px-3 py-1 rounded-full">
            {completedSessions} Sessions Done
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex rounded-xl overflow-hidden border border-[#CBD6F2] p-1 bg-[#F8FAFF]">
          <button
            onClick={() => switchMode('study')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'study' ? 'bg-[#2F9E44] text-white shadow-xs' : 'text-[#566070]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>படிப்பு நேரம் (25m)</span>
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'break' ? 'bg-[#E8894A] text-white shadow-xs' : 'text-[#566070]'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>இடைவேளை (5m)</span>
          </button>
        </div>

        {/* Big Timer Display */}
        <div className="my-8">
          <div className="text-6xl sm:text-7xl font-black font-mono text-[#20242B] tracking-tight">
            {timeFormatted}
          </div>
          <div className="text-xs font-bold text-[#566070] uppercase tracking-wider mt-2">
            {mode === 'study' ? 'Focus Time' : 'Short Break Time'}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-[#EEF1FA] rounded-full overflow-hidden">
          <div
            style={{ width: `${progressPct}%` }}
            className={`h-full transition-all duration-300 ${
              mode === 'study' ? 'bg-[#2F9E44]' : 'bg-[#E8894A]'
            }`}
          />
        </div>

        {/* Task input */}
        <div>
          <input
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="தற்போதைய பாடம் / Task name..."
            className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl px-4 py-2.5 text-xs font-bold text-[#20242B] text-center"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={toggleRun}
            className={`font-black text-sm px-8 py-3.5 rounded-xl text-white shadow-md flex items-center gap-2 transition-all ${
              isRunning ? 'bg-[#C0392B] hover:bg-[#A93226]' : 'bg-[#2F9E44] hover:bg-[#257E37]'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{isRunning ? 'இடைநிறுத்து (Pause)' : 'தொடங்கு (Start)'}</span>
          </button>

          <button
            onClick={resetTimer}
            className="p-3.5 rounded-xl border border-[#CBD6F2] text-[#566070] hover:bg-[#F8FAFF] transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
