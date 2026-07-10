/**
 * Make text safe to draw with pdf-lib's StandardFonts, which can only encode
 * WinAnsi (cp1252). Any character outside that set would otherwise THROW at
 * render time, so we map common typography to ASCII and replace the rest with
 * "?" — the PDF always renders (stable), it never crashes on an exotic name.
 */

// Unicode code points cp1252 maps in the 0x80–0x9F range (€, smart quotes, dashes…).
const WIN1252_SPECIALS = new Set<number>([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
]);

function isWinAnsi(codePoint: number): boolean {
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true; // printable ASCII
  if (codePoint >= 0xa0 && codePoint <= 0xff) return true; // Latin-1 supplement
  return WIN1252_SPECIALS.has(codePoint);
}

export function sanitizePdfText(input: string): string {
  let out = "";
  for (const char of input) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp === 0x2212) {
      out += "-"; // minus sign → hyphen (not in cp1252)
    } else if (cp === 0x09 || cp === 0x0a || cp === 0x0b || cp === 0x0c || cp === 0x0d) {
      out += " "; // any whitespace control → space
    } else if (isWinAnsi(cp)) {
      out += char;
    } else {
      out += "?";
    }
  }
  return out;
}
