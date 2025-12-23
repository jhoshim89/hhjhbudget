import { describe, it, expect } from 'vitest';
import { formatKRW, formatFull, calcChange } from './formatters';

describe('formatters', () => {
  describe('formatKRW', () => {
    it('formats hundreds of millions correctly', () => {
      expect(formatKRW(120000000)).toBe('1.2억');
      expect(formatKRW(523400000)).toBe('5.2억');
    });

    it('formats ten thousands correctly', () => {
      expect(formatKRW(50000)).toBe('5만');
      expect(formatKRW(150000)).toBe('15만');
    });

    it('formats small numbers with commas', () => {
      expect(formatKRW(5000)).toBe('5,000');
      expect(formatKRW(0)).toBe('0');
    });

    it('handles null/undefined', () => {
      expect(formatKRW(null)).toBe('0');
      expect(formatKRW(undefined)).toBe('0');
    });
  });

  describe('formatFull', () => {
    it('formats with "원" suffix', () => {
      expect(formatFull(10000)).toBe('10,000원');
      expect(formatFull(0)).toBe('0원');
    });
  });

  describe('calcChange', () => {
    it('calculates percentage change', () => {
      expect(calcChange(120, 100)).toBe('20.0');
      expect(calcChange(80, 100)).toBe('-20.0');
    });

    it('returns null if previous is 0 or invalid', () => {
      expect(calcChange(100, 0)).toBe(null);
      expect(calcChange(100, null)).toBe(null);
    });
  });
});
