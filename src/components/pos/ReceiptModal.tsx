'use client';

import React, { useRef } from 'react';
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

    let ticketString = '';
    try {
      if (isReport) {
        ticketString = generateReport(data, storeInfo, type as 'X' | 'Z', paperSize);
      } else {
        ticketString = generateSaleTicket(data, storeInfo, paperSize);
      }

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
    printWindow.document.write(`<html><head><title>Print</title></head><body>${printContent}</body></html>`);
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
               <div className="text-center font-bold">{getReportTitle()}</div>
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
