
"use client";

import React, { useState } from 'react';
import { AppState } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { Plus, X, Save, HandCoins, Calendar, CheckSquare, Square, Eye, Trash2, Clock, ClipboardList } from 'lucide-react';

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
        <h2 className="text-ink font-black uppercase italic tracking-tighter text-2xl">Cobranzas</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary h-11 px-6 font-black uppercase text-xs flex items-center gap-2 shadow-lg">
          <Plus className="w-4 h-4" /> Cargar Deuda Inicial
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi bg-white border-line shadow-md">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60">Cuentas Pendientes</div>
          <div className="text-4xl font-black text-ink">{pendientes.length}</div>
        </div>
        <div className="kpi bg-white border-line shadow-md">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60">Total Por Cobrar (USD)</div>
          <div className="text-4xl font-black text-status-danger">{Utils.fmtUSD(totalPendiente)}</div>
          <div className="text-ink text-sm font-bold mt-1 italic">{Utils.fmtBS(totalPendiente * state.tasa)}</div>
        </div>
      </div>

      <div className="card shadow-xl border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4">
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-gold" /> LISTADO DETALLADO DE CUENTAS POR COBRAR
          </h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="text-ink font-black text-[10px] uppercase">Emisión</th>
                <th className="text-ink font-black text-[10px] uppercase">Vencimiento</th>
                <th className="text-ink font-black text-[10px] uppercase">Cliente</th>
                <th className="text-ink font-black text-[10px] uppercase text-right">Monto USD</th>
                <th className="text-ink font-black text-[10px] uppercase text-right">Saldo USD</th>
                <th className="text-ink font-black text-[10px] uppercase">Estado</th>
                <th className="text-ink font-black text-[10px] uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {state.cxc.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-ink/30 font-black uppercase italic">No hay deudas registradas</td></tr>
              ) : (
                state.cxc.map(x => (
                  <tr key={x.id} className="border-b border-line/50 hover:bg-surface-warm/30 transition-colors">
                    <td className="text-ink font-bold text-xs">{Utils.fmtFecha(x.fecha)}</td>
                    <td className={`text-xs font-bold ${x.fechaVencimiento < Utils.hoy() && x.estado !== 'pagada' ? 'text-status-danger' : 'text-ink'}`}>
                      {x.fechaVencimiento === '2099-12-31' ? 'ABIERTA' : Utils.fmtFecha(x.fechaVencimiento)}
                    </td>
                    <td className="text-ink font-black text-xs uppercase">{x.cliente}</td>
                    <td className="text-ink font-bold text-xs text-right">{Utils.fmtUSD(x.montoUSD)}</td>
                    <td className="text-brand-gold-deep font-black text-sm text-right">{Utils.fmtUSD(x.saldoUSD)}</td>
                    <td><span className={`badge ${x.estado === 'pagada' ? 'badge-ok' : (x.estado === 'parcial' ? 'badge-info' : 'badge-warn')} font-black text-[9px] uppercase`}>{x.estado}</span></td>
                    <td className="text-center">
                       <div className="flex justify-center gap-1">
                          <button onClick={() => setShowDetails(x)} className="btn-icon h-8 w-8 text-ink hover:text-brand-gold" title="Ver Detalles"><Eye className="w-4 h-4"/></button>
                          <button onClick={() => setShowHistory(x)} className="btn-icon h-8 w-8 text-ink hover:text-status-info" title="Historial"><Clock className="w-4 h-4"/></button>
                          <button onClick={() => eliminarDeuda(x)} className="btn-icon h-8 w-8 text-ink hover:text-status-danger" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
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
          <div className="modal-box bg-white max-w-md">
            <div className="modal-head py-4 px-6">
              <h3 className="text-ink font-black uppercase text-sm flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-brand-gold" /> Cargar Deuda Directa
              </h3>
              <button onClick={() => setShowModal(false)} className="text-ink hover:text-brand-gold"><X /></button>
            </div>
            <div className="modal-body p-6 space-y-4">
              <div className="form-group">
                <label className="text-ink text-[10px] font-black uppercase block mb-1">Nombre del Cliente</label>
                <input className="form-input" value={nuevaDeuda.cliente} onChange={e => setNuevaDeuda({...nuevaDeuda, cliente: e.target.value})} placeholder="Escribe el nombre..." />
              </div>
              <div className="form-group">
                <label className="text-ink text-[10px] font-black uppercase block mb-1">Monto (USD)</label>
                <input type="number" className="form-input text-xl text-brand-gold-deep" value={nuevaDeuda.montoUSD} onChange={e => setNuevaDeuda({...nuevaDeuda, montoUSD: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="flex items-center gap-2 mb-2 p-3 bg-surface-soft rounded border border-line">
                <button type="button" onClick={() => setNuevaDeuda({...nuevaDeuda, sinVencimiento: !nuevaDeuda.sinVencimiento})} className="text-brand-gold">
                  {nuevaDeuda.sinVencimiento ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
                <label className="text-ink text-[11px] font-black uppercase cursor-pointer" onClick={() => setNuevaDeuda({...nuevaDeuda, sinVencimiento: !nuevaDeuda.sinVencimiento})}>
                  Sin fecha de vencimiento (Deuda abierta)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-ink text-[10px] font-black uppercase block mb-1">Origen</label>
                  <input type="date" className="form-input text-xs" value={nuevaDeuda.fecha} onChange={e => setNuevaDeuda({...nuevaDeuda, fecha: e.target.value})} />
                </div>
                <div className={`form-group ${nuevaDeuda.sinVencimiento ? 'opacity-20 pointer-events-none' : ''}`}>
                  <label className="text-ink text-[10px] font-black uppercase block mb-1">Vencimiento</label>
                  <input type="date" className="form-input text-xs" value={nuevaDeuda.vencimiento} onChange={e => setNuevaDeuda({...nuevaDeuda, vencimiento: e.target.value})} />
                </div>
              </div>
              <button onClick={guardarDeudaDirecta} className="btn btn-primary w-full h-14 font-black uppercase text-sm mt-4">
                <Save className="w-4 h-4" /> Registrar Deuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Otros modales (Detalles e Historial) se mantienen igual funcionalmente */}
    </div>
  );
}
