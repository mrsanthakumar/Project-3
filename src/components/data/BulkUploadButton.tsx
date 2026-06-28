"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { apiUpload, ApiClientError } from "@/lib/client/api";

interface UploadResult {
  jobId: string;
  summary: { totalRows: number; successRows: number; errorRows: number };
  errors: { row: number; field?: string; message: string }[];
}

/** Reusable Excel/CSV upload button → {basePath}/bulk-upload, shows row report. */
export function BulkUploadButton({ basePath, onDone }: { basePath: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiUpload<UploadResult>(`${basePath}/bulk-upload`, file);
      setResult(res);
      onDone?.();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => { setOpen(true); setResult(null); setError(null); }}>
        Bulk Upload
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bulk Upload (.xlsx / .csv)">
        <input
          ref={inputRef} type="file" accept=".xlsx,.csv" disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
        />
        {busy && <p className="mt-3 text-sm text-slate-500">Processing…</p>}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-4 text-sm">
              <span>Total: <b>{result.summary.totalRows}</b></span>
              <span className="text-green-600">Imported: <b>{result.summary.successRows}</b></span>
              <span className="text-red-600">Errors: <b>{result.summary.errorRows}</b></span>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                <table className="w-full">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr><th className="px-2 py-1">Row</th><th className="px-2 py-1">Field</th><th className="px-2 py-1">Message</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map((er, i) => (
                      <tr key={i}><td className="px-2 py-1">{er.row}</td><td className="px-2 py-1">{er.field ?? "—"}</td><td className="px-2 py-1 text-red-600">{er.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
