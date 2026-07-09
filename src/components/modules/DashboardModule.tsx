"use client";

import React from 'react';
import { AppState } from '@/lib/types';
import { Utils } from '@/lib/db-store';
import { DollarSign, Package, HandCoins, FileText, ArrowUpRight, TrendingUp, Users } from 'lucide-react';

export default function DashboardModule({ state }: { state: AppState }) {
  const hoy = Utils.hoy();
  const ventasHoy = state.ventas.filter(v => v.fecha === hoy);
  const totalHoyUSD = ventasHoy.reduce((s, v) => s + v.totalUSD, 0);
  
  const cxcPend = state.cxc.filter(x => x.estado !== 'pagada').reduce((s, x) => s + x.saldoUSD, 0);
  const valorInv = state.productos.filter(p => p.activo).reduce((s, p) => s + p.precioUSD * p.stock, 0);
  
  const bajoStock = state.productos.filter(p => p.activo && p.stock <= p.stockMinimo);
  const ultimasVentas = [...state.ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dark Accent Hero Area */}
      <div className="bg-[#141414] rounded-[24px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="relative z-10">
          <p className="text-brand-gold font-bold text-xs uppercase tracking-[0.2em] mb-2">Resumen de hoy</p>
          <h1 className="text-4xl font-extrabold font-display mb-8">¡Bienvenido de nuevo!</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-ink-subtle text-xs font-bold uppercase">Ventas Netas</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black">{Utils.fmtUSD(totalHoyUSD)}</h2>
                <span className="text-status-success text-xs font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> +12%</span>
              </div>
              <p className="text-[10px] text-ink-subtle font-medium">{Utils.fmtBS(totalHoyUSD * state.tasa)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-ink-subtle text-xs font-bold uppercase">Transacciones</p>
              <h2 className="text-3xl font-black">{ventasHoy.length}</h2>
              <p className="text-[10px] text-ink-subtle font-medium">Operaciones del día</p>
            </div>
            <div className="space-y-1">
              <p className="text-ink-subtle text-xs font-bold uppercase">Valor de Activos</p>
              <h2 className="text-3xl font-black text-brand-gold">{Utils.fmtUSD(valorInv)}</h2>
              <p className="text-[10px] text-ink-subtle font-medium">Mercancía en stock</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* KPI Grid */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="kpi-card flex items-center gap-5">
              <div className="w-14 h-14 bg-status-info-soft rounded-2xl flex items-center justify-center text-status-info">
                <HandCoins className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider mb-0.5">Por Cobrar (CxC)</p>
                <h3 className="text-xl font-black text-ink">{Utils.fmtUSD(cxcPend)}</h3>
              </div>
            </div>
            <div className="kpi-card flex items-center gap-5">
              <div className="w-14 h-14 bg-status-success-soft rounded-2xl flex items-center justify-center text-status-success">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider mb-0.5">Eficiencia de Caja</p>
                <h3 className="text-xl font-black text-ink">98.4%</h3>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bento-card">
            <div className="px-6 py-5 bg-surface-warm/30 border-b border-line flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-ink uppercase tracking-tighter">Últimos Movimientos</h3>
              <button className="text-xs font-bold text-brand-gold hover:text-brand-deep transition-colors">Ver Reporte Completo</button>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Cliente</th>
                    <th>Monto USD</th>
                    <th>Método</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasVentas.map(v => (
                    <tr key={v.id}>
                      <td className="mono font-bold text-ink-muted text-xs">#{v.id}</td>
                      <td className="font-bold text-ink uppercase text-xs">{v.cliente}</td>
                      <td className="font-black text-brand-gold text-xs">{Utils.fmtUSD(v.totalUSD)}</td>
                      <td className="text-[10px] font-bold text-ink-muted uppercase">{Utils.metodoLabel(v.metodoPago)}</td>
                      <td><span className="badge badge-success">Saldado</span></td>
                    </tr>
                  ))}
                  {ultimasVentas.length === 0 && <tr><td colSpan={5} className="text-center py-10 italic text-ink-subtle">No hay ventas hoy</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stock Alerts Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bento-card h-full">
            <div className="px-6 py-5 border-b border-line bg-surface-warm/30">
              <h3 className="text-sm font-extrabold text-ink uppercase tracking-tighter flex items-center gap-2">
                <Package className="w-4 h-4 text-status-danger" /> Alertas Críticas
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {bajoStock.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-status-success-soft rounded-full flex items-center justify-center text-status-success mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-ink-subtle uppercase">Stock en orden</p>
                </div>
              ) : (
                bajoStock.map(p => (
                  <div key={p.id} className="p-4 bg-surface-warm border border-line rounded-xl flex justify-between items-center hover:border-brand-gold transition-colors group">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-ink truncate uppercase">{p.nombre}</p>
                      <p className="text-[10px] text-ink-subtle font-medium uppercase">{p.categoria}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-status-danger">{p.stock} Uds</p>
                      <p className="text-[9px] font-bold text-ink-subtle uppercase">Mín: {p.stockMinimo}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
