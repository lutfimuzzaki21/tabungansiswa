'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase';
import { useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { User, Mail, Shield, KeyRound, Loader2 } from 'lucide-react';

export default function ProfilPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const supabase = createClient();

  const handleResetPassword = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success('Password berhasil diubah');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil Pengguna</h1>
          <p className="text-muted-foreground mt-1">
            Informasi akun dan pengaturan password
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{profile?.full_name}</p>
                <Badge className="mt-1 bg-primary/10 text-primary hover:bg-primary/20">
                  {profile?.role === 'student'
                    ? 'Siswa'
                    : profile?.role === 'teacher'
                      ? 'Guru'
                      : 'Admin'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <p className="font-medium">{user?.email}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
              <Shield className="h-4 w-4" />
              Role:{' '}
              <span className="text-foreground font-medium">
                {profile?.role === 'student'
                  ? 'Siswa'
                  : profile?.role === 'teacher'
                    ? 'Guru'
                    : 'Admin'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Ganti Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="h-11"
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={loading || !password}
              className="w-full h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Ubah Password'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
