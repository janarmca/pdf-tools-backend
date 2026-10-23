// Tamil & Number to Words conversion utilities

const ONES_EN = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS_EN = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export function numberToWordsEnglish(n: number): string {
  if (isNaN(n) || n === 0) return 'Zero Rupees Only';
  n = Math.floor(Math.abs(n));

  function convertChunk(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ONES_EN[num] + ' ';
    if (num < 100) return TENS_EN[Math.floor(num / 10)] + ' ' + (num % 10 ? ONES_EN[num % 10] + ' ' : '');
    return ONES_EN[Math.floor(num / 100)] + ' Hundred ' + (num % 100 ? convertChunk(num % 100) : '');
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  if (crore) words += convertChunk(crore) + 'Crore ';
  if (lakh) words += convertChunk(lakh) + 'Lakh ';
  if (thousand) words += convertChunk(thousand) + 'Thousand ';
  if (remainder) words += convertChunk(remainder);

  return words.trim() + ' Rupees Only';
}

const ONES_TA = ['', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது',
  'பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதிமூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது'];
const TENS_TA = ['', '', 'இருபது', 'முப்பது', 'நாற்பது', 'ஐம்பது', 'அறுபது', 'எழுபது', 'எண்பது', 'தொண்ணூறு'];
const HUNDREDS_TA = ['', 'நூறு', 'இருநூறு', 'முந்நூறு', 'நாநூறு', 'ஐந்நூறு', 'அறுநூறு', 'எழுநூறு', 'எண்ணூறு', 'தொள்ளாயிரம்'];

export function numberToWordsTamil(n: number): string {
  if (isNaN(n) || n === 0) return 'பூஜ்ஜியம் ரூபாய் மட்டும்';
  n = Math.floor(Math.abs(n));

  function chunkTA(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ONES_TA[num] + ' ';
    if (num < 100) {
      const t = Math.floor(num / 10);
      const rem = num % 10;
      if (rem === 0) return TENS_TA[t] + ' ';
      const prefix = ['','','இருபத்து ','முப்பத்து ','நாற்பத்து ','ஐம்பத்து ','அறுபத்து ','எழுபத்து ','எண்பத்து ','தொண்ணூற்று '][t];
      return prefix + ONES_TA[rem] + ' ';
    }
    const h = Math.floor(num / 100);
    const remH = num % 100;
    if (remH === 0) return HUNDREDS_TA[h] + ' ';
    const hPrefix = ['','நூற்று ','இருநூற்று ','முந்நூற்று ','நாநூற்று ','ஐந்நூற்று ','அறுநூற்று ','எழுநூற்று ','எண்ணூற்று ','தொள்ளாயிரத்து '][h];
    return hPrefix + chunkTA(remH);
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  if (crore) words += (crore === 1 ? 'ஒரு கோடி ' : chunkTA(crore) + 'கோடி ');
  if (lakh) words += (lakh === 1 ? 'ஒரு லட்சம் ' : chunkTA(lakh) + 'லட்சம் ');
  if (thousand) words += (thousand === 1 ? 'ஆயிரத்து ' : chunkTA(thousand) + 'ஆயிரம் ');
  if (remainder) words += chunkTA(remainder);

  return words.trim() + ' ரூபாய் மட்டும்';
}

// Bamini to Unicode converter mapping
const BAMINI_MAP: Record<string, string> = {
  'm': 'அ', 'M': 'ஆ', 'n': 'இ', 'N': 'ஈ', 'c': 'உ', 'C': 'ஊ',
  'v': 'எ', 'V': 'ஏ', 'I': 'ஐ', 'x': 'ஒ', 'X': 'ஓ', 'xs': 'ஔ',
  'f': 'க்', 'F': 'க', 'q': 'த்', 'Q': 'த', 'w': 'ண்', 'W': 'ண',
  'e': 'ப்', 'E': 'ப', 'r': 'ர்', 'R': 'ர', 't': 'ற்', 'T': 'ற',
  'y': 'ல்', 'Y': 'ல', 'u': 'ழ்', 'U': 'ழ', 'i': 'ள்', 'b': 'வ',
  'B': 'வ்', 'k': 'ங்', 'K': 'ங', 'g': 'ஞ்', 'G': 'ஞ', 'j': 'ந்',
  'J': 'ந', 'h': 'ம்', 'H': 'ம', 'd': 'ச்', 'D': 'ச', 's': 'ய்',
  'S': 'ய', 'l': 'ட', 'L': 'ட்',
};

export function baminiToUnicode(input: string): string {
  let result = input;
  // Common multi-character replacements
  const multiMap: [string, string][] = [
    ['Ngh', 'பொ'], ['Ngh', 'போ'], ['nfs', 'கௌ'], ['Nfh', 'கொ'],
    ['fs', 'ள'], ['gh', 'பா'], ['fh', 'கா'], ['jh', 'தா'], ['kh', 'மா'],
    ['th', 'வா'], ['yh', 'லா'], ['uh', 'ழா'], ['lh', 'டா'], ['rh', 'ரா']
  ];
  for (const [k, v] of multiMap) {
    result = result.split(k).join(v);
  }
  let out = '';
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    out += BAMINI_MAP[ch] || ch;
  }
  return out;
}

// Tanglish (English phonetic) to Tamil transliteration
const PHONETIC_MAP: Record<string, string> = {
  'vanakkam': 'வணக்கம்',
  'nandri': 'நன்றி',
  'tamil': 'தமிழ்',
  'unakkaga': 'உனக்காக',
  'amma': 'அம்மா',
  'appa': 'அப்பா',
  'thambi': 'தம்பி',
  'akka': 'அக்கா',
  'anbu': 'அன்பு',
  'kadhal': 'காதல்',
  'nanban': 'நண்பன்',
  'veedu': 'வீடு',
  'oor': 'ஊர்',
  'kaalai': 'காலை',
  'iravu': 'இரவு',
  'saapadu': 'சாப்பாடு',
  'velai': 'வேலை',
  'palli': 'பள்ளி',
  'kalloori': 'கல்லூரி',
  'manavan': 'மாணவன்',
  'arul': 'அருள்',
  'kovil': 'கோவில்',
  'thirumana': 'திருமண',
  'inbam': 'இன்பம்',
  'vetri': 'வெற்றி',
  'vaazhga': 'வாழ்க',
  'nalam': 'நலம்',
  'mudhal': 'முதல்',
  'kadavul': 'கடவுள்',
  'thunai': 'துணை',
};

export function transliterateTanglish(word: string): string {
  const clean = word.toLowerCase().trim();
  if (PHONETIC_MAP[clean]) {
    return PHONETIC_MAP[clean];
  }
  // Basic letter-by-letter fallback
  return clean
    .replace(/aa/g, 'ஆ')
    .replace(/ee|ii/g, 'ஈ')
    .replace(/oo|uu/g, 'ஊ')
    .replace(/ai/g, 'ஐ')
    .replace(/au/g, 'ஔ')
    .replace(/a/g, 'அ')
    .replace(/i/g, 'இ')
    .replace(/u/g, 'உ')
    .replace(/e/g, 'எ')
    .replace(/o/g, 'ஒ')
    .replace(/k/g, 'க')
    .replace(/g/g, 'க')
    .replace(/s/g, 'ச')
    .replace(/ch/g, 'ச')
    .replace(/th/g, 'த')
    .replace(/t/g, 'ட')
    .replace(/d/g, 'ட')
    .replace(/p/g, 'ப')
    .replace(/b/g, 'ப')
    .replace(/m/g, 'ம')
    .replace(/n/g, 'ன')
    .replace(/y/g, 'ய')
    .replace(/r/g, 'ர')
    .replace(/l/g, 'ல')
    .replace(/v/g, 'வ')
    .replace(/zh/g, 'ழ')
    .replace(/sh/g, 'ஷ')
    .replace(/h/g, 'ஹ');
}
