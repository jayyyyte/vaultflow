import type { WalletWithBalance } from "./types";
import type { Category } from "@/db/schema";

export interface ParsedTransaction {
  amount: number;
  type: "expense" | "income" | "transfer";
  date: string; // ISO YYYY-MM-DD
  note: string;
  suggestedWalletId?: string;
  suggestedWalletName?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  bankName?: string;
  confidence: number; // 0 to 1
  raw: string;
}

// Keyword dictionaries for smart category matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Dining & Drinks
  dining: [
    "cafe", "coffee", "highlands", "phuc long", "starbucks", "the coffee house", "tocotoco",
    "ding tea", "gong cha", "tra sua", "an", "pho", "bun", "com", "banh mi", "food",
    "shopeefood", "grabfood", "baemin", "kfc", "lotteria", "jollibee", "mcdonalds", "pizza",
    "bbq", "lau", "haidilao", "manwah", "kichi", "gogi", "golden gate", "quan an", "nha hang",
    "lau nuong", "bun cha", "com tam", "bun bo", "an trua", "an toi", "an sang", "buffet"
  ],
  // Groceries / Supermarket
  groceries: [
    "sieu thi", "winmart", "vinmart", "coopmart", "co.op", "bach hoa xanh", "big c", "go!",
    "tops market", "lotte mart", "mega market", "tap hoa", "cho", "thit", "ca", "rau",
    "costco", "aeon", "aeon mall", "fujimart", "7-eleven", "circle k", "ministop", "family mart", "gs25"
  ],
  // Transportation
  transport: [
    "grab", "be", "gojek", "xanh sm", "vinfast", "taxi", "mai linh", "xang", "petrol",
    "petrolimex", "pvoil", "ve xe", "ve tau", "ve may bay", "vietjet", "vietnam airlines",
    "bamboo", "gui xe", "phi cau duong", "epass", "vetc", "bom xe", "sua xe", "rua xe"
  ],
  // Utilities & Bills
  utilities: [
    "dien", "evn", "dien luc", "nuoc", "sawaco", "cap nuoc", "internet", "fpt", "viettel",
    "vnpt", "cuoc", "truyen hinh", "k+", "phi dich vu", "phi quan ly", "rac", "ve sinh",
    "nap dien thoai", "the cao", "topup"
  ],
  // Shopping
  shopping: [
    "shopee", "lazada", "tiki", "tiktok", "sendo", "shopping", "quan ao", "giay", "dep",
    "tui xach", "my pham", "uniqlo", "zara", "h&m", "canifa", "routine", "hasaki", "thegioididong",
    "dien may xanh", "fpt shop", "cellphones", "hoang ha", "an phat", "gearvn"
  ],
  // Housing / Rent
  rent: [
    "tien nha", "tien phong", "tro", "phong tro", "thue nha", "can ho", "chung cu", "mat bang"
  ],
  // Entertainment & Subscriptions
  entertainment: [
    "netflix", "spotify", "youtube", "apple", "itunes", "cgv", "bhd", "lotte cinema",
    "galaxy", "beta", "rap chieu phim", "ve xem phim", "steam", "game", "playstation",
    "nintendo", "karaoke", "billiards", "bida", "du lich", "khach san", "resort", "booking", "agoda"
  ],
  // Health & Medicine
  health: [
    "thuoc", "pharmacity", "long chau", "an khang", "benh vien", "phong kham", "nha khoa",
    "kham benh", "xet nghiem", "bac si", "mat kinh", "gym", "yoga", "fitness", "the thao"
  ],
  // Income: Salary & Freelance
  salary: [
    "luong", "salary", "payroll", "thuong", "bonus", "thu lao", "tam ung", "hoa hong", "chuyen luong"
  ],
};

// Known banks and wallet identifiers in Vietnam and internationally
const BANK_PATTERNS: Array<{ id: string; keywords: string[] }> = [
  { id: "vcb", keywords: ["vietcombank", "vcb", "mbvcb", "digibank"] },
  { id: "tcb", keywords: ["techcombank", "tcb", "fastebank"] },
  { id: "mbb", keywords: ["mbbank", "mb bank", "mb", "quan doi"] },
  { id: "acb", keywords: ["acb", "a chau"] },
  { id: "vpb", keywords: ["vpbank", "vp bank", "neo"] },
  { id: "tpb", keywords: ["tpbank", "tp bank", "tien phong"] },
  { id: "ctg", keywords: ["vietinbank", "ctg", "vietin"] },
  { id: "bidv", keywords: ["bidv", "dau tu va phat trien"] },
  { id: "timo", keywords: ["timo"] },
  { id: "cake", keywords: ["cake"] },
  { id: "momo", keywords: ["momo", "vi momo"] },
  { id: "zalopay", keywords: ["zalopay", "zalo pay"] },
  { id: "shopeepay", keywords: ["shopeepay", "shopee pay"] },
  { id: "cash", keywords: ["tien mat", "cash"] },
];

/**
 * Normalizes Vietnamese string for resilient keyword searching
 */
function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Parses bank SMS, banking notifications, or copied transfer messages
 */
export function parseBankNotification(
  text: string,
  wallets: WalletWithBalance[] = [],
  categories: Category[] = []
): ParsedTransaction {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const normalized = removeDiacritics(raw);

  let amount = 0;
  let type: "expense" | "income" | "transfer" = "expense";
  let date = new Date().toISOString().split("T")[0];
  let note = "";
  let confidence = 0.5;

  // 1. Detect Transaction Type
  const hasMinus = /(-|\bchi\b|\btru\b|\bthanh toan\b|\bchuyen di\b|\brut tien\b|\bpaid\b|\bdebit\b|gd:\s*-)/i.test(
    raw
  );
  const hasPlus = /(\+|\bnhan\b|\bcong\b|\btien vao\b|\bluong\b|\breceived\b|\bcredit\b|\bdeposit\b|gd:\s*\+)/i.test(
    raw
  );

  if (hasPlus && !hasMinus) {
    type = "income";
  } else if (hasMinus) {
    type = "expense";
  } else if (/(\bchuyen khoan sang\b|\bchuyen vi\b|\btransfer to\b)/i.test(raw)) {
    type = "transfer";
  }

  // 2. Extract Amount
  // Strategy: Isolate transaction amount from account balance.
  // Many bank SMS say: "GD: -500,000VND luc 14:00. So du: 15,200,000VND"
  // We want 500,000, NOT 15,200,000.
  let amountMatched = false;

  // Priority pattern: explicit GD amount with +/- and currency
  const gdRegex = /(?:gd|giao dich|so tien|amount|st)[:\s]*([+-]?\s*[\d.,]+)\s*(?:vnd|d|đ|\$|k)?/i;
  const gdMatch = raw.match(gdRegex);

  if (gdMatch && gdMatch[1]) {
    const cleaned = gdMatch[1].replace(/[^\d]/g, "");
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
      amountMatched = true;
      confidence += 0.2;
    }
  }

  // Fallback 1: Look for explicit +/- followed by numbers and VND/d/đ
  if (!amountMatched) {
    const signedRegex = /([+-])\s*([\d.,]+)\s*(?:vnd|d|đ|\$)?/i;
    const signedMatch = raw.match(signedRegex);
    if (signedMatch && signedMatch[2]) {
      const sign = signedMatch[1];
      const cleaned = signedMatch[2].replace(/[^\d]/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        type = sign === "+" ? "income" : "expense";
        amountMatched = true;
        confidence += 0.2;
      }
    }
  }

  // Fallback 2: Look for words like "thanh toan 50.000d" or "500k"
  if (!amountMatched) {
    const kRegex = /(\d+(?:[.,]\d+)?)\s*k\b/i;
    const kMatch = raw.match(kRegex);
    if (kMatch && kMatch[1]) {
      const num = parseFloat(kMatch[1].replace(",", "."));
      if (!isNaN(num) && num > 0) {
        amount = num * 1000;
        amountMatched = true;
      }
    }
  }

  // Fallback 3: Look for currency with digits like "$45.50" or "500,000 VND"
  if (!amountMatched) {
    const currencyRegex = /(?:vnd|d|đ|\$)\s*([\d.,]+)|([\d.,]+)\s*(?:vnd|d|đ)/i;
    const curMatch = raw.match(currencyRegex);
    if (curMatch) {
      const matchStr = curMatch[1] || curMatch[2];
      const cleaned = matchStr.replace(/[^\d]/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        amountMatched = true;
      }
    }
  }

  // 3. Extract Date
  // Patterns: dd/mm/yyyy, dd/mm/yy, dd-mm-yyyy, yyyy-mm-dd
  const dateRegex1 = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;
  const dateMatch1 = raw.match(dateRegex1);
  if (dateMatch1) {
    const day = dateMatch1[1].padStart(2, "0");
    const month = dateMatch1[2].padStart(2, "0");
    const year = dateMatch1[3];
    date = `${year}-${month}-${day}`;
  } else {
    const dateRegex2 = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/;
    const dateMatch2 = raw.match(dateRegex2);
    if (dateMatch2) {
      const day = dateMatch2[1].padStart(2, "0");
      const month = dateMatch2[2].padStart(2, "0");
      const year = `20${dateMatch2[3]}`;
      date = `${year}-${month}-${day}`;
    } else {
      const dateRegex3 = /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/;
      const dateMatch3 = raw.match(dateRegex3);
      if (dateMatch3) {
        const year = dateMatch3[1];
        const month = dateMatch3[2].padStart(2, "0");
        const day = dateMatch3[3].padStart(2, "0");
        date = `${year}-${month}-${day}`;
      }
    }
  }

  // 4. Extract Note / Transaction Description
  // In VN bank SMS: "ND: Tra tien an trua" or "Noi dung: Cafe Highlands"
  const ndRegex = /(?:nd|noi dung|ref|content|memo|desc)[:\s]+([^.]+)/i;
  const ndMatch = raw.match(ndRegex);

  if (ndMatch && ndMatch[1]) {
    note = ndMatch[1].trim();
  } else {
    // If no explicit ND tag, try to find merchant name or clean up sentences
    // Remove "SD TK ...", "So du: ...", timestamps
    let cleaned = raw
      .replace(/sd\s*tk\s*\w+/gi, "")
      .replace(/so\s*du[:\s]*[\d.,]+\s*(?:vnd|d|đ)?/gi, "")
      .replace(/luc\s*\d{1,2}:\d{2}(?::\d{2})?/gi, "")
      .replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, "")
      .replace(/ref\s*\w+/gi, "")
      .replace(/gd:\s*[+-]?[\d.,]+\s*(?:vnd|d|đ)?/gi, "")
      .trim();

    if (cleaned.length > 50) {
      cleaned = cleaned.substring(0, 50).trim();
    }
    note = cleaned || (type === "expense" ? "Chi tiêu mua sắm" : "Khoản thu nhập");
  }

  // Clean note
  note = note
    .replace(/^[-:,\s]+/, "")
    .replace(/[-:,\s]+$/, "")
    .replace(/\s+/g, " ");

  // 5. Smart Wallet Matching
  let suggestedWalletId: string | undefined;
  let suggestedWalletName: string | undefined;
  let bankName: string | undefined;

  for (const b of BANK_PATTERNS) {
    if (b.keywords.some((kw) => normalized.includes(kw) || lower.includes(kw))) {
      bankName = b.id.toUpperCase();
      // Look for a user wallet matching this bank
      const matched = wallets.find((w) => {
        const wNorm = removeDiacritics(w.name);
        return b.keywords.some((kw) => wNorm.includes(kw));
      });
      if (matched) {
        suggestedWalletId = matched.id;
        suggestedWalletName = matched.name;
        confidence += 0.15;
        break;
      }
    }
  }

  // Fallback to first wallet if not matched
  if (!suggestedWalletId && wallets.length > 0) {
    suggestedWalletId = wallets[0].id;
    suggestedWalletName = wallets[0].name;
  }

  // 6. Smart Category Matching based on Note and Raw Text
  let suggestedCategoryId: string | undefined;
  let suggestedCategoryName: string | undefined;

  const searchTarget = `${normalized} ${removeDiacritics(note)}`;

  // Find matching bucket key
  let matchedBucket: string | undefined;
  for (const [bucket, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((kw) => searchTarget.includes(kw))) {
      matchedBucket = bucket;
      break;
    }
  }

  if (matchedBucket) {
    // Find category in user's category list that corresponds to this bucket
    const targetKeywords = CATEGORY_KEYWORDS[matchedBucket];
    const matchedCat = categories
      .filter((c) => c.type === (type === "income" ? "income" : "expense"))
      .find((c) => {
        const cNorm = removeDiacritics(c.name);
        return targetKeywords.some((kw) => cNorm.includes(kw) || kw.includes(cNorm));
      });

    if (matchedCat) {
      suggestedCategoryId = matchedCat.id;
      suggestedCategoryName = matchedCat.name;
      confidence += 0.15;
    }
  }

  // Fallback category if none matched
  if (!suggestedCategoryId) {
    const available = categories.filter((c) => c.type === (type === "income" ? "income" : "expense"));
    if (available.length > 0) {
      suggestedCategoryId = available[0].id;
      suggestedCategoryName = available[0].name;
    }
  }

  return {
    amount,
    type,
    date,
    note,
    suggestedWalletId,
    suggestedWalletName,
    suggestedCategoryId,
    suggestedCategoryName,
    bankName,
    confidence: Math.min(1, confidence),
    raw,
  };
}
