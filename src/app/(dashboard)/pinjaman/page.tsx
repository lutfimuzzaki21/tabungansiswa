'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast, Toaster } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Plus, CreditCard, Loader2, PiggyBank, Wallet } from 'lucide-react';

type LoanRow = {
  id: string;
  principal_amount: number;
  amount_repaid: number;
  amount_outstanding: number;
  status: string;
  due_date: string | null;
  notes: string | null;
  description: string | null;
  created_at: string;
  borrowed_by: string | null;
};

export default function PinjamanPage() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [netSavings, setNetSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);
  const [form, setForm] = useState({
    amount: '',
    due_date: '',
    description: '',
    notes: '',
  });
  const [repay, setRepay] = useState({ amount: '', notes: '' });
  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    let loanQuery = supabase
      .from('loans')
      .select(
        'id, principal_amount, amount_repaid, amount_outstanding, status, due_date, notes, description, created_at, borrowed_by'
      )
      .order('created_at', { ascending: false });
    if (profile?.role !== 'admin') {
      loanQuery = loanQuery.eq('borrowed_by', profile!.id);
    }
    const [{ data }, { data: savingsData }, { data: activeLoans }] = await Promise.all([
      loanQuery,
      supabase.from('savings_accounts').select('balance, total_deposits'),
      supabase.from('loans').select('amount_outstanding').eq('status', 'active'),
    ]);
    const savings = savingsData || [];
    const totalDeposits = savings.reduce(
      (total, account) => total + Number(account.total_deposits || 0),
      0
    );
    const currentBalance = savings.reduce(
      (total, account) => total + Number(account.balance || 0),
      0
    );
    const outstandingLoans = (activeLoans || []).reduce(
      (total, loan) => total + Number(loan.amount_outstanding || 0),
      0
    );
    setTotalSavings(totalDeposits);
    setNetSavings(Math.max(currentBalance - outstandingLoans, 0));
    setLoans((data as unknown as LoanRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const { error } = await supabase.rpc('disburse_teacher_loan', {
        p_borrowed_by: profile.id,
        p_amount: parseFloat(form.amount),
        p_due_date: form.due_date || null,
        p_description: form.description || null,
        p_notes: form.notes || null,
      });
      if (error) throw error;
      toast.success('Pinjaman dana berhasil dicatat');
      setOpen(false);
      setForm({ amount: '', due_date: '', description: '', notes: '' });
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mencatat pinjaman');
    }
  };

  const openRepay = (loan: LoanRow) => {
    setSelectedLoan(loan);
    setRepay({ amount: String(loan.amount_outstanding), notes: '' });
    setRepayOpen(true);
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    try {
      const { error } = await supabase.rpc('repay_teacher_loan', {
        p_loan_id: selectedLoan.id,
        p_amount: parseFloat(repay.amount),
        p_notes: repay.notes || null,
      });
      if (error) throw error;
      toast.success('Pengembalian dana berhasil dicatat');
      setRepayOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memproses pembayaran');
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pinjaman Dana</h1>
            <p className="text-muted-foreground mt-1">
              Pencatatan pinjaman & pengembalian dana (tidak memengaruhi saldo per siswa)
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Catat Pinjaman Dana
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Catat Pinjaman Dana</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDisburse} className="space-y-4">
                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    placeholder="Contoh: Pinjaman untuk kebutuhan sekolah"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nominal Pinjaman</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    min="1"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Jatuh Tempo</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={!form.amount}>
                  Simpan
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-0 bg-emerald-50 shadow-sm dark:bg-emerald-950/20">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-emerald-800/70 dark:text-emerald-200/70">
                  Total Tabungan Siswa
                </p>
                <p className="mt-1 truncate text-xl font-bold text-emerald-900 dark:text-emerald-100">
                  {loading ? 'Memuat...' : formatCurrency(totalSavings)}
                </p>
                <p className="mt-1 text-xs text-emerald-800/60 dark:text-emerald-200/60">
                  Akumulasi setoran seluruh siswa
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-blue-50 shadow-sm dark:bg-blue-950/20">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-blue-800/70 dark:text-blue-200/70">
                  Saldo Tabungan
                </p>
                <p className="mt-1 truncate text-xl font-bold text-blue-900 dark:text-blue-100">
                  {loading ? 'Memuat...' : formatCurrency(netSavings)}
                </p>
                <p className="mt-1 text-xs text-blue-800/60 dark:text-blue-200/60">
                  Setelah pinjaman aktif dikurangi
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Daftar Pinjaman Dana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : loans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CreditCard className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Belum ada pinjaman dana.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Pokok</TableHead>
                        <TableHead>Dibayar</TableHead>
                        <TableHead>Sisa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.description ?? l.notes ?? '-'}</TableCell>
                          <TableCell>{formatCurrency(Number(l.principal_amount))}</TableCell>
                          <TableCell>{formatCurrency(Number(l.amount_repaid))}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(Number(l.amount_outstanding))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                l.status === 'active'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : l.status === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {l.status === 'active'
                                ? 'Aktif'
                                : l.status === 'paid'
                                  ? 'Lunas'
                                  : 'Dibatalkan'}
                            </Badge>
                          </TableCell>
                          <TableCell>{l.due_date ? formatDate(l.due_date) : '-'}</TableCell>
                          <TableCell>
                            {l.status === 'active' && (
                              <Button size="sm" onClick={() => openRepay(l)}>
                                <CreditCard className="h-4 w-4 mr-1" />
                                Bayar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-3">
                  {loans.map((l) => (
                    <Card key={l.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{l.description ?? l.notes ?? 'Pinjaman Dana'}</p>
                            <p className="text-xs text-muted-foreground">
                              Pokok: {formatCurrency(Number(l.principal_amount))}
                            </p>
                          </div>
                          <Badge
                            className={
                              l.status === 'active'
                                ? 'bg-yellow-100 text-yellow-800'
                                : l.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {l.status === 'active'
                              ? 'Aktif'
                              : l.status === 'paid'
                                ? 'Lunas'
                                : 'Dibatalkan'}
                          </Badge>
                        </div>
                        <p className="text-sm">
                          Sisa: {formatCurrency(Number(l.amount_outstanding))}
                        </p>
                        {l.status === 'active' && (
                          <Button size="sm" onClick={() => openRepay(l)} className="w-full">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Bayar Pengembalian
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pembayaran Pengembalian Dana</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRepay} className="space-y-4">
              <div className="space-y-2">
                <Label>Sisa Pinjaman</Label>
                <Input
                  value={
                    selectedLoan
                      ? formatCurrency(Number(selectedLoan.amount_outstanding))
                      : ''
                  }
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Nominal Pembayaran</Label>
                <Input
                  type="number"
                  value={repay.amount}
                  onChange={(e) => setRepay({ ...repay, amount: e.target.value })}
                  required
                  min="1"
                  max={selectedLoan?.amount_outstanding}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input
                  value={repay.notes}
                  onChange={(e) => setRepay({ ...repay, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full h-11">
                Simpan Pembayaran
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
