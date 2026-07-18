"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X, Zap, Share2 } from 'lucide-react';
import { Store } from '@/lib/db-store';
import { generateSaleTicket, generateReport } from '@/lib/thermal-printer'; // Importamos las nuevas funciones
import { toast } from '@/hooks/use-toast';

// El resto de tus imports y la interfaz Props se mantienen igual...
interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale?: any; 
  reportData?: any; 
  type?: 'SALE' | 'REPORT_X' | 'REPORT_Z';
  // Añadimos una prop para el tamaño de papel, con un valor por defecto
  paperSize?: '80mm' | '56mm';
}

export function ReceiptModal({ isOpen, onClose, sale, reportData, type = 'SALE', paperSize = '80mm' }: Props) {
  const state = Store.get();
  const printRef = useRef<HTMLDivElement>(null);

  const isReport = type === 'REPORT_X' || type === 'REPORT_Z';
  const data = isReport ? reportData : sale;

  if (!data) return null;

  const getReportTitle = () => {
    if (type === 'REPORT_Z') return `REPORTE Z - CIERRE DIARIO`;
    if (type === 'REPORT_X') return `REPORTE X - LECTURA PARCIAL`;
    return (data.type || 'RECIBO DE VENTA').toUpperCase();
  };

  /**
   * Nueva función unificada para manejar la impresión nativa ESC/POS.
   */
  const handleNativePrint = async () => {
    if (!window.electronAPI) {
      toast({
        title: "Error de Impresión",
        description: "La API de Electron no está disponible. Contacte a soporte.",
        variant: "destructive",
      });
      return;
    }

    let ticketString = '';
    try {
      if (isReport) {
        // Usamos el generador de reportes
        ticketString = generateReport(data, type as 'X' | 'Z', paperSize);
      } else {
        // Usamos el generador de ticket de venta
        ticketString = generateSaleTicket(data, paperSize);
      }

      // Enviamos el string completo al proceso principal de Electron
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
      // Opcional: Fallback a la impresión HTML si la nativa falla
      // handleHtmlPrint(); 
    }
  };
  
  /**
   * Fallback a la impresión basada en HTML (el método original que tenías).
   */
  const handleHtmlPrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    // ... (El resto de tu lógica para la impresión HTML se mantiene aquí)
    printWindow.document.write(`<html>...${printContent}...</html>`);
    printWindow.document.close();
    setTimeout(onClose, 1000);
  };

  // El JSX se simplifica. Mantenemos la vista previa HTML, pero los botones de impresión cambian.
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

          {/* La vista previa HTML sigue siendo útil, la mantenemos */}
          <div className="p-6 bg-gray-100 flex justify-center max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div 
              ref={printRef}
              className="thermal-80mm bg-white p-4 shadow-sm font-mono text-xs select-none"
              style={{ width: '72mm', boxSizing: 'border-box', color: 'black' }}
            >
               {/* ... Aquí va tu estructura de vista previa HTML, puede quedar como la tenías ... */}
               <div className="text-center font-bold">{getReportTitle()}</div>
               {/* ... etc ... */}
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
             <div className="grid grid-cols-1 gap-3">
                {/* Botón principal y de alto rendimiento */}
                <button 
                  onClick={handleNativePrint} 
                  className="py-4 bg-[#C8952E] text-black font-black text-sm rounded-xl hover:bg-[#D9A540] transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg"
                >
                  <Zap size={18} className="fill-current" /> IMPRESIÓN RÁPIDA (ESC/POS)
                </button>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={onClose} className="py-3 bg-[#E5E7EB] text-[#374151] font-black text-xs rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest">Cerrar</button>
                {/* Botón de fallback por si la impresión nativa no está configurada o falla */}
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
