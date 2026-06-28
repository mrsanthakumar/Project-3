import * as XLSX from "xlsx";
import { ApiError } from "@/lib/http";

export interface ParsedSheet {
  rows: Record<string, unknown>[];
  fileName: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
];

/**
 * Read the uploaded file (.xlsx / .csv) from multipart form-data and return
 * the first sheet as an array of header-keyed row objects. SheetJS handles
 * both formats. Header keys are normalised (trimmed, lowercased, spaces→_).
 */
export async function parseUpload(req: Request, field = "file"): Promise<ParsedSheet> {
  const form = await req.formData();
  const file = form.get(field);
  if (!(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", `Missing file field "${field}"`);
  }
  if (file.size === 0) throw new ApiError("VALIDATION_ERROR", "Uploaded file is empty");
  if (file.size > MAX_BYTES) throw new ApiError("VALIDATION_ERROR", "File exceeds 10 MB limit");
  if (file.type && !ALLOWED.includes(file.type)) {
    throw new ApiError("VALIDATION_ERROR", `Unsupported file type: ${file.type}`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new ApiError("VALIDATION_ERROR", "No sheet found in file");

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const rows = raw.map((r) => normaliseKeys(r));
  return { rows, fileName: file.name };
}

function normaliseKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim().toLowerCase().replace(/[\s.]+/g, "_");
    out[key] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export interface RowError {
  row: number; // 1-based data row (excludes header)
  field?: string;
  message: string;
}
