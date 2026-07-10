'use client';

import React, { useState, useEffect } from 'react';
import { AppState, Product, Movimiento, KitItem } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Boxes, 
  X, 
  BarChart3, 
  FileText, 
  History, 
  Gift, 
  Layers, 
  Trash, 
  ShoppingBag, 
  TrendingUp, 
  Printer, 
  RotateCcw, 
  Box, 
  ClipboardList, 
  Info, 
  Tag, 
  DollarSign, 
  Settings 
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

export default function InventoryModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
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

  const handleDownloadBasicInv = () => {
    generarPDFInventarioSimple(prods, state.empresa);
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
                {state.categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary shadow-sm" onClick={handleDownloadBasicInv}><FileText className="w-4 h-4" /> Exportar PDF</button>
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
              <table>
                <thead>
                  <tr className="bg-surface-soft">
                    <th className="font-black text-ink uppercase text-[10px]">Código</th>
                    <th className="font-black text-ink uppercase text-[10px]">Nombre Producto</th>
                    <th className="font-black text-ink uppercase text-[10px]">Categoría</th>
                    <th className="font-black text-ink uppercase text-[10px]">Costo USD</th>
                    <th className="font-black text-ink uppercase text-[10px]">P. Venta USD</th>
                    <th className="font-black text-ink uppercase text-[10px]">Stock</th>
                    <th className="font-black text-ink uppercase text-[10px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {prods.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-20 text-ink/30 font-black italic uppercase">No se encontraron productos reales</td></tr>
                  ) : (
                    prods.map(p => (
                      <tr key={p.id} className="border-b border-line/30 hover:bg-surface-warm/20 transition-colors">
                        <td className="mono text-xs font-black text-ink">{p.codigo}</td>
                        <td className="font-black text-ink uppercase">
                          <div className="flex items-center gap-2">
                            {p.isKit && <Layers className="w-3.5 h-3.5 text-brand-gold" />}
                            {p.nombre}
                          </div>
                        </td>
                        <td><span className="badge badge-neutral font-black">{p.categoria}</span></td>
                        <td className="mono font-bold text-ink">{Utils.fmtUSD(p.costoUSD)}</td>
                        <td className="mono text-brand-gold-deep font-black">{Utils.fmtUSD(p.precioUSD)}</td>
                        <td>
                          <span className={`badge ${p.stock <= (p.stockMinimo || 0) ? 'badge-err' : 'badge-ok'} font-black px-3`}>
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
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
          onUpdateLists={(lists) => updateState(lists)}
          onSave={(datos) => {
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
                  tipo: 'compra',
                  cantidad: nuevo.stock,
                  stockAntes: 0,
                  stockDespues: nuevo.stock,
                  fecha: Utils.ahora(),
                  referencia: 'Stock inicial'
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
                if (mov.tipo === 'ajuste_entrada' || mov.tipo === 'compra') {
                  const stockActual = p.stock;
                  const cantidadNueva = mov.cantidad;
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
  const uniqueValues = Array.from(new Set(state.productos.filter(p => p.activo).map(p => (p[groupBy] as string) || 'Sin asignar'))).sort();
  const filteredProducts = state.productos.filter(p => p.activo && (filterValue === '' || ((p[groupBy] as string) || 'Sin asignar') === filterValue));
  const totalCosto = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.costoUSD * p.stock), 0));
  const totalVenta = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.precioUSD * p.stock), 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi p-6 border-line shadow-md bg-white">
          <div className="text-[10px] font-black uppercase mb-1 text-ink opacity-60">Valor al Costo (CPP Total)</div>
          <div className="text-3xl font-black text-ink">{Utils.fmtUSD(totalCosto)}</div>
          <div className="text-sm font-bold mt-1 italic text-ink/70">{Utils.fmtBS(totalCosto * state.tasa)}</div>
        </div>
        <div className="kpi p-6 border-line shadow-md bg-white">
          <div className="text-[10px] font-black uppercase mb-1 text-ink opacity-60">Valor al Precio de Venta (Total)</div>
          <div className="text-3xl font-black text-status-success">{Utils.fmtUSD(totalVenta)}</div>
          <div className="text-sm font-bold mt-1 italic text-ink/70">{Utils.fmtBS(totalVenta * state.tasa)}</div>
        </div>
      </div>
      
      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
              <Boxes className="w-5 h-5 text-brand-gold" /> INVENTARIO CPP POR {groupBy.toUpperCase()}
            </h3>
            <select className="form-select bg-white text-ink border-none text-[10px] font-black uppercase h-8 px-3 rounded shadow-sm" value={filterValue} onChange={e => setFilterValue(e.target.value)}>
              <option value="">TODOS LOS ITEMS</option>
              {uniqueValues.map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary h-8 px-4 font-black uppercase text-[9px] shadow-sm" onClick={() => exportarPDFInventarioGeneral(filteredProducts, state.empresa, groupBy, { costo: totalCosto, venta: totalVenta })}>
            <FileText className="w-3.5 h-3.5" /> PDF Profesional
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px]">Cod.</th>
                <th className="font-black text-ink uppercase text-[10px]">Nombre Producto</th>
                <th className="font-black text-ink uppercase text-[10px] text-right">Costo USD</th>
                <th className="font-black text-ink uppercase text-[10px] text-right">Venta USD</th>
                <th className="font-black text-ink uppercase text-[10px] text-center">Stock</th>
                <th className="font-black text-ink uppercase text-[10px] text-right">Subtotal Costo</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-line/30 hover:bg-surface-warm/20">
                  <td className="mono text-[11px] font-black text-ink">{p.codigo}</td>
                  <td className="font-black uppercase text-xs text-ink">{p.nombre}</td>
                  <td className="mono text-right font-bold text-ink">{Utils.fmtUSD(p.costoUSD)}</td>
                  <td className="mono text-right text-brand-gold-deep font-black">{Utils.fmtUSD(p.precioUSD)}</td>
                  <td className="text-center"><span className="badge badge-neutral font-black">{p.stock}</span></td>
                  <td className="mono text-right font-black text-ink">{Utils.fmtUSD(Utils.round(p.costoUSD * p.stock))}</td>
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
  const [filter, setFilter] = useState('hoy');
  const ventas = state.ventas.filter(v => filter === 'hoy' ? v.fecha.startsWith(Utils.hoy()) : true);
  const totalVendidos = ventas.reduce((acc, v) => acc + v.items.reduce((sum, item) => sum + item.cantidad, 0), 0);

  return (
    <div className="space-y-4">
      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-gold" /> BITÁCORA DE VENTAS REALES
          </h3>
          <button className="btn btn-secondary h-8 px-4 font-black uppercase text-[9px] shadow-sm" onClick={() => exportarPDFVentasDetallado(ventas, state.empresa, filter, { totalVendidos })}>
            <FileText className="w-3.5 h-3.5" /> Exportar Ventas
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px]">Fecha</th>
                <th className="font-black text-ink uppercase text-[10px]">Producto</th>
                <th className="font-black text-ink uppercase text-[10px] text-center">Cant.</th>
                <th className="font-black text-ink uppercase text-[10px] text-right">Total USD</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {ventas.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin operaciones reales</td></tr>
              ) : (
                ventas.flatMap(v => v.items.map((item, idx) => (
                  <tr key={`${v.id}-${idx}`} className="border-b border-line/30">
                    <td className="text-xs font-bold text-ink">{idx === 0 ? Utils.fmtFecha(v.fecha) : ''}</td>
                    <td className="font-black uppercase text-xs text-ink">{item.nombre}</td>
                    <td className="font-black mono text-ink text-center">{item.cantidad}</td>
                    <td className="mono font-black text-brand-gold-deep text-right">{Utils.fmtUSD(item.subtotalUSD)}</td>
                  </tr>
                )))
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
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-brand-gold" /> REGISTRO DE DEVOLUCIONES PROCESADAS
          </h3>
          <button className="btn btn-secondary h-8 px-4 font-black uppercase text-[9px] shadow-sm" onClick={() => exportarPDFDevoluciones(devoluciones, state.empresa, 'Histórico', { totalUSD })}>
            <FileText className="w-3.5 h-3.5" /> PDF Auditoría
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px]">Fecha</th>
                <th className="font-black text-ink uppercase text-[10px]">Venta Ref.</th>
                <th className="font-black text-ink uppercase text-[10px] text-right">Total Devuelto</th>
                <th className="font-black text-ink uppercase text-[10px]">Motivo</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {devoluciones.map(d => (
                <tr key={d.id} className="border-b border-line/30">
                  <td className="text-xs font-bold text-ink">{Utils.fmtFecha(d.fecha)}</td>
                  <td className="text-ink font-black mono text-xs">{d.ventaId}</td>
                  <td className="mono text-right font-black text-status-danger">{Utils.fmtUSD(d.totalUSD)}</td>
                  <td className="text-xs uppercase italic font-bold text-ink/70">{d.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReporteKardex({ state, selectedId, onSelect }: { state: AppState, selectedId: string | null, onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const selectedProd = selectedId ? state.productos.find(p => p.id === selectedId) : null;
  const movs = selectedId ? state.movimientos.filter(m => m.productoId === selectedId).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];

  return (
    <div className="space-y-4">
      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <History className="w-5 h-5 text-brand-gold" /> KARDEX HISTÓRICO DE MOVIMIENTOS
          </h3>
          <div className="flex gap-2">
            <input className="form-input h-8 text-[10px] uppercase font-black" placeholder="BUSCAR CODIGO..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary h-8 px-4 font-black uppercase text-[9px]" onClick={() => selectedProd && exportarPDFKardex(selectedProd, movs, state.empresa)}>PDF</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px]">Fecha</th>
                <th className="font-black text-ink uppercase text-[10px]">Movimiento</th>
                <th className="font-black text-ink uppercase text-[10px] text-center">Cant.</th>
                <th className="font-black text-ink uppercase text-[10px] text-center">Stock Después</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {movs.map(m => (
                <tr key={m.id} className="border-b border-line/30">
                  <td className="text-[11px] font-black text-ink">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                  <td><span className="badge badge-neutral font-black uppercase text-[8px]">{m.tipo}</span></td>
                  <td className={`mono font-black text-center ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>{m.cantidad > 0 ? '+' : ''}{m.cantidad}</td>
                  <td className="mono font-black text-ink text-center">{m.stockDespues}</td>
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
  const ajustes = state.movimientos.filter(m => ['ajuste_entrada', 'ajuste_salida', 'consumo', 'colaboracion', 'compra'].includes(m.tipo)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const efectoNetoUSD = Utils.round(ajustes.reduce((acc, m) => {
    const p = state.productos.find(prod => prod.id === m.productoId);
    const costo = p?.costoUSD || 0;
    const esEntrada = m.tipo.includes('entrada') || m.tipo === 'compra' || m.tipo === 'devolucion';
    return acc + (esEntrada ? (m.cantidad * costo) : -(Math.abs(m.cantidad) * costo));
  }, 0));

  return (
    <div className="space-y-4">
      <div className={`kpi p-6 border-line shadow-md border-l-8 ${efectoNetoUSD < 0 ? 'bg-status-danger-soft border-l-status-danger' : 'bg-white border-l-status-success'}`}>
        <div className="text-[10px] font-black uppercase mb-1 text-ink opacity-60">Variación Neta de Capital en Inventario ($)</div>
        <div className={`text-3xl font-black ${efectoNetoUSD < 0 ? 'text-status-danger' : 'text-ink'}`}>{Utils.fmtUSD(efectoNetoUSD)}</div>
      </div>

      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-gold" /> BITÁCORA DE AJUSTES DE ALMACÉN
          </h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px]">Fecha</th>
                <th className="font-black text-ink uppercase text-[10px]">Producto</th>
                <th className="font-black text-ink uppercase text-[10px]">Ajuste</th>
                <th className="font-black text-ink uppercase text-[10px] text-center">Cantidad</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {ajustes.map(m => {
                const p = state.productos.find(prod => prod.id === m.productoId);
                return (
                  <tr key={m.id} className="border-b border-line/30">
                    <td className="text-[11px] font-bold text-ink">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                    <td className="font-black uppercase text-ink text-xs">{p?.nombre || 'ELIMINADO'}</td>
                    <td><span className="badge badge-neutral uppercase text-[8px] font-black">{m.tipo}</span></td>
                    <td className="mono font-black text-center">{m.cantidad}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReporteConsumo({ state }: { state: AppState }) {
  const movs = state.movimientos.filter(m => m.tipo === 'consumo' || m.tipo === 'colaboracion');
  const totalPerdidaUSD = Utils.round(movs.reduce((acc, m) => {
    const p = state.productos.find(prod => prod.id === m.productoId);
    return acc + (Math.abs(m.cantidad) * (p?.costoUSD || 0));
  }, 0));

  return (
    <div className="space-y-6">
      <div className="card shadow-lg border-line rounded-xl overflow-hidden">
        <div className="card-head bg-ink border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-black text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-gold" /> SALIDAS POR CONSUMO INTERNO
          </h3>
          <div className="text-right">
            <span className="text-[9px] text-white/50 block font-black uppercase">Pérdida Total</span>
            <span className="text-brand-gold font-black text-sm">{Utils.fmtUSD(totalPerdidaUSD)}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr className="bg-surface-soft">
                <th className="font-black text-ink uppercase text-[10px]">Fecha</th>
                <th className="font-black text-ink uppercase text-[10px]">Producto</th>
                <th className="font-black text-ink uppercase text-[10px] text-center">Cant.</th>
                <th className="font-black text-ink uppercase text-[10px] text-right">Costo Total</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {movs.map(m => {
                const p = state.productos.find(prod => prod.id === m.productoId);
                const sub = Math.abs(m.cantidad) * (p?.costoUSD || 0);
                return (
                  <tr key={m.id} className="border-b border-line/30">
                    <td className="text-xs font-bold text-ink">{m.fecha.slice(0, 10)}</td>
                    <td className="font-black uppercase text-xs text-ink">{p?.nombre}</td>
                    <td className="font-black mono text-center">{Math.abs(m.cantidad)}</td>
                    <td className="mono font-black text-status-danger text-right">{Utils.fmtUSD(sub)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ModalAjuste({ producto, onClose, onSave }: { producto: Product, onClose: () => void, onSave: (m: Movimiento, nuevoCosto?: number) => void }) {
  const [tipo, setTipo] = useState<'ajuste_entrada' | 'ajuste_salida' | 'consumo' | 'colaboracion'>('ajuste_entrada');
  const [cantidad, setCantidad] = useState<string>('1');
  const [nuevoCosto, setNuevoCosto] = useState<string>(String(producto.costoUSD));
  const [ref, setRef] = useState('');

  const handleSave = () => {
    const pCant = parseFloat(cantidad) || 0;
    const pCosto = parseFloat(nuevoCosto) || 0;
    if (pCant <= 0) return alert('Cantidad invalida');
    const mov: Movimiento = {
      id: Store.uid(),
      productoId: producto.id,
      tipo,
      cantidad: tipo === 'ajuste_entrada' ? pCant : -Math.abs(pCant),
      stockAntes: producto.stock,
      stockDespues: tipo === 'ajuste_entrada' ? producto.stock + pCant : producto.stock - Math.abs(pCant),
      fecha: Utils.ahora(),
      referencia: ref || 'Ajuste manual'
    };
    onSave(mov, tipo === 'ajuste_entrada' ? pCosto : undefined);
  };

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-md border-2 border-line">
        <div className="modal-head px-5 py-4 border-b border-line bg-surface-soft">
          <h3 className="text-ink font-black uppercase text-sm">AJUSTAR: {producto.nombre.toUpperCase()}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-ink" /></button>
        </div>
        <div className="modal-body p-6 space-y-4 bg-white">
          <div className="grid grid-cols-2 gap-4">
             <div className="form-group"><label className="text-[10px] font-black uppercase text-ink/60 mb-1 block">Tipo</label>
               <select className="form-select h-10 text-xs font-bold" value={tipo} onChange={e => setTipo(e.target.value as any)}>
                 <option value="ajuste_entrada">Entrada (+)</option><option value="ajuste_salida">Salida (-)</option>
               </select>
             </div>
             <div className="form-group"><label className="text-[10px] font-black uppercase text-ink/60 mb-1 block">Cantidad</label>
               <input className="form-input h-10 text-center font-black" type="text" value={cantidad} onChange={e => setCantidad(e.target.value)} />
             </div>
          </div>
          <button className="btn btn-primary w-full h-12 font-black uppercase text-xs shadow-md" onClick={handleSave}>Procesar Ajuste</button>
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
    costoUSD: String(producto?.costoUSD || '0'),
    precioUSD: String(producto?.precioUSD || '0'),
    precioEstandarUSD: String(producto?.precioEstandarUSD || producto?.precioUSD || '0'),
    precioMayorUSD: String(producto?.precioMayorUSD || '0'),
    precioOfertaUSD: String(producto?.precioOfertaUSD || '0'),
    precioPromoUSD: String(producto?.precioPromoUSD || '0'),
    margen: String(producto?.margen || '0'),
    precioBS: String(Utils.round((producto?.precioUSD || 0) * state.tasa)),
    stock: String(producto?.stock || '0'),
    stockMinimo: String(producto?.stockMinimo || '3'),
    aplicaIVA: producto?.aplicaIVA ?? true,
    isKit: producto?.isKit || false,
    kitItems: producto?.kitItems || []
  });

  const handlePriceUpdate = (key: string, val: string) => {
    const rVal = parseFloat(val) || 0;
    const rCosto = parseFloat(datos.costoUSD) || 0;
    const newMargen = rVal > 0 ? ((rVal - rCosto) / rVal) * 100 : 0;
    setDatos({ ...datos, [key]: val, precioUSD: val, precioBS: String(Utils.round(rVal * state.tasa)), margen: String(Utils.round(newMargen)) });
  };

  const handleCostoUpdate = (val: string) => {
    const rCosto = parseFloat(val) || 0;
    const rPrecio = parseFloat(datos.precioUSD) || 0;
    const newMargen = rPrecio > 0 ? ((rPrecio - rCosto) / rPrecio) * 100 : 0;
    setDatos({ ...datos, costoUSD: val, margen: String(Utils.round(newMargen)) });
  };

  const handleSubmit = () => {
    if (!datos.nombre || !datos.codigo) return alert('Nombre y Código son requeridos');
    onSave({
      ...datos,
      costoUSD: parseFloat(datos.costoUSD) || 0,
      precioUSD: parseFloat(datos.precioUSD) || 0,
      precioEstandarUSD: parseFloat(datos.precioEstandarUSD) || 0,
      precioMayorUSD: parseFloat(datos.precioMayorUSD) || 0,
      precioOfertaUSD: parseFloat(datos.precioOfertaUSD) || 0,
      precioPromoUSD: parseFloat(datos.precioPromoUSD) || 0,
      stock: parseInt(datos.stock) || 0,
      stockMinimo: parseInt(datos.stockMinimo) || 0,
      margen: parseFloat(datos.margen) || 0
    });
  };

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-2xl border-2 border-line rounded-xl overflow-hidden">
        <div className="modal-head py-4 px-6 border-b border-line bg-surface-soft flex justify-between items-center">
          <h3 className="text-lg font-black uppercase text-ink">{producto ? 'Editar Ficha' : 'Nuevo Ítem'}</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-ink" /></button>
        </div>

        <div className="flex bg-surface-soft border-b border-line px-6">
          <button onClick={() => setActiveTab('general')} className={`py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'general' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-ink/40'}`}>General</button>
          <button onClick={() => setActiveTab('precios')} className={`py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'precios' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-ink/40'}`}>Precios</button>
          <button onClick={() => setActiveTab('kit')} className={`py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'kit' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-ink/40'}`}>Kits</button>
        </div>

        <div className="modal-body p-6 space-y-6 bg-white overflow-y-auto max-h-[60vh]">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Código</label><input className="form-input h-10 font-black" value={datos.codigo} onChange={e => setDatos({...datos, codigo: e.target.value})} /></div>
                <div className="col-span-2 space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Nombre</label><input className="form-input h-10 font-black uppercase" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Categoría</label>
                  <select className="form-select h-10 text-xs font-bold" value={datos.categoria} onChange={e => setDatos({...datos, categoria: e.target.value})}>
                    {state.categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Stock</label><input className="form-input h-10 text-center font-black" type="text" value={datos.stock} onChange={e => setDatos({...datos, stock: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Min.</label><input className="form-input h-10 text-center font-black text-status-danger" type="text" value={datos.stockMinimo} onChange={e => setDatos({...datos, stockMinimo: e.target.value})} /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'precios' && (
            <div className="space-y-4">
              <div className="bg-surface-soft p-4 rounded-xl border border-line grid grid-cols-3 gap-4">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Costo USD</label><input className="form-input h-10 font-black" type="text" value={datos.costoUSD} onChange={e => handleCostoUpdate(e.target.value)} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-status-success">Margen %</label><input className="form-input h-10 font-black text-status-success" type="text" value={datos.margen} readOnly /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase text-brand-gold-deep">P. Venta $</label><input className="form-input h-10 font-black text-brand-gold-deep" type="text" value={datos.precioEstandarUSD} onChange={e => handlePriceUpdate('precioEstandarUSD', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Mayorista $</label><input className="form-input h-10 font-black" type="text" value={datos.precioMayorUSD} onChange={e => handlePriceUpdate('precioMayorUSD', e.target.value)} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Oferta $</label><input className="form-input h-10 font-black text-status-danger" type="text" value={datos.precioOfertaUSD} onChange={e => handlePriceUpdate('precioOfertaUSD', e.target.value)} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Promo $</label><input className="form-input h-10 font-black text-status-info" type="text" value={datos.precioPromoUSD} onChange={e => handlePriceUpdate('precioPromoUSD', e.target.value)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'kit' && (
            <div className="p-10 text-center opacity-30"><Layers className="w-12 h-12 mx-auto mb-2"/><p className="text-xs font-black uppercase">Módulo de Combos Disponible</p></div>
          )}
        </div>

        <div className="modal-foot p-5 bg-surface-soft border-t border-line flex justify-end gap-3">
          <button className="btn btn-secondary px-6 font-black uppercase text-xs" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary px-8 font-black uppercase text-xs shadow-lg" onClick={handleSubmit}>Guardar Ficha</button>
        </div>
      </div>
    </div>
  );
}