import { describe, expect, it } from 'vitest';

/** Mirror of scoring helpers used by DescriptionCaseSearchService (pure unit checks). */
function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  let n = 0;
  for (const t of ta) if (tb.has(t)) n += 1;
  return n;
}

function scoreMatch(input: {
  ageBandMatch: boolean;
  clothingOverlap: number;
  languageMatch: boolean;
  meters: number | null;
  radius: number;
}): { score: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  let score = 0;
  if (input.ageBandMatch) score += 3;
  if (input.clothingOverlap > 0) score += input.clothingOverlap >= 2 ? 3 : 1;
  if (input.languageMatch) score += 1;
  if (input.meters != null && input.meters <= input.radius) {
    score += input.meters <= 200 ? 3 : 1;
  }
  const confidence = score >= 6 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';
  return { score, confidence };
}

describe('description case search scoring (no biometrics)', () => {
  it('scores clothing token overlap', () => {
    expect(tokenOverlap('Red shirt blue shorts', 'red shirt, Telugu')).toBeGreaterThanOrEqual(2);
  });

  it('ranks a strong description+location match as HIGH', () => {
    const { confidence } = scoreMatch({
      ageBandMatch: true,
      clothingOverlap: 2,
      languageMatch: true,
      meters: 120,
      radius: 1500,
    });
    expect(confidence).toBe('HIGH');
  });

  it('ranks weak overlap as LOW', () => {
    const { confidence } = scoreMatch({
      ageBandMatch: false,
      clothingOverlap: 1,
      languageMatch: false,
      meters: null,
      radius: 1500,
    });
    expect(confidence).toBe('LOW');
  });
});
