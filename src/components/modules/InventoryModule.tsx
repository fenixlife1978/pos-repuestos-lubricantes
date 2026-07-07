
'use client';

import React, { useState, useEffect } from 'react';
import { AppState, Product, Movimiento, KitItem } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { Plus, Search, Edit2, Trash2, Boxes, X, BarChart3, FileText, History, Gift, Layers, Settings2, Trash } from 'lucide-react';

export default function InventoryModule({ state, updateState }: { state: AppState, updateState: (s: Partial<AppState>) => void }) {
  const [activeTab, setActiveTab] = useState('productos');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selectedKardexId, setSelectedKardexId] = useState<string | null>(null);
  
  // Modales
  const [showAjuste, setShowAjuste] = useState<string | null>(null);
  const [showProducto, setShowProducto] = useState<string | null | 'nuevo'>(null);
  
  const prods = state.productos.filter(p => 
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
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#ffffff]" />
                <input className="form-input pl-10 bg-[#131313] text-white border-[#2a2a2a]" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-select w-auto bg-[#131313] text-white border-[#2a2a2a]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">Todas las categorias</option>
                {state.categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button className="btn btn-primary h-11 px-6 font-black uppercase text-xs" onClick={() => setShowProducto('nuevo')}><Plus className="w-4 h-4" /> Nuevo Producto</button>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr className="bg-[#0b0b0b]">
                    <th className="text-white font-black text-[10px] uppercase">Cod.</th>
                    <th className="text-white font-black text-[10px] uppercase">Nombre</th>
                    <th className="text-white font-black text-[10px] uppercase">Cat. / Dep.</th>
                    <th className="text-white font-black text-[10px] uppercase">Costo USD</th>
                    <th className="text-white font-black text-[10px] uppercase">P. Venta USD</th>
                    <th className="text-white font-black text-[10px] uppercase">Stock</th>
                    <th className="text-white font-black text-[10px] uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-[#131313]">
                  {prods.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-20 text-white font-black uppercase italic opacity-40">No se encontraron productos</td></tr>
                  ) : (
                    prods.map(p => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="mono text-white/60 text-xs font-bold">{p.codigo}</td>
                        <td className="font-bold text-white text-xs">
                          <div className="flex items-center gap-2">
                            {p.isKit && <Layers className="w-3 h-3 text-[#c8952e]" title="Es un Kit" />}
                            {p.nombre}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="badge badge-neutral mb-1 font-black text-[9px] uppercase">{p.categoria}</span>
                            <span className="text-[0.65rem] text-white font-black uppercase">{p.departamento || 'Sin Dept.'}</span>
                          </div>
                        </td>
                        <td className="mono text-white font-bold text-xs">{Utils.fmtUSD(p.costoUSD)}</td>
                        <td className="mono text-[#c8952e] font-black text-sm">{Utils.fmtUSD(p.precioUSD)}</td>
                        <td>
                          <span className={`badge ${p.stock <= p.stockMinimo ? 'badge-err' : 'badge-ok'} font-black text-[10px]`}>
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn-icon text-[#c8952e]" title="Editar" onClick={() => setShowProducto(p.id)}><Edit2 className="w-3.5 h-3.5" /></button>
                            <button className="btn-icon text-[#3a9bdc]" title="Ver Kardex" onClick={() => { setSelectedKardexId(p.id); setActiveTab('kardex'); }}><History className="w-3.5 h-3.5" /></button>
                            <button className="btn-icon text-[#27ae60]" title="Ajustes de Stock" onClick={() => setShowAjuste(p.id)}><Boxes className="w-3.5 h-3.5" /></button>
                            <button className="btn-icon text-[#e04848]" onClick={() => eliminar(p.id)} title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
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
      case 'historial_ajustes': return <HistorialAjustes state={state} />;
      case 'kardex': return <ReporteKardex state={state} selectedId={selectedKardexId} onSelect={setSelectedKardexId} />;
      case 'consumo_colab': return <ReporteConsumo state={state} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="tabs flex border-b border-[#2a2a2a] overflow-x-auto no-print">
        <button onClick={() => setActiveTab('productos')} className={`tab ${activeTab === 'productos' ? 'active' : ''} font-black uppercase tracking-widest text-[10px]`}>Productos</button>
        <button onClick={() => setActiveTab('reporte_general')} className={`tab ${activeTab === 'reporte_general' ? 'active' : ''} font-black uppercase tracking-widest text-[10px]`}>Reporte General (CPP)</button>
        <button onClick={() => setActiveTab('reporte_ventas')} className={`tab ${activeTab === 'reporte_ventas' ? 'active' : ''} font-black uppercase tracking-widest text-[10px]`}>Reporte de Ventas</button>
        <button onClick={() => setActiveTab('kardex')} className={`tab ${activeTab === 'kardex' ? 'active' : ''} font-black uppercase tracking-widest text-[10px]`}>Kardex</button>
        <button onClick={() => setActiveTab('historial_ajustes')} className={`tab ${activeTab === 'historial_ajustes' ? 'active' : ''} font-black uppercase tracking-widest text-[10px]`}>Historial de Ajustes</button>
        <button onClick={() => setActiveTab('consumo_colab')} className={`tab ${activeTab === 'consumo_colab' ? 'active' : ''} font-black uppercase tracking-widest text-[10px]`}>Consumo y Colab.</button>
      </div>

      {renderContent()}

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
                    finalCosto = ((stockActual * p.costoUSD) + (cantidadNueva * costoNuevo)) / stockTotal;
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

function ModalProducto({ producto, state, onClose, onSave, onUpdateLists }: { producto?: Product, state: AppState, onClose: () => void, onSave: (p: any) => void, onUpdateLists: (l: any) => void }) {
  const [datos, setDatos] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    categoria: producto?.categoria || state.categorias[0] || '',
    departamento: producto?.departamento || state.departamentos[0] || '',
    cantidad: producto?.cantidad || state.presentaciones[0] || '',
    marca: producto?.marca || state.marcas[0] || '',
    costoUSD: producto?.costoUSD || 0,
    precioUSD: producto?.precioUSD || 0,
    precioEstandarUSD: producto?.precioEstandarUSD || producto?.precioUSD || 0,
    precioMayorUSD: producto?.precioMayorUSD || 0,
    precioOfertaUSD: producto?.precioOfertaUSD || 0,
    precioPromoUSD: producto?.precioPromoUSD || 0,
    tipoPrecioPrincipal: producto?.tipoPrecioPrincipal || 'estandar',
    margen: producto?.margen || 0,
    precioBS: (producto?.precioUSD || 0) * state.tasa,
    stock: producto?.stock || 0,
    stockMinimo: producto?.stockMinimo || 3,
    proveedor: producto?.proveedor || '',
    aplicaIVA: producto?.aplicaIVA ?? true,
    isKit: producto?.isKit || false,
    kitType: producto?.kitType || 'stock_propio',
    kitItems: producto?.kitItems || [] as KitItem[]
  });

  const [kitSearch, setKitSearch] = useState('');
  const [provSearch, setProvSearch] = useState(producto?.proveedor || '');
  const [showProvSuggestions, setShowProvSuggestions] = useState(false);

  const recalcularDesdeUSD = (usd: number, costo: number = datos.costoUSD) => {
    const nuevoMargen = usd > 0 ? ((usd - costo) / usd) * 100 : 0;
    setDatos(d => ({ ...d, precioUSD: usd, precioEstandarUSD: usd, margen: nuevoMargen, precioBS: usd * state.tasa, costoUSD: costo }));
  };

  const recalcularDesdeMargen = (m: number, costo: number = datos.costoUSD) => {
    const factor = (1 - (m / 100));
    const usd = factor > 0 ? costo / factor : 0;
    setDatos(d => ({ ...d, margen: m, precioUSD: usd, precioEstandarUSD: usd, precioBS: usd * state.tasa, costoUSD: costo }));
  };

  const recalcularDesdeBS = (bs: number) => {
    const usd = bs / state.tasa;
    const nuevoMargen = usd > 0 ? ((usd - datos.costoUSD) / usd) * 100 : 0;
    setDatos(d => ({ ...d, precioBS: bs, precioUSD: usd, precioEstandarUSD: usd, margen: nuevoMargen }));
  };

  const handleSubmit = () => {
    if (!datos.nombre || !datos.codigo) return alert('Nombre y Código son requeridos');
    
    // Determinar precio de venta activo para el POS
    let pVenta = datos.precioEstandarUSD;
    if (datos.tipoPrecioPrincipal === 'mayor') pVenta = datos.precioMayorUSD;
    else if (datos.tipoPrecioPrincipal === 'oferta') pVenta = datos.precioOfertaUSD;
    else if (datos.tipoPrecioPrincipal === 'promo') pVenta = datos.precioPromoUSD;
    
    if (pVenta <= 0) return alert('El precio de venta seleccionado debe ser mayor a 0');
    
    onSave({ ...datos, precioUSD: pVenta });
  };

  const addToList = (key: 'categorias' | 'departamentos' | 'marcas' | 'presentaciones' | 'proveedores') => {
    const val = prompt(`Nueva entrada para ${key === 'presentaciones' ? 'presentación' : key === 'proveedores' ? 'proveedor' : key}:`);
    if (val) {
      const newList = [...(state[key] as string[]), val];
      onUpdateLists({ [key]: newList });
      const fieldKey = key === 'presentaciones' ? 'cantidad' : key === 'proveedores' ? 'proveedor' : key.slice(0, -1);
      setDatos(d => ({ ...d, [fieldKey]: val }));
      if (key === 'proveedores') setProvSearch(val);
    }
  };

  const removeFromList = (key: 'categorias' | 'departamentos' | 'marcas' | 'presentaciones' | 'proveedores', val: string) => {
    if (confirm(`¿Borrar "${val}" de la lista?`)) {
      const newList = (state[key] as string[]).filter(i => i !== val);
      onUpdateLists({ [key]: newList });
    }
  };

  const filteredProveedores = state.proveedores.filter(p => 
    p.toLowerCase().includes(provSearch.toLowerCase())
  );

  return (
    <div className="modal show">
      <div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box" style={{ maxWidth: '720px' }}>
        <div className="modal-head py-3 px-5 border-b border-[#2a2a2a] bg-[#181818]">
          <h3 className="text-white font-black uppercase tracking-widest text-sm">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="btn-icon btn-sm text-white" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body p-5 space-y-4 bg-[#131313]">
          
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group mb-0">
              <label className="form-label text-white font-black text-[10px] mb-1 uppercase">Código / Barcode</label>
              <input className="form-input py-1.5 mono text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.codigo} onChange={e => setDatos({...datos, codigo: e.target.value})} placeholder="Escanee" />
            </div>
            <div className="form-group mb-0">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label text-white font-black text-[10px] m-0 uppercase">Dpto.</label>
                <button className="text-[9px] text-[#c8952e] font-black uppercase" onClick={() => addToList('departamentos')}>+ ADD</button>
              </div>
              <div className="flex gap-1">
                <select className="form-select py-1.5 text-xs bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.departamento} onChange={e => setDatos({...datos, departamento: e.target.value})}>
                  {state.departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button className="btn-icon btn-sm h-7 w-7 text-[#e04848]" onClick={() => removeFromList('departamentos', datos.departamento)}><Trash className="w-3 h-3"/></button>
              </div>
            </div>
            <div className="form-group mb-0">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label text-white font-black text-[10px] m-0 uppercase">Cat.</label>
                <button className="text-[9px] text-[#c8952e] font-black uppercase" onClick={() => addToList('categorias')}>+ ADD</button>
              </div>
              <div className="flex gap-1">
                <select className="form-select py-1.5 text-xs bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.categoria} onChange={e => setDatos({...datos, categoria: e.target.value})}>
                  {state.categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="btn-icon btn-sm h-7 w-7 text-[#e04848]" onClick={() => removeFromList('categorias', datos.categoria)}><Trash className="w-3 h-3"/></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="form-group mb-0">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label text-white font-black text-[10px] m-0 uppercase">Marca</label>
                <button className="text-[9px] text-[#c8952e] font-black uppercase" onClick={() => addToList('marcas')}>+ ADD</button>
              </div>
              <div className="flex gap-1">
                <select className="form-select py-1.5 text-xs bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.marca} onChange={e => setDatos({...datos, marca: e.target.value})}>
                  {state.marcas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button className="btn-icon btn-sm h-7 w-7 text-[#e04848]" onClick={() => removeFromList('marcas', datos.marca)}><Trash className="w-3 h-3"/></button>
              </div>
            </div>
            <div className="form-group mb-0 col-span-2">
              <label className="form-label text-white font-black text-[10px] mb-1 uppercase">Nombre del producto</label>
              <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} placeholder="Ej: Johnnie Walker Black Label" />
            </div>
          </div>

          <div className="bg-[#181818] p-4 rounded-lg border border-[#2a2a2a]">
            <h4 className="text-[10px] font-black uppercase text-[#c8952e] mb-3">Costos y Precio Estándar</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="form-group mb-0">
                <label className="form-label text-white font-black text-[9px] mb-1">COSTO $</label>
                <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" step="0.01" value={datos.costoUSD} onChange={e => recalcularDesdeMargen(datos.margen, parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-white font-black text-[9px] mb-1">MARGEN %</label>
                <input className="form-input py-1.5 text-sm text-[#27ae60] font-black bg-[#0b0b0b] border-[#2a2a2a]" type="number" value={Math.round(datos.margen * 100) / 100} onChange={e => recalcularDesdeMargen(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group mb-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label text-white font-black text-[9px] m-0">VENTA $</label>
                  <input type="radio" name="principal" checked={datos.tipoPrecioPrincipal === 'estandar'} onChange={() => setDatos({...datos, tipoPrecioPrincipal: 'estandar'})} className="accent-[#c8952e]" title="Usar como principal" />
                </div>
                <input className="form-input py-1.5 text-sm text-[#c8952e] font-black bg-[#0b0b0b] border-[#2a2a2a]" type="number" step="0.01" value={Math.round(datos.precioEstandarUSD * 100) / 100} onChange={e => recalcularDesdeUSD(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-white font-black text-[9px] mb-1">VENTA BS</label>
                <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" step="0.01" value={Math.round(datos.precioBS * 100) / 100} onChange={e => recalcularDesdeBS(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <div className="bg-[#181818] p-4 rounded-lg border border-[#2a2a2a] space-y-3">
            <h4 className="text-[10px] font-black uppercase text-[#3a9bdc] mb-3">Precios Especiales y Ofertas</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="form-group mb-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label text-white font-black text-[9px] m-0 uppercase">Precio al Mayor</label>
                  <input type="radio" name="principal" checked={datos.tipoPrecioPrincipal === 'mayor'} onChange={() => setDatos({...datos, tipoPrecioPrincipal: 'mayor'})} className="accent-[#c8952e]" title="Usar como principal" />
                </div>
                <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" step="0.01" value={datos.precioMayorUSD} onChange={e => setDatos({...datos, precioMayorUSD: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="form-group mb-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label text-white font-black text-[9px] m-0 uppercase">Precio Oferta</label>
                  <input type="radio" name="principal" checked={datos.tipoPrecioPrincipal === 'oferta'} onChange={() => setDatos({...datos, tipoPrecioPrincipal: 'oferta'})} className="accent-[#c8952e]" title="Usar como principal" />
                </div>
                <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" step="0.01" value={datos.precioOfertaUSD} onChange={e => setDatos({...datos, precioOfertaUSD: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="form-group mb-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="form-label text-white font-black text-[9px] m-0 uppercase">Precio Promoción</label>
                  <input type="radio" name="principal" checked={datos.tipoPrecioPrincipal === 'promo'} onChange={() => setDatos({...datos, tipoPrecioPrincipal: 'promo'})} className="accent-[#c8952e]" title="Usar como principal" />
                </div>
                <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" step="0.01" value={datos.precioPromoUSD} onChange={e => setDatos({...datos, precioPromoUSD: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <p className="text-[8px] text-white font-bold uppercase italic opacity-60">Seleccione el icono radial junto a la etiqueta del precio para establecerlo como el principal para ventas.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="form-group mb-0">
              <label className="form-label text-white font-black text-[10px] mb-1 uppercase">Stock Inicial</label>
              <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" value={datos.stock} onChange={e => setDatos({...datos, stock: parseInt(e.target.value) || 0})} disabled={!!producto && !datos.isKit} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-white font-black text-[10px] mb-1 uppercase">Mínimo</label>
              <input className="form-input py-1.5 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" type="number" value={datos.stockMinimo} onChange={e => setDatos({...datos, stockMinimo: parseInt(e.target.value) || 0})} />
            </div>
            <div className="form-group mb-0">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label text-white font-black text-[10px] m-0 uppercase">Presentación</label>
                <button className="text-[9px] text-[#c8952e] font-black uppercase" onClick={() => addToList('presentaciones')}>+ ADD</button>
              </div>
              <div className="flex gap-1">
                <select className="form-select py-1.5 text-xs bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.cantidad} onChange={e => setDatos({...datos, cantidad: e.target.value})}>
                  {state.presentaciones.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button className="btn-icon btn-sm h-7 w-7 text-[#e04848]" onClick={() => removeFromList('presentaciones', datos.cantidad)}><Trash className="w-3 h-3"/></button>
              </div>
            </div>
          </div>

          <div className="bg-[#181818] p-4 rounded-lg border border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={datos.aplicaIVA} onChange={e => setDatos({...datos, aplicaIVA: e.target.checked})} className="w-4 h-4 accent-[#c8952e]" />
              <label className="form-label m-0 text-white font-black text-xs uppercase cursor-pointer" onClick={() => setDatos({...datos, aplicaIVA: !datos.aplicaIVA})}>Aplica Impuesto (IVA 16%)</label>
            </div>
            {!datos.aplicaIVA && <span className="badge badge-warn font-black text-[9px] uppercase animate-pulse">Producto Exento</span>}
          </div>

          <div className="form-group mb-0 relative">
            <div className="flex justify-between items-center mb-1">
              <label className="form-label text-white font-black text-[10px] m-0 uppercase">Proveedor</label>
              <button className="text-[9px] text-[#c8952e] font-black uppercase" onClick={() => addToList('proveedores')}>+ NUEVO PROVEEDOR</button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
              <input 
                className="form-input py-1.5 pl-10 text-sm bg-[#0b0b0b] text-white border-[#2a2a2a]" 
                value={provSearch} 
                onChange={e => {
                  setProvSearch(e.target.value);
                  setDatos({...datos, proveedor: e.target.value});
                  setShowProvSuggestions(true);
                }} 
                onFocus={() => setShowProvSuggestions(true)}
                placeholder="Buscar proveedor..." 
              />
              {showProvSuggestions && provSearch.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-[#1e1e1e] border border-[#333] rounded mt-1 max-h-32 overflow-y-auto z-[200] shadow-xl">
                  {filteredProveedores.length > 0 ? (
                    filteredProveedores.map(p => (
                      <div 
                        key={p} 
                        className="p-2 hover:bg-[#c8952e]/20 cursor-pointer text-xs flex justify-between items-center text-white"
                        onClick={() => {
                          setDatos({...datos, proveedor: p});
                          setProvSearch(p);
                          setShowProvSuggestions(false);
                        }}
                      >
                        <span className="font-bold">{p}</span>
                        <button className="text-[#e04848] opacity-50 hover:opacity-100" onClick={(e) => {
                          e.stopPropagation();
                          removeFromList('proveedores', p);
                        }}>
                          <Trash className="w-3 h-3"/>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-white/40 italic">No se encontraron resultados</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#2a2a2a] pt-3">
            <div className="flex items-center gap-3 mb-2">
              <input type="checkbox" checked={datos.isKit} onChange={e => setDatos({...datos, isKit: e.target.checked})} className="w-3.5 h-3.5 accent-[#c8952e]" />
              <label className="form-label m-0 text-white font-black text-xs flex items-center gap-2 uppercase">Este producto es un Kit <Layers className="w-3 h-3 text-[#c8952e]"/></label>
            </div>

            {datos.isKit && (
              <div className="bg-[#1e1e1e] p-3 rounded-lg border border-[#333] space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group mb-0">
                    <label className="form-label text-white font-black text-[9px] uppercase mb-1">Tipo de Stock</label>
                    <select className="form-select py-1 text-xs bg-[#0b0b0b] text-white border-[#2a2a2a]" value={datos.kitType} onChange={e => setDatos({...datos, kitType: e.target.value as any})}>
                      <option value="stock_propio">Propio</option>
                      <option value="stock_componentes">Calculado</option>
                    </select>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-white font-black text-[9px] uppercase mb-1">Añadir Componente</label>
                    <input className="form-input py-1 text-xs bg-[#0b0b0b] text-white border-[#2a2a2a]" placeholder="Buscar..." value={kitSearch} onChange={e => setKitSearch(e.target.value)} />
                  </div>
                </div>
                
                {kitSearch.length > 1 && (
                  <div className="bg-[#0b0b0b] border border-[#333] rounded max-h-24 overflow-y-auto">
                    {state.productos.filter(p => !p.isKit && p.activo && (p.nombre.toLowerCase().includes(kitSearch.toLowerCase()) || p.codigo.includes(kitSearch))).map(p => (
                      <div key={p.id} className="p-1.5 hover:bg-[#181818] cursor-pointer text-[10px] flex justify-between text-white" onClick={() => {
                        if (!datos.kitItems.find(i => i.productoId === p.id)) {
                          setDatos({...datos, kitItems: [...datos.kitItems, { productoId: p.id, nombre: p.nombre, cantidad: 1 }]});
                        }
                        setKitSearch('');
                      }}>
                        <span className="font-bold">{p.nombre}</span>
                        <span className="text-[#c8952e] font-black">${p.precioUSD}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {datos.kitItems.map((item, idx) => (
                    <div key={item.productoId} className="flex items-center gap-2 bg-[#0b0b0b] p-1.5 rounded text-[10px] border border-[#2a2a2a] text-white">
                      <span className="flex-1 truncate font-bold">{item.nombre}</span>
                      <input type="number" className="bg-[#181818] border border-[#333] rounded w-8 p-0.5 text-center text-white" value={item.cantidad} onChange={e => {
                        const ni = [...datos.kitItems];
                        ni[idx].cantidad = Math.max(1, parseInt(e.target.value) || 1);
                        setDatos({...datos, kitItems: ni});
                      }} />
                      <button className="text-[#e04848]" onClick={() => setDatos({...datos, kitItems: datos.kitItems.filter((_, i) => i !== idx)})}><X className="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
        <div className="modal-foot py-3 px-5 bg-[#181818] border-t border-[#2a2a2a]">
          <button className="btn btn-sm btn-secondary font-black uppercase text-xs text-white" onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-primary font-black uppercase text-xs" onClick={handleSubmit}>{producto ? 'Actualizar Producto' : 'Crear Producto'}</button>
        </div>
      </div>
    </div>
  );
}
// Rest of file continues same...
