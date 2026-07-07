
"use client";

import React, { useState, useRef } from 'react';
import { AppState, SaleItem, Sale, PaymentMethod, Product, Movimiento } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Receipt, 
  Barcode, 
  Wallet, 
  X, 
  CheckCircle2, 
  FileText,
  RotateCcw,
  History,
  ClipboardList,
  UserPlus
} from 'lucide-react';

interface PagoRealizado {
  metodo: PaymentMethod;
  montoUSD: number;
  montoBS: number;
}

export default function SalesModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pos' | 'history' | 'credits' | 'returns'>('pos');
  const [showReport, setShowReport] = useState<'Y' | 'Z' | null>(null);
  const [cliente, setCliente] = useState('Consumidor final');
  
  const [pagos, setPagos] = useState<PagoRealizado[]>([]);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [metodoActual, setMetodoActual] = useState<PaymentMethod>('efectivo_usd');
  const [montoInput, setMontoInput] = useState('');

  const [clienteCredito, setClienteCredito] = useState({ nombre: '', rif: '', telefono: '' });
  const [busquedaCliente, setBusquedaCliente] = useState('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const subtotalUSD = state.carrito.reduce((s, i) => s + i.subtotalUSD, 0);
  const totalBS = subtotalUSD * state.tasa;
  const totalPagadoUSD = pagos.reduce((s, p) => s + p.montoUSD, 0);
  const saldoRestanteUSD = Math.max(0, subtotalUSD - totalPagadoUSD);
  const saldoRestanteBS = saldoRestanteUSD * state.tasa;

  const matches = search.trim().length > 0 
    ? state.productos
        .filter(p => p.activo && (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase())))
        .sort((a, b) => {
          const s = search.toLowerCase();
          if (a.codigo.toLowerCase() === s) return -1;
          return 0;
        }).slice(0, 8)
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
    setPagos([]);
  };

  const addPago = () => {
    let monto = parseFloat(montoInput);
    if (isNaN(monto) || monto <= 0) {
      monto = metodoActual === 'efectivo_usd' ? saldoRestanteUSD : saldoRestanteBS;
    }
    let montoUSD = (metodoActual === 'efectivo_usd' || metodoActual === 'zelle') ? monto : monto / state.tasa;
    let montoBS = (metodoActual === 'efectivo_usd' || metodoActual === 'zelle') ? monto * state.tasa : monto;
    
    if (montoUSD > (saldoRestanteUSD + 0.01)) return alert("El monto excede el saldo pendiente.");
    
    setPagos([...pagos, { metodo: metodoActual, montoUSD, montoBS }]);
    setMontoInput('');
    setShowMultiModal(false);
  };

  const ejecutarVenta = () => {
    if (state.carrito.length === 0) return;
    if (saldoRestanteUSD > 0.01) {
      setShowCreditModal(true);
      return;
    }
    procesarVentaFinal('completada');
  };

  const procesarVentaFinal = (estado: any, cxcId: string | null = null, nombreClienteOverride: string | null = null) => {
    const ventaId = 'FAC-' + Store.uid().toUpperCase().slice(0, 6);
    
    const nuevosProductos = state.productos.map(p => {
      const item = state.carrito.find(i => i.productoId === p.id);
      return item ? { ...p, stock: p.stock - item.cantidad } : p;
    });

    const nuevaVenta: Sale = {
      id: ventaId, 
      fecha: Utils.hoy(), 
      cliente: nombreClienteOverride || cliente, 
      items: [...state.carrito],
      subtotalUSD, 
      descuentoUSD: 0, 
      totalUSD: subtotalUSD, 
      totalBS,
      metodoPago: pagos.length > 1 ? 'mixto' : (pagos[0]?.metodo || (cxcId ? 'credito' : 'efectivo_usd')), 
      estado: estado,
      cuentaCobrarId: cxcId
    };

    updateState({
      productos: nuevosProductos,
      ventas: [...state.ventas, nuevaVenta],
      carrito: [],
      acumuladoHistorico: state.acumuladoHistorico + subtotalUSD
    });

    setPagos([]);
    setCliente('Consumidor final');
    setShowCreditModal(false);
    alert('Venta procesada con éxito');
    setView('history');
  };

  const confirmarCredito = () => {
    if (!clienteCredito.nombre) return alert('Debe indicar el nombre del cliente para el crédito.');
    const cxcId = 'DEU-' + Store.uid().toUpperCase().slice(0, 6);
    const nuevaDeuda = {
      id: cxcId,
      fecha: Utils.hoy(),
      fechaVencimiento: '2099-12-31',
      cliente: clienteCredito.nombre,
      montoUSD: saldoRestanteUSD,
      abonadoUSD: 0,
      saldoUSD: saldoRestanteUSD,
      estado: 'pendiente'
    };
    updateState({ cxc: [...state.cxc, nuevaDeuda] });
    procesarVentaFinal('completada', cxcId, clienteCredito.nombre);
  };

  const registrarAbonoExterno = (cxcId: string, montoUSD: number) => {
    const nuevasDeudas = state.cxc.map(d => {
      if (d.id === cxcId) {
        const nuevoSaldo = d.saldoUSD - montoUSD;
        return { ...d, abonadoUSD: d.abonadoUSD + montoUSD, saldoUSD: nuevoSaldo, estado: nuevoSaldo <= 0 ? 'pagada' : 'pendiente' };
      }
      return d;
    });
    const mov: Movimiento = {
      id: Store.uid(),
      productoId: 'COBRO-DEUDA',
      tipo: 'ajuste_entrada',
      cantidad: 0,
      stockAntes: 0,
      stockDespues: 0,
      fecha: Utils.ahora(),
      referencia: `Abono de cliente a deuda ${cxcId}: $${montoUSD}`
    };
    updateState({ cxc: nuevasDeudas, movimientos: [...state.movimientos, mov] });
    alert('Abono registrado con éxito');
  };

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-120px)] max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex gap-2 no-print shrink-0 overflow-x-auto pb-1">
        <button onClick={() => setView('pos')} className={`btn btn-sm ${view === 'pos' ? 'btn-primary' : 'btn-secondary text-white font-black uppercase'}`}>
          <ShoppingCart className="w-3.5 h-3.5"/> Punto de Venta
        </button>
        <button onClick={() => setView('history')} className={`btn btn-sm ${view === 'history' ? 'btn-primary' : 'btn-secondary text-white font-black uppercase'}`}>
          <History className="w-3.5 h-3.5"/> Historial
        </button>
        <button onClick={() => setView('credits')} className={`btn btn-sm ${view === 'credits' ? 'btn-primary' : 'btn-secondary text-white font-black uppercase'}`}>
          <ClipboardList className="w-3.5 h-3.5"/> Consultar Créditos
        </button>
        <button onClick={() => setShowReport('Y')} className="btn btn-sm btn-secondary text-white font-black uppercase">
          <FileText className="w-3.5 h-3.5"/> Reporte Y
        </button>
        <button onClick={() => setShowReport('Z')} className="btn btn-sm btn-secondary text-white font-black uppercase">
          <Receipt className="w-3.5 h-3.5"/> Reporte Z
        </button>
        <button onClick={() => setView('returns')} className={`btn btn-sm ${view === 'returns' ? 'btn-primary' : 'btn-secondary text-white font-black uppercase'}`}>
          <RotateCcw className="w-3.5 h-3.5"/> Devoluciones
        </button>
      </div>

      {view === 'pos' && (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden animate-in fade-in duration-300">
          <div className="relative group shrink-0">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c8952e] z-10"><Barcode className="w-5 h-5" /></div>
            <input 
              ref={searchInputRef}
              className="form-input pl-14 py-2 text-base bg-[#131313] border-[#c8952e]/30 text-white placeholder-white/40 font-black uppercase" 
              placeholder="Escanee código o busque producto..." value={search} onChange={e => setSearch(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && matches.length >= 1 && agregar(matches[0].id)} autoFocus
            />
            {matches.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#1e1e1e] border border-[#2a2a2a] rounded-b-lg shadow-2xl z-[100] mt-1 overflow-hidden">
                {matches.map(p => (
                  <div key={p.id} onClick={() => agregar(p.id)} className="flex items-center justify-between p-3 hover:bg-[#c8952e]/20 cursor-pointer border-b border-[#2a2a2a]">
                    <div className="text-white text-sm font-black uppercase">{p.nombre} <span className="text-[#c8952e] text-[10px] mono ml-2">[{p.codigo}]</span></div>
                    <div className="text-[#c8952e] font-black text-sm">{Utils.fmtUSD(p.precioUSD)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 gap-3 overflow-hidden">
            <div className="w-1/3 flex flex-col gap-2">
              <div className="card p-4 space-y-4 bg-[#131313] border-[#2a2a2a] h-full flex flex-col">
                <div className="form-group mb-0">
                  <label className="text-white text-[11px] font-black uppercase block mb-1">IDENTIFICACIÓN CLIENTE</label>
                  <input className="form-input h-10 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a] font-black uppercase" value={cliente} onChange={e => setCliente(e.target.value)} />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-white text-[11px] font-black uppercase block mb-2">MÉTODOS APLICADOS</label>
                  <div className="flex-1 p-3 border border-white/10 bg-[#181818] rounded-xl overflow-y-auto space-y-2">
                    {pagos.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-black/40 rounded border border-white/5">
                        <span className="text-white font-black uppercase">{Utils.metodoLabel(p.metodo)}</span>
                        <span className="font-black text-[#c8952e]">{Utils.fmtUSD(p.montoUSD)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 border border-[#3a9bdc]/30 bg-[#3a9bdc]/5 rounded-xl text-center space-y-3">
                  <label className="text-white text-[11px] font-black uppercase block">SALDO RESTANTE</label>
                  <div className="text-3xl font-black text-[#3a9bdc]">{Utils.fmtUSD(saldoRestanteUSD)}</div>
                  <div className="bg-black py-3 rounded-xl border-2 border-white/10">
                    <label className="text-white text-[9px] font-black uppercase block mb-1">EQUIVALENTE A PAGAR</label>
                    <div className="text-3xl font-black text-white">{Utils.fmtBS(saldoRestanteBS)}</div>
                    <button onClick={() => setShowMultiModal(true)} className="btn btn-primary h-8 px-4 mt-2 text-[10px] font-black uppercase">Registrar Abono</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-2/3 flex flex-col gap-2 overflow-hidden">
              <div className="card flex-1 flex flex-col overflow-hidden bg-white border-none shadow-2xl">
                <div className="grid grid-cols-[1fr_90px_70px_80px_90px_90px_40px] gap-2 px-4 py-3 bg-[#131313] text-white text-[10px] font-black uppercase tracking-widest">
                  <div>Descripción</div><div className="text-center">Cant</div><div className="text-center">U.M.</div><div className="text-right">Precio ($)</div><div className="text-right">Precio (Bs)</div><div className="text-right">Total</div><div className="text-center"></div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                  {state.carrito.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-black/20"><ShoppingCart className="w-16 h-16 mb-2"/><p className="font-black uppercase text-xs">Esperando productos...</p></div>
                  ) : (
                    state.carrito.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_90px_70px_80px_90px_90px_40px] gap-2 items-center px-3 py-2 border-b border-black/10 text-black">
                        <div className="flex flex-col min-w-0">
                          <div className="truncate font-black text-xs uppercase text-black">{item.nombre}</div>
                          <div className="text-[10px] font-black text-black">ID: {item.productoId}</div>
                        </div>
                        <div className="flex items-center justify-center gap-2 bg-black/5 rounded-lg p-1">
                          <button onClick={() => updateQty(i, -1)} className="text-black font-black text-sm px-2">-</button>
                          <span className="text-xs font-black">{item.cantidad}</span>
                          <button onClick={() => updateQty(i, 1)} className="text-black font-black text-sm px-2">+</button>
                        </div>
                        <div className="text-center text-[10px] font-black uppercase">UNID.</div>
                        <div className="text-right text-xs font-black">{Utils.fmtUSD(item.precioUnitUSD)}</div>
                        <div className="text-right text-[10px] font-black">{Utils.fmtBS(item.precioUnitUSD * state.tasa)}</div>
                        <div className="text-right text-sm font-black">{Utils.fmtUSD(item.subtotalUSD)}</div>
                        <div className="flex justify-center"><button onClick={() => updateQty(i, -item.cantidad)} className="text-black/40 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-[#131313] border-t border-[#2a2a2a] flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-white text-[11px] font-black uppercase block">TOTAL FACTURA</label>
                    <div className="flex items-baseline gap-3">
                      <div className="text-4xl font-black text-[#c8952e]">{Utils.fmtUSD(subtotalUSD)}</div>
                      <div className="text-lg font-black text-white">{Utils.fmtBS(totalBS)}</div>
                    </div>
                  </div>
                  <button onClick={ejecutarVenta} disabled={state.carrito.length === 0} className="btn btn-primary h-14 px-10 font-black uppercase text-sm disabled:opacity-20 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6"/> PROCESAR VENTA
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="card flex-1 bg-[#131313] border border-[#2a2a2a] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="card-head bg-[#181818] border-b border-[#2a2a2a] px-6 py-4 flex justify-between items-center">
            <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-3"><History className="text-[#c8952e]"/> Historial del Día</h3>
            <button onClick={() => setView('pos')} className="btn btn-secondary text-xs font-black uppercase">Cerrar</button>
          </div>
          <div className="table-wrap flex-1 overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th className="text-white font-black text-[10px] uppercase">Recibo</th>
                  <th className="text-white font-black text-[10px] uppercase">Fecha/Hora</th>
                  <th className="text-white font-black text-[10px] uppercase">Cliente</th>
                  <th className="text-white font-black text-[10px] uppercase">Tipo</th>
                  <th className="text-white font-black text-[10px] uppercase text-right">Total USD</th>
                  <th className="text-white font-black text-[10px] uppercase text-right">Total BS</th>
                </tr>
              </thead>
              <tbody className="bg-[#131313]">
                {state.ventas.map(v => (
                  <tr key={v.id} className="border-b border-white/5">
                    <td className="mono text-[#c8952e] font-black text-xs">{v.id}</td>
                    <td className="text-white font-bold text-xs">{v.fecha}</td>
                    <td className="text-white font-black text-xs uppercase">{v.cliente}</td>
                    <td><span className="badge badge-neutral font-black text-[9px] uppercase">{v.metodoPago}</span></td>
                    <td className="text-[#c8952e] font-black text-xs text-right">{Utils.fmtUSD(v.totalUSD)}</td>
                    <td className="text-white font-black text-xs text-right">{Utils.fmtBS(v.totalBS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'credits' && (
        <div className="card flex-1 bg-[#131313] border border-[#2a2a2a] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="card-head bg-[#181818] border-b border-[#2a2a2a] px-6 py-4 flex justify-between items-center">
            <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-3"><ClipboardList className="text-[#c8952e]"/> Consulta de Créditos</h3>
            <button onClick={() => setView('pos')} className="btn btn-secondary text-xs font-black uppercase">Cerrar</button>
          </div>
          <div className="table-wrap flex-1 overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th className="text-white font-black text-[10px] uppercase">Cliente</th>
                  <th className="text-white font-black text-[10px] uppercase text-right">Monto</th>
                  <th className="text-white font-black text-[10px] uppercase text-right">Saldo</th>
                  <th className="text-white font-black text-[10px] uppercase text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.cxc.filter(d => d.estado !== 'pagada').map(d => (
                  <tr key={d.id} className="border-b border-white/5">
                    <td className="text-white font-black text-xs uppercase">{d.cliente}</td>
                    <td className="text-white font-bold text-xs text-right">{Utils.fmtUSD(d.montoUSD)}</td>
                    <td className="text-[#e04848] font-black text-xs text-right">{Utils.fmtUSD(d.saldoUSD)}</td>
                    <td className="text-center">
                      <button onClick={() => {
                        const m = prompt('Monto en USD:', d.saldoUSD.toString());
                        if (m) registrarAbonoExterno(d.id, parseFloat(m));
                      }} className="btn btn-sm btn-ok font-black text-[9px] uppercase">Abonar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMultiModal && (
        <div className="modal show"><div className="modal-bg" onClick={() => setShowMultiModal(false)}></div>
          <div className="modal-box max-w-[400px] bg-[#1e1e1e] border-2 border-[#c8952e]/40 shadow-2xl">
            <div className="modal-head py-4 px-6 border-b border-white/10"><h3 className="text-white text-sm font-black uppercase">Registrar Pago</h3><button onClick={() => setShowMultiModal(false)}><X className="text-white"/></button></div>
            <div className="modal-body p-6 space-y-5">
              <div className="space-y-2"><label className="text-white text-[11px] font-black uppercase">Método</label>
                <select className="form-select h-12 bg-[#0b0b0b] text-white border-white/20 font-black uppercase" value={metodoActual} onChange={e => setMetodoActual(e.target.value as any)}>
                  <option value="efectivo_usd">Efectivo USD</option><option value="efectivo_bs">Efectivo BS</option><option value="punto_venta">Punto de Venta</option><option value="pagomovil">Pago Movil</option><option value="biopago">Biopago</option><option value="zelle">Zelle</option>
                </select>
              </div>
              <div className="space-y-2"><label className="text-white text-[11px] font-black uppercase">Monto</label>
                <input type="number" className="form-input h-14 text-2xl font-black bg-[#0b0b0b] text-white border-white/20" value={montoInput} onChange={e => setMontoInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPago()} />
              </div>
              <button className="btn btn-primary w-full h-14 font-black uppercase" onClick={addPago}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showCreditModal && (
        <div className="modal show"><div className="modal-bg" onClick={() => setShowCreditModal(false)}></div>
          <div className="modal-box max-w-[450px] bg-[#1e1e1e] border-2 border-[#e04848]/40 shadow-2xl">
            <div className="modal-head py-4 px-6 border-b border-white/10"><h3 className="text-white text-sm font-black uppercase">Venta a Crédito</h3><button onClick={() => setShowCreditModal(false)}><X className="text-white"/></button></div>
            <div className="modal-body p-6 space-y-6">
              <div className="p-4 bg-black/40 rounded-xl space-y-3">
                <input className="form-input h-10 bg-[#0b0b0b] text-white border-white/10 text-xs font-black uppercase" placeholder="Nombre completo" value={clienteCredito.nombre} onChange={e => setClienteCredito({...clienteCredito, nombre: e.target.value})} />
                <input className="form-input h-10 bg-[#0b0b0b] text-white border-white/10 text-xs font-black uppercase" placeholder="RIF/Cédula" value={clienteCredito.rif} onChange={e => setClienteCredito({...clienteCredito, rif: e.target.value})} />
              </div>
              <button className="btn btn-primary w-full h-14 font-black uppercase bg-[#e04848]" onClick={confirmarCredito}>Confirmar Crédito</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="modal show"><div className="modal-bg" onClick={() => setShowReport(null)}></div>
          <div className="modal-box bg-white text-black max-w-[400px] font-mono p-8 text-[11px] leading-tight rounded">
            <div className="text-center space-y-1 mb-6">
              <h3 className="font-black text-base uppercase">{state.empresa.nombre}</h3>
              <p>RIF: {state.empresa.rif}</p>
              <h4 className="font-black border-y-2 border-black py-2 mt-4">REPORTE "{showReport}"</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span>FECHA:</span><span>{Utils.hoy()}</span></div>
              <div className="flex justify-between font-black text-xs"><span>TOTAL VENTAS:</span><span>{Utils.fmtUSD(state.ventas.filter(v => v.fecha === Utils.hoy()).reduce((s, v) => s + v.totalUSD, 0))}</span></div>
              <p className="text-center mt-10">--- FIN DEL DOCUMENTO ---</p>
            </div>
            <button onClick={() => setShowReport(null)} className="btn btn-sm btn-secondary w-full mt-8 no-print font-black uppercase">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
