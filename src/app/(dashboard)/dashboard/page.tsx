/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
} from 'lucide-react';

type RecentTxn = {
  id: string;
  transaction_number: string;
  type: string;
  amount: number;
  created_at: string;
  students: { full_name: string } | null;
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<RecentTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      if (!profile) return;

      try {
        if (profile.role === 'student') {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', profile.id)
            .single();
          if (student) {
            const { data: account } = await supabase
              .from('savings_accounts')
              .select('balance, total_deposits, total_withdrawals')
              .eq('student_id', student.id)
              .single();
            setStats({
              balance: Number(account?.balance || 0),
              total_deposits: Number(account?.total_deposits || 0),
              total_withdrawals: Number(account?.total_withdrawals || 0),
            });

            const { data: txns } = await supabase
              .from('savings_transactions')
              .select(
                'id, transaction_number, type, amount, created_at, students(full_name)'
              )
              .eq('student_id', student.id)
              .order('created_at', { ascending: false })
              .limit(10);
            setRecent((txns as unknown as RecentTxn[]) || []);
          }
        } else {
          const [
            { data: saldo },
            { count: siswaCount },
            { count: kelasCount },
            { data: txns },
            { data: loansOutstanding },
          ] = await Promise.all([
            supabase.from('savings_accounts').select('balance'),
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true),
            supabase
              .from('classes')
              .select('*', { count: 'exact', head: true })
              .eq('is_active', true),
            supabase
              .from('savings_transactions')
              .select(
                'id, transaction_number, type, amount, created_at, students(full_name)'
              )
              .order('created_at', { ascending: false })
              .limit(10),
            supabase.from('loans').select('amount_outstanding').eq('status', 'active'),
          ]);
          const totalSaldoSiswa = (saldo || []).reduce(
            (acc: number, r: any) => acc + Number(r.balance || 0),
            0
          );
          const totalLoanOut = (loansOutstanding || []).reduce(
            (acc: number, r: any) => acc + Number(r.amount_outstanding || 0),
            0
          );
          const totalTabungan = totalSaldoSiswa - totalLoanOut;
          setStats({
            totalSaldo: totalSaldoSiswa,
            totalTabungan: Math.max(totalTabungan, 0),
            pinjamanGuru: totalLoanOut,
            siswaCount: siswaCount || 0,
            kelasCount: kelasCount || 0,
          });
          setRecent((txns as unknown as RecentTxn[]) || []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [profile, supabase]);

  const isStudent = profile?.role === 'student';

  const studentStats = [
    {
      label: 'Saldo Tabungan',
      value: formatCurrency(stats.balance || 0),
      icon: Wallet,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Total Setoran',
      value: formatCurrency(stats.total_deposits || 0),
      icon: TrendingUp,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Total Penarikan',
      value: formatCurrency(stats.total_withdrawals || 0),
      icon: TrendingDown,
      color: 'text-red-500',
      iconBg: 'bg-red-100',
    },
  ];

  const teacherStats = [
    {
      label: 'Saldo Tabungan Siswa',
      value: formatCurrency(stats.totalSaldo || 0),
      icon: Wallet,
      iconBg: 'bg-blue-100',
      color: 'text-blue-600',
    },
    {
      label: 'Total Tabungan (Net)',
      value: formatCurrency(stats.totalTabungan ?? stats.totalSaldo ?? 0),
      icon: PiggyBank,
      iconBg: 'bg-emerald-100',
      color: 'text-emerald-600',
    },
    {
      label: 'Pinjaman Dana Aktif',
      value: formatCurrency(stats.pinjamanGuru || 0),
      icon: TrendingDown,
      iconBg: 'bg-red-100',
      color: 'text-red-500',
    },
    {
      label: 'Siswa Aktif',
      value: String(stats.siswaCount || 0),
      icon: Users,
      iconBg: 'bg-violet-100',
      color: 'text-violet-600',
    },
    {
      label: 'Kelas Aktif',
      value: String(stats.kelasCount || 0),
      icon: BookOpen,
      iconBg: 'bg-amber-100',
      color: 'text-amber-600',
    },
  ];

  const statCards = isStudent ? studentStats : teacherStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Halo, {profile?.full_name?.split(' ')[0] || 'Pengguna'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {isStudent
            ? 'Pantau tabunganmu di sini.'
            : 'Ringkasan aktivitas tabungan siswa hari ini.'}
        </p>
      </div>

          {loading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : (
        <>
          {loading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className="stat-card border-0 shadow-sm bg-card overflow-hidden"
                  >
                    <CardContent className="p-5 flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg} shrink-0`}
                      >
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-xl font-bold mt-0.5 truncate">
                          {stat.value}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
          )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PiggyBank className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Belum ada transaksi.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((t) => {
                const isIn =
                  t.type === 'deposit' || t.type === 'loan_repayment';
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isIn ? 'bg-emerald-100' : 'bg-red-100'
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.students?.full_name || 'Siswa'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.transaction_number} · {formatDate(t.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold shrink-0 ${
                        isIn ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {isIn ? '+' : '-'}
                      {formatCurrency(Number(t.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
