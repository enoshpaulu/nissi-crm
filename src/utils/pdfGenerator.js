import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateQuotationPDF = (quotation, lead, items) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header - Company Name
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235);
  doc.text('NISSI OFFICE SYSTEMS', pageWidth / 2, 20, { align: 'center' });
  
  // Quotation Title
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  let title = `QUOTATION: ${quotation.quotation_number}`;
  if (quotation.version > 1) title += ` (v${quotation.version})`;
  doc.text(title, pageWidth / 2, 32, { align: 'center' });
  
  // Customer and Quotation Info
  doc.setFontSize(10);
  let yPos = 45;
  
  // Left - Customer
  doc.setFont(undefined, 'bold');
  doc.text('BILL TO:', 20, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 6;
  doc.text(lead.company_name || 'N/A', 20, yPos);
  yPos += 5;
  if (lead.contact_person) {
    doc.text(lead.contact_person, 20, yPos);
    yPos += 5;
  }
  if (lead.phone) {
    doc.text(lead.phone, 20, yPos);
    yPos += 5;
  }
  
  // Right - Quotation Details  
  yPos = 45;
  doc.setFont(undefined, 'bold');
  doc.text('DETAILS:', 120, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 6;
  doc.text(`Date: ${new Date(quotation.quotation_date).toLocaleDateString('en-IN')}`, 120, yPos);
  yPos += 5;
  if (quotation.valid_until) {
    doc.text(`Valid: ${new Date(quotation.valid_until).toLocaleDateString('en-IN')}`, 120, yPos);
  }
  
  // Product Table - YOUR EXACT COLUMNS
  const tableData = items.map(item => [
    item.item_name || '',           // Model
    item.description || '',          // Description (FULL TEXT)
    item.units || 'pcs',            // Units
    String(item.quantity || 0),     // Req. Units (Quantity)
    `₹${parseFloat(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,  // Unit Price
    `₹${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`       // Total Price
  ]);
  
  autoTable(doc,{
    startY: 75,
    head: [['Model', 'Description', 'Units', 'Req. Units', 'Unit Price', 'Total Price']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [243, 244, 246], 
      textColor: [31, 41, 55], 
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      overflow: 'linebreak',
      valign: 'top',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },  // Model
      1: { cellWidth: 70 },                      // Description - WIDE for full text
      2: { cellWidth: 18, halign: 'center' },   // Units
      3: { cellWidth: 20, halign: 'right' },    // Req. Units
      4: { cellWidth: 25, halign: 'right' },    // Unit Price
      5: { cellWidth: 27, halign: 'right' }     // Total Price
    }
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  const total = parseFloat(quotation.total_amount || 0);
  const taxable = total / 1.18;
  const gst = total - taxable;
  
  const rightX = 190;
  const labelX = rightX - 65;
  
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text('Subtotal (Incl. GST):', labelX, finalY);
  doc.text(`₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, finalY, { align: 'right' });
  
  // GST Breakdown
  doc.setFontSize(9);
  doc.setTextColor(100);
  let totalY = finalY + 7;
  doc.text('Taxable Amount:', labelX, totalY);
  doc.text(`₹${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 5;
  doc.text('CGST (9%):', labelX, totalY);
  doc.text(`₹${(gst/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 5;
  doc.text('SGST (9%):', labelX, totalY);
  doc.text(`₹${(gst/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 5;
  doc.setFont(undefined, 'bold');
  doc.text('Total GST (18%):', labelX, totalY);
  doc.text(`₹${gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Grand Total
  totalY += 10;
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text('GRAND TOTAL:', labelX, totalY);
  doc.text(`₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Terms & Conditions
  let notesY = totalY + 15;
  
  if (quotation.terms_and_conditions) {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Conditions:', 20, notesY);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60);
    const termsLines = doc.splitTextToSize(quotation.terms_and_conditions, pageWidth - 40);
    doc.text(termsLines, 20, notesY + 5);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('This is a computer-generated quotation.', pageWidth / 2, 285, { align: 'center' });
  
  doc.save(`${quotation.quotation_number}.pdf`);
};

export const generateInvoicePDF = (invoice, lead, items) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(220, 38, 38);
  doc.text('NISSI OFFICE SYSTEMS', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text('TAX INVOICE', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(`INVOICE: ${invoice.invoice_number}`, pageWidth / 2, 38, { align: 'center' });
  
  // Customer Details
  doc.setFontSize(10);
  let yPos = 50;
  
  doc.setFont(undefined, 'bold');
  doc.text('BILL TO:', 20, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 6;
  doc.text(lead.company_name || 'N/A', 20, yPos);
  yPos += 5;
  if (lead.contact_person) {
    doc.text(lead.contact_person, 20, yPos);
    yPos += 5;
  }
  if (lead.phone) {
    doc.text(lead.phone, 20, yPos);
    yPos += 5;
  }
  if (lead.gstin) {
    doc.setFont(undefined, 'bold');
    doc.text(`GSTIN: ${lead.gstin}`, 20, yPos);
    doc.setFont(undefined, 'normal');
  }
  
  // Invoice Details
  yPos = 50;
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE DATE:', 120, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 6;
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-IN'), 120, yPos);
  yPos += 5;
  if (invoice.due_date) {
    doc.setFont(undefined, 'bold');
    doc.text('DUE DATE:', 120, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    doc.text(new Date(invoice.due_date).toLocaleDateString('en-IN'), 120, yPos);
  }
  
  // Line Items - YOUR EXACT COLUMNS
  const tableData = items.map((item, idx) => [
    (idx + 1).toString(),
    item.item_name || '',
    item.description || '',
    '8471',
    item.units || 'pcs',
    String(item.quantity || 0),
    `₹${parseFloat(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `₹${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  ]);
  
  autoTable(doc,{
    startY: 85,
    head: [['Sr', 'Model', 'Description', 'HSN', 'Units', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [243, 244, 246], 
      textColor: [31, 41, 55], 
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 3,
      overflow: 'linebreak',
      valign: 'top'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },   // Sr
      1: { cellWidth: 28, fontStyle: 'bold' },  // Model
      2: { cellWidth: 50 },                      // Description - WIDE
      3: { cellWidth: 15, halign: 'center' },   // HSN
      4: { cellWidth: 15, halign: 'center' },   // Units
      5: { cellWidth: 15, halign: 'right' },    // Qty
      6: { cellWidth: 25, halign: 'right' },    // Rate
      7: { cellWidth: 27, halign: 'right' }     // Amount
    }
  });
  
  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  const total = parseFloat(invoice.total_amount || 0);
  const taxable = total / 1.18;
  const gst = total - taxable;
  
  const rightX = 190;
  const labelX = rightX - 65;
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  let totalY = finalY;
  
  doc.text('Taxable Amount:', labelX, totalY);
  doc.text(`₹${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 5;
  doc.text('CGST (9%):', labelX, totalY);
  doc.text(`₹${(gst/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 5;
  doc.text('SGST (9%):', labelX, totalY);
  doc.text(`₹${(gst/2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 5;
  doc.setFont(undefined, 'bold');
  doc.text('Total GST:', labelX, totalY);
  doc.text(`₹${gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Total Amount
  totalY += 10;
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text('TOTAL AMOUNT:', labelX, totalY);
  doc.text(`₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Payment Status
  if (invoice.paid_amount > 0) {
    totalY += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);
    doc.text('Paid:', labelX, totalY);
    doc.text(`₹${parseFloat(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
    
    totalY += 7;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('BALANCE DUE:', labelX, totalY);
    doc.text(`₹${parseFloat(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('This is a computer-generated invoice and is valid without signature.', pageWidth / 2, 285, { align: 'center' });
  
  doc.save(`${invoice.invoice_number}.pdf`);
};