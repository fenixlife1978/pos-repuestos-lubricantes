
"use client";

import React, { useState } from 'react';
import { AppState } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { Plus, X, Save, HandCoins, Calendar, CheckSquare, Square, Eye, Trash2, Clock } from 'lucide-react';

export default function CxCModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState<any>(null);
  const [showHistory, setShowHistory] = useState<any>(null);

  const [nuevaDeuda, setNuevaDeuda] = useState({
    cliente: '',
    montoUSD: 0,
    fecha: Utils.hoy(),
    vencimiento: Utils.hoy(),
    sinVencimiento: false
  });

  const pendientes = state.cxc.filter(x => x.estado !== 'pagada');
  const totalPendiente = pendientes.reduce((s, x) => s + x.saldoUSD, 0);

  const guardarDeudaDirecta = () => {
    if (!nuevaDeuda.cliente || nuevaDeuda.montoUSD <= 0) {
      alert('Por favor ingrese el cliente y un monto válido.');
      return;
    }
    const nuevaEntrada = {
      id: 'DEU-' + Store.uid().toUpperCase().slice(0, 6),
      fecha: nuevaDeuda.fecha,
      fechaVencimiento: nuevaDeuda.sinVencimiento ? '2099-12-31' : nuevaDeuda.vencimiento,
      cliente: nuevaDeuda.cliente,
      montoUSD: nuevaDeuda.montoUSD,
      abonadoUSD: 0,
      saldoUSD: nuevaDeuda.montoUSD,
      estado: 'pendiente',
      historialPagos: []
    };
    updateState({ cxc: [...state.cxc, nuevaEntrada] });
    setShowModal(false);
    setNuevaDeuda({ cliente: '', montoUSD: 0, fecha: Utils.hoy(), vencimiento: Utils.hoy(), sinVencimiento: false });
  };

  const eliminarDeuda = (deuda: any) => {
    if (!confirm(`¿Seguro que desea eliminar el registro ${deuda.id}? Esta acción no se puede deshacer.`)) return;
    const nuevas = state.cxc.filter(x => x.id !== deuda.id);
    const nuevosClientes = (state.clientes || []).map(c => 
      c.name === deuda.cliente ? { ...c, debt: Math.max(0, (c.debt || 0) - deuda.saldoUSD) } : c
    );
    updateState({ cxc: nuevas, clientes: nuevosClientes });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-black uppercase italic tracking-tighter text-xl">Cobranzas</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary h-10 px-6 font-black uppercase text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Cargar Deuda Inicial
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi amber bg-[#c8952e]/10 border-[#2a2a2a]">
          <div className="text-white text-[10px] font-black uppercase mb-1">Cuentas Pendientes</div>
          <div className="text-3xl font-black text-white">{pendientes.length}</div>
        </div>
        <div className="kpi red bg-[#e04848]/10 border-[#2a2a2a]">
          <div className="text-white text-[10px] font-black uppercase mb-1">Total Por Cobrar (USD)</div>
          <div className="text-3xl font-black text-[#e04848]">{Utils.fmtUSD(totalPendiente)}</div>
          <div className="text-white text-sm font-bold mt-1 italic">{Utils.fmtBS(totalPendiente * state.tasa)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head bg-[#181818] border-b border-[#2a2a2a] px-5 py-3">
          <h3 className="text-white font-black text-xs uppercase tracking-widest">Listado de Cuentas</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-[#0b0b0b]">
                <th className="text-white font-black text-[10px] uppercase">Emisión</th>
                <th className="text-white font-black text-[10px] uppercase">Vencimiento</th>
                <th className="text-white font-black text-[10px] uppercase">Cliente</th>
                <th className="text-white font-black text-[10px] uppercase text-right">Monto USD</th>
                <th className="text-white font-black text-[10px] uppercase text-right">Saldo USD</th>
                <th className="text-white font-black text-[10px] uppercase">Estado</th>
                <th className="text-white font-black text-[10px] uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-[#131313]">
              {state.cxc.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-white font-black uppercase italic opacity-40">No hay registros</td></tr>
              ) : (
                state.cxc.map(x => (
                  <tr key={x.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="text-white font-bold text-xs">{Utils.fmtFecha(x.fecha)}</td>
                    <td className={`text-xs font-bold ${x.fechaVencimiento < Utils.hoy() && x.estado !== 'pagada' ? 'text-[#e04848]' : 'text-white'}`}>
                      {x.fechaVencimiento === '2099-12-31' ? 'ABIERTA' : Utils.fmtFecha(x.fechaVencimiento)}
                    </td>
                    <td className="text-white font-black text-xs uppercase">{x.cliente}</td>
                    <td className="text-white font-bold text-xs text-right">{Utils.fmtUSD(x.montoUSD)}</td>
                    <td className="text-[#c8952e] font-black text-xs text-right">{Utils.fmtUSD(x.saldoUSD)}</td>
                    <td><span className={`badge ${x.estado === 'pagada' ? 'badge-ok' : (x.estado === 'parcial' ? 'badge-info' : 'badge-warn')} font-black text-[9px] uppercase`}>{x.estado}</span></td>
                    <td className="text-center">
                       <div className="flex justify-center gap-1">
                          <button onClick={() => setShowDetails(x)} className="btn-icon h-7 w-7 text-white hover:text-[#c8952e]" title="Ver Detalles"><Eye className="w-3.5 h-3.5"/></button>
                          <button onClick={() => setShowHistory(x)} className="btn-icon h-7 w-7 text-white hover:text-[#3a9bdc]" title="Historial"><Clock className="w-3.5 h-3.5"/></button>
                          <button onClick={() => eliminarDeuda(x)} className="btn-icon h-7 w-7 text-white hover:text-[#e04848]" title="Eliminar"><Trash2 className="w-3.5 h-3.5"/></button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal show">
          <div className="modal-bg" onClick={() => setShowModal(false)}></div>
          <div className="modal-box bg-[#1e1e1e] border-2 border-[#c8952e]/30 max-w-md">
            <div className="modal-head border-b border-white/10 py-4 px-6">
              <h3 className="text-white font-black uppercase text-sm flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-[#c8952e]" /> Cargar Deuda Directa
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-[#c8952e]"><X /></button>
            </div>
            <div className="modal-body p-6 space-y-4">
              <div className="form-group">
                <label className="text-white text-[10px] font-black uppercase block mb-1">Nombre del Cliente</label>
                <input className="form-input bg-[#0b0b0b] text-white border-[#2a2a2a] h-10 px-3 font-black uppercase" value={nuevaDeuda.cliente} onChange={e => setNuevaDeuda({...nuevaDeuda, cliente: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="text-white text-[10px] font-black uppercase block mb-1">Monto (USD)</label>
                <input type="number" className="form-input bg-[#0b0b0b] text-white border-[#c8952e]/40 h-12 px-3 text-xl font-black" value={nuevaDeuda.montoUSD} onChange={e => setNuevaDeuda({...nuevaDeuda, montoUSD: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="flex items-center gap-2 mb-2 p-2 bg-[#0b0b0b] rounded border border-white/10">
                <button type="button" onClick={() => setNuevaDeuda({...nuevaDeuda, sinVencimiento: !nuevaDeuda.sinVencimiento})} className="text-[#c8952e]">
                  {nuevaDeuda.sinVencimiento ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
                <label className="text-white text-[11px] font-black uppercase cursor-pointer" onClick={() => setNuevaDeuda({...nuevaDeuda, sinVencimiento: !nuevaDeuda.sinVencimiento})}>
                  Sin fecha de vencimiento (Deuda abierta)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-white text-[10px] font-black uppercase block mb-1">Origen</label>
                  <input type="date" className="form-input bg-[#0b0b0b] text-white border-[#2a2a2a] h-10 px-2 text-xs font-black" value={nuevaDeuda.fecha} onChange={e => setNuevaDeuda({...nuevaDeuda, fecha: e.target.value})} />
                </div>
                <div className={`form-group ${nuevaDeuda.sinVencimiento ? 'opacity-20 pointer-events-none' : ''}`}>
                  <label className="text-white text-[10px] font-black uppercase block mb-1">Vencimiento</label>
                  <input type="date" className="form-input bg-[#0b0b0b] text-white border-[#2a2a2a] h-10 px-2 text-xs font-black" value={nuevaDeuda.vencimiento} onChange={e => setNuevaDeuda({...nuevaDeuda, vencimiento: e.target.value})} />
                </div>
              </div>
              <button onClick={guardarDeudaDirecta} className="btn btn-primary w-full h-12 font-black uppercase text-xs flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Registrar Deuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES */}
      {showDetails && (
        <div className="modal show"><div className="modal-bg" onClick={() => setShowDetails(null)}></div>
          <div className="modal-box bg-[#1e1e1e] border-2 border-white/20 max-w-lg">
            <div className="modal-head py-3 px-4 border-b border-white/10"><h3 className="text-white text-xs font-black uppercase">DETALLE DE CUENTA - {showDetails.id}</h3><button onClick={() => setShowDetails(null)} className="text-white hover:text-[#c8952e]"><X /></button></div>
            <div className="modal-body p-4 space-y-4">
              <div className="bg-black/40 p-3 rounded border border-white/5 space-y-1">
                <div className="flex justify-between text-[10px] text-white/60"><span>CLIENTE:</span><span className="text-white font-black uppercase">{showDetails.cliente}</span></div>
                <div className="flex justify-between text-[10px] text-white/60"><span>EMISIÓN:</span><span className="text-white font-black">{Utils.fmtFecha(showDetails.fecha)}</span></div>
                <div className="flex justify-between text-sm font-black text-[#c8952e]"><span>TOTAL DEUDA:</span><span>{Utils.fmtUSD(showDetails.montoUSD)}</span></div>
              </div>
              <div className="table-wrap max-h-48 overflow-y-auto">
                <table className="text-[10px]">
                  <thead><tr className="border-b border-white/10"><th className="text-white/40">Item</th><th className="text-white/40 text-center">Cant</th><th className="text-white/40 text-right">Subtotal</th></tr></thead>
                  <tbody>
                    {state.ventas.find(v => v.id === showDetails.id || v.id === showDetails.ventaId)?.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="text-white font-bold uppercase py-2">{it.nombre}</td>
                        <td className="text-white text-center">{it.cantidad}</td>
                        <td className="text-[#c8952e] text-right font-black">{Utils.fmtUSD(it.subtotalUSD)}</td>
                      </tr>
                    )) || (<tr><td colSpan={3} className="text-center py-4 text-white/20 italic uppercase">Detalle de items no disponible (Deuda Directa)</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE ABONOS */}
      {showHistory && (
        <div className="modal show"><div className="modal-bg" onClick={() => setShowHistory(null)}></div>
          <div className="modal-box bg-[#1e1e1e] border-2 border-white/20 max-w-lg">
            <div className="modal-head py-3 px-4 border-b border-white/10"><h3 className="text-white text-xs font-black uppercase">HISTORIAL DE PAGOS - {showHistory.id}</h3><button onClick={() => setShowHistory(null)} className="text-white hover:text-[#c8952e]"><X /></button></div>
            <div className="modal-body p-4 space-y-4">
              <div className="bg-black/40 p-3 rounded border border-white/5 space-y-1">
                <div className="flex justify-between text-[10px] text-white/60"><span>CLIENTE:</span><span className="text-white font-black uppercase">{showHistory.cliente}</span></div>
                <div className="flex justify-between text-[10px] text-white/60"><span>SALDO PENDIENTE:</span><span className="text-[#3a9bdc] font-black">{Utils.fmtUSD(showHistory.saldoUSD)}</span></div>
              </div>
              <div className="table-wrap max-h-60 overflow-y-auto">
                <table className="text-[10px]">
                  <thead><tr className="border-b border-white/10"><th className="text-white/40">Recibo</th><th className="text-white/40">Fecha / Hora</th><th className="text-white/40 text-right">Abono (USD)</th><th className="text-white/40 text-right">Abono (BS)</th></tr></thead>
                  <tbody>
                    {showHistory.historialPagos && showHistory.historialPagos.length > 0 ? (
                      showHistory.historialPagos.map((p: any, idx: number) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="text-white font-black mono py-2">{p.reciboId || '-'}</td>
                          <td className="text-white font-bold py-2">{p.fecha?.replace('T', ' ').slice(0, 16) || '-'}</td>
                          <td className="text-[#27ae60] text-right font-black">{Utils.fmtUSD(p.montoUSD)}</td>
                          <td className="text-white text-right font-black">{Utils.fmtBS(p.montoBS)}</td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan={4} className="text-center py-8 text-white/20 italic uppercase font-black">No se registran abonos aún</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
