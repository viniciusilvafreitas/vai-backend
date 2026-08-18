import { Consultant } from '../types';

export function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Searches the official consultant list for an exact or similar match.
 * Example:
 * Input "vini", "vine", "Vinicius" -> returns official consultant "Vinícius"
 */
export function findMatchingConsultant(
  inputName: string,
  consultantsMap: Record<string, Consultant>
): { exact: Consultant | null; match: Consultant | null } {
  const normInput = normalizeName(inputName);
  if (!normInput) return { exact: null, match: null };

  const list = Object.values(consultantsMap);

  // 1. Exact match (normalized without accents/punctuation)
  const exact = list.find(c => normalizeName(c.name) === normInput) || null;
  if (exact) return { exact, match: exact };

  // 2. Prefix / Nickname match (e.g. "vini", "vine", "vici" -> "Vinícius")
  if (normInput.length >= 2) {
    const prefix = list.find(c => {
      const normC = normalizeName(c.name);
      return normC.startsWith(normInput) || normInput.startsWith(normC);
    });
    if (prefix) return { exact: null, match: prefix };
  }

  // 3. Edit distance check (close spelling)
  const close = list.find(c => {
    const normC = normalizeName(c.name);
    return levenshteinDistance(normInput, normC) <= 2;
  });

  return { exact: null, match: close || null };
}
