'use client';

import React, { useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X, Zap } from 'lucide-react';
import { generateSaleTicket, generateReport } from '@/lib/thermal-printer';
import { toast } from '../../hooks/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  saleData?: any;
  reportData?: any;
  storeInfo?: any;
  type?: 'SALE' | 'REPORT_X' | 'REPORT_Z';
}

export function ReceiptModal({ 
  isOpen, 
  onClose, 
  saleData, 
  reportData, 
  storeInfo, 
  type = 'SALE' 
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const isReport = type === 'REPORT_X' || type === 'REPORT_Z';
  const data = isReport ? reportData : saleData;

  if (!data) return null;

  // Generar el ticket completo como string (solo 80mm)
  const ticketString = useMemo(() => {
    try {
      if (isReport) {
        return generateReport(data, storeInfo, type as 'X' | 'Z');
      } else {
        return generateSaleTicket(data, storeInfo);
      }
    } catch (error) {
      console.error('Error generando ticket:', error);
      return 'Error al generar el ticket';
    }
  }, [data, storeInfo, type, isReport]);

  // Función para limpiar caracteres de control y formatear
  const cleanAndFormatTicket = (ticket: string) => {
    if (!ticket) return [];

    // Eliminar caracteres de control ESC/POS
    const clean = ticket
      .replace(/[\x1B\x40\x1B\x69\x1B\x45\x01\x1B\x45\x00\x1B\x21\x30\x1B\x21\x00]/g, '')
      .replace(/\x1B/g, '')
      .replace(/\[0m/g, '')
      .replace(/\[1m/g, '');

    const lines = clean.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Saltar líneas vacías
      if (!line.trim()) {
        result.push({ type: 'empty', content: '', key: i });
        continue;
      }

      // Detectar separadores
      if (/^[─═\-]+$/.test(line.trim())) {
        result.push({
          type: 'separator',
          content: line,
          key: i
        });
        continue;
      }

      // Detectar títulos y negritas
      if (/^[A-ZÁÉÍÓÚÑ\s]+$/.test(line.trim()) && line.trim().length > 5) {
        result.push({
          type: 'bold',
          content: line,
          key: i
        });
        continue;
      }

      // Líneas normales
      result.push({
        type: 'normal',
        content: line,
        key: i
      });
    }

    return result;
  };

  const formattedTicket = useMemo(() => {
    return cleanAndFormatTicket(ticketString);
  }, [ticketString]);

  const getReportTitle = () => {
    if (type === 'REPORT_Z') return 'REPORTE Z - CIERRE DIARIO';
    if (type === 'REPORT_X') return 'REPORTE X - LECTURA PARCIAL';
    return 'RECIBO DE VENTA';
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
              font-size: 11px; 
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
            .separator { 
              border-top: 1px solid #000;
              margin: 2px 0;
            }
            .separator-double {
              border-top: 2px solid #000;
              margin: 2px 0;
            }
            .line { 
              white-space: pre-wrap;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.4;
              padding: 1px 0;
            }
            .bold { 
              font-weight: bold;
              text-align: center;
            }
            .empty { height: 4px; }
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
              <Printer size={16} className="text-[#C8952E]" /> VISTA PREVIA
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 bg-gray-100 flex justify-center max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div 
              ref={printRef}
              className="bg-white p-4 shadow-sm select-none"
              style={{ 
                width: '72mm', 
                boxSizing: 'border-box', 
                color: 'black',
                fontFamily: 'Courier New, monospace',
                fontSize: '10px',
                lineHeight: '1.4'
              }}
            >
              <div className="text-center font-bold text-sm mb-1">{getReportTitle()}</div>
              <div className="border-t-2 border-gray-800 my-1"></div>
              
              <div className="ticket-content">
                {formattedTicket.map((item) => {
                  switch (item.type) {
                    case 'empty':
                      return <div key={item.key} className="h-1"></div>;
                    case 'separator':
                      if (item.content.includes('═')) {
                        return <div key={item.key} className="border-t-2 border-gray-800 my-1"></div>;
                      }
                      return <div key={item.key} className="border-t border-gray-400 my-1"></div>;
                    case 'bold':
                      return <div key={item.key} className="font-bold text-center">{item.content}</div>;
                    default:
                      return <div key={item.key} className="whitespace-pre-wrap" style={{ fontFamily: 'Courier New, monospace', fontSize: '10px' }}>{item.content}</div>;
                  }
                })}
              </div>
              
              <div className="border-t-2 border-gray-800 my-1"></div>
              <div className="text-center text-[8px] text-gray-400 mt-1">
                {new Date().toLocaleString('es-VE')}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
            <button 
              onClick={handleNativePrint} 
              className="w-full py-4 bg-[#C8952E] text-black font-black text-sm rounded-xl hover:bg-[#D9A540] transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg"
            >
              <Zap size={18} className="fill-current" /> IMPRESIÓN RÁPIDA (ESC/POS)
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} className="py-3 bg-[#E5E7EB] text-[#374151] font-black text-xs rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest">
                Cerrar
              </button>
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