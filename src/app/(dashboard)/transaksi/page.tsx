'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Upload,
  Loader2,
  CreditCard,
  ImageIcon,
  Search,
} from 'lucide-react';

type StudentOption = {
  id: string;
  nis: string;
  full_name: string;
  classes: { name: string } | null;
};

export default function TransaksiPage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('students')
      .select('id, nis, full_name, classes(name)')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        setStudents((data as unknown as StudentOption[]) || []);
      });
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount) return;
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
    }
    setLoading(true);

    let proof_url: string | null = null;
    let proof_path: string | null = null;
    if (file) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `transactions/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(path, file);
      if (uploadError) {
        toast.error('Gagal upload bukti: ' + uploadError.message);
        setLoading(false);
        return;
      }
      proof_path = path;
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path);
      proof_url = urlData.publicUrl;
    }

    try {
      const idempotencyKey = crypto.randomUUID();
      if (type === 'deposit') {
        const { error } = await supabase.rpc('record_deposit', {
          p_student_id: studentId,
          p_amount: parseFloat(amount),
          p_proof_url: proof_url,
          p_proof_path: proof_path,
          p_notes: notes || null,
          p_idempotency_key: idempotencyKey,
        });
        if (error) throw error;
        toast.success('Setoran berhasil dicatat');
      } else {
        const { error } = await supabase.rpc('record_withdrawal', {
          p_student_id: studentId,
          p_amount: parseFloat(amount),
          p_proof_url: proof_url,
          p_proof_path: proof_path,
          p_notes: notes || null,
          p_idempotency_key: idempotencyKey,
        });
        if (error) throw error;
        toast.success('Penarikan berhasil dicatat');
      }
      setAmount('');
      setNotes('');
      setFile(null);
      setPreview(null);
      setStudentId(null);
      setStudentSearch('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String(err.message)
            : 'Gagal melakukan transaksi';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isDeposit = type === 'deposit';
  const filteredStudents = students.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    return (
      !query ||
      student.full_name.toLowerCase().includes(query) ||
      student.nis.toLowerCase().includes(query) ||
      student.classes?.name.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaksi Tabungan</h1>
          <p className="text-muted-foreground mt-1">
            Catat setoran atau penarikan tabungan siswa
          </p>
        </div>

        {/* Toggle jenis transaksi */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('deposit')}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              isDeposit
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-emerald-300'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isDeposit ? 'bg-emerald-500 text-white' : 'bg-muted'
              }`}
            >
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Setoran</p>
              <p className="text-xs opacity-70">Uang masuk</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setType('withdrawal')}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
              !isDeposit
                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-red-300'
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                !isDeposit ? 'bg-red-500 text-white' : 'bg-muted'
              }`}
            >
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Penarikan</p>
              <p className="text-xs opacity-70">Uang keluar</p>
            </div>
          </button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {isDeposit ? 'Form Setoran' : 'Form Penarikan'}
            </CardTitle>
            <CardDescription>
              Isi data di bawah untuk mencatat transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Siswa</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setStudentId(null);
                      setStudentPickerOpen(true);
                    }}
                    onFocus={() => setStudentPickerOpen(true)}
                    placeholder="Cari nama atau NIS siswa..."
                    className="h-11 pl-9"
                    required
                  />
                  {studentPickerOpen && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setStudentId(student.id);
                              setStudentSearch(`${student.full_name} - ${student.nis}`);
                              setStudentPickerOpen(false);
                            }}
                            className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <span className="font-medium">{student.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {student.nis} · {student.classes?.name ?? 'Tanpa kelas'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          Siswa tidak ditemukan
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Nominal (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  placeholder="0"
                  className="h-11 text-lg font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan tambahan..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof">
                  Foto Bukti {isDeposit ? 'Setoran' : 'Penarikan'} (opsional)
                </Label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="proof"
                    className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Pilih Foto
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {file ? file.name : 'Maks 5MB, format gambar'}
                  </span>
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {preview && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Preview bukti"
                      className="max-h-48 rounded-lg border object-contain shadow-sm"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className={`w-full h-11 text-base font-medium ${
                  isDeposit
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Simpan {isDeposit ? 'Setoran' : 'Penarikan'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
