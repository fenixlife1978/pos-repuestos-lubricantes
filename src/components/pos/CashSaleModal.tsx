'use client';

import React, { useState, useEffect } from 'react';
import { X, Banknote, CreditCard, Wallet, Smartphone, Percent } from 'lucide-react';
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
  comisionEfectivo: number;  // porcentaje por defecto desde configuración
  tasaCambio: number;
}

export function CashSaleModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  comisionEfectivo: defaultComision,
  tasaCambio 
}: CashSaleModalProps) {
  const [montoEfectivoBS, setMontoEfectivoBS] = useState<string>('');
  const [comision, setComision] = useState<number>(defaultComision);
  const [metodoPago, setMetodoPago] = useState<'biopago' | 'punto_venta' | 'pagomovil'>('biopago');

  // Reiniciar estado al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setMontoEfectivoBS('');
      setComision(defaultComision);
      setMetodoPago('biopago');
    }
  }, [isOpen, defaultComision]);

  if (!isOpen) return null;

  const montoNum = parseFloat(montoEfectivoBS.replace(/\./g, '')) || 0;
  const comisionDecimal = comision / 100;
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
    if (comision < 0) {
      alert('La comisión no puede ser negativa');
      return;
    }

    onConfirm({
      montoEfectivoBS: montoNum,
      totalAPagarBS: totalAPagar,
      comision: comision,
      metodoPago: metodoPago
    });

    // El modal se cierra automáticamente desde el padre (SalesModule)
  };

  const handleMontoChange = (value: string) => {
    const clean = value.replace(/[^0-9.]/g, '');
    setMontoEfectivoBS(clean);
  };

  const handleComisionChange = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setComision(parsed);
    } else if (value === '') {
      setComision(0);
    }
  };

  const methods = [
    { id: 'biopago', label: 'Biopago', icon: CreditCard, color: 'text-blue-600' },
    { id: 'punto_venta', label: 'Punto de Venta', icon: Wallet, color: 'text-green-600' },
    { id: 'pagomovil', label: 'PagoMóvil', icon: Smartphone, color: 'text-purple-600' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 overflow-hidden max-h-[95vh] flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 bg-ink flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#D4A017]" />
            <h2 className="text-base font-bold text-white">VENTA DE EFECTIVO (Bs.)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
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

          {/* Comisión editable */}
          <div className="form-group">
            <label className="text-ink text-[10px] font-black uppercase block mb-1 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" /> Comisión (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="form-input h-10 w-24 text-lg font-black text-[#D4A017] border-2 border-[#D4A017]/30 focus:border-[#D4A017] text-center"
                value={comision}
                onChange={(e) => handleComisionChange(e.target.value)}
              />
              <span className="text-ink font-black text-sm">%</span>
              <span className="text-[10px] text-ink/40 ml-2">(por defecto: {defaultComision}%)</span>
            </div>
          </div>

          {/* Resumen de la operación - actualizado en tiempo real */}
          {montoNum > 0 && (
            <div className="space-y-2 p-4 bg-surface-soft rounded-xl border border-line animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center text-xs font-black uppercase">
                <span className="text-ink/60">Efectivo a recibir:</span>
                <span className="text-ink">{formatBS(montoNum)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-black uppercase">
                <span className="text-ink/60">Comisión ({comision}%):</span>
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
            disabled={montoNum <= 0 || comision < 0}
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