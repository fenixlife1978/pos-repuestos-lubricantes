/**
 * thermal-printer.ts
 *
 * Módulo universal para la generación de tickets de texto plano compatibles con ESC/POS.
 * Configurado exclusivamente para impresoras térmicas de 80mm.
 */

// --- Constantes de Configuración ---
const PAPER_WIDTH = 48; // Ancho fijo para 80mm

// --- Comandos ESC/POS ---
export const CMD = {
  INIT: '\x1B\x40',
  CUT: '\x1B\x69',
  DRAWER_KICK: '\x1B\x70\x00\x19\x19',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  DOUBLE_HW_ON: '\x1B\x21\x30',
  DOUBLE_HW_OFF: '\x1B\x21\x00',
};

// --- Funciones Auxiliares de Formateo ---

function alignLeftRight(leftTxt: string, rightTxt: string): string {
  leftTxt = String(leftTxt || '');
  rightTxt = String(rightTxt || '');
  const spaceCount = PAPER_WIDTH - leftTxt.length - rightTxt.length;
  if (spaceCount < 1) {
    const availableWidth = PAPER_WIDTH - rightTxt.length - 1;
    return leftTxt.substring(0, availableWidth) + ' ' + rightTxt;
  }
  const spaces = ' '.repeat(spaceCount);
  return leftTxt + spaces + rightTxt;
}

function center(txt: string): string {
  txt = String(txt || '');
  if (txt.length >= PAPER_WIDTH) return txt.substring(0, PAPER_WIDTH);
  const leftPadding = Math.floor((PAPER_WIDTH - txt.length) / 2);
  const rightPadding = PAPER_WIDTH - txt.length - leftPadding;
  return ' '.repeat(leftPadding) + txt + ' '.repeat(rightPadding);
}

function separator(char: string): string {
  return char.repeat(PAPER_WIDTH);
}

function formatCurrency(value: number): string {
  const num = (typeof value === 'number') ? value : 0;
  return 'Bs. ' + num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cleanText(text: string): string {
  // Eliminar caracteres de control ESC/POS
  return text
    .replace(/[\x1B\x40\x1B\x69\x1B\x45\x01\x1B\x45\x00\x1B\x21\x30\x1B\x21\x00]/g, '')
    .replace(/\x1B/g, '')
    .replace(/\[0m/g, '')
    .replace(/\[1m/g, '');
}

// --- Generadores de Tickets ---

interface StoreInfo {
  name?: string;
  address?: string;
  rif?: string;
  phone?: string;
}

/**
 * Construye el string para un ticket de venta (80mm).
 */
export function generateSaleTicket(saleData: any, storeInfo: StoreInfo = {}): string {
  let ticket = [];

  // Encabezado
  ticket.push(center(storeInfo.name || 'MI TIENDA'));
  if (storeInfo.address) ticket.push(center(storeInfo.address));
  if (storeInfo.rif) ticket.push(center(`RIF: ${storeInfo.rif}`));
  if (storeInfo.phone) ticket.push(center(`TEL: ${storeInfo.phone}`));
  ticket.push(separator('─'));

  // Datos del Ticket
  ticket.push(alignLeftRight(`FACTURA: ${saleData.id || 'N/A'}`, `CAJA: ${saleData.terminal || '01'}`));
  ticket.push(alignLeftRight(`FECHA: ${new Date().toLocaleString('es-VE')}`, ''));
  if (saleData.cliente) {
    ticket.push(alignLeftRight(`CLIENTE: ${saleData.cliente.name || 'CONSUMIDOR FINAL'}`, ''));
    if (saleData.cliente.id) ticket.push(alignLeftRight(`CÉDULA: ${saleData.cliente.id}`, ''));
  }
  ticket.push(separator('─'));

  // Cabecera de Items
  ticket.push('DESCRIPCIÓN');
  ticket.push(alignLeftRight('CANT  x  PRECIO', 'TOTAL'));
  ticket.push(separator('─'));

  // Items
  if (saleData.items && saleData.items.length > 0) {
    for (const item of saleData.items) {
      const nombre = item.nombre?.toUpperCase() || 'SIN DESCRIPCIÓN';
      ticket.push(nombre.substring(0, 30));
      const precio = (item.precio || 0).toFixed(2);
      const total = (item.total || 0).toFixed(2);
      ticket.push(alignLeftRight(` ${item.cantidad || 1}  x  ${precio}`, total));
    }
  }
  ticket.push(separator('─'));

  // Totales
  ticket.push(alignLeftRight('SUBTOTAL:', (saleData.subtotal || 0).toFixed(2)));
  ticket.push(alignLeftRight('IVA (16%):', (saleData.iva || 0).toFixed(2)));
  ticket.push(separator('═'));
  ticket.push(alignLeftRight('TOTAL A PAGAR:', formatCurrency(saleData.total || 0)));
  ticket.push(separator('─'));

  // Pie de página
  ticket.push(center('¡GRACIAS POR SU COMPRA!'));
  ticket.push(center('Vuelva pronto'));

  // Unir todo con saltos de línea y agregar comandos ESC/POS
  return CMD.INIT + ticket.join('\n') + '\n\n\n\n' + CMD.CUT + CMD.DRAWER_KICK;
}

/**
 * Construye el string para un Reporte X o Z (80mm).
 */
export function generateReport(reportData: any, storeInfo: StoreInfo = {}, type: 'X' | 'Z'): string {
  let report = [];

  const title = type === 'X' ? 'REPORTE X - LECTURA PARCIAL' : 'REPORTE Z - CIERRE DIARIO';

  // Encabezado
  report.push(center(storeInfo.name || 'MI TIENDA'));
  if (storeInfo.address) report.push(center(storeInfo.address));
  if (storeInfo.rif) report.push(center(`RIF: ${storeInfo.rif}`));
  if (storeInfo.phone) report.push(center(`TEL: ${storeInfo.phone}`));
  report.push(separator('═'));
  report.push(center(title));
  report.push(separator('─'));

  // Info general
  report.push(alignLeftRight(`TERMINAL: ${reportData.terminal || 'CAJA-01'}`, ''));
  report.push(alignLeftRight(`FECHA: ${new Date().toLocaleString('es-VE')}`, ''));
  if (type === 'Z' && reportData.numeroZ) {
    report.push(alignLeftRight(`N° Z: ${reportData.numeroZ}`, ''));
  }
  report.push('');

  // Resumen de facturación
  report.push('RESUMEN DE FACTURACIÓN');
  report.push(separator('─'));
  report.push(alignLeftRight('VENTA BRUTA:', formatCurrency(reportData.ventaBruta || 0)));
  report.push(alignLeftRight('DESCUENTOS:', formatCurrency(-(reportData.descuentos || 0))));
  report.push(alignLeftRight('DEVOLUCIONES:', formatCurrency(-(reportData.devoluciones || 0))));
  report.push(alignLeftRight('VENTA NETA:', formatCurrency(reportData.ventaNeta || 0)));
  report.push('');

  // Desglose fiscal
  report.push('DESGLOSE FISCAL');
  report.push(separator('─'));
  report.push(alignLeftRight('MONTO EXENTO:', formatCurrency(reportData.montoExento || 0)));
  report.push(alignLeftRight('BASE IMPONIBLE:', formatCurrency(reportData.baseImponible || 0)));
  report.push(alignLeftRight('IVA RECAUDADO (16%):', formatCurrency(reportData.iva || 0)));
  report.push(alignLeftRight('TOTAL IGTF (3%):', formatCurrency(reportData.igtf || 0)));
  report.push('');

  // Conciliación de pagos
  if (reportData.metodosPago && reportData.metodosPago.length > 0) {
    report.push('CONCILIACIÓN DE PAGOS');
    report.push(separator('─'));
    for (const metodo of reportData.metodosPago) {
      report.push(alignLeftRight(metodo.nombre?.toUpperCase() || 'OTRO:', formatCurrency(metodo.total || 0)));
    }
    report.push('');
  }

  // Estadísticas
  report.push('ESTADÍSTICAS DE JORNADA');
  report.push(separator('─'));
  report.push(alignLeftRight('FACTURAS EMITIDAS:', String(reportData.facturasEmitidas || 0)));
  report.push(alignLeftRight('NOTAS CRÉDITO:', String(reportData.notasCredito || 0)));
  report.push(alignLeftRight('DOCS. ANULADOS:', String(reportData.documentosAnulados || 0)));
  report.push(alignLeftRight('TICKET PROMEDIO:', formatCurrency(reportData.ticketPromedio || 0)));
  report.push('');

  if (type === 'Z') {
    report.push(center('--- CIERRE DE CAJA ---'));
    report.push('');
  }

  // Pie de página
  report.push(center('¡GRACIAS POR SU PREFERENCIA!'));

  // Unir todo con saltos de línea
  return CMD.INIT + report.join('\n') + '\n\n\n\n' + CMD.CUT;
}