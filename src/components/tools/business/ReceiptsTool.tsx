import React, { useState } from 'react';
import { numberToWordsEnglish, numberToWordsTamil } from '../../../utils/tamilCore';
import { AppLanguage } from '../../../types';
import { Printer, Share2 } from 'lucide-react';
import { getWhatsAppShareUrl } from '../../../utils/pdfHelper';

interface ReceiptsToolProps {
  lang: AppLanguage;
}

export const ReceiptsTool: React.FC<ReceiptsToolProps> = ({ lang }) => {
  const [receiptType, setReceiptType] = useState<'rent' | 'tuition' | 'cash' | 'voucher'>('rent');
  const [tenantName, setTenantName] = useState('R. Karthik');
  const [landlordName, setLandlordName] = useState('S. Ramanathan');
  const [landlordPan, setLandlordPan] = useState('ABCDE1234F');
  const [propertyAddress, setPropertyAddress] = useState('Flat 2B, Gokul Apartments, T. Nagar, Chennai - 600017');
  const [monthlyRent, setMonthlyRent] = useState<number>(18000);
  const [monthName, setMonthName] = useState('October 2026');
  const [paymentMode, setPaymentMode] = useState('UPI / Net Banking');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  const wordsEn = numberToWordsEnglish(monthlyRent);
  const wordsTa = numberToWordsTamil(monthlyRent);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8EC] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧾</span>
            <div>
              <h3 className="font-black text-lg text-[#20242B]">
                {lang === 'ta' ? 'ரசீதுகள் & வவுச்சர்கள் தயாரிப்பாளர்' : 'Receipts & Vouchers Generator'}
              </h3>
              <p className="text-xs text-[#566070]">
                {lang === 'ta'
                  ? 'வாடகை ரசீது (HRA விலக்கு), கல்விக் கட்டணம், ரொக்க ரசீது & வவுச்சர்'
                  : 'Rent receipt (HRA proof), tuition fee, money receipt and payment voucher'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#2E6F5E] hover:bg-[#205245] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              {lang === 'ta' ? 'அச்சிடு / PDF சேமி' : 'Print / Save PDF'}
            </button>
            <a
              href={getWhatsAppShareUrl('Rent Receipt')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </a>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setReceiptType('rent')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              receiptType === 'rent' ? 'bg-[#2E6F5E] text-white' : 'bg-[#F8FAFF] text-[#20242B] border border-[#CBD6F2]'
            }`}
          >
            🏠 {lang === 'ta' ? 'வாடகை ரசீது (Rent Receipt)' : 'Rent Receipt'}
          </button>
          <button
            onClick={() => setReceiptType('tuition')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              receiptType === 'tuition' ? 'bg-[#2E6F5E] text-white' : 'bg-[#F8FAFF] text-[#20242B] border border-[#CBD6F2]'
            }`}
          >
            🎓 {lang === 'ta' ? 'கல்விக் கட்டண ரசீது' : 'Tuition Fee Receipt'}
          </button>
          <button
            onClick={() => setReceiptType('cash')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              receiptType === 'cash' ? 'bg-[#2E6F5E] text-white' : 'bg-[#F8FAFF] text-[#20242B] border border-[#CBD6F2]'
            }`}
          >
            💵 {lang === 'ta' ? 'ரொக்க ரசீது (Money Receipt)' : 'Money Receipt'}
          </button>
          <button
            onClick={() => setReceiptType('voucher')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              receiptType === 'voucher' ? 'bg-[#2E6F5E] text-white' : 'bg-[#F8FAFF] text-[#20242B] border border-[#CBD6F2]'
            }`}
          >
            🔖 {lang === 'ta' ? 'பணம் வழங்கல் வவுச்சர்' : 'Payment Voucher'}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">
              {receiptType === 'rent' ? 'குடியிருப்பாளர் பெயர் (Tenant)' : 'செலுத்துபவர் (Payer)'}
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">
              {receiptType === 'rent' ? 'வீட்டு உரிமையாளர் (Landlord)' : 'பெறுபவர் (Receiver)'}
            </label>
            <input
              type="text"
              value={landlordName}
              onChange={(e) => setLandlordName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">தொகை / Amount (₹)</label>
            <input
              type="number"
              value={monthlyRent || ''}
              onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-extrabold text-[#2E6F5E]"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">மாதம் / காலம் (Period)</label>
            <input
              type="text"
              value={monthName}
              onChange={(e) => setMonthName(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">உரிமையாளர் PAN (வருமான வரிக்கு)</label>
            <input
              type="text"
              value={landlordPan}
              onChange={(e) => setLandlordPan(e.target.value.toUpperCase())}
              placeholder="Landlord PAN"
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">செலுத்திய முறை (Payment Mode)</label>
            <input
              type="text"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[#566070] mb-1 font-bold">முகவரி (Property Address)</label>
            <input
              type="text"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border-2 border-[#CBD6F2] rounded-2xl p-8 sm:p-12 shadow-md max-w-3xl mx-auto print:border-none print:shadow-none print:p-0 text-[#20242B]">
        <div className="border-4 border-double border-[#2E6F5E] p-8 rounded-xl relative">
          <div className="flex justify-between items-start border-b border-[#2E6F5E] pb-4 mb-6">
            <div>
              <h2 className="font-black text-2xl text-[#2E6F5E] tracking-wide uppercase">
                {receiptType === 'rent'
                  ? 'HOUSE RENT RECEIPT'
                  : receiptType === 'tuition'
                  ? 'TUITION FEE RECEIPT'
                  : receiptType === 'cash'
                  ? 'MONEY RECEIPT'
                  : 'PAYMENT VOUCHER'}
              </h2>
              <div className="text-xs text-[#566070] font-bold mt-1">
                (Valid HRA proof under Section 10(13A) of Income Tax Act)
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-extrabold text-sm text-[#20242B]">Receipt Date: {receiptDate}</div>
              <div className="text-[#566070] mt-1 font-mono">For Month: {monthName}</div>
            </div>
          </div>

          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              Received with thanks a sum of{' '}
              <b className="text-base text-[#2E6F5E] font-extrabold font-mono">
                ₹{monthlyRent.toLocaleString('en-IN')}
              </b>{' '}
              (<span className="font-bold italic">{wordsEn}</span> / <span className="font-semibold tamil-font">{wordsTa}</span>) from{' '}
              <b className="border-b border-[#20242B] pb-0.5 px-2">{tenantName}</b> towards the rent of premises situated at:
            </p>

            <div className="p-3 bg-[#F8FAFF] border border-[#E6E8EC] rounded-lg text-xs font-semibold text-[#20242B]">
              📍 {propertyAddress}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <span className="text-[#566070]">Payment Method:</span>{' '}
                <b>{paymentMode}</b>
              </div>
              <div>
                <span className="text-[#566070]">Landlord's PAN:</span>{' '}
                <b className="font-mono">{landlordPan || 'N/A'}</b>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end mt-12 pt-6 border-t border-[#E6E8EC] text-xs">
            <div className="w-24 h-24 border border-dashed border-[#566070] flex flex-col items-center justify-center text-[10px] text-[#566070] text-center p-1">
              <span>Affix</span>
              <span>₹1 Revenue</span>
              <span>Stamp</span>
            </div>

            <div className="text-center space-y-1">
              <div className="h-10"></div>
              <div className="border-t border-[#20242B] pt-1 px-8 font-extrabold text-[#20242B]">
                {landlordName}
              </div>
              <div className="text-[11px] text-[#566070]">Landlord's Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
