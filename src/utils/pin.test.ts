import { describe, it, expect } from 'vitest';
import { generatePin } from './pin';

describe('PIN Generation Logic', () => {
  it('generates a 4-character PIN by default', () => {
    const pin = generatePin();
    expect(pin).toHaveLength(4);
  });

  it('generates a PIN of the specified length', () => {
    const pin = generatePin(6);
    expect(pin).toHaveLength(6);
  });

  it('contains only uppercase alphanumeric characters', () => {
    const pin = generatePin(100);
    expect(/^[A-Z0-9]+$/.test(pin)).toBe(true);
  });

  it('generates unique pins', () => {
    const pin1 = generatePin();
    const pin2 = generatePin();
    // While theoretically possible to be same, very unlikely. 
    // Testing logic works by comparing two consecutive generations
    if (pin1 === pin2) {
        // extremely rare case, retry once
        const pin3 = generatePin();
        expect(pin1).not.toBe(pin3);
    } else {
        expect(pin1).not.toBe(pin2);
    }
  });
});
