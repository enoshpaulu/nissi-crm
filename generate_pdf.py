import sys
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas
from datetime import datetime

def format_currency(amount):
    """Format number as Indian currency"""
    try:
        return f"₹{float(amount):,.2f}"
    except:
        return "₹0.00"

def create_quotation_pdf(data, output_path):
    """Generate quotation PDF"""
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                          leftMargin=0.5*inch, rightMargin=0.5*inch,
                          topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
                                fontSize=24, textColor=colors.HexColor('#2563eb'),
                                spaceAfter=12, alignment=TA_CENTER)
    
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'],
                                  fontSize=14, textColor=colors.HexColor('#1f2937'),
                                  spaceAfter=6)
    
    # Header - Company Name
    story.append(Paragraph("NISSI OFFICE SYSTEMS", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Quotation Title and Number
    quote_title = f"<b>QUOTATION: {data.get('quotation_number', 'N/A')}</b>"
    if data.get('version', 1) > 1:
        quote_title += f" <i>(Version {data['version']})</i>"
    story.append(Paragraph(quote_title, heading_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Info Table (2 columns: Customer Info | Quotation Details)
    info_data = [
        [Paragraph("<b>BILL TO:</b>", styles['Normal']), 
         Paragraph("<b>QUOTATION DETAILS:</b>", styles['Normal'])],
        [Paragraph(f"<b>{data.get('customer_name', 'N/A')}</b>", styles['Normal']),
         Paragraph(f"Date: {data.get('quotation_date', 'N/A')}", styles['Normal'])],
    ]
    
    if data.get('contact_person'):
        info_data.append([Paragraph(data['contact_person'], styles['Normal']), 
                         Paragraph(f"Valid Until: {data.get('valid_until', 'N/A')}", styles['Normal'])])
    
    if data.get('email'):
        info_data.append([Paragraph(data['email'], styles['Normal']), Paragraph("", styles['Normal'])])
    
    if data.get('phone'):
        info_data.append([Paragraph(data['phone'], styles['Normal']), Paragraph("", styles['Normal'])])
    
    if data.get('address'):
        address = data['address']
        if data.get('city'):
            address += f", {data['city']}"
        if data.get('state'):
            address += f", {data['state']}"
        if data.get('pincode'):
            address += f" - {data['pincode']}"
        info_data.append([Paragraph(address, styles['Normal']), Paragraph("", styles['Normal'])])
    
    if data.get('gstin'):
        info_data.append([Paragraph(f"GSTIN: {data['gstin']}", styles['Normal']), Paragraph("", styles['Normal'])])
    
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Line Items Table
    items_data = [[Paragraph("<b>Item</b>", styles['Normal']),
                   Paragraph("<b>Description</b>", styles['Normal']),
                   Paragraph("<b>Qty</b>", styles['Normal']),
                   Paragraph("<b>Unit Price</b>", styles['Normal']),
                   Paragraph("<b>Amount</b>", styles['Normal'])]]
    
    for item in data.get('items', []):
        items_data.append([
            Paragraph(item.get('item_name', ''), styles['Normal']),
            Paragraph(item.get('description', '')[:50], styles['Normal']),
            Paragraph(f"{item.get('quantity', 0)} {item.get('units', 'pcs')}", styles['Normal']),
            Paragraph(format_currency(item.get('unit_price', 0)), styles['Normal']),
            Paragraph(format_currency(item.get('amount', 0)), styles['Normal'])
        ])
    
    items_table = Table(items_data, colWidths=[1.8*inch, 2.2*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Totals Section
    totals_data = [
        ["", "", "", "Subtotal (Incl. GST):", format_currency(data.get('total_amount', 0))],
        ["", "", "", "", ""],
        ["", "", "", "Taxable Amount:", format_currency(data.get('taxable_amount', 0))],
        ["", "", "", "CGST (9%):", format_currency(data.get('cgst', 0))],
        ["", "", "", "SGST (9%):", format_currency(data.get('sgst', 0))],
        ["", "", "", "Total GST (18%):", format_currency(data.get('gst_amount', 0))],
        ["", "", "", "", ""],
        ["", "", "", Paragraph("<b>GRAND TOTAL:</b>", styles['Normal']), 
         Paragraph(f"<b>{format_currency(data.get('total_amount', 0))}</b>", styles['Normal'])],
    ]
    
    totals_table = Table(totals_data, colWidths=[1.8*inch, 2.2*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (3, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (3, -1), (-1, -1), 2, colors.HexColor('#1f2937')),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Notes and Terms
    if data.get('notes'):
        story.append(Paragraph("<b>Notes:</b>", heading_style))
        story.append(Paragraph(data['notes'], styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
    
    if data.get('terms_and_conditions'):
        story.append(Paragraph("<b>Terms & Conditions:</b>", heading_style))
        for line in data['terms_and_conditions'].split('\n'):
            if line.strip():
                story.append(Paragraph(line, styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
    
    # Footer
    story.append(Spacer(1, 0.2*inch))
    footer_text = "This is a computer-generated quotation and does not require a signature."
    story.append(Paragraph(f"<i>{footer_text}</i>", 
                          ParagraphStyle('Footer', parent=styles['Normal'], 
                                       fontSize=8, textColor=colors.grey, alignment=TA_CENTER)))
    
    # Build PDF
    doc.build(story)
    return output_path

def create_invoice_pdf(data, output_path):
    """Generate invoice PDF"""
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                          leftMargin=0.5*inch, rightMargin=0.5*inch,
                          topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
                                fontSize=24, textColor=colors.HexColor('#dc2626'),
                                spaceAfter=12, alignment=TA_CENTER)
    
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'],
                                  fontSize=14, textColor=colors.HexColor('#1f2937'),
                                  spaceAfter=6)
    
    # Header
    story.append(Paragraph("NISSI OFFICE SYSTEMS", title_style))
    story.append(Paragraph("<b>TAX INVOICE</b>", 
                          ParagraphStyle('Subtitle', parent=styles['Normal'],
                                       fontSize=16, alignment=TA_CENTER, spaceAfter=12)))
    story.append(Spacer(1, 0.1*inch))
    
    # Invoice Number
    story.append(Paragraph(f"<b>INVOICE: {data.get('invoice_number', 'N/A')}</b>", heading_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Info Table
    info_data = [
        [Paragraph("<b>BILL TO:</b>", styles['Normal']), 
         Paragraph("<b>INVOICE DETAILS:</b>", styles['Normal'])],
        [Paragraph(f"<b>{data.get('customer_name', 'N/A')}</b>", styles['Normal']),
         Paragraph(f"Invoice Date: {data.get('invoice_date', 'N/A')}", styles['Normal'])],
    ]
    
    if data.get('contact_person'):
        info_data.append([Paragraph(data['contact_person'], styles['Normal']), 
                         Paragraph(f"Due Date: {data.get('due_date', 'N/A')}", styles['Normal'])])
    
    if data.get('email'):
        info_data.append([Paragraph(data['email'], styles['Normal']), 
                         Paragraph(f"Payment Terms: {data.get('payment_terms', 'N/A')}", styles['Normal'])])
    
    if data.get('phone'):
        info_data.append([Paragraph(data['phone'], styles['Normal']), Paragraph("", styles['Normal'])])
    
    if data.get('address'):
        address = data['address']
        if data.get('city'):
            address += f", {data['city']}"
        if data.get('state'):
            address += f", {data['state']}"
        if data.get('pincode'):
            address += f" - {data['pincode']}"
        info_data.append([Paragraph(address, styles['Normal']), Paragraph("", styles['Normal'])])
    
    if data.get('gstin'):
        info_data.append([Paragraph(f"<b>GSTIN: {data['gstin']}</b>", styles['Normal']), Paragraph("", styles['Normal'])])
    
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Line Items
    items_data = [[Paragraph("<b>Sr</b>", styles['Normal']),
                   Paragraph("<b>Item</b>", styles['Normal']),
                   Paragraph("<b>HSN</b>", styles['Normal']),
                   Paragraph("<b>Qty</b>", styles['Normal']),
                   Paragraph("<b>Rate</b>", styles['Normal']),
                   Paragraph("<b>Amount</b>", styles['Normal'])]]
    
    for idx, item in enumerate(data.get('items', []), 1):
        items_data.append([
            Paragraph(str(idx), styles['Normal']),
            Paragraph(f"{item.get('item_name', '')}<br/><i>{item.get('description', '')[:40]}</i>", styles['Normal']),
            Paragraph("8471", styles['Normal']),
            Paragraph(f"{item.get('quantity', 0)}", styles['Normal']),
            Paragraph(format_currency(item.get('unit_price', 0)), styles['Normal']),
            Paragraph(format_currency(item.get('amount', 0)), styles['Normal'])
        ])
    
    items_table = Table(items_data, colWidths=[0.4*inch, 2.5*inch, 0.8*inch, 0.8*inch, 1.3*inch, 1.4*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Totals
    totals_data = [
        ["", "", "", "", "Taxable Amount:", format_currency(data.get('taxable_amount', 0))],
        ["", "", "", "", "CGST (9%):", format_currency(data.get('cgst', 0))],
        ["", "", "", "", "SGST (9%):", format_currency(data.get('sgst', 0))],
        ["", "", "", "", "Total GST:", format_currency(data.get('gst_amount', 0))],
        ["", "", "", "", "", ""],
        ["", "", "", "", Paragraph("<b>TOTAL AMOUNT:</b>", styles['Normal']), 
         Paragraph(f"<b>{format_currency(data.get('total_amount', 0))}</b>", styles['Normal'])],
    ]
    
    if data.get('paid_amount', 0) > 0:
        totals_data.append(["", "", "", "", "Paid:", format_currency(data.get('paid_amount', 0))])
        totals_data.append(["", "", "", "", Paragraph("<b>BALANCE DUE:</b>", styles['Normal']), 
                           Paragraph(f"<b>{format_currency(data.get('balance_amount', 0))}</b>", styles['Normal'])])
    
    totals_table = Table(totals_data, colWidths=[0.4*inch, 2.5*inch, 0.8*inch, 0.8*inch, 1.3*inch, 1.4*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (4, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (4, -1), (-1, -1), 2, colors.HexColor('#1f2937')),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Payment Terms and Notes
    if data.get('payment_terms'):
        story.append(Paragraph("<b>Payment Terms:</b>", heading_style))
        story.append(Paragraph(data['payment_terms'], styles['Normal']))
        story.append(Spacer(1, 0.1*inch))
    
    if data.get('terms_and_conditions'):
        story.append(Paragraph("<b>Terms & Conditions:</b>", heading_style))
        for line in data['terms_and_conditions'].split('\n'):
            if line.strip():
                story.append(Paragraph(line, styles['Normal']))
    
    # Footer
    story.append(Spacer(1, 0.3*inch))
    footer_text = "This is a computer-generated invoice and is valid without signature."
    story.append(Paragraph(f"<i>{footer_text}</i>", 
                          ParagraphStyle('Footer', parent=styles['Normal'], 
                                       fontSize=8, textColor=colors.grey, alignment=TA_CENTER)))
    
    # Build PDF
    doc.build(story)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_pdf.py <type> <input_json> <output_pdf>")
        print("Type: quotation or invoice")
        sys.exit(1)
    
    doc_type = sys.argv[1]
    input_json = sys.argv[2]
    output_pdf = sys.argv[3]
    
    # Read input JSON
    with open(input_json, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Generate PDF
    if doc_type == 'quotation':
        create_quotation_pdf(data, output_pdf)
        print(f"Quotation PDF generated: {output_pdf}")
    elif doc_type == 'invoice':
        create_invoice_pdf(data, output_pdf)
        print(f"Invoice PDF generated: {output_pdf}")
    else:
        print(f"Unknown document type: {doc_type}")
        sys.exit(1)