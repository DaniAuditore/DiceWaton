import { describe, it, expect, vi } from 'vitest';
import { formatRollBreakdown, parseAndRoll, parseAndRollDetailed, validateDiceExpression } from './dice';

describe('dice util', () => {
  it('parses flat modifiers', () => {
    // Math.random won't matter for flat numbers
    expect(parseAndRoll('5')).toBe(5);
    expect(parseAndRoll('+5')).toBe(5);
    expect(parseAndRoll('-3')).toBe(-3);
    expect(parseAndRoll('5+3')).toBe(8);
    expect(parseAndRoll('10-4')).toBe(6);
  });

  it('evaluates dice ranges safely', () => {
    // 1d20 should be between 1 and 20
    let result = parseAndRoll('1d20');
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(20);

    // 2d6+3 should be between 5 and 15
    result = parseAndRoll('2d6+3');
    expect(result).toBeGreaterThanOrEqual(5);
    expect(result).toBeLessThanOrEqual(15);
  });

  it('returns full term breakdown for multi-dice expressions', () => {
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0) // 1 on d6
      .mockReturnValueOnce(0.5); // 4 on d6

    const result = parseAndRollDetailed('2d6+1');

    expect(result.total).toBe(6);
    expect(result.terms).toEqual([
      { notation: '2d6', sign: 1, subtotal: 5, rolls: [1, 4] },
      { notation: '1', sign: 1, subtotal: 1 },
    ]);
    expect(formatRollBreakdown(result)).toBe('2d6[1,4] +1');

    randomSpy.mockRestore();
  });

  it('validates accepted macro expressions without changing current roll behavior', () => {
    expect(validateDiceExpression('1d20+5')).toEqual({ ok: true, normalizedExpression: '1d20+5' });
    expect(validateDiceExpression(' d6 ')).toEqual({ ok: true, normalizedExpression: 'd6' });
    expect(validateDiceExpression('8d6')).toEqual({ ok: true, normalizedExpression: '8d6' });
    expect(validateDiceExpression('2d6-1')).toEqual({ ok: true, normalizedExpression: '2d6-1' });
    expect(validateDiceExpression('-3')).toEqual({ ok: true, normalizedExpression: '-3' });
  });

  it('rejects invalid macro expressions that would otherwise fail silently', () => {
    expect(validateDiceExpression('')).toMatchObject({ ok: false });
    expect(validateDiceExpression('abc')).toMatchObject({ ok: false });
    expect(validateDiceExpression('2d6+')).toMatchObject({ ok: false });
    expect(validateDiceExpression('0d6')).toMatchObject({ ok: false });
    expect(validateDiceExpression('2d0')).toMatchObject({ ok: false });
  });
});
