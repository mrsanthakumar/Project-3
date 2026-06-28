import * as XLSX from "xlsx";

/** Build an .xlsx buffer from an array of flat row objects (keys = headers). */
export function buildExcel(sheetName: string, rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
