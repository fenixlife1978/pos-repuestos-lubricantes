"use client";

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
  
  // ✅ Si no hay datos, no renderizar nada
  if (!data) {
    return null;
  }

  // ✅ Función para formatear fecha/hora correctamente
  const transactionDate = React.useMemo(() => {
    try {
      const rawDate = data.fecha || data.date || data.createdAt || Utils.ahora();
      const dateObj = new Date(rawDate);
      
      // Verificar si la fecha es válida
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

  // ✅ Función para obtener el cliente
  const customerName = React.useMemo(() => {
    if (data.cliente) return data.cliente.toUpperCase();
    if (data.customer?.name) return data.customer.name.toUpperCase();
    if (data.customerName) return data.customerName.toUpperCase();
    return 'CONSUMIDOR FINAL';
  }, [data.cliente, data.customer, data.customerName]);

  // ✅ Función para obtener el título del recibo
  const getReportTitle = () => {
    if (type === 'REPORT_Z') return 'REPORTE Z - CIERRE DIARIO';
    if (type === 'REPORT_X') return 'REPORTE X - LECTURA PARCIAL';
    return data.type || 'RECIBO DE VENTA';
  };

  // ✅ Función para obtener los items correctamente
  const getItems = () => {
    if (data.items) return data.items;
    if (data.products) return data.products;
    if (data.detalles) return data.detalles;
    return [];
  };

  // ✅ Función para formatear la línea de separación
  const separatorLine = (char: string = '─') => {
    return char.repeat(48);
  };

  // ✅ Función para alinear texto a la izquierda y derecha
  const alignLeftRight = (left: string, right: string) => {
    const totalWidth = 48;
    const leftStr = String(left || '');
    const rightStr = String(right || '');
    const dots = totalWidth - leftStr.length - rightStr.length;
    if (dots < 1) return leftStr.substring(0, totalWidth - rightStr.length - 1) + ' ' + rightStr;
    return leftStr + ' '.repeat(dots) + rightStr;
  };

  // ✅ Función para centrar texto
  const centerText = (text: string) => {
    const totalWidth = 48;
    const textStr = String(text || '');
    if (textStr.length >= totalWidth) return textStr.substring(0, totalWidth);
    const leftPadding = Math.floor((totalWidth - textStr.length) / 2);
    const rightPadding = totalWidth - textStr.length - leftPadding;
    return ' '.repeat(leftPadding) + textStr + ' '.repeat(rightPadding);
  };

  // ✅ Obtener el número de recibo
  const receiptNumber = React.useMemo(() => {
    if (data.id) return String(data.id);
    if (data.numero) return String(data.numero);
    if (data.controlNumber) return String(data.controlNumber);
    return 'N/A';
  }, [data.id, data.numero, data.controlNumber]);

  // ✅ Obtener el número de caja
  const terminalId = React.useMemo(() => {
    if (data.terminalId) return String(data.terminalId);
    if (data.caja) return String(data.caja);
    if (data.terminal) return String(data.terminal);
    return '01';
  }, [data.terminalId, data.caja, data.terminal]);

  // ✅ Obtener el nombre del cajero - CORREGIDO
  const cajeroNombre = React.useMemo(() => {
    if (data.cajeroNombre) return data.cajeroNombre;
    if (data.cajero) return data.cajero;
    if (data.cashier) return data.cashier;
    // ✅ Cambiar de state.usuario a state.user o usar auth directamente
    const currentUser = auth.currentUser;
    if (currentUser) {
      return currentUser.displayName || currentUser.email || 'Administrador';
    }
    return 'Administrador';
  }, [data.cajeroNombre, data.cajero, data.cashier]);

  // ✅ Obtener el total en Bs
  const totalBs = React.useMemo(() => {
    if (data.totalBS) return data.totalBS;
    if (data.totalBs) return data.totalBs;
    if (data.total) return data.total;
    return 0;
  }, [data.totalBS, data.totalBs, data.total]);

  // ✅ Obtener el total en USD
  const totalUsd = React.useMemo(() => {
    if (data.totalUSD) return data.totalUSD;
    if (data.totalUsd) return data.totalUsd;
    if (data.total) return data.total / (state.tasa || 1);
    return 0;
  }, [data.totalUSD, data.totalUsd, data.total, state.tasa]);

  // ✅ Obtener el monto exento
  const montoExento = React.useMemo(() => {
    if (data.exentoUSD) return data.exentoUSD;
    if (data.exento) return data.exento;
    return 0;
  }, [data.exentoUSD, data.exento]);

  // ✅ Obtener la base imponible
  const baseImponible = React.useMemo(() => {
    if (data.baseImponibleUSD) return data.baseImponibleUSD;
    if (data.baseImponible) return data.baseImponible;
    if (data.baseGeneral) return data.baseGeneral;
    return 0;
  }, [data.baseImponibleUSD, data.baseImponible, data.baseGeneral]);

  // ✅ Obtener el IVA
  const iva = React.useMemo(() => {
    if (data.ivaUSD) return data.ivaUSD;
    if (data.iva) return data.iva;
    if (data.ivaGeneral) return data.ivaGeneral;
    return 0;
  }, [data.ivaUSD, data.iva, data.ivaGeneral]);

  // ✅ Obtener el IGTF
  const igtf = React.useMemo(() => {
    if (data.igtfUSD) return data.igtfUSD;
    if (data.igtf) return data.igtf;
    return 0;
  }, [data.igtfUSD, data.igtf]);

  // ✅ Obtener métodos de pago
  const getPaymentMethods = () => {
    if (data.payments) return data.payments;
    if (data.paymentMethods) return data.paymentMethods;
    if (data.formasPago) return data.formasPago;
    return {};
  };

  // ✅ Formatear método de pago
  const formatPaymentMethod = (method: string) => {
    const methods: {[key: string]: string} = {
      'efectivo': 'EFECTIVO',
      'efectivo_bs': 'EFECTIVO (Bs.)',
      'efectivo_usd': 'EFECTIVO (USD)',
      'pago_movil': 'PAGO MÓVIL',
      'pagomovil': 'PAGO MÓVIL',
      'punto_venta': 'PUNTO DE VENTA',
      'tarjeta': 'TARJETA',
      'credito': 'CRÉDITO',
      'zelle': 'ZELLE',
      'mixto': 'MIXTO',
    };
    return methods[method.toLowerCase()] || method.toUpperCase();
  };

  // ✅ Función para imprimir
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

  // ✅ Función para imprimir con Electron
  const handleNativePrint = async () => {
    if (!window.electronAPI) {
      handlePrint();
      return;
    }

    try {
      // Construir datos para impresión nativa
      const printData = buildNativePrintData();
      await window.electronAPI.printTicket(printData);
      setTimeout(onClose, 500);
    } catch (e) {
      handlePrint();
    }
  };

  // ✅ Construir datos para impresión nativa
  const buildNativePrintData = () => {
    const printData: any[] = [];
    const items = getItems();
    const payments = getPaymentMethods();

    // Encabezado
    printData.push({ type: 'text', value: state.empresa.nombre.toUpperCase(), style: { fontWeight: "800", textAlign: 'center', fontSize: "20px" } });
    printData.push({ type: 'text', value: `RIF: ${state.empresa.rif}`, style: { textAlign: 'center', fontSize: "11px" } });
    printData.push({ type: 'text', value: state.empresa.direccion.toUpperCase(), style: { textAlign: 'center', fontSize: "11px" } });
    printData.push({ type: 'text', value: separatorLine('═'), style: { textAlign: 'center' } });

    // Título del documento
    printData.push({ type: 'text', value: getReportTitle(), style: { textAlign: 'center', fontWeight: "800", fontSize: "16px" } });
    printData.push({ type: 'text', value: separatorLine('═'), style: { textAlign: 'center' } });

    // Información del documento
    printData.push({ type: 'text', value: alignLeftRight(`RECIBO N°: ${receiptNumber}`, `CAJA: ${terminalId}`), style: { fontSize: "11px" } });
    printData.push({ type: 'text', value: alignLeftRight(`CAJERO: ${cajeroNombre}`, ''), style: { fontSize: "11px" } });
    printData.push({ type: 'text', value: alignLeftRight(`FECHA: ${transactionDate.split(',')[0]}`, `HORA: ${transactionDate.split(',')[1]?.trim() || ''}`), style: { fontSize: "11px" } });
    printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

    // Cliente
    printData.push({ type: 'text', value: `CLIENTE: ${customerName}`, style: { fontSize: "11px", fontWeight: "700" } });
    printData.push({ type: 'text', value: separatorLine('═'), style: { textAlign: 'center' } });

    // Items (para recibos de venta)
    if (!isReport && items.length > 0) {
      printData.push({ type: 'text', value: alignLeftRight('CANT', 'DESCRIPCIÓN'), style: { fontWeight: "800", fontSize: "11px" } });
      printData.push({ type: 'text', value: alignLeftRight('', 'P.UNIT    TOTAL'), style: { fontWeight: "800", fontSize: "11px" } });
      printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });

      items.forEach((item: any) => {
        const cantidad = item.cantidad || item.qty || 1;
        const nombre = (item.nombre || item.name || 'Producto').toUpperCase();
        const precioUnit = item.precioUSD || item.price || 0;
        const subtotal = item.subtotalUSD || (precioUnit * cantidad);
        const alicuota = item.alicuota || item.ivaType || 'G';
        
        printData.push({ 
          type: 'text', 
          value: alignLeftRight(`${String(cantidad).padStart(2)}  ${nombre.substring(0, 30)}`, formatUsd(subtotal)),
          style: { fontSize: "10px" }
        });
        printData.push({ 
          type: 'text', 
          value: alignLeftRight(`   ${formatUsd(precioUnit)}`, `(${alicuota})`),
          style: { fontSize: "9px" }
        });
      });
      
      printData.push({ type: 'text', value: separatorLine('═'), style: { textAlign: 'center' } });

      // Subtotal
      printData.push({ type: 'text', value: alignLeftRight('SUBTOTAL:', formatUsd(totalUsd)), style: { fontWeight: "700", fontSize: "11px" } });
      
      // Impuestos
      if (montoExento > 0) {
        printData.push({ type: 'text', value: alignLeftRight('EXENTO:', formatUsd(montoExento)), style: { fontSize: "11px" } });
      }
      if (baseImponible > 0) {
        printData.push({ type: 'text', value: alignLeftRight('BASE IMPONIBLE (16%):', formatUsd(baseImponible)), style: { fontSize: "11px" } });
        printData.push({ type: 'text', value: alignLeftRight('IVA (16%):', formatUsd(iva)), style: { fontSize: "11px" } });
      }
      if (igtf > 0) {
        printData.push({ type: 'text', value: alignLeftRight('IGTF (3%):', formatUsd(igtf)), style: { fontSize: "11px" } });
      }
      
      printData.push({ type: 'text', value: separatorLine('═'), style: { textAlign: 'center' } });

      // Total
      printData.push({ type: 'text', value: alignLeftRight('TOTAL A PAGAR:', formatUsd(totalUsd)), style: { fontWeight: "800", fontSize: "16px" } });
      printData.push({ type: 'text', value: alignLeftRight('TOTAL Bs:', formatBs(totalBs)), style: { fontSize: "11px" } });
      printData.push({ type: 'text', value: separatorLine('═'), style: { textAlign: 'center' } });

      // Formas de pago
      printData.push({ type: 'text', value: 'FORMA DE PAGO:', style: { fontWeight: "700", fontSize: "11px" } });
      if (Object.keys(payments).length > 0) {
        Object.entries(payments).forEach(([method, amount]) => {
          const amountNum = typeof amount === 'number' ? amount : 0;
          const isUsd = method.toLowerCase().includes('usd') || method.toLowerCase().includes('dolar');
          printData.push({ 
            type: 'text', 
            value: alignLeftRight(`${formatPaymentMethod(method)}:`, isUsd ? formatUsd(amountNum) : formatBs(amountNum)),
            style: { fontSize: "10px" }
          });
        });
      } else if (data.paymentMethod) {
        // Si hay un solo método de pago
        const method = data.paymentMethod;
        const amount = data.paymentAmount || totalBs;
        printData.push({ 
          type: 'text', 
          value: alignLeftRight(`${formatPaymentMethod(method)}:`, formatBs(amount)),
          style: { fontSize: "10px" }
        });
      }

      // Tasa de cambio
      if (state.tasa) {
        printData.push({ type: 'text', value: `TASA: 1 USD = Bs. ${state.tasa.toFixed(2)}`, style: { fontSize: "9px" } });
      }
    }

    // Pie de página
    printData.push({ type: 'text', value: separatorLine('-'), style: { textAlign: 'center' } });
    printData.push({ type: 'text', value: '¡Gracias por su preferencia!', style: { textAlign: 'center', fontSize: "11px", fontWeight: "700" } });
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
              {/* ========================================== */}
              {/* ENCABEZADO - IDÉNTICO AL EJEMPLO */}
              {/* ========================================== */}
              <div className="text-center pb-3">
                <h1 className="text-[20px] font-bold uppercase mb-2 leading-tight" style={{ fontFamily: 'Courier New, Courier, monospace' }}>
                  {state.empresa.nombre || 'EFAS SOLUCIONES DIGITALES C.A.'}
                </h1>
                <p className="text-[11px] font-bold uppercase">
                  RIF: {state.empresa.rif || 'J-12345678-9'}
                </p>
                <p className="text-[10px] leading-snug uppercase">
                  {state.empresa.direccion || 'Av. Principal, San Felipe, Yaracuy'}
                </p>
                <p className="text-[10px]">
                  Telf: {state.empresa.telefono || '0254-XXXXXXX'}
                </p>
              </div>

              <div className="text-center mb-4">
                <div className="text-[11px] font-bold uppercase">
                  {isReport ? getReportTitle() : 'RECIBO DE VENTA'}
                </div>
              </div>

              {/* ========================================== */}
              {/* INFORMACIÓN DEL DOCUMENTO */}
              {/* ========================================== */}
              <div className="text-[10px] font-bold mb-4">
                <div className="flex justify-between">
                  <span>RECIBO DE VENTA: {receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA: {transactionDate.split(',')[0] || '19/07/2026'}</span>
                  <span>HORA: {transactionDate.split(',')[1]?.trim() || '10:30 AM'}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJA: {terminalId}</span>
                  <span>CAJERO: {cajeroNombre}</span>
                </div>
              </div>

              {!isReport && (
                <>
                  <div className="border-t border-dashed border-black pt-3 mb-3">
                    <div className="text-[10px] font-bold mb-2">
                      <div className="flex justify-between">
                        <span>CANT</span>
                        <span>DESCRIPCIÓN</span>
                        <span>P.UNIT</span>
                        <span>TOTAL</span>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-black mb-2"></div>

                    {getItems().map((item: any, idx: number) => {
                      const cantidad = item.cantidad || item.qty || 1;
                      const nombre = (item.nombre || item.name || 'Producto').toUpperCase();
                      const precioUnit = item.precioUSD || item.price || 0;
                      const subtotal = item.subtotalUSD || (precioUnit * cantidad);
                      const alicuota = item.alicuota || item.ivaType || 'G';
                      
                      return (
                        <div key={idx} className="text-[9px] mb-1">
                          <div className="flex justify-between font-mono">
                            <span className="w-8">{String(cantidad).padStart(2)}</span>
                            <span className="flex-1 px-2">{nombre.substring(0, 30)}</span>
                            <span className="w-12 text-right">{formatUsd(precioUnit)}</span>
                            <span className="w-12 text-right font-bold">{formatUsd(subtotal)}</span>
                          </div>
                          <div className="text-right text-[8px] text-gray-600">({alicuota})</div>
                        </div>
                      );
                    })}

                    <div className="border-t border-black pt-2 mt-2">
                      <div className="flex justify-between font-bold text-[11px]">
                        <span>SUBTOTAL:</span>
                        <span>{formatUsd(totalUsd)}</span>
                      </div>
                      {montoExento > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span>EXENTO:</span>
                          <span>{formatUsd(montoExento)}</span>
                        </div>
                      )}
                      {baseImponible > 0 && (
                        <>
                          <div className="flex justify-between text-[10px]">
                            <span>BASE IMPONIBLE (16%):</span>
                            <span>{formatUsd(baseImponible)}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>IVA (16%):</span>
                            <span>{formatUsd(iva)}</span>
                          </div>
                        </>
                      )}
                      {igtf > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span>IGTF (3%):</span>
                          <span>{formatUsd(igtf)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t-2 border-black pt-2 mt-2">
                      <div className="flex justify-between font-bold text-[14px]">
                        <span>TOTAL A PAGAR:</span>
                        <span>{formatUsd(totalUsd)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Total Bs:</span>
                        <span>{formatBs(totalBs)}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black pt-3 mt-3">
                      <div className="font-bold text-[10px] mb-2">FORMA DE PAGO:</div>
                      {Object.entries(getPaymentMethods()).map(([method, amount]) => {
                        const amountNum = typeof amount === 'number' ? amount : 0;
                        const isUsd = method.toLowerCase().includes('usd') || method.toLowerCase().includes('dolar');
                        return (
                          <div key={method} className="flex justify-between text-[10px]">
                            <span>{formatPaymentMethod(method)}:</span>
                            <span>{isUsd ? formatUsd(amountNum) : formatBs(amountNum)}</span>
                          </div>
                        );
                      })}
                      {state.tasa && (
                        <div className="text-[8px] text-gray-600 mt-1">
                          (Tasa de cambio ref: 1 USD = Bs. {state.tasa.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ========================================== */}
              {/* PIE DE PÁGINA - IDÉNTICO AL EJEMPLO */}
              {/* ========================================== */}
              <div className="text-center mt-4 pt-4 border-t border-dashed border-black/30">
                <p className="font-bold text-[11px] mb-1">¡Gracias por su preferencia!</p>
                <p className="opacity-60 text-[8px]">Desarrollado por EFAS Freelancer</p>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BOTONES DE ACCIÓN */}
          {/* ========================================== */}
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