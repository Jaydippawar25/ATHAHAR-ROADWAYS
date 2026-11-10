import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';

export const exportToExcel = async (data, filename = 'export', columns = []) => {
  if (!data || data.length === 0) return;
  const XLSX = await import('xlsx');

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

const formatPdfCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const exportToPDF = async (title, columns, data, filename = 'report') => {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  const validColumns = columns.filter((col) => col.key !== 'actions' && col.label !== 'Actions');

  // Header Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('ATHAHAR ROADWAYS', marginX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416  |  MOB: 9370229449 / 9850329449',
    marginX,
    19.5
  );

  // Right-aligned Report Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(2, 132, 199);
  doc.text(title.toUpperCase(), pageWidth - marginX, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}  |  Total Records: ${data?.length || 0}`,
    pageWidth - marginX,
    19.5,
    { align: 'right' }
  );

  // Divider Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(marginX, 23, pageWidth - marginX, 23);

  const tableHeaders = validColumns.map((col) => String(col.label).toUpperCase());

  const tableRows = (data || []).map((row) =>
    validColumns.map((col) => {
      const val = row[col.key];
      if (col.type === 'currency') return formatPdfCurrency(val);
      if (col.type === 'date') return formatDate(val);
      if (val === undefined || val === null || val === '') return '-';
      return String(val);
    })
  );

  // Build Grand Total Footer Row
  const hasTotals = validColumns.some(
    (col) => col.type === 'currency' || col.key === 'pkg' || col.key === 'totalQty'
  );
  const footRow = hasTotals
    ? [
        validColumns.map((col, idx) => {
          if (idx === 0) return 'TOTAL';
          if (col.key === 'pkg' || col.key === 'totalQty') {
            const sumPkg = (data || []).reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
            return String(sumPkg);
          }
          if (col.type === 'currency') {
            const sumAmt = (data || []).reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
            return formatPdfCurrency(sumAmt);
          }
          return '';
        }),
      ]
    : undefined;

  // Dynamic Column Alignment & Width Rules
  const columnStyles = {};
  const noWrapKeys = new Set([
    'lrNo',
    'inwardNo',
    'outwardNo',
    'vehicleNo',
    'memoNo',
    'invoiceNo',
    'status',
    'daysPending',
  ]);

  validColumns.forEach((col, index) => {
    if (col.type === 'currency') {
      columnStyles[index] = { halign: 'right', fontStyle: 'bold', cellWidth: 'wrap' };
    } else if (col.type === 'date') {
      columnStyles[index] = { halign: 'center', cellWidth: 'wrap' };
    } else if (col.key === 'pkg' || col.key === 'totalQty') {
      columnStyles[index] = { halign: 'center', fontStyle: 'bold', cellWidth: 'wrap' };
    } else if (col.key === 'status') {
      columnStyles[index] = { halign: 'center', fontStyle: 'bold', cellWidth: 'wrap' };
    } else if (noWrapKeys.has(col.key)) {
      columnStyles[index] = { cellWidth: 'wrap' };
    } else {
      columnStyles[index] = { cellWidth: 'auto' };
    }
  });

  doc.autoTable({
    head: [tableHeaders],
    body: tableRows,
    foot: footRow,
    startY: 27,
    margin: { left: marginX, right: marginX, bottom: 14 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'middle',
      cellPadding: { top: 2.8, right: 2.5, bottom: 2.8, left: 2.5 },
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      valign: 'middle',
      cellPadding: { top: 3.2, right: 2.5, bottom: 3.2, left: 2.5 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: [148, 163, 184],
      lineWidth: 0.3,
    },
    columnStyles,
    willDrawCell: (hookData) => {
      if (hookData.section === 'head' || hookData.section === 'foot') {
        const col = validColumns[hookData.column.index];
        if (col?.type === 'currency') {
          hookData.cell.styles.halign = 'right';
        } else if (
          col?.type === 'date' ||
          col?.key === 'pkg' ||
          col?.key === 'totalQty' ||
          col?.key === 'status'
        ) {
          hookData.cell.styles.halign = 'center';
        }
      }
    },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'ATHAHAR ROADWAYS — Transport Management System',
        marginX,
        pageHeight - 6
      );
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const printRecordDetails = ({ title, fields = [], items = [], showDeliveryPerson = false }) => {
  let iframe = document.getElementById('athahar-print-frame');
  if (iframe) {
    document.body.removeChild(iframe);
  }
  iframe = document.createElement('iframe');
  iframe.id = 'athahar-print-frame';
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

  const hasDelPerson =
    showDeliveryPerson ||
    (items && items.some((i) => i.deliveryPersonName && i.deliveryPersonName !== '-'));

  const totalPkg = (items || []).reduce((sum, i) => sum + (Number(i.pkg) || 0), 0);
  const totalToPay = (items || []).reduce((sum, i) => sum + (Number(i.toPayAmount) || 0), 0);
  const totalTbb = (items || []).reduce((sum, i) => sum + (Number(i.tbbAmount) || 0), 0);
  const totalPaid = (items || []).reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);

  const itemsHtml =
    items && items.length > 0
      ? `
      <h4 class="section-title">LR Items (${items.length})</h4>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">SR</th>
            <th>LR No.</th>
            <th>Date</th>
            <th>Inv No.</th>
            <th>Consigner</th>
            <th>Consignee</th>
            <th>CT To</th>
            ${hasDelPerson ? '<th>Del. Person</th>' : ''}
            <th style="text-align: center;">PKG</th>
            <th style="text-align: right;">To Pay</th>
            <th style="text-align: right;">T.B.B</th>
            <th style="text-align: right;">Paid</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (lr, idx) => `
            <tr>
              <td style="text-align: center;" class="bold">${lr.srNo ?? idx + 1}</td>
              <td class="bold">${lr.lrNo || '-'}</td>
              <td>${formatDate(lr.inwardDate || lr.date)}</td>
              <td>${lr.invoiceNo || '-'}</td>
              <td>${lr.consignorName || '-'}</td>
              <td>${lr.consigneeName || '-'}</td>
              <td class="bold">${lr.ctTo || '-'}</td>
              ${hasDelPerson ? `<td>${lr.deliveryPersonName || '-'}</td>` : ''}
              <td style="text-align: center;" class="bold">${lr.pkg ?? 0}</td>
              <td style="text-align: right;">${formatCurrency(lr.toPayAmount)}</td>
              <td style="text-align: right;">${formatCurrency(lr.tbbAmount)}</td>
              <td style="text-align: right;">${formatCurrency(lr.paidAmount)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr class="totals-row">
            <td colspan="${hasDelPerson ? 8 : 7}" style="text-align: right;">TOTAL:</td>
            <td style="text-align: center;">${totalPkg}</td>
            <td style="text-align: right;">${formatCurrency(totalToPay)}</td>
            <td style="text-align: right;">${formatCurrency(totalTbb)}</td>
            <td style="text-align: right;">${formatCurrency(totalPaid)}</td>
          </tr>
        </tfoot>
      </table>`
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; font-size: 12px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .company { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; margin: 0; }
          .address { font-size: 10px; font-weight: 600; color: #475569; margin: 3px 0 0 0; }
          .doc-title { font-size: 14px; font-weight: 800; color: #0284c7; margin: 6px 0 0 0; }
          .timestamp { font-size: 11px; color: #64748b; font-weight: 600; text-align: right; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px; }
          .field-box { display: flex; flex-direction: column; }
          .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
          .field-value { font-size: 12px; font-weight: 800; color: #0f172a; }
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin: 16px 0 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; color: #334155; }
          .bold { font-weight: 800; }
          .totals-row td { background: #f8fafc; font-weight: 900; border-top: 2px solid #0f172a; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="/logo.png" alt="ATHAHAR ROADWAYS" style="width: 52px; height: 52px; object-fit: contain; border-radius: 6px;" />
            <div>
              <h1 class="company">ATHAHAR ROADWAYS</h1>
              <p class="address">NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 | MOB: 9370229449 / 9850329449</p>
              <p class="doc-title">${title}</p>
            </div>
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
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }, 200);
};

