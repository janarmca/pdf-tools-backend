import React, { useState } from 'react';
import { numberToWordsEnglish, numberToWordsTamil } from '../../../utils/tamilCore';
import { AppLanguage } from '../../../types';
import { Printer, Share2 } from 'lucide-react';
import { getWhatsAppShareUrl } from '../../../utils/pdfHelper';

interface SalarySlipToolProps {
  lang: AppLanguage;
}

export const SalarySlipTool: React.FC<SalarySlipToolProps> = ({ lang }) => {
  const [companyName, setCompanyName] = useState('Apex Technologies Private Limited');
  const [employeeName, setEmployeeName] = useState('S. Vijay Anand');
  const [employeeId, setEmployeeId] = useState('EMP-1042');
  const [designation, setDesignation] = useState('Senior Software Engineer');
  const [payMonth, setPayMonth] = useState('October 2026');
  const [workingDays, setWorkingDays] = useState(31);
  const [lopDays, setLopDays] = useState(0);

  const [basicPay, setBasicPay] = useState<number>(35000);
  const [hra, setHra] = useState<number>(14000);
  const [specialAllowance, setSpecialAllowance] = useState<number>(8500);
  const [otherAllowance, setOtherAllowance] = useState<number>(2500);

  const [customPf, setCustomPf] = useState<number>(1800); // 12% statutory
  const [profTax, setProfTax] = useState<number>(200);
  const [tdsDeduction, setTdsDeduction] = useState<number>(1500);

  const grossEarnings = basicPay + hra + specialAllowance + otherAllowance;
  const totalDeductions = customPf + profTax + tdsDeduction;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  const wordsEn = numberToWordsEnglish(netSalary);
  const wordsTa = numberToWordsTamil(netSalary);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8EC] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <h3 className="font-black text-lg text-[#20242B]">
                {lang === 'ta' ? 'சம்பள சீட்டு தயாரிப்பாளர்' : 'Salary Slip (Payslip) Generator'}
              </h3>
              <p className="text-xs text-[#566070]">
                {lang === 'ta'
                  ? 'ஊதியம், பிஎஃப், வரி பிடித்தங்கள் மற்றும் நிகர சம்பள விவரம்'
                  : 'Earnings, statutory deductions (PF, PT, TDS) and net pay slip'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#2E7D32] hover:bg-[#1E5C22] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              {lang === 'ta' ? 'அச்சிடு / PDF சேமி' : 'Print / Save PDF'}
            </button>
            <a
              href={getWhatsAppShareUrl('Salary Slip')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </a>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">நிறுவனப் பெயர் (Company)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பணியாளர் பெயர் (Employee)</label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பதவி / Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">மாதம் / Pay Period</label>
            <input
              type="text"
              value={payMonth}
              onChange={(e) => setPayMonth(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">அடிப்படை ஊதியம் (Basic Pay ₹)</label>
            <input
              type="number"
              value={basicPay || ''}
              onChange={(e) => setBasicPay(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">வீட்டு வாடகைப்படி (HRA ₹)</label>
            <input
              type="number"
              value={hra || ''}
              onChange={(e) => setHra(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">சிறப்பு படி (Special Allowance ₹)</label>
            <input
              type="number"
              value={specialAllowance || ''}
              onChange={(e) => setSpecialAllowance(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">பிஎஃப் பிடித்தம் (Provident Fund ₹)</label>
            <input
              type="number"
              value={customPf || ''}
              onChange={(e) => setCustomPf(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">வருமான வரி (TDS ₹)</label>
            <input
              type="number"
              value={tdsDeduction || ''}
              onChange={(e) => setTdsDeduction(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-[#CBD6F2] rounded-2xl p-8 sm:p-12 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 text-[#20242B]">
        {/* Header */}
        <div className="text-center border-b-2 border-[#2E7D32] pb-6 mb-6">
          <h2 className="font-black text-2xl text-[#2E7D32] uppercase">{companyName}</h2>
          <div className="text-xs font-bold text-[#566070] mt-1 tracking-wide">
            PAYSLIP FOR THE MONTH OF {payMonth.toUpperCase()}
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8FAFF] border border-[#E6E8EC] rounded-xl text-xs mb-6">
          <div>
            <span className="text-[#566070] block">Employee Name:</span>
            <b className="text-[#20242B]">{employeeName}</b>
          </div>
          <div>
            <span className="text-[#566070] block">Employee ID:</span>
            <b className="font-mono text-[#20242B]">{employeeId}</b>
          </div>
          <div>
            <span className="text-[#566070] block">Designation:</span>
            <b className="text-[#20242B]">{designation}</b>
          </div>
          <div>
            <span className="text-[#566070] block">Total Days / LOP:</span>
            <b className="text-[#20242B]">{workingDays} Days / {lopDays} LOP</b>
          </div>
        </div>

        {/* Earnings & Deductions Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Earnings */}
          <div className="border border-[#CBD6F2] rounded-xl overflow-hidden text-xs">
            <div className="bg-[#E8F5E9] text-[#2E7D32] font-black p-2.5 text-center uppercase tracking-wider">
              Earnings / வரவுகள் (₹)
            </div>
            <div className="divide-y divide-[#E6E8EC] p-3 space-y-2">
              <div className="flex justify-between">
                <span>Basic Salary</span>
                <span className="font-mono font-bold">₹{basicPay.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>House Rent Allowance (HRA)</span>
                <span className="font-mono font-bold">₹{hra.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Special Allowance</span>
                <span className="font-mono font-bold">₹{specialAllowance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Other Allowances</span>
                <span className="font-mono font-bold">₹{otherAllowance.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="bg-[#F8FAFF] p-2.5 border-t border-[#CBD6F2] flex justify-between font-extrabold text-[#2E7D32]">
              <span>Gross Earnings:</span>
              <span className="font-mono">₹{grossEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-[#CBD6F2] rounded-xl overflow-hidden text-xs">
            <div className="bg-[#FFEBEE] text-[#C62828] font-black p-2.5 text-center uppercase tracking-wider">
              Deductions / பிடித்தங்கள் (₹)
            </div>
            <div className="divide-y divide-[#E6E8EC] p-3 space-y-2">
              <div className="flex justify-between">
                <span>Provident Fund (EPF)</span>
                <span className="font-mono font-bold">₹{customPf.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Professional Tax (PT)</span>
                <span className="font-mono font-bold">₹{profTax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Income Tax (TDS)</span>
                <span className="font-mono font-bold">₹{tdsDeduction.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="bg-[#F8FAFF] p-2.5 border-t border-[#CBD6F2] flex justify-between font-extrabold text-[#C62828]">
              <span>Total Deductions:</span>
              <span className="font-mono">₹{totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Net Pay Bar */}
        <div className="bg-[#E8F5E9] border-2 border-[#2E7D32] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-[11px] font-extrabold uppercase text-[#2E7D32]">Net Salary Payable:</div>
            <div className="text-xs font-bold text-[#20242B] mt-0.5">{wordsEn}</div>
            <div className="text-xs text-[#566070] tamil-font">{wordsTa}</div>
          </div>
          <div className="text-2xl font-black text-[#2E7D32] font-mono">
            ₹{netSalary.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end pt-12 border-t border-[#E6E8EC] text-xs">
          <div className="text-center">
            <div className="border-t border-[#CBD6F2] pt-1 px-8 font-bold">Employee Signature</div>
          </div>
          <div className="text-center">
            <div className="border-t border-[#CBD6F2] pt-1 px-8 font-bold">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};
