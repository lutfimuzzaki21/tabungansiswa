/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';

type TxnRow = {
  id: string;
  transaction_number: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  notes: string | null;
  proof_url: string | null;
  created_at: string;
  students: {
    nis: string;
    full_name: string;
    classes: { name: string } | null;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Setoran',
  withdrawal: 'Penarikan',
  loan_disbursement: 'Pencairan Pinjaman',
  loan_repayment: 'Pembayaran Pinjaman',
  final_payout: 'Pencairan Akhir',
  adjustment: 'Penyesuaian',
  reversal: 'Pembalikan',
};

export default function RiwayatPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TxnRow | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!profile) return;
      let query = supabase
        .from('savings_transactions')
        .select(
          'id, transaction_number, type, amount, balance_before, balance_after, status, notes, proof_url, created_at, students(nis, full_name, classes(name))'
        )
        .order('created_at', { ascending: false })
        .limit(100);
      if (profile.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        if (student) query = query.eq('student_id', student.id);
      }
      const { data } = await query;
      setTransactions((data as unknown as TxnRow[]) || []);
      setLoading(false);
    }
    load();
  }, [profile, supabase]);

  const typeColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'loan_repayment':
      case 'final_payout':
        return 'bg-green-100 text-green-800';
      case 'withdrawal':
      case 'loan_disbursement':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
        <p className="text-muted-foreground mt-1">
          {profile?.role === 'student'
            ? 'Riwayat transaksi tabungan Anda'
            : 'Semua transaksi tabungan siswa'}
        </p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Daftar Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Belum ada transaksi.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Transaksi</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Saldo Setelah</TableHead>
                      <TableHead>Bukti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(t)}
                      >
                        <TableCell className="font-mono text-xs">{t.transaction_number}</TableCell>
                        <TableCell>{formatDateTime(t.created_at)}</TableCell>
                        <TableCell>{t.students?.full_name}</TableCell>
                        <TableCell>{t.students?.classes?.name ?? '-'}</TableCell>
                        <TableCell>
                          <Badge className={typeColor(t.type)}>{TYPE_LABELS[t.type] ?? t.type}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
                        <TableCell>{formatCurrency(Number(t.balance_after))}</TableCell>
                        <TableCell>{t.proof_url ? 'Ada' : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {transactions.map((t) => (
                  <Card key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{t.students?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{t.transaction_number}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={typeColor(t.type)}>{TYPE_LABELS[t.type] ?? t.type}</Badge>
                          <p className="mt-1 font-semibold">{formatCurrency(Number(t.amount))}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Transaksi</span>
                <span className="font-mono">{selected.transaction_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span>{formatDateTime(selected.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Siswa</span>
                <span>{selected.students?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jenis</span>
                <Badge className={typeColor(selected.type)}>
                  {TYPE_LABELS[selected.type] ?? selected.type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nominal</span>
                <span className="font-semibold">{formatCurrency(Number(selected.amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Sebelum</span>
                <span>{formatCurrency(Number(selected.balance_before))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Sesudah</span>
                <span>{formatCurrency(Number(selected.balance_after))}</span>
              </div>
              {selected.notes && (
                <div>
                  <span className="text-muted-foreground">Catatan</span>
                  <p>{selected.notes}</p>
                </div>
              )}
              {selected.proof_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.proof_url}
                  alt="Bukti transaksi"
                  className="w-full rounded-md border object-contain max-h-80"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
