import PDFDocument from 'pdfkit';
import { prisma } from '../config/database.js';
import { AppError, formatCurrency } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, '../../../uploads');

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

export const generateInvoicePDF = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, orderItems: { include: { product: { select: { id: true, name: true, sku: true } } } }, invoice: true },
  });

  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  if (!order.invoice) throw new AppError('Invoice not found for this order', 404, 'NOT_FOUND');

  const invoicesDir = path.join(UPLOAD_DIR, 'invoices');
  ensureDir(invoicesDir);

  const filename = `${order.invoice.invoiceNumber}.pdf`;
  const filePath = path.join(invoicesDir, filename);
  const pdfUrl = `/uploads/invoices/${filename}`;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e3a5f').text('INVOICE', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('ERP System', 50, 80).text('erp.yourdomain.com', 50, 95);

    // Invoice meta
    doc.fontSize(10).fillColor('#333')
      .text(`Invoice #: ${order.invoice.invoiceNumber}`, 350, 50, { align: 'right', width: 200 })
      .text(`Date: ${new Date(order.invoice.createdAt).toLocaleDateString()}`, 350, 65, { align: 'right', width: 200 })
      .text(`Status: ${order.status}`, 350, 80, { align: 'right', width: 200 });

    // Divider
    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#1e3a5f').lineWidth(2).stroke();

    // Bill To
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a5f').text('BILL TO', 50, 130);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    if (order.customer) { doc.text(order.customer.name, 50, 145); }
    else doc.text('Walk-in Customer', 50, 145);

    // Payment
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a5f').text('PAYMENT', 350, 130);
    doc.fontSize(10).font('Helvetica').fillColor('#333')
      .text(`Method: ${order.paymentMethod || 'N/A'}`, 350, 145)
      .text(`Channel: ${order.channel || 'Manual'}`, 350, 160);

    // Table header
    const tableTop = 200;
    doc.rect(50, tableTop, 495, 22).fill('#1e3a5f');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff')
      .text('#', 55, tableTop + 7).text('Description', 75, tableTop + 7)
      .text('SKU', 300, tableTop + 7).text('Qty', 370, tableTop + 7)
      .text('Unit Price', 400, tableTop + 7).text('Subtotal', 470, tableTop + 7);

    // Items
    let y = tableTop + 32;
    order.orderItems.forEach((item, idx) => {
      if (y > 700) { doc.addPage(); y = 50; }
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(50, y - 5, 495, 20).fill(bg);
      doc.fontSize(9).font('Helvetica').fillColor('#333')
        .text(String(idx + 1), 55, y)
        .text(item.product?.name || 'Custom Item', 75, y, { width: 215 })
        .text(item.product?.sku || '-', 300, y)
        .text(String(item.quantity), 370, y)
        .text(formatCurrency(item.priceAtSale), 400, y)
        .text(formatCurrency(item.subtotal), 470, y);
      y += 22;
    });

    // Totals
    y += 10;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(1).stroke();
    y += 12;
    doc.fontSize(10).font('Helvetica').fillColor('#333').text('Subtotal:', 380, y).text(formatCurrency(order.subtotal), 470, y);
    y += 18;
    if (parseFloat(order.discount) > 0) { doc.fillColor('#c0392b').text('Discount:', 380, y).text(`-${formatCurrency(order.discount)}`, 470, y); y += 18; }
    if (parseFloat(order.tax) > 0) { doc.fillColor('#333').text('Tax:', 380, y).text(formatCurrency(order.tax), 470, y); y += 18; }
    y += 5;
    doc.rect(370, y, 175, 26).fill('#1e3a5f');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#fff').text('TOTAL:', 380, y + 7).text(formatCurrency(order.total), 470, y + 7);

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#999')
      .text('Thank you for your business!', 50, 780, { align: 'center', width: 495 })
      .text('Computer-generated invoice — no signature required.', 50, 792, { align: 'center', width: 495 });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  await prisma.invoice.update({ where: { id: order.invoice.id }, data: { pdfUrl } });
  logger.info('Invoice PDF generated', { invoiceId: order.invoice.id, pdfUrl });
  return { pdfUrl, invoiceNumber: order.invoice.invoiceNumber };
};

export const getInvoiceByOrderId = async (orderId) => {
  const invoice = await prisma.invoice.findUnique({ where: { orderId }, include: { order: { include: { customer: true } } } });
  if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  return invoice;
};
