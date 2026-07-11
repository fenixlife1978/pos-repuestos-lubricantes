'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Product, Movimiento, KitItem } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  Plus, Search, Edit2, Trash2, Boxes, X, BarChart3, FileText, History, 
  Layers, Trash, ShoppingBag, TrendingUp, RotateCcw, Box, ClipboardList, 
  Info, Tag, DollarSign, Settings, PlusCircle, MinusCircle, AlertTriangle, 
  Check, Calendar, ChevronRight
} from 'lucide-react';
import { 
  generarPDFInventarioSimple, 
  exportarPDFInventarioGeneral, 
  exportarPDFVentasDetallado, 
  exportarPDFKardex, 
  exportarPDFHistorialAjustes, 
  exportarPDFConsumoInterno,
  exportarPDFDevoluciones
} from '@/lib/pdf-generator';

export function InventoryModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [activeTab, setActiveTab] = useState('productos');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selectedKardexId, setSelectedKardexId] = useState<string | null>(null);
  
  const [showAjuste, setShowAjuste] = useState<string | null>(null);
  const [showProducto, setShowProducto] = useState<string | null | 'nuevo'>(null);
  
  const prods = (state.productos || []).filter(p => 
    p.activo && 
    (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter ? p.categoria === catFilter : true)
  );

  const eliminar = (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este producto?')) return;
    const nuevos = state.productos.map(p => p.id === id ? { ...p, activo: false } : p);
    updateState({ productos: nuevos });
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'productos': return (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-4 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-ink" />
                <input className="form-input pl-10" placeholder="Buscar producto por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select w-auto bg-white border-line rounded-md px-3 py-2 text-sm font-bold text-ink" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">Todas las categorías</option>
                {(state.categorias || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary shadow-sm" onClick={() => generarPDFInventarioSimple(prods, state.empresa)}><FileText className="w-4 h-4" /> Exportar PDF</button>
              <button className="btn btn-primary shadow-md" onClick={() => setShowProducto('nuevo')}><Plus className="w-4 h-4" /> Nuevo Producto</button>
            </div>
          </div>

          <div className="card shadow-lg rounded-xl overflow-hidden">
            <div className="card-head bg-ink border-b border-white/10 px-6 py-4">
              <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
                <Box className="w-5 h-5 text-brand-gold" /> CATALOGO DE PRODUCTOS ACTIVOS
              </h3>
            </div>
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-soft">
                    <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Código</th>
                    <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Nombre Producto</th>
                    <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Categoría</th>
                    <th className="font-black text-ink uppercase text-[10px] text-right py-3 px-4">Costo USD</th>
                    <th className="font-black text-ink uppercase text-[10px] text-right py-3 px-4">P. Venta USD</th>
                    <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Stock</th>
                    <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {prods.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-20 text-ink/20 font-black italic uppercase">No se encontraron productos</td></tr>
                  ) : (
                    prods.map(p => (
                      <tr key={p.id} className="border-b border-line/30 hover:bg-surface-warm/20 transition-colors">
                        <td className="mono text-xs font-black text-ink py-4 px-6">{p.codigo}</td>
                        <td className="font-black text-ink uppercase py-4 px-4">
                          <div className="flex items-center gap-2">
                            {p.isKit && <Layers className="w-3.5 h-3.5 text-brand-gold" />}
                            {p.nombre}
                          </div>
                        </td>
                        <td className="py-4 px-4"><span className="badge badge-neutral font-black">{p.categoria}</span></td>
                        <td className="mono font-bold text-ink text-right py-4 px-4">{Utils.fmtUSD(p.costoUSD)}</td>
                        <td className="mono text-brand-gold-deep font-black text-right py-4 px-4">{Utils.fmtUSD(p.precioUSD)}</td>
                        <td className="text-center py-4 px-4">
                          <span className={`badge ${p.stock <= (p.stockMinimo || 0) ? 'badge-err' : 'badge-ok'} font-black px-3`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center gap-1">
                            <button className="btn-icon h-8 w-8 text-ink hover:text-brand-gold" onClick={() => setShowProducto(p.id)}><Edit2 className="w-4 h-4" /></button>
                            <button className="btn-icon h-8 w-8 text-ink hover:text-status-info" onClick={() => { setSelectedKardexId(p.id); setActiveTab('kardex'); }}><History className="w-4 h-4" /></button>
                            <button className="btn-icon h-8 w-8 text-ink hover:text-status-success" onClick={() => setShowAjuste(p.id)}><Boxes className="w-4 h-4" /></button>
                            <button className="btn-icon h-8 w-8 text-ink hover:text-status-danger" onClick={() => eliminar(p.id)}><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
      case 'reporte_general': return <ReporteGeneral state={state} />;
      case 'reporte_ventas': return <ReporteVentas state={state} />;
      case 'reporte_devoluciones': return <ReporteDevoluciones state={state} />;
      case 'historial_ajustes': return <HistorialAjustes state={state} />;
      case 'kardex': return <ReporteKardex state={state} selectedId={selectedKardexId} onSelect={setSelectedKardexId} />;
      case 'consumo_colab': return <ReporteConsumo state={state} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="tabs border-b border-line no-print">
        <button onClick={() => setActiveTab('productos')} className={`tab ${activeTab === 'productos' ? 'active' : 'text-ink font-black'}`}>Productos</button>
        <button onClick={() => setActiveTab('reporte_general')} className={`tab ${activeTab === 'reporte_general' ? 'active' : 'text-ink font-black'}`}>Inventario CPP</button>
        <button onClick={() => setActiveTab('reporte_ventas')} className={`tab ${activeTab === 'reporte_ventas' ? 'active' : 'text-ink font-black'}`}>Ventas</button>
        <button onClick={() => setActiveTab('reporte_devoluciones')} className={`tab ${activeTab === 'reporte_devoluciones' ? 'active' : 'text-ink font-black'}`}>Devoluciones</button>
        <button onClick={() => setActiveTab('kardex')} className={`tab ${activeTab === 'kardex' ? 'active' : 'text-ink font-black'}`}>Kardex</button>
        <button onClick={() => setActiveTab('historial_ajustes')} className={`tab ${activeTab === 'historial_ajustes' ? 'active' : 'text-ink font-black'}`}>Ajustes</button>
        <button onClick={() => setActiveTab('consumo_colab')} className={`tab ${activeTab === 'consumo_colab' ? 'active' : 'text-ink font-black'}`}>Consumo</button>
      </div>

      <div className="animate-in fade-in duration-300">
        {renderContent()}
      </div>

      {showProducto && (
        <ModalProducto 
          state={state}
          producto={showProducto === 'nuevo' ? undefined : state.productos.find(p => p.id === showProducto)}
          onClose={() => setShowProducto(null)}
          onUpdateLists={(lists: any) => updateState(lists)}
          onSave={(datos: any) => {
            let nuevosProds;
            if (showProducto === 'nuevo') {
              const nuevo: Product = {
                ...datos,
                id: Store.uid(),
                fechaCreacion: Utils.hoy(),
                activo: true
              };
              nuevosProds = [...state.productos, nuevo];
              if (nuevo.stock > 0) {
                const mov: Movimiento = {
                  id: Store.uid(),
                  productoId: nuevo.id,
                  tipo: 'inicial' as any,
                  cantidad: nuevo.stock,
                  stockAntes: 0,
                  stockDespues: nuevo.stock,
                  fecha: Utils.ahora(),
                  referencia: 'INICIAL'
                };
                updateState({ productos: nuevosProds, movimientos: [...state.movimientos, mov] });
              } else {
                updateState({ productos: nuevosProds });
              }
            } else {
              nuevosProds = state.productos.map(p => p.id === showProducto ? { ...p, ...datos } : p);
              updateState({ productos: nuevosProds });
            }
            setShowProducto(null);
          }}
        />
      )}

      {showAjuste && (
        <ModalAjuste 
          producto={state.productos.find(p => p.id === showAjuste)!} 
          onClose={() => setShowAjuste(null)}
          onSave={(mov, nuevoCosto) => {
            const nuevosProds = state.productos.map(p => {
              if (p.id === mov.productoId) {
                let finalCosto = p.costoUSD;
                if (mov.tipo === 'ajuste_entrada' || (mov.tipo as string) === 'compra') {
                  const stockActual = p.stock;
                  const cantidadNueva = Math.abs(mov.cantidad);
                  const costoNuevo = nuevoCosto || p.costoUSD;
                  const stockTotal = stockActual + cantidadNueva;
                  if (stockTotal > 0) {
                    finalCosto = Utils.round(((stockActual * p.costoUSD) + (cantidadNueva * costoNuevo)) / stockTotal);
                  }
                }
                return { ...p, stock: mov.stockDespues, costoUSD: finalCosto };
              }
              return p;
            });
            updateState({ 
              productos: nuevosProds, 
              movimientos: [...state.movimientos, mov] 
            });
            setShowAjuste(null);
          }}
        />
      )}
    </div>
  );
}

function ReporteGeneral({ state }: { state: AppState }) {
  const [groupBy, setGroupBy] = useState<'categoria' | 'departamento' | 'proveedor'>('categoria');
  const [filterValue, setFilterValue] = useState<string>('');

  const filteredProducts = state.productos.filter(p => {
    const matchesGroup = (filterValue === '' || ((p[groupBy] as string) || 'Sin asignar') === filterValue);
    return p.activo && matchesGroup;
  });

  const totalCosto = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.costoUSD * p.stock), 0));
  const totalVenta = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.precioUSD * p.stock), 0));
  const uniqueValues = Array.from(new Set(state.productos.filter(p => p.activo).map(p => (p[groupBy] as string) || 'Sin asignar'))).sort();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi p-6 border-line shadow-md bg-white">
          <div className="text-[10px] font-black uppercase mb-1 text-ink opacity-60">Valor al Costo (CPP Total)</div>
          <div className="text-3xl font-black text-ink">{Utils.fmtUSD(totalCosto)}</div>
        </div>
        <div className="kpi p-6 border-line shadow-md bg-white">
          <div className="text-[10px] font-black uppercase mb-1 text-ink opacity-60">Valor al Precio de Venta (Total)</div>
          <div className="text-3xl font-black text-status-success">{Utils.fmtUSD(totalVenta)}</div>
        </div>
      </div>
      
      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-black text-xs uppercase italic tracking-tighter">INVENTARIO VALORIZADO</h3>
            <select className="form-select bg-white text-ink border-none text-[10px] font-black h-8 px-3 rounded" value={filterValue} onChange={e => setFilterValue(e.target.value)}>
              <option value="">TODOS</option>
              {uniqueValues.map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary h-8 px-4 font-black uppercase text-[9px]" onClick={() => exportarPDFInventarioGeneral(filteredProducts, state.empresa, groupBy, { costo: totalCosto, venta: totalVenta })}>
            PDF Profesional
          </button>
        </div>
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Cod.</th>
                <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Producto</th>
                <th className="font-black text-ink uppercase text-[10px] text-right py-3 px-4">Costo Unit.</th>
                <th className="font-black text-ink uppercase text-[10px] text-right py-3 px-4">Venta Unit.</th>
                <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Stock</th>
                <th className="font-black text-ink uppercase text-[10px] text-right py-3 px-6">Subtotal Costo</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-line/30">
                  <td className="mono text-[11px] font-black text-ink py-3 px-6">{p.codigo}</td>
                  <td className="font-black uppercase text-xs text-ink py-3 px-4">{p.nombre}</td>
                  <td className="mono text-right text-xs font-bold text-ink/60 py-3 px-4">{Utils.fmtUSD(p.costoUSD)}</td>
                  <td className="mono text-right text-brand-gold-deep font-black py-3 px-4">{Utils.fmtUSD(p.precioUSD)}</td>
                  <td className="text-center py-3 px-4"><span className="badge badge-neutral font-black">{p.stock}</span></td>
                  <td className="mono text-right font-black text-ink py-3 px-6">{Utils.fmtUSD(Utils.round(p.costoUSD * p.stock))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReporteVentas({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const filteredVentas = useMemo(() => {
    return state.ventas.filter(v => {
      const d = v.fecha.slice(0, 10);
      if (!useDates) return d === Utils.hoy();
      return d >= desde && d <= hasta;
    });
  }, [state.ventas, desde, hasta, useDates]);

  const groupedVentas = useMemo(() => {
    const groups: Record<string, { nombre: string, cantidad: number, totalUSD: number }> = {};
    filteredVentas.forEach(v => {
      v.items.forEach(item => {
        if (!groups[item.nombre]) {
          groups[item.nombre] = { nombre: item.nombre, cantidad: 0, totalUSD: 0 };
        }
        groups[item.nombre].cantidad += item.cantidad;
        groups[item.nombre].totalUSD += item.subtotalUSD;
      });
    });
    return Object.values(groups).sort((a, b) => b.cantidad - a.cantidad);
  }, [filteredVentas]);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
           <div className="flex items-center gap-2">
              <input type="date" className="form-input h-8 text-xs font-bold" value={desde} onChange={e => setDesde(e.target.value)} />
              <input type="date" className="form-input h-8 text-xs font-bold" value={hasta} onChange={e => setHasta(e.target.value)} />
           </div>
        )}
      </div>

      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4">
           <h3 className="text-white font-black text-xs uppercase italic tracking-tighter">RESUMEN DE VENTAS POR PRODUCTO</h3>
        </div>
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Producto / Ítem</th>
                <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Unidades Vendidas</th>
                <th className="font-black text-ink uppercase text-[10px] text-right py-3 px-6">Recaudado (USD)</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {groupedVentas.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin ventas registradas</td></tr>
              ) : (
                groupedVentas.map((g, idx) => (
                  <tr key={idx} className="border-b border-line/30 hover:bg-surface-warm/20 transition-colors">
                    <td className="font-black uppercase text-xs text-ink py-3 px-6">{g.nombre}</td>
                    <td className="text-center font-black mono py-3 px-4">{g.cantidad}</td>
                    <td className="text-right font-black text-brand-gold-deep mono py-3 px-6">{Utils.fmtUSD(g.totalUSD)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReporteDevoluciones({ state }: { state: AppState }) {
  const devoluciones = state.devoluciones || [];
  const totalUSD = devoluciones.reduce((acc, d) => acc + d.totalUSD, 0);

  return (
    <div className="space-y-4">
      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter">HISTORIAL DE DEVOLUCIONES</h3>
          <button className="btn btn-secondary h-8 px-4 font-black text-[9px]" onClick={() => exportarPDFDevoluciones(devoluciones, state.empresa, 'Histórico', { totalUSD })}>PDF</button>
        </div>
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-soft">
                <th className="text-[10px] font-black uppercase text-left py-3 px-6">Fecha</th>
                <th className="text-[10px] font-black uppercase text-left py-3 px-4">Venta Ref.</th>
                <th className="text-[10px] font-black uppercase text-right py-3 px-4">Total Dev.</th>
                <th className="text-[10px] font-black uppercase text-left py-3 px-6">Motivo</th>
              </tr>
            </thead>
            <tbody className="bg-white">
               {devoluciones.map(d => (
                 <tr key={d.id} className="border-b border-line/30">
                   <td className="text-xs font-bold py-3 px-6">{Utils.fmtFecha(d.fecha)}</td>
                   <td className="text-xs font-black mono py-3 px-4">{d.ventaId}</td>
                   <td className="text-right font-black text-status-danger py-3 px-4">{Utils.fmtUSD(d.totalUSD)}</td>
                   <td className="text-xs italic uppercase opacity-60 py-3 px-6">{d.motivo}</td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HistorialAjustes({ state }: { state: AppState }) {
  const ajustes = state.movimientos.filter(m => 
    ['ajuste_entrada', 'ajuste_salida', 'consumo', 'colaboracion', 'compra', 'inicial'].includes(m.tipo)
  ).sort((a,b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="card shadow-lg border-line rounded-xl overflow-hidden">
      <div className="table-wrap">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-soft">
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Fecha</th>
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Producto</th>
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Operación</th>
              <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Cant</th>
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Motivo / Ref</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {ajustes.map(m => (
              <tr key={m.id} className="border-b border-line/30">
                <td className="text-xs font-bold py-3 px-6">{m.fecha.slice(0,16).replace('T', ' ')}</td>
                <td className="font-black uppercase text-xs py-3 px-4">{state.productos.find(p => p.id === m.productoId)?.nombre || 'ELIMINADO'}</td>
                <td className="py-3 px-4"><span className="badge badge-neutral text-[9px] font-black uppercase">{m.tipo}</span></td>
                <td className={`text-center font-black py-3 px-4 ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>{m.cantidad}</td>
                <td className="text-[10px] opacity-40 italic uppercase py-3 px-6">{m.referencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteConsumo({ state }: { state: AppState }) {
  const consumos = state.movimientos.filter(m => ['consumo', 'colaboracion'].includes(m.tipo)).sort((a,b) => b.fecha.localeCompare(a.fecha));
  return (
    <div className="card shadow-lg border-line rounded-xl overflow-hidden">
      <div className="table-wrap">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-soft">
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Fecha</th>
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Producto</th>
              <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Cant</th>
              <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Motivo</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {consumos.map(m => (
              <tr key={m.id} className="border-b border-line/30">
                <td className="text-xs font-bold py-3 px-6">{m.fecha.slice(0,10)}</td>
                <td className="font-black uppercase text-xs py-3 px-4">{state.productos.find(p => p.id === m.productoId)?.nombre}</td>
                <td className={`text-center font-black text-status-danger py-3 px-4`}>{Math.abs(m.cantidad)}</td>
                <td className="text-[10px] uppercase font-bold opacity-40 py-3 px-6">{m.referencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteKardex({ state, selectedId, onSelect }: { state: AppState, selectedId: string | null, onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const selectedProd = selectedId ? state.productos.find(p => p.id === selectedId) : null;
  const movs = selectedId ? state.movimientos.filter(m => m.productoId === selectedId).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];

  const matches = useMemo(() => {
    if (search.trim().length < 2) return [];
    return state.productos.filter(p => 
      p.activo && 
      (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.includes(search))
    ).slice(0, 5);
  }, [search, state.productos]);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line shadow-sm">
        <label className="text-[10px] font-black uppercase text-ink opacity-40 block mb-2">Buscar producto para ver Kardex</label>
        <div className="relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Escriba nombre o código..." className="form-input h-12 text-sm font-bold" />
          {matches.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-line shadow-2xl z-50 mt-1 rounded-xl overflow-hidden">
              {matches.map(p => (
                <div key={p.id} className="p-4 border-b border-line hover:bg-brand-gold/10 cursor-pointer transition-all flex justify-between items-center" onClick={() => { onSelect(p.id); setSearch(''); }}>
                  <div><p className="font-black uppercase text-xs">{p.nombre}</p><p className="text-[10px] opacity-40">{p.codigo}</p></div>
                  <ChevronRight className="w-4 h-4 text-brand-gold" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProd && (
        <div className="card overflow-hidden shadow-lg border-line rounded-xl">
          <div className="card-head bg-ink text-white px-6 py-3 flex justify-between items-center">
            <h3 className="font-black text-xs uppercase tracking-widest text-brand-gold">{selectedProd.nombre}</h3>
            <button className="btn btn-secondary h-8 px-4 font-black uppercase text-[9px]" onClick={() => exportarPDFKardex(selectedProd, movs, state.empresa)}>Exportar Kardex</button>
          </div>
          <div className="table-wrap">
             <table className="w-full">
                <thead>
                   <tr className="bg-surface-soft">
                      <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Fecha</th>
                      <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-4">Tipo</th>
                      <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Cant</th>
                      <th className="font-black text-ink uppercase text-[10px] text-center py-3 px-4">Stock Final</th>
                      <th className="font-black text-ink uppercase text-[10px] text-left py-3 px-6">Referencia</th>
                   </tr>
                </thead>
                <tbody className="bg-white">
                   {movs.map(m => (
                      <tr key={m.id} className="border-b border-line/30">
                         <td className="text-xs font-bold py-3 px-6">{m.fecha.replace('T', ' ')}</td>
                         <td className="py-3 px-4"><span className="badge badge-neutral text-[9px] uppercase font-black">{m.tipo}</span></td>
                         <td className={`text-center font-black py-3 px-4 ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>{m.cantidad > 0 ? '+' : ''}{m.cantidad}</td>
                         <td className="text-center font-bold py-3 px-4">{m.stockDespues}</td>
                         <td className="text-[10px] italic opacity-40 uppercase py-3 px-6">{m.referencia}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalAjuste({ producto, onClose, onSave }: { producto: Product, onClose: () => void, onSave: (m: Movimiento, nuevoCosto?: number) => void }) {
  const [tipo, setTipo] = useState<'ajuste_entrada' | 'ajuste_salida' | 'consumo' | 'colaboracion'>('ajuste_entrada');
  const [cantidad, setCantidad] = useState<string>('1');
  const [nuevoCosto, setNuevoCosto] = useState<string>(String(producto.costoUSD));
  const [motivo, setMotivo] = useState('');

  const handleSave = () => {
    const pCant = parseFloat(cantidad) || 0;
    const pCosto = parseFloat(nuevoCosto) || 0;
    if (pCant <= 0) return alert('Cantidad invalida');
    if (!motivo.trim()) return alert('Por favor indique el motivo del ajuste');

    const mov: Movimiento = {
      id: Store.uid(),
      productoId: producto.id,
      tipo,
      cantidad: tipo === 'ajuste_entrada' ? pCant : -Math.abs(pCant),
      stockAntes: producto.stock,
      stockDespues: tipo === 'ajuste_entrada' ? producto.stock + pCant : producto.stock - Math.abs(pCant),
      fecha: Utils.ahora(),
      referencia: motivo.toUpperCase()
    };
    onSave(mov, tipo === 'ajuste_entrada' ? pCosto : undefined);
  };

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-md border-2 border-line rounded-xl overflow-hidden shadow-2xl">
        <div className="modal-head px-5 py-4 border-b border-line bg-surface-soft">
          <h3 className="text-ink font-black uppercase text-sm">AJUSTAR: {producto.nombre.toUpperCase()}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-ink" /></button>
        </div>
        <div className="modal-body p-6 space-y-4 bg-white">
          <div className="grid grid-cols-2 gap-4">
             <div className="form-group"><label className="text-[10px] font-black uppercase text-ink/60 mb-1 block">Tipo</label>
               <select className="form-select h-10 text-xs font-bold" value={tipo} onChange={e => setTipo(e.target.value as any)}>
                 <option value="ajuste_entrada">Entrada (+)</option>
                 <option value="ajuste_salida">Salida (-)</option>
               </select>
             </div>
             <div className="form-group"><label className="text-[10px] font-black uppercase text-ink/60 mb-1 block">Cantidad</label>
               <input className="form-input h-10 text-center font-black" type="text" value={cantidad} onChange={e => setCantidad(e.target.value)} />
             </div>
          </div>
          <div className="form-group">
            <label className="text-[10px] font-black uppercase text-ink/60 mb-1 block">Motivo del Ajuste</label>
            <input 
              className="form-input h-10 text-xs font-black uppercase" 
              placeholder="Ej: ERROR DE CONTEO, DAÑO, ETC..." 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)} 
            />
          </div>
          <button className="btn btn-primary w-full h-12 font-black uppercase text-xs shadow-md mt-2" onClick={handleSave}>Procesar Ajuste</button>
        </div>
      </div>
    </div>
  );
}

function ModalProducto({ producto, state, onClose, onSave, onUpdateLists }: { producto?: Product, state: AppState, onClose: () => void, onSave: (p: any) => void, onUpdateLists: (l: any) => void }) {
  const [activeTab, setActiveTab] = useState<'general' | 'precios' | 'kit'>('general');
  const [datos, setDatos] = useState<any>({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    categoria: producto?.categoria || state.categorias[0] || '',
    marca: producto?.marca || state.marcas[0] || '',
    costoUSD: producto?.costoUSD?.toString() ?? '0',
    margen: producto?.margen?.toString() ?? '0',
    precioUSD: producto?.precioUSD?.toString() ?? '0',
    precioBS: producto ? (producto.precioUSD * state.tasa).toFixed(2) : '0',
    precioMayorUSD: producto?.precioMayorUSD?.toString() ?? '0',
    precioOfertaUSD: producto?.precioOfertaUSD?.toString() ?? '0',
    precioPromoUSD: producto?.precioPromoUSD?.toString() ?? '0',
    stock: producto?.stock?.toString() ?? '0',
    stockMinimo: producto?.stockMinimo?.toString() ?? '3',
    aplicaIVA: producto?.aplicaIVA ?? false,
    isKit: producto?.isKit || false,
    kitType: producto?.kitType || 'stock_propio',
    kitItems: producto?.kitItems || [],
    proveedor: producto?.proveedor || ''
  });

  const [kitSearch, setKitSearch] = useState('');
  const filteredProdsForKit = useMemo(() => {
    if (kitSearch.length < 2) return [];
    return state.productos.filter(p => !p.isKit && (p.nombre.toLowerCase().includes(kitSearch.toLowerCase()) || p.codigo.toLowerCase().includes(kitSearch.toLowerCase()))).slice(0, 5);
  }, [kitSearch, state.productos]);

  const validarDecimal = (val: string) => /^[\d]*\.?[\d]*$/.test(val) || val === '';

  const handleCostoChange = (val: string) => {
    if (!validarDecimal(val)) return;
    const cost = parseFloat(val) || 0;
    const margin = parseFloat(datos.margen) || 0;
    let priceUSD = 0;
    if (margin < 100) {
      priceUSD = cost / (1 - (margin / 100));
    }
    const priceBS = priceUSD * state.tasa;
    setDatos({...datos, costoUSD: val, precioUSD: priceUSD.toFixed(2), precioBS: priceBS.toFixed(2)});
  };

  const handleMargenChange = (val: string) => {
    if (!validarDecimal(val)) return;
    const margin = parseFloat(val) || 0;
    const cost = parseFloat(datos.costoUSD) || 0;
    let priceUSD = 0;
    if (margin < 100) {
      priceUSD = cost / (1 - (margin / 100));
    }
    const priceBS = priceUSD * state.tasa;
    setDatos({...datos, margen: val, precioUSD: priceUSD.toFixed(2), precioBS: priceBS.toFixed(2)});
  };

  const handlePriceUSDChange = (val: string) => {
    if (!validarDecimal(val)) return;
    const priceUSD = parseFloat(val) || 0;
    const cost = parseFloat(datos.costoUSD) || 0;
    let margin = 0;
    if (priceUSD > 0 && priceUSD > cost) {
      margin = ((priceUSD - cost) / priceUSD) * 100;
    }
    const priceBS = priceUSD * state.tasa;
    setDatos({...datos, precioUSD: val, margen: margin.toFixed(2), precioBS: priceBS.toFixed(2)});
  };

  const handlePriceBSChange = (val: string) => {
    if (!validarDecimal(val)) return;
    const priceBS = parseFloat(val) || 0;
    const priceUSD = priceBS / state.tasa;
    const cost = parseFloat(datos.costoUSD) || 0;
    let margin = 0;
    if (priceUSD > 0 && priceUSD > cost) {
      margin = ((priceUSD - cost) / priceUSD) * 100;
    }
    setDatos({...datos, precioBS: val, precioUSD: priceUSD.toFixed(2), margen: margin.toFixed(2)});
  };

  const handleAddListItem = (listName: 'categorias' | 'marcas') => {
    const newVal = prompt(`Ingrese nueva opción para ${listName.toUpperCase()}:`);
    if (newVal) {
      onUpdateLists({ [listName]: [...(state[listName] || []), newVal] });
      setDatos((prev: any) => ({ ...prev, [listName === 'categorias' ? 'categoria' : 'marca']: newVal }));
    }
  };

  const handleRemoveListItem = (listName: 'categorias' | 'marcas', current: string) => {
    if (confirm(`¿Eliminar "${current}" de la lista?`)) {
      const newList = (state[listName] || []).filter(i => i !== current);
      onUpdateLists({ [listName]: newList });
      setDatos((prev: any) => ({ ...prev, [listName === 'categorias' ? 'categoria' : 'marca']: newList[0] || '' }));
    }
  };

  const handleSave = () => {
    if (!datos.nombre || !datos.codigo) return alert('Nombre y Código requeridos');
    onSave({
      ...datos,
      costoUSD: parseFloat(datos.costoUSD) || 0,
      margen: parseFloat(datos.margen) || 0,
      precioUSD: parseFloat(datos.precioUSD) || 0,
      precioMayorUSD: parseFloat(datos.precioMayorUSD) || 0,
      precioOfertaUSD: parseFloat(datos.precioOfertaUSD) || 0,
      precioPromoUSD: parseFloat(datos.precioPromoUSD) || 0,
      stock: parseFloat(datos.stock) || 0,
      stockMinimo: parseFloat(datos.stockMinimo) || 0
    });
  };

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-2xl border-2 border-line rounded-xl overflow-hidden shadow-2xl">
        <div className="modal-head py-4 px-6 border-b border-line bg-ink flex justify-between items-center">
          <h3 className="text-white font-black uppercase italic tracking-tighter text-sm flex items-center gap-2">
            <Box className="w-5 h-5 text-brand-gold" /> {producto ? 'EDITAR FICHA' : 'NUEVO ÍTEM / PRODUCTO'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex bg-surface-soft border-b border-line">
          <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'general' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>General</button>
          <button onClick={() => setActiveTab('precios')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'precios' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>Precios</button>
          <button onClick={() => setActiveTab('kit')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'kit' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>Kits / Combos</button>
        </div>

        <div className="modal-body p-6 space-y-6 bg-white max-h-[70vh] overflow-y-auto">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink/50 block">Código (Scanner/Manual)</label>
                  <input className="form-input h-10 font-black text-ink" value={datos.codigo} onChange={e => setDatos({...datos, codigo: e.target.value})} placeholder="00000000" autoFocus />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-ink/50 block">Nombre del Producto</label>
                  <input className="form-input h-10 font-black text-ink uppercase" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase text-ink/50">Categoría</label>
                    <div className="flex gap-1">
                      <button onClick={() => handleAddListItem('categorias')} className="text-brand-gold"><PlusCircle className="w-3.5 h-3.5"/></button>
                      <button onClick={() => handleRemoveListItem('categorias', datos.categoria)} className="text-status-danger"><MinusCircle className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                  <select className="form-select h-10 text-xs font-bold" value={datos.categoria} onChange={e => setDatos({...datos, categoria: e.target.value})}>
                    {(state.categorias || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-ink/50 block">Proveedor</label>
                   <select className="form-select h-10 text-xs font-bold" value={datos.proveedor} onChange={e => setDatos({...datos, proveedor: e.target.value})}>
                     <option value="">SIN ASIGNAR</option>
                     {state.proveedores.map(p => {
                       const pName = typeof p === 'string' ? p : p.nombre;
                       const pId = typeof p === 'string' ? p : p.id;
                       return <option key={pId} value={pName}>{pName ? pName.toUpperCase() : 'PROVEEDOR S/N'}</option>;
                     })}
                   </select>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className={`p-3 bg-surface-soft border border-line rounded-xl text-center ${producto ? 'opacity-50 pointer-events-none' : ''}`}>
                     <label className="text-[9px] font-black uppercase text-ink/50 block mb-1">Stock Inicial</label>
                     <input className="bg-transparent border-none text-center font-black text-xl w-full focus:outline-none" type="text" value={datos.stock} onChange={e => setDatos({...datos, stock: e.target.value})} />
                   </div>
                   <div className="p-3 bg-status-danger-soft border border-status-danger/20 rounded-xl text-center">
                     <label className="text-[9px] font-black uppercase text-status-danger/70 block mb-1">Mínimo</label>
                     <input className="bg-transparent border-none text-center font-black text-xl w-full text-status-danger focus:outline-none" type="text" value={datos.stockMinimo} onChange={e => setDatos({...datos, stockMinimo: e.target.value})} />
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-surface-soft rounded-xl border border-line">
                   <button onClick={() => setDatos({...datos, aplicaIVA: !datos.aplicaIVA})} className={`w-12 h-6 rounded-full transition-all relative ${datos.aplicaIVA ? 'bg-status-success' : 'bg-ink/20'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${datos.aplicaIVA ? 'right-1' : 'left-1'}`} /></button>
                   <label className="text-[10px] font-black uppercase text-ink">Aplica IVA (16%)</label>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'precios' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-soft p-5 rounded-2xl border border-line shadow-inner">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-ink/50">Costo USD</label><input className="form-input h-12 font-black text-lg" value={datos.costoUSD} onChange={e => handleCostoChange(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-brand-gold-deep">Margen %</label><input className="form-input h-12 font-black text-lg text-brand-gold-deep" value={datos.margen} onChange={e => handleMargenChange(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-status-success">Venta USD</label><input className="form-input h-12 font-black text-lg text-status-success" value={datos.precioUSD} onChange={e => handlePriceUSDChange(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-ink">Venta BS</label><input className="form-input h-12 font-black text-lg" value={datos.precioBS} onChange={e => handlePriceBSChange(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                 <div className="space-y-1"><label className="text-[9px] font-black uppercase text-ink/40">P. Mayor USD</label><input className="form-input h-10 font-bold" value={datos.precioMayorUSD} onChange={e => setDatos({...datos, precioMayorUSD: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black uppercase text-ink/40">P. Descuento USD</label><input className="form-input h-10 font-bold" value={datos.precioOfertaUSD} onChange={e => setDatos({...datos, precioOfertaUSD: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black uppercase text-ink/40">P. Promoción USD</label><input className="form-input h-10 font-bold" value={datos.precioPromoUSD} onChange={e => setDatos({...datos, precioPromoUSD: e.target.value})} /></div>
              </div>
            </div>
          )}

          {activeTab === 'kit' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 p-4 bg-ink text-white rounded-xl">
                <div className="flex items-center gap-3">
                  <button onClick={() => setDatos({...datos, isKit: !datos.isKit})} className={`w-12 h-6 rounded-full transition-all relative ${datos.isKit ? 'bg-brand-gold' : 'bg-white/20'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${datos.isKit ? 'right-1' : 'left-1'}`} /></button>
                  <label className="text-[11px] font-black uppercase tracking-widest">Habilitar KIT / COMBO</label>
                </div>
                {datos.isKit && (
                  <div className="flex gap-6 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2"><input type="radio" checked={datos.kitType === 'stock_propio'} onChange={() => setDatos({...datos, kitType: 'stock_propio'})} /><label className="text-[9px] font-black uppercase">Stock Propio (Pre-armado)</label></div>
                    <div className="flex items-center gap-2"><input type="radio" checked={datos.kitType === 'stock_componentes'} onChange={() => setDatos({...datos, kitType: 'stock_componentes'})} /><label className="text-[9px] font-black uppercase">Sin Stock (Descuenta de Ítems)</label></div>
                  </div>
                )}
              </div>
              {datos.isKit && (
                <div className="space-y-4">
                  <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-ink/30" /><input className="form-input h-12 pl-10 text-xs font-black uppercase" placeholder="Buscar productos para el combo..." value={kitSearch} onChange={e => setKitSearch(e.target.value)} />{filteredProdsForKit.length > 0 && (<div className="absolute top-full left-0 right-0 bg-white border border-line rounded-lg shadow-2xl z-50 mt-1 overflow-hidden">{filteredProdsForKit.map(pk => (<div key={pk.id} onClick={() => { setDatos({...datos, kitItems: [...datos.kitItems, { productoId: pk.id, nombre: pk.nombre, cantidad: 1 }]}); setKitSearch(''); }} className="p-3 border-b border-line hover:bg-brand-gold-soft cursor-pointer flex justify-between items-center"><span className="text-xs font-black uppercase">{pk.nombre}</span><Plus className="w-4 h-4 text-brand-gold"/></div>))}</div>)}</div>
                  <div className="card border-line shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="bg-surface-soft"><th className="text-[10px] font-black uppercase text-left py-2 px-4">Componente</th><th className="text-[10px] font-black uppercase text-center py-2 px-4">Cant</th><th className="py-2 px-4"></th></tr></thead>
                      <tbody>
                        {datos.kitItems.map((ki: KitItem, index: number) => (
                          <tr key={index} className="border-b border-line/30"><td className="text-[11px] font-black uppercase text-ink py-2 px-4">{ki.nombre}</td><td className="text-center py-2 px-4"><input className="w-12 h-8 text-center font-black bg-surface-soft border-line" type="number" value={ki.cantidad} onChange={e => { const n = [...datos.kitItems]; n[index].cantidad = parseInt(e.target.value) || 1; setDatos({...datos, kitItems: n}); }} /></td><td className="text-center py-2 px-4"><button onClick={() => setDatos({...datos, kitItems: datos.kitItems.filter((_:any, i:number) => i !== index)})} className="text-status-danger"><Trash2 className="w-4 h-4"/></button></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-foot p-5 bg-surface-soft border-t border-line flex justify-end gap-3"><button className="btn btn-secondary px-8 font-black uppercase text-[10px]" onClick={onClose}>Cerrar</button><button className="btn btn-primary px-10 font-black uppercase text-[10px] shadow-lg flex items-center gap-2" onClick={handleSave}><Check className="w-4 h-4" /> {producto ? 'ACTUALIZAR' : 'CREAR PRODUCTO'}</button></div>
      </div>
    </div>
  );
}
