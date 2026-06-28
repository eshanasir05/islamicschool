const INJECTION_CHARS = /^[=+\-@\t\r\n]/;

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Neutralise CSV injection
  const safe = INJECTION_CHARS.test(str) ? `'${str}` : str;
  // Wrap in quotes if contains comma, quote, or newline
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines: string[] = [headers.map(escapeValue).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeValue).join(','));
  }
  return lines.join('\r\n');
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
