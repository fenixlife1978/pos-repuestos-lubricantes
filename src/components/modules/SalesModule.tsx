"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AppState, SaleItem, Sale, PaymentMethod, ReportZ, Movimiento, PagoRealizado, Customer } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Receipt, 
  Barcode, 
  Wallet, 
  X, 
  CheckCircle2, 
  FileText,
  RotateCcw,
  History,
  ClipboardList,
  ArrowLeft,
  Eye,
  Clock,
  Printer,
  Zap,
  Share2,
  UserPlus,
  HandCoins
} from 'lucide-react';

export default function SalesModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pos' | 'history' | 'credits' | 'returns'>('pos');
  const [cliente, setCliente] = useState('Consumidor final');
  const [pagos, setPagos] = useState<PagoRealizado[]>([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [metodoActual, setMetodoActual] = useState<PaymentMethod>('efectivo_usd');
  const [montoInput, setMontoInput] = useState('');
  const [lastProcessedSale, setLastProcessedSale] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Cálculos financieros
  const subtotalUSD = state.carrito.reduce((s, i) => s + i.subtotalUSD, 0);
  const totalBS = subtotalUSD * state.tasa;
  const totalPagadoUSD = pagos.reduce((s, p) => s + p.montoUSD, 0);
  const saldoRestanteUSD = Math.max(0, subtotalUSD - totalPagadoUSD);

  const matches = search.trim().length > 0 
    ? state.productos.filter(p => p.activo && (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()))).slice(0, 6)
    : [];

  const agregar = (pid: string) => {
    const p = state.productos.find(x => x.id === pid);
    if (!p || p.stock <= 0) return;
    const nuevoCarrito = [...state.carrito];
    const idx = nuevoCarrito.findIndex(i => i.productoId === pid);
    if (idx >= 0) {
      if (nuevoCarrito[idx].cantidad >= p.stock) return;
      nuevoCarrito[idx].cantidad++;
      nuevoCarrito[idx].subtotalUSD = nuevoCarrito[idx].cantidad * nuevoCarrito[idx].precioUnitUSD;
    } else {
      nuevoCarrito.push({ productoId: pid, nombre: p.nombre, precioUnitUSD: p.precioUSD, cantidad: 1, subtotalUSD: p.precioUSD });
    }
    updateState({ carrito: nuevoCarrito });
    setSearch('');
    setPagos([]);
  };

  const ejecutarVenta = () => {
    if (state.carrito.length === 0 || saldoRestanteUSD > 0.01) return;
    const reciboId = String(state.proximoRecibo).padStart(9, '0');
    const ahoraStr = Utils.ahora();
    
    const nuevaVenta: Sale & { payments?: PagoRealizado[] } = {
      id: reciboId, fecha: ahoraStr, cliente, items: [...state.carrito],
      subtotalUSD, descuentoUSD: 0, totalUSD: subtotalUSD, totalBS,
      metodoPago: pagos.length > 1 ? 'mixto' : (pagos[0]?.metodo || 'efectivo_usd'),
      estado: 'completada', type: 'VENTA', received: totalPagadoUSD,
      change: Math.max(0, totalPagadoUSD - subtotalUSD), payments: [...pagos]
    };

    updateState({
      ventas: [...state.ventas, nuevaVenta],
      carrito: [],
      proximoRecibo: state.proximoRecibo + 1,
      acumuladoHistorico: state.acumuladoHistorico + subtotalUSD
    });
    
    setLastProcessedSale(nuevaVenta);
    setShowReceiptModal(true);
    setPagos([]);
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Navigation Redesign */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-surface-soft rounded-[16px] w-fit">
        <button onClick={() => setView('pos')} className={`btn btn-sm ${view === 'pos' ? 'btn-primary shadow-md' : 'btn-secondary border-transparent'}`}>
          <ShoppingCart className="w-3.5 h-3.5"/> Punto de Venta
        </button>
        <button onClick={() => setView('history')} className={`btn btn-sm ${view === 'history' ? 'btn-primary shadow-md' : 'btn-secondary border-transparent'}`}>
          <History className="w-3.5 h-3.5"/> Historial Diario
        </button>
        <button onClick={() => setView('credits')} className={`btn btn-sm ${view === 'credits' ? 'btn-primary shadow-md' : 'btn-secondary border-transparent'}`}>
          <HandCoins className="w-3.5 h-3.5"/> Créditos (CxC)
        </button>
        <button onClick={() => setView('returns')} className={`btn btn-sm ${view === 'returns' ? 'btn-primary shadow-md' : 'btn-secondary border-transparent'}`}>
          <RotateCcw className="w-3.5 h-3.5"/> Devoluciones
        </button>
      </div>

      {view === 'pos' ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
          {/* Main POS Column */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Search Card */}
            <div className="kpi-card !p-2 !rounded-[20px] flex items-center group focus-within:ring-2 focus-within:ring-brand-gold/30 transition-all">
               <div className="pl-4 text-ink-subtle group-focus-within:text-brand-gold transition-colors"><Barcode className="w-6 h-6" /></div>
               <input 
                  className="flex-1 bg-transparent py-4 px-3 text-sm font-bold text-ink placeholder:text-ink-subtle outline-none" 
                  placeholder="Escanea un código o busca un producto por nombre..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
               />
               {matches.length > 0 && (
                 <div className="absolute top-full left-0 right-0 bg-white border border-line rounded-xl shadow-pop z-[100] mt-2 overflow-hidden">
                   {matches.map(p => (
                     <div key={p.id} onClick={() => agregar(p.id)} className="p-3 border-b border-line hover:bg-surface-warm cursor-pointer flex justify-between items-center transition-colors">
                       <div>
                         <p className="text-xs font-extrabold text-ink uppercase">{p.nombre}</p>
                         <p className="text-[10px] font-bold text-ink-subtle mono uppercase">{p.codigo}</p>
                       </div>
                       <p className="font-black text-brand-gold text-sm">{Utils.fmtUSD(p.precioUSD)}</p>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Cart Card */}
            <div className="bento-card flex-1 flex flex-col min-h-0">
              <div className="px-6 py-4 border-b border-line bg-surface-warm/30 flex justify-between items-center">
                <h3 className="text-xs font-black text-ink uppercase tracking-widest flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand-gold" /> Detalle del Carrito
                </h3>
                <span className="px-3 py-1 bg-ink text-white text-[10px] font-black rounded-full uppercase">{state.carrito.length} Items</span>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-surface-soft/80 backdrop-blur-sm">
                      <th className="text-[10px]">Producto</th>
                      <th className="text-center text-[10px]">Cant</th>
                      <th className="text-right text-[10px]">P. Unit</th>
                      <th className="text-right text-[10px]">Subtotal</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.carrito.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-surface-warm/50">
                        <td>
                          <p className="text-xs font-extrabold text-ink uppercase">{item.nombre}</p>
                          <p className="text-[9px] font-bold text-ink-subtle mono uppercase">#{item.productoId.slice(-4)}</p>
                        </td>
                        <td className="text-center">
                          <div className="inline-flex items-center gap-2 bg-surface-soft rounded-lg p-1">
                            <button className="w-6 h-6 flex items-center justify-center font-bold text-ink hover:bg-white rounded transition-colors">-</button>
                            <span className="w-6 text-center text-xs font-black">{item.cantidad}</span>
                            <button className="w-6 h-6 flex items-center justify-center font-bold text-ink hover:bg-white rounded transition-colors">+</button>
                          </div>
                        </td>
                        <td className="text-right font-bold text-xs">{Utils.fmtUSD(item.precioUnitUSD)}</td>
                        <td className="text-right font-black text-xs text-brand-gold">{Utils.fmtUSD(item.subtotalUSD)}</td>
                        <td className="text-center">
                          <button className="p-1.5 text-status-danger/30 hover:text-status-danger transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                    {state.carrito.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <div className="flex flex-col items-center opacity-30">
                            <ShoppingCart className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Esperando productos para facturar...</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Checkout Column */}
          <div className="w-full lg:w-[380px] flex flex-col gap-6">
            <div className="bento-card">
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-ink rounded-2xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><ShoppingCart className="w-12 h-12" /></div>
                    <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest mb-1">Total a Pagar</p>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-4xl font-black font-display text-brand-gold">{Utils.fmtUSD(subtotalUSD)}</h2>
                      <p className="text-xs font-bold text-ink-subtle uppercase">{Utils.fmtBS(totalBS)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-ink-subtle uppercase px-1">Cliente</label>
                    <div className="relative">
                      <input className="form-input w-full bg-surface-soft border-line py-3 px-4 rounded-xl text-xs font-extrabold text-ink uppercase" value={cliente} onChange={e => setCliente(e.target.value)} />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold"><UserPlus className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-warm border border-line rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-ink-subtle uppercase">Desglose de Pago</span>
                    <button onClick={() => setShowMultiModal(true)} className="p-1.5 bg-brand-gold text-white rounded-lg hover:shadow-lg transition-all"><Wallet className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2 max-h-[100px] overflow-y-auto">
                    {pagos.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-line/50 last:border-0">
                        <span className="text-[10px] font-extrabold text-ink uppercase">{Utils.metodoLabel(p.metodo)}</span>
                        <span className="text-xs font-black text-brand-gold">{Utils.fmtUSD(p.montoUSD)}</span>
                      </div>
                    ))}
                    {pagos.length === 0 && <p className="text-[10px] italic text-ink-subtle text-center py-2">Sin abonos registrados</p>}
                  </div>
                  <div className="pt-2 flex justify-between items-center border-t border-line">
                    <span className="text-[10px] font-black text-ink uppercase">Resta:</span>
                    <span className={`text-sm font-black ${saldoRestanteUSD > 0.01 ? 'text-status-info' : 'text-status-success'}`}>
                      {saldoRestanteUSD > 0.01 ? Utils.fmtUSD(saldoRestanteUSD) : 'SALDADO'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={ejecutarVenta}
                  disabled={state.carrito.length === 0 || saldoRestanteUSD > 0.01}
                  className="w-full py-5 bg-brand-gold text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-deep hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5" /> Procesar Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bento-card p-20 flex flex-col items-center justify-center opacity-40">
           <div className="w-20 h-20 bg-surface-soft rounded-full flex items-center justify-center text-ink-muted mb-6">
             {view === 'history' ? <History className="w-10 h-10" /> : <HandCoins className="w-10 h-10" />}
           </div>
           <p className="font-black uppercase tracking-widest text-sm">Vista de {view.toUpperCase()} en mantenimiento</p>
        </div>
      )}
    </div>
  );
}
