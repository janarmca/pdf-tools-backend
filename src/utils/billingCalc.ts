// Business, Tax and Calculator computations

export interface InvoiceItem {
  id: string;
  desc: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
}

export interface InvoiceCalcResult {
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalGst: number;
  grandTotal: number;
  roundOff: number;
  netPayable: number;
}

export function calculateInvoice(
  items: InvoiceItem[],
  isInterState: boolean
): InvoiceCalcResult {
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  for (const item of items) {
    const lineTotal = (item.qty || 0) * (item.rate || 0);
    taxableTotal += lineTotal;
    const tax = lineTotal * ((item.gstRate || 0) / 100);

    if (isInterState) {
      igstTotal += tax;
    } else {
      cgstTotal += tax / 2;
      sgstTotal += tax / 2;
    }
  }

  const totalGst = isInterState ? igstTotal : cgstTotal + sgstTotal;
  const rawTotal = taxableTotal + totalGst;
  const rounded = Math.round(rawTotal);
  const roundOff = Math.round((rounded - rawTotal) * 100) / 100;

  return {
    taxableTotal: Math.round(taxableTotal * 100) / 100,
    cgstTotal: Math.round(cgstTotal * 100) / 100,
    sgstTotal: Math.round(sgstTotal * 100) / 100,
    igstTotal: Math.round(igstTotal * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    grandTotal: rawTotal,
    roundOff,
    netPayable: rounded,
  };
}

export interface EmiResult {
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
}

export function calculateEmi(principal: number, annualRate: number, tenureYears: number): EmiResult {
  if (!principal || principal <= 0 || !tenureYears || tenureYears <= 0) {
    return { monthlyEmi: 0, totalInterest: 0, totalPayment: 0 };
  }
  const monthlyRate = (annualRate || 0) / 12 / 100;
  const n = tenureYears * 12;

  if (monthlyRate === 0) {
    const emi = principal / n;
    return { monthlyEmi: Math.round(emi), totalInterest: 0, totalPayment: principal };
  }

  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;

  return {
    monthlyEmi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
  };
}

export interface TaxRegimeResult {
  taxableIncome: number;
  taxBeforeCess: number;
  rebate87A: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
}

export interface TaxComparisonResult {
  oldRegime: TaxRegimeResult;
  newRegime: TaxRegimeResult;
  better: 'new' | 'old' | 'equal';
  savings: number;
}

export function calculateIncomeTax(
  grossIncome: number,
  deduction80C: number = 0,
  deduction80D: number = 0,
  hraExemption: number = 0,
  homeLoanInterest: number = 0
): TaxComparisonResult {
  // New Regime FY 2026-27:
  // Standard Deduction: ₹75,000
  // Slabs:
  // 0 - 3,00,000: Nil
  // 3,00,001 - 7,00,000: 5%
  // 7,00,001 - 10,00,000: 10%
  // 10,00,001 - 12,00,000: 15%
  // 12,00,001 - 15,00,000: 20%
  // Above 15,00,000: 30%
  // Rebate u/s 87A: up to ₹7,00,000 taxable income -> tax is NIL (marginal relief applies)

  const newStdDed = 75000;
  const newTaxable = Math.max(0, grossIncome - newStdDed);
  let newTax = 0;

  if (newTaxable > 1500000) {
    newTax += (newTaxable - 1500000) * 0.30;
    newTax += 300000 * 0.20;
    newTax += 200000 * 0.15;
    newTax += 300000 * 0.10;
    newTax += 400000 * 0.05;
  } else if (newTaxable > 1200000) {
    newTax += (newTaxable - 1200000) * 0.20;
    newTax += 200000 * 0.15;
    newTax += 300000 * 0.10;
    newTax += 400000 * 0.05;
  } else if (newTaxable > 1000000) {
    newTax += (newTaxable - 1000000) * 0.15;
    newTax += 300000 * 0.10;
    newTax += 400000 * 0.05;
  } else if (newTaxable > 700000) {
    newTax += (newTaxable - 700000) * 0.10;
    newTax += 400000 * 0.05;
  } else if (newTaxable > 300000) {
    newTax += (newTaxable - 300000) * 0.05;
  }

  let newRebate = 0;
  if (newTaxable <= 700000) {
    newRebate = newTax;
    newTax = 0;
  }
  const newCess = Math.round(newTax * 0.04);
  const newTotal = newTax + newCess;

  // Old Regime:
  // Standard Deduction: ₹50,000
  // Slabs:
  // 0 - 2,50,000: Nil
  // 2,50,001 - 5,00,000: 5%
  // 5,00,001 - 10,00,000: 20%
  // Above 10,00,000: 30%
  // 87A rebate if taxable <= 5,00,000 -> NIL
  const oldStdDed = 50000;
  const totalOldDeductions =
    oldStdDed +
    Math.min(150000, deduction80C) +
    Math.min(75000, deduction80D) +
    hraExemption +
    Math.min(200000, homeLoanInterest);

  const oldTaxable = Math.max(0, grossIncome - totalOldDeductions);
  let oldTax = 0;
  if (oldTaxable > 1000000) {
    oldTax += (oldTaxable - 1000000) * 0.30;
    oldTax += 500000 * 0.20;
    oldTax += 250000 * 0.05;
  } else if (oldTaxable > 500000) {
    oldTax += (oldTaxable - 500000) * 0.20;
    oldTax += 250000 * 0.05;
  } else if (oldTaxable > 250000) {
    oldTax += (oldTaxable - 250000) * 0.05;
  }

  let oldRebate = 0;
  if (oldTaxable <= 500000) {
    oldRebate = oldTax;
    oldTax = 0;
  }
  const oldCess = Math.round(oldTax * 0.04);
  const oldTotal = oldTax + oldCess;

  const savings = Math.abs(oldTotal - newTotal);
  const better = newTotal < oldTotal ? 'new' : oldTotal < newTotal ? 'old' : 'equal';

  return {
    oldRegime: {
      taxableIncome: oldTaxable,
      taxBeforeCess: Math.round(oldTax),
      rebate87A: Math.round(oldRebate),
      cess: oldCess,
      totalTax: oldTotal,
      effectiveRate: grossIncome > 0 ? Math.round((oldTotal / grossIncome) * 1000) / 10 : 0,
    },
    newRegime: {
      taxableIncome: newTaxable,
      taxBeforeCess: Math.round(newTax),
      rebate87A: Math.round(newRebate),
      cess: newCess,
      totalTax: newTotal,
      effectiveRate: grossIncome > 0 ? Math.round((newTotal / grossIncome) * 1000) / 10 : 0,
    },
    better,
    savings,
  };
}

export function calculateDAArrears(
  basicPay: number,
  oldDaPct: number,
  newDaPct: number,
  months: number
): { diffPerMonth: number; totalArrears: number } {
  const diffPct = Math.max(0, newDaPct - oldDaPct);
  const diffPerMonth = Math.round((basicPay * diffPct) / 100);
  const totalArrears = diffPerMonth * months;
  return { diffPerMonth, totalArrears };
}

// Land Unit Conversion
export function convertLandArea(val: number, fromUnit: string): Record<string, number> {
  // Base unit: Square Feet
  const SQFT_FACTORS: Record<string, number> = {
    sqft: 1,
    cent: 435.6,
    ground: 2400,
    acre: 43560,
    kuzhi: 144, // 1 kuzhi = 144 sq ft in traditional TN measurement
    guntha: 1089,
    hectare: 107639.1,
    sqm: 10.7639,
  };

  const factor = SQFT_FACTORS[fromUnit] || 1;
  const totalSqft = val * factor;

  return {
    sqft: Math.round(totalSqft * 100) / 100,
    cent: Math.round((totalSqft / SQFT_FACTORS.cent) * 1000) / 1000,
    ground: Math.round((totalSqft / SQFT_FACTORS.ground) * 1000) / 1000,
    acre: Math.round((totalSqft / SQFT_FACTORS.acre) * 10000) / 10000,
    kuzhi: Math.round((totalSqft / SQFT_FACTORS.kuzhi) * 100) / 100,
    hectare: Math.round((totalSqft / SQFT_FACTORS.hectare) * 10000) / 10000,
  };
}
