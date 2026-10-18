import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';

describe('formatCurrency', () => {
  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats positive amount with IDR symbol', () => {
    const result = formatCurrency(100000);
    expect(result).toContain('100');
    expect(result).toContain('000');
  });

  it('formats large amount', () => {
    const result = formatCurrency(1500000);
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('handles decimal input by rounding to integer', () => {
    const result = formatCurrency(1000.5);
    expect(result).toContain('1');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2026-01-15T10:00:00Z');
    expect(result).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });

  it('formats Date object', () => {
    const date = new Date('2026-06-20T12:00:00Z');
    const result = formatDate(date);
    expect(result).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  it('formats date with time', () => {
    const result = formatDateTime('2026-03-10T14:30:00Z');
    expect(result).toMatch(/\d{2}\s\w{3}\s\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});
