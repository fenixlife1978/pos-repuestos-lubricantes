"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';
import { Store, Utils } from '@/lib/db-store';
import { formatBs, formatUsd } from '@/lib/currency-formatter';

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
  sale?: any;
  reportData?: any;
  type?: 'SALE' | 'REPORT_X' | 'REPORT_Z';
}

export function ReceiptModal({ isOpen, onClose, sale, reportData, type = 'SALE' }: Props) {
  const state = Store.get();
  const printRef = useRef<HTMLDivElement>(null);

  const isReport = type === 'REPORT_X' || type === 'REPORT_Z';
  const data = isReport ? reportData : sale;

  if (!data) return null;

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
        hour12: true,
      });
    } catch {
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

  const DataRow = ({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px', pageBreakInside: 'avoid' }}>
      <tbody>
        <tr style={{ fontSize: '11px', fontWeight: bold ? '900' : '700' }}>
          <td style={{ textAlign: 'left', textTransform: 'uppercase', padding: '0' }}>{label}</td>
          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '0' }}>{value}</td>
        </tr>
      </tbody>
    </table>
  );

  const handlePrint = () => {
    const thermalContent = printRef.current;
    if (!thermalContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedContent = thermalContent.cloneNode(true) as HTMLElement;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Ticket - ${getReportTitle()}</title>
          <style>
            *, *::before, *::after {
              box-sizing: border-box;
              overflow: visible !important;
              contain: none !important;
            }
            html, body {
              height: auto;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            body {
              display: flex;
              justify-content: center;
            }
            @page {
              size: 80mm auto;
              margin: 0;
            }
            .thermal-ticket {
              width: 72mm;
              font-family: 'Arial', 'Helvetica', sans-serif;
              font-size: 11px;
              font-weight: 700;
              color: #000;
              background: #fff;
              line-height: 1.15;
              padding: 4mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .thermal-ticket * {
              overflow: visible !important;
              contain: none !important;
            }
            .thermal-ticket .separator {
              border-top: 1px dashed #000;
              margin: 8px 0;
              display: block;
            }
            .thermal-ticket table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: avoid;
            }
            .thermal-ticket td {
              padding: 0;
              margin: 0;
              text-align: left;
              font-size: 11px;
            }
            .thermal-ticket .section-title {
              font-weight: 900;
              text-align: center;
              margin-bottom: 4px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="thermal-ticket" id="thermal-content"></div>
          <script>
            document.getElementById('thermal-content').appendChild(
              ${getSerializedContent(clonedContent)}
            );
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (isReport) setTimeout(onClose, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-transparent border-none overflow-hidden shadow-none">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
          <div className="bg-black p-4 flex justify-between items-center">
            <h3 className="text-white font-black text-xs flex items-center gap-2 tracking-widest uppercase">
              <Printer size={16} className="text-brand-gold" /> VISTA PREVIA FISCAL
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div
            className="p-6 bg-gray-100 flex justify-center max-h-[70vh] overflow-y-auto custom-scrollbar"
            style={{ display: 'contents' }}
          >
            <div
              ref={printRef}
              style={{
                width: '72mm',
                boxSizing: 'border-box',
                color: '#000',
                fontSize: '11px',
                fontWeight: 700,
                display: 'block',
                padding: '6mm',
                background: '#fff',
                lineHeight: '1.15',
              }}
            >
              {/* ENCABEZADO */}
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h1 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 900, textTransform: 'uppercase' }}>
                  {state.empresa.nombre}
                </h1>
                <p style={{ margin: '0 0 2px 0', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {state.empresa.direccion}
                </p>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700 }}>
                  RIF: {state.empresa.rif} | TEL: {state.empresa.telefono}
                </p>
              </div>

              <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '8px 0' }} />

              <div style={{ background: '#000', color: '#fff', padding: '6px', textAlign: 'center', fontWeight: 900, margin: '10px 0', textTransform: 'uppercase', fontSize: '13px' }}>
                {getReportTitle()}
              </div>

              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                  TERMINAL: {terminalIdLabel}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}>
                  FECHA/HORA: {transactionDate}
                </div>
              </div>

              <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* REPORTES X / Z */}
              {isReport && (
                <div style={{ width: '100%' }}>
                  {type === 'REPORT_Z' && (
                    <div style={{ marginBottom: '10px' }}>
                      <p className="section-title">DATOS DE CONTROL Y AUDITORÍA</p>
                      <DataRow label="Reporte Z N°:" value={String(data.numeroZ || 0).padStart(6, '0')} bold />
                      <DataRow label="Rango Facturas:" value={`${data.desdeFactura} - ${data.hastaFactura}`} />
                      <DataRow label="Rango Notas Cred:" value={`${data.desdeNC} - ${data.hastaNC}`} />
                      <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '8px 0' }} />
                    </div>
                  )}

                  <div style={{ marginBottom: '10px' }}>
                    <p className="section-title">RESUMEN DE FACTURACIÓN</p>
                    <DataRow label="Venta Bruta:" value={formatBs(data.brUSD * state.tasa)} />
                    <DataRow label="Descuentos:" value={'-' + formatBs(data.descUSD * state.tasa)} />
                    <DataRow label="Devoluciones:" value={'-' + formatBs(data.devUSD * state.tasa)} />
                    <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '8px 0' }} />
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left', fontWeight: 900, fontSize: '14px' }}>VENTA NETA:</td>
                          <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '14px' }}>{formatBs(data.netUSD * state.tasa)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <p className="section-title">DESGLOSE FISCAL</p>
                    <DataRow label="Monto Exento:" value={formatBs((data.exentoUSD || 0) * state.tasa)} />
                    <DataRow label="Base Imponible:" value={formatBs((data.baseImponibleUSD || 0) * state.tasa)} />
                    <DataRow label="IVA Recaudado (16%):" value={formatBs((data.ivaUSD || 0) * state.tasa)} />
                    <DataRow label="Total IGTF (3%):" value={formatBs((data.igtfUSD || 0) * state.tasa)} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <p className="section-title">MOVIMIENTOS DE CAJA</p>
                    <DataRow label="Fondo de apertura Bs.:" value={formatBs(data.fondoAperturaBS || 0)} />
                    <DataRow label="Fondo de Apertura USD:" value={formatUsd(data.fondoAperturaUSD || 0)} />
                    <DataRow label="Entradas Caja:" value={formatBs((data.manualEntradas || 0) * state.tasa)} />
                    <DataRow label="Salidas / Gastos:" value={'-' + formatBs((data.manualSalidas || 0) * state.tasa)} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <p className="section-title">CONCILIACIÓN DE PAGOS</p>
                    {Object.entries(data.paymentMethods || {}).map(([method, val]) => (
                      <DataRow key={method} label={Utils.metodoLabel(method)} value={formatBs((val as number) * state.tasa)} />
                    ))}
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <p className="section-title">ESTADÍSTICAS DE JORNADA</p>
                    <DataRow label="Facturas Emitidas:" value={String(data.stats.facturas)} />
                    <DataRow label="Notas Crédito:" value={String(data.stats.devoluciones)} />
                    <DataRow label="Docs. Anulados:" value={String(data.stats.anulaciones)} bold />
                    <DataRow label="Ticket Promedio:" value={formatBs(data.stats.ticketPromedio * state.tasa)} />
                  </div>

                  {type === 'REPORT_Z' && (
                    <div style={{ paddingTop: '2px', borderTop: '1px double black', marginTop: '5px' }}>
                      <DataRow label="GRAN TOTAL ACUMULADO (BS):" value={formatBs(data.acumuladoHistoricoUSD * state.tasa)} bold />
                    </div>
                  )}
                </div>
              )}

              {/* RECIBO DE VENTA */}
              {!isReport && (
                <div style={{ width: '100%' }}>
                  <DataRow label="N° CONTROL:" value={data.id} bold />
                  <DataRow label="CLIENTE:" value={customerName} bold />
                  <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '8px 0' }} />

                  <p className="section-title">DESGLOSE DE PRODUCTOS</p>
                  {(data.items || []).map((item: any, idx: number) => (
                    <DataRow
                      key={idx}
                      label={`${item.cantidad || item.qty}x ${(item.nombre || item.name).slice(0, 24)}`}
                      value={formatBs((item.subtotalUSD || item.price * item.qty) * state.tasa)}
                    />
                  ))}

                  <span style={{ display: 'block', borderTop: '1px dashed #000', margin: '8px 0' }} />

                  <div style={{ marginTop: '4px' }}>
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left', fontWeight: 900, fontSize: '16px' }}>TOTAL A PAGAR:</td>
                          <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '16px' }}>{formatBs(data.totalBS)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <DataRow label="EQUIVALENTE REF. USD:" value={formatUsd(data.totalUSD)} bold />
                  </div>
                </div>
              )}

              {/* FOOTER */}
              <div style={{ textAlign: 'center', marginTop: '15px', paddingTop: '8px', borderTop: '1px dotted #ccc', pageBreakInside: 'avoid' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>¡Gracias por su preferencia!</p>
                <p style={{ opacity: 0.6, fontSize: '8px', margin: 0 }}>PosVEN Pro v2.5 - Bloque Fiscal Unificado</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} className="py-3 bg-[#E5E7EB] text-[#374151] font-black text-xs rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest">
                Cerrar
              </button>
              <button className="py-3 bg-black text-white font-black text-xs rounded-xl hover:opacity-90 flex items-center justify-center gap-2 uppercase tracking-widest shadow-md" onClick={handlePrint}>
                <Printer size={16} /> Imprimir
              </button>
            </div>
            <button className="py-3 bg-[#C8952E] text-black font-black text-xs rounded-xl hover:bg-[#D9A540] transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg" onClick={handlePrint}>
              <Printer size={16} /> Impresión Térmica Pro
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getSerializedContent(node: HTMLElement): string {
  const serializer = new (window as any).XMLSerializer();
  return serializer.serializeToString(node);
}