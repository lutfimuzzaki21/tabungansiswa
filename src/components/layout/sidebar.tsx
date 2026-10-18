'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  History,
  DollarSign,
  FileText,
  User,
  LogOut,
  PiggyBank,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  role?: string | null;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const teacherLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/kelas', label: 'Kelas', icon: BookOpen },
    { href: '/siswa', label: 'Siswa', icon: Users },
    { href: '/transaksi', label: 'Transaksi', icon: CreditCard },
    { href: '/riwayat', label: 'Riwayat Transaksi', icon: History },
    { href: '/pinjaman', label: 'Pinjaman Dana', icon: DollarSign },
    { href: '/penutupan', label: 'Penutupan', icon: FileText },
    { href: '/laporan', label: 'Laporan', icon: FileText },
    { href: '/profil', label: 'Profil', icon: User },
  ];

  const studentLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/riwayat', label: 'Riwayat Transaksi', icon: History },
    { href: '/profil', label: 'Profil', icon: User },
  ];

  const links = role === 'student' ? studentLinks : teacherLinks;

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar text-sidebar-foreground">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <PiggyBank className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Tabungan Siswa</h1>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">
              {role === 'student' ? 'Portal Siswa' : 'Portal Guru & Admin'}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'nav-link-active'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active && 'text-white')} />
                {link.label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <form action="/auth/signout" method="post">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            type="submit"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </form>
      </div>
    </div>
  );
}
