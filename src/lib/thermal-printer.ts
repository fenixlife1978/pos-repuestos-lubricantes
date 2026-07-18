
/**
 * thermal-printer.ts
 * 
 * Módulo universal para la generación de tickets de texto plano compatibles con ESC/POS.
 * Contiene funciones de utilidad para formatear y alinear texto, y genera los strings
 * para diferentes tipos de documentos (Ventas, Reportes X/Z).
 */

// --- Constantes de Configuración ---

const PAPER_WIDTH = {
  '80mm': 42,
  '56mm': 32,
};

// --- Comandos ESC/POS Básicos ---

export const CMD = {
  INIT: '\x1B\x40',          // Resetear impresora
  CUT: '\x1B\x69',             // Corte total de papel
  DRAWER_KICK: '\x1B\x70\x00\x19\x19', // Abrir gaveta de dinero (Pulso al pin 2)
  BOLD_ON: '\x1B\x45\x01',      // Activar modo negrita
  BOLD_OFF: '\x1B\x45\x00',     // Desactivar modo negrita
};

// --- Funciones Auxiliares de Formateo de Texto ---

/**
 * Crea una línea con texto alineado a la izquierda y a la derecha.
 * Rellena el centro con espacios para asegurar la alineación.
 * @param leftTxt Texto para la izquierda.
 * @param rightTxt Texto para la derecha.
 * @param width Ancho total en caracteres.
 * @returns {string} Línea formateada.
 */
function alignLeftRight(leftTxt: string, rightTxt: string, width: number): string {
  leftTxt = leftTxt || '';
  rightTxt = rightTxt || '';
  const spaceCount = width - leftTxt.length - rightTxt.length;

  if (spaceCount < 1) {
    // Si no hay espacio, acortar el texto izquierdo para que quepa el derecho
    const availableWidth = width - rightTxt.length - 1;
    return leftTxt.substring(0, availableWidth) + ' ' + rightTxt;
  }

  const spaces = ' '.repeat(spaceCount);
  return leftTxt + spaces + rightTxt;
}

/**
 * Centra un texto en una línea del ancho especificado.
 * @param txt Texto a centrar.
 * @param width Ancho total en caracteres.
 * @returns {string} Línea con texto centrado.
 */
function center(txt: string, width: number): string {
  txt = txt || '';
  if (txt.length >= width) {
    return txt.substring(0, width);
  }
  const leftPadding = Math.floor((width - txt.length) / 2);
  const rightPadding = width - txt.length - leftPadding;
  return ' '.repeat(leftPadding) + txt + ' '.repeat(rightPadding);
}

/**
 * Genera una línea separadora.
 * @param char Caracter para el separador (ej: '-', '=', '*').
 * @param width Ancho total en caracteres.
 * @returns {string} Línea separadora.
 */
function separator(char: string, width: number): string {
  return char.repeat(width);
}

// --- Generadores de Tickets ---

type PaperSize = '80mm' | '56mm';

/**
 * Construye el string para un ticket de venta.
 * @param saleData - El objeto de la venta.
 * @param paperSize - '80mm' o '56mm'.
 * @returns {string} El ticket completo como un solo string.
 */
export function generateSaleTicket(saleData: any, paperSize: PaperSize): string {
  const width = PAPER_WIDTH[paperSize];
  let ticket = [];

  // Encabezado
  ticket.push(center('EMPRESA XYZ, C.A.', width));
  ticket.push(center('AV. PRINCIPAL, EDIF. ABC', width));
  ticket.push(center('RIF: J-12345678-9', width));
  ticket.push(separator('-', width));

  // Datos del Ticket
  ticket.push(alignLeftRight('CONTROL:', saleData.id, width));
  ticket.push(alignLeftRight('FECHA:', saleData.fecha, width));
  ticket.push(alignLeftRight('CLIENTE:', saleData.cliente, width));
  ticket.push(separator('-', width));

  // Cabecera de Items
  ticket.push(alignLeftRight('CANT  DESCRIPCION', 'MONTO', width));
  ticket.push(separator('.', width));

  // Items
  for (const item of saleData.items) {
    const itemDesc = `${item.cantidad} x ${item.nombre}`;
    const itemTotal = item.total.toFixed(2);
    ticket.push(alignLeftRight(itemDesc, itemTotal, width));
  }
  ticket.push(separator('-', width));

  // Totales
  ticket.push(alignLeftRight('SUB-TOTAL:', saleData.subtotal.toFixed(2), width));
  ticket.push(alignLeftRight('IVA (16%):', saleData.iva.toFixed(2), width));
  ticket.push(CMD.BOLD_ON + alignLeftRight('TOTAL A PAGAR:', saleData.total.toFixed(2), width) + CMD.BOLD_OFF);
  ticket.push(alignLeftRight('Ref. USD:', saleData.totalUSD.toFixed(2), width));
  ticket.push(separator('-', width));

  // Mensaje final
  ticket.push(center('¡Gracias por su compra!', width));
  
  // Une todo y agrega comandos finales
  return CMD.INIT + ticket.join('\n') + '\n\n' + CMD.CUT + CMD.DRAWER_KICK;
}

/**
 * Construye el string para un Reporte X o Z.
 * @param reportData - Los datos del reporte.
 * @param type - 'X' o 'Z'.
 * @param paperSize - '80mm' o '56mm'.
 * @returns {string} El reporte completo como un solo string.
 */
export function generateReport(reportData: any, type: 'X' | 'Z', paperSize: PaperSize): string {
  const width = PAPER_WIDTH[paperSize];
  let report = [];

  const title = `REPORTE ${type}`;
  
  // Encabezado
  report.push(center(title, width));
  report.push(center('EMPRESA XYZ, C.A.', width));
  report.push(separator('=', width));
  report.push(alignLeftRight('FECHA:', reportData.fecha, width));
  if (type === 'Z') {
    report.push(alignLeftRight('REPORTE Z #:', reportData.numeroZ, width));
  }
  report.push(separator('-', width));

  // Cuerpo del reporte
  report.push(center('RESUMEN DE VENTAS', width));
  report.push(alignLeftRight('Venta Bruta:', reportData.ventaBruta.toFixed(2), width));
  report.push(alignLeftRight('Descuentos:', `-${reportData.descuentos.toFixed(2)}`, width));
  report.push(alignLeftRight('Devoluciones:', `-${reportData.devoluciones.toFixed(2)}`, width));
  report.push(CMD.BOLD_ON + alignLeftRight('Venta Neta:', reportData.ventaNeta.toFixed(2), width) + CMD.BOLD_OFF);
  report.push(separator('.', width));
  
  report.push(center('DESGLOSE FISCAL', width));
  report.push(alignLeftRight('Base Imponible:', reportData.baseImponible.toFixed(2), width));
  report.push(alignLeftRight('IVA (16%):', reportData.iva.toFixed(2), width));
  report.push(alignLeftRight('IGTF (3%):', reportData.igtf.toFixed(2), width));
  report.push(separator('-', width));

  report.push(center('METODOS DE PAGO', width));
  for (const metodo of reportData.metodosPago) {
      report.push(alignLeftRight(metodo.nombre, metodo.total.toFixed(2), width));
  }
  
  // Final
  report.push(separator('=', width));
  if (type === 'Z') {
      report.push(center('CIERRE DE CAJA REALIZADO', width));
  }
  
  return CMD.INIT + report.join('\n') + '\n\n' + CMD.CUT;
}

