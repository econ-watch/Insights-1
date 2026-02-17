const ACRONYM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bPpi\b/g, "PPI"],
  [/\bCpi\b/g, "CPI"],
  [/\bGdp\b/g, "GDP"],
  [/\bPce\b/g, "PCE"],
  [/\bPmi\b/g, "PMI"],
  [/\bEcb\b/g, "ECB"],
  [/\bBoe\b/g, "BoE"],
  [/\bBoj\b/g, "BoJ"],
  [/\bRba\b/g, "RBA"],
  [/\bFed\b/g, "Fed"],
  [/\bS&p\b/g, "S&P"],
];

const PERIOD_SUFFIX_RE = /\s+(YoY|MoM|QoQ)$/;

export function normalizeIndicatorName(rawName: string): string {
  let normalized = rawName.trim();

  for (const [pattern, replacement] of ACRONYM_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized.replace(PERIOD_SUFFIX_RE, " ($1)");

  return normalized;
}
