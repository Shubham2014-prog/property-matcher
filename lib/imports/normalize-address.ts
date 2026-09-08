export function normalizeAddressForDuplicateCheck(address: string) {
  return address
    .trim()
    .toLowerCase()
    .replace(/[,.;:]/g, " ")
    .replace(/\s+/g, " ");
}

export function splitAddressInput(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function looksLikeCompleteAustralianAddress(address: string) {
  return /\b(act|nsw|nt|qld|sa|tas|vic|wa)\b\s*,?\s*\d{4}\b/i.test(address);
}
