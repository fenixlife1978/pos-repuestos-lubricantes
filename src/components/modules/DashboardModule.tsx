"use client";

import React from 'react';
import { AppState, DashboardData } from '@/lib/types';
import { Utils } from '@/lib/db-store';
import { 
  Banknote, 
  Receipt, 
  Users, 
  Warehouse, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Zap, 
  FileDown, 
  Sparkles,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

export default function DashboardModule({ state }: { state: AppState }) {
  // Datos mockeados según requerimiento Fase 3 para demostración visual
  const data: DashboardData = {
    heroStats: {
      ventasHoy: 8420.50,
      ticketPromedio: 1052,
      margen: 27.8,
      deltaVentas: 12.3,
      deltaTicket: 5.4,
      deltaMargen: -0.6,
      ventasNuevas: 8,
      stockCritico: 3
    },
    kpis: [
      { label: "Ventas del día", value: 8420.50, currency: 'Bs', delta: 12.3, deltaLabel: "vs. ayer", subline: "≈ USD 230,70 · 8 facturas", iconKey: 'banknote', variant: 'gold' },
      { label: "Órdenes procesadas", value: 142, delta: 8.1, deltaLabel: "vs. semana ant.", subline: "38 hoy · 12 pendientes", iconKey: 'receipt', variant: 'green' },
      { label: "Clientes nuevos", value: 27, delta: 22.7, deltaLabel: "este mes", subline: "1.284 clientes activos", iconKey: 'users', variant: 'blue' },
      { label: "Valor del inventario", value: 412000, currency: 'Bs', delta: -2.4, deltaLabel: "por agotarse", iconKey: 'warehouse', variant: 'violet' },
    ],
    salesSeries: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      ventas: [4200, 6500, 5800, 8420, 7900, 9200, 8100],
      meta: [6000, 6000, 6000, 6000, 6000, 6000, 6000],
      usd: [115, 178, 159, 230, 216, 252, 222]
    },
    topProductos: [
      { initials: "AC", nombre: "Acetaminofén 500mg x 20", categoria: "Medicina", unidades: 184, total: 2208, progress: 92 },
      { initials: "AR", nombre: "Arroz Mary 1Kg", categoria: "Alimentos", unidades: 152, total: 1672, progress: 76 },
      { initials: "JN", nombre: "Jabón Protex 3×100g", categoria: "Aseo", unidades: 118, total: 1298, progress: 58 },
      { initials: "LT", nombre: "Leche en polvo 1Kg", categoria: "Lácteos", unidades: 96, total: 1056, progress: 48 },
      { initials: "CC", nombre: "Coca-Cola 1.5L", categoria: "Bebidas", unidades: 81, total: 891, progress: 40 },
    ],
    alerts: [
      { level: 'crit', iconKey: 'med', title: 'Ibuprofeno 400mg × 10 — Lote LOT-2241', meta: 'Quedan 4 unidades · Vence 14 nov 2026', actionLabel: 'Reponer' },
      { level: 'crit', iconKey: 'med', title: 'Amoxicilina 500mg — Lote LOT-1987', meta: 'Quedan 2 unidades · SICM pendiente', actionLabel: 'Reponer' },
      { level: 'warn', iconKey: 'cal', title: '7 productos próximos a vencer (30 días)', meta: 'Acción recomendada: aplicar descuento del 15%', actionLabel: 'Revisar' },
      { level: 'warn', iconKey: 'pan', title: 'Harina PAN 1Kg — Stock bajo', meta: 'Quedan 12 unidades · Mínimo sugerido: 40', actionLabel: 'Pedir' },
      { level: 'ok', iconKey: 'check', title: 'Sincronización con SENIAT completada', meta: 'Última factura fiscal: hace 12 minutos', actionLabel: 'Ver' },
    ],
    paymentMethods: [
      { label: "Transferencia", ops: 12, pct: 42, color: "#C8952E" },
      { label: "Efectivo USD", ops: 9, pct: 28, color: "#141414" },
      { label: "PagoMóvil", ops: 8, pct: 18, color: "#2563EB" },
      { label: "Zelle", ops: 4, pct: 8, color: "#2F8F3F" },
      { label: "Binance", ops: 2, pct: 4, color: "#7C3AED" },
    ],
    recentSales: [
      { factura: "F-002841", cliente: "José Ramírez", ci: "18.456.231", initials: "JR", avatarColor: "#A37619", metodo: "Transferencia", metodoVariant: "gold", items: 5, estado: "Pagado", total: 1248, usd: 34.19 },
      { factura: "F-002840", cliente: "Laura Pérez", ci: "22.118.904", initials: "LP", avatarColor: "#2F8F3F", metodo: "PagoMóvil", metodoVariant: "blue", items: 3, estado: "Pagado", total: 845.50, usd: 23.16 },
      { factura: "F-002839", cliente: "Carlos Gutiérrez", initials: "CG", avatarColor: "#2563EB", metodo: "Efectivo USD", metodoVariant: "gray", items: 2, estado: "Pagado", total: 1620, usd: 44.38 },
      { factura: "F-002838", cliente: "María Vargas", ci: "14.092.115", initials: "MV", avatarColor: "#7C3AED", metodo: "Zelle", metodoVariant: "violet", items: 7, estado: "Pendiente", total: 3120, usd: 85.48 },
      { factura: "F-002837", cliente: "Andrés Sánchez", ci: "25.701.443", initials: "AS", avatarColor: "#C0392B", metodo: "BinPay", metodoVariant: "warn", items: 1, estado: "Anulada", total: 0, usd: 0 },
    ],
    bcvRate: 36.50,
    userName: "Mariana"
  };

  const chartData = data.salesSeries.labels.map((label, index) => ({
    name: label,
    ventas: data.salesSeries.ventas[index],
    meta: data.salesSeries.meta[index],
    usd: data.salesSeries.usd[index],
  }));

  return (
    <div className="space-y-8 max-w-full overflow-hidden animate-in fade-in duration-700">
      
      {/* 1. HERO BLOCK */}
      <section className="bg-[#141414] rounded-[20px] p-8 relative overflow-hidden grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#C8952E]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 bg-[#C8952E]/15 border border-[#C8952E]/30 text-[#E7B857] px-3.5 py-1.5 rounded-full text-[0.7rem] font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Buenos días, {data.userName}
          </div>
          <h1 className="font-display text-[1.75rem] md:text-[2.2rem] font-[800] text-white leading-[1.2]">
            Tu negocio creció <span className="text-brand-gold">+{data.heroStats.deltaVentas}%</span><br />
            esta semana
          </h1>
          <p className="text-[#BDB6A4] text-[0.95rem] max-w-[48ch] font-medium">
            {data.heroStats.ventasNuevas} ventas nuevas desde ayer. Tienes {data.heroStats.stockCritico} productos con stock crítico que requieren reposición antes del cierre de hoy.
          </p>
          <div className="flex flex-wrap gap-3.5 pt-2">
            <button className="h-12 px-6 rounded-full bg-brand-gold text-ink font-bold flex items-center gap-2.5 shadow-lg shadow-brand-gold/20 hover:bg-brand-gold-deep hover:text-white transition-all">
              <Zap className="w-4 h-4" />
              Procesar ventas pendientes
            </button>
            <button className="h-12 px-6 rounded-full bg-white/5 border border-white/20 text-white font-bold flex items-center gap-2.5 hover:bg-white/10 transition-all">
              <FileDown className="w-4 h-4" />
              Descargar reporte
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10 lg:pl-4 border-l border-white/5">
          <div className="bg-white/5 border border-white/10 rounded-[18px] p-4 space-y-1.5">
            <div className="text-[0.66rem] font-bold text-[#9A9384] uppercase tracking-widest">Ventas hoy</div>
            <div className="font-display text-[1.25rem] font-black text-white">Bs 8.420</div>
            <div className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-[#7DD89B] bg-green-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +12,3%
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[18px] p-4 space-y-1.5">
            <div className="text-[0.66rem] font-bold text-[#9A9384] uppercase tracking-widest">Ticket prom.</div>
            <div className="font-display text-[1.25rem] font-black text-white">Bs 1.052</div>
            <div className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-[#7DD89B] bg-green-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +5,4%
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[18px] p-4 space-y-1.5 sm:col-span-1 col-span-2">
            <div className="text-[0.66rem] font-bold text-[#9A9384] uppercase tracking-widest">Margen del día</div>
            <div className="font-display text-[1.25rem] font-black text-white">27,8%</div>
            <div className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-[#FF9B95] bg-red-500/10 px-2 py-0.5 rounded-full">
              <ArrowDownRight className="w-3 h-3" /> -0,6%
            </div>
          </div>
        </div>
      </section>

      {/* 2. KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {data.kpis.map((kpi, i) => {
          const variants = {
            gold: { icon: "bg-brand-gold-soft text-brand-gold-deep" },
            green: { icon: "bg-status-success-soft text-status-success" },
            blue: { icon: "bg-status-info-soft text-status-info" },
            violet: { icon: "bg-[#EFE7FB] text-[#7C3AED]" },
          };
          const variant = variants[kpi.variant];
          const Icon = i === 0 ? Banknote : i === 1 ? Receipt : i === 2 ? Users : Warehouse;
          
          return (
            <div key={i} className="bg-white border border-line rounded-[20px] p-6 shadow-sm-card relative group hover:shadow-card transition-all">
              <div className="flex justify-between items-start">
                <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${variant.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <button className="text-ink-subtle hover:text-ink">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-5">
                <div className="text-[0.74rem] font-bold text-ink-subtle uppercase tracking-wider">{kpi.label}</div>
                <div className="font-display text-[1.7rem] font-[800] text-ink mt-0.5">
                  {kpi.currency === 'Bs' && <span className="text-lg opacity-50 mr-1">Bs</span>}
                  {kpi.value.toLocaleString()}
                  {kpi.value > 100000 && kpi.currency === 'Bs' && 'K'}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className={`text-[0.74rem] font-bold px-2 py-0.5 rounded-full ${kpi.delta > 0 ? 'bg-status-success-soft text-status-success' : 'bg-status-danger-soft text-status-danger'}`}>
                  {kpi.delta > 0 ? '+' : ''}{kpi.delta}%
                </div>
                <div className="text-[0.74rem] font-bold text-ink-subtle">{kpi.deltaLabel}</div>
              </div>
              <div className="mt-2.5 pt-3 border-t border-line text-[0.74rem] font-medium text-ink-subtle/80">
                {kpi.subline}
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. CHARTS + TOP PRODUCTS */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-7">
        {/* Ventas Chart */}
        <div className="bg-white border border-line rounded-[20px] shadow-sm-card flex flex-col h-[500px]">
          <div className="p-6 border-b border-line flex justify-between items-center">
            <div>
              <h3 className="font-display font-[800] text-lg text-ink leading-tight">Ventas vs. Meta diaria</h3>
              <p className="text-[0.7rem] text-ink-subtle uppercase font-bold tracking-widest mt-0.5">Total facturado en bolívares y dólares</p>
            </div>
            <div className="bg-surface-warm p-1 rounded-lg border border-line flex gap-1">
              {['Día', 'Semana', 'Mes'].map(opt => (
                <button key={opt} className={`px-3.5 py-1.5 rounded-md text-[0.7rem] font-bold uppercase transition-all ${opt === 'Semana' ? 'bg-white text-ink shadow-sm' : 'text-ink-subtle hover:text-ink'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8952E" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#C8952E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EFEBE0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#8A8A8A' }} 
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#8A8A8A' }}
                  tickFormatter={(val) => `Bs ${val}`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#2F8F3F' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', borderRadius: '12px', border: 'none', color: '#fff' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 800, padding: '2px 0' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#C8952E" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorVentas)" 
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#C8952E' }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="meta" 
                  stroke="#141414" 
                  strokeDasharray="6 6" 
                  strokeWidth={1.5} 
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="usd" 
                  stroke="#2F8F3F" 
                  strokeWidth={1.5} 
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 py-4 border-t border-line flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-gold" />
              <span className="text-[0.74rem] font-bold text-ink-muted">Ventas (Bs)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border border-ink border-dashed" />
              <span className="text-[0.74rem] font-bold text-ink-muted">Meta (Bs)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2F8F3F]" />
              <span className="text-[0.74rem] font-bold text-ink-muted">Equivalente USD</span>
            </div>
          </div>
        </div>

        {/* Top Productos */}
        <div className="bg-white border border-line rounded-[20px] shadow-sm-card flex flex-col">
          <div className="p-6 border-b border-line flex justify-between items-center">
            <div>
              <h3 className="font-display font-[800] text-lg text-ink leading-tight">Productos más vendidos</h3>
              <p className="text-[0.7rem] text-ink-subtle uppercase font-bold tracking-widest mt-0.5">Top 5 del mes en curso</p>
            </div>
            <span className="badge badge-neutral bg-brand-gold-soft text-brand-gold-deep px-3">Octubre</span>
          </div>
          <div className="flex-1 p-6 space-y-6">
            {data.topProductos.map((prod, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-surface-soft border border-line flex items-center justify-center font-black text-ink-subtle text-sm">
                  {prod.initials}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex justify-between items-end gap-2">
                    <div className="text-[0.88rem] font-[700] text-ink truncate uppercase">{prod.nombre}</div>
                    <div className="text-[0.88rem] font-[800] text-ink whitespace-nowrap">Bs {prod.total}</div>
                  </div>
                  <div className="flex justify-between items-center text-[0.72rem] font-bold text-ink-subtle mb-1.5">
                    <span className="px-2 py-0.5 bg-surface-soft rounded text-[0.65rem] uppercase">{prod.categoria}</span>
                    <span>· {prod.unidades} und. vendidas</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-soft rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-gold to-[#E7B857] rounded-full transition-all duration-1000" 
                      style={{ width: `${prod.progress}%` }} 
                    />
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[0.72rem] font-bold text-ink-subtle">≈ USD 60,49</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-4 border-t border-line text-[0.74rem] font-[800] text-brand-gold-deep hover:bg-surface-warm uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            Ver catálogo completo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4. ALERTS + PAYMENT METHODS */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-7">
        {/* Alertas */}
        <div className="bg-white border border-line rounded-[20px] shadow-sm-card flex flex-col">
          <div className="p-6 border-b border-line flex justify-between items-center">
            <div>
              <h3 className="font-display font-[800] text-lg text-ink leading-tight">Alertas de inventario</h3>
              <p className="text-[0.7rem] text-ink-subtle uppercase font-bold tracking-widest mt-0.5">Productos que requieren atención</p>
            </div>
            <button className="text-[0.74rem] font-[800] text-brand-gold-deep hover:underline flex items-center gap-1.5">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-6 space-y-3.5">
            {data.alerts.map((alert, i) => {
              const colors = {
                crit: "bg-status-danger-soft border-status-danger/20 text-status-danger",
                warn: "bg-status-warn-soft border-status-warn/20 text-status-warn",
                ok: "bg-status-success-soft border-status-success/20 text-status-success",
              };
              const btnColors = {
                crit: "bg-status-danger text-white",
                warn: "bg-brand-gold text-white",
                ok: "bg-surface-soft text-ink-muted",
              };
              
              return (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-[16px] border ${colors[alert.level]}`}>
                  <div className="w-10 h-10 rounded-[10px] bg-white/60 flex items-center justify-center shadow-sm">
                    {alert.level === 'crit' ? <Warehouse className="w-5 h-5" /> : alert.level === 'warn' ? <Receipt className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.85rem] font-[800] uppercase tracking-tight leading-tight mb-0.5">{alert.title}</div>
                    <div className="text-[0.72rem] font-bold opacity-70">{alert.meta}</div>
                  </div>
                  <button className={`h-8 px-4 rounded-full text-[0.66rem] font-black uppercase tracking-widest transition-all ${btnColors[alert.level]}`}>
                    {alert.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="bg-white border border-line rounded-[20px] shadow-sm-card flex flex-col">
          <div className="p-6 border-b border-line flex justify-between items-center">
            <div>
              <h3 className="font-display font-[800] text-lg text-ink leading-tight">Métodos de pago</h3>
              <p className="text-[0.7rem] text-ink-subtle uppercase font-bold tracking-widest mt-0.5">Distribución de las ventas del día</p>
            </div>
            <span className="badge badge-neutral px-3">Hoy</span>
          </div>
          <div className="p-6 flex-1 flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="pct"
                  >
                    {data.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-display text-[1.35rem] font-black text-ink leading-none">Bs 8.420</div>
                <div className="text-[0.6rem] font-black text-ink-subtle uppercase tracking-widest mt-1">Total hoy</div>
              </div>
            </div>
            <div className="flex-1 w-full space-y-4">
              {data.paymentMethods.map((method, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center text-[0.78rem] font-bold">
                      <span className="text-ink-muted">{method.label}</span>
                      <span className="text-ink">{method.pct}%</span>
                    </div>
                    <div className="text-[0.66rem] font-bold text-ink-subtle mt-0.5">{method.ops} operaciones registradas</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. RECENT SALES TABLE */}
      <section className="bg-white border border-line rounded-[20px] shadow-sm-card overflow-hidden">
        <div className="p-6 border-b border-line flex justify-between items-center">
          <div>
            <h3 className="font-display font-[800] text-lg text-ink leading-tight">Ventas recientes</h3>
            <p className="text-[0.7rem] text-ink-subtle uppercase font-bold tracking-widest mt-0.5">Últimos movimientos de facturación</p>
          </div>
          <button className="h-10 px-5 rounded-full border border-line text-ink font-bold text-sm hover:bg-surface-warm transition-all flex items-center gap-2">
            Ver todas las ventas
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-warm">
              <tr>
                <th className="px-7 py-4 text-left text-[0.7rem] font-black text-ink-subtle uppercase tracking-widest border-b border-line">Factura</th>
                <th className="px-7 py-4 text-left text-[0.7rem] font-black text-ink-subtle uppercase tracking-widest border-b border-line">Cliente</th>
                <th className="px-7 py-4 text-left text-[0.7rem] font-black text-ink-subtle uppercase tracking-widest border-b border-line">Método</th>
                <th className="px-7 py-4 text-center text-[0.7rem] font-black text-ink-subtle uppercase tracking-widest border-b border-line">Items</th>
                <th className="px-7 py-4 text-center text-[0.7rem] font-black text-ink-subtle uppercase tracking-widest border-b border-line">Estado</th>
                <th className="px-7 py-4 text-right text-[0.7rem] font-black text-ink-subtle uppercase tracking-widest border-b border-line">Monto Total</th>
                <th className="px-7 py-4 border-b border-line"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.recentSales.map((sale, i) => (
                <tr key={i} className="hover:bg-surface-warm/50 transition-colors group">
                  <td className="px-7 py-4 font-mono text-[0.85rem] font-bold text-brand-gold-deep">{sale.factura}</td>
                  <td className="px-7 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[0.7rem]" 
                        style={{ backgroundColor: sale.avatarColor }}
                      >
                        {sale.initials}
                      </div>
                      <div>
                        <div className="text-[0.88rem] font-bold text-ink uppercase tracking-tight">{sale.cliente}</div>
                        <div className="text-[0.7rem] font-bold text-ink-subtle">{sale.ci || 'Consumidor final'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-7 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${sale.metodoVariant === 'gold' ? 'bg-brand-gold' : sale.metodoVariant === 'blue' ? 'bg-status-info' : sale.metodoVariant === 'violet' ? 'bg-purple-500' : 'bg-ink-subtle'}`} />
                      <span className="text-[0.82rem] font-bold text-ink-muted">{sale.metodo}</span>
                    </div>
                  </td>
                  <td className="px-7 py-4 text-center">
                    <span className="text-[0.82rem] font-bold text-ink-muted">{sale.items} items</span>
                  </td>
                  <td className="px-7 py-4 text-center">
                    <span className={`badge px-3 py-1 ${sale.estado === 'Pagado' ? 'badge-ok' : sale.estado === 'Pendiente' ? 'badge-warn' : 'badge-err'}`}>
                      {sale.estado}
                    </span>
                  </td>
                  <td className="px-7 py-4 text-right">
                    <div className="text-[0.95rem] font-black text-ink">Bs {sale.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    <div className="text-[0.72rem] font-bold text-ink-subtle/70">≈ USD {sale.usd.toFixed(2)}</div>
                  </td>
                  <td className="px-7 py-4 text-right">
                    <button className="w-9 h-9 rounded-[8px] border border-line flex items-center justify-center text-ink-subtle hover:bg-brand-gold hover:text-white hover:border-brand-gold transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
