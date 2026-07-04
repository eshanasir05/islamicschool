'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ExportButton } from '@/components/ui/export-button';

type ParsedRosterRow = {
  rowIndex: number;
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: string;
  className: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  errors: string[];
  willCreateClass: boolean;
  existingGuardian: boolean;
};

type ImportSummary = {
  studentsCreated: number;
  classesCreated: number;
  guardiansLinked: number;
  guardiansCreated: number;
  rowErrors: { rowIndex: number; message: string }[];
};

export default function RosterImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedRosterRow[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const validRows = rows?.filter(r => r.errors.length === 0) ?? [];
  const invalidRows = rows?.filter(r => r.errors.length > 0) ?? [];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setSummary(null);
    try {
      const csv = await file.text();
      const res = await fetch('/api/admin/import/roster/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not parse CSV');
        setRows(null);
        return;
      }
      setRows(data.rows);
    } catch {
      toast.error('Could not read that file. Please upload a .csv file.');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/admin/import/roster/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Import failed');
        return;
      }
      setSummary(data);
      setRows(null);
      toast.success(`Imported ${data.studentsCreated} student${data.studentsCreated === 1 ? '' : 's'}.`);
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="app-main">
      <Breadcrumb items={[{ label: 'Students', href: '/admin/students' }, { label: 'Import roster' }]} />
      <h1 className="text-h1" style={{ marginBottom: 6 }}>Import roster</h1>
      <p className="text-body" style={{ marginBottom: 20 }}>
        Upload a CSV of students, classes, and guardians. Nothing is saved until you review the
        preview and confirm the import. Guardians are linked automatically if their email already
        exists — no invite emails are sent as part of this import.
      </p>

      <div className="app-card" style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', marginBottom: 4 }}>Required columns</div>
          <ul style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
            <li><code>student_first_name</code>, <code>student_last_name</code></li>
            <li><code>date_of_birth</code> (YYYY-MM-DD)</li>
            <li><code>class_name</code></li>
            <li><code>guardian_name</code>, <code>guardian_email</code></li>
            <li><code>guardian_phone</code> (optional)</li>
          </ul>
        </div>
        <ExportButton href="/api/admin/import/roster/sample" label="↓ Sample CSV" />
      </div>

      <div className="app-card" style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
          Upload CSV
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={parsing}
          className="sign-in-input"
          style={{ marginBottom: 0 }}
        />
        {parsing && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Parsing and validating…</p>}
      </div>

      {summary && (
        <div className="banner banner-success" style={{ marginBottom: 20 }}>
          Imported {summary.studentsCreated} student{summary.studentsCreated === 1 ? '' : 's'},{' '}
          {summary.classesCreated} new class{summary.classesCreated === 1 ? '' : 'es'},{' '}
          {summary.guardiansLinked} guardian{summary.guardiansLinked === 1 ? '' : 's'} linked,{' '}
          {summary.guardiansCreated} guardian account{summary.guardiansCreated === 1 ? '' : 's'} created.
          {summary.rowErrors.length > 0 && (
            <span> {summary.rowErrors.length} row{summary.rowErrors.length === 1 ? '' : 's'} failed.</span>
          )}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
              Preview ({validRows.length} ready, {invalidRows.length} need fixes)
            </h2>
            <button
              type="button"
              className="btn btn-accent"
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              aria-busy={importing}
              style={{ fontSize: 13, padding: '7px 16px' }}
            >
              {importing && <span className="btn-spinner" aria-hidden="true" />}
              {importing ? 'Importing…' : `Import ${validRows.length} row${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>

          <table className="rtable">
            <thead>
              <tr>
                {['Row', 'Student', 'DOB', 'Class', 'Guardian', 'Email', 'Notes'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.rowIndex} style={{ background: r.errors.length > 0 ? 'var(--danger-soft)' : undefined }}>
                  <td data-label="Row" style={{ color: 'var(--muted)' }}>{r.rowIndex}</td>
                  <td data-label="Student">{r.studentFirstName} {r.studentLastName}</td>
                  <td data-label="DOB" style={{ color: 'var(--muted)' }}>{r.dateOfBirth || '—'}</td>
                  <td data-label="Class">
                    {r.className || '—'}
                    {r.willCreateClass && r.className && (
                      <span className="badge badge-late" style={{ marginLeft: 6, fontSize: 10 }}>new class</span>
                    )}
                  </td>
                  <td data-label="Guardian">{r.guardianName || '—'}</td>
                  <td data-label="Email" style={{ color: 'var(--muted)' }}>
                    {r.guardianEmail || '—'}
                    {r.existingGuardian && r.guardianEmail && (
                      <span className="badge badge-present" style={{ marginLeft: 6, fontSize: 10 }}>existing</span>
                    )}
                  </td>
                  <td data-label="Notes" style={{ color: 'var(--danger-fg)' }}>
                    {r.errors.join('; ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
