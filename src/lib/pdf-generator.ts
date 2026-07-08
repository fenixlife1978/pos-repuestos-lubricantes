import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, normalizeProductForPDF, getProductBarcode, getProductPrice } from './types';

interface CompanyInfo {
  name: string;
  address: string;
  rif: string;
  phone: string;
}

const companyInfo: CompanyInfo = {
  name: 'LICORERÍA EL BUEN BEBER',
  address: 'AV. PRINCIPAL, LOCAL 5',
  rif: 'J-12345678-9',
  phone: '0412-1234567'
};

export const generarPDFInventario = async (products: Product[]) => {
  const doc = new jsPDF('landscape', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Configurar fuente
  doc.setFont('helvetica');

  // --- ENCABEZADO ---
  // Nombre de la empresa
  doc.setFontSize(22);
  doc.setTextColor('#1a1a1a');
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, margin, 20);

  // Detalles de la empresa
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#666666');
  doc.text(companyInfo.address, margin, 28);
  doc.text(`RIF: ${companyInfo.rif} | Tel: ${companyInfo.phone}`, margin, 34);

  // Línea decorativa
  doc.setDrawColor('#e0e0e0');
  doc.setLineWidth(0.5);
  doc.line(margin, 38, pageWidth - margin, 38);

  // --- TÍTULO ---
  doc.setFontSize(18);
  doc.setTextColor('#1a1a1a');
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE INVENTARIO', pageWidth / 2, 48, { align: 'center' });

  // Fecha
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#666666');
  doc.text(`Fecha de emisión: ${dateStr}`, pageWidth - margin, 48, { align: 'right' });

  // --- ESTADÍSTICAS RESUMEN ---
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (getProductPrice(p) * (p.stock || 0)), 0);
  const lowStockItems = products.filter(p => (p.stock || 0) <= (p.stockMinimo || 0)).length;
  const categories = new Set(products.map(p => p.categoria)).size;

  const statsY = 58;
  const statsX = margin;
  const statWidth = (pageWidth - margin * 2) / 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333');

  // Tarjetas de estadísticas
  const stats = [
    { label: 'Total Productos', value: totalProducts.toString() },
    { label: 'Valor Inventario', value: `Bs. ${totalValue.toFixed(2)}` },
    { label: 'Stock Bajo', value: lowStockItems.toString() },
    { label: 'Categorías', value: categories.toString() }
  ];

  stats.forEach((stat, index) => {
    const x = statsX + (index * statWidth);
    // Fondo de la tarjeta
    doc.setFillColor('#f8f9fa');
    doc.rect(x, statsY - 2, statWidth - 5, 20, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666');
    doc.text(stat.label, x + 5, statsY + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a1a1a');
    doc.text(stat.value, x + 5, statsY + 13);
  });

  // --- TABLA DE PRODUCTOS ---
  const tableColumns = ['Código', 'Producto', 'Categoría', 'Precio (Bs.)', 'Stock', 'Stock Mín.', 'Estado'];
  const tableRows = products.map(p => {
    const barcode = getProductBarcode(p);
    const price = getProductPrice(p);
    const stock = p.stock || 0;
    const minStock = p.stockMinimo || 0;
    
    return [
      barcode || 'N/A',
      p.nombre,
      p.categoria,
      price.toFixed(2),
      stock.toString(),
      minStock.toString(),
      stock <= minStock ? '⚠ Stock Bajo' : '✓ Disponible'
    ];
  });

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: statsY + 25,
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: '#e0e0e0',
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: '#2c3e50',
      textColor: '#ffffff',
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: '#333333',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 40, halign: 'left' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
    },
    didParseCell: function(data) {
      // Colorear filas con stock bajo
      if (data.section === 'body' && data.column.index === 6) {
        const cellData = data.cell.raw as string;
        if (cellData.includes('⚠')) {
          data.cell.styles.textColor = '#dc3545';
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: function(data) {
      // Pie de página
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor('#999999');
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${pageNumber} de ${doc.internal.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // Línea de pie de página
      doc.setDrawColor('#e0e0e0');
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    }
  });

  // --- SECCIÓN DE FIRMA ---
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  if (finalY < pageHeight - 30) {
    doc.setFontSize(9);
    doc.setTextColor('#666666');
    doc.setFont('helvetica', 'normal');
    
    const signatureY = Math.max(finalY + 10, pageHeight - 40);
    doc.text('_________________________', pageWidth / 2 - 30, signatureY);
    doc.text('Firma Autorizada', pageWidth / 2 - 20, signatureY + 6);
    
    // Texto adicional
    doc.setFontSize(8);
    doc.setTextColor('#999999');
    doc.text(
      'Este documento es un reporte oficial del inventario de la licorería.',
      pageWidth / 2,
      signatureY + 15,
      { align: 'center' }
    );
  }

  // --- METADATOS DEL PDF ---
  doc.setProperties({
    title: 'Reporte de Inventario',
    subject: 'Inventario de Productos',
    author: companyInfo.name,
    keywords: 'inventario, productos, reporte, licorería',
    creator: companyInfo.name,
  });

  // Guardar el PDF
  doc.save(`inventario_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.pdf`);
};