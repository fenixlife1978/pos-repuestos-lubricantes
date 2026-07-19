'use client';

import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X, Zap, Share2, Monitor } from 'lucide-react';
import { Store, Utils } from '@/lib/db-store';
import { formatBs, formatUsd } from '@/lib/currency-formatter';
import { auth } from '@/lib/firebase';

declare global {
  interface Window {
    electronAPI?: {
      printTicket: (data: any) => Promise<void>;
    };
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  saleData?: any;
  reportData?: any;
  type?: 'SALE' | 'REPORT_X' | 'REPORT_Z';
  storeInfo?: any;
}

export function ReceiptModal({ isOpen, onClose, saleData, reportData, type = 'SALE', storeInfo }: Props) {
  const state = Store.get();
  const printRef = useRef<HTMLDivElement>(null);

  const isReport = type === 'REPORT_X' || type === 'REPORT_Z';
  const data = isReport ? reportData : saleData;
  
  if (!data) {
    return null;
  }

  const transactionDate = React.useMemo(() => {
    try {
      const rawDate = data.fecha || data.date || data.createdAt || Utils.ahora();
      const dateObj = new Date(rawDate);
      
      if (isNaN(dateObj.getTime())) {
        return new Date().toLocaleString('es-VE', { 
          timeZone: 'America/Caracas',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true 
        });
      }
      
      return dateObj.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
    }
  }, [data.fecha, data.date, data.createdAt]);

  const customerName = React.useMemo(() => {
    if (data.cliente) return data.cliente.toUpperCase();
    if (data.customer?.name) return data.customer.name.toUpperCase();
    if (data.customerName) return data.customerName.toUpperCase();
    return 'CONSUMIDOR FINAL';
  }, [data.cliente, data.customer, data.customerName]);

  const getReportTitle = () => {
    if (type === 'REPORT_Z') return '*** REPORTE Z ***';
    if (type === 'REPORT_X') return '*** REPORTE X - ARQUEO ***';
    return data.type || 'RECIBO DE VENTA';
  };

  const getReportSubtitle = () => {
    if (type === 'REPORT_Z') return '(CIERRE DIARIO)';
    if (type === 'REPORT_X') return '(LECTURA PARCIAL)';
    return '';
  };

  const getItems = () => {
    if (data.items) return data.items;
    if (data.products) return data.products;
    if (data.detalles) return data.detalles;
    return [];
  };

  const separatorLine = (char: string = '─') => {
    return char.repeat(48);
  };

  const alignLeftRight = (left: string, right: string) => {
    const totalWidth = 48;
    const leftStr = String(left || '');
    const rightStr = String(right || '');
    const dots = totalWidth - leftStr.length - rightStr.length;
    if (dots < 1) return leftStr.substring(0, totalWidth - rightStr.length - 1) + ' ' + rightStr;
    return leftStr + ' '.repeat(dots) + rightStr;
  };

  const centerText = (text: string) => {
    const totalWidth = 48;
    const textStr = String(text || '');
    if (textStr.length >= totalWidth) return textStr.substring(0, totalWidth);
    const leftPadding = Math.floor((totalWidth - textStr.length) / 2);
    const rightPadding = totalWidth - textStr.length - leftPadding;
    return ' '.repeat(leftPadding) + textStr + ' '.repeat(rightPadding);
  };

  const receiptNumber = React.useMemo(() => {
    if (isReport) {
      if (type === 'REPORT_Z') return `Z-${String(data.numeroZ || 0).padStart(6, '0')}`;
      return String(data.numeroX || data.numeroZ || 0).padStart(6, '0');
    }
    if (data.id) return String(data.id);
    if (data.numero) return String(data.numero);
    if (data.controlNumber) return String(data.controlNumber);
    return 'N/A';
  }, [data.id, data.numero, data.controlNumber, data.numeroZ, data.numeroX, isReport, type]);

  const terminalId = React.useMemo(() => {
    if (data.terminalName) return String(data.terminalName);
    if (data.caja) return String(data.caja);
    if (data.terminal) return String(data.terminal);
    if (data.terminalId) return String(data.terminalId);
    return 'TRM-MRQK';
  }, [data.terminalName, data.caja, data.terminal, data.terminalId]);

  const cajeroNombre = React.useMemo(() => {
    if (data.cajeroNombre) return data.cajeroNombre;
    if (data.cajero) return data.cajero;
    if (data.cashier) return data.cashier;
    const currentUser = auth.currentUser;
    if (currentUser) {
      return currentUser.displayName || 'Administrador';
    }
    return 'Administrador';
  }, [data.cajeroNombre, data.cajero, data.cashier]);

  const totalBs = React.useMemo(() => {
    if (data.totalBS) return data.totalBS;
    if (data.totalBs) return data.totalBs;
    if (data.total) return data.total;
    if (data.ventaNetaUSD) return data.ventaNetaUSD * state.tasa;
    return 0;
  }, [data.totalBS, data.totalBs, data.total, data.ventaNetaUSD, state.tasa]);

  const totalUsd = React.useMemo(() => {
    if (data.totalUSD) return data.totalUSD;
    if (data.totalUsd) return data.totalUsd;
    if (data.total) return data.total / (state.tasa || 1);
    if (data.ventaNetaUSD) return data.ventaNetaUSD;
    return 0;
  }, [data.totalUSD, data.totalUsd, data.total, data.ventaNetaUSD, state.tasa]);

  const montoExento = React.useMemo(() => {
    if (data.exentoUSD) return data.exentoUSD;
    if (data.exento) return data.exento;
    return 0;
  }, [data.exentoUSD, data.exento]);

  const baseImponible = React.useMemo(() => {
    if (data.baseImponibleUSD) return data.baseImponibleUSD;
    if (data.baseImponible) return data.baseImponible;
    if (data.baseGeneral) return data.baseGeneral;
    return 0;
  }, [data.baseImponibleUSD, data.baseImponible, data.baseGeneral]);

  const iva = React.useMemo(() => {
    if (data.ivaUSD) return data.ivaUSD;
    if (data.iva) return data.iva;
    if (data.ivaGeneral) return data.ivaGeneral;
    return 0;
  }, [data.ivaUSD, data.iva, data.ivaGeneral]);

  const igtf = React.useMemo(() => {
    if (data.igtfUSD) return data.igtfUSD;
    if (data.igtf) return data.igtf;
    return 0;
  }, [data.igtfUSD, data.igtf]);

  const getPaymentMethods = () => {
    if (data.payments && Array.isArray(data.payments) && data.payments.length > 0) {
      return data.payments;
    }
    if (data.paymentMethods && typeof data.paymentMethods === 'object') {
      return data.paymentMethods;
    }
    if (data.formasPago && typeof data.formasPago === 'object') {
      return data.formasPago;
    }
    if (data.metodosPago && typeof data.metodosPago === 'object') {
      return data.metodosPago;
    }
    if (data.metodoPago) {
      return { [data.metodoPago]: data.totalUSD || totalUsd };
    }
    return {};
  };

  const formatPaymentMethod = (method: string) => {
    const methods: {[key: string]: string} = {
      'efectivo': 'EFECTIVO',
      'efectivo_bs': 'EFECTIVO (Bs.)',
      'efectivo_usd': 'EFECTIVO (USD)',
      'pago_movil': 'PAGO MÓVIL',
      'pagomovil': 'PAGO MÓVIL',
      'punto_venta': 'PUNTO DE VENTA',
      'punto_de_venta': 'PUNTO DE VENTA',
      'tarjeta': 'TARJETA',
      'tarjeta_credito': 'TARJETA CRÉDITO',
      'tarjeta_debito': 'TARJETA DÉBITO',
      'credito': 'CRÉDITO',
      'zelle': 'ZELLE',
      'mixto': 'MIXTO',
    };
    return methods[method.toLowerCase()] || method.toUpperCase();
  };

  const isUsdPayment = (method: string) => {
    const usdMethods = ['efectivo_usd', 'efectivo usd', 'usd', 'dolar', 'zelle'];
    return usdMethods.some(m => method.toLowerCase().includes(m));
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Impresion_PosVEN_Pro</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 72mm;
              margin: 0 auto;
              padding: 4mm;
              font-size: 11px;
              color: #000;
              background: #fff;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .dashed-line { border-top: 1px dashed #000; margin: 5px 0; }
            .solid-line { border-top: 1px solid #000; margin: 5px 0; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
            .subtitle { font-size: 12px; margin-bottom: 2px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 0; }
            .flex-row { display: flex; justify-content: space-between; }
            .total-box { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin: 8px 0; font-size: 16px; font-weight: bold; }
            .report-content { font-size: 10px; }
            .report-content .row { display: flex; justify-content: space-between; padding: 1px 0; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
              setTimeout(function() { window.close(); }, 1500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(onClose, 1000);
  };

  const handleNativePrint = async () => {
    if (!window.electronAPI) {
      handlePrint();
      return;
    }

    try {
      const printData = buildNativePrintData();
      await window.electronAPI.printTicket(printData);
      setTimeout(onClose, 500);
    } catch (e) {
      handlePrint();
    }
  };

  const buildNativePrintData = () => {
    const printData: any[] = [];
    const items = getItems();
    const payments = getPaymentMethods();

    printData.push({ type: 'text', value: state.empresa.nombre.toUpperCase(), style: { fontWeight: "800", textAlign: 'center', fontSize: "20px" } });
    if (state.empresa.rif) printData.push({ type: 'text', value: `RIF: ${state.empresa.rif}`, style: { textAlign: 'center', fontSize: "11px" } });
    if (state.empresa.direccion) printData.push({ type: 'text', value: state.empresa.direccion.toUpperCase(), style: { textAlign: 'center', fontSize: "11px" } });
    if (state.empresa.telefono) printData.push({ type: 'text', value: `Telf: ${state.empresa.telefono}`, style: { textAlign: 'center', fontSize: "11px" } });
    printData.push({ type: 'text', value: separatorLine('='), style: { textAlign: 'center' } });

    printData.push({ type: 'text', value: getReportTitle(), style: { textAlign: 'center', fontWeight: "800", fontSize: "16px" } });
    if (isReport) {
      printData.push({ type: 'text', value: getReportSubtitle(), style: { textAlign: 'center', fontSize: "12px" } });
    }
    printData.push({ type: 'text', value: separatorLine('='), style: { textAlign: 'center' } });

    if (isReport) {
      printData.push({ type: 'text', value: alignLeftRight(`FECHA: ${transactionDate.split(',')[0] || '19/07/2026'}`, `HORA: ${transactionDate.split(',')[1]?.trim() || '08:52 AM'}`), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight(`Nº REPORTE ${type === 'REPORT_Z' ? 'Z' : 'X'}: ${receiptNumber}`, `Nº CAJA: ${terminalId}`), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight(`CAJERO: ${cajeroNombre}`, ''), style: { fontSize: "11px" } });
    } else {
      printData.push({ type: 'text', value: alignLeftRight(`RECIBO N°: ${receiptNumber}`, `CAJA: ${terminalId}`), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight(`CAJERO: ${cajeroNombre}`, ''), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight(`FECHA: ${transactionDate.split(',')[0] || '19/07/2026'}`, `HORA: ${transactionDate.split(',')[1]?.trim() || '10:30 AM'}`), style: { fontSize: "11px" } });
    }
    printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

    if (isReport) {
      if (type === 'REPORT_Z') {
        printData.push({ type: 'text', value: 'CONTROL DE DOCUMENTOS', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
        printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
        printData.push({ type: 'text', value: 'FACTURAS EMITIDAS:', style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: alignLeftRight(`DESDE: ${data.desdeFactura || 'N/A'}`, `HASTA: ${data.hastaFactura || 'N/A'}`), style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: alignLeftRight(`TOTAL FACTURAS:`, String(data.stats?.facturas || 0).padStart(6, ' ')), style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: '', style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: 'NOTAS DE CRÉDITO EMITIDAS:', style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: alignLeftRight(`DESDE: ${data.desdeNC || 'N/A'}`, `HASTA: ${data.hastaNC || 'N/A'}`), style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: alignLeftRight(`TOTAL NOTAS CRÉDITO:`, String(data.stats?.devoluciones || 0).padStart(6, ' ')), style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: '', style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: alignLeftRight(`CANT. DOCUMENTOS ANULADOS:`, String(data.stats?.anulaciones || 0).padStart(6, ' ')), style: { fontSize: "10px" } });
        printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      }

      printData.push({ type: 'text', value: 'RESUMEN DE OPERACIONES', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      const ventaBruta = data.ventaBrutaUSD || data.brUSD || 0;
      const descuentos = data.descuentoUSD || data.descUSD || 0;
      const devoluciones = data.devolucionesUSD || data.devUSD || 0;
      const ventaNeta = data.ventaNetaUSD || data.netUSD || 0;
      
      printData.push({ type: 'text', value: alignLeftRight('VENTAS BRUTAS:', formatBs(ventaBruta * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('DESCUENTOS APLICADOS:', formatBs(descuentos * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('DEVOLUCIONES (N. CRÉDITO):', formatBs(devoluciones * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      printData.push({ type: 'text', value: alignLeftRight('VENTAS NETAS:', formatBs(ventaNeta * state.tasa)), style: { fontWeight: "700", fontSize: "12px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

      printData.push({ type: 'text', value: 'DESGLOSE DE IMPUESTOS', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      const exento = data.exentoUSD || 0;
      const baseImp = data.baseImponibleUSD || 0;
      const ivaVal = data.ivaUSD || 0;
      const igtfVal = data.igtfUSD || 0;
      
      printData.push({ type: 'text', value: alignLeftRight('VENTAS EXENTAS (E):', formatBs(exento * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: '', style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('BASE IMPONIBLE (G 16%):', formatBs(baseImp * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('IVA RECAUDADO (16%):', formatBs(ivaVal * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: '', style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('RECAUDACIÓN IGTF (3%):', formatBs(igtfVal * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

      printData.push({ type: 'text', value: 'FORMAS DE PAGO', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      
      const paymentMethods = getPaymentMethods();
      if (Object.keys(paymentMethods).length > 0) {
        if (Array.isArray(paymentMethods)) {
          paymentMethods.forEach((p: any) => {
            const method = p.metodo || p.method || 'efectivo';
            const amount = p.montoUSD || p.amountUSD || p.monto || p.amount || 0;
            const isUsd = isUsdPayment(method);
            printData.push({ 
              type: 'text', 
              value: alignLeftRight(formatPaymentMethod(method) + ':', isUsd ? `$ ${formatUsd(amount)}` : formatBs(amount * state.tasa)),
              style: { fontSize: "10px" }
            });
          });
        } else {
          Object.entries(paymentMethods).forEach(([method, amount]) => {
            const amountNum = typeof amount === 'number' ? amount : 0;
            const isUsd = isUsdPayment(method);
            printData.push({ 
              type: 'text', 
              value: alignLeftRight(formatPaymentMethod(method) + ':', isUsd ? `$ ${formatUsd(amountNum)}` : formatBs(amountNum * state.tasa)),
              style: { fontSize: "10px" }
            });
          });
        }
      }
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

      printData.push({ type: 'text', value: 'MOVIMIENTO DE CAJA', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      const fondoApertura = data.fondoAperturaUSD || 0;
      const entradas = data.entradasCajaUSD || data.manualEntradas || 0;
      const salidas = data.salidasCajaUSD || data.manualSalidas || 0;
      const efectivoCaja = data.efectivoRealCaja || data.efectivoEstimadoCaja || ventaNeta;
      
      let efectivoUsdPaymentAmount = 0;
      const paymentMethodsForCalc = getPaymentMethods();
      if (paymentMethodsForCalc && Object.keys(paymentMethodsForCalc).length > 0) {
        if (Array.isArray(paymentMethodsForCalc)) {
            paymentMethodsForCalc.forEach((p: any) => {
                const method = p.metodo || p.method || 'efectivo';
                if (method === 'efectivo_usd') {
                    efectivoUsdPaymentAmount += p.montoUSD || p.amountUSD || p.monto || p.amount || 0;
                }
            });
        } else { // Is object
            Object.entries(paymentMethodsForCalc).forEach(([method, amount]) => {
                if (method === 'efectivo_usd') {
                    efectivoUsdPaymentAmount += typeof amount === 'number' ? amount : 0;
                }
            });
        }
      } else if (data.metodoPago === 'efectivo_usd') {
        efectivoUsdPaymentAmount = data.totalUSD || totalUsd;
      }
      
      const efectivoEstimadoEnCajaUSD = fondoApertura + efectivoUsdPaymentAmount;

      printData.push({ type: 'text', value: alignLeftRight('FONDO DE APERTURA Bs.:', formatBs(fondoApertura * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('FONDO DE APERTURA USD:', `$ ${formatUsd(fondoApertura)}`), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('ENTRADAS DE EFECTIVO:', formatBs(entradas * state.tasa)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('SALIDAS DE EFECTIVO:', formatBs(salidas * state.tasa)), style: { fontSize: "11px" } });
      const labelEfectivo = type === 'REPORT_Z' ? 'EFECTIVO REAL EN CAJA:' : 'EFECTIVO ESTIMADO EN CAJA:';
      printData.push({ type: 'text', value: alignLeftRight(labelEfectivo, formatBs(efectivoCaja * state.tasa)), style: { fontWeight: "700", fontSize: "12px" } });
      printData.push({ type: 'text', value: alignLeftRight('EFECTIVO ESTIMADO EN CAJA USD:', `$ ${formatUsd(efectivoEstimadoEnCajaUSD)}`), style: { fontWeight: "700", fontSize: "12px" } });

      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

      if (type === 'REPORT_X') {
        printData.push({ type: 'text', value: 'ESTADÍSTICAS DE VENTA', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
        printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
        printData.push({ type: 'text', value: alignLeftRight('CANT. FACTURAS EMITIDAS:', String(data.stats?.facturas || 0).padStart(6, ' ')), style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: alignLeftRight('CANT. TRANSACCIONES ANULADAS:', String(data.stats?.anulaciones || 0).padStart(6, ' ')), style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: alignLeftRight('TICKET PROMEDIO:', formatBs((data.stats?.ticketPromedio || 0) * state.tasa)), style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      }

      if (type === 'REPORT_Z') {
        printData.push({ type: 'text', value: 'TOTALES HISTÓRICOS', style: { fontWeight: "700", textAlign: 'center', fontSize: "12px" } });
        printData.push({ type: 'text', value: '(ACUMULADO NO REINICIABLE)', style: { textAlign: 'center', fontSize: "10px" } });
        printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
        printData.push({ type: 'text', value: alignLeftRight('GRAN TOTAL VENTAS:', formatBs((data.acumuladoHistoricoUSD || 0) * state.tasa)), style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: alignLeftRight('GRAN TOTAL IVA:', formatBs((data.acumuladoIvaUSD || 0) * state.tasa)), style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: separatorLine('='), style: { textAlign: 'center' } });
        printData.push({ type: 'text', value: 'CIERRE DE JORNADA EXITOSO', style: { fontWeight: "800", textAlign: 'center', fontSize: "12px" } });
      } else {
        printData.push({ type: 'text', value: separatorLine('='), style: { textAlign: 'center' } });
        printData.push({ type: 'text', value: 'DOCUMENTO NO VÁLIDO COMO', style: { textAlign: 'center', fontSize: "11px" } });
        printData.push({ type: 'text', value: 'CIERRE FISCAL', style: { textAlign: 'center', fontSize: "11px" } });
        printData.push({ type: 'text', value: separatorLine('='), style: { textAlign: 'center' } });
      }
    }

    if (!isReport) {
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
      printData.push({ type: 'text', value: '¡Gracias por su preferencia!', style: { textAlign: 'center', fontSize: "11px", fontWeight: "700" } });
    }
    printData.push({ type: 'text', value: 'Desarrollado por EFAS Freelancer', style: { textAlign: 'center', fontSize: "8px" } });
    printData.push({ type: 'text', value: '\n\n\n', style: { textAlign: 'center' } });

    return printData;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-transparent border-none overflow-hidden shadow-none">
        <DialogHeader className="sr-only"><DialogTitle>Impresión Térmica 80mm</DialogTitle></DialogHeader>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
          <div className="bg-black p-4 flex justify-between items-center">
            <h3 className="text-white font-black text-xs flex items-center gap-2 tracking-widest uppercase">
              <Printer size={16} className="text-brand-gold" /> VISTA PREVIA FISCAL
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 bg-gray-100 flex justify-center max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div 
              ref={printRef}
              className="thermal-80mm bg-white p-6 shadow-sm text-black font-mono select-none"
              style={{ width: '72mm', boxSizing: 'border-box', color: '#000', fontSize: '11px', lineHeight: '1.3' }}
            >
              <div className="text-center pb-3">
                <h1 className="text-[20px] font-bold uppercase mb-2 leading-tight" style={{ fontFamily: 'Courier New, Courier, monospace' }}>
                  {state.empresa.nombre || 'EFAS SOLUCIONES DIGITALES C.A.'}
                </h1>
                {state.empresa.rif && (
                  <p className="text-[11px] font-bold uppercase">RIF: {state.empresa.rif}</p>
                )}
                {state.empresa.direccion && (
                  <p className="text-[10px] leading-snug uppercase">{state.empresa.direccion}</p>
                )}
                {state.empresa.telefono && (
                  <p className="text-[10px]">Telf: {state.empresa.telefono}</p>
                )}
              </div>

              <div className="text-center mb-4">
                <div className="text-[16px] font-bold uppercase">{getReportTitle()}</div>
                {isReport && <div className="text-[12px] font-bold">{getReportSubtitle()}</div>}
              </div>

              <div className="border-t border-dashed border-black pt-3 mb-3"></div>

              <div className="text-[10px] font-bold mb-4 space-y-1">
                {isReport ? (
                  <>
                    <div className="flex justify-between">
                      <span>FECHA: {transactionDate.split(',')[0] || '19/07/2026'}</span>
                      <span className="text-right">HORA: {transactionDate.split(',')[1]?.trim() || '08:52 AM'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nº REPORTE {type === 'REPORT_Z' ? 'Z' : 'X'}: {receiptNumber}</span>
                      <span className="text-right">Nº CAJA: {terminalId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CAJERO: {cajeroNombre}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>RECIBO DE VENTA: {receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FECHA: {transactionDate.split(',')[0] || '19/07/2026'}</span>
                      <span className="text-right">HORA: {transactionDate.split(',')[1]?.trim() || '10:30 AM'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CAJA: {terminalId}</span>
                      <span className="text-right">CAJERO: {cajeroNombre}</span>
                    </div>
                  </>
                )}
              </div>

              {isReport && (
                <div className="report-content">
                  {type === 'REPORT_Z' && (
                    <>
                      <div className="border-t border-dashed border-black pt-3 mb-3">
                        <div className="text-center font-bold text-[11px] mb-2">CONTROL DE DOCUMENTOS</div>
                        <div className="border-t border-dashed border-black mb-2"></div>
                        <div className="space-y-1 text-[10px]">
                          <div className="font-bold">FACTURAS EMITIDAS:</div>
                          <div className="flex justify-between">
                            <span>DESDE: {data.desdeFactura || 'N/A'}</span>
                            <span className="text-right">HASTA: {data.hastaFactura || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TOTAL FACTURAS:</span>
                            <span className="text-right">{String(data.stats?.facturas || 0).padStart(6, ' ')}</span>
                          </div>
                          <div className="mt-2 font-bold">NOTAS DE CRÉDITO EMITIDAS:</div>
                          <div className="flex justify-between">
                            <span>DESDE: {data.desdeNC || 'N/A'}</span>
                            <span className="text-right">HASTA: {data.hastaNC || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TOTAL NOTAS CRÉDITO:</span>
                            <span className="text-right">{String(data.stats?.devoluciones || 0).padStart(6, ' ')}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>CANT. DOCUMENTOS ANULADOS:</span>
                            <span className="text-right">{String(data.stats?.anulaciones || 0).padStart(6, ' ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-dashed border-black mb-3"></div>
                    </>
                  )}

                  <div className="text-center font-bold text-[11px] mb-2">RESUMEN DE OPERACIONES</div>
                  <div className="border-t border-dashed border-black mb-2"></div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>VENTAS BRUTAS:</span>
                      <span className="text-right">{formatBs(((data.ventaBrutaUSD || data.brUSD || 0) * state.tasa))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DESCUENTOS APLICADOS:</span>
                      <span className="text-right">{formatBs(((data.descuentoUSD || data.descUSD || 0) * state.tasa))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DEVOLUCIONES (N. CRÉDITO):</span>
                      <span className="text-right">{formatBs(((data.devolucionesUSD || data.devUSD || 0) * state.tasa))}</span>
                    </div>
                    <div className="border-t border-black pt-1 mt-1 flex justify-between font-bold">
                      <span>VENTAS NETAS:</span>
                      <span className="text-right">{formatBs(((data.ventaNetaUSD || data.netUSD || 0) * state.tasa))}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-black mt-3 mb-3"></div>

                  <div className="text-center font-bold text-[11px] mb-2">DESGLOSE DE IMPUESTOS</div>
                  <div className="border-t border-dashed border-black mb-2"></div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>VENTAS EXENTAS (E):</span>
                      <span className="text-right">{formatBs(((data.exentoUSD || 0) * state.tasa))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BASE IMPONIBLE (G 16%):</span>
                      <span className="text-right">{formatBs(((data.baseImponibleUSD || 0) * state.tasa))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA RECAUDADO (16%):</span>
                      <span className="text-right">{formatBs(((data.ivaUSD || 0) * state.tasa))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RECAUDACIÓN IGTF (3%):</span>
                      <span className="text-right">{formatBs(((data.igtfUSD || 0) * state.tasa))}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-black mt-3 mb-3"></div>

                  <div className="text-center font-bold text-[11px] mb-2">FORMAS DE PAGO</div>
                  <div className="border-t border-dashed border-black mb-2"></div>
                  <div className="space-y-1 text-[10px]">
                    {(() => {
                      const paymentMethods = getPaymentMethods();
                      if (Object.keys(paymentMethods).length > 0) {
                        if (Array.isArray(paymentMethods)) {
                          return paymentMethods.map((p: any, idx: number) => {
                            const method = p.metodo || p.method || 'efectivo';
                            const amount = p.montoUSD || p.amountUSD || p.monto || p.amount || 0;
                            const isUsd = isUsdPayment(method);
                            return (
                              <div key={idx} className="flex justify-between">
                                <span>{formatPaymentMethod(method)}:</span>
                                <span className="text-right">{isUsd ? `$ ${formatUsd(amount)}` : formatBs(amount * state.tasa)}</span>
                              </div>
                            );
                          });
                        } else {
                          return Object.entries(paymentMethods).map(([method, amount], idx) => {
                            const amountNum = typeof amount === 'number' ? amount : 0;
                            const isUsd = isUsdPayment(method);
                            return (
                              <div key={idx} className="flex justify-between">
                                <span>{formatPaymentMethod(method)}:</span>
                                <span className="text-right">{isUsd ? `$ ${formatUsd(amountNum)}` : formatBs(amountNum * state.tasa)}</span>
                              </div>
                            );
                          });
                        }
                      }
                      return null;
                    })()}
                  </div>
                  <div className="border-t border-dashed border-black mt-3 mb-3"></div>

                  {/* MOVIMIENTO DE CAJA */}
                  <div className="text-center font-bold text-[11px] mb-2">MOVIMIENTO DE CAJA</div>
                  <div className="border-t border-dashed border-black mb-2"></div>
                  <div className="space-y-1 text-[10px]">
                    {(() => {
                      const fondoAperturaUSD = data.fondoAperturaUSD || 0;
                      
                      let efectivoUsdPaymentAmount = 0;
                      const paymentData = getPaymentMethods();
                      if (paymentData && Object.keys(paymentData).length > 0) {
                          if (Array.isArray(paymentData)) {
                              paymentData.forEach((p: any) => {
                                  const method = p.metodo || p.method || 'efectivo';
                                  if (method === 'efectivo_usd') {
                                      efectivoUsdPaymentAmount += p.montoUSD || p.amountUSD || p.monto || p.amount || 0;
                                  }
                              });
                          } else { // Is object
                              Object.entries(paymentData).forEach(([method, amount]) => {
                                  if (method === 'efectivo_usd') {
                                      efectivoUsdPaymentAmount += typeof amount === 'number' ? amount : 0;
                                  }
                              });
                          }
                      } else if (data.metodoPago === 'efectivo_usd') {
                          efectivoUsdPaymentAmount = data.totalUSD || totalUsd;
                      }

                      const efectivoEstimadoEnCajaUSD = fondoAperturaUSD + efectivoUsdPaymentAmount;
                      const efectivoCajaBs = (data.efectivoRealCaja || data.efectivoEstimadoCaja || data.ventaNetaUSD || data.netUSD || 0) * state.tasa;

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>FONDO DE APERTURA Bs.:</span>
                            <span className="text-right">{formatBs(fondoAperturaUSD * state.tasa)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>FONDO DE APERTURA USD:</span>
                              <span className="text-right">${formatUsd(fondoAperturaUSD)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ENTRADAS DE EFECTIVO:</span>
                            <span className="text-right">{formatBs(((data.entradasCajaUSD || data.manualEntradas || 0) * state.tasa))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SALIDAS DE EFECTIVO:</span>
                            <span className="text-right">{formatBs(((data.salidasCajaUSD || data.manualSalidas || 0) * state.tasa))}</span>
                          </div>
                          <div className="border-t border-black pt-1 mt-1 flex justify-between font-bold">
                            <span>{type === 'REPORT_Z' ? 'EFECTIVO REAL EN CAJA:' : 'EFECTIVO ESTIMADO EN CAJA:'}</span>
                            <span className="text-right">{formatBs(efectivoCajaBs)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                              <span>EFECTIVO ESTIMADO EN CAJA USD:</span>
                              <span className="text-right">${formatUsd(efectivoEstimadoEnCajaUSD)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="border-t border-dashed border-black mt-3 mb-3"></div>

                  {type === 'REPORT_X' && (
                    <>
                      <div className="text-center font-bold text-[11px] mb-2">ESTADÍSTICAS DE VENTA</div>
                      <div className="border-t border-dashed border-black mb-2"></div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span>CANT. FACTURAS EMITIDAS:</span>
                          <span className="text-right">{String(data.stats?.facturas || 0).padStart(6, ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CANT. TRANSACCIONES ANULADAS:</span>
                          <span className="text-right">{String(data.stats?.anulaciones || 0).padStart(6, ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TICKET PROMEDIO:</span>
                          <span className="text-right">{formatBs((data.stats?.ticketPromedio || 0) * state.tasa)}</span>
                        </div>
                      </div>
                      <div className="border-t border-dashed border-black mt-3 mb-3"></div>
                    </>
                  )}

                  {type === 'REPORT_Z' && (
                    <>
                      <div className="text-center font-bold text-[11px] mb-2">TOTALES HISTÓRICOS</div>
                      <div className="text-center text-[9px]">(ACUMULADO NO REINICIABLE)</div>
                      <div className="border-t border-dashed border-black mb-2"></div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span>GRAN TOTAL VENTAS:</span>
                          <span className="text-right">{formatBs(((data.acumuladoHistoricoUSD || 0) * state.tasa))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GRAN TOTAL IVA:</span>
                          <span className="text-right">{formatBs(((data.acumuladoIvaUSD || 0) * state.tasa))}</span>
                        </div>
                      </div>
                      <div className="border-t border-black mt-3 mb-3"></div>
                      <div className="text-center font-bold text-[11px]">CIERRE DE JORNADA EXITOSO</div>
                      <div className="border-t border-black mt-3"></div>
                    </>
                  )}

                  {type === 'REPORT_X' && (
                    <>
                      <div className="border-t border-black mt-3 mb-3"></div>
                      <div className="text-center text-[10px]">DOCUMENTO NO VÁLIDO COMO</div>
                      <div className="text-center text-[10px]">CIERRE FISCAL</div>
                      <div className="border-t border-black mt-3"></div>
                    </>
                  )}
                </div>
              )}

              {!isReport && (
                <>
                  <div className="mb-3">
                    <div className="text-[10px] font-bold mb-2">
                      <div className="flex justify-between">
                        <span className="w-8">CANT</span>
                        <span className="flex-1 px-2">DESCRIPCIÓN</span>
                        <span className="w-12 text-right">P.UNIT</span>
                        <span className="w-12 text-right">TOTAL</span>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-black mb-2"></div>

                    {getItems().map((item: any, idx: number) => {
                      const cantidad = item.cantidad || item.qty || 1;
                      const nombre = (item.nombre || item.name || 'Producto').toUpperCase();
                      const precioUnit = item.precioUnitUSD || item.precioUSD || item.price || 0;
                      const subtotal = item.subtotalUSD || (precioUnit * cantidad);
                      const alicuota = item.alicuota || item.ivaType || 'G';
                      
                      return (
                        <div key={idx} className="text-[9px] mb-1">
                          <div className="flex justify-between font-mono">
                            <span className="w-8">{String(cantidad).padStart(2)}</span>
                            <span className="flex-1 px-2">{nombre.substring(0, 30)}</span>
                            <span className="w-12 text-right">${formatUsd(precioUnit)}</span>
                            <span className="w-12 text-right font-bold">${formatUsd(subtotal)}</span>
                          </div>
                          <div className="text-right text-[8px] text-gray-600">({alicuota})</div>
                        </div>
                      );
                    })}

                    <div className="border-t border-black pt-2 mt-2">
                      <div className="flex justify-between font-bold text-[11px]">
                        <span>SUBTOTAL:</span>
                        <span className="text-right">${formatUsd(totalUsd)}</span>
                      </div>
                      {montoExento > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span>EXENTO:</span>
                          <span className="text-right">${formatUsd(montoExento)}</span>
                        </div>
                      )}
                      {baseImponible > 0 && (
                        <>
                          <div className="flex justify-between text-[10px]">
                            <span>BASE IMPONIBLE (16%):</span>
                            <span className="text-right">${formatUsd(baseImponible)}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>IVA (16%):</span>
                            <span className="text-right">${formatUsd(iva)}</span>
                          </div>
                        </>
                      )}
                      {igtf > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span>IGTF (3%):</span>
                          <span className="text-right">${formatUsd(igtf)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t-2 border-black pt-2 mt-2">
                      <div className="flex justify-between font-bold text-[14px]">
                        <span>TOTAL A PAGAR:</span>
                        <span className="text-right">${formatUsd(totalUsd)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Total Bs:</span>
                        <span className="text-right">{formatBs(totalBs)}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black pt-3 mt-3">
                      <div className="font-bold text-[10px] mb-2">FORMA DE PAGO:</div>
                      
                      {(() => {
                        const paymentData = getPaymentMethods();
                        const hasPayments = paymentData && Object.keys(paymentData).length > 0;
                        
                        if (hasPayments) {
                          if (Array.isArray(paymentData)) {
                            return paymentData.map((p: any, idx: number) => {
                              const method = p.metodo || p.method || 'efectivo';
                              const amount = p.montoUSD || p.amountUSD || p.monto || p.amount || 0;
                              const isUsd = isUsdPayment(method);
                              return (
                                <div key={idx} className="flex justify-between text-[10px]">
                                  <span>{formatPaymentMethod(method)}:</span>
                                  <span className="text-right">{isUsd ? `$${formatUsd(amount)}` : formatBs(amount * state.tasa)}</span>
                                </div>
                              );
                            });
                          } else {
                            return Object.entries(paymentData).map(([method, amount], idx) => {
                              const amountNum = typeof amount === 'number' ? amount : 0;
                              const isUsd = isUsdPayment(method);
                              return (
                                <div key={idx} className="flex justify-between text-[10px]">
                                  <span>{formatPaymentMethod(method)}:</span>
                                  <span className="text-right">{isUsd ? `$${formatUsd(amountNum)}` : formatBs(amountNum * state.tasa)}</span>
                                </div>
                              );
                            });
                          }
                        } else if (data.metodoPago) {
                          const method = data.metodoPago;
                          const amount = data.totalUSD || totalUsd;
                          const isUsd = isUsdPayment(method);
                          return (
                            <div className="flex justify-between text-[10px]">
                              <span>{formatPaymentMethod(method)}:</span>
                              <span className="text-right">{isUsd ? `$${formatUsd(amount)}` : formatBs(amount * state.tasa)}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex justify-between text-[10px]">
                              <span>EFECTIVO:</span>
                              <span className="text-right">${formatUsd(totalUsd)}</span>
                            </div>
                          );
                        }
                      })()}

                      {state.tasa && (
                        <div className="text-[8px] text-gray-600 mt-1">
                          (Tasa de cambio ref: 1 USD = Bs. {state.tasa.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="text-center mt-4 pt-4 border-t border-dashed border-black/30">
                {!isReport && (
                  <p className="font-bold text-[11px] mb-1">¡Gracias por su preferencia!</p>
                )}
                <p className="opacity-60 text-[8px]">Desarrollado por EFAS Freelancer</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} className="py-3 bg-[#E5E7EB] text-[#374151] font-black text-xs rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest">Cerrar</button>
              <button className="py-3 bg-[#2ECC71] text-white font-black text-xs rounded-xl hover:bg-green-600 flex items-center justify-center gap-2 uppercase tracking-widest shadow-sm"><Share2 size={14} /> Compartir</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePrint} className="py-3 bg-black text-white font-black text-xs rounded-xl hover:opacity-90 flex items-center justify-center gap-2 uppercase tracking-widest shadow-md"><Printer size={14} /> Estándar</button>
              <button onClick={handleNativePrint} className="py-3 bg-[#C8952E] text-black font-black text-xs rounded-xl hover:bg-[#D9A540] transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg">
                <Zap size={16} className="fill-current" /> Impresión Roccia
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
