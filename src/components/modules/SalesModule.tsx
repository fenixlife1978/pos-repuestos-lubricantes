
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AppState, SaleItem, Sale } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Receipt, Barcode } from 'lucide-react';

export default function SalesModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [cliente, setCliente] = useState('Consumidor final');
  const [metodo, setMetodo] = useState('efectivo_usd');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filtrado para la lista de resultados rápidos de búsqueda
  const matches = search.length > 1 
    ? state.productos.filter(p => 
        p.activo && 
        (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 5)
    : [];

  const subtotalUSD = state.carrito.reduce((s, i) => s + i.subtotalUSD, 0);
  const totalBS = subtotalUSD * state.tasa;

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
  };

  const ejecutarVenta = () => {
    if (state.carrito.length === 0) return;
    
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
      totalBS: subtotalUSD * state.tasa,
      metodoPago: metodo as any,
      estado: 'completada'
    };

    updateState({
      productos: nuevosProductos,
      movimientos: nuevosMovimientos,
      ventas: [...state.ventas, nuevaVenta],
      carrito: []
    });
    
    setCliente('Consumidor final');
    alert('Venta procesada con éxito');
  };

  // Manejar Enter en la búsqueda para añadir el primer resultado (útil para escáneres)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && matches.length === 1) {
      agregar(matches[0].id);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="flex gap-2 no-print">
        <button className={`btn btn-sm ${!showHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowHistory(false)}>
          <ShoppingCart className="w-3.5 h-3.5" /> Punto de Venta
        </button>
        <button className={`btn btn-sm ${showHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowHistory(true)}>
          <Receipt className="w-3.5 h-3.5" /> Historial
        </button>
      </div>

      {!showHistory ? (
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* BARRA DE BÚSQUEDA INTELIGENTE */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c8952e] z-10">
              <Barcode className="w-6 h-6" />
            </div>
            <input 
              ref={searchInputRef}
              className="form-input pl-14 py-6 text-lg bg-[#131313] border-[#c8952e]/30 focus:border-[#c8952e] shadow-xl shadow-black/20" 
              placeholder="Escanee código o busque producto..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            
            {/* Resultados rápidos de búsqueda */}
            {matches.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#1e1e1e] border border-[#2a2a2a] rounded-b-lg shadow-2xl z-[100] mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                {matches.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => agregar(p.id)}
                    className="flex items-center justify-between p-4 hover:bg-[#c8952e]/10 cursor-pointer border-b border-[#2a2a2a] last:border-0 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-sm">{p.nombre}</div>
                      <div className="text-[10px] text-[#5a5650] mono uppercase">{p.codigo} • {p.categoria}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#c8952e] font-display font-bold">{Utils.fmtUSD(p.precioUSD)}</div>
                      <div className="text-[10px] text-[#5a5650]">{p.stock} disponibles</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ÁREA DEL CARRITO EXPANDIDA */}
          <div className="card flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="card-head bg-[#131313]/50">
              <h3 className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#c8952e]" /> Carrito de Venta
              </h3>
              <button className="btn btn-sm btn-secondary text-[#e04848]" onClick={() => updateState({ carrito: [] })}>
                <Trash2 className="w-3.5 h-3.5" /> Vaciar
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {state.carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale py-20">
                  <ShoppingCart className="w-20 h-20 mb-4" />
                  <p className="text-lg font-display uppercase tracking-widest">Esperando productos...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {state.carrito.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-[#0b0b0b] rounded-md border border-[#2a2a2a] hover:border-[#c8952e]/30 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold text-sm uppercase">{item.nombre}</div>
                        <div className="text-[11px] text-[#5a5650] mono">{Utils.fmtUSD(item.precioUnitUSD)} c/u</div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-[#131313] rounded p-1.5 border border-[#2a2a2a]">
                        <button className="btn-icon btn-sm h-6 w-6 hover:bg-[#1e1e1e]" onClick={() => updateQty(i, -1)}><Minus className="w-3 h-3" /></button>
                        <span className="w-8 text-center text-sm font-bold font-display">{item.cantidad}</span>
                        <button className="btn-icon btn-sm h-6 w-6 hover:bg-[#1e1e1e]" onClick={() => updateQty(i, 1)}><Plus className="w-3 h-3" /></button>
                      </div>
                      
                      <div className="text-right min-w-[90px]">
                        <div className="font-display font-bold text-[#c8952e]">{Utils.fmtUSD(item.subtotalUSD)}</div>
                        <div className="text-[10px] text-[#5a5650]">{Utils.fmtBS(item.subtotalUSD * state.tasa)}</div>
                      </div>
                      
                      <button className="text-[#5a5650] hover:text-[#e04848] transition-colors p-1" onClick={() => updateQty(i, -item.cantidad)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CONTROLES DE PAGO INTEGRADOS */}
            <div className="p-6 bg-[#131313] border-t border-[#2a2a2a] grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px] uppercase tracking-wider">Cliente</label>
                    <input className="form-input h-11" placeholder="Nombre" value={cliente} onChange={e => setCliente(e.target.value)} />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px] uppercase tracking-wider">Método</label>
                    <select className="form-select h-11" value={metodo} onChange={e => setMetodo(e.target.value)}>
                      <option value="efectivo_usd">Efectivo USD</option>
                      <option value="efectivo_bs">Efectivo BS</option>
                      <option value="punto_venta">Punto de Venta</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b0b0b] p-4 rounded-lg border border-[#c8952e]/20 flex flex-col items-end">
                <div className="text-[10px] text-[#5a5650] uppercase tracking-widest mb-1">Total de la Venta</div>
                <div className="text-3xl font-display font-black text-[#c8952e] leading-none mb-1">
                  {Utils.fmtUSD(subtotalUSD)}
                </div>
                <div className="text-sm text-[#8a847c] mono">
                  {Utils.fmtBS(totalBS)}
                </div>
                
                <button 
                  className="btn btn-primary w-full mt-4 h-14 justify-center text-lg uppercase tracking-tighter disabled:opacity-30 shadow-lg shadow-[#c8952e]/10" 
                  disabled={state.carrito.length === 0}
                  onClick={ejecutarVenta}
                >
                  <CreditCard className="w-5 h-5 mr-2" /> Procesar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card shadow-xl animate-in fade-in">
          <div className="card-head">
            <h3>Historial Reciente</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Monto USD</th>
                  <th>Monto BS</th>
                  <th>Método</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.ventas.length === 0 ? (
                   <tr><td colSpan={7} className="text-center py-20 opacity-30 italic">No hay ventas registradas</td></tr>
                ) : (
                  [...state.ventas].reverse().map(v => (
                    <tr key={v.id}>
                      <td className="mono text-[10px] opacity-50">{v.id.slice(-6).toUpperCase()}</td>
                      <td>{Utils.fmtFecha(v.fecha)}</td>
                      <td>{v.cliente}</td>
                      <td className="mono text-[#c8952e] font-bold">{Utils.fmtUSD(v.totalUSD)}</td>
                      <td className="mono text-[11px] opacity-70">{Utils.fmtBS(v.totalBS)}</td>
                      <td><span className="badge badge-neutral uppercase text-[10px]">{Utils.metodoLabel(v.metodoPago)}</span></td>
                      <td className="text-right">
                        <button className="btn btn-sm btn-secondary hover:text-[#c8952e]" onClick={() => alert('Próximamente: Imprimir Ticket')}>
                          <Receipt className="w-3.5 h-3.5" /> Ticket
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

