import React from 'react';
import { ToolItem, AppLanguage } from '../../types';
import { ArrowLeft, Share2 } from 'lucide-react';
import { getWhatsAppShareUrl } from '../../utils/pdfHelper';

// Tool Components
import { MergePdfTool } from './pdf/MergePdfTool';
import { SplitPdfTool } from './pdf/SplitPdfTool';
import { ImageToPdfTool } from './pdf/ImageToPdfTool';
import { WatermarkPdfTool } from './pdf/WatermarkPdfTool';
import { InvoiceTool } from './business/InvoiceTool';
import { ReceiptsTool } from './business/ReceiptsTool';
import { SalarySlipTool } from './business/SalarySlipTool';
import { LeaveLetterTool } from './business/LeaveLetterTool';
import { IncomeTaxCalculatorTool } from './business/IncomeTaxCalculatorTool';
import { EmiCalculatorTool } from './business/EmiCalculatorTool';
import { GstCalculatorTool } from './business/GstCalculatorTool';
import { AmountInWordsTool } from './business/AmountInWordsTool';
import { DaArrearsTool } from './business/DaArrearsTool';
import { BiodataMakerTool } from './business/BiodataMakerTool';
import { PhotoResizerTool } from './image/PhotoResizerTool';
import { CompressImageTool } from './image/CompressImageTool';
import { ImageConverterTool } from './image/ImageConverterTool';
import { TamilTypingTool } from './education/TamilTypingTool';
import { TamilFontConverterTool } from './education/TamilFontConverterTool';
import { TneaCutoffTool } from './education/TneaCutoffTool';
import { StudyTimerTool } from './education/StudyTimerTool';
import { UnitLandConverterTool } from './education/UnitLandConverterTool';
import { FarmerToolbox } from './education/FarmerToolbox';
import { KalviKalanjiyamView } from './education/KalviKalanjiyamView';
import { GenericFileTool } from './GenericFileTool';

interface ToolWorkspaceProps {
  tool: ToolItem;
  lang: AppLanguage;
  onBack: () => void;
}

export const ToolWorkspace: React.FC<ToolWorkspaceProps> = ({
  tool,
  lang,
  onBack,
}) => {
  const toolName = lang === 'ta' ? tool.tamilName : tool.name;
  const toolDesc = lang === 'ta' ? tool.tamilDesc : tool.desc;

  const renderToolComponent = () => {
    switch (tool.id) {
      case 'merge':
        return <MergePdfTool lang={lang} />;
      case 'split':
      case 'extractpages':
        return <SplitPdfTool lang={lang} />;
      case 'img2pdf':
        return <ImageToPdfTool lang={lang} />;
      case 'watermark':
        return <WatermarkPdfTool lang={lang} />;
      case 'quotepo':
      case 'gstinvoice':
        return <InvoiceTool lang={lang} />;
      case 'receipts':
      case 'rentreceipt':
        return <ReceiptsTool lang={lang} />;
      case 'salaryslip':
        return <SalarySlipTool lang={lang} />;
      case 'leaveletter':
        return <LeaveLetterTool lang={lang} />;
      case 'incometaxcalc':
        return <IncomeTaxCalculatorTool lang={lang} />;
      case 'emicalc':
        return <EmiCalculatorTool lang={lang} />;
      case 'gstcalc':
        return <GstCalculatorTool lang={lang} />;
      case 'rupeewords':
      case 'tamilnumwords':
        return <AmountInWordsTool lang={lang} />;
      case 'daarrears':
        return <DaArrearsTool lang={lang} />;
      case 'biodata':
        return <BiodataMakerTool lang={lang} />;
      case 'photoresize':
      case 'examphoto':
        return <PhotoResizerTool lang={lang} />;
      case 'imgcompress':
      case 'imgcompresskb':
        return <CompressImageTool lang={lang} />;
      case 'imgconvert':
      case 'heic2jpg':
        return <ImageConverterTool lang={lang} />;
      case 'tamiltyping':
        return <TamilTypingTool lang={lang} />;
      case 'tamilfont':
        return <TamilFontConverterTool lang={lang} />;
      case 'tneacutoff':
        return <TneaCutoffTool lang={lang} />;
      case 'studytimer':
        return <StudyTimerTool lang={lang} />;
      case 'unitconv':
        return <UnitLandConverterTool lang={lang} />;
      case 'uzhavartools':
        return <FarmerToolbox lang={lang} />;
      case 'kalvikalanjiyam':
        return <KalviKalanjiyamView lang={lang} />;
      default:
        return <GenericFileTool tool={tool} lang={lang} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top back button and share */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#3752A6] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ta' ? 'அனைத்து கருவிகள் (Back to Tools)' : 'Back to All Tools'}</span>
        </button>

        <a
          href={getWhatsAppShareUrl(toolName)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E8E5A] bg-[#E8F8EE] px-3 py-1.5 rounded-full hover:bg-[#D5F2E1] transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{lang === 'ta' ? 'பகிர்' : 'Share'}</span>
        </a>
      </div>

      {/* Tool Header Card */}
      <div className="bg-white rounded-3xl border border-[#E6E8EC] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs shrink-0"
            style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
          >
            {tool.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#20242B] tracking-tight">
                {toolName}
              </h2>
              {tool.badge && (
                <span className="text-[10px] font-extrabold bg-[#E3F6EB] text-[#176B45] px-2 py-0.5 rounded-full">
                  {tool.badge}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#566070] mt-0.5">
              {lang === 'ta' ? tool.name : tool.tamilName}
            </div>
            <p className="text-xs text-[#566070] mt-1.5 max-w-2xl leading-relaxed">
              {toolDesc}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="inline-block px-3 py-1 bg-[#EEF1FA] text-[#3752A6] text-xs font-extrabold rounded-full uppercase tracking-wider">
            {tool.cat.toUpperCase()} TOOL
          </span>
          <div className="text-[11px] text-[#566070] mt-1 font-semibold">100% Free &amp; Private</div>
        </div>
      </div>

      {/* Dynamic Tool Workspace */}
      <div className="pt-2">{renderToolComponent()}</div>
    </div>
  );
};
