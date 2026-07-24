'use client';

import React, { useState } from 'react';
import { X, Banknote, CreditCard, Wallet, Smartphone } from 'lucide-react';
import { Utils } from '@/lib/db-store';

interface CashSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    montoEfectivoBS: number;
    totalAPagarBS: number;
    comision: number;
    metodoPago: string;
  }) => void;
  comisionEfectivo: number;
  tasaCambio: number;
}

export function CashSaleModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  comisionEfectivo,
  tasaCambio 
}: CashSaleModalProps) {
  const [montoEfectivoBS, setMontoEfectivoBS] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'biopago' | 'punto_venta' | 'pagomovil'>('biopago');

  if (!isOpen) return null;

  const montoNum = parseFloat(montoEfectivoBS.replace(/\./g, '')) || 0;
  const comisionDecimal = comisionEfectivo / 100;
  const totalAPagar = montoNum * (1 + comisionDecimal);
  const ganancia = totalAPagar - montoNum;

  const formatBS = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleConfirm = () => {
    if (montoNum <= 0) {
      alert('Ingrese un monto válido mayor a 0');
      return;
    }

    onConfirm({
      montoEfectivoBS: montoNum,
      totalAPagarBS: totalAPagar,
      comision: comisionEfectivo,
      metodoPago: metodoPago
    });

    setMontoEfectivoBS('');
  };

  const handleMontoChange = (value: string) => {
    const clean = value.replace(/[^0-9.]/g, '');
    setMontoEfectivoBS(clean);
  };

  const methods = [
    { id: 'biopago', label: 'Biopago', icon: CreditCard, color: 'text-blue-600' },
    { id: 'punto_venta', label: 'Punto de Venta', icon: Wallet, color: 'text-green-600' },
    { id: 'pagomovil', label: 'PagoMóvil', icon: Smartphone, color: 'text-purple-600' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 overflow-hidden">
        {/* HEADER */}
        <div className="px-6 py-4 bg-ink flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#D4A017]" />
            <h2 className="text-base font-bold text-white">VENTA DE EFECTIVO (Bs.)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 bg-white max-h-[90vh] overflow-y-auto">
          {/* Información de la comisión */}
          <div className="bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-xl p-4 text-center">
            <p className="text-xs font-black uppercase text-[#D4A017]">Comisión por Servicio</p>
            <p className="text-2xl font-black text-[#D4A017]">{comisionEfectivo}%</p>
            <p className="text-[9px] text-gray-500 mt-1">
              El cliente paga el monto + {comisionEfectivo}% de comisión
            </p>
          </div>

          {/* Monto de efectivo en bolívares */}
          <div className="form-group">
            <label className="text-ink text-[10px] font-black uppercase block mb-1">
              Monto de Efectivo a Recibir (Bs.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 font-black text-sm">Bs.</span>
              <input
                type="text"
                className="form-input h-12 pl-12 text-lg font-black text-ink bg-white border-2 border-[#D4A017]/30 focus:border-[#D4A017]"
                value={montoEfectivoBS}
                onChange={(e) => handleMontoChange(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
            </div>
            <p className="text-[8px] text-ink/40 mt-1">
              Ej: 500000 (quinientos mil bolívares)
            </p>
          </div>

          {/* Resumen de la operación */}
          {montoNum > 0 && (
            <div className="space-y-2 p-4 bg-surface-soft rounded-xl border border-line animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center text-xs font-black uppercase">
                <span className="text-ink/60">Efectivo a recibir:</span>
                <span className="text-ink">{formatBS(montoNum)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black uppercase">
                <span className="text-ink/60">Comisión ({comisionEfectivo}%):</span>
                <span className="text-status-success">{formatBS(ganancia)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black uppercase border-t border-line pt-2">
                <span className="text-ink">Total a Pagar:</span>
                <span className="text-2xl font-black text-[#D4A017]">{formatBS(totalAPagar)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-ink/40">
                <span>Equiv. USD:</span>
                <span>${(totalAPagar / tasaCambio).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Método de pago */}
          <div className="form-group">
            <label className="text-ink text-[10px] font-black uppercase block mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetodoPago(m.id as any)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    metodoPago === m.id
                      ? 'border-[#D4A017] bg-[#D4A017]/10 shadow-md'
                      : 'border-gray-200 hover:border-[#D4A017]/50'
                  }`}
                >
                  <m.icon className={`w-5 h-5 ${metodoPago === m.id ? m.color : 'text-gray-400'}`} />
                  <span className={`text-[8px] font-black uppercase ${
                    metodoPago === m.id ? 'text-ink' : 'text-gray-400'
                  }`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Botón confirmar */}
          <button
            onClick={handleConfirm}
            disabled={montoNum <= 0}
            className="w-full h-14 bg-gradient-to-r from-[#D4A017] to-[#E8B831] text-white rounded-xl font-black uppercase text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Banknote className="w-5 h-5" />
            CONFIRMAR VENTA DE EFECTIVO
          </button>

          {/* Advertencia */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-[8px] text-yellow-700 text-center font-bold uppercase">
              ⚠️ Esta operación entrega efectivo en bolívares. 
              El pago se recibe por {metodoPago === 'biopago' ? 'Biopago' : metodoPago === 'punto_venta' ? 'Punto de Venta' : 'PagoMóvil'}.
            </p>
            <p className="text-[7px] text-yellow-600 text-center font-bold mt-1">
              Registra la salida de efectivo de caja
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}