'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { PiggyBank, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN ERROR]', error);
      toast.error('Gagal masuk: ' + error.message);
      setLoading(false);
      return;
    }

    toast.success('Berhasil masuk! Mengalihkan...');
    router.push('/dashboard');
    router.refresh();
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="flex min-h-screen">
        {/* Left panel - branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-violet-700 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative text-center text-white max-w-md">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur mx-auto mb-6">
              <PiggyBank className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Tabungan Siswa</h1>
            <p className="text-white/80 text-lg leading-relaxed">
              Kelola keuangan sekolah dengan mudah. Catat setoran, penarikan,
              dan pantau saldo siswa secara real-time.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold">Setoran</p>
                <p className="text-xs text-white/60 mt-1">Mudah & Cepat</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold">Real-time</p>
                <p className="text-xs text-white/60 mt-1">Saldo Akurat</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold">Aman</p>
                <p className="text-xs text-white/60 mt-1">Enkripsi Penuh</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - login form */}
        <div className="flex flex-1 items-center justify-center p-6 bg-background">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-3">
                <PiggyBank className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Tabungan Siswa</h1>
            </div>

            <Card className="border-0 shadow-xl shadow-black/5">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold">Selamat Datang</CardTitle>
                <CardDescription>
                  Masuk ke akun Anda untuk melanjutkan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="nama@email.com"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Masukkan password"
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      'Masuk'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Aplikasi Tabungan Siswa &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
