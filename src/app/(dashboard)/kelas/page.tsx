'use client';

import { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { Plus, Pencil, BookOpen, Loader2 } from 'lucide-react';

export default function KelasPage() {
  const [classes, setClasses] = useState<
    {
      id: string;
      name: string;
      grade_level: string | null;
      academic_year: string | null;
      is_active: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', grade_level: '', academic_year: '' });
  const supabase = createClient();

  const loadClasses = async () => {
    setLoading(true);
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses((data as never) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase.from('classes').update(form).eq('id', editId);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Kelas diperbarui');
        setOpen(false);
        setEditId(null);
        setForm({ name: '', grade_level: '', academic_year: '' });
        loadClasses();
      }
    } else {
      const { error } = await supabase
        .from('classes')
        .insert({ ...form, is_active: true });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Kelas ditambahkan');
        setOpen(false);
        setForm({ name: '', grade_level: '', academic_year: '' });
        loadClasses();
      }
    }
  };

  const openEdit = (c: (typeof classes)[number]) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      grade_level: c.grade_level || '',
      academic_year: c.academic_year || '',
    });
    setOpen(true);
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Kelas</h1>
            <p className="text-muted-foreground mt-1">
              Kelola daftar kelas di sekolah Anda
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button
                  onClick={() => {
                    setEditId(null);
                    setForm({ name: '', grade_level: '', academic_year: '' });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kelas
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Kelas</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="cth: 1A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_level">Tingkat Kelas</Label>
                  <Input
                    id="grade_level"
                    value={form.grade_level}
                    onChange={(e) =>
                      setForm({ ...form, grade_level: e.target.value })
                    }
                    placeholder="cth: 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Tahun Ajaran</Label>
                  <Input
                    id="academic_year"
                    value={form.academic_year}
                    onChange={(e) =>
                      setForm({ ...form, academic_year: e.target.value })
                    }
                    placeholder="2025/2026"
                  />
                </div>
                <Button type="submit" className="w-full h-11">
                  Simpan
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Daftar Kelas
              <Badge variant="secondary" className="ml-2">
                {classes.length} kelas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Belum ada kelas. Tambahkan kelas pertama Anda.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Kelas</TableHead>
                        <TableHead>Tingkat</TableHead>
                        <TableHead>Tahun Ajaran</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.grade_level ?? '-'}</TableCell>
                          <TableCell>{c.academic_year ?? '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={c.is_active ? 'default' : 'secondary'}
                              className={c.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : ''}
                            >
                              {c.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {classes.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tingkat {c.grade_level ?? '-'} · TA {c.academic_year ?? '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={c.is_active ? 'default' : 'secondary'}
                          className={c.is_active ? 'bg-emerald-100 text-emerald-700' : ''}
                        >
                          {c.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={() => openEdit(c)}
                          aria-label="Edit kelas"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
