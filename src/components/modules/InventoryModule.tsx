'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Boxes, 
  X, 
  BarChart3, 
  FileText, 
  History, 
  RotateCcw, 
  Box, 
  ClipboardList, 
  PlusCircle,
  AlertCircle,
  TrendingUp,
  Check
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AppState, Product, Movimiento, Sale } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [showAjuste, setShowAjuste] = useState<string | null>(null);
  
  const prods = (state.productos || []).filter(p => 
    p.activo && 
    (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter ? p.categoria === catFilter : true)
  );

  const lowStockCount = (state.productos || []).filter(p => p.activo && p.stock <= (p.stockMinimo || 0)).length;

  const eliminar = (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este producto?')) return;
    const nuevos = state.productos.map(p => p.id === id ? { ...p, activo: false } : p);
    updateState({ productos: nuevos });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-brand-gold" />
          <h2 className="text-2xl font-bold uppercase italic tracking-tighter">Control de Inventario</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generarPDFInventarioSimple(prods, state.empresa)} className="gap-2">
            <FileText className="w-4 h-4" /> Catálogo PDF
          </Button>
          <Button className="bg-brand-gold text-black hover:bg-brand-gold/90 gap-2 font-bold" onClick={() => { setSelectedProduct(undefined); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-line shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-gold/10 rounded-xl"><Package className="w-6 h-6 text-brand-gold" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-ink opacity-40">Total Productos</p>
                <p className="text-2xl font-black text-ink">{state.productos.filter(p => p.activo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-line shadow-md ${lowStockCount > 0 ? 'bg-status-danger-soft' : 'bg-white'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-status-danger/20' : 'bg-surface-soft'}`}>
                <AlertCircle className={`w-6 h-6 ${lowStockCount > 0 ? 'text-status-danger' : 'text-ink/20'}`} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-ink opacity-40">Stock Bajo</p>
                <p className={`text-2xl font-black ${lowStockCount > 0 ? 'text-status-danger' : 'text-ink'}`}>{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="tabs border-b border-line no-print flex overflow-x-auto">
        <button onClick={() => setActiveTab('productos')} className={`tab ${activeTab === 'productos' ? 'active' : 'text-ink font-black'}`}>Catálogo</button>
        <button onClick={() => setActiveTab('reporte_general')} className={`tab ${activeTab === 'reporte_general' ? 'active' : 'text-ink font-black'}`}>Inventario CPP</button>
        <button onClick={() => setActiveTab('reporte_ventas')} className={`tab ${activeTab === 'reporte_ventas' ? 'active' : 'text-ink font-black'}`}>Ventas Agrupadas</button>
        <button onClick={() => setActiveTab('kardex')} className={`tab ${activeTab === 'kardex' ? 'active' : 'text-ink font-black'}`}>Kardex</button>
        <button onClick={() => setActiveTab('historial_ajustes')} className={`tab ${activeTab === 'historial_ajustes' ? 'active' : 'text-ink font-black'}`}>Ajustes</button>
        <button onClick={() => setActiveTab('consumo_colab')} className={`tab ${activeTab === 'consumo_colab' ? 'active' : 'text-ink font-black'}`}>Consumo</button>
      </div>

      <div className="animate-in fade-in duration-300">
        {activeTab === 'productos' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-ink opacity-30" />
                <Input className="pl-10" placeholder="Buscar por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select w-full md:w-auto h-10 px-4 font-bold text-xs" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">TODAS LAS CATEGORÍAS</option>
                {state.categorias?.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>

            <Card className="overflow-hidden shadow-lg border-line">
              <Table>
                <TableHeader className="bg-surface-soft">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase">Código</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Producto</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Costo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Venta</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-center">Stock</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prods.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-ink/20 font-black italic uppercase">No hay productos registrados</TableCell></TableRow>
                  ) : (
                    prods.map(p => (
                      <TableRow key={p.id} className="hover:bg-surface-warm/20">
                        <TableCell className="mono text-xs font-bold">{p.codigo}</TableCell>
                        <TableCell className="font-black uppercase text-xs">{p.nombre}</TableCell>
                        <TableCell className="mono text-xs font-bold text-ink/50">{Utils.fmtUSD(p.costoUSD)}</TableCell>
                        <TableCell className="mono text-xs font-black text-brand-gold-deep">{Utils.fmtUSD(p.precioUSD)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.stock <= (p.stockMinimo || 0) ? 'destructive' : 'secondary'} className="font-black">
                            {p.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-gold" onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }}><Edit2 className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-status-success" onClick={() => setShowAjuste(p.id)}><Boxes className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-status-danger" onClick={() => eliminar(p.id)}><Trash2 className="w-4 h-4"/></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {activeTab === 'reporte_general' && <ReporteGeneralComponent state={state} />}
        {activeTab === 'reporte_ventas' && <ReporteVentasComponent state={state} />}
        {activeTab === 'kardex' && <ReporteKardexComponent state={state} selectedId={selectedKardexId} onSelect={setSelectedKardexId} />}
        {activeTab === 'historial_ajustes' && <HistorialAjustesComponent state={state} />}
        {activeTab === 'consumo_colab' && <ReporteConsumoComponent state={state} />}
      </div>

      {isModalOpen && (
        <ModalProducto 
          state={state} 
          producto={selectedProduct} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(datos: any) => {
            let nuevos;
            if (selectedProduct) {
              nuevos = state.productos.map(p => p.id === selectedProduct.id ? { ...p, ...datos } : p);
            } else {
              const p = { ...datos, id: Store.uid(), fechaCreacion: Utils.hoy(), activo: true };
              nuevos = [...state.productos, p];
              if (p.stock > 0) {
                const mov: Movimiento = {
                  id: Store.uid(),
                  productoId: p.id,
                  tipo: 'inicial' as any,
                  cantidad: p.stock,
                  stockAntes: 0,
                  stockDespues: p.stock,
                  fecha: Utils.ahora(),
                  referencia: 'INICIAL'
                };
                updateState({ movimientos: [...state.movimientos, mov] });
              }
            }
            updateState({ productos: nuevos });
            setIsModalOpen(false);
          }}
          onUpdateLists={(lists: any) => updateState(lists)}
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
                if (mov.tipo === 'ajuste_entrada' || (mov.tipo as any) === 'compra') {
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

function ReporteVentasComponent({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const applyQuickFilter = (f: string) => {
    setUseDates(true);
    const today = new Date();
    if (f === 'hoy') { setDesde(Utils.hoy()); setHasta(Utils.hoy()); }
    else if (f === 'ayer') {
      const y = new Date(today); y.setDate(today.getDate() - 1);
      const s = y.toISOString().split('T')[0];
      setDesde(s); setHasta(s);
    }
  };

  const filteredVentas = state.ventas.filter(v => {
    const d = v.fecha.slice(0, 10);
    return useDates ? (d >= desde && d <= hasta) : (d === Utils.hoy());
  });

  const grouped = useMemo(() => {
    const res: Record<string, { nombre: string, cant: number, totalUSD: number }> = {};
    filteredVentas.forEach(v => {
      v.items.forEach(it => {
        if (!res[it.nombre]) res[it.nombre] = { nombre: it.nombre, cant: 0, totalUSD: 0 };
        res[it.nombre].cant += it.cantidad;
        res[it.nombre].totalUSD += it.subtotalUSD;
      });
    });
    return Object.values(res).sort((a, b) => b.cant - a.cant);
  }, [filteredVentas]);

  return (
    <div className="space-y-4">
      <div className="card p-4 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex gap-2">
          <Button variant={!useDates ? 'default' : 'outline'} size="sm" onClick={() => setUseDates(false)}>HOY</Button>
          <Button variant={useDates ? 'default' : 'outline'} size="sm" onClick={() => applyQuickFilter('ayer')}>AYER</Button>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" className="h-9 text-xs" value={desde} onChange={e => { setDesde(e.target.value); setUseDates(true); }} />
          <span className="text-[10px] font-black opacity-30">AL</span>
          <Input type="date" className="h-9 text-xs" value={hasta} onChange={e => { setHasta(e.target.value); setUseDates(true); }} />
        </div>
        <div className="flex-1 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => exportarPDFVentasDetallado(filteredVentas, state.empresa, 'Resumen', {})}>
            <FileText className="w-4 h-4 mr-2" /> Exportar PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-lg">
        <Table>
          <TableHeader className="bg-surface-soft">
            <TableRow>
              <TableHead className="font-black text-[10px] uppercase">Producto / Ítem</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-center">Unidades Vendidas</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-right">Recaudado (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin ventas en este periodo</TableCell></TableRow>
            ) : (
              grouped.map((g, idx) => (
                <TableRow key={idx} className="hover:bg-surface-warm/20">
                  <TableCell className="font-black uppercase text-xs">{g.nombre}</TableCell>
                  <TableCell className="text-center font-black mono">{g.cant}</TableCell>
                  <TableCell className="text-right font-black text-brand-gold-deep mono">{Utils.fmtUSD(g.totalUSD)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ReporteGeneralComponent({ state }: { state: AppState }) {
  const products = state.productos.filter(p => p.activo);
  const totalCosto = products.reduce((s, p) => s + (p.costoUSD * p.stock), 0);
  const totalVenta = products.reduce((s, p) => s + (p.precioUSD * p.stock), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi p-6 bg-white border-line shadow-md border-l-8 border-l-ink">
          <div className="text-[10px] font-black uppercase text-ink opacity-40 mb-1">Inversión Total (CPP)</div>
          <div className="text-3xl font-black text-ink">{Utils.fmtUSD(totalCosto)}</div>
        </div>
        <div className="kpi p-6 bg-white border-line shadow-md border-l-8 border-l-status-success">
          <div className="text-[10px] font-black uppercase text-ink opacity-40 mb-1">Capital a la Venta</div>
          <div className="text-3xl font-black text-status-success">{Utils.fmtUSD(totalVenta)}</div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-lg border-line">
        <div className="card-head bg-ink text-white px-6 py-4 flex justify-between items-center">
          <h3 className="font-black text-xs uppercase tracking-tighter flex items-center gap-2"><BarChart3 className="w-4 h-4 text-brand-gold" /> Valorización de Inventario</h3>
          <Button variant="secondary" size="sm" onClick={() => exportarPDFInventarioGeneral(products, state.empresa, 'categoria', { costo: totalCosto, venta: totalVenta })}>PDF Detallado</Button>
        </div>
        <Table>
          <TableHeader className="bg-surface-soft">
            <TableRow>
              <TableHead className="font-black text-[10px] uppercase">Producto</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-right">Costo Unit</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-center">Stock</TableHead>
              <TableHead className="font-black text-[10px] uppercase text-right">Total Costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-black uppercase text-xs">{p.nombre}</TableCell>
                <TableCell className="text-right mono text-xs">{Utils.fmtUSD(p.costoUSD)}</TableCell>
                <TableCell className="text-center font-bold">{p.stock}</TableCell>
                <TableCell className="text-right font-black mono text-brand-gold-deep">{Utils.fmtUSD(p.costoUSD * p.stock)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ReporteKardexComponent({ state, selectedId, onSelect }: { state: AppState, selectedId: string | null, onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const selectedProd = state.productos.find(p => p.id === selectedId);
  const movs = state.movimientos.filter(m => m.productoId === selectedId).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const matches = useMemo(() => {
    if (search.length < 2) return [];
    return state.productos.filter(p => p.activo && (p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.includes(search))).slice(0, 5);
  }, [search, state.productos]);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line shadow-sm">
        <label className="text-[10px] font-black uppercase text-ink opacity-40 block mb-2">Buscar producto para ver Kardex</label>
        <div className="relative">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Escriba nombre o código..." className="h-12 text-sm font-bold" />
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
        <Card className="overflow-hidden shadow-lg">
          <div className="card-head bg-ink text-white px-6 py-3 flex justify-between items-center">
            <h3 className="font-black text-xs uppercase tracking-widest text-brand-gold">{selectedProd.nombre}</h3>
            <Button variant="secondary" size="sm" onClick={() => exportarPDFKardex(selectedProd, movs, state.empresa)}>Exportar Kardex</Button>
          </div>
          <Table>
            <TableHeader className="bg-surface-soft">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase">Fecha</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Tipo</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Cant</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Stock Final</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs font-bold">{m.fecha.replace('T', ' ')}</TableCell>
                  <TableCell><span className="badge badge-neutral text-[9px] uppercase font-black">{m.tipo}</span></TableCell>
                  <TableCell className={`text-center font-black ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>{m.cantidad > 0 ? '+' : ''}{m.cantidad}</TableCell>
                  <TableCell className="text-center font-bold">{m.stockDespues}</TableCell>
                  <TableCell className="text-[10px] italic opacity-40">{m.referencia}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function HistorialAjustesComponent({ state }: { state: AppState }) {
  const ajustes = state.movimientos.filter(m => m.tipo.includes('ajuste') || m.tipo === 'compra').sort((a,b) => b.fecha.localeCompare(a.fecha));
  return (
    <Card className="overflow-hidden shadow-lg">
      <Table>
        <TableHeader className="bg-surface-soft">
          <TableRow>
            <TableHead className="font-black text-[10px] uppercase">Fecha</TableHead>
            <TableHead className="font-black text-[10px] uppercase">Producto</TableHead>
            <TableHead className="font-black text-[10px] uppercase">Operación</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center">Cant</TableHead>
            <TableHead className="font-black text-[10px] uppercase">Motivo / Ref</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ajustes.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-xs font-bold">{m.fecha.slice(0,10)}</TableCell>
              <TableCell className="font-black uppercase text-xs">{state.productos.find(p => p.id === m.productoId)?.nombre || 'Eliminado'}</TableCell>
              <TableCell><span className="badge badge-neutral text-[9px] font-black uppercase">{m.tipo}</span></TableCell>
              <TableCell className={`text-center font-black ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>{m.cantidad}</TableCell>
              <TableCell className="text-[10px] opacity-40 italic">{m.referencia}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ReporteConsumoComponent({ state }: { state: AppState }) {
  const consumos = state.movimientos.filter(m => m.tipo === 'consumo' || m.tipo === 'colaboracion').sort((a,b) => b.fecha.localeCompare(a.fecha));
  return (
    <Card className="overflow-hidden shadow-lg">
      <Table>
        <TableHeader className="bg-surface-soft">
          <TableRow>
            <TableHead className="font-black text-[10px] uppercase">Fecha</TableHead>
            <TableHead className="font-black text-[10px] uppercase">Producto</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center">Cant</TableHead>
            <TableHead className="font-black text-[10px] uppercase">Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consumos.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-xs font-bold">{m.fecha.slice(0,10)}</TableCell>
              <TableCell className="font-black uppercase text-xs">{state.productos.find(p => p.id === m.productoId)?.nombre}</TableCell>
              <TableCell className="text-center font-black text-status-danger">{Math.abs(m.cantidad)}</TableCell>
              <TableCell className="text-[10px] uppercase font-bold opacity-40">{m.referencia}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ModalProducto({ producto, state, onClose, onSave, onUpdateLists }: any) {
  const [datos, setDatos] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    categoria: producto?.categoria || state.categorias[0] || 'Otros',
    costoUSD: producto?.costoUSD?.toString() || '0',
    precioUSD: producto?.precioUSD?.toString() || '0',
    stock: producto?.stock?.toString() || '0',
    stockMinimo: producto?.stockMinimo?.toString() || '5'
  });

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-md border-2 border-line rounded-2xl overflow-hidden shadow-2xl">
        <div className="modal-head py-4 px-6 bg-ink text-white border-b border-white/10 flex justify-between items-center">
          <h3 className="font-black uppercase text-xs italic tracking-widest text-brand-gold">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/40 hover:text-white" /></button>
        </div>
        <div className="modal-body p-8 space-y-5">
           <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-40">Código de Barras</Label><Input value={datos.codigo} onChange={e => setDatos({...datos, codigo: e.target.value})} /></div>
           <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-40">Nombre del Producto</Label><Input className="uppercase" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} /></div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-40">Costo USD</Label><Input type="number" value={datos.costoUSD} onChange={e => setDatos({...datos, costoUSD: e.target.value})} /></div>
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-40">Venta USD</Label><Input type="number" value={datos.precioUSD} onChange={e => setDatos({...datos, precioUSD: e.target.value})} /></div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-40">Stock Inicial</Label><Input type="number" value={datos.stock} onChange={e => setDatos({...datos, stock: e.target.value})} /></div>
              <div className="space-y-1"><Label className="text-[10px] font-black uppercase opacity-40">Stock Mínimo</Label><Input type="number" value={datos.stockMinimo} onChange={e => setDatos({...datos, stockMinimo: e.target.value})} /></div>
           </div>
           <Button className="w-full bg-brand-gold text-black font-black uppercase h-14 shadow-xl" onClick={() => onSave({ ...datos, costoUSD: parseFloat(datos.costoUSD), precioUSD: parseFloat(datos.precioUSD), stock: parseFloat(datos.stock), stockMinimo: parseFloat(datos.stockMinimo) })}><Check className="w-5 h-5 mr-2" /> Guardar Producto</Button>
        </div>
      </div>
    </div>
  );
}

function ModalAjuste({ producto, onClose, onSave }: any) {
  const [tipo, setTipo] = useState('ajuste_entrada');
  const [cant, setCant] = useState('1');
  const [motivo, setMotivo] = useState('');

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-sm border-2 border-line rounded-2xl overflow-hidden shadow-2xl">
        <div className="modal-head py-4 px-6 bg-ink text-white border-b border-white/10">
          <h3 className="font-black uppercase text-xs text-brand-gold">Ajuste: {producto.nombre}</h3>
        </div>
        <div className="modal-body p-6 space-y-4">
           <div className="grid grid-cols-2 gap-3">
              <select className="form-select text-xs font-black h-10" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="ajuste_entrada">Entrada (+)</option><option value="ajuste_salida">Salida (-)</option>
              </select>
              <Input type="number" value={cant} onChange={e => setCant(e.target.value)} />
           </div>
           <Input className="uppercase text-xs" placeholder="Motivo del ajuste..." value={motivo} onChange={e => setMotivo(e.target.value)} />
           <Button className="w-full bg-brand-gold text-black font-black uppercase" onClick={() => onSave({ id: Store.uid(), productoId: producto.id, tipo: tipo as any, cantidad: tipo === 'ajuste_entrada' ? parseFloat(cant) : -parseFloat(cant), stockAntes: producto.stock, stockDespues: tipo === 'ajuste_entrada' ? producto.stock + parseFloat(cant) : producto.stock - parseFloat(cant), fecha: Utils.ahora(), referencia: motivo.toUpperCase() })}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}
