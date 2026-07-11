import React, { useState, useMemo, useEffect } from 'react';
import { Package, Plus, Search, Filter, Pencil, Trash2, AlertCircle, FileText, ChevronRight, BarChart3, RotateCcw, TrendingUp, History, Box, ClipboardList, Info, Check, X, PlusCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppState, Product, Movimiento } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  generarPDFInventario, 
  exportarPDFVentasDetallado, 
  exportarPDFInventarioGeneral, 
  exportarPDFKardex, 
  exportarPDFHistorialAjustes, 
  exportarPDFConsumoInterno, 
  exportarPDFDevoluciones 
} from '@/lib/pdf-generator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InventoryModuleProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
}

const ProductFormModal = ({ isOpen, onClose, product, onSave, state, updateState }: any) => {
  const [formData, setFormData] = useState<any>({
    codigo: '',
    nombre: '',
    test: '',
    categoria: 'Ron',
    precioUSD: '0',
    stock: 0,
    stockMinimo: 5,
    costoUSD: '0',
    marca: '',
    proveedor: '',
    api_url: '',
    tipo_licor: 'Nacional',
    activo: true
  });

  useEffect(() => {
    if (product) {
      setFormData({
        codigo: product.codigo || '',
        nombre: product.nombre || '',
        categoria: product.categoria || 'Ron',
        precioUSD: product.precioUSD?.toString() ?? '0',
        stock: product.stock || 0,
        stockMinimo: product.stockMinimo || 5,
        costoUSD: product.costoUSD?.toString() ?? '0',
        marca: product.marca || '',
        proveedor: product.proveedor || '',
        api_url: product.api_url || '',
        tipo_licor: product.tipo_licor || 'Nacional',
        activo: product.activo !== undefined ? product.activo : true
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        categoria: 'Ron',
        precioUSD: '0',
        stock: 0,
        stockMinimo: 5,
        costoUSD: '0',
        marca: '',
        proveedor: '',
        api_url: '',
        tipo_licor: 'Nacional',
        activo: true
      });
    }
  }, [product, isOpen]);

  const handleSave = () => {
    if (!formData.nombre || !formData.codigo || !formData.precioUSD) {
      alert("Por favor complete los campos obligatorios");
      return;
    }

    const precioUSDNum = parseFloat(formData.precioUSD) || 0;
    const costoUSDNum = parseFloat(formData.costoUSD) || 0;

    let productosActualizados = [...state.productos];

    if (product) {
      const idx = productosActualizados.findIndex(p => p.id === product.id);
      if (idx >= 0) {
        productosActualizados[idx] = { 
          ...productosActualizados[idx], 
          ...formData,
          precioUSD: precioUSDNum,
          costoUSD: costoUSDNum,
          margen: precioUSDNum - costoUSDNum,
          id: product.id,
          bottom: product.fechaCreacion || Utils.hoy()
        };
      }
    } else {
      const newProduct: Product = {
        id: Store.uid(),
        codigo: formData.codigo || '',
        nombre: formData.nombre || '',
        categoria: formData.categoria || 'Ron',
        departamento: 'Licores',
        柔软: '750ml',
        marca: formData.marca || '',
        proveedor: formData.proveedor || '',
        costoUSD: costoUSDNum,
        precioUSD: precioUSDNum,
        margen: precioUSDNum - costoUSDNum,
        stock: Number(formData.stock) || 0,
        stockMinimo: Number(formData.stockMinimo) || 5,
        fechaCreacion: Utils.hoy(),
        activo: true
      };
      productosActualizados.push(newProduct);
      
      const initialMove: Movimiento = {
        id: Store.uid(),
        productoId: newProduct.id,
        tipo: 'entrada',
        cantidad: newProduct.stock,
        stockAntes: 0,
        stockDespues: newProduct.stock,
        fecha: Utils.ahora(),
        referencia: 'INICIAL'
      };
      updateState({ movimientos: [...state.movimientos, initialMove], productos: productosActualizados });
    }

    updateState({ productos: productosActualizados });
    onSave();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border-line text-ink">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-brand-gold">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Código de Barras</Label>
            <Input 
              value={formData.codigo} 
              onChange={(e) => setFormData({...formData, codigo: e.target.value})}
              className="bg-surface-soft border-line text-ink"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Categoría</Label>
            <select 
              className="form-select w-full"
              value={formData.categoria} 
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            >
              {state.categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Nombre del Producto</Label>
          <Input 
            value={formData.nombre} 
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            className="bg-surface-soft border-line text-ink"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Precio Venta (USD)</Label>
            <Input 
              type="number"
              value={formData.precioUSD}
              onChange={(e) => setFormData({...formData, precioUSD: e.target.value})}
              className="bg-surface-soft border-line text-ink font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Costo (USD)</Label>
            <Input 
              type="number"
              value={formData.costoUSD}
              onChange={(e) => setFormData({...formData, costoUSD: e.target.value})}
              className="bg-surface-soft border-line text-ink font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Stock Inicial</Label>
            <Input 
              type="number"
              value={formData.stock} 
              onChange={(e) => setFormData({...formData, stock: e.target.value})}
              className="bg-surface-soft border-line text-ink"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-ink font-bold uppercase text-[10px] tracking-wider">Stock Mínimo</Label>
            <Input 
              type="number"
              value={formData.stockMinimo} 
              onChange={(e) => setFormData({...formData, stockMinimo: e.target.value})}
              className="bg-surface-soft border-line text-ink"
            />
          </div>
        </div>

        <Button 
          className="w-full h-12 mt-4 bg-brand-gold text-black font-black uppercase tracking-widest hover:bg-brand-gold-deep"
          onClick={handleSave}
        >
          {product ? 'Actualizar' : 'Guardar'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const ModalAjuste = ({ producto, onClose, onSave }: { producto: Product, onClose: () => void, onSave: (m: Movimiento, nuevoCosto?: number) => void }) => {
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
      cantidad: (tipo === 'ajuste_entrada') ? pCant : -Math.abs(pCant),
      stockAntes: producto.stock,
      stockDespues: (tipo === 'ajuste_entrada') ? (producto.stock + pCant) : (producto.stock - Math.abs(pCant)),
      fecha: Utils.ahora(),
      referencia: motivo.toUpperCase()
    };
    onSave(mov, (tipo === 'ajuste_entrada') ? pCosto : undefined);
  };

  return (
    <div className="modal show"><div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box bg-white max-w-md border-2 border-line rounded-xl overflow-hidden shadow-2xl">
        <div className="modal-head py-3 px-5 border-b border-line bg-surface-soft">
          <h3 className="text-ink font-black uppercase text-xs">AJUSTAR: {producto.nombre.toUpperCase()}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-ink" /></button>
        </div>
        <div className="modal-body p-6 space-y-4 bg-white">
          <div className="grid grid-cols-2 gap-4">
             <div className="form-group"><label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Tipo</label>
               <select className="form-select h-10 text-xs font-bold" value={tipo} onChange={e => setTipo(e.target.value as any)}>
                 <option value="ajuste_entrada">Entrada (+)</option>
                 <option value="ajuste_salida">Salida (-)</option>
                 <option value="consumo">Consumo (-)</option>
                 <option value="colaboracion">Colaboración (-)</option>
               </select>
             </div>
             <div className="form-group"><label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Cantidad</label>
               <input className="form-input h-10 text-center font-black" type="text" value={cantidad} onChange={e => setCantidad(e.target.value)} />
             </div>
          </div>
          {(tipo === 'ajuste_entrada') && (
            <div className="form-group">
              <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Costo Unitario ($)</label>
              <input className="form-input h-10 text-xs font-black" type="text" value={nuevoCosto} onChange={e => setNuevoCosto(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Motivo del Ajuste</label>
            <input 
              className="form-input h-10 text-xs font-black uppercase" 
              placeholder="Ej: ERROR DE CONTEO, DAÑO, ETC..." 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)} 
            />
          </div>
          <button onClick={handleSave} className="btn btn-primary w-full h-14 font-black uppercase text-xs shadow-xl mt-2">Procesar Ajuste</button>
        </div>
      </div>
    </div>
  );
};

function ReporteVentas({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const applyQuickFilter = (type: string) => {
    const today = new Date();
    setUseDates(true);
    if (type === 'hoy') {
      setDesde(Utils.hoy()); setHasta(Utils.hoy());
    } else if (type === 'ayer') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setDesde(yStr); setHasta(yStr);
    } else if (type === 'mes') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setDesde(first); setHasta(Utils.hoy());
    } else if (type === '7dias') {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 6);
      setDesde(last7.toISOString().split('T')[0]); setHasta(Utils.hoy());
    }
  };

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
          groups[item.nombre] = {
            nombre: item.nombre,
            cantidad: 0,
            totalUSD: 0
          };
        }
        groups[item.nombre].cantidad += item.cantidad;
        groups[item.nombre].totalUSD += item.subtotalUSD;
      });
    });
    return Object.values(groups).sort((a, b) => b.cantidad - a.cantidad);
  }, [filteredVentas]);

  const handleExport = () => {
    const summaryVentas = [{
      id: 'RESUMEN',
      fecha: useDates ? `${desde} al ${hasta}` : Utils.hoy(),
      metodoPago: 'VARIOS',
      items: groupedVentas.map(g => ({
        nombre: g.nombre,
        cantidad: g.cantidad,
        precioUnitUSD: g.totalUSD / (g.cantidad || 1),
        subtotalUSD: g.totalUSD
      }))
    }];
    exportarPDFVentasDetallado(summaryVentas, state.empresa, useDates ? `${desde} al ${hasta}` : 'Hoy', {});
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => { setUseDates(false); applyQuickFilter('hoy'); }} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => applyQuickFilter('ayer')} className="px-4 py-1.5 rounded-md text-[10px] font-black uppercase text-ink/40 hover:bg-white transition-all">Ayer</button>
           <button onClick={() => applyQuickFilter('7dias')} className="px-4 py-1.5 rounded-md text-[10px] font-black uppercase text-ink/40 hover:bg-white transition-all">7 días</button>
           <button onClick={() => applyQuickFilter('mes')} className="px-4 py-1.5 rounded-md text-[10px] font-black uppercase text-ink/40 hover:bg-white transition-all">Mes</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        
        {useDates && (
          <div className="flex items-center gap-2">
            <div className="form-group mb-0">
              <label className="text-[8px] font-black uppercase opacity-40 block mb-0.5">Desde</label>
              <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="form-group mb-0">
              <label className="text-[8px] font-black uppercase opacity-40 block mb-0.5">Hasta</label>
              <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>
        )}
        
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={handleExport}>
            <FileText className="w-4 h-4" /> Exportar Resumen
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto / Item</TableHead>
                <TableHead className="text-center">Cant. Vendida</TableHead>
                <TableHead className="text-right">Total Recaudado (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedVentas.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin ventas en este periodo</td></tr>
              ) : (
                groupedVentas.map((item, idx) => (
                  <tr key={idx} className="border-b border-line/30">
                    <td className="font-black uppercase text-xs text-ink">{item.nombre}</td>
                    <td className="font-black mono text-ink text-center">{item.cantidad}</td>
                    <td className="mono font-black text-brand-gold-deep text-right">{Utils.fmtUSD(item.totalUSD)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteGeneral({ state }: { state: AppState }) {
  const [groupBy, setGroupBy] = useState<'categoria' | 'departamento' | 'proveedor'>('categoria');
  const [filterValue, setFilterValue] = useState<string>('');
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const applyQuickFilter = (type: string) => {
    const today = new Date();
    setUseDates(true);
    if (type === 'hoy') {
      setDesde(Utils.hoy()); setHasta(Utils.hoy());
    } else if (type === 'ayer') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setDesde(yStr); setHasta(yStr);
    } else if (type === 'mes') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setDesde(first); setHasta(Utils.hoy());
    } else if (type === '7dias') {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 6);
      setDesde(last7.toISOString().split('T')[0]); setHasta(Utils.hoy());
    }
  };

  const filteredProducts = state.productos.filter(p => {
    const matchesGroup = (filterValue === '' || ((p[groupBy] as any) || 'Sin asignar') === filterValue);
    const date = p.fechaCreacion ? p.fechaCreacion.slice(0, 10) : '';
    const matchesDate = !useDates || (date >= desde && date <= hasta);
    return p.activo && matchesGroup && matchesDate;
  });

  const totalCosto = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.costoUSD * p.stock), 0));
  const totalVenta = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.precioUSD * p.stock), 0));
  const uniqueValues = Array.from(new Set(state.productos.filter(p => p.activo).map(p => (p[groupBy] as any) || 'Sin asignar'))).sort();

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm no-print">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Actual</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Por Periodo</button>
        </div>
        
        {useDates && (
          <div className="flex items-center gap-2">
            <div className="form-group mb-0">
              <label className="text-[8px] font-black uppercase opacity-40 block mb-0.5">Desde</label>
              <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="form-group mb-0">
              <label className="text-[8px] font-black uppercase opacity-40 block mb-0.5">Hasta</label>
              <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>
        )}
        
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={() => exportarPDFInventarioGeneral(filteredProducts, state.empresa, groupBy, { costo: totalCosto, venta: totalVenta })}>
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi bg-white border-line shadow-md">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60">Valor al Costo (CPP Total)</div>
          <div className="text-3xl font-black text-ink">{Utils.fmtUSD(totalCosto)}</div>
        </div>
        <div className="kpi bg-white border-line shadow-md">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60">Valor al Precio de Venta (Total)</div>
          <div className="text-3xl font-black text-status-success">{Utils.fmtUSD(totalVenta)}</div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod.</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Venta Unit.</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Subtotal Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-line/30 hover:bg-gray-50">
                  <td className="mono text-[11px] font-black text-ink">{p.codigo}</td>
                  <td className="font-black uppercase text-xs text-ink">{p.nombre}</td>
                  <td className="mono text-right text-xs font-bold text-ink/60">{Utils.fmtUSD(p.costoUSD)}</td>
                  <td className="mono text-right text-brand-gold-deep font-black">{Utils.fmtUSD(p.precioUSD)}</td>
                  <td className="text-center"><span className="badge badge-neutral font-black">{p.stock}</span></td>
                  <td className="mono text-right font-black text-ink">{Utils.fmtUSD(Utils.round(p.costoUSD * p.stock))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteDevoluciones({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const filteredDevoluciones = useMemo(() => {
    return (state.devoluciones || []).filter(d => {
      const date = d.fecha.slice(0, 10);
      if (!useDates) return date === Utils.hoy();
      return date >= desde && d.fecha.slice(0, 10) <= hasta;
    });
  }, [state.devoluciones, desde, hasta, useDates]);

  const totalUSD = filteredDevoluciones.reduce((acc, d) => acc + d.totalUSD, 0);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={() => exportarPDFDevoluciones(filteredDevoluciones, state.empresa, useDates ? `${desde} al ${hasta}` : 'Hoy', { totalUSD })}>
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Venta Ref.</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevoluciones.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin devoluciones</td></tr>
              ) : (
                filteredDevoluciones.map(d => (
                  <tr key={d.id} className="border-b border-line/30">
                    <td className="text-xs font-bold text-ink">{Utils.fmtFecha(d.fecha)}</td>
                    <td className="text-ink font-black mono text-xs">{d.ventaId}</td>
                    <td className="py-2">
                       <div className="space-y-0.5">
                          {d.items.map((it, idx) => (
                             <p key={idx} className="text-[9px] font-black uppercase text-ink/70 leading-tight">• {it.nombre}</p>
                          ))}
                       </div>
                    </td>
                    <td className="text-center font-black text-ink text-xs">{d.items.reduce((s, it) => s + it.cantidad, 0)}</td>
                    <td className="mono font-black text-status-danger text-right">{Utils.fmtUSD(d.totalUSD)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HistorialAjustes({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const ajustes = useMemo(() => {
    return state.movimientos.filter(m => {
      if (!['ajuste_entrada', 'ajuste_salida', 'consumo', 'colaboracion', 'compra'].includes(m.tipo)) return false;
      if (m.referencia === 'INICIAL') return false;
      const d = m.fecha.slice(0, 10);
      if (!useDates) return d === Utils.hoy();
      return d >= desde && d <= hasta;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [state.movimientos, desde, hasta, useDates]);

  const efectoNetoUSD = useMemo(() => {
    return Utils.round(ajustes.reduce((acc, m) => {
      const p = state.productos.find(prod => prod.id === m.productoId);
      const costo = p?.costoUSD || 0;
      const esEntrada = m.tipo.includes('entrada') || m.tipo === 'compra' || m.tipo === 'devolucion';
      return acc + (esEntrada ? (m.cantidad * costo) : -(Math.abs(m.cantidad) * costo));
    }, 0));
  }, [ajustes, state.productos]);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={() => {
            const dataForPDF = ajustes.map(m => ({
              ...m,
              nombreProd: state.productos.find(prod => prod.id === m.productoId)?.nombre || 'ELIMINADO',
              costo: state.productos.find(prod => prod.id === m.productoId)?.costoUSD || 0
            }));
            exportarPDFHistorialAjustes(dataForPDF, state.empresa, efectoNetoUSD);
          }}>
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Total $</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin ajustes en este periodo</td></tr>
              ) : (
                ajustes.map((m, idx) => {
                  const p = state.productos.find(prod => prod.id === m.productoId);
                  const costo = p?.costoUSD || 0;
                  return (
                    <tr key={idx} className="border-b border-line/30">
                      <td className="text-xs font-bold text-ink">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                      <td className="font-black uppercase text-xs text-ink">{p?.nombre || 'ELIMINADO'}</td>
                      <td><span className="badge badge-neutral uppercase text-[8px] font-black">{m.tipo}</span></td>
                      <td className="mono font-black text-center text-xs">{m.cantidad}</td>
                      <td className="mono text-right text-xs font-bold text-ink/60">{Utils.fmtUSD(costo)}</td>
                      <td className="mono font-black text-brand-gold-deep text-right text-xs">{Utils.fmtUSD(Math.abs(m.cantidad) * costo)}</td>
                      <td className="text-[9px] font-black uppercase text-ink/40 italic">{m.referencia}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteConsumo({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const movs = useMemo(() => {
    return state.movimientos.filter(m => {
      if (m.tipo !== 'consumo' && m.tipo !== 'colaboracion') return false;
      const d = m.fecha.slice(0, 10);
      if (!useDates) return d === Utils.hoy();
      return d >= desde && d <= hasta;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [state.movimientos, desde, hasta, useDates]);

  const totalPerdidaUSD = useMemo(() => {
    return Utils.round(movs.reduce((acc, m) => {
      const p = state.productos.find(prod => prod.id === m.productoId);
      return acc + (Math.abs(m.cantidad) * (p?.costoUSD || 0));
    }, 0));
  }, [movs, state.productos]);

  const handleExport = () => {
    const dataForPDF = movs.map(m => {
      const p = state.productos.find(prod => prod.id === m.productoId);
      const costo = p?.costoUSD || 0;
      return { 
        ...m, 
        nombreProd: p?.nombre || 'ELIMINADO', 
        costoUnit: costo, 
        subtotal: Math.abs(m.cantidad) * costo 
      };
    });
    exportarPDFConsumoInterno(dataForPDF, state.empresa, totalPerdidaUSD);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft\" onClick={handleExport}>
            <FileText className="w-4 h-4" /> Exportar Consumo
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio Unit. $</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin movimientos de consumo</td></tr>
              ) : (
                movs.map((m, idx) => {
                  const p = state.productos.find(prod => prod.id === m.productoId);
                  const cost = p?.costoUSD || 0;
                  return (
                    <tr key={idx} className="border-b border-line/30">
                      <td className="text-xs font-bold text-ink">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                      <td className="font-black uppercase text-xs text-ink">{p?.nombre || 'ELIMINADO'}</td>
                      <td className="mono text-right text-xs font-bold text-ink/60">{Utils.fmtUSD(cost)}</td>
                      <td className="mono font-black text-ink text-center">{Math.abs(m.cantidad)}</td>
                      <td className="mono font-black text-status-danger text-right">{Utils.fmtUSD(Math.abs(m.cantidad) * cost)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteKardex({ state, selectedId, onSelect }: { state: AppState, selectedId: string | null, onSelect: (id: string) => void }) {
  const selectedProduct = state.productos.find(p => p.id === selectedId);
  const movs = state.movimientos
    .filter(m => m.productoId === selectedId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="form-group flex-1">
          <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Seleccionar Producto</label>
          <select 
            className="form-select h-10" 
            value={selectedId || ''} 
            onChange={e => onSelect(e.target.value)}
          >
            <option value="">Seleccione un producto...</option>
            {state.productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
            ))}
          </select>
        </div>
        <Button 
          variant="outline" 
          disabled={!selectedProduct}
          onClick={() => exportarPDFKardex(selectedProduct, movs, state.empresa)}
        >
          <FileText className="w-4 h-4 mr-2" /> Exportar Kardex
        </Button>
      </div>

      {selectedProduct && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead className="text-center">Antes</TableHead>
                  <TableHead className="text-center">Después</TableHead>
                  <TableHead>Referencia</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {movs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-20 text-ink/20 font-black italic uppercase">No hay movimientos registrados</td></tr>
                ) : (
                  movs.map(m => (
                    <tr key={m.id} className="border-b border-line/30">
                      <td className="text-xs font-bold text-ink">{m.fecha.replace('T', ' ')}</td>
                      <td className="uppercase text-xs font-bold text-ink">{m.tipo}</td>
                      <td className={`text-center font-black ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>
                        {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                      </td>
                      <td className="text-center text-ink/60">{m.stockAntes}</td>
                      <td className="text-center font-bold text-ink">{m.stockDespues}</td>
                      <td className="text-xs text-ink/60 italic">{m.referencia}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ state, updateState }) => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKardexId, setSelectedKardexId] = useState<string | null>(null);
  const [showAjusteModal, setShowAjusteModal] = useState<string | null>(null);

  const filteredProducts = (state.productos || []).filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = (state.productos || []).filter(p => (p.stock || 0) <= (p.stockMinimo || 0)).length;

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este producto?')) {
      const updated = state.productos.filter(p => p.id !== id);
      updateState({ productos: updated });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-brand-gold" />
          <h2 className="text-2xl font-bold">Control de Inventario</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              generarPDFInventario(state.productos);
            }}
            className="gap-2"
          >
            <FileText className="w-4 h-4" /> Exportar PDF
          </Button>
          <Button 
            onClick={() => {
              setSelectedProduct(undefined);
              setIsModalOpen(true);
            }}
            className="bg-brand-gold text-black hover:bg-brand-gold/90 gap-2 font-bold"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-gold/10 rounded-xl">
                <Package className="w-6 h-6 text-brand-gold" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Productos</p>
                <p className="text-2xl font-bold">{state.productos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Stock Bajo</p>
                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 border-b border-line overflow-x-auto">
        <button 
          onClick={() => setActiveTab('inventory')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}`}
        >
          Inventario
        </button>
        <button 
          onClick={() => setActiveTab('sales')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'sales' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}`}
        >
          Ventas por Fecha
        </button>
        <button 
          onClick={() => setActiveTab('reporte_general')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'reporte_general' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}`}
        >
          Inventario CPP
        </button>
        <button 
          onClick={() => setActiveTab('reporte_devoluciones')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'reporte_devoluciones' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}`}
        >
          Devoluciones
        </button>
        <button 
          onClick={() => setActiveTab('kardex')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'kardex' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}` }
        >
          Kardex
        </button>
        <button 
          onClick={() => setActiveTab('historial_ajustes')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'historial_ajustes' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}`}
        >
          Ajustes
        </button>
        <button 
          onClick={() => setActiveTab('consumo_colab')} 
          className={`pb-2 px-4 font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'consumo_colab' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-400'}`}
        >
          Consumo
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar por nombre o código..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio USD</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs font-bold text-brand-gold-deep">{p.codigo || 'N/A'}</TableCell>
                      <TableCell className="font-semibold">{p.nombre}</TableCell>
                      <TableCell>{p.categoria}</TableCell>
                      <TableCell className="font-bold text-brand-gold-deep">{Utils.fmtUSD(p.precioUSD)}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell>
                        <Badge variant={p.stock <= p.stockMinimo ? \"destructive\" : \"secondary\"}>
                          {p.stock <= p.stockMinimo ? \"Bajo Stock\" : \"Disponible\"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedProduct(p); setIsModalOpen(true); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-green-600" onClick={() => setShowAjusteModal(p.id)}>
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'sales' && <ReporteVentas state={state} />}
      {activeTab === 'reporte_general' && <ReporteGeneralComponent state={state} />}
      {activeTab === 'reporte_devoluciones' && <ReporteDevoluciones state={state} />}
      {activeTab === 'kardex' && <ReporteKardex state={state} selectedId={selectedKardexId} onSelect={setSelectedKardexId} />}
      {activeTab === 'historial_ajustes' && <HistorialAjustes state={state} />}
      {activeTab === 'consumo_colab' && <ReporteConsumo state={state} />}

      <ProductFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct}
        onSave={() => {}}
        state={state}
        updateState={updateState}
      />

      {showAjusteModal && (
        <ModalAjuste 
          producto={state.productos.find(p => p.id === showAjusteModal)!} 
          onClose={() => setShowAjusteModal(null)} 
          onSave={(mov, nuevoCosto) => {
            const nuevosProds = state.productos.map(p => {
              if (p.id === mov.productoId) {
                let finalCosto = p.costoUSD;
                if (mov.tipo === 'ajuste_entrada' || (mov.tipo as string) === 'compra') {
                  const stockActual = p.stock;
                  const cantidadNueva = mov.cantidad;
                  const costoNuevo = nuevoCosto || p.costoUSD;
                  const stockTotal = stockActual + Math.abs(cantidadNueva);
                  if (stockTotal > 0) {
                    finalCosto = Utils.round(((stockActual * p.costoUSD) + (Math.abs(cantidadNueva) * costoNuevo)) / stockTotal);
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
            setShowAjusteModal(null);
          }}
        />
      )}
    </div>
  );
};

function ReporteGeneral({ state }: { state: AppState }) {
  const [groupBy, setGroupBy] = useState<'categoria' | 'departamento' | 'proveedor'>('categoria');
  const [filterValue, setFilterValue] = useState<string>('');
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const applyQuickFilter = (type: string) => {
    const today = new Date();
    setUseDates(true);
    if (type === 'hoy') {
      setDesde(Utils.hoy()); setHasta(Utils.hoy());
    } else if (type === 'ayer') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setDesde(yStr); setHasta(yStr);
    } else if (type === 'mes') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setDesde(first); setHasta(Utils.hoy());
    } else if (type === '7dias') {
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 6);
      setDesde(last7.toISOString().split('T')[0]); setHasta(Utils.hoy());
    }
  };

  const filteredProducts = state.productos.filter(p => {
    const matchesGroup = (filterValue === '' || ((p[groupBy] as any) || 'Sin asignar') === filterValue);
    const date = p.fechaCreacion ? p.fechaCreacion.slice(0, 10) : '';
    const matchesDate = !useDates || (date >= desde && date <= hasta);
    return p.activo && matchesGroup && matchesDate;
  });

  const totalCosto = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.costoUSD * p.stock), 0));
  const totalVenta = Utils.round(filteredProducts.reduce((acc, p) => acc + (p.precioUSD * p.stock), 0));

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm no-print">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Actual</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Por Periodo</button>
        </div>
        
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={() => exportarPDFInventarioGeneral(filteredProducts, state.empresa, groupBy, { costo: totalCosto, venta: totalVenta })}>
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kpi bg-white border-line shadow-md">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60">Valor al Costo (CPP Total)</div>
          <div className="text-3xl font-black text-ink">{Utils.fmtUSD(totalCosto)}</div>
        </div>
        <div className="kpi bg-white border-line shadow-md">
          <div className="text-ink text-[10px] font-black uppercase mb-1 opacity-60">Valor al Precio de Venta (Total)</div>
          <div className="text-3xl font-black text-status-success">{Utils.fmtUSD(totalVenta)}</div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cod.</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Venta Unit.</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Subtotal Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-line/30 hover:bg-gray-50">
                  <td className="mono text-[11px] font-black text-ink">{p.codigo}</td>
                  <td className="font-black uppercase text-xs text-ink">{p.nombre}</td>
                  <td className="mono text-right text-xs font-bold text-ink/60">{Utils.fmtUSD(p.costoUSD)}</td>
                  <td className="mono text-right text-brand-gold-deep font-black">{Utils.fmtUSD(p.precioUSD)}</td>
                  <td className="text-center"><span className="badge badge-neutral font-black">{p.stock}</span></td>
                  <td className="mono text-right font-black text-ink">{Utils.fmtUSD(Utils.round(p.costoUSD * p.stock))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteDevoluciones({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const filteredDevoluciones = useMemo(() => {
    return (state.devoluciones || []).filter(d => {
      const date = d.fecha.slice(0, 10);
      if (!useDates) return date === Utils.hoy();
      return date >= desde && d.fecha.slice(0, 10) <= hasta;
    });
  }, [state.devoluciones, desde, hasta, useDates]);

  const totalUSD = filteredDevoluciones.reduce((acc, d) => acc + d.totalUSD, 0);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={() => exportarPDFDevoluciones(filteredDevoluciones, state.empresa, useDates ? `${desde} al ${hasta}` : 'Hoy', { totalUSD })}>
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Venta Ref.</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevoluciones.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin devoluciones</td></tr>
              ) : (
                filteredDevoluciones.map(d => (
                  <tr key={d.id} className="border-b border-line/30">
                    <td className="text-xs font-bold text-ink">{Utils.fmtFecha(d.fecha)}</td>
                    <td className="text-ink font-black mono text-xs">{d.ventaId}</td>
                    <td className="py-2">
                       <div className="space-y-0.5">
                          {d.items.map((it, idx) => (
                             <p key={idx} className="text-[9px] font-black uppercase text-ink/70 leading-tight">• {it.nombre}</p>
                          ))}
                       </div>
                    </td>
                    <td className="text-center font-black text-ink text-xs">{d.items.reduce((s, it) => s + it.cantidad, 0)}</td>
                    <td className="mono font-black text-status-danger text-right">{Utils.fmtUSD(d.totalUSD)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HistorialAjustes({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const ajustes = useMemo(() => {
    return state.movimientos.filter(m => {
      if (!['ajuste_entrada', 'ajuste_salida', 'consumo', 'colaboracion', 'compra'].includes(m.tipo)) return false;
      if (m.referencia === 'INICIAL') return false;
      const d = m.fecha.slice(0, 10);
      if (!useDates) return d === Utils.hoy();
      return d >= desde && d <= hasta;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [state.movimientos, desde, hasta, useDates]);

  const efectoNetoUSD = useMemo(() => {
    return Utils.round(ajustes.reduce((acc, m) => {
      const p = state.productos.find(prod => prod.id === m.productoId);
      const costo = p?.costoUSD || 0;
      const esEntrada = m.tipo.includes('entrada') || m.tipo === 'compra' || m.tipo === 'devolucion';
      return acc + (esEntrada ? (m.cantidad * costo) : -(Math.abs(m.cantidad) * costo));
    }, 0));
  }, [ajustes, state.productos]);

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={() => {
            const dataForPDF = ajustes.map(m => ({
              ...m,
              nombreProd: state.productos.find(prod => prod.id === m.productoId)?.nombre || 'ELIMINADO',
              costo: state.productos.find(prod => prod.id === m.productoId)?.costoUSD || 0
            }));
            exportarPDFHistorialAjustes(dataForPDF, state.empresa, efectoNetoUSD);
          }}>
            <FileText className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Total $</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin ajustes en este periodo</td></tr>
              ) : (
                ajustes.map((m, idx) => {
                  const p = state.productos.find(prod => prod.id === m.productoId);
                  const costo = p?.costoUSD || 0;
                  return (
                    <tr key={idx} className="border-b border-line/30">
                      <td className="text-xs font-bold text-ink">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                      <td className="font-black uppercase text-xs text-ink">{p?.nombre || 'ELIMINADO'}</td>
                      <td><span className="badge badge-neutral uppercase text-[8px] font-black">{m.tipo}</span></td>
                      <td className="mono font-black text-center text-xs">{m.cantidad}</td>
                      <td className="mono text-right text-xs font-bold text-ink/60">{Utils.fmtUSD(costo)}</td>
                      <td className="mono font-black text-brand-gold-deep text-right text-xs">{Utils.fmtUSD(Math.abs(m.cantidad) * costo)}</td>
                      <td className="text-[9px] font-black uppercase text-ink/40 italic">{m.referencia}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteConsumo({ state }: { state: AppState }) {
  const [desde, setDesde] = useState(Utils.hoy());
  const [hasta, setHasta] = useState(Utils.hoy());
  const [useDates, setUseDates] = useState(false);

  const movs = useMemo(() => {
    return state.movimientos.filter(m => {
      if (m.tipo !== 'consumo' && m.tipo !== 'colaboracion') return false;
      const d = m.fecha.slice(0, 10);
      if (!useDates) return d === Utils.hoy();
      return d >= desde && d <= hasta;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [state.movimientos, desde, hasta, useDates]);

  const totalPerdidaUSD = useMemo(() => {
    return Utils.round(movs.reduce((acc, m) => {
      const p = state.productos.find(prod => prod.id === m.productoId);
      return acc + (Math.abs(m.cantidad) * (p?.costoUSD || 0));
    }, 0));
  }, [movs, state.productos]);

  const handleExport = () => {
    const dataForPDF = movs.map(m => {
      const p = state.productos.find(prod => prod.id === m.productoId);
      const costo = p?.costoUSD || 0;
      return { 
        ...m, 
        nombreProd: p?.nombre || 'ELIMINADO', 
        costoUnit: costo, 
        subtotal: Math.abs(m.cantidad) * costo 
      };
    });
    exportarPDFConsumoInterno(dataForPDF, state.empresa, totalPerdidaUSD);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-white border-line flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex items-center gap-3 bg-surface-soft p-1 rounded-lg border border-line">
           <button onClick={() => setUseDates(false)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${!useDates ? 'bg-ink text-white' : 'text-ink/40'}`}>Hoy</button>
           <button onClick={() => setUseDates(true)} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${useDates ? 'bg-brand-gold text-white' : 'text-ink/40'}`}>Periodo</button>
        </div>
        {useDates && (
          <div className="flex items-center gap-2">
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" className="form-input h-8 text-xs font-bold px-2 w-32" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        )}
        <div className="flex-1 flex justify-end">
          <button className="btn btn-secondary h-10 px-6 border-line text-ink font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-surface-soft" onClick={handleExport}>
            <FileText className="w-4 h-4" /> Exportar Consumo
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio Unit. $</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-ink/20 font-black italic uppercase">Sin movimientos de consumo</td></tr>
              ) : (
                movs.map((m, idx) => {
                  const p = state.productos.find(prod => prod.id === m.productoId);
                  const cost = p?.costoUSD || 0;
                  return (
                    <tr key={idx} className="border-b border-line/30">
                      <td className="text-xs font-bold text-ink">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                      <td className="font-black uppercase text-xs text-ink">{p?.nombre || 'ELIMINADO'}</td>
                      <td className="mono text-right text-xs font-bold text-ink/60">{Utils.fmtUSD(cost)}</td>
                      <td className="mono font-black text-ink text-center">{Math.abs(m.cantidad)}</td>
                      <td className="mono font-black text-status-danger text-right">{Utils.fmtUSD(Math.abs(m.cantidad) * cost)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReporteKardex({ state, selectedId, onSelect }: { state: AppState, selectedId: string | null, onSelect: (id: string) => void }) {
  const selectedProduct = state.productos.find(p => p.id === selectedId);
  const movs = state.movimientos
    .filter(m => m.productoId === selectedId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="form-group flex-1">
          <label className="text-ink text-[10px] font-black uppercase block mb-1 opacity-60">Seleccionar Producto</label>
          <select 
            className="form-select h-10" 
            value={selectedId || ''} 
            onChange={e => onSelect(e.target.value)}
          >
            <option value="">Seleccione un producto...</option>
            {state.productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
            ))}
          </select>
        </div>
        <Button 
          variant="outline" 
          disabled={!selectedProduct}
          onClick={() => exportarPDFKardex(selectedProduct, movs, state.empresa)}
        >
          <FileText className="w-4 h-4 mr-2" /> Exportar Kardex
        </Button>
      </div>

      {selectedProduct && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead className="text-center">Antes</TableHead>
                  <TableHead className="text-center">Después</TableHead>
                  <TableHead>Referencia</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {movs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-20 text-ink/20 font-black italic uppercase">No hay movimientos registrados</td></tr>
                ) : (
                  movs.map(m => (
                    <tr key={m.id} className="border-b border-line/30">
                      <td className="text-xs font-bold text-ink">{m.fecha.replace('T', ' ')}</td>
                      <td className="uppercase text-xs font-bold text-ink">{m.tipo}</td>
                      <td className={`text-center font-black ${m.cantidad > 0 ? 'text-status-success' : 'text-status-danger'}`}>
                        {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                      </td>
                      <td className="text-center text-ink/60">{m.stockAntes}</td>
                      <td className="text-center font-bold text-ink">{m.stockDespues}</td>
                      <td className="text-xs text-ink/60 italic">{m.referencia}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export { InventoryModule };
export default InventoryModule;
