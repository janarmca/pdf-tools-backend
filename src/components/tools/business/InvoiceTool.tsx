import React, { useState } from 'react';
import { calculateInvoice, InvoiceItem } from '../../../utils/billingCalc';
import { numberToWordsEnglish, numberToWordsTamil } from '../../../utils/tamilCore';
import { AppLanguage } from '../../../types';
import { Plus, Trash2, Printer, Share2, FileCheck } from 'lucide-react';
import { getWhatsAppShareUrl } from '../../../utils/pdfHelper';

interface InvoiceToolProps {
  lang: AppLanguage;
}

export const InvoiceTool: React.FC<InvoiceToolProps> = ({ lang }) => {
  const [docType, setDocType] = useState<'Tax Invoice' | 'Quotation' | 'Cash Bill' | 'Proforma' | 'Purchase Order'>('Tax Invoice');
  const [sellerName, setSellerName] = useState('Sri Krishna Agencies');
  const [sellerGst, setSellerGst] = useState('33AAAAA0000A1Z5');
  const [sellerAddress, setSellerAddress] = useState('12, Gandhi Road, Chennai - 600001, Tamil Nadu');
  const [sellerPhone, setSellerPhone] = useState('9876543210');

  const [buyerName, setBuyerName] = useState('Murugan Traders');
  const [buyerGst, setBuyerGst] = useState('33BBBBB1111B1Z2');
  const [buyerAddress, setBuyerAddress] = useState('45, Bazaar Street, Madurai - 625001');

  const [invNumber, setInvNumber] = useState('INV-2026-001');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInterState, setIsInterState] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', desc: 'Computer Monitor 24-inch', hsn: '8471', qty: 2, rate: 8500, gstRate: 18 },
    { id: '2', desc: 'Wireless Keyboard & Mouse Combo', hsn: '8471', qty: 5, rate: 1200, gstRate: 18 },
  ]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), desc: '', hsn: '', qty: 1, rate: 0, gstRate: 18 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const calc = calculateInvoice(items, isInterState);
  const wordsEn = numberToWordsEnglish(calc.netPayable);
  const wordsTa = numberToWordsTamil(calc.netPayable);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls & Inputs */}
      <div className="bg-white rounded-2xl border border-[#E6E8EC] p-6 shadow-xs space-y-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8EC] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📃</span>
            <div>
              <h3 className="font-black text-lg text-[#20242B]">
                {lang === 'ta' ? 'ஜிஎஸ்டி பில் / இன்வாய்ஸ் தயாரிப்பாளர்' : 'GST Invoice & Quotation Maker'}
              </h3>
              <p className="text-xs text-[#566070]">
                {lang === 'ta' ? 'சரியான IGST / CGST+SGST வரி கணக்கீடு மற்றும் அச்சு' : 'Real GST compliance with state tax split and print'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#1A5276] hover:bg-[#143F5B] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              {lang === 'ta' ? 'அச்சிடு / PDF சேமி' : 'Print / Save PDF'}
            </button>
            <a
              href={getWhatsAppShareUrl(docType)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </a>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold">
          <div>
            <label className="block text-[#566070] mb-1 font-bold">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#20242B]"
            >
              <option value="Tax Invoice">Tax Invoice (ஜிஎஸ்டி பில்)</option>
              <option value="Quotation">Quotation (விலைப் புள்ளி)</option>
              <option value="Cash Bill">Cash Bill (ரொக்க பில்)</option>
              <option value="Proforma">Proforma Invoice</option>
              <option value="Purchase Order">Purchase Order (PO)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">Number / எண்</label>
            <input
              type="text"
              value={invNumber}
              onChange={(e) => setInvNumber(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#20242B]"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">Date / தேதி</label>
            <input
              type="date"
              value={invDate}
              onChange={(e) => setInvDate(e.target.value)}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#20242B]"
            />
          </div>

          <div>
            <label className="block text-[#566070] mb-1 font-bold">Tax Mode</label>
            <select
              value={isInterState ? 'inter' : 'intra'}
              onChange={(e) => setIsInterState(e.target.value === 'inter')}
              className="w-full bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-2.5 font-bold text-[#20242B]"
            >
              <option value="intra">Tamil Nadu (CGST + SGST)</option>
              <option value="inter">Inter-State (IGST)</option>
            </select>
          </div>
        </div>

        {/* Parties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="p-4 bg-[#F8FAFF] border border-[#E6E8EC] rounded-xl space-y-2">
            <div className="font-extrabold text-[#1A5276] uppercase tracking-wider">
              {lang === 'ta' ? 'விற்பனையாளர் விவரம் (Seller)' : 'Seller Details'}
            </div>
            <input
              type="text"
              placeholder="Business Name"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2 font-bold"
            />
            <input
              type="text"
              placeholder="GSTIN (e.g. 33AAAAA0000A1Z5)"
              value={sellerGst}
              onChange={(e) => setSellerGst(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2 uppercase"
            />
            <input
              type="text"
              placeholder="Address"
              value={sellerAddress}
              onChange={(e) => setSellerAddress(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2"
            />
            <input
              type="text"
              placeholder="Phone"
              value={sellerPhone}
              onChange={(e) => setSellerPhone(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2"
            />
          </div>

          <div className="p-4 bg-[#F8FAFF] border border-[#E6E8EC] rounded-xl space-y-2">
            <div className="font-extrabold text-[#1A5276] uppercase tracking-wider">
              {lang === 'ta' ? 'வாங்குபவர் விவரம் (Buyer)' : 'Buyer Details'}
            </div>
            <input
              type="text"
              placeholder="Client / Buyer Name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2 font-bold"
            />
            <input
              type="text"
              placeholder="Buyer GSTIN (Optional)"
              value={buyerGst}
              onChange={(e) => setBuyerGst(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2 uppercase"
            />
            <input
              type="text"
              placeholder="Buyer Address"
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              className="w-full bg-white border border-[#CBD6F2] rounded-lg p-2"
            />
          </div>
        </div>

        {/* Line Items Table in Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold text-sm text-[#20242B]">
              {lang === 'ta' ? 'பொருட்கள் / சேவைகள்' : 'Items & Charges'}
            </div>
            <button
              onClick={addItem}
              className="bg-[#3752A6] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#28407F]"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === 'ta' ? 'வரிசை சேர்' : 'Add Item'}
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 bg-[#F8FAFF] border border-[#E6E8EC] p-2.5 rounded-xl items-center text-xs"
              >
                <div className="col-span-4 sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Description / பொருள்"
                    value={item.desc}
                    onChange={(e) => updateItem(item.id, 'desc', e.target.value)}
                    className="w-full bg-white border border-[#CBD6F2] rounded-lg p-1.5 font-semibold"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="HSN"
                    value={item.hsn}
                    onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                    className="w-full bg-white border border-[#CBD6F2] rounded-lg p-1.5"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.qty || ''}
                    onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-[#CBD6F2] rounded-lg p-1.5 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Rate ₹"
                    value={item.rate || ''}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-[#CBD6F2] rounded-lg p-1.5 font-bold"
                  />
                </div>
                <div className="col-span-1">
                  <select
                    value={item.gstRate}
                    onChange={(e) => updateItem(item.id, 'gstRate', parseFloat(e.target.value))}
                    className="w-full bg-white border border-[#CBD6F2] rounded-lg p-1.5 font-bold text-[11px]"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div className="col-span-1 text-right">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-red-600 hover:bg-white rounded"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Printable Preview Sheet */}
      <div className="bg-white border border-[#CBD6F2] rounded-2xl p-8 sm:p-12 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 text-[#20242B]">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-[#1A5276] pb-6 mb-6">
          <div>
            <h1 className="font-black text-2xl sm:text-3xl text-[#1A5276] uppercase tracking-tight">
              {sellerName || 'YOUR BUSINESS NAME'}
            </h1>
            <p className="text-xs text-[#566070] mt-1 max-w-sm leading-relaxed">{sellerAddress}</p>
            <div className="text-xs font-bold text-[#20242B] mt-2 space-y-0.5">
              {sellerGst && <div>GSTIN: <span className="font-mono">{sellerGst}</span></div>}
              {sellerPhone && <div>Phone: {sellerPhone}</div>}
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-[#1A5276] text-white font-black text-sm sm:text-base px-4 py-1.5 rounded-lg uppercase tracking-wider mb-2">
              {docType}
            </div>
            <div className="text-xs space-y-1 font-semibold text-[#566070]">
              <div>Invoice No: <b className="text-[#20242B]">{invNumber}</b></div>
              <div>Date: <b className="text-[#20242B]">{invDate}</b></div>
              <div>State: <b className="text-[#20242B]">33 - Tamil Nadu</b></div>
            </div>
          </div>
        </div>

        {/* Billed To */}
        <div className="bg-[#F8FAFF] border border-[#E6E8EC] rounded-xl p-4 mb-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#1A5276] mb-1">
            Billed To / பெறுநர்:
          </div>
          <div className="font-extrabold text-sm text-[#20242B]">{buyerName || 'Client Name'}</div>
          <div className="text-xs text-[#566070] mt-0.5">{buyerAddress}</div>
          {buyerGst && (
            <div className="text-xs font-bold text-[#20242B] mt-1">
              GSTIN: <span className="font-mono">{buyerGst}</span>
            </div>
          )}
        </div>

        {/* Invoice Table */}
        <div className="border border-[#CBD6F2] rounded-xl overflow-hidden mb-6">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#1A5276] text-white font-extrabold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Description of Goods / Services</th>
                <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-center">GST</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8EC]">
              {items.map((item, idx) => {
                const amount = (item.qty || 0) * (item.rate || 0);
                return (
                  <tr key={item.id} className="hover:bg-[#F9FAFC]">
                    <td className="py-2.5 px-3 text-center text-[#566070]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-[#20242B]">{item.desc || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-[#566070]">{item.hsn || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{item.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{item.rate.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#1A5276]">{item.gstRate}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary and Tax Calculation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start mb-6">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#566070] mb-1">
              Amount in Words:
            </div>
            <div className="text-xs font-bold text-[#1A5276] leading-relaxed mb-1">
              {wordsEn}
            </div>
            <div className="text-xs font-medium text-[#566070] leading-relaxed tamil-font">
              {wordsTa}
            </div>

            <div className="mt-4 p-3 bg-[#F8FAFF] rounded-lg border border-[#E6E8EC] text-[11px] text-[#566070] space-y-1">
              <div className="font-bold text-[#20242B]">Terms &amp; Conditions:</div>
              <div>1. Goods once sold will not be taken back.</div>
              <div>2. Payment is due within 15 days of invoice date.</div>
            </div>
          </div>

          <div className="bg-[#F8FAFF] border border-[#CBD6F2] rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#566070]">Taxable Value:</span>
              <span className="font-mono font-bold">
                ₹{calc.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-[#1A5276]">
                <span>Integrated GST (IGST):</span>
                <span className="font-mono font-bold">
                  ₹{calc.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-[#1A5276]">
                  <span>Central GST (CGST):</span>
                  <span className="font-mono font-bold">
                    ₹{calc.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#1A5276]">
                  <span>State GST (SGST):</span>
                  <span className="font-mono font-bold">
                    ₹{calc.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between text-[#566070] pt-1 border-t border-[#E6E8EC]">
              <span>Round-off:</span>
              <span className="font-mono">{calc.roundOff >= 0 ? `+₹${calc.roundOff}` : `-₹${Math.abs(calc.roundOff)}`}</span>
            </div>

            <div className="flex justify-between text-base font-black text-[#1A5276] pt-2 border-t-2 border-[#1A5276]">
              <span>Net Payable Total:</span>
              <span className="font-mono">
                ₹{calc.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="flex justify-between items-end pt-8 border-t border-[#E6E8EC] text-xs">
          <div className="text-[11px] text-[#566070]">
            Generated via PDF Tools India • 100% Free &amp; Private
          </div>
          <div className="text-center">
            <div className="font-bold text-[#20242B] mb-8">For {sellerName || 'Seller'}</div>
            <div className="text-[#566070] border-t border-[#CBD6F2] pt-1 px-6">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
