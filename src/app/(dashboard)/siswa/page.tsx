'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import {
  Plus,
  Pencil,
  Users,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type ParsedRow = {
  line: number;
  nis: string;
  full_name: string;
  class_name: string;
  academic_year: string;
  valid: boolean;
  error?: string;
};

function parseXlsx(data: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  if (json.length === 0) return { headers: [], rows: [] };
  const headers = (json[0] as string[]).map((h) => String(h).toLowerCase().trim());
  const rows = json.slice(1).map((r) => (r as unknown[]).map((c) => String(c ?? '').trim()));
  return { headers, rows };
}

export default function SiswaPage() {
  const [students, setStudents] = useState<
    {
      id: string;
      nis: string;
      full_name: string;
      class_id: string | null;
      academic_year: string | null;
      is_active: boolean;
      classes: { name: string } | null;
    }[]
  >([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nis: '',
    full_name: '',
    class_id: '',
    academic_year: '',
  });
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: stu }, { data: cls }] = await Promise.all([
      supabase
        .from('students')
        .select('id, nis, full_name, class_id, academic_year, is_active, classes(name)')
        .order('full_name'),
      supabase
        .from('classes')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ]);
    setStudents((stu as never) || []);
    setClasses((cls as never) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase
        .from('students')
        .update(form)
        .eq('id', editId);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Siswa diperbarui');
        setOpen(false);
        setEditId(null);
        setForm({ nis: '', full_name: '', class_id: '', academic_year: '' });
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('students')
        .insert({ ...form, is_active: true });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Siswa ditambahkan');
        setOpen(false);
        setForm({ nis: '', full_name: '', class_id: '', academic_year: '' });
        loadData();
      }
    }
  };

  const openEdit = (s: (typeof students)[number]) => {
    setEditId(s.id);
    setForm({
      nis: s.nis,
      full_name: s.full_name,
      class_id: s.class_id || '',
      academic_year: s.academic_year || '',
    });
    setOpen(true);
  };

  // ─── Import CSV ────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [defaultYear, setDefaultYear] = useState('2025/2026');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    if (!isXlsx) {
      toast.error('File harus berformat .xlsx atau .xls');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as ArrayBuffer;
      const { headers, rows } = parseXlsx(data);

      const idxNis = headers.findIndex((h) => h === 'nis' || h === 'no_induk' || h === 'nomor_induk');
      const idxName = headers.findIndex((h) => h === 'nama' || h === 'nama_lengkap' || h === 'full_name' || h === 'name');
      const idxClass = headers.findIndex((h) => h === 'kelas' || h === 'class' || h === 'class_name');
      const idxYear = headers.findIndex((h) => h === 'tahun_ajaran' || h === 'academic_year' || h === 'ta');

      if (idxNis === -1 || idxName === -1) {
        toast.error('Header Excel harus minimal berisi kolom "nis" dan "nama"');
        setParsed(null);
        return;
      }

      const existingNis = new Set(students.map((s) => s.nis));

      const parsedRows: ParsedRow[] = rows.map((r, i) => {
        const nis = (r[idxNis] || '').trim();
        const full_name = (r[idxName] || '').trim();
        const class_name = idxClass !== -1 ? (r[idxClass] || '').trim() : '';
        const academic_year =
          idxYear !== -1 && r[idxYear]?.trim()
            ? r[idxYear].trim()
            : defaultYear;

        let valid = true;
        let error = '';
        if (!nis) {
          valid = false;
          error = 'NIS kosong';
        } else if (!full_name) {
          valid = false;
          error = 'Nama kosong';
        } else if (existingNis.has(nis)) {
          valid = false;
          error = 'NIS sudah terdaftar';
        }

        return { line: i + 2, nis, full_name, class_name, academic_year, valid, error };
      });

      setParsed(parsedRows);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    const validRows = parsed.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('Tidak ada baris valid untuk diimpor');
      return;
    }
    setImporting(true);

    const classNameToId = new Map(classes.map((c) => [c.name.toLowerCase(), c.id]));

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      const classId = row.class_name
        ? classNameToId.get(row.class_name.toLowerCase()) ?? null
        : null;

      const { error } = await supabase.from('students').insert({
        nis: row.nis,
        full_name: row.full_name,
        class_id: classId,
        academic_year: row.academic_year,
        is_active: true,
      });

      if (error) {
        failCount++;
        console.error(`Baris ${row.line}:`, error.message);
      } else {
        successCount++;
      }
    }

    setImporting(false);
    if (successCount > 0) {
      toast.success(`${successCount} siswa berhasil diimpor`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} siswa gagal diimpor`);
    }
    setImportOpen(false);
    setParsed(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadData();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nis', 'nama', 'kelas', 'tahun_ajaran'],
      ['001', 'Budi Santoso', '1A', '2025/2026'],
      ['002', 'Siti Aminah', '1A', '2025/2026'],
      ['003', 'Ahmad Fauzi', '2B', '2025/2026'],
    ]);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, 'template_import_siswa.xlsx');
  };

  const resetImport = () => {
    setParsed(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = parsed?.filter((r) => r.valid).length ?? 0;
  const invalidCount = parsed?.filter((r) => !r.valid).length ?? 0;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Siswa</h1>
            <p className="text-muted-foreground mt-1">
              Kelola data siswa yang terdaftar
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Tombol Import */}
            <Dialog
              open={importOpen}
              onOpenChange={(v) => {
                setImportOpen(v);
                if (!v) resetImport();
              }}
            >
              <DialogTrigger
                render={
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                }
              />
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Siswa dari Excel</DialogTitle>
                </DialogHeader>

                {/* Langkah 1: Template */}
                {!parsed && (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-start gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-sm space-y-2">
                          <p className="font-medium">Format Excel yang didukung:</p>
                          <ul className="text-muted-foreground list-disc pl-4 space-y-1">
                            <li>
                              Kolom wajib:{' '}
                              <code className="bg-muted px-1 rounded text-xs">nis</code>,{' '}
                              <code className="bg-muted px-1 rounded text-xs">nama</code>
                            </li>
                            <li>
                              Kolom opsional:{' '}
                              <code className="bg-muted px-1 rounded text-xs">kelas</code>,{' '}
                              <code className="bg-muted px-1 rounded text-xs">tahun_ajaran</code>
                            </li>
                            <li>Kelas harus sesuai dengan nama kelas yang sudah dibuat</li>
                            <li>NIS yang sudah terdaftar akan dilewati</li>
                          </ul>
                          <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={downloadTemplate}>
                              <Download className="h-4 w-4 mr-2" />
                              Unduh Template
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tahun Ajaran Default</Label>
                      <Input
                        value={defaultYear}
                        onChange={(e) => setDefaultYear(e.target.value)}
                        placeholder="2025/2026"
                      />
                      <p className="text-xs text-muted-foreground">
                        Dipakai jika kolom <code>tahun_ajaran</code> kosong di CSV
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Pilih File Excel (.xlsx)</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Langkah 2: Preview */}
                {parsed && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {validCount} valid
                      </Badge>
                      {invalidCount > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          <XCircle className="h-3 w-3" />
                          {invalidCount} tidak valid
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Total {parsed.length} baris
                      </span>
                      <Button variant="ghost" size="sm" onClick={resetImport}>
                        Pilih file lain
                      </Button>
                    </div>

                    <div className="rounded-lg border max-h-72 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Baris</TableHead>
                            <TableHead>NIS</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Kelas</TableHead>
                            <TableHead>Tahun Ajaran</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsed.map((r) => (
                            <TableRow
                              key={r.line}
                              className={r.valid ? '' : 'bg-red-50'}
                            >
                              <TableCell className="text-muted-foreground text-xs">
                                {r.line}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{r.nis}</TableCell>
                              <TableCell>{r.full_name}</TableCell>
                              <TableCell>{r.class_name || '-'}</TableCell>
                              <TableCell className="text-xs">{r.academic_year}</TableCell>
                              <TableCell>
                                {r.valid ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                    OK
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-red-600">{r.error}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Button
                      onClick={handleImport}
                      disabled={importing || validCount === 0}
                      className="w-full h-11"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mengimpor...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import {validCount} Siswa
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Tombol Tambah */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button
                    onClick={() => {
                      setEditId(null);
                      setForm({ nis: '', full_name: '', class_id: '', academic_year: '' });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Siswa
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editId ? 'Edit Siswa' : 'Tambah Siswa'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nis">NIS</Label>
                    <Input
                      id="nis"
                      value={form.nis}
                      onChange={(e) => setForm({ ...form, nis: e.target.value })}
                      required
                      placeholder="Nomor Induk Siswa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nama Lengkap</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) =>
                        setForm({ ...form, full_name: e.target.value })
                      }
                      required
                      placeholder="Nama lengkap siswa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kelas</Label>
                    <Select
                      value={form.class_id || null}
                      onValueChange={(v) => setForm({ ...form, class_id: v ?? '' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Daftar Siswa
              <Badge variant="secondary" className="ml-2">
                {students.length} siswa
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">
                  Belum ada siswa. Tambahkan manual atau import dari Excel.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NIS</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Tahun Ajaran</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-sm">{s.nis}</TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell>
                            {s.classes?.name ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{s.academic_year ?? '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={s.is_active ? 'default' : 'secondary'}
                              className={
                                s.is_active
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : ''
                              }
                            >
                              {s.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(s)}
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
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border bg-card p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            NIS: {s.nis}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={s.is_active ? 'default' : 'secondary'}
                            className={
                              s.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : ''
                            }
                          >
                            {s.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => openEdit(s)}
                            aria-label="Edit siswa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Kelas:{' '}
                          <span className="text-foreground font-medium">
                            {s.classes?.name ?? '-'}
                          </span>
                        </span>
                        <span>
                          TA:{' '}
                          <span className="text-foreground font-medium">
                            {s.academic_year ?? '-'}
                          </span>
                        </span>
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
