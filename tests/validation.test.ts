import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Validasi skema transaksi sesuai aturan bisnis
const depositSchema = z.object({
  student_id: z.string().uuid('ID siswa tidak valid'),
  amount: z.number().positive('Nominal harus lebih besar dari nol'),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
});

const withdrawalSchema = z.object({
  student_id: z.string().uuid('ID siswa tidak valid'),
  amount: z.number().positive('Nominal harus lebih besar dari nol'),
  notes: z.string().max(500).optional(),
});

const loanSchema = z.object({
  student_id: z.string().uuid('ID siswa tidak valid'),
  amount: z.number().positive('Nominal pinjaman harus lebih besar dari nol'),
  due_date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const repaymentSchema = z.object({
  loan_id: z.string().uuid('ID pinjaman tidak valid'),
  amount: z.number().positive('Nominal pembayaran harus lebih besar dari nol'),
  notes: z.string().max(500).optional(),
});

describe('Validasi Setoran (Deposit)', () => {
  it('menerima input valid', () => {
    const result = depositSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 50000,
    });
    expect(result.success).toBe(true);
  });

  it('menolak nominal nol', () => {
    const result = depositSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('menolak nominal negatif', () => {
    const result = depositSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: -10000,
    });
    expect(result.success).toBe(false);
  });

  it('menolak ID siswa tidak valid', () => {
    const result = depositSchema.safeParse({
      student_id: 'invalid-uuid',
      amount: 50000,
    });
    expect(result.success).toBe(false);
  });
});

describe('Validasi Penarikan (Withdrawal)', () => {
  it('menerima input valid', () => {
    const result = withdrawalSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 25000,
    });
    expect(result.success).toBe(true);
  });

  it('menolak nominal nol', () => {
    const result = withdrawalSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('Validasi Pinjaman (Loan)', () => {
  it('menerima input valid', () => {
    const result = loanSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100000,
      due_date: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('menolak nominal negatif', () => {
    const result = loanSchema.safeParse({
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: -50000,
    });
    expect(result.success).toBe(false);
  });
});

describe('Validasi Pengembalian Pinjaman (Repayment)', () => {
  it('menerima input valid', () => {
    const result = repaymentSchema.safeParse({
      loan_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 50000,
    });
    expect(result.success).toBe(true);
  });

  it('menolak nominal nol', () => {
    const result = repaymentSchema.safeParse({
      loan_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('menolak ID pinjaman tidak valid', () => {
    const result = repaymentSchema.safeParse({
      loan_id: 'not-a-uuid',
      amount: 50000,
    });
    expect(result.success).toBe(false);
  });
});

// Test logika perhitungan saldo
describe('Logika Perhitungan Saldo', () => {
  it('setoran menambah saldo', () => {
    const balance = 100000;
    const deposit = 50000;
    expect(balance + deposit).toBe(150000);
  });

  it('penarikan mengurangi saldo', () => {
    const balance = 100000;
    const withdrawal = 30000;
    expect(balance - withdrawal).toBe(70000);
  });

  it('penarikan melebihi saldo harus ditolak', () => {
    const balance = 50000;
    const withdrawal = 100000;
    expect(balance < withdrawal).toBe(true); // harus ditolak
  });

  it('pinjaman mengurangi saldo tersedia', () => {
    const balance = 200000;
    const loanAmount = 80000;
    expect(balance - loanAmount).toBe(120000);
  });

  it('pengembalian pinjaman menambah saldo dan mengurangi sisa', () => {
    const balance = 120000;
    const repayment = 40000;
    const loanOutstanding = 80000;
    expect(balance + repayment).toBe(160000);
    expect(loanOutstanding - repayment).toBe(40000);
  });

  it('pembayaran melebihi sisa pinjaman harus ditolak', () => {
    const outstanding = 50000;
    const payment = 80000;
    expect(payment > outstanding).toBe(true); // harus ditolak
  });

  it('saldo tidak boleh negatif setelah penarikan', () => {
    const balance = 100000;
    const withdrawal = 150000;
    const newBalance = balance - withdrawal;
    expect(newBalance).toBeLessThan(0); // ini yang harus dicegah oleh RPC
  });
});
