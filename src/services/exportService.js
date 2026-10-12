import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';

export const exportToExcel = (data, filename = 'export', columns = []) => {
  if (!data || data.length === 0) return;

  const validColumns = columns.filter((col) => col.key !== 'actions' && col.label !== 'Actions');

  const exportRows = data.map((row) => {
    const formatted = {};
    validColumns.forEach((col) => {
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
  const validColumns = columns.filter((col) => col.key !== 'actions' && col.label !== 'Actions');
  
  doc.setFontSize(16);
  doc.text('ATHAHAR ROADWAYS', 14, 15);
  doc.setFontSize(12);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  const tableHeaders = validColumns.map((col) => col.label);
  const tableRows = data.map((row) =>
    validColumns.map((col) => {
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

export const printRecordDetails = ({ title, fields = [], items = [] }) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const fieldsHtml = fields
    .map(
      (f) => `
      <div class="field-box">
        <span class="field-label">${f.label}</span>
        <span class="field-value">${f.value ?? '-'}</span>
      </div>`
    )
    .join('');

  const itemsHtml =
    items && items.length > 0
      ? `
      <h4 class="section-title">Associated LR Items</h4>
      <table>
        <thead>
          <tr>
            <th>LR No.</th>
            <th>Consigner</th>
            <th>Consignee</th>
            <th>CT To</th>
            <th>PKG</th>
            <th>To Pay</th>
            <th>TBB</th>
            <th>Paid</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (lr) => `
            <tr>
              <td class="bold">${lr.lrNo || '-'}</td>
              <td>${lr.consignorName || '-'}</td>
              <td>${lr.consigneeName || '-'}</td>
              <td>${lr.ctTo || '-'}</td>
              <td class="bold">${lr.pkg ?? 0}</td>
              <td>${formatCurrency(lr.toPayAmount)}</td>
              <td>${formatCurrency(lr.tbbAmount)}</td>
              <td>${formatCurrency(lr.paidAmount)}</td>
              <td>${lr.status || '-'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .company { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; margin: 0; }
          .doc-title { font-size: 14px; font-weight: 700; color: #0284c7; margin: 4px 0 0 0; }
          .timestamp { font-size: 11px; color: #64748b; font-weight: 600; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px; }
          .field-box { display: flex; flex-direction: column; }
          .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
          .field-value { font-size: 13px; font-weight: 800; color: #0f172a; }
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin: 16px 0 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; color: #334155; }
          .bold { font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="company">ATHAHAR ROADWAYS</h1>
            <p class="doc-title">${title}</p>
          </div>
          <div class="timestamp">Printed on: ${new Date().toLocaleString()}</div>
        </div>
        <div class="grid">
          ${fieldsHtml}
        </div>
        ${itemsHtml}
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 150);
};

