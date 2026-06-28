import PDFDocument from "pdfkit";

export interface PdfSection {
  heading: string;
  /** Simple key/value lines. */
  lines?: { label: string; value: string | number }[];
  /** Tabular block: column headers + row arrays. */
  table?: { columns: string[]; rows: (string | number)[][] };
}

/** Render a titled PDF report with sections to a Buffer. */
export function buildPdf(title: string, subtitle: string, sections: PdfSection[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#1e3a8a").text(title, { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#64748b").text(subtitle);
    doc.moveDown(1);

    for (const s of sections) {
      doc.fontSize(13).fillColor("#0f172a").text(s.heading);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#334155");

      if (s.lines) {
        for (const l of s.lines) doc.text(`${l.label}: ${l.value}`);
        doc.moveDown(0.5);
      }
      if (s.table) {
        doc.font("Helvetica-Bold").text(s.table.columns.join("   |   "));
        doc.font("Helvetica");
        for (const row of s.table.rows) doc.text(row.join("   |   "));
        doc.moveDown(0.5);
      }
      doc.moveDown(0.5);
    }

    doc.fontSize(8).fillColor("#94a3b8").text(
      `Generated ${new Date().toISOString()} · Institutional Insights Dashboard`,
      { align: "center" },
    );
    doc.end();
  });
}
