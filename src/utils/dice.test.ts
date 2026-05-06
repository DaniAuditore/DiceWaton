import { describe, it, expect } from 'vitest';
import { parseAndRoll } from './dice';

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
});
