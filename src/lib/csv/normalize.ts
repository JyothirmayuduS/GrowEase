/**
 * CSV normalization — header cleaning only.
 * Name/field sanitization is handled by the HybridRowProcessor pipeline.
 */

export function cleanKey(key: string): string {
  return key.replace(/^\uFEFF/, "").trim();
}

export function normalizeCsv(headers: string[], rows: Record<string, string>[]) {
  let resolvedHeaders = headers.map(cleanKey).filter(Boolean);

  if (resolvedHeaders.length === 0 && rows.length > 0) {
    resolvedHeaders = Object.keys(rows[0]).map(cleanKey).filter(Boolean);
  }

  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[cleanKey(key)] = value ?? "";
    }
    return normalized;
  });

  return { headers: resolvedHeaders, rows: normalizedRows };
}
