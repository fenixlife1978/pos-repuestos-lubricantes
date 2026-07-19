'use client';

import React, { useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X, Zap, Share2 } from 'lucide-react';
import { Store } from '@/lib/db-store';
import { generateSaleTicket, generateReport } from '@/lib/thermal-printer';
import { toast } from '../../hooks/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  saleData?: any; 
  reportData?: any; 
  storeInfo?: any;
  type?: 'SALE' | 'REPORT_X' | 'REPORT_Z';
  paperSize?: '80mm' | '56mm';
}

export function ReceiptModal({ isOpen, onClose, saleData, reportData, storeInfo, type = 'SALE', paperSize = '80mm' }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const isReport = type === 'REPORT_X' || type === 'REPORT_Z';
  const data = isReport ? reportData : saleData;

  if (!data) return null;

  // Generar el ticket completo como string
  const ticketString = useMemo(() => {
    try {
      if (isReport) {
        return generateReport(data, storeInfo, type as 'X' | 'Z', paperSize);
      } else {
        return generateSaleTicket(data, storeInfo, paperSize);
      }
    } catch (error) {
      console.error('Error generando ticket:', error);
      return 'Error al generar el ticket';
    }
  }, [data, storeInfo, type, paperSize, isReport]);

  // Función para formatear el ticket con estilos más bonitos
  const formatTicketWithStyles = (ticket: string) => {
    const lines = ticket.split('\n');
    return lines.map((line, index) => {
      // Detectar líneas de separador
      if (/^[─═\-]+$/.test(line.trim())) {
        return <div key={index} className="border-t border-gray-300 my-1"></div>;
      }
      // Detectar líneas en negrita (con comandos ESC/POS) - limpiar caracteres de control
      if (line.includes('BOLD_ON') || line.includes('DOUBLE_HW_ON')) {
        const cleanLine = line
          .replace(/[\x1B\x40\x1B\x69\x1B\x45\x01\x1B\x45\x00\x1B\x21\x30\x1B\x21\x00]/g, '')
          .replace(/BOLD_ON|BOLD_OFF|DOUBLE_HW_ON|DOUBLE_HW_OFF/g, '');
        return <div key={index} className="font-bold text-center">{cleanLine || ' '}</div>;
      }
      // Líneas centradas (que no contengan montos)
      if (line.trim() && !line.includes('Bs.') && !line.includes('TOTAL') && !line.includes('Bs')) {
        return <div key={index} className="text-center whitespace-pre-wrap font-mono text-xs">{line}</div>;
      }
      // Líneas normales (incluyendo montos)
      return <div key={index} className="whitespace-pre-wrap font-mono text-xs" style={{ fontFamily: 'Courier New, monospace' }}>{line}</div>;
    });
  };

  const getReportTitle = () => {
    if (type === 'REPORT_Z') return `REPORTE Z - CIERRE DIARIO`;
    if (type === 'REPORT_X') return `REPORTE X - LECTURA PARCIAL`;
    return (data.type || 'RECIBO DE VENTA').toUpperCase();
  };

  const handleNativePrint = async () => {
    if (!window.electronAPI) {
      toast({
        title: "Error de Impresión",
        description: "La API de Electron no está disponible.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await window.electronAPI.printTicket(ticketString);

      if (result.success) {
        toast({ title: "Impresión Exitosa", description: "El ticket fue enviado a la impresora." });
        setTimeout(onClose, 500);
      } else {
        throw new Error(result.error || 'Error desconocido en el proceso principal.');
      }

    } catch (e: any) {
      console.error("Error en la generación o impresión del ticket:", e);
      toast({
        title: "Error al Imprimir",
        description: e.message || "No se pudo enviar el ticket a la impresora.",
        variant: "destructive",
      });
    }
  };
  
  const handleHtmlPrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 16px;
              background: white;
            }
            .ticket-content {
              max-width: 72mm;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .border-t { border-top: 1px solid #ccc; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            .font-mono { font-family: 'Courier New', monospace; }
            .text-xs { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="ticket-content">${printContent}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    setTimeout(onClose, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-transparent border-none overflow-hidden shadow-none">
        <DialogHeader className="sr-only"><DialogTitle>Impresión Térmica</DialogTitle></DialogHeader>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
          <div className="bg-black p-4 flex justify-between items-center">
            <h3 className="text-white font-black text-xs flex items-center gap-2 tracking-widest uppercase">
              <Printer size={16} className="text-brand-gold" /> VISTA PREVIA
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 bg-gray-100 flex justify-center max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div 
              ref={printRef}
              className="thermal-80mm bg-white p-4 shadow-sm font-mono text-xs select-none"
              style={{ width: '72mm', boxSizing: 'border-box', color: 'black' }}
            >
              <div className="text-center font-bold text-sm mb-2">{getReportTitle()}</div>
              <div className="border-t border-gray-300 my-2"></div>
              {/* Renderizar el contenido del ticket con estilos */}
              <div className="ticket-content">
                {formatTicketWithStyles(ticketString)}
              </div>
              <div className="border-t border-gray-300 my-2"></div>
              <div className="text-center text-xs text-gray-500 mt-2">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleNativePrint} 
                className="py-4 bg-[#C8952E] text-black font-black text-sm rounded-xl hover:bg-[#D9A540] transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg"
              >
                <Zap size={18} className="fill-current" /> IMPRESIÓN RÁPIDA (ESC/POS)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} className="py-3 bg-[#E5E7EB] text-[#374151] font-black text-xs rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest">Cerrar</button>
              <button onClick={handleHtmlPrint} className="py-3 bg-gray-800 text-white font-black text-xs rounded-xl hover:opacity-90 flex items-center justify-center gap-2 uppercase tracking-widest shadow-md">
                <Printer size={14} /> Estándar (HTML)
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}