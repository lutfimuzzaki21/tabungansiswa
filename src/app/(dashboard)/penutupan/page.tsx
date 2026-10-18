/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
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
import { Plus, PenLine, Loader2, FileText } from 'lucide-react';
import SignaturePad from 'signature_pad';
import { formatCurrency } from '@/lib/utils/format';

type PeriodRow = {
  id: string;
  name: string;
  academic_year: string | null;
  semester: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type ClosurePreview = {
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  total_deposits: number;
  total_withdrawals: number;
  loans_outstanding: number;
  balance_snapshot: number;
  final_amount: number;
};

export default function PenutupanPage() {
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [open, setOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodRow | null>(null);
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [form, setForm] = useState({ name: '', academic_year: '', semester: '', notes: '' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    const { data } = await supabase
      .from('closure_periods')
      .select('*')
      .order('created_at', { ascending: false });
    setPeriods((data as unknown as PeriodRow[]) || []);
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('closure_periods')
      .insert({ ...form, status: 'draft' });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Periode penutupan dibuat');
      setOpen(false);
      setForm({ name: '', academic_year: '', semester: '', notes: '' });
      loadPeriods();
    }
  };

  const startSigning = async (period: PeriodRow) => {
    setSelectedPeriod(period);
    // Load first student's savings summary for preview (in production, this should iterate all students in the period)
    const { data: students } = await supabase
      .from('students')
      .select('id, nis, full_name, classes(name), savings_accounts(balance, total_deposits, total_withdrawals)')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (students) {
      const acc = (students as any).savings_accounts;
      const previewData: ClosurePreview = {
        student_id: students.id,
        student_name: students.full_name,
        nis: students.nis,
        class_name: students.classes?.name ?? '-',
        total_deposits: Number(acc?.total_deposits || 0),
        total_withdrawals: Number(acc?.total_withdrawals || 0),
        loans_outstanding: 0,
        balance_snapshot: Number(acc?.balance || 0),
        final_amount: Number(acc?.balance || 0),
      };
      setPreview(previewData);
    }
    setSignatureData(null);
    setSignOpen(true);
    setTimeout(() => {
      if (canvasRef.current) {
        sigPadRef.current = new SignaturePad(canvasRef.current, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(0, 0, 0)',
        });
      }
    }, 100);
  };

  const clearSignature = () => {
    sigPadRef.current?.clear();
    setSignatureData(null);
  };

  const handleSign = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast.error('Tanda tangan belum diisi');
      return;
    }
    if (!selectedPeriod || !preview) return;

    setSigning(true);
    const dataUrl = sigPadRef.current.toDataURL('image/png');

    try {
      // Upload signature image
      const blob = await (await fetch(dataUrl)).blob();
      const path = `signatures/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
      const { error: uploadError } = await supabase.storage.from('proofs').upload(path, blob);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path);

      // Save closure record
      const { error } = await supabase.from('savings_closures').insert({
        closure_period_id: selectedPeriod.id,
        student_id: preview.student_id,
        savings_account_id: '',
        total_deposits: preview.total_deposits,
        total_withdrawals: preview.total_withdrawals,
        loans_outstanding: preview.loans_outstanding,
        balance_snapshot: preview.balance_snapshot,
        final_amount: preview.final_amount,
        status: 'signed',
        signature_data: dataUrl,
        signature_image_url: urlData.publicUrl,
        signed_at: new Date().toISOString(),
      });
      if (error) throw error;

      toast.success('Penutupan tabungan berhasil ditandatangani');
      setSignOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menandatangani');
    } finally {
      setSigning(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Penutupan Tabungan</h1>
            <p className="text-muted-foreground mt-1">
              Tutup tabungan semester dan tanda tangani
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Buat Periode</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Periode Penutupan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePeriod} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Periode</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Penutupan Semester 1 2025/2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tahun Ajaran</Label>
                  <Input
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    placeholder="2025/2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    placeholder="Ganjil"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Simpan
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Periode Penutupan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {periods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Belum ada periode penutupan.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Periode</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.academic_year ?? '-'}</TableCell>
                      <TableCell>{p.semester ?? '-'}</TableCell>
                      <TableCell>
                        <Badge className={p.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {p.status === 'closed' ? 'Ditutup' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.status === 'draft' && (
                          <Button size="sm" onClick={() => startSigning(p)}>
                            <PenLine className="h-4 w-4 mr-1" />
                            Tandatangani
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog Tanda Tangan */}
        <Dialog open={signOpen} onOpenChange={setSignOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tanda Tangan Digital Penutupan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {preview && (
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Siswa</span>
                      <span className="font-medium">{preview.student_name} ({preview.nis})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Setoran</span>
                      <span>{formatCurrency(preview.total_deposits)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Penarikan</span>
                      <span>{formatCurrency(preview.total_withdrawals)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo Akhir</span>
                      <span className="font-bold">{formatCurrency(preview.final_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label>Tanda Tangan</Label>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="border rounded-md w-full bg-white"
                />
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Hapus Tanda Tangan
                </Button>
              </div>
              <Button onClick={handleSign} className="w-full" disabled={signing}>
                {signing ? 'Menyimpan...' : 'Tandatangani & Simpan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
