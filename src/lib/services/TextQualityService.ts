/**
 * TextQualityService
 *
 * Deterministic garbage / low-entropy text detection.
 * Used by NameValidationService and other field validators.
 */

export interface TextQualityReport {
  isMeaningful: boolean;
  entropyScore: number;
  repeatedCharacterRatio: number;
  repeatedSubstringRatio: number;
  alphabeticRatio: number;
  digitRatio: number;
  symbolRatio: number;
  reasons: string[];
}

/** Shannon entropy (0..log2(n) for n unique chars). Normalized to 0..1 vs. log2(len). */
function shannonEntropy(str: string): number {
  if (str.length <= 1) return 0;
  const freq: Record<string, number> = {};
  for (const ch of str) freq[ch] = (freq[ch] ?? 0) + 1;
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  // Normalize to 0..1 range
  const maxEntropy = Math.log2(Math.min(len, 26)); // 26 latin chars as baseline
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/** Ratio of characters that are the same single character (AAAA...). */
function singleCharRepeatRatio(str: string): number {
  if (str.length === 0) return 0;
  let maxRun = 1;
  let curRun = 1;
  for (let i = 1; i < str.length; i++) {
    if (str[i] === str[i - 1]) {
      curRun++;
      if (curRun > maxRun) maxRun = curRun;
    } else {
      curRun = 1;
    }
  }
  return maxRun / str.length;
}

/** Detect repeated substrings (abcabcabc). Returns ratio of repeated pattern coverage. */
function repeatedSubstringRatio(str: string): number {
  const len = str.length;
  if (len < 6) return 0;

  let bestRatio = 0;
  // Check substrings of length 2..len/2
  const maxPatternLen = Math.floor(len / 2);
  for (let pLen = 2; pLen <= Math.min(maxPatternLen, 12); pLen++) {
    const pattern = str.slice(0, pLen);
    let count = 0;
    let pos = 0;
    while (pos <= len - pLen) {
      if (str.slice(pos, pos + pLen) === pattern) {
        count++;
        pos += pLen;
      } else {
        break;
      }
    }
    const ratio = (count * pLen) / len;
    if (ratio > bestRatio) bestRatio = ratio;
  }
  return bestRatio;
}

/** Count unique alpha characters (case-insensitive). */
function uniqueAlphaCount(str: string): number {
  const lower = str.toLowerCase();
  const seen = new Set<string>();
  for (const ch of lower) {
    if (/[a-z]/.test(ch)) seen.add(ch);
  }
  return seen.size;
}

/**
 * Analyze text quality for a given string.
 * @param value - the raw string to analyze
 * @param strict - use stricter thresholds (for name fields)
 */
export function analyzeTextQuality(
  value: string,
  strict = false
): TextQualityReport {
  const reasons: string[] = [];
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      isMeaningful: false,
      entropyScore: 0,
      repeatedCharacterRatio: 0,
      repeatedSubstringRatio: 0,
      alphabeticRatio: 0,
      digitRatio: 0,
      symbolRatio: 0,
      reasons: ["empty string"],
    };
  }

  const alphaChars = (trimmed.match(/[a-zA-Z\u00C0-\u024F\u0900-\u097F]/gu) ?? []).length;
  const digitChars = (trimmed.match(/\d/g) ?? []).length;
  const symbolChars = trimmed.length - alphaChars - digitChars;
  const len = trimmed.length;

  const alphabeticRatio = alphaChars / len;
  const digitRatio = digitChars / len;
  const symbolRatio = symbolChars / len;

  const entropy = shannonEntropy(trimmed.toLowerCase().replace(/\s/g, ""));
  const charRepeatRatio = singleCharRepeatRatio(trimmed.toLowerCase().replace(/\s/g, ""));
  const substrRatio = repeatedSubstringRatio(trimmed.toLowerCase().replace(/\s/g, ""));
  const uniqueAlpha = uniqueAlphaCount(trimmed);

  let isMeaningful = true;

  // Repeated single character (AAAAAAA, 111111)
  const charRepeatThreshold = strict ? 0.55 : 0.7;
  if (charRepeatRatio >= charRepeatThreshold && len >= 6) {
    isMeaningful = false;
    reasons.push(`repeating single character (ratio=${charRepeatRatio.toFixed(2)})`);
  }

  // Repeated substring pattern (abcabcabc)
  const substrThreshold = strict ? 0.72 : 0.85;
  if (substrRatio >= substrThreshold && len >= 8) {
    isMeaningful = false;
    reasons.push(`repeating substring pattern (ratio=${substrRatio.toFixed(2)})`);
  }

  // Almost entirely digits
  if (digitRatio > 0.85 && len >= 6) {
    isMeaningful = false;
    reasons.push(`mostly digits (ratio=${digitRatio.toFixed(2)})`);
  }

  // Almost entirely symbols
  if (symbolRatio > 0.6 && len >= 4) {
    isMeaningful = false;
    reasons.push(`mostly symbols (ratio=${symbolRatio.toFixed(2)})`);
  }

  // Very low entropy for longer strings
  if (len >= 10 && entropy < 0.15) {
    isMeaningful = false;
    reasons.push(`very low entropy (score=${entropy.toFixed(2)})`);
  }

  // Fewer than 3 unique alpha chars in a long string (for strict mode)
  if (strict && len >= 10 && alphaChars >= 8 && uniqueAlpha < 3) {
    isMeaningful = false;
    reasons.push(`insufficient character diversity (unique alpha=${uniqueAlpha})`);
  }

  return {
    isMeaningful,
    entropyScore: entropy,
    repeatedCharacterRatio: charRepeatRatio,
    repeatedSubstringRatio: substrRatio,
    alphabeticRatio,
    digitRatio,
    symbolRatio,
    reasons,
  };
}
