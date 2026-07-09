"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AppState, SaleItem, Sale, PaymentMethod, ReportZ, Movimiento, PagoRealizado, Customer, Return } from '@/lib/types';
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
  History,
  ClipboardList,
  ArrowLeft,
  Eye,
  Clock,
  Printer,
  Zap,
  Share2,
  UserPlus,
  RotateCcw
} from 'lucide-react';
import ReturnsModule from './ReturnsModule';

export default function SalesModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const ahora = Utils.ahora();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pos' | 'history' | 'credits' | 'returns'>('pos');
  const [showReport, setShowReport] = useState<'Y' | 'Z' | null>(null);
  const [cliente, setCliente] = useState('Consumidor final');
  
  const [pagos, setPagos] = useState<PagoRealizado[]>([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [metodoActual, setMetodoActual] = useState<PaymentMethod>('efectivo_usd');
  const [montoInput, setMontoInput] = useState('');
  
  const [showAbonoModal, setShowAbonoModal] = useState<string | null>(null);
  const [abonoPagos, setAbonoPagos] = useState<PagoRealizado[]>([]);
  
  const [showDetailsModal, setShowDetailsModal] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<any | null>(null);
  
  const [lastProcessedSale, setLastProcessedSale] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [isCreditView, setIsCreditView] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const reportPrintRef = useRef<HTMLDivElement | null>(null);

  const subtotalUSD = state.carrito.reduce((s, i) => s + i.subtotalUSD, 0);
  const totalBS = subtotalUSD * state.tasa;
  const totalPagadoUSD = pagos.reduce((s, p) => s + p.montoUSD, 0);
  const saldoRestanteUSD = Math.max(0, subtotalUSD - totalPagadoUSD);
  const saldoRestanteBS = saldoRestanteUSD * state.tasa;
  const cambioUSD = Math.max(0, totalPagadoUSD - subtotalUSD);

  const matches = search.trim().length > 0 
    ? state.productos
        .filter(p => p.activo && (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase())))
        .slice(0, 8)
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
    searchInputRef.current?.focus();
  };

  const updateQty = (idx: number, delta: number) => {
    const nuevo = [...state.carrito];
    const item = nuevo[idx];
    const p = state.productos.find(x => x.id === item.productoId);
    const n = item.cantidad + delta;
    if (n <= 0) nuevo.splice(idx, 1);
    else if (p && n <= p.stock) {
      item.cantidad = n;
      item.subtotalUSD = n * item.precioUnitUSD;
    }
    updateState({ carrito: nuevo });
  };

  const addPago = () => {
    let monto = parseFloat(montoInput);
    if (isNaN(monto) || monto <= 0) return;
    let montoUSD = metodoActual === 'efectivo_usd' || metodoActual === 'zelle' ? monto : monto / state.tasa;
    let montoBS = metodoActual === 'efectivo_usd' || metodoActual === 'zelle' ? monto * state.tasa : monto;
    setPagos([...pagos, { metodo: metodoActual, montoUSD, montoBS }]);
    setMontoInput('');
  };

  const ejecutarVenta = () => {
    if (state.carrito.length === 0 || saldoRestanteUSD > 0.01) return;
    const reciboId = String(state.proximoRecibo).padStart(9, '0');
    const ahoraStr = Utils.ahora();
    const nuevaVenta: Sale = {
      id: reciboId,
      fecha: ahoraStr,
      cliente,
      items: [...state.carrito],
      subtotalUSD,
      descuentoUSD: 0,
      totalUSD: subtotalUSD,
      totalBS,
      metodoPago: pagos.length > 1 ? 'mixto' : (pagos[0]?.metodo || 'efectivo_usd'),
      estado: 'completada',
      type: 'VENTA',
      received: totalPagadoUSD,
      change: cambioUSD,
      payments: [...pagos]
    };
    updateState({
      productos: state.productos.map(p => {
        const item = state.carrito.find(i => i.productoId === p.id);
        return item ? { ...p, stock: p.stock - item.cantidad } : p;
      }),
      ventas: [...state.ventas, nuevaVenta],
      movimientos: [...state.movimientos, ...state.carrito.map(item => ({
        id: Store.uid(), productoId: item.productoId, tipo: 'venta', cantidad: -item.cantidad,
        stockAntes: state.productos.find(p => p.id === item.productoId)?.stock || 0,
        stockDespues: (state.productos.find(p => p.id === item.productoId)?.stock || 0) - item.cantidad,
        fecha: ahoraStr, referencia: `VENTA ${reciboId}`
      } as Movimiento))],
      carrito: [],
      proximoRecibo: state.proximoRecibo + 1,
      acumuladoHistorico: state.acumuladoHistorico + subtotalUSD
    });
    setLastProcessedSale(nuevaVenta);
    setShowReceiptModal(true);
    setPagos([]);
  };

  if (view === 'returns') return <div className="p-4"><ReturnsModule state={state} updateState={updateState} /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* HEADER POS */}
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">POS /</h1>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Facturación</h1>
        </div>
        <div className="bg-[#10b981] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <span className="opacity-80">1 USD =</span>
          <span>{state.tasa.toFixed(2)} Bs</span>
        </div>
      </header>

      {/* TABS NAVEGACION */}
      <div className="flex gap-2 mb-2 no-print">
        <button onClick={() => setView('pos')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${view === 'pos' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>Venta</button>
        <button onClick={() => setView('history')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${view === 'history' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>Historial</button>
        <button onClick={() => setView('credits')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${view === 'credits' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}>Créditos</button>
        <button onClick={() => setView('returns')} className="px-4 py-2 rounded-full text-xs font-black uppercase bg-white text-slate-500 border border-slate-200">Devoluciones</button>
      </div>

      {view === 'pos' && (
        <div className="grid grid-cols-1 gap-6">
          {/* BUSCADOR MODERNO */}
          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><Barcode size={24}/></div>
            <input 
              ref={searchInputRef}
              className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border-none shadow-sm text-lg font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="Escanee o busque producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && matches[0] && agregar(matches[0].id)}
            />
            {matches.length > 0 && (
              <div className="absolute top-[110%] left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {matches.map(p => (
                  <div key={p.id} onClick={() => agregar(p.id)} className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                    <div className="flex flex-col"><span className="text-sm font-black uppercase text-slate-800">{p.nombre}</span><span className="text-[10px] text-slate-400 font-mono">{p.codigo}</span></div>
                    <div className="text-lg font-black text-slate-900">{Utils.fmtUSD(p.precioUSD)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARRITO BENTO */}
          <section className="bento-card min-h-[300px] flex flex-col">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-lg font-black text-slate-900 uppercase">Items</h2>
              <div className="grid grid-cols-3 mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                <span>Concepto</span><span className="text-center">Cant.</span><span className="text-right">Subtotal</span>
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px]">
              {state.carrito.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_80px] items-center p-4 bg-slate-50/50 rounded-xl">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-black uppercase text-slate-800 truncate">{item.nombre}</span>
                    <span className="text-[10px] text-slate-400">{Utils.fmtUSD(item.precioUnitUSD)} / {Utils.fmtBS(item.precioUnitUSD * state.tasa)}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                    <button onClick={() => updateQty(i, -1)} className="text-slate-400 hover:text-slate-900 font-bold">-</button>
                    <span className="text-xs font-black w-4 text-center">{item.cantidad}</span>
                    <button onClick={() => updateQty(i, 1)} className="text-slate-400 hover:text-slate-900 font-bold">+</button>
                  </div>
                  <div className="text-right font-black text-slate-900">{Utils.fmtUSD(item.subtotalUSD)}</div>
                </div>
              ))}
              {state.carrito.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-200">
                  <ShoppingCart size={64} className="mb-4 opacity-20"/>
                  <p className="font-black uppercase text-xs tracking-tighter">Esperando productos...</p>
                </div>
              )}
            </div>
          </section>

          {/* RESUMEN BENTO (DARK) */}
          <section className="bento-card-dark p-8 space-y-8">
            <h2 className="text-xl font-black uppercase tracking-tight">Resumen</h2>
            
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold opacity-60 uppercase">Total USD</span>
                <span className="text-4xl font-black">{Utils.fmtUSD(subtotalUSD)}</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-white/10 pt-4">
                <span className="text-sm font-bold text-amber-400 uppercase">Equivale Bs</span>
                <span className="text-lg font-black text-amber-400">{Utils.fmtBS(totalBS)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Monto USD</label>
                <input 
                  type="number" 
                  className="w-full h-14 bg-white text-slate-900 rounded-2xl px-4 text-xl font-black placeholder:text-slate-300 border-none outline-none focus:ring-4 focus:ring-primary/30 transition-all"
                  placeholder="0.00"
                  value={montoInput}
                  onChange={e => { setMontoInput(e.target.value); setMetodoActual('efectivo_usd'); }}
                  onKeyDown={e => e.key === 'Enter' && addPago()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Monto BS</label>
                <input 
                  type="number" 
                  className="w-full h-14 bg-white text-slate-900 rounded-2xl px-4 text-xl font-black placeholder:text-slate-300 border-none outline-none focus:ring-4 focus:ring-primary/30 transition-all"
                  placeholder="0.00"
                  onChange={e => { setMontoInput(e.target.value); setMetodoActual('efectivo_bs'); }}
                  onKeyDown={e => e.key === 'Enter' && addPago()}
                />
              </div>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5">
              <span className="text-sm font-black uppercase">Cambio:</span>
              <span className="text-2xl font-black">{Utils.fmtUSD(cambioUSD)}</span>
            </div>

            <button 
              onClick={ejecutarVenta}
              disabled={state.carrito.length === 0 || saldoRestanteUSD > 0.01}
              className="w-full h-16 bg-[#c8952e] hover:bg-[#d4a017] disabled:bg-white/10 disabled:text-white/20 text-slate-900 font-black text-lg uppercase rounded-2xl shadow-xl shadow-amber-900/20 transition-all transform active:scale-[0.98]"
            >
              Procesar Pago
            </button>
          </section>
        </div>
      )}

      {/* MODAL RECIBO Y REPORTES (Mismos de antes pero estilizados) */}
      {showReceiptModal && lastProcessedSale && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50 flex justify-center">
              <div ref={printRef} className="bg-white p-8 shadow-sm text-black font-mono text-[10px] w-[72mm]">
                <div className="text-center mb-4 pb-4 border-b border-dashed border-black">
                  <h1 className="font-bold text-lg">{state.empresa.nombre.toUpperCase()}</h1>
                  <p>{state.empresa.direccion}</p>
                  <p>RIF: {state.empresa.rif}</p>
                </div>
                <div className="flex justify-between mb-4">
                  <span>RECIBO N°: {lastProcessedSale.id}</span>
                </div>
                <table className="w-full mb-4">
                  <thead><tr className="border-y border-dashed border-black"><th>Cant</th><th className="text-left">Item</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {lastProcessedSale.items.map((it: any, idx: number) => (
                      <tr key={idx}><td>{it.cantidad}x</td><td>{it.nombre.toUpperCase().slice(0,15)}</td><td className="text-right">{Utils.fmtUSD(it.subtotalUSD)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-black pt-2 space-y-1">
                  <div className="flex justify-between font-bold text-sm"><span>TOTAL BS:</span><span>{Utils.fmtBS(lastProcessedSale.totalBS)}</span></div>
                  <div className="flex justify-between"><span>REF USD:</span><span>{Utils.fmtUSD(lastProcessedSale.totalUSD)}</span></div>
                </div>
                <p className="text-center mt-6 pt-4 border-t border-dashed border-black">¡GRACIAS POR SU COMPRA!</p>
              </div>
            </div>
            <div className="p-6 bg-white border-t flex flex-col gap-2">
              <button onClick={() => setShowReceiptModal(false)} className="w-full h-12 bg-slate-100 text-slate-900 font-black rounded-2xl uppercase text-xs">Cerrar</button>
              <button onClick={() => window.print()} className="w-full h-12 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-2"><Printer size={16}/> Imprimir Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}