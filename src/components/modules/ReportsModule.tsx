
"use client";

import React, { useState } from 'react';
import { AppState } from '@/lib/types';
import { Utils } from '@/lib/db-store';
import { FileText, TrendingUp, Calendar } from 'lucide-react';

export default function ReportsModule({ state }: { state: AppState }) {
  const [tab, setTab] = useState('ventas');
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  
  // Filtrado de Ventas por Fecha
  const ventasFiltradas = state.ventas.filter(v => v.fecha >= desde && v.fecha <= hasta);
  const totalVentasUSD = ventasFiltradas.reduce((s, v) => s + v.totalUSD, 0);
  
  // Rentabilidad
  const totalCostoVentas = ventasFiltradas.reduce((s, v) => {
    return s + v.items.reduce((si, item) => {
      const p = state.productos.find(x => x.id === item.productoId);
      return si + (p ? p.costoUSD * item.cantidad : 0);
    }, 0);
  }, 0);
  const gananciaNeta = totalVentasUSD - totalCostoVentas;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Navegación de Reportes */}
      <div className="tabs flex border-b border-[#2a2a2a] mb-6 overflow-x-auto no-print">
        <button onClick={() => setTab('ventas')} className={`px-6 py-3 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'ventas' ? 'border-[#c8952e] text-[#c8952e]' : 'border-transparent text-white hover:text-[#c8952e]'}`}>
          <div className="flex items-center gap-2"><FileText className="w-4 h-4"/> Reporte de Ventas</div>
        </button>
        <button onClick={() => setTab('rentabilidad')} className={`px-6 py-3 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'rentabilidad' ? 'border-[#c8952e] text-[#c8952e]' : 'border-transparent text-white hover:text-[#c8952e]'}`}>
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Análisis de Rentabilidad</div>
        </button>
      </div>

      {/* Contenido Ventas */}
      {tab === 'ventas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="card p-4 bg-[#131313] border-[#2a2a2a] flex flex-wrap gap-4 items-end">
            <div className="form-group mb-0">
              <label className="text-white text-[10px] font-black uppercase block mb-1">Fecha Inicial (Desde)</label>
              <input type="date" className="form-input bg-[#0b0b0b] text-white border-[#2a2a2a] h-10 px-3" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="form-group mb-0">
              <label className="text-white text-[10px] font-black uppercase block mb-1">Fecha Final (Hasta)</label>
              <input type="date" className="form-input bg-[#0b0b0b] text-white border-[#2a2a2a] h-10 px-3" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
            <div className="flex-1 text-right">
              <button className="btn btn-secondary h-10 text-white font-bold" onClick={() => window.print()}>Imprimir Reporte</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="kpi amber bg-[#c8952e]/10 border-[#c8952e]/20 p-6 rounded-xl border">
               <div className="text-white text-[10px] font-black uppercase mb-2">Total Ventas en Periodo (USD)</div>
               <div className="text-4xl font-black text-[#c8952e]">{Utils.fmtUSD(totalVentasUSD)}</div>
               <div className="text-white text-sm font-bold mt-1">{Utils.fmtBS(totalVentasUSD * state.tasa)}</div>
             </div>
             <div className="kpi bg-[#181818] border-[#2a2a2a] p-6 rounded-xl border">
               <div className="text-white text-[10px] font-black uppercase mb-2">Operaciones Registradas</div>
               <div className="text-4xl font-black text-white">{ventasFiltradas.length}</div>
               <div className="text-white text-xs font-bold mt-1 uppercase">Transacciones Totales</div>
             </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-head px-5 py-3 border-b border-[#2a2a2a] bg-[#181818]">
              <h3 className="text-white font-black text-xs uppercase tracking-widest">Listado Detallado de Facturación</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead className="bg-[#0b0b0b]">
                  <tr>
                    <th className="text-white font-black text-[10px] uppercase">Fecha</th>
                    <th className="text-white font-black text-[10px] uppercase">Cliente</th>
                    <th className="text-white font-black text-[10px] uppercase">Método Pago</th>
                    <th className="text-white font-black text-[10px] uppercase text-right">Monto (USD)</th>
                    <th className="text-white font-black text-[10px] uppercase text-right">Monto (BS)</th>
                  </tr>
                </thead>
                <tbody className="bg-[#131313]">
                  {ventasFiltradas.map(v => (
                    <tr key={v.id} className="border-b border-white/5">
                      <td className="text-white font-bold text-xs">{Utils.fmtFecha(v.fecha)}</td>
                      <td className="text-white font-bold text-xs uppercase">{v.cliente}</td>
                      <td className="text-white font-bold text-[10px] uppercase">{Utils.metodoLabel(v.metodoPago)}</td>
                      <td className="text-[#c8952e] font-black text-xs text-right">{Utils.fmtUSD(v.totalUSD)}</td>
                      <td className="text-white font-bold text-xs text-right">{Utils.fmtBS(v.totalBS)}</td>
                    </tr>
                  ))}
                  {ventasFiltradas.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-white font-black uppercase italic opacity-40">No se encontraron ventas para este periodo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Rentabilidad */}
      {tab === 'rentabilidad' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi bg-[#181818] border-[#2a2a2a] p-6 rounded-xl border">
              <div className="text-white text-[10px] font-black uppercase mb-2">Ingreso Bruto (Ventas)</div>
              <div className="text-3xl font-black text-white">{Utils.fmtUSD(totalVentasUSD)}</div>
            </div>
            <div className="kpi bg-[#181818] border-[#2a2a2a] p-6 rounded-xl border">
              <div className="text-white text-[10px] font-black uppercase mb-2">Costo de Inversión (CPP)</div>
              <div className="text-3xl font-black text-[#e04848]">{Utils.fmtUSD(totalCostoVentas)}</div>
            </div>
            <div className="kpi bg-[#27ae60]/10 border-[#27ae60]/20 p-6 rounded-xl border">
              <div className="text-white text-[10px] font-black uppercase mb-2">Margen de Ganancia Neta</div>
              <div className="text-4xl font-black text-[#27ae60]">{Utils.fmtUSD(gananciaNeta)}</div>
              <div className="text-white text-xs font-bold mt-1">Margen Real: {totalVentasUSD > 0 ? ((gananciaNeta/totalVentasUSD)*100).toFixed(2) : 0}%</div>
            </div>
          </div>
          <div className="card bg-[#181818] border-[#2a2a2a] p-8 text-center">
            <p className="text-white font-bold uppercase tracking-widest text-xs opacity-80">La rentabilidad se calcula basándose en el Costo Promedio Ponderado (CPP) registrado en el sistema.</p>
          </div>
        </div>
      )}
    </div>
  );
}
