"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AppState, SaleItem, Sale, PaymentMethod } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Receipt, 
  Barcode, 
  Wallet, 
  X, 
  CheckCircle2, 
  DollarSign, 
  Banknote 
} from 'lucide-react';

interface PagoRealizado {
  metodo: PaymentMethod;
  montoUSD: number;
  montoBS: number;
}

export default function SalesModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [cliente, setCliente] = useState('Consumidor final');
  
  const [pagos, setPagos] = useState<PagoRealizado[]>([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [metodoActual, setMetodoActual] = useState<PaymentMethod>('efectivo_usd');
  const [montoInput, setMontoInput] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const subtotalUSD = state.carrito.reduce((s, i) => s + i.subtotalUSD, 0);
  const totalBS = subtotalUSD * state.tasa;

  const totalPagadoUSD = pagos.reduce((s, p) => s + p.montoUSD, 0);
  const totalPagadoBS = pagos.reduce((s, p) => s + p.montoBS, 0);
  
  const saldoRestanteUSD = Math.max(0, subtotalUSD - totalPagadoUSD);
  const saldoRestanteBS = Math.max(0, totalBS - totalPagadoBS);

  const matches = search.trim().length > 0 
    ? state.productos
        .filter(p => 
          p.activo && 
          (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => {
          const s = search.toLowerCase();
          const aCode = a.codigo.toLowerCase();
          const bCode = b.codigo.toLowerCase();
          if (aCode === s && bCode !== s) return -1;
          if (aCode.startsWith(s) && !bCode.startsWith(s)) return -1;
          return 0;
        })
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
      nuevoCarrito.push({
        productoId: pid,
        nombre: p.nombre,
        precioUnitUSD: p.precioUSD,
        cantidad: 1,
        subtotalUSD: p.precioUSD
      });
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
    
    if (n <= 0) {
      nuevo.splice(idx, 1);
    } else if (p && n <= p.stock) {
      item.cantidad = n;
      item.subtotalUSD = n * item.precioUnitUSD;
    }
    updateState({ carrito: nuevo });
    setPagos([]);
  };

  const addPago = () => {
    let monto = parseFloat(montoInput);
    if (isNaN(monto) || monto <= 0) {
      monto = metodoActual === 'efectivo_usd' ? saldoRestanteUSD : saldoRestanteBS;
    }

    let montoUSD = 0;
    let montoBS = 0;

    if (metodoActual === 'efectivo_usd') {
      montoUSD = monto;
      montoBS = monto * state.tasa;
    } else {
      montoBS = monto;
      montoUSD = monto / state.tasa;
    }

    if (montoUSD > (saldoRestanteUSD + 0.01)) {
      alert("El monto excede el saldo pendiente");
      return;
    }

    setPagos([...pagos, { metodo: metodoActual, montoUSD, montoBS }]);
    setMontoInput('');
    setShowMultiModal(false);
  };

  const ejecutarVenta = () => {
    if (state.carrito.length === 0 || saldoRestanteUSD > 0.01) return;
    
    const ventaId = Store.uid();
    const hoy = Utils.hoy();
    const ahora = Utils.ahora();
    
    const nuevosProductos = [...state.productos];
    const nuevosMovimientos = [...state.movimientos];
    
    state.carrito.forEach(item => {
      const p = nuevosProductos.find(x => x.id === item.productoId);
      if (p) {
        const antes = p.stock;
        p.stock -= item.cantidad;
        nuevosMovimientos.push({
          id: Store.uid(),
          productoId: item.productoId,
          tipo: 'venta',
          cantidad: item.cantidad,
          stockAntes: antes,
          stockDespues: p.stock,
          fecha: ahora,
          referencia: `Venta ${ventaId.slice(-6)}`
        });
      }
    });

    const nuevaVenta: Sale = {
      id: ventaId,
      fecha: hoy,
      cliente,
      items: [...state.carrito],
      subtotalUSD,
      descuentoUSD: 0,
      totalUSD: subtotalUSD,
      totalBS: totalBS,
      metodoPago: pagos.length > 1 ? 'mixto' : (pagos[0]?.metodo || 'efectivo_usd'),
      estado: 'completada'
    };

    updateState({
      productos: nuevosProductos,
      movimientos: nuevosMovimientos,
      ventas: [...state.ventas, nuevaVenta],
      carrito: []
    });
    
    setPagos([]);
    setCliente('Consumidor final');
    alert('Venta procesada con éxito');
  };

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-100px)] max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex gap-2 no-print shrink-0">
        <button className={`btn btn-sm ${!showHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowHistory(false)}>
          <ShoppingCart className="w-3.5 h-3.5" /> Punto de Venta
        </button>
        <button className={`btn btn-sm ${showHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowHistory(true)}>
          <Receipt className="w-3.5 h-3.5" /> Historial
        </button>
      </div>

      {!showHistory ? (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <div className="relative group shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c8952e] z-10">
              <Barcode className="w-5 h-5" />
            </div>
            <input 
              ref={searchInputRef}
              className="form-input pl-14 py-3 text-base bg-[#131313] border-[#c8952e]/30 focus:border-[#c8952e] shadow-xl" 
              placeholder="Escanee o busque producto..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && matches.length >= 1 && agregar(matches[0].id)}
              autoFocus
            />
            
            {matches.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#1e1e1e] border border-[#2a2a2a] rounded-b-lg shadow-2xl z-[100] mt-1 overflow-hidden">
                {matches.map(p => (
                  <div key={p.id} onClick={() => agregar(p.id)} className="flex items-center justify-between p-3 hover:bg-[#c8952e]/10 cursor-pointer border-b border-[#2a2a2a] last:border-0">
                    <div>
                      <div className="font-bold text-xs">{p.nombre}</div>
                      <div className="text-[9px] text-[#5a5650] mono uppercase">{p.codigo} • {p.stock} uds.</div>
                    </div>
                    <div className="text-[#c8952e] font-display font-bold text-sm">{Utils.fmtUSD(p.precioUSD)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 gap-3 overflow-hidden">
            
            <div className="w-1/3 flex flex-col gap-2 overflow-hidden">
              <div className="card p-3 space-y-3 bg-[#131313] border-[#2a2a2a] h-full flex flex-col">
                
                <div className="form-group mb-0">
                  <label className="form-label text-[9px] uppercase font-bold text-[#c8952e] mb-1 tracking-widest">Identificación Cliente</label>
                  <input className="form-input h-8 text-xs bg-[#0b0b0b] border-[#2a2a2a]" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre..." />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-[8px] text-[#8a847c] font-bold uppercase tracking-widest block mb-1">Métodos Aplicados</label>
                  <div className="flex-1 p-2 border border-white/5 bg-[#181818] rounded-lg overflow-y-auto">
                    {pagos.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] border-b border-[#2a2a2a] py-1.5 last:border-0">
                        <span className="capitalize text-[#8a847c]">{Utils.metodoLabel(p.metodo)}</span>
                        <span className="font-bold text-[#c8952e]">{Utils.fmtUSD(p.montoUSD)}</span>
                      </div>
                    ))}
                    {pagos.length === 0 && <div className="text-[9px] opacity-20 italic py-2 text-center">No hay abonos</div>}
                  </div>
                </div>

                <div className="p-2 border border-[#3a9bdc]/30 bg-[#3a9bdc]/5 rounded-lg text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <label className="text-[8px] text-[#3a9bdc] font-bold uppercase tracking-widest block">Saldo Restante</label>
                    <button 
                      onClick={() => setShowMultiModal(true)}
                      className="btn-icon h-6 w-6 bg-[#c8952e]/10 text-[#c8952e] border border-[#c8952e]/20"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`text-2xl font-display font-black tracking-tight ${saldoRestanteUSD <= 0.01 ? 'text-[#27ae60]' : 'text-[#3a9bdc]'}`}>
                    {saldoRestanteUSD <= 0.01 ? 'SALDADO' : Utils.fmtUSD(saldoRestanteUSD)}
                  </div>
                  
                  <div className="bg-black py-2 px-2 rounded border border-[#2a2a2a]">
                    <div className="text-[7px] text-[#5a5650] uppercase font-bold mb-0.5 tracking-widest text-center">Equivalente a pagar</div>
                    <div className="text-xl font-display font-black text-white tracking-tighter text-center">
                      {Utils.fmtBS(saldoRestanteBS)}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="w-2/3 flex flex-col gap-2 overflow-hidden">
              <div className="card flex-1 flex flex-col overflow-hidden border-[#2a2a2a]">
                <div className="card-head py-2 px-3 bg-[#131313]/50">
                  <h3 className="flex items-center gap-2 text-xs">
                    <ShoppingCart className="w-3.5 h-3.5 text-[#c8952e]" /> Carrito
                  </h3>
                  <button className="btn btn-sm h-7 text-[10px] btn-secondary text-[#e04848] border-none" onClick={() => { updateState({ carrito: [] }); setPagos([]); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Vaciar
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                  {state.carrito.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <ShoppingCart className="w-16 h-16 mb-2" />
                      <p className="text-xs uppercase tracking-widest">Esperando Productos...</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {state.carrito.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-[#0b0b0b] rounded-lg border border-[#2a2a2a] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-bold text-[10px] uppercase">{item.nombre}</div>
                            <div className="text-[9px] text-[#5a5650] mono font-bold uppercase mt-0.5">{item.productoId} • {Utils.fmtUSD(item.precioUnitUSD)}</div>
                          </div>
                          <div className="flex items-center gap-2 bg-[#131313] rounded-md p-1 border border-[#2a2a2a]">
                            <button className="h-5 w-5 flex items-center justify-center bg-[#181818] rounded" onClick={() => updateQty(i, -1)}><Minus className="w-2.5 h-2.5" /></button>
                            <span className="w-5 text-center text-xs font-black">{item.cantidad}</span>
                            <button className="h-5 w-5 flex items-center justify-center bg-[#181818] rounded" onClick={() => updateQty(i, 1)}><Plus className="w-2.5 h-2.5" /></button>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <div className="font-display font-black text-[#c8952e] text-base">{Utils.fmtUSD(item.subtotalUSD)}</div>
                          </div>
                          <button className="text-[#5a5650] hover:text-[#e04848] p-1" onClick={() => updateQty(i, -item.cantidad)}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-foot p-2 bg-[#131313] border-t border-[#2a2a2a]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-[8px] text-[#5a5650] uppercase tracking-widest font-bold mb-0.5">Total Factura</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-display font-black text-[#c8952e]">{Utils.fmtUSD(subtotalUSD)}</div>
                        <div className="text-sm text-[#8a847c] font-bold">{Utils.fmtBS(totalBS)}</div>
                      </div>
                    </div>
                    
                    <div className="w-1/3">
                      <button 
                        className="btn btn-primary w-full h-10 justify-center text-xs uppercase font-black tracking-widest disabled:opacity-20" 
                        disabled={state.carrito.length === 0 || saldoRestanteUSD > 0.01}
                        onClick={ejecutarVenta}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Procesar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        <div className="card shadow-xl animate-in fade-in flex-1 overflow-hidden">
          <div className="card-head py-2 px-3"><h3>Historial Reciente</h3></div>
          <div className="table-wrap flex-1 overflow-y-auto">
            <table>
              <thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Monto USD</th><th>Método</th></tr></thead>
              <tbody>
                {[...state.ventas].reverse().map(v => (
                  <tr key={v.id}>
                    <td className="mono text-[9px] opacity-50">{v.id.slice(-6).toUpperCase()}</td>
                    <td>{Utils.fmtFecha(v.fecha)}</td>
                    <td>{v.cliente}</td>
                    <td className="mono text-[#c8952e] font-bold">{Utils.fmtUSD(v.totalUSD)}</td>
                    <td><span className="badge badge-neutral uppercase text-[8px]">{Utils.metodoLabel(v.metodoPago)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMultiModal && (
        <div className="modal show">
          <div className="modal-bg" onClick={() => setShowMultiModal(false)}></div>
          <div className="modal-box max-w-[320px]">
            <div className="modal-head py-2 px-4">
              <h3 className="text-xs font-bold uppercase tracking-widest">Abono</h3>
              <button onClick={() => setShowMultiModal(false)}><X className="w-3 h-3"/></button>
            </div>
            <div className="modal-body p-4 space-y-4">
              <div className="bg-[#181818] p-3 rounded-lg text-center border border-[#2a2a2a]">
                <p className="text-[8px] uppercase opacity-50 mb-0.5 font-bold">Pendiente</p>
                <p className="text-xl font-display font-black text-[#3a9bdc]">{Utils.fmtUSD(saldoRestanteUSD)}</p>
                <p className="text-[10px] opacity-40 font-bold">{Utils.fmtBS(saldoRestanteBS)}</p>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-[9px] uppercase font-bold text-[#8a847c] mb-1">Método</label>
                <select className="form-select h-8 text-xs" value={metodoActual} onChange={e => setMetodoActual(e.target.value as any)}>
                  <option value="efectivo_usd">Efectivo USD</option>
                  <option value="efectivo_bs">Efectivo BS</option>
                  <option value="punto_venta">Punto de Venta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-[9px] uppercase font-bold text-[#8a847c] mb-1">
                  Monto ({metodoActual === 'efectivo_usd' ? 'USD' : 'BS'})
                </label>
                <input 
                  type="number" 
                  className="form-input h-10 text-base font-black text-[#c8952e]" 
                  placeholder={metodoActual === 'efectivo_usd' ? saldoRestanteUSD.toFixed(2) : saldoRestanteBS.toFixed(2)}
                  value={montoInput}
                  onChange={e => setMontoInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPago()}
                  autoFocus
                />
              </div>

              <button className="btn btn-primary w-full h-10 justify-center font-black uppercase text-[10px]" onClick={addPago}>
                Confirmar Abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
