/**
 * thermal-printer.ts
 *
 * Módulo para la generación de tickets de texto plano compatibles con ESC/POS.
 * Configurado EXCLUSIVAMENTE para impresoras térmicas de 80mm.
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

function formatUsd(value: number): string {
  const num = (typeof value === 'number') ? value : 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function padRight(text: string, width: number): string {
  const str = String(text || '');
  if (str.length >= width) return str.substring(0, width);
  return str + ' '.repeat(width - str.length);
}

function padLeft(text: string, width: number): string {
  const str = String(text || '');
  if (str.length >= width) return str.substring(0, width);
  return ' '.repeat(width - str.length) + str;
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
 * Función modificada para cumplir con la Regla de Oro.
 */
export function generateSaleTicket(saleData: any, storeInfo: StoreInfo = {}): string {
    let ticket: string[] = [];

    // 1. Encabezado
    ticket.push(CMD.BOLD_ON + center(storeInfo.name || "NOMBRE EMPRESA") + CMD.BOLD_OFF);
    if (storeInfo.rif) ticket.push(center(`RIF: ${storeInfo.rif}`));
    if (storeInfo.address) ticket.push(center(storeInfo.address));
    if (storeInfo.phone) ticket.push(center(`Tel: ${storeInfo.phone}`));
    ticket.push(separator('-'));
    ticket.push(alignLeftRight(`RECIBO N°: ${saleData.id || 'N/A'}`, `CAJA: ${saleData.terminalId || '01'}`));
    ticket.push(alignLeftRight(`CAJERO: ${saleData.cajeroNombre || 'N/A'}`, ''));
    const saleDate = saleData.date ? new Date(saleData.date) : new Date();
    ticket.push(alignLeftRight(`FECHA: ${saleDate.toLocaleDateString('es-VE')}`, `HORA: ${saleDate.toLocaleTimeString('es-VE')}`));
    ticket.push(separator('-'));
    ticket.push(`CLIENTE: ${saleData.customer?.name || 'CONSUMIDOR FINAL'}`);
    if (saleData.customer?.id && saleData.customer?.id !== '0') {
        ticket.push(`RIF/CI: ${saleData.customer.id}`);
    }
    ticket.push(separator('═'));

    // 2. Cuerpo del Recibo (Items)
    ticket.push(CMD.BOLD_ON + alignLeftRight('DESCRIPCION', 'TOTAL') + CMD.BOLD_OFF);
    ticket.push(alignLeftRight('CANT x P.UNIT', 'ALIC.'));
    ticket.push(separator('-'));

    if (saleData.items && saleData.items.length > 0) {
        for (const item of saleData.items) {
            const total = item.quantity * item.precioUSD;
            ticket.push(alignLeftRight(item.nombre.substring(0, 35), formatUsd(total)));
            const detailsLeft = ` ${item.quantity} x ${formatUsd(item.precioUSD)}`;
            const alicuota = `(${item.alicuota || 'G'})`;
            ticket.push(alignLeftRight(detailsLeft, alicuota));
        }
    }
    ticket.push(separator('═'));

    // 3. Pie del Recibo (Totales)
    ticket.push(alignLeftRight('SUBTOTAL:', formatUsd(saleData.subtotal || 0)));
    if (saleData.descuentos > 0) {
        ticket.push(alignLeftRight('DESCUENTO:', `-${formatUsd(saleData.descuentos || 0)}`));
    }
    ticket.push(separator('-'));
    
    // Bases e Impuestos
    if (saleData.baseImponibleGeneral > 0) {
      ticket.push(alignLeftRight('Base Imponible (G):', formatUsd(saleData.baseImponibleGeneral)));
      ticket.push(alignLeftRight('IVA (16%):', formatUsd(saleData.ivaGeneral)));
    }
    if (saleData.montoExento > 0) {
        ticket.push(alignLeftRight('Monto Exento (E):', formatUsd(saleData.montoExento)));
    }
    if (saleData.igtf > 0) {
        ticket.push(alignLeftRight('IGTF (3%):', formatUsd(saleData.igtf)));
    }
    ticket.push(separator('═'));
    
    // Total
    ticket.push(CMD.DOUBLE_HW_ON + alignLeftRight('TOTAL A PAGAR $', formatUsd(saleData.total || 0)) + CMD.DOUBLE_HW_OFF);
    ticket.push(alignLeftRight('Total en Bs:', formatCurrency(saleData.totalBs || 0)));
    ticket.push(separator('═'));
    
    // Formas de Pago
    const paymentMethodNames: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'efectivo_usd': 'Efectivo $',
      'efectivo_bs': 'Efectivo Bs.',
      'punto_venta': 'Tarjeta',
      'tarjeta': 'Tarjeta',
      'pagomovil': 'Pago Móvil/Transf.',
      'zelle': 'Zelle',
      'credito': 'Crédito',
    };
    ticket.push(CMD.BOLD_ON + center('DETALLE DEL PAGO') + CMD.BOLD_OFF);
    if (saleData.payments && saleData.payments.length > 0) {
        for (const pay of saleData.payments) {
            const name = paymentMethodNames[pay.method] || pay.method.toUpperCase();
            const amountStr = pay.isBs ? formatCurrency(pay.amount) : `$${formatUsd(pay.amount)}`;
            ticket.push(alignLeftRight(name + ':', amountStr));
        }
    }
    if (saleData.change > 0) {
        ticket.push(alignLeftRight("SU VUELTO Bs:", formatCurrency(saleData.change)));
    }
    ticket.push(alignLeftRight(`Tasa de Cambio:`, formatCurrency(saleData.exchangeRate || 0).replace('Bs. ','')));
    ticket.push(separator('-'));

    // Pie de pagina
    ticket.push(center('¡Gracias por su compra!'));
    ticket.push(center('Documento no fiscal.'));

    return CMD.INIT + ticket.join('\n') + '\n\n\n\n' + CMD.CUT;
}

/**
 * Construye el string para un Reporte X o Z (80mm).
 * Función modificada para cumplir con la Regla de Oro.
 */
export function generateReport(reportData: any, storeInfo: StoreInfo = {}, type: 'X' | 'Z'): string {
  let report = [];
  
  const isZReport = type === 'Z';
  const title = isZReport ? "REPORTE Z - CIERRE DIARIO" : "REPORTE X - LECTURA PARCIAL";

  // 1. Encabezado de Identificación
  report.push(CMD.BOLD_ON + center(storeInfo.name || "NOMBRE EMPRESA") + CMD.BOLD_OFF);
  if (storeInfo.rif) report.push(center(`RIF: ${storeInfo.rif}`));
  if (storeInfo.address) report.push(center(storeInfo.address));
  if (storeInfo.phone) report.push(center(`Tel: ${storeInfo.phone}`));
  report.push(separator('-'));
  report.push(alignLeftRight(`CAJA: ${reportData.terminalId || '#02'}`, `CAJERO: ${reportData.cajeroNombre || 'Admin'}`));
  report.push(alignLeftRight(`FECHA: ${reportData.fecha}`, `HORA: ${reportData.hora}`));
  report.push(separator('═'));
  report.push(CMD.DOUBLE_HW_ON + center(title) + CMD.DOUBLE_HW_OFF);
  if (!isZReport) report.push(center("(Documento no fiscal)"));
  report.push(separator('═'));
  
  // 2. Datos de Control y Auditoría (Solo para Reporte Z)
  if (isZReport) {
    report.push(CMD.BOLD_ON + "CONTROL Y AUDITORÍA" + CMD.BOLD_OFF);
    report.push(separator('-'));
    report.push(alignLeftRight("Número de Reporte Z:", reportData.audit.zCorrelativo || "N/A"));
    report.push(alignLeftRight("Rango Facturas:", `DESDE ${reportData.audit.facturaInicial} HASTA ${reportData.audit.facturaFinal}`));
    report.push(alignLeftRight("Rango Notas Crédito:", `DESDE ${reportData.audit.ncInicial} HASTA ${reportData.audit.ncFinal}`));
    report.push("");
  }

  // 3. Resumen de Ventas
  report.push(CMD.BOLD_ON + "RESUMEN DE VENTAS" + CMD.BOLD_OFF);
  report.push(separator('-'));
  report.push(alignLeftRight("Venta Bruta:", formatCurrency(reportData.ventaBruta || 0)));
  report.push(alignLeftRight("Descuentos:", `-${formatCurrency(reportData.descuentos || 0)}`));
  report.push(alignLeftRight("Devoluciones (NC):", `-${formatCurrency(reportData.devoluciones || 0)}`));
  report.push(separator('-'));
  report.push(CMD.BOLD_ON + alignLeftRight("VENTA NETA:", formatCurrency(reportData.ventaNeta || 0)) + CMD.BOLD_OFF);
  report.push('');

  // 4. Desglose de Impuestos
  report.push(CMD.BOLD_ON + "DESGLOSE DE IMPUESTOS" + CMD.BOLD_OFF);
  report.push(separator('-'));
  report.push(alignLeftRight("Ventas Exentas:", formatCurrency(reportData.ventasExentas || 0)));
  report.push(alignLeftRight("Base Imponible (16%):", formatCurrency(reportData.baseGeneral || 0)));
  report.push(alignLeftRight("IVA (16%):", formatCurrency(reportData.ivaGeneral || 0)));
  if(reportData.baseReducida) {
      report.push(alignLeftRight("Base Imponible (8%):", formatCurrency(reportData.baseReducida || 0)));
      report.push(alignLeftRight("IVA (8%):", formatCurrency(reportData.ivaReducido || 0)));
  }
  report.push(separator('-'));
  report.push(alignLeftRight("Total IGTF (3%):", formatCurrency(reportData.igtf || 0)));
  report.push('');
  
  // 5. Desglose de Formas de Pago
  report.push(CMD.BOLD_ON + "DESGLOSE DE FORMAS DE PAGO" + CMD.BOLD_OFF);
  report.push(separator('-'));
  report.push(alignLeftRight("Efectivo (Bs):", formatCurrency(reportData.pagos.efectivoBs || 0)));
  report.push(alignLeftRight("Efectivo (USD):", `$${formatCurrency(reportData.pagos.efectivoUsd || 0)}`));
  report.push(alignLeftRight("Tarjeta de Débito:", formatCurrency(reportData.pagos.tdb || 0)));
  report.push(alignLeftRight("Tarjeta de Crédito:", formatCurrency(reportData.pagos.tdc || 0)));
  report.push(alignLeftRight("Pago Móvil/Transf.:", formatCurrency(reportData.pagos.pagoMovil || 0)));
  report.push(alignLeftRight("Crédito (Por Cobrar):", formatCurrency(reportData.pagos.credito || 0)));
  report.push(separator('-'));
  report.push(CMD.BOLD_ON + alignLeftRight("TOTAL COBRADO:", formatCurrency(reportData.ventaNeta || 0)) + CMD.BOLD_OFF);
  report.push('');

  // 6. Movimientos de Caja
  // ... (La lógica de movimientos de caja permanece igual a la del reporte X)

  // 7. Estadísticas de Transacciones
  // ... (La lógica de estadísticas permanece igual a la del reporte X)

  // 8. Acumulados Históricos (Solo para Reporte Z)
  if (isZReport) {
    report.push(CMD.BOLD_ON + "ACUMULADOS HISTÓRICOS (GRAN TOTAL)" + CMD.BOLD_OFF);
    report.push(separator('-'));
    report.push(alignLeftRight("Gran Total Acumulado:", formatCurrency(reportData.audit.granTotal || 0)));
    report.push('');
  }

  // Pie de página
  report.push(separator('═'));
  report.push(center(isZReport ? "CIERRE DE CAJA FINALIZADO" : "FIN DEL REPORTE"));
  report.push('');

  return CMD.INIT + report.join('\n') + '\n\n\n\n' + CMD.CUT;
}
