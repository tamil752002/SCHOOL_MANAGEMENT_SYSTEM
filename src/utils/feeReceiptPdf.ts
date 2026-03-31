import { jsPDF } from 'jspdf';
import type { FeeRecord, Student, SystemSettings } from '../types';

type Rgb = [number, number, number];
const COLORS: Record<string, Rgb> = {
  headerBg: [30, 58, 95],
  headerText: [255, 255, 255],
  accent: [34, 102, 170],
  border: [200, 200, 200],
  tableHeaderBg: [245, 245, 245],
  text: [51, 51, 51],
  textMuted: [100, 100, 100],
  success: [21, 128, 61],
  warning: [180, 83, 9],
  line: [230, 230, 230],
};

function setColor(doc: jsPDF, method: 'setFillColor' | 'setTextColor' | 'setDrawColor', key: string): void {
  const c = COLORS[key];
  if (c) (doc as any)[method](c[0], c[1], c[2]);
}

const ROW_HEIGHT = 6;
const CELL_PAD = 3;

/** Format amount as "Rs. 1,234.56" so it never merges with symbol or misreads */
function formatAmount(n: number): string {
  return 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getFeeTypeLabel(record: FeeRecord): string {
  const type = record.feeType.charAt(0).toUpperCase() + record.feeType.slice(1);
  if (record.feeType === 'other' && record.description?.trim()) {
    return `${type}: ${record.description.trim()}`;
  }
  return `${type} Fee`;
}

function getStudentDisplayName(student: Student & { studentName?: string }): string {
  if (student.studentName && student.studentName.trim()) return student.studentName;
  const parts = [student.firstName, student.middleName, student.lastName].filter(Boolean);
  return parts.join(' ').trim() || '—';
}

/** Draw a 2-column table: label column width, then value fills the rest. Returns new y. */
function drawTwoColumnTable(
  doc: jsPDF,
  x: number,
  y: number,
  pageWidth: number,
  margin: number,
  rows: [string, string][],
  options?: { labelWidth?: number; fontSize?: number }
): number {
  const labelWidth = options?.labelWidth ?? 48;
  const valueWidth = pageWidth - margin - x - labelWidth;
  const fontSize = options?.fontSize ?? 10;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  setColor(doc, 'setTextColor', 'text');

  setColor(doc, 'setDrawColor', 'border');
  doc.setLineWidth(0.2);
  const tableTop = y;
  doc.rect(x, tableTop, labelWidth + valueWidth, ROW_HEIGHT * rows.length);

  rows.forEach(([label, value], i) => {
    const rowY = y + (i + 1) * ROW_HEIGHT - CELL_PAD;
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 2, rowY);
    doc.setFont('helvetica', 'normal');
    const val = (value && value.trim()) ? value : '—';
    doc.text(doc.splitTextToSize(val, valueWidth - 4)[0] ?? val, x + labelWidth + 2, rowY);
    if (i < rows.length - 1) {
      doc.line(x, y + (i + 1) * ROW_HEIGHT, x + labelWidth + valueWidth, y + (i + 1) * ROW_HEIGHT);
    }
  });
  doc.line(x + labelWidth, tableTop, x + labelWidth, tableTop + ROW_HEIGHT * rows.length);

  return y + ROW_HEIGHT * rows.length;
}

/** Draw a multi-column table with header row. colWidths in mm. Returns new y. */
function drawDataTable(
  doc: jsPDF,
  x: number,
  y: number,
  headers: string[],
  colWidths: number[],
  rows: string[][]
): number {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerH = ROW_HEIGHT + 2;
  setColor(doc, 'setDrawColor', 'border');
  doc.setLineWidth(0.2);

  setColor(doc, 'setFillColor', 'tableHeaderBg');
  doc.rect(x, y, totalWidth, headerH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'setTextColor', 'text');
  let xOff = x;
  headers.forEach((h, i) => {
    doc.text(h, xOff + 2, y + headerH - CELL_PAD);
    xOff += colWidths[i];
  });
  doc.setFont('helvetica', 'normal');
  y += headerH;

  rows.forEach((row, ri) => {
    const rowY = y + ri * ROW_HEIGHT + ROW_HEIGHT - CELL_PAD;
    xOff = x;
    row.forEach((cell, ci) => {
      doc.text(cell, xOff + 2, rowY);
      xOff += colWidths[ci];
    });
    doc.line(x, y + (ri + 1) * ROW_HEIGHT, x + totalWidth, y + (ri + 1) * ROW_HEIGHT);
  });
  doc.rect(x, y - headerH, totalWidth, headerH + ROW_HEIGHT * rows.length);
  for (let c = 1; c < colWidths.length; c++) {
    let xCol = x + colWidths.slice(0, c).reduce((a, b) => a + b, 0);
    doc.line(xCol, y - headerH, xCol, y + ROW_HEIGHT * rows.length);
  }

  return y + ROW_HEIGHT * rows.length;
}

export function generateFeeReceiptPdf(
  record: FeeRecord,
  student: Student & { studentName?: string },
  settings: SystemSettings,
  allFeeRecordsForYear: FeeRecord[]
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  // ----- Header block -----
  setColor(doc, 'setFillColor', 'headerBg');
  doc.rect(0, 0, pageWidth, 32, 'F');
  setColor(doc, 'setTextColor', 'headerText');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.schoolName, pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.schoolAddress || '', pageWidth / 2, 22, { align: 'center' });
  if (settings.schoolPhone || settings.schoolEmail) {
    doc.setFontSize(9);
    doc.text(
      [settings.schoolPhone, settings.schoolEmail].filter(Boolean).join(' • '),
      pageWidth / 2,
      28,
      { align: 'center' }
    );
  }

  y = 38;
  setColor(doc, 'setTextColor', 'text');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(doc, 'setTextColor', 'accent');
  doc.text('FEE PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(doc, 'setTextColor', 'textMuted');
  doc.text('Receipt No: ' + (record.receiptNumber || '—'), margin, y);
  doc.text('Date: ' + (record.paidDate ? new Date(record.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'), pageWidth - margin, y, { align: 'right' });
  y += 10;

  setColor(doc, 'setDrawColor', 'line');
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // ----- Student & Guardian details TABLE -----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, 'setTextColor', 'text');
  doc.text('Student & Guardian Details', margin, y);
  y += 8;

  const studentName = getStudentDisplayName(student);
  const address = [student.address, student.location].filter(Boolean).join(', ') || '—';
  const contact = [student.parentMobile, student.mobileNumber].filter(Boolean).join(', ') || '—';
  const email = student.emailAddress || '—';

  y = drawTwoColumnTable(
    doc,
    margin,
    y,
    pageWidth,
    margin,
    [
      ['Student Name', studentName],
      ['Class & Section', `${student.studentClass}${student.section ? ' - ' + student.section : ''}`],
      ['Admission No.', student.admissionNumber || '—'],
      ["Father's Name", student.fatherName || '—'],
      ["Mother's Name", student.motherName || '—'],
      ['Address', address],
      ['Contact', contact],
      ['Email', email],
    ],
    { labelWidth: 42 }
  );
  y += 10;

  setColor(doc, 'setDrawColor', 'line');
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // ----- Payment details TABLE -----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Details (This Receipt)', margin, y);
  y += 8;

  const paid = record.paidAmount ?? 0;
  const paymentMode = record.description && record.description.trim() && record.feeType !== 'other'
    ? record.description.trim()
    : 'As per school records';

  y = drawTwoColumnTable(
    doc,
    margin,
    y,
    pageWidth,
    margin,
    [
      ['Fee Type', getFeeTypeLabel(record)],
      ['Total Fee', formatAmount(record.amount)],
      ['Amount Paid', formatAmount(paid)],
      ['Payment Date', record.paidDate ? new Date(record.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
      ['Payment Mode / Remarks', paymentMode],
    ],
    { labelWidth: 48 }
  );
  y += 10;

  setColor(doc, 'setDrawColor', 'line');
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // ----- Pending fees TABLE -----
  const pendingRecords = allFeeRecordsForYear.filter(
    r => r.id !== record.id && (r.status === 'pending' || r.status === 'overdue' || r.status === 'partial')
  );
  const pendingAmount = pendingRecords.reduce((sum, r) => {
    const rem = (r.amount ?? 0) - (r.paidAmount ?? 0);
    return sum + (rem > 0 ? rem : 0);
  }, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(doc, 'setTextColor', 'warning');
  doc.text('Outstanding / Pending Fees', margin, y);
  y += 8;

  setColor(doc, 'setTextColor', 'text');

  const colWidths = [12, 75, 35, 40];
  const pendingHeaders = ['Sr. No.', 'Fee Type', 'Amount (Rs.)', 'Due Date'];

  if (pendingRecords.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, 'setTextColor', 'success');
    doc.text('No pending fees for this academic year.', margin, y);
    setColor(doc, 'setTextColor', 'text');
    y += 10;
  } else {
    const tableRows: string[][] = [];
    let sr = 1;
    pendingRecords.forEach(r => {
      const remaining = (r.amount ?? 0) - (r.paidAmount ?? 0);
      if (remaining <= 0) return;
      const dueStr = r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      tableRows.push([
        String(sr++),
        getFeeTypeLabel(r),
        remaining.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        dueStr,
      ]);
    });
    y = drawDataTable(doc, margin, y, pendingHeaders, colWidths, tableRows);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total Pending: ' + formatAmount(pendingAmount), margin, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  }

  setColor(doc, 'setDrawColor', 'line');
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  setColor(doc, 'setTextColor', 'textMuted');
  doc.text(
    'This is a computer-generated receipt. Please retain for your records.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  return doc;
}

export function downloadFeeReceipt(
  record: FeeRecord,
  student: Student & { studentName?: string },
  settings: SystemSettings,
  allFeeRecordsForYear: FeeRecord[]
): void {
  const doc = generateFeeReceiptPdf(record, student, settings, allFeeRecordsForYear);
  const safeReceipt = (record.receiptNumber || record.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`fee_receipt_${safeReceipt}.pdf`);
}

/** Generate overall fee status report PDF for a student (all fee records). */
export function generateFeeStatusReportPdf(
  student: Student & { studentName?: string },
  settings: SystemSettings,
  allFeeRecords: FeeRecord[]
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  setColor(doc, 'setFillColor', 'headerBg');
  doc.rect(0, 0, pageWidth, 28, 'F');
  setColor(doc, 'setTextColor', 'headerText');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.schoolName, pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.schoolAddress || '', pageWidth / 2, 20, { align: 'center' });

  y = 34;
  setColor(doc, 'setTextColor', 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(doc, 'setTextColor', 'accent');
  doc.text('OVERALL FEE STATUS REPORT', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc, 'setTextColor', 'textMuted');
  doc.text('Generated on: ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - margin, y, { align: 'right' });
  y += 8;

  setColor(doc, 'setDrawColor', 'line');
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const studentName = getStudentDisplayName(student);
  const address = [student.address, student.location].filter(Boolean).join(', ') || '—';
  const contact = [student.parentMobile, student.mobileNumber].filter(Boolean).join(', ') || '—';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, 'setTextColor', 'text');
  doc.text('Student Details', margin, y);
  y += 6;

  y = drawTwoColumnTable(
    doc,
    margin,
    y,
    pageWidth,
    margin,
    [
      ['Student Name', studentName],
      ['Class & Section', `${student.studentClass}${student.section ? ' - ' + student.section : ''}`],
      ['Admission No.', student.admissionNumber || '—'],
      ["Father's Name", student.fatherName || '—'],
      ["Mother's Name", student.motherName || '—'],
      ['Address', address],
      ['Contact', contact],
    ],
    { labelWidth: 38, fontSize: 9 }
  );
  y += 8;

  const totalAmount = allFeeRecords.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalPaid = allFeeRecords.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
  const totalPending = totalAmount - totalPaid;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Summary', margin, y);
  y += 6;
  y = drawTwoColumnTable(
    doc,
    margin,
    y,
    pageWidth,
    margin,
    [
      ['Total Fee (All Years)', formatAmount(totalAmount)],
      ['Total Paid', formatAmount(totalPaid)],
      ['Total Pending', formatAmount(Math.max(0, totalPending))],
    ],
    { labelWidth: 42, fontSize: 10 }
  );
  y += 10;

  setColor(doc, 'setDrawColor', 'line');
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Fee Details (All Records)', margin, y);
  y += 8;

  const tableColWidths = [8, 18, 36, 20, 20, 22, 22, 12, 18];
  const tableHeaders = ['Sr.', 'Year', 'Fee Type', 'Total (Rs.)', 'Paid (Rs.)', 'Pending (Rs.)', 'Due Date', 'Status', 'Receipt'];

  const sortedRecords = [...allFeeRecords].sort((a, b) => {
    const yearCmp = (b.academicYear || '').localeCompare(a.academicYear || '');
    if (yearCmp !== 0) return yearCmp;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  doc.setFontSize(8);
  const rowH = 5.5;
  const headerH = rowH + 2;

  function drawReportTableHeader(docY: number): number {
    setColor(doc, 'setFillColor', 'tableHeaderBg');
    const tw = tableColWidths.reduce((a, b) => a + b, 0);
    doc.rect(margin, docY, tw, headerH, 'FD');
    setColor(doc, 'setDrawColor', 'border');
    doc.rect(margin, docY, tw, headerH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setColor(doc, 'setTextColor', 'text');
    let xOff = margin;
    tableHeaders.forEach((h, i) => {
      doc.text(h, xOff + 1.5, docY + headerH - 2);
      xOff += tableColWidths[i];
    });
    doc.setFont('helvetica', 'normal');
    return docY + headerH;
  }

  let tableY = drawReportTableHeader(y);
  const totalTableWidth = tableColWidths.reduce((a, b) => a + b, 0);

  sortedRecords.forEach((r, idx) => {
    if (tableY + rowH > pageHeight - 20) {
      doc.addPage();
      tableY = margin;
      tableY = drawReportTableHeader(tableY);
    }
    const pending = Math.max(0, (r.amount ?? 0) - (r.paidAmount ?? 0));
    const dueStr = r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const row: string[] = [
      String(idx + 1),
      r.academicYear || '—',
      getFeeTypeLabel(r),
      (r.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (r.paidAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      pending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      dueStr,
      r.status,
      r.receiptNumber || '—',
    ];
    let xOff = margin;
    row.forEach((cell, ci) => {
      doc.text(cell, xOff + 1.5, tableY + rowH - 1.5);
      xOff += tableColWidths[ci];
    });
    setColor(doc, 'setDrawColor', 'border');
    doc.line(margin, tableY + rowH, margin + totalTableWidth, tableY + rowH);
    for (let c = 1; c < tableColWidths.length; c++) {
      const xCol = margin + tableColWidths.slice(0, c).reduce((a, b) => a + b, 0);
      doc.line(xCol, tableY, xCol, tableY + rowH);
    }
    doc.line(margin + totalTableWidth, tableY, margin + totalTableWidth, tableY + rowH);
    doc.line(margin, tableY, margin, tableY + rowH);
    tableY += rowH;
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  setColor(doc, 'setTextColor', 'textMuted');
  doc.text(
    'This is a computer-generated fee status report. Please retain for your records.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
}

export function downloadFeeStatusReport(
  student: Student & { studentName?: string },
  settings: SystemSettings,
  allFeeRecords: FeeRecord[]
): void {
  const doc = generateFeeStatusReportPdf(student, settings, allFeeRecords);
  const name = getStudentDisplayName(student).replace(/[^a-zA-Z0-9_-]/g, '_') || 'student';
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`fee_status_report_${name}_${date}.pdf`);
}
