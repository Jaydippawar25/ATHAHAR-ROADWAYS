import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';

export const exportToExcel = (data, filename = 'export', columns = []) => {
  if (!data || data.length === 0) return;

  const exportRows = data.map((row) => {
    const formatted = {};
    columns.forEach((col) => {
      formatted[col.label] = row[col.key] ?? '-';
    });
    return formatted;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (title, columns, data, filename = 'report') => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text('ATHAHAR ROADWAYS', 14, 15);
  doc.setFontSize(12);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  const tableHeaders = columns.map((col) => col.label);
  const tableRows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (col.type === 'currency') return formatCurrency(val);
      if (col.type === 'date') return formatDate(val);
      return val ?? '-';
    })
  );

  doc.autoTable({
    head: [tableHeaders],
    body: tableRows,
    startY: 32,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [2, 132, 199] },
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
