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
  Barcode, 
  Wallet, 
  X, 
  CheckCircle2, 
  Receipt 
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
    <div className="flex flex-col gap-3 h-[calc(100vh-120px)] max-w-7xl mx-auto w-full overflow-hidden bg-black p-1">
      <div className="flex gap-2 no-print shrink-0">
        <button className={`btn btn-sm ${!showHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowHistory(false)}>
          <ShoppingCart className="w-4 h-4" /> PUNTO DE VENTA
        </button>
        <button className={`btn btn-sm ${showHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowHistory(true)}>
          <Receipt className="w-4 h-4" /> HISTORIAL
        </button>
      </div>

      {!showHistory ? (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <div className="relative group shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#facc15] z-10">
              <Barcode className="w-6 h-6" />
            </div>
            <input 
              ref={searchInputRef}
              className="form-input pl-14 py-3 text-lg bg-[#0a0a0a] border-[#facc15] focus:border-[#fef08a] shadow-xl text-white font-black" 
              placeholder="ESCANEE O BUSQUE PRODUCTO..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && matches.length >= 1 && agregar(matches[0].id)}
              autoFocus
            />
            
            {matches.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#111] border-2 border-[#facc15] rounded-b-lg shadow-2xl z-[100] mt-1 overflow-hidden">
                {matches.map(p => (
                  <div key={p.id} onClick={() => agregar(p.id)} className="flex items-center justify-between p-4 hover:bg-[#facc15]/20 cursor-pointer border-b border-[#333] last:border-0">
                    <div>
                      <div className="font-black text-base text-white">{p.nombre}</div>
                      <div className="text-xs text-white mono uppercase font-black">{p.codigo} • STOCK: {p.stock}</div>
                    </div>
                    <div className="text-[#facc15] font-display font-black text-xl">{Utils.fmtUSD(p.priceUSD || p.precioUSD)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 gap-3 overflow-hidden">
            <div className="w-1/3 flex flex-col gap-2 overflow-hidden">
              <div className="card p-4 space-y-4 bg-[#0a0a0a] border-[#333] h-full flex flex-col">
                <div className="form-group mb-0">
                  <label className="form-label text-xs uppercase font-black text-[#facc15] mb-2 tracking-widest">Identificación Cliente</label>
                  <input className="form-input h-12 text-sm bg-[#000] border-[#444] text-white font-black" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="NOMBRE DEL CLIENTE..." />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-[10px] text-white font-black uppercase tracking-widest block mb-2">Métodos Aplicados</label>
                  <div className="flex-1 p-3 border-2 border-white/10 bg-[#111] rounded-xl overflow-y-auto">
                    {pagos.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-xs border-b border-[#333] py-3 last:border-0">
                        <span className="capitalize text-white font-black">{Utils.metodoLabel(p.metodo)}</span>
                        <span className="font-black text-[#facc15]">{Utils.fmtUSD(p.montoUSD)}</span>
                      </div>
                    ))}
                    {pagos.length === 0 && <div className="text-xs text-white italic py-6 text-center font-black">Sin abonos registrados</div>}
                  </div>
                </div>

                <div className="p-4 border-2 border-[#3498db] bg-[#3498db]/10 rounded-2xl text-center space-y-4 shadow-lg">
                  <div className="flex items-center justify-center gap-4">
                    <label className="text-xs text-[#3498db] font-black uppercase tracking-widest block">Saldo Restante</label>
                    <button 
                      onClick={() => setShowMultiModal(true)}
                      className="btn-icon h-10 w-10 bg-[#facc15] text-black border-2 border-black/20 hover:scale-110 transition-transform"
                    >
                      <Wallet className="w-5 h-5" />
                    </button>
                  </div>
                  <div className={`text-4xl font-display font-black tracking-tighter ${saldoRestanteUSD <= 0.01 ? 'text-[#2ecc71]' : 'text-[#3498db]'}`}>
                    {saldoRestanteUSD <= 0.01 ? 'SALDADO' : Utils.fmtUSD(saldoRestanteUSD)}
                  </div>
                  
                  <div className="bg-[#000000] py-4 px-3 rounded-2xl border-2 border-[#444]">
                    <div className="text-[10px] text-white uppercase font-black mb-2 tracking-widest text-center">EQUIVALENTE A PAGAR (BS)</div>
                    <div className="text-3xl font-display font-black text-white tracking-tighter text-center">
                      {Utils.fmtBS(saldoRestanteBS)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-2/3 flex flex-col gap-2 overflow-hidden">
              <div className="card flex-1 flex flex-col overflow-hidden border-[#333] bg-[#0a0a0a]">
                <div className="grid grid-cols-[1fr_90px_70px_90px_90px_90px_40px] gap-2 px-4 py-3 bg-[#111] border-b-2 border-[#333] text-[10px] uppercase font-black text-white tracking-widest">
                  <div>Descripción</div>
                  <div className="text-center">Cant</div>
                  <div className="text-center">U.M.</div>
                  <div className="text-right">Precio ($)</div>
                  <div className="text-right">Precio (Bs)</div>
                  <div className="text-right">Total</div>
                  <div className="text-center"></div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {state.carrito.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/10">
                      <ShoppingCart className="w-24 h-24 mb-4" />
                      <p className="text-sm uppercase tracking-[0.3em] font-black">Carrito Vacío</p>
                    </div>
                  ) : (
                    state.carrito.map((item, i) => {
                      const product = state.productos.find(p => p.id === item.productoId);
                      return (
                        <div key={i} className="grid grid-cols-[1fr_90px_70px_90px_90px_90px_40px] gap-2 items-center px-3 py-3 bg-[#000] rounded-xl border-2 border-[#333] hover:border-[#facc15] transition-colors">
                          <div className="flex flex-col min-w-0">
                            <div className="truncate font-black text-xs uppercase text-white">{item.nombre}</div>
                            <div className="text-[9px] text-white mono truncate font-black">{item.productoId}</div>
                          </div>
                          <div className="flex items-center justify-center gap-2 bg-[#111] rounded-lg p-1 border border-[#333]">
                            <button className="h-6 w-6 flex items-center justify-center bg-[#222] rounded text-white hover:bg-[#facc15] hover:text-black" onClick={() => updateQty(i, -1)}><Minus className="w-4 h-4" /></button>
                            <span className="w-6 text-center text-sm font-black text-[#facc15]">{item.cantidad}</span>
                            <button className="h-6 w-6 flex items-center justify-center bg-[#222] rounded text-white hover:bg-[#facc15] hover:text-black" onClick={() => updateQty(i, 1)}><Plus className="w-4 h-4" /></button>
                          </div>
                          <div className="text-center text-[10px] text-white font-black">{product?.cantidad || '-'}</div>
                          <div className="text-right text-xs mono font-black text-white">{Utils.fmtUSD(item.precioUnitUSD)}</div>
                          <div className="text-right text-[11px] mono font-black text-[#facc15]">{Utils.fmtBS(item.precioUnitUSD * state.tasa)}</div>
                          <div className="text-right text-sm font-display font-black text-white">{Utils.fmtUSD(item.subtotalUSD)}</div>
                          <div className="flex justify-center">
                            <button className="text-white hover:text-[#ff4d4d] transition-colors p-1" onClick={() => updateQty(i, -item.cantidad)}>
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="card-foot p-4 bg-[#111] border-t-2 border-[#333]">
                  <div className="flex items-center justify-between gap-8">
                    <div className="flex-1">
                      <div className="text-xs text-white uppercase tracking-widest font-black mb-2">Total Factura</div>
                      <div className="flex items-baseline gap-4">
                        <div className="text-4xl font-display font-black text-[#facc15]">{Utils.fmtUSD(subtotalUSD)}</div>
                        <div className="text-lg text-white font-black">{Utils.fmtBS(totalBS)}</div>
                      </div>
                    </div>
                    <div className="w-1/3">
                      <button 
                        className="btn btn-primary w-full h-14 justify-center text-base uppercase font-black tracking-[0.2em] disabled:opacity-20 shadow-2xl" 
                        disabled={state.carrito.length === 0 || saldoRestanteUSD > 0.01}
                        onClick={ejecutarVenta}
                      >
                        <CheckCircle2 className="w-6 h-6 mr-2" /> PROCESAR
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card shadow-2xl animate-in fade-in flex-1 overflow-hidden bg-[#0a0a0a] border-[#333]">
          <div className="card-head py-4 px-5 border-b-2 border-[#333] bg-[#111]">
            <h3 className="text-base font-black text-[#facc15] uppercase tracking-[0.2em]">Historial de Ventas</h3>
          </div>
          <div className="table-wrap flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-[#111] sticky top-0 z-10">
                <tr>
                  <th className="font-black text-xs">ID FACTURA</th>
                  <th className="font-black text-xs">FECHA</th>
                  <th className="font-black text-xs">CLIENTE</th>
                  <th className="font-black text-xs text-right">MONTO USD</th>
                  <th className="font-black text-xs text-center">MÉTODO</th>
                </tr>
              </thead>
              <tbody>
                {[...state.ventas].reverse().map(v => (
                  <tr key={v.id} className="hover:bg-white/5 border-b border-[#222]">
                    <td className="mono text-xs text-[#facc15] font-black">{v.id.slice(-6).toUpperCase()}</td>
                    <td className="text-white font-black text-xs">{Utils.fmtFecha(v.fecha)}</td>
                    <td className="text-white font-black text-xs">{v.cliente}</td>
                    <td className="mono text-[#facc15] font-black text-base text-right">{Utils.fmtUSD(v.totalUSD)}</td>
                    <td className="text-center"><span className="badge badge-neutral text-[10px] font-black">{Utils.metodoLabel(v.metodoPago)}</span></td>
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
          <div className="modal-box max-w-[360px] border-4 border-[#333] bg-[#000]">
            <div className="modal-head py-4 px-6 border-b-2 border-[#333] bg-[#111]">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Abonar a Cuenta</h3>
              <button onClick={() => setShowMultiModal(false)} className="text-white hover:text-[#facc15]"><X className="w-6 h-6"/></button>
            </div>
            <div className="modal-body p-6 space-y-6">
              <div className="bg-[#000] p-5 rounded-2xl text-center border-2 border-[#3498db] shadow-xl">
                <p className="text-[10px] uppercase text-white mb-2 font-black tracking-widest">Saldo Pendiente</p>
                <p className="text-3xl font-display font-black text-[#3498db]">{Utils.fmtUSD(saldoRestanteUSD)}</p>
                <p className="text-sm text-white font-black mt-2">{Utils.fmtBS(saldoRestanteBS)}</p>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-white mb-2 block tracking-widest">Seleccionar Método</label>
                <select className="form-select h-12 text-sm font-black bg-[#111] border-2 border-[#333] text-white" value={metodoActual} onChange={e => setMetodoActual(e.target.value as any)}>
                  <option value="efectivo_usd">EFECTIVO USD</option>
                  <option value="efectivo_bs">EFECTIVO BS.</option>
                  <option value="biopago">BIOPAGO</option>
                  <option value="pagomovil">PAGOMOVIL</option>
                  <option value="punto_venta">PUNTO DE VENTA</option>
                  <option value="zelle">ZELLE</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-white mb-2 block tracking-widest">
                  MONTO ({metodoActual === 'efectivo_usd' ? 'USD' : 'BS'})
                </label>
                <input 
                  type="number" 
                  className="form-input h-14 text-2xl font-black text-[#facc15] bg-[#111] border-2 border-[#333]" 
                  placeholder={metodoActual === 'efectivo_usd' ? saldoRestanteUSD.toFixed(2) : saldoRestanteBS.toFixed(2)}
                  value={montoInput}
                  onChange={e => setMontoInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPago()}
                  autoFocus
                />
              </div>

              <button className="btn btn-primary w-full h-14 justify-center font-black uppercase text-xs tracking-[0.2em] shadow-2xl" onClick={addPago}>
                CONFIRMAR ABONO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}