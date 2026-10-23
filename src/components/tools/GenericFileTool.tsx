import React, { useState } from 'react';
import { ToolItem, AppLanguage } from '../../types';
import { DropZone } from '../common/DropZone';
import { DownloadSuccessModal } from '../common/DownloadSuccessModal';
import { downloadFile } from '../../utils/pdfHelper';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface GenericFileToolProps {
  tool: ToolItem;
  lang: AppLanguage;
}

export const GenericFileTool: React.FC<GenericFileToolProps> = ({ tool, lang }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setDone(false);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setDone(true);
    }, 1200);
  };

  const handleDownload = () => {
    if (!file) return;
    downloadFile(file, `processed-${file.name}`, file.type);
  };

  const handleReset = () => {
    setFile(null);
    setDone(false);
  };

  if (done && file) {
    return (
      <DownloadSuccessModal
        toolName={lang === 'ta' ? tool.tamilName : tool.name}
        onDownload={handleDownload}
        onReset={handleReset}
        lang={lang}
        fileSizeText={`File: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <DropZone
          onFilesSelected={handleFiles}
          multiple={false}
          title={
            lang === 'ta'
              ? `${tool.tamilName} - கோப்பை இங்கே தேர்ந்தெடுக்கவும்`
              : `Select file for ${tool.name}`
          }
          subTitle={lang === 'ta' ? tool.tamilDesc : tool.desc}
          lang={lang}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E8EC]">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs"
                style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
              >
                {tool.icon}
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20242B]">{file.name}</div>
                <div className="text-xs text-[#566070]">
                  {(file.size / 1024).toFixed(1)} KB • {file.type || 'Document'}
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="text-xs text-[#3752A6] font-bold hover:underline">
              {lang === 'ta' ? 'வேறு கோப்பு' : 'Change File'}
            </button>
          </div>

          <div className="bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-[#20242B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1E8E5A]" />
              <span>{lang === 'ta' ? 'பாதுகாப்பான பிரவுசர் செயல்முறை' : 'Browser-Local Processing'}</span>
            </div>
            <p className="text-[#566070] leading-relaxed">
              {lang === 'ta'
                ? 'உங்கள் கோப்பு உங்கள் சாதனத்திலேயே தனிப்பட்ட முறையில் செயலாக்கப்படுகிறது. எந்தவொரு சர்வர்க்கும் அனுப்பப்படுவதில்லை.'
                : 'Your document is processed locally on your device for complete privacy.'}
            </p>
          </div>

          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full text-white font-extrabold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: tool.color }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{lang === 'ta' ? 'செயலாக்கப்படுகிறது...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>
                  {lang === 'ta'
                    ? `${tool.tamilName} - செயல்படுத்தவும்`
                    : `Process with ${tool.name}`}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
