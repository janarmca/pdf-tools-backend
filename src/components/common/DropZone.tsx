import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { AppLanguage } from '../../types';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  subTitle?: string;
  lang: AppLanguage;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  title,
  subTitle,
  lang,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultTitle =
    title ||
    (lang === 'ta'
      ? multiple
        ? 'கோப்புகளை இங்கே இழுத்துப் போடவும் அல்லது தேர்ந்தெடுக்கவும்'
        : 'கோப்பை இங்கே இழுத்துப் போடவும் அல்லது தேர்ந்தெடுக்கவும்'
      : multiple
      ? 'Drag & drop files here, or click to choose'
      : 'Drag & drop a file here, or click to choose');

  const defaultSub =
    subTitle ||
    (lang === 'ta'
      ? '100% பாதுகாப்பானது — உங்கள் சாதனம் உள்ளேயே செயலாக்கப்படுகிறது'
      : '100% Secure — Processed locally in your browser');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3 min-h-[190px] select-none ${
        isDragOver
          ? 'border-[#3752A6] bg-[#E6EDFF] scale-[1.01] shadow-md'
          : 'border-[#B8C4E6] bg-gradient-to-b from-[#F8FAFF] to-[#F1F5FF] hover:border-[#3752A6] hover:bg-[#F0F4FF]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-[#3752A6]">
        <UploadCloud className="w-8 h-8" />
      </div>
      <div className="font-extrabold text-base text-[#20242B] max-w-md">{defaultTitle}</div>
      <div className="text-xs text-[#566070]">{defaultSub}</div>
      <button
        type="button"
        className="mt-2 bg-[#3752A6] text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm hover:bg-[#28407F] transition-colors"
      >
        {lang === 'ta' ? 'கோப்புகளைத் தேர்ந்தெடு' : 'Choose Files'}
      </button>
    </div>
  );
};
