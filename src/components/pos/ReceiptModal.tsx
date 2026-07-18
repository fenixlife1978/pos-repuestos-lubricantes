"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X, Zap, Share2, Monitor } from 'lucide-react';
import { Store, Utils } from '@/lib/db-store';
import { formatBs, formatUsd } from '@/lib/currency-formatter';
import { auth } from '@/lib/firebase';
import '@/lib/window.d.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale?: any; 
  reportData?: any; 
  type?: 'SALE' | 'REPORT_X' | 'REPORT_Z';
}

// Componente auxiliar para filas de tabla, asegurando alineación perfecta
const ReceiptRow = ({ label, value, bold = false, className = '' }: { label: React.ReactNode; value: React.ReactNode; bold?: boolean; className?: string }) => (
  <tr className={`${bold ? 'font-bold' : ''} ${className}`}>
    <td className="py-0.5 text-left align-top">{label}</td>
    <td className="py-0.5 text-right align-top">{value}</td>
  </tr>
);

export function ReceiptModal({ isOpen, onClose, sale, reportData, type = 'SALE' }: Props) {
  const state = Store.get();
  const printRef = useRef<HTMLDivElement>(null);

  const isReport = type === 'REPORT_X' || type === 'REPORT_Z';
  const data = isReport ? reportData : sale;
  
  if (!data) return null;

  // Función de formateo de línea para ESC/POS (42 caracteres)
  const formatLine = (left: string, right: string, width = 42) => {
    left = String(left || '');
    right = String(right || '');
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  const transactionDate = React.useMemo(() => {
    try {
      const rawDate = data.fecha || data.date || Utils.ahora();
      const dateObj = new Date(rawDate);
      return dateObj.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
    }
  }, [data.fecha, data.date]);

  const customerName = (data.cliente || 'CONSUMIDOR FINAL').toUpperCase();
  const terminalIdLabel = (data.terminalName || 'SISTEMA GLOBAL').toUpperCase();
  
  const getReportTitle = () => {
    if (type === 'REPORT_Z') return `REPORTE Z - CIERRE DIARIO`;
    if (type === 'REPORT_X') return `REPORTE X - LECTURA PARCIAL`;
    return (data.type || 'RECIBO DE VENTA').toUpperCase();
  };

  const handleNativePrint = async () => {
    if (!window.electronAPI) {
      handlePrint();
      return;
    }

    const SEPARATOR = '-'.repeat(42);
    const DOTS = '.'.repeat(42);
    
    // Inicialización con Font A (ESC M 0)
    let printData: any[] = [
      { type: 'raw', value: new Uint8Array([0x1b, 0x4d, 0x00]) }, // SELECT FONT A
      { type: 'text', value: state.empresa.nombre.toUpperCase(), style: { fontWeight: "bold", textAlign: 'center' } },
      { type: 'text', value: state.empresa.direccion.toUpperCase(), style: { textAlign: 'center', fontSize: "small" } },
      { type: 'text', value: `RIF: ${state.empresa.rif} | TEL: ${state.empresa.telefono}`, style: { textAlign: 'center', fontSize: "small" } },
      { type: 'text', value: SEPARATOR, style: { textAlign: 'center' } }
    ];

    if (isReport) {
      printData.push({ type: 'text', value: getReportTitle(), style: { textAlign: 'center', fontWeight: "bold" } });
      printData.push({ type: 'text', value: `TERMINAL: ${terminalIdLabel}`, style: { textAlign: 'center', fontWeight: "bold" } });
      printData.push({ type: 'text', value: `FECHA/HORA: ${transactionDate}`, style: { fontSize: "small", textAlign: 'center' } });
      printData.push({ type: 'text', value: SEPARATOR, style: { textAlign: 'center' } });
      
      if (type === 'REPORT_Z') {
        printData.push({ type: 'text', value: 'DATOS DE CONTROL E AUDITORÍA', style: { textAlign: 'center', fontWeight: "bold" } });
        printData.push({ type: 'text', value: formatLine('REPORTE Z N°:', String(data.numeroZ || 0).padStart(6, '0')) });
        printData.push({ type: 'text', value: formatLine('RANGO FACTURAS', `${data.desdeFactura} - ${data.hastaFactura}`) });
        printData.push({ type: 'text', value: formatLine('RANGO NOTAS CRED', `${data.desdeNC} - ${data.hastaNC}`) });
        printData.push({ type: 'text', value: DOTS });
      }

      printData.push({ type: 'text', value: 'RESUMEN DE FACTURACIÓN', style: { textAlign: 'center', fontWeight: "bold" } });
      printData.push({ type: 'text', value: formatLine('VENTA BRUTA', formatBs(data.brUSD * state.tasa)) });
      printData.push({ type: 'text', value: formatLine('DESCUENTOS', '-' + formatBs(data.descUSD * state.tasa)) });
      printData.push({ type: 'text', value: formatLine('DEVOLUCIONES', '-' + formatBs(data.devUSD * state.tasa)) });
      printData.push({ type: 'text', value: formatLine('VENTA NETA', formatBs(data.netUSD * state.tasa)), style: { fontWeight: "bold" } });
      printData.push({ type: 'text', value: DOTS });

      printData.push({ type: 'text', value: 'DESGLOSE FISCAL', style: { textAlign: 'center', fontWeight: "bold" } });
      printData.push({ type: 'text', value: formatLine('Monto Exento', formatBs((data.exentoUSD || 0) * state.tasa)) });
      printData.push({ type: 'text', value: formatLine('Base Imponible', formatBs((data.baseImponibleUSD || 0) * state.tasa)) });
      printData.push({ type: 'text', value: formatLine('IVA Recaudado (16%)', formatBs((data.ivaUSD || 0) * state.tasa)) });
      printData.push({ type: 'text', value: formatLine('Total IGTF (3%)', formatBs((data.igtfUSD || 0) * state.tasa)) });
      printData.push({ type: 'text', value: DOTS });

      printData.push({ type: 'text', value: 'CONCILIACIÓN DE PAGOS', style: { textAlign: 'center', fontWeight: "bold" } });
      Object.entries(data.paymentMethods || {}).forEach(([method, val]) => {
        printData.push({ type: 'text', value: formatLine(Utils.metodoLabel(method).toUpperCase(), formatBs((val as number) * state.tasa)) });
      });
      printData.push({ type: 'text', value: formatLine('SALIDAS / GASTOS CAJA', '-' + formatBs((data.manualSalidas || 0) * state.tasa)) });
      
      if (type === 'REPORT_Z') {
        printData.push({ type: 'text', value: SEPARATOR, style: { textAlign: 'center' } });
        printData.push({ type: 'text', value: 'ACUMULADOS HISTÓRICOS', style: { textAlign: 'center', fontWeight: "bold" } });
        printData.push({ type: 'text', value: formatLine('GRAN TOTAL (BS)', formatBs(data.acumuladoHistoricoUSD * state.tasa)), style: { fontWeight: "bold" } });
      }

    } else { // Recibo de venta normal
      printData.push({ type: 'text', value: getReportTitle(), style: { textAlign: 'center', fontWeight: "bold" } });
      printData.push({ type: 'text', value: formatLine(`N° CONTROL: ${data.id}`, `FECHA: ${transactionDate.split(' ')[0]}`) });
      printData.push({ type: 'text', value: `CLIENTE: ${customerName}`, style: { fontSize: "small" } });
      printData.push({ type: 'text', value: SEPARATOR });
      printData.push({ type: 'text', value: formatLine('PRODUCTO', 'TOTAL'), style: { fontWeight: "bold" } });
      printData.push({ type: 'text', value: SEPARATOR });

      data.items.forEach((item: any) => {
        const itemName = `${item.cantidad || item.qty}x ${(item.nombre || item.name).toUpperCase()}`;
        const itemTotal = formatBs((item.subtotalUSD || (item.price * item.qty)) * state.tasa);
        printData.push({ type: 'text', value: formatLine(itemName.slice(0, 30), itemTotal) });
      });

      printData.push({ type: 'text', value: SEPARATOR });
      printData.push({ type: 'text', value: formatLine('SUBTOTAL', formatBs(data.subtotalBS)) });
      printData.push({ type: 'text', value: formatLine('IVA 16%', formatBs(data.ivaBS)) });
      printData.push({ type: 'text', value: formatLine('IGTF 3%', formatBs(data.igtfBS)) });
      printData.push({ type: 'text', value: formatLine('TOTAL A PAGAR', formatBs(data.totalBS)), style: { fontWeight: "bold", fontSize: "large" } });
      printData.push({ type: 'text', value: formatLine('REF. USD', formatUsd(data.totalUSD)) });
      printData.push({ type: 'text', value: SEPARATOR });
      
      printData.push({ type: 'text', value: 'FORMAS DE PAGO', style: { textAlign: 'center', fontWeight: "bold" } });
      Object.entries(data.metodosPago || {}).forEach(([method, amount]) => {
          const label = Utils.metodoLabel(method).toUpperCase();
          printData.push({ type: 'text', value: formatLine(label, formatBs(amount as number)) });
      });
    }

    printData.push({ type: 'text', value: SEPARATOR, style: { textAlign: 'center' } });
    printData.push({ type: 'text', value: '¡Gracias por su preferencia!', style: { textAlign: 'center', fontSize: "small" } });
    printData.push({ type: 'text', value: 'PosVEN Pro v2.5 - RC-8002 optimized\n\n\n', style: { textAlign: 'center', fontSize: "x-small" } });

    try {
      await window.electronAPI.printTicket(printData);
      setTimeout(onClose, 500);
    } catch (e) {
      console.error("Error en Impresión Roccia:", e);
      handlePrint(); // Fallback a impresión estándar si falla la nativa
    }
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
              font-family: 'monospace'; 
              font-size: 12px; /* Simula Font A - Ancho estándar */
              line-height: 1.3;
              width: 72mm;
              margin: 0;
              padding: 4mm;
              color: #000;
              background: #fff;
            }
            table { width: 100%; border-collapse: collapse; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .p-0 { padding: 0; }
            .m-0 { margin: 0; }
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
              className="thermal-80mm bg-white p-4 shadow-sm text-black font-mono text-xs select-none"
              style={{ width: '72mm', boxSizing: 'border-box' }}
            >
              {/* Header */}
              <div className="text-center mb-3">
                <h1 className="text-lg font-bold uppercase">{state.empresa.nombre}</h1>
                <p className="text-[9px] uppercase">{state.empresa.direccion}</p>
                <p className="text-[9px] font-bold uppercase">RIF: {state.empresa.rif} | TEL: {state.empresa.telefono}</p>
              </div>

              {/* --- Separador --- */}
              <div className="border-t border-dashed border-black my-2"></div>

              <div className="text-center mb-2 space-y-0.5">
                <p className="font-bold uppercase">{getReportTitle()}</p>
                {isReport && <p className="font-bold uppercase text-[9px]">TERMINAL: {terminalIdLabel}</p>}
                <p className="uppercase text-[9px]">FECHA/HORA: {transactionDate}</p>
              </div>

              {/* --- Separador --- */}
              <div className="border-t border-dashed border-black my-2"></div>

              {isReport && type === 'REPORT_Z' && (
                <>
                  <p className="font-bold text-center uppercase text-[10px] mb-1">DATOS DE CONTROL</p>
                  <table className="w-full text-[9px] uppercase">
                    <tbody>
                      <ReceiptRow label="REPORTE Z N°:" value={String(data.numeroZ || 0).padStart(6, '0')} bold />
                      <ReceiptRow label="RANGO FACTURAS:" value={`${data.desdeFactura} - ${data.hastaFactura}`} />
                      <ReceiptRow label="RANGO NOTAS CRED:" value={`${data.desdeNC} - ${data.hastaNC}`} />
                    </tbody>
                  </table>
                  <div className="border-t border-dashed border-black my-2"></div>
                </>
              )}

              {isReport ? (
                <div className="space-y-3">
                    <div>
                      <p className="font-bold text-center uppercase text-[10px] mb-1">RESUMEN DE FACTURACIÓN</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <ReceiptRow label="VENTA BRUTA:" value={formatBs(data.brUSD * state.tasa)} />
                          <ReceiptRow label="DESCUENTOS:" value={'-' + formatBs(data.descUSD * state.tasa)} />
                          <ReceiptRow label="DEVOLUCIONES:" value={'-' + formatBs(data.devUSD * state.tasa)} />
                          <ReceiptRow label="VENTA NETA:" value={formatBs(data.netUSD * state.tasa)} bold className="border-t border-black"/>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <p className="font-bold text-center uppercase text-[10px] mb-1">DESGLOSE FISCAL</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <ReceiptRow label="Monto Exento:" value={formatBs((data.exentoUSD || 0) * state.tasa)} />
                          <ReceiptRow label="Base Imponible:" value={formatBs((data.baseImponibleUSD || 0) * state.tasa)} />
                          <ReceiptRow label="IVA Recaudado (16%):" value={formatBs((data.ivaUSD || 0) * state.tasa)} />
                          <ReceiptRow label="Total IGTF (3%):" value={formatBs((data.igtfUSD || 0) * state.tasa)} />
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <p className="font-bold text-center uppercase text-[10px] mb-1">CONCILIACIÓN DE PAGOS</p>
                      <table className="w-full text-xs uppercase">
                        <tbody>
                          {Object.entries(data.paymentMethods || {}).map(([method, val]) => (
                            <ReceiptRow key={method} label={`${Utils.metodoLabel(method)}:`} value={formatBs((val as number) * state.tasa)} />
                          ))}
                          <ReceiptRow label="SALIDAS / GASTOS:" value={'-' + formatBs((data.manualSalidas || 0) * state.tasa)} />
                        </tbody>
                      </table>
                    </div>
                </div>
              ) : (
                <div>
                  <table className="w-full text-[9px] uppercase">
                    <tbody>
                      <ReceiptRow label="N° CONTROL:" value={data.id} bold/>
                      <ReceiptRow label="CLIENTE:" value={customerName} />
                    </tbody>
                  </table>
                  <div className="border-t border-dashed border-black my-2"></div>
                  <table className="w-full text-xs uppercase">
                    <thead>
                      <tr>
                        <th className="text-left font-bold">PRODUCTO</th>
                        <th className="text-right font-bold">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item: any, idx: number) => (
                        <ReceiptRow 
                          key={idx} 
                          label={<><span>{item.cantidad || item.qty}x</span> <span className="pl-1">{(item.nombre || item.name).slice(0, 25)}</span></>} 
                          value={formatBs((item.subtotalUSD || (item.price * item.qty)) * state.tasa)}
                        />
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-black my-2"></div>
                  <table className="w-full text-xs">
                    <tbody>
                      <ReceiptRow label="SUBTOTAL:" value={formatBs(data.subtotalBS)} />
                      <ReceiptRow label="IVA (16%):" value={formatBs(data.ivaBS)} />
                      <ReceiptRow label="IGTF (3%):" value={formatBs(data.igtfBS)} />
                      <ReceiptRow label="TOTAL A PAGAR:" value={formatBs(data.totalBS)} bold className="text-sm border-y-2 border-black" />
                      <ReceiptRow label="REF. USD:" value={formatUsd(data.totalUSD)} />
                    </tbody>
                  </table>
                  <div className="border-t border-dashed border-black my-2"></div>
                   <p className="font-bold text-center uppercase text-[10px] mb-1">FORMA DE PAGO</p>
                   <table className="w-full text-xs uppercase">
                        <tbody>
                          {Object.entries(data.metodosPago || {}).map(([method, amount]) => (
                             <ReceiptRow key={method} label={`${Utils.metodoLabel(method)}:`} value={formatBs(amount as number)} />
                          ))}
                        </tbody>
                    </table>
                </div>
              )}
              <div className="text-center mt-4 pt-2 border-t border-dashed border-black">
                <p className="font-bold">¡Gracias por su preferencia!</p>
                <p className="text-[8px] opacity-70">PosVEN Pro v2.5 - RC-8002 optimized</p>
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