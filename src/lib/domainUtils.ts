export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const hostname = url.hostname.replace(/^www\./, '');
    if (!hostname) return null;
    return hostname;
  } catch {
    return null;
  }
}

export function normalizeAllowlist(domains: string[]): string[] {
  return Array.from(new Set(domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean)))
    .map((domain) => domain.replace(/^www\./, ''))
    .sort();
}
