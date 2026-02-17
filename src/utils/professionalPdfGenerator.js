import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Company details
const COMPANY = {
  name: 'NISSI OFFICE SYSTEMS',
  address: 'Shop no. 3, H. no 2-22-248,\nJayanagr, Kukatpally, Hyderabad - 500072.',
  phone: '+91-7673909090',
  email: 'nissiofficesystems@gmail.com',
  logoUrl: 'https://uzdqrtkupkcyacyfcpfk.supabase.co/storage/v1/object/public/Nissi%20Images/Nissi-Office-Systems.jpg',
  gst: '36ABMPU1856H1Z6',
  bank: {
    name: 'NISSI OFFICE SYSTEMS',
    accountNo: '510101003246816',
    branch: 'KUKATPALLY',
    ifsc: 'UBIN0907707'
  }
};

export const generateProfessionalQuotationPDF = async (quotation, lead, items) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Helper function to check if we need a new page
  const checkPageBreak = (currentY, spaceNeeded) => {
    if (currentY + spaceNeeded > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };
  
  // ========== HEADER - Orange Bar ==========
  doc.setFillColor(255, 102, 0);
  doc.rect(0, 0, pageWidth, 8, 'F');
  
  // ========== COMPANY INFO SECTION ==========
  let yPos = 20;
  
  // Left side - Company Address
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.setFont(undefined, 'bold');
  doc.text('Address:', 15, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 4;
  const addressLines = COMPANY.address.split('\n');
  addressLines.forEach(line => {
    doc.text(line, 15, yPos);
    yPos += 4;
  });
  
  yPos += 2;
  doc.setFont(undefined, 'bold');
  doc.text('Contact:', 15, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(COMPANY.phone, 32, yPos);
  
  yPos += 4;
  doc.setFont(undefined, 'bold');
  doc.text('GST:', 15, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(COMPANY.gst, 32, yPos);
  
  // Center - Company LOGO (BIGGER)
  try {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        const logoWidth = 65;
        const logoHeight = 26;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(img, 'JPEG', logoX, 20, logoWidth, logoHeight);
        resolve();
      };
      img.onerror = () => {
        doc.setFontSize(24);
        doc.setTextColor(255, 102, 0);
        doc.setFont(undefined, 'bold');
        doc.text('NISSI', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text('OFFICE SYSTEMS', pageWidth / 2, 37, { align: 'center' });
        resolve();
      };
      img.src = COMPANY.logoUrl;
    });
  } catch (error) {
    doc.setFontSize(24);
    doc.setTextColor(255, 102, 0);
    doc.setFont(undefined, 'bold');
    doc.text('NISSI', pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text('OFFICE SYSTEMS', pageWidth / 2, 37, { align: 'center' });
  }
  
  // Right side - Date and Quote Number
  const rightMargin = 15;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setFont(undefined, 'bold');
  doc.text('DATE:', pageWidth - 50, 25);
  doc.setFont(undefined, 'normal');
  doc.text(new Date(quotation.quotation_date).toLocaleDateString('en-IN'), pageWidth - rightMargin, 25, { align: 'right' });
  
  doc.setFont(undefined, 'bold');
  doc.text('QUOTE NO.', pageWidth - 50, 33);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(quotation.quotation_number, pageWidth - rightMargin, 33, { align: 'right' });
  
  // ========== CUSTOMER SECTION ==========
  yPos = 52;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setFont(undefined, 'bold');
  doc.text('TO', 15, yPos);
  
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  
  const customerName = lead.contact_person || lead.company_name || 'N/A';
  const formattedName = customerName.toLowerCase().includes('mr.') || customerName.toLowerCase().includes('ms.') 
    ? customerName 
    : `Mr. ${customerName}`;
  
  doc.text(formattedName, 15, yPos);
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  if (lead.city) {
    doc.text(lead.city.toUpperCase(), 15, yPos);
  }
  
  // ========== PRODUCTS TABLE WITH CATEGORY GROUPING ==========
  yPos = 65;
  
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'UNCATEGORIZED';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  
  // Sort categories in preferred order
  const categoryOrder = ['SOUND SYSTEM', 'ELECTRONICS', 'DISPLAY SYSTEM', 'ACCESSORIES', 'UNCATEGORIZED'];
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  let grandTotal = 0;
  
  // Process each category
  for (const category of sortedCategories) {
    const categoryItems = groupedItems[category];
    
    // Prepare table data for this category
    const tableDataPromises = categoryItems.map(async (item) => {
      let imageData = null;
      
      if (item.image_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          
          imageData = await new Promise((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = item.image_url;
            setTimeout(() => resolve(null), 2000);
          });
        } catch (e) {
          imageData = null;
        }
      }
      
      return {
        model: item.item_name || '',
        description: item.description || '',
        image: imageData,
        imageUrl: item.image_url,
        reqUnits: `${item.quantity || 0} ${item.units || 'Piece'}`,
        unitPrice: `Rs. ${parseFloat(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        totalPrice: `Rs. ${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        amount: parseFloat(item.amount || 0)
      };
    });
    
    const tableDataItems = await Promise.all(tableDataPromises);
    
    const tableData = tableDataItems.map(item => [
      item.model,
      item.description,
      '',
      item.reqUnits,
      item.unitPrice,
      item.totalPrice
    ]);
    
    // Category Header
    yPos = checkPageBreak(yPos, 15);
    doc.setFillColor(255, 102, 0);
    doc.rect(14, yPos, 192, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(category, 14 + 192 / 2, yPos + 5.5, { align: 'center' });
    yPos += 8;
    
    // Category Table
    autoTable(doc, {
      startY: yPos,
      head: [[
        { content: 'MODEL', styles: { halign: 'left', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'DESCRIPTION', styles: { halign: 'left', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'IMAGE', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'REQ. UNITS', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'UNIT PRICE', styles: { halign: 'right', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'AMOUNT', styles: { halign: 'right', fillColor: [240, 240, 240], textColor: [30, 30, 30] } }
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 30, 30]
      },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold', valign: 'top' },
        1: { cellWidth: 62, valign: 'top' },
        2: { cellWidth: 22, halign: 'center', valign: 'middle' },
        3: { cellWidth: 20, halign: 'center', valign: 'middle' },
        4: { cellWidth: 28, halign: 'right', valign: 'middle' },
        5: { cellWidth: 28, halign: 'right', valign: 'middle' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      didDrawCell: ((items) => {
        return function(data) {
          if (data.column.index === 2 && data.cell.section === 'body') {
            const item = items[data.row.index];
            if (item && item.image) {
              try {
                const imgWidth = 18;
                const imgHeight = 18;
                const imgX = data.cell.x + (data.cell.width - imgWidth) / 2;
                const imgY = data.cell.y + (data.cell.height - imgHeight) / 2;
                doc.addImage(item.image, 'JPEG', imgX, imgY, imgWidth, imgHeight);
              } catch (e) {
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text('[IMG]', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { 
                  align: 'center' 
                });
              }
            }
          }
        };
      })(tableDataItems)
    });
    
    // Category Subtotal - exact same width as table columns (32+62+22+20+28+28 = 192)
    const categorySubtotal = tableDataItems.reduce((sum, item) => sum + item.amount, 0);
    grandTotal += categorySubtotal;
    
    yPos = doc.lastAutoTable.finalY;
    yPos = checkPageBreak(yPos, 8);
    
    const tableWidth = 192; // exact sum of column widths: 32+62+22+20+28+28
    const tableStartX = 14;
    doc.setFillColor(230, 230, 230);
    doc.rect(tableStartX, yPos, tableWidth, 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(tableStartX, yPos, tableWidth, 8, 'S');
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.setFont(undefined, 'bold');
    doc.text(`${category} SUBTOTAL`, tableStartX + tableWidth / 2, yPos + 5.2, { align: 'center' });
    doc.text(`Rs. ${categorySubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, tableStartX + tableWidth - 3, yPos + 5.2, { align: 'right' });
    
    yPos += 12;
  }
  
  // ========== GRAND TOTAL ==========
  yPos = checkPageBreak(yPos, 9);
  
  const gtTableWidth = 192; // exact column width sum
  doc.setFillColor(255, 102, 0);
  doc.rect(14, yPos, gtTableWidth, 9, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('GRAND TOTAL', 14 + gtTableWidth / 2, yPos + 6, { align: 'center' });
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14 + gtTableWidth - 3, yPos + 6, { align: 'right' });
  
  // ========== GST BREAKDOWN & TOTAL ==========
  let totalY = yPos + 14;
  totalY = checkPageBreak(totalY, 40);
  
  const taxableAmount = grandTotal / 1.18;
  const gstAmount = grandTotal - taxableAmount;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.setFont(undefined, 'normal');
  
  const rightX = pageWidth - 14;
  const labelX = pageWidth - 65;
  
  doc.text('Taxable Amount:', labelX, totalY);
  doc.text(`Rs. ${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 4.5;
  doc.text('CGST (9%):', labelX, totalY);
  doc.text(`Rs. ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 4.5;
  doc.text('SGST (9%):', labelX, totalY);
  doc.text(`Rs. ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 4.5;
  doc.setFont(undefined, 'bold');
  doc.text('Total GST (18%):', labelX, totalY);
  doc.text(`Rs. ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Final Total
  totalY += 8;
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('TOTAL', labelX, totalY);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // ========== BANK DETAILS ==========
  totalY += 12;
  totalY = checkPageBreak(totalY, 30);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  doc.text('Bank Details:', 15, totalY);
  
  totalY += 5;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60);
  
  doc.text(`Account Name: ${COMPANY.bank.name}`, 15, totalY);
  totalY += 4;
  doc.text(`A/C No: ${COMPANY.bank.accountNo}`, 15, totalY);
  totalY += 4;
  doc.text(`Branch: ${COMPANY.bank.branch}`, 15, totalY);
  totalY += 4;
  doc.text(`IFSC Code: ${COMPANY.bank.ifsc}`, 15, totalY);
  
  // ========== TERMS & CONDITIONS ==========
  totalY += 8;
  totalY = checkPageBreak(totalY, 40);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  doc.text('Terms and Conditions:', 15, totalY);
  
  totalY += 5;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60);
  
  if (quotation.terms_and_conditions) {
    const customTerms = quotation.terms_and_conditions.split('\n').filter(t => t.trim());
    customTerms.forEach((term, idx) => {
      totalY = checkPageBreak(totalY, 5);
      const termText = term.startsWith(`${idx + 1}.`) ? term : `${idx + 1}. ${term}`;
      doc.text(termText, 15, totalY);
      totalY += 4.5;
    });
  } else {
    const terms = [
      '1. Above Price is Inclusive of GST',
      `2. Validity: ${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : '15 Days from the date of proposal'}`,
      '3. Payment Terms: As per agreement',
      '4. Delivery: As per schedule',
      '5. Warranty: As per Manufacturer\'s terms'
    ];
    terms.forEach(term => {
      totalY = checkPageBreak(totalY, 5);
      doc.text(term, 15, totalY);
      totalY += 4.5;
    });
  }
  
  // ========== FOOTER ==========
  totalY = checkPageBreak(totalY, 25);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  doc.text('THANK YOU AND ASSURING BEST SERVICE', pageWidth / 2, totalY, { align: 'center' });
  
  totalY += 4.5;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60);
  doc.text(`From M/S ${COMPANY.name}`, pageWidth / 2, totalY, { align: 'center' });
  
  totalY += 5;
  doc.setFontSize(7);
  doc.text(`${COMPANY.phone} | ${COMPANY.email}`, pageWidth / 2, totalY, { align: 'center' });
  
  totalY += 5;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont(undefined, 'italic');
  doc.text('This is a computer-generated quotation and does not require a signature.', pageWidth / 2, totalY, { align: 'center' });
  
  // Save
  doc.save(`${quotation.quotation_number}.pdf`);
};

// Professional Invoice PDF Generator - WITH CATEGORY GROUPING
export const generateProfessionalInvoicePDF = async (invoice, lead, items) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  const checkPageBreak = (currentY, spaceNeeded) => {
    if (currentY + spaceNeeded > pageHeight - 20) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };
  
  // ========== HEADER - Orange Bar ==========
  doc.setFillColor(255, 102, 0);
  doc.rect(0, 0, pageWidth, 8, 'F');
  
  // ========== COMPANY INFO SECTION ==========
  let yPos = 20;
  
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.setFont(undefined, 'bold');
  doc.text('Address:', 15, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 4;
  const addressLines = COMPANY.address.split('\n');
  addressLines.forEach(line => {
    doc.text(line, 15, yPos);
    yPos += 4;
  });
  
  yPos += 2;
  doc.setFont(undefined, 'bold');
  doc.text('Contact:', 15, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(COMPANY.phone, 32, yPos);
  
  yPos += 4;
  doc.setFont(undefined, 'bold');
  doc.text('GST:', 15, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(COMPANY.gst, 32, yPos);
  
  // Center - Company LOGO
  try {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        const logoWidth = 65;
        const logoHeight = 26;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(img, 'JPEG', logoX, 20, logoWidth, logoHeight);
        resolve();
      };
      img.onerror = () => {
        doc.setFontSize(24);
        doc.setTextColor(255, 102, 0);
        doc.setFont(undefined, 'bold');
        doc.text('NISSI', pageWidth / 2, 30, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text('OFFICE SYSTEMS', pageWidth / 2, 37, { align: 'center' });
        resolve();
      };
      img.src = COMPANY.logoUrl;
    });
  } catch (error) {
    doc.setFontSize(24);
    doc.setTextColor(255, 102, 0);
    doc.setFont(undefined, 'bold');
    doc.text('NISSI', pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text('OFFICE SYSTEMS', pageWidth / 2, 37, { align: 'center' });
  }
  
  // "TAX INVOICE" text
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.setFont(undefined, 'bold');
  doc.text('TAX INVOICE', pageWidth / 2, 48, { align: 'center' });
  
  // Right side - Date and Invoice Number
  const rightMargin = 15;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setFont(undefined, 'bold');
  doc.text('DATE:', pageWidth - 50, 25);
  doc.setFont(undefined, 'normal');
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-IN'), pageWidth - rightMargin, 25, { align: 'right' });
  
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE NO.', pageWidth - 50, 33);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(invoice.invoice_number, pageWidth - rightMargin, 33, { align: 'right' });
  
  // ========== CUSTOMER SECTION ==========
  yPos = 55;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setFont(undefined, 'bold');
  doc.text('TO', 15, yPos);
  
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  
  const customerName = lead.contact_person || lead.company_name || 'N/A';
  const formattedName = customerName.toLowerCase().includes('mr.') || customerName.toLowerCase().includes('ms.') 
    ? customerName 
    : `Mr. ${customerName}`;
  
  doc.text(formattedName, 15, yPos);
  
  yPos += 5;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  if (lead.city) {
    doc.text(lead.city.toUpperCase(), 15, yPos);
  }
  if (lead.gstin) {
    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.text(`GSTIN: ${lead.gstin}`, 15, yPos);
    doc.setFont(undefined, 'normal');
  }
  
  // ========== PRODUCTS TABLE WITH CATEGORY GROUPING ==========
  yPos = 72;
  
  // DEBUG: Log all items to see what category they have
  console.log('=== INVOICE PDF DEBUG ===');
  items.forEach(item => {
    console.log(`Item: ${item.item_name} | category: "${item.category}"`);
  });
  
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'UNCATEGORIZED';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  
  const categoryOrder = ['SOUND SYSTEM', 'ELECTRONICS', 'DISPLAY SYSTEM', 'ACCESSORIES', 'UNCATEGORIZED'];
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  let grandTotal = 0;
  let srNo = 1;
  
  // Process each category
  for (const category of sortedCategories) {
    const categoryItems = groupedItems[category];
    
    const tableData = categoryItems.map((item) => {
      const rowData = [
        srNo++,
        item.item_name || '',
        item.description || '',
        `${item.quantity || 0} ${item.units || 'Piece'}`,
        `Rs. ${parseFloat(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Rs. ${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      ];
      return rowData;
    });
    
    // Category Header
    yPos = checkPageBreak(yPos, 15);
    doc.setFillColor(255, 102, 0);
    doc.rect(14, yPos, 193, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(category, 14 + 193 / 2, yPos + 5.5, { align: 'center' });
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [[
        { content: 'Sr', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'MODEL', styles: { halign: 'left', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'DESCRIPTION', styles: { halign: 'left', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'REQ. UNITS', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'RATE', styles: { halign: 'right', fillColor: [240, 240, 240], textColor: [30, 30, 30] } },
        { content: 'AMOUNT', styles: { halign: 'right', fillColor: [240, 240, 240], textColor: [30, 30, 30] } }
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 30, 30]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', valign: 'middle' },
        1: { cellWidth: 35, fontStyle: 'bold', valign: 'top' },
        2: { cellWidth: 70, valign: 'top' },
        3: { cellWidth: 22, halign: 'center', valign: 'middle' },
        4: { cellWidth: 28, halign: 'right', valign: 'middle' },
        5: { cellWidth: 28, halign: 'right', valign: 'middle' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      }
    });
    
    // Category Subtotal - exact same width as table columns (10+35+70+22+28+28 = 193)
    const categorySubtotal = categoryItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    grandTotal += categorySubtotal;
    
    yPos = doc.lastAutoTable.finalY;
    yPos = checkPageBreak(yPos, 8);
    
    const invTableWidth = 193; // exact sum: 10+35+70+22+28+28
    const invTableStartX = 14;
    doc.setFillColor(230, 230, 230);
    doc.rect(invTableStartX, yPos, invTableWidth, 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(invTableStartX, yPos, invTableWidth, 8, 'S');
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.setFont(undefined, 'bold');
    doc.text(`${category} SUBTOTAL`, invTableStartX + invTableWidth / 2, yPos + 5.2, { align: 'center' });
    doc.text(`Rs. ${categorySubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, invTableStartX + invTableWidth - 3, yPos + 5.2, { align: 'right' });
    
    yPos += 12;
  }
  
  // ========== GRAND TOTAL ==========
  yPos = checkPageBreak(yPos, 9);
  
  const invGtWidth = 193; // exact column width sum
  doc.setFillColor(255, 102, 0);
  doc.rect(14, yPos, invGtWidth, 9, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('GRAND TOTAL', 14 + invGtWidth / 2, yPos + 6, { align: 'center' });
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14 + invGtWidth - 3, yPos + 6, { align: 'right' });
  
  // ========== GST & TOTALS ==========
  let totalY = yPos + 14;
  totalY = checkPageBreak(totalY, 50);
  
  const taxableAmount = grandTotal / 1.18;
  const gstAmount = grandTotal - taxableAmount;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.setFont(undefined, 'normal');
  
  const rightX = pageWidth - 14;
  const labelX = pageWidth - 65;
  
  doc.text('Taxable Amount:', labelX, totalY);
  doc.text(`Rs. ${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 4.5;
  doc.text('CGST (9%):', labelX, totalY);
  doc.text(`Rs. ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 4.5;
  doc.text('SGST (9%):', labelX, totalY);
  doc.text(`Rs. ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  totalY += 4.5;
  doc.setFont(undefined, 'bold');
  doc.text('Total GST (18%):', labelX, totalY);
  doc.text(`Rs. ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Total Amount
  totalY += 8;
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('TOTAL AMOUNT', labelX, totalY);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  
  // Payment Status
  if (invoice.paid_amount > 0) {
    totalY += 6;
    doc.setFontSize(9);
    doc.setTextColor(34, 197, 94);
    doc.setFont(undefined, 'normal');
    doc.text('Paid:', labelX, totalY);
    doc.text(`Rs. ${parseFloat(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
    
    totalY += 5;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('BALANCE DUE:', labelX, totalY);
    doc.text(`Rs. ${parseFloat(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX, totalY, { align: 'right' });
  }
  
  // ========== BANK DETAILS ==========
  totalY += 12;
  totalY = checkPageBreak(totalY, 30);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  doc.text('Bank Details:', 15, totalY);
  
  totalY += 5;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60);
  
  doc.text(`Account Name: ${COMPANY.bank.name}`, 15, totalY);
  totalY += 4;
  doc.text(`A/C No: ${COMPANY.bank.accountNo}`, 15, totalY);
  totalY += 4;
  doc.text(`Branch: ${COMPANY.bank.branch}`, 15, totalY);
  totalY += 4;
  doc.text(`IFSC Code: ${COMPANY.bank.ifsc}`, 15, totalY);
  
  // ========== PAYMENT TERMS ==========
  if (invoice.payment_terms) {
    totalY += 8;
    totalY = checkPageBreak(totalY, 20);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30);
    doc.text('Payment Terms:', 15, totalY);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60);
    totalY += 5;
    doc.text(invoice.payment_terms, 15, totalY);
  }
  
  // ========== FOOTER ==========
  totalY = checkPageBreak(totalY, 25);
  totalY += 8;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30);
  doc.text('THANK YOU AND ASSURING BEST SERVICE', pageWidth / 2, totalY, { align: 'center' });
  
  totalY += 4.5;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60);
  doc.text(`From M/S ${COMPANY.name}`, pageWidth / 2, totalY, { align: 'center' });
  
  totalY += 5;
  doc.setFontSize(7);
  doc.text(`${COMPANY.phone} | ${COMPANY.email}`, pageWidth / 2, totalY, { align: 'center' });
  
  totalY += 5;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont(undefined, 'italic');
  doc.text('This is a computer-generated invoice and is valid without signature.', pageWidth / 2, totalY, { align: 'center' });
  
  // Save
  doc.save(`${invoice.invoice_number}.pdf`);
};