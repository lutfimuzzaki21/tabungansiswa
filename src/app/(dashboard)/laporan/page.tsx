'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
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
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

type SaldoRow = {
  id: string;
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  students: {
    nis: string;
    full_name: string;
    classes: { name: string } | null;
  } | null;
};

export default function LaporanPage() {
  const [saldo, setSaldo] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('savings_accounts')
        .select(
          'id, balance, total_deposits, total_withdrawals, students(nis, full_name, classes(name))'
        )
        .order('balance', { ascending: false });
      setSaldo((data as unknown as SaldoRow[]) || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const exportXlsx = () => {
    const rows = saldo.map((s) => ({
      NIS: s.students?.nis ?? '',
      Nama: s.students?.full_name ?? '',
      Kelas: s.students?.classes?.name ?? '',
      Saldo: Number(s.balance || 0),
      'Total Setoran': Number(s.total_deposits || 0),
      'Total Penarikan': Number(s.total_withdrawals || 0),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Tabungan');
    XLSX.writeFile(workbook, `laporan-tabungan-${Date.now()}.xlsx`);
  };

  const totalSaldo = saldo.reduce((acc, s) => acc + Number(s.balance || 0), 0);
  const totalSetoran = saldo.reduce((acc, s) => acc + Number(s.total_deposits || 0), 0);
  const totalPenarikan = saldo.reduce((acc, s) => acc + Number(s.total_withdrawals || 0), 0);

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Saldo Per Siswa</h1>
          <p className="text-muted-foreground mt-1">
            Total tabungan seluruh siswa: {formatCurrency(totalSaldo)}
          </p>
        </div>
        <Button onClick={exportXlsx} disabled={loading || saldo.length === 0} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Ekspor XLSX
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Saldo</p>
          <p className="mt-1 text-lg font-bold">{loading ? 'Memuat...' : formatCurrency(totalSaldo)}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="text-sm text-emerald-800/70 dark:text-emerald-200/70">Total Setoran</p>
          <p className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">
            {loading ? 'Memuat...' : formatCurrency(totalSetoran)}
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm text-red-800/70 dark:text-red-200/70">Total Penarikan</p>
          <p className="mt-1 text-lg font-bold text-red-900 dark:text-red-100">
            {loading ? 'Memuat...' : formatCurrency(totalPenarikan)}
          </p>
        </div>
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Saldo Tabungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : saldo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Belum ada data tabungan.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Setoran</TableHead>
                      <TableHead>Penarikan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saldo.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.students?.nis}</TableCell>
                        <TableCell>{s.students?.full_name}</TableCell>
                        <TableCell>{s.students?.classes?.name ?? '-'}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(Number(s.balance))}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(Number(s.total_deposits))}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(Number(s.total_withdrawals))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {saldo.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{s.students?.full_name ?? 'Siswa tanpa nama'}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.students?.nis ?? '-'} · {s.students?.classes?.name ?? 'Tanpa kelas'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p className="font-bold">{formatCurrency(Number(s.balance))}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Setoran</p>
                          <p className="font-medium text-emerald-600">{formatCurrency(Number(s.total_deposits))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Penarikan</p>
                          <p className="font-medium text-red-600">{formatCurrency(Number(s.total_withdrawals))}</p>
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
