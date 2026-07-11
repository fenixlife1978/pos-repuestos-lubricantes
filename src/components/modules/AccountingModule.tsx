"use client";

import React, { useState, useMemo } from 'react';
import { AppState, LibroDiarioEntry, PaymentMethod } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  BookOpen, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Calendar,
  Wallet,
  DollarSign,
  Briefcase,
  Lightbulb,
  Scale,
  X
} from 'lucide-react';
import { exportarPDFLibroDiario } from '@/lib/pdf-generator';

export default function AccountingModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    concepto: '',
    montoUSD: '',
    categoria: 'NOMINA' as any,
    metodo: 'efectivo_usd' as PaymentMethod
  });

  const diario = (state.libroDiario || []).filter(e => {
    const d = e.fecha.slice(0, 10);
    const matchesDate = d >= desde && d <= hasta;
    const matchesSearch = e.concepto.toLowerCase().includes(search.toLowerCase()) || 
                         e.categoria.toLowerCase().includes(search.toLowerCase());
    return matchesDate && matchesSearch;
  }).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const totalIngresos = diario.filter(e => e.tipo === 'ingreso').reduce((s, e) => s + e.montoUSD, 0);
  const totalEgresos = diario.filter(e => e.tipo === 'egreso').reduce((s, e) => s + e.montoUSD, 0);
  const balanceNeto = totalIngresos - totalEgresos;

  const handleSaveExpense = () => {
    if (!formData.concepto || !formData.montoUSD) return alert('Datos incompletos');
    const mUSD = parseFloat(formData.montoUSD) || 0;
    
    const entry: LibroDiarioEntry = {
      id: 'ACC-' + Store.uid().toUpperCase().slice(0, 5),
      fecha: Utils.ahora(),
      tipo: 'egreso',
      categoria: formData.categoria,
      concepto: formData.concepto.toUpperCase(),
      montoUSD: mUSD,
      montoBS: mUSD * state.tasa,
      metodo: formData.metodo,
      referencia: 'MANUAL'
    };

    updateState({ libroDiario: [entry, ...(state.libroDiario || [])] });
    setShowModal(false);
    setFormData({ concepto: '', montoUSD: '', categoria: 'NOMINA', metodo: 'efectivo_usd' });
  };

  const eliminarAsiento = (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este asiento manual? Los automáticos de ventas/compras deben ser auditados desde sus módulos.')) return;
    updateState({ libroDiario: state.libroDiario.filter(e => e.id !== id) });
  };

  const handleExport = () => {
    exportarPDFLibroDiario(diario, state.empresa, { totalIngresos, totalEgresos, balanceNeto });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-ink font-black uppercase italic tracking-tighter text-2xl flex items-center gap-2">
            <BookOpen className="text-brand-gold w-7 h-7" /> LIBRO DIARIO DE CONTABILIDAD
          </h2>
          <p className="text-[10px] text-ink font-bold uppercase tracking-widest opacity-60">Control de Flujo de Efectivo Real (Ingresos vs Egresos)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-secondary h-11 px-6 font-black uppercase text-xs flex items-center gap-2 shadow-md">
            <FileText className="w-4 h-4" /> Exportar Diario
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary h-11 px-6 font-black uppercase text-xs flex items-center gap-2 shadow-lg">
            <Plus className="w-4 h-4" /> Registrar Gasto Manual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="kpi bg-white border-line p-6 rounded-2xl shadow-sm border-l-[6px] border-l-status-success">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60 flex justify-between">
            Ingresos Totales <ArrowUpCircle className="w-3.5 h-3.5 text-status-success" />
          </div>
          <div className="text-3xl font-black text-status-success">{Utils.fmtUSD(totalIngresos)}</div>
          <div className="text-xs font-bold text-ink/40 mt-1 uppercase">Entradas Reales</div>
        </div>
        <div className="kpi bg-white border-line p-6 rounded-2xl shadow-sm border-l-[6px] border-l-status-danger">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60 flex justify-between">
            Egresos Totales <ArrowDownCircle className="w-3.5 h-3.5 text-status-danger" />
          </div>
          <div className="text-3xl font-black text-status-danger">{Utils.fmtUSD(totalEgresos)}</div>
          <div className="text-xs font-bold text-ink/40 mt-1 uppercase">Salidas de Dinero</div>
        </div>
        <div className="kpi bg-ink text-white p-6 rounded-2xl shadow-xl border-l-[6px] border-l-brand-gold">
          <div className="text-white/40 text-[10px] font-black uppercase mb-1 flex justify-between">
            Balance Neto <Scale className="w-3.5 h-3.5 text-brand-gold" />
          </div>
          <div className={`text-3xl font-black ${balanceNeto >= 0 ? 'text-brand-gold' : 'text-status-danger'}`}>
            {Utils.fmtUSD(balanceNeto)}
          </div>
          <div className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest">Utilidad Operativa en Caja</div>
        </div>
      </div>

      <div className="card bg-white border-line p-5 flex flex-wrap gap-6 items-end shadow-sm no-print">
         <div className="form-group mb-0">
            <label className="text-[9px] font-black text-ink/40 uppercase block mb-1">Desde</label>
            <input type="date" className="form-input h-9 text-xs font-bold w-36" value={desde} onChange={e => setDesde(e.target.value)} />
         </div>
         <div className="form-group mb-0">
            <label className="text-[9px] font-black text-ink/40 uppercase block mb-1">Hasta</label>
            <input type="date" className="form-input h-9 text-xs font-bold w-36" value={hasta} onChange={e => setHasta(e.target.value)} />
         </div>
         <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink/30" />
            <input className="form-input pl-10 h-9 text-xs font-bold uppercase" placeholder="Buscar concepto o categoría..." value={search} onChange={e => setSearch(e.target.value)} />
         </div>
      </div>

      <div className="card bg-white border-line shadow-lg overflow-hidden rounded-xl">
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-ink text-white">
                <th className="text-[10px] font-black uppercase py-4 px-6">Fecha y Hora</th>
                <th className="text-[10px] font-black uppercase py-4">Concepto / Categoría</th>
                <th className="text-[10px] font-black uppercase py-4">Método</th>
                <th className="text-[10px] font-black uppercase py-4 text-right">Ingreso ($)</th>
                <th className="text-[10px] font-black uppercase py-4 text-right">Egreso ($)</th>
                <th className="text-[10px] font-black uppercase py-4 px-6 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {diario.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-24 text-ink/20 font-black italic uppercase">No existen movimientos contables en este periodo</td></tr>
              ) : (
                diario.map(e => (
                  <tr key={e.id} className="border-b border-line/30 hover:bg-surface-warm/20 transition-colors">
                    <td className="py-4 px-6 text-xs font-bold text-ink">
                      {Utils.fmtFecha(e.fecha)} <span className="text-ink/40 ml-1">{e.fecha.split('T')[1].slice(0, 5)}</span>
                    </td>
                    <td className="py-4">
                       <div className="text-ink font-black text-xs uppercase">{e.concepto}</div>
                       <div className="text-ink/50 text-[9px] font-bold uppercase tracking-widest">{e.categoria}</div>
                    </td>
                    <td className="py-4">
                      <span className="badge badge-neutral text-[9px] font-black uppercase">{Utils.metodoLabel(e.metodo)}</span>
                    </td>
                    <td className="py-4 text-right">
                      {e.tipo === 'ingreso' ? <span className="font-black text-status-success">{Utils.fmtUSD(e.montoUSD)}</span> : '-'}
                    </td>
                    <td className="py-4 text-right">
                      {e.tipo === 'egreso' ? <span className="font-black text-status-danger">-{Utils.fmtUSD(e.montoUSD)}</span> : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                       {e.referencia === 'MANUAL' ? (
                         <button onClick={() => eliminarAsiento(e.id)} className="text-ink/20 hover:text-status-danger transition-colors p-2"><Trash2 className="w-4 h-4" /></button>
                       ) : (
                         <span className="text-[8px] font-black text-ink/20 uppercase">Auto</span>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GASTO MANUAL */}
      {showModal && (
        <div className="modal show"><div className="modal-bg" onClick={() => setShowModal(false)}></div>
          <div className="modal-box bg-white max-w-md border-2 border-line rounded-2xl overflow-hidden shadow-2xl">
            <div className="modal-head py-4 px-6 bg-ink border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-status-danger" /> Registrar Egreso de Caja
              </h3>
              <button onClick={() => setShowModal(false)}><X className="text-white/40 hover:text-white" /></button>
            </div>
            <div className="modal-body p-8 space-y-6">
               <div className="form-group">
                 <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Categoría del Gasto</label>
                 <select className="form-select h-11 text-xs font-black uppercase border-line" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                   <option value="NOMINA">Nómina (Sueldos y Salarios)</option>
                   <option value="SERVICIOS">Servicios Básicos (Luz, Agua, Internet)</option>
                   <option value="IMPUESTOS">Impuestos / Tasas Municipales</option>
                   <option value="OTROS_GASTOS">Gastos Administrativos / Otros</option>
                 </select>
               </div>
               <div className="form-group">
                 <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Concepto Detallado</label>
                 <input className="form-input h-11 text-xs font-black uppercase" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} placeholder="EJ: PAGO SEMANA JUNIO - JUAN PEREZ" />
               </div>
               <div className="grid grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Monto ($)</label>
                    <input className="form-input h-11 text-lg font-black text-status-danger" type="number" value={formData.montoUSD} onChange={e => setFormData({...formData, montoUSD: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Método Pago</label>
                    <select className="form-select h-11 text-[10px] font-black uppercase" value={formData.metodo} onChange={e => setFormData({...formData, metodo: e.target.value as any})}>
                      <option value="efectivo_usd">Efectivo USD</option>
                      <option value="efectivo_bs">Efectivo BS</option>
                      <option value="pagomovil">Pago Movil</option>
                      <option value="zelle">Zelle</option>
                    </select>
                  </div>
               </div>
               <button onClick={handleSaveExpense} className="btn btn-primary w-full h-14 font-black uppercase text-xs shadow-xl tracking-widest">Confirmar Gasto y Asentar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}