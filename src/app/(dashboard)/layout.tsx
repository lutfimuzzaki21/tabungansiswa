'use client';

import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary animate-pulse">
            <PiggyBank className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">Memuat...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile topbar */}
      <div className="md:hidden sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="px-4 h-14 flex items-center justify-between">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Buka menu" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground border-0">
              <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
              <Sidebar role={profile?.role} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <PiggyBank className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Tabungan Siswa</span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* Content: sidebar desktop + main */}
      <div className="flex">
        <div className="hidden md:block w-64 shrink-0">
          <div className="sticky top-0 h-screen">
            <Sidebar role={profile?.role} />
          </div>
        </div>
        <main className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
