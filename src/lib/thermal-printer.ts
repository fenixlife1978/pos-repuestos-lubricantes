
/**
 * thermal-printer.ts
 *
 * Módulo universal para la generación de tickets de texto plano compatibles con ESC/POS.
 * Utiliza datos dinámicos de la tienda para el encabezado y formatea la salida
 * para que coincida con un estilo de impresora térmica nativa.
 */

// --- Constantes de Configuración ---
const PAPER_WIDTH = {
  '80mm': 48,
  '56mm': 32,
};

// --- Comandos ESC/POS ---
export const CMD = {
  INIT: '\x1B\x40',
  CUT: '\x1B\x69',
  DRAWER_KICK: '\x1B\x70\x00\x19\x19',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  DOUBLE_HW_ON: '\x1B\x21\x30', // Doble altura y anchura
  DOUBLE_HW_OFF: '\x1B\x21\x00', // Desactiva doble altura y anchura
};

// --- Funciones Auxiliares de Formateo ---

function alignLeftRight(leftTxt: string, rightTxt: string, width: number): string {
  leftTxt = String(leftTxt || '');
  rightTxt = String(rightTxt || '');
  const spaceCount = width - leftTxt.length - rightTxt.length;
  if (spaceCount < 1) {
    const availableWidth = width - rightTxt.length - 1;
    return leftTxt.substring(0, availableWidth) + ' ' + rightTxt;
  }
  const spaces = ' '.repeat(spaceCount);
  return leftTxt + spaces + rightTxt;
}

function center(txt: string, width: number): string {
  txt = String(txt || '');
  if (txt.length >= width) return txt.substring(0, width);
  const leftPadding = Math.floor((width - txt.length) / 2);
  const rightPadding = width - txt.length - leftPadding;
  return ' '.repeat(leftPadding) + txt + ' '.repeat(rightPadding);
}

function separator(char: string, width: number): string {
  return char.repeat(width);
}

function formatCurrency(value: number, width: number, prefix = 'Bs. '): string {
    const num = (typeof value === 'number') ? value : 0;
    const formattedValue = prefix + num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return formattedValue.padStart(width, ' ');
}

// --- Generadores de Tickets ---

type PaperSize = '80mm' | '56mm';

// La información de la tienda se pasará como argumento
interface StoreInfo {
    name?: string;
    address?: string;
    rif?: string;
    phone?: string;
}

/**
 * Construye el string para un ticket de venta.
 * @param saleData - El objeto de la venta.
 * @param storeInfo - Información de la tienda.
 * @param paperSize - '80mm' o '56mm'.
 * @returns {string} El ticket completo como un solo string.
 */
export function generateSaleTicket(saleData: any, storeInfo: StoreInfo = {}, paperSize: PaperSize): string {
  const width = PAPER_WIDTH[paperSize];
  let ticket = [];

  // Encabezado dinámico
  ticket.push(CMD.DOUBLE_HW_ON + center(storeInfo.name || '', width / 2) + CMD.DOUBLE_HW_OFF);
  if (storeInfo.address) ticket.push(center(storeInfo.address, width));
  if (storeInfo.rif) ticket.push(center(`RIF: ${storeInfo.rif}`, width));
  if (storeInfo.phone) ticket.push(center(`TEL: ${storeInfo.phone}`, width));
  ticket.push(separator('-', width));

  // Datos del Ticket
  ticket.push(alignLeftRight(`TERMINAL: ${saleData.terminal || 'CAJA-01'}`, '', width));
  ticket.push(alignLeftRight(`FECHA/HORA: ${new Date().toLocaleString('es-ES')}`, '', width));
  ticket.push(alignLeftRight(`CONTROL: ${saleData.id}`, '', width));
  if (saleData.cliente) {
      ticket.push(alignLeftRight(`CLIENTE: ${saleData.cliente.name}`, '', width));
      ticket.push(alignLeftRight(`RIF/CI: ${saleData.cliente.id}`, '', width));
  }
  ticket.push(separator('-', width));

  // Cabecera de Items
  ticket.push('DESCRIPCION');
  ticket.push(alignLeftRight('CANT  x  PRECIO', 'TOTAL', width));
  ticket.push(separator('-', width));

  // Items
  for (const item of saleData.items) {
    ticket.push(item.nombre.toUpperCase());
    const itemPrice = (item.precio || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 });
    const itemTotal = (item.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 });
    ticket.push(alignLeftRight(` ${item.cantidad} x ${itemPrice}`, itemTotal, width));
  }
  ticket.push(separator('-', width));

  // Totales
  ticket.push(CMD.BOLD_ON + alignLeftRight('TOTAL A PAGAR:', formatCurrency(saleData.total, 0, 'Bs. '), width) + CMD.BOLD_OFF);
  ticket.push(''); // Espacio

  // Pie de página
  ticket.push(center('¡Gracias por su preferencia!', width));
  
  return CMD.INIT + ticket.join('\n') + '\n\n\n' + CMD.CUT + CMD.DRAWER_KICK;
}

/**
 * Construye el string para un Reporte X o Z.
 * @param reportData - Los datos del reporte.
 * @param storeInfo - Información de la tienda.
 * @param type - 'X' o 'Z'.
 * @param paperSize - '80mm' o '56mm'.
 * @returns {string} El reporte completo como un solo string.
 */
export function generateReport(reportData: any, storeInfo: StoreInfo = {}, type: 'X' | 'Z', paperSize: PaperSize): string {
  const width = PAPER_WIDTH[paperSize];
  let report = [];

  const title = type === 'X' ? 'REPORTE X - LECTURA PARCIAL' : 'REPORTE Z - CIERRE DIARIO';
  
  // Encabezado dinámico
  report.push(CMD.DOUBLE_HW_ON + center(storeInfo.name || '', width / 2) + CMD.DOUBLE_HW_OFF);
  if (storeInfo.address) report.push(center(storeInfo.address, width));
  if (storeInfo.rif) report.push(center(`RIF: ${storeInfo.rif}`, width));
  if (storeInfo.phone) report.push(center(`TEL: ${storeInfo.phone}`, width));
  report.push(separator('-', width));
  report.push(CMD.BOLD_ON + center(title, width) + CMD.BOLD_OFF);
  report.push(separator('-', width));

  // Info general
  report.push(alignLeftRight(`TERMINAL: ${reportData.terminal || 'CAJA-01'}`, '', width));
  report.push(alignLeftRight(`FECHA/HORA: ${new Date().toLocaleString('es-ES')}`, '', width));
  report.push('');

  // Cuerpo del reporte
  report.push(CMD.BOLD_ON + 'RESUMEN DE FACTURACION' + CMD.BOLD_OFF);
  report.push(alignLeftRight('VENTA BRUTA:', formatCurrency(reportData.ventaBruta, 0, ''), width));
  report.push(alignLeftRight('DESCUENTOS:', formatCurrency(reportData.descuentos, 0, '-'), width));
  report.push(alignLeftRight('DEVOLUCIONES:', formatCurrency(reportData.devoluciones, 0, '-'), width));
  report.push('');
  report.push(CMD.BOLD_ON + alignLeftRight('VENTA NETA:', formatCurrency(reportData.ventaNeta, 0, 'Bs. '), width) + CMD.BOLD_OFF);
  report.push('');

  report.push(CMD.BOLD_ON + 'DESGLOSE FISCAL' + CMD.BOLD_OFF);
  report.push(alignLeftRight('MONTO EXENTO:', formatCurrency(reportData.baseImponible, 0, 'Bs. '), width));
  report.push(alignLeftRight('BASE IMPONIBLE:', formatCurrency(0, 0, 'Bs. '), width));
  report.push(alignLeftRight('IVA RECAUDADO (16%):', formatCurrency(reportData.iva, 0, 'Bs. '), width));
  report.push(alignLeftRight('TOTAL IGTF (3%):', formatCurrency(reportData.igtf, 0, 'Bs. '), width));
  report.push('');
  
  report.push(CMD.BOLD_ON + 'CONCILIACION DE PAGOS' + CMD.BOLD_OFF);
  (reportData.metodosPago || []).forEach((metodo: any) => {
      report.push(alignLeftRight(metodo.nombre.toUpperCase() + ':', formatCurrency(metodo.total, 0, 'Bs. '), width));
  });
  report.push('');

  report.push(CMD.BOLD_ON + 'ESTADISTICAS DE JORNADA' + CMD.BOLD_OFF);
  report.push(alignLeftRight('FACTURAS EMITIDAS:', String(reportData.facturasEmitidas || 0), width));
  report.push(alignLeftRight('NOTAS CREDITO:', String(reportData.notasCredito || 0), width));
  report.push(alignLeftRight('DOCS. ANULADOS:', String(reportData.documentosAnulados || 0), width));
  report.push(alignLeftRight('TICKET PROMEDIO:', formatCurrency(reportData.ticketPromedio, 0, 'Bs. '), width));
  report.push('');

  if (type === 'Z') {
    report.push(CMD.BOLD_ON + center('CIERRE DE CAJA REALIZADO', width) + CMD.BOLD_OFF);
    report.push('');
  }

  // Pie de página
  report.push(center('¡Gracias por su preferencia!', width));
  
  return CMD.INIT + report.join('\n') + '\n\n\n' + CMD.CUT;
}
