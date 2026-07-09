
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Search,
  CheckCircle,
  HandCoins,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  X,
  Trash
} from 'lucide-react';
import { Store, Utils } from '@/lib/db-store';
import { AppState, Product, Movimiento, PaymentMethod, KitItem } from '@/lib/types';

interface PurchaseItemTemp {
  productoId: string;
  nombre: string;
  cantidad: number;
  costoUnitarioUSD: number;
  subtotalUSD: number;
}

interface PurchaseModuleProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
}

export default function PurchaseModule({ state, updateState }: PurchaseModuleProps) {
  // 1. DATOS DE LA FACTURA
  const [proveedor, setProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fecha, setFecha] = useState(Utils.hoy());
  const [tasaCompra, setTasaCompra] = useState<number>(state.tasa);
  
  // 2. CONDICIONES DE PAGO
  const [condicion, setCondicion] = useState<'contado' | 'credito' | 'mixto'>('contado');
  const [diasPlazo, setDiasPlazo] = useState(30);
  const [montoPagadoUSD, setMontoPagadoUSD] = useState(0);
  const [montoPagadoBS, setMontoPagadoBS] = useState(0);

  // 3. AÑADIR PRODUCTOS
  const [busqueda, setBusqueda] = useState('');
  const [itemSeleccionado, setItemSeleccionado] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [costoInput, setCostoInput] = useState(0);
  const [loteTemporal, setLoteTemporal] = useState<PurchaseItemTemp[]>([]);
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  // Cálculos de Totales
  const totalUSD = loteTemporal.reduce((acc, item) => acc + item.subtotalUSD, 0);
  const totalBS = totalUSD * tasaCompra;

  // Lógica de actualización de montos según condición
  useEffect(() => {
    if (condicion === 'contado') {
      setMontoPagadoUSD(totalUSD);
      setMontoPagadoBS(totalUSD * tasaCompra);
    } else if (condicion === 'credito') {
      setMontoPagadoUSD(0);
      setMontoPagadoBS(0);
    }
  }, [condicion, totalUSD, tasaCompra]);

  const saldoPendienteUSD = Math.max(0, totalUSD - montoPagadoUSD);

  // Manejo de cambios en Mixto
  const handlePaidUsdChange = (val: number) => {
    setMontoPagadoUSD(val);
    setMontoPagadoBS(Utils.round(val * tasaCompra));
  };

  const handlePaidBsChange = (val: number) => {
    setMontoPagadoBS(val);
    setMontoPagadoUSD(Utils.round(val / tasaCompra));
  };

  // Buscador de productos
  const matches = useMemo(() => {
    if (busqueda.trim().length < 2) return [];
    return state.productos.filter(p => 
      p.activo && 
      (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase()))
    ).slice(0, 5);
  }, [busqueda, state.productos]);

  const handleSelectItem = (p: Product) => {
    setItemSeleccionado(p);
    setCostoInput(p.costoUSD);
    setBusqueda('');
  };

  const handleAddTempItem = () => {
    if (!itemSeleccionado || cantidad <= 0 || costoInput <= 0) return;
    
    const nuevo: PurchaseItemTemp = {
      productoId: itemSeleccionado.id,
      nombre: itemSeleccionado.nombre,
      cantidad,
      costoUnitarioUSD: costoInput,
      subtotalUSD: Utils.round(cantidad * costoInput)
    };

    setLoteTemporal([...loteTemporal, nuevo]);
    setItemSeleccionado(null);
    setCantidad(1);
    setCostoInput(0);
  };

  const handleRemoveTempItem = (idx: number) => {
    setLoteTemporal(loteTemporal.filter((_, i) => i !== idx));
  };

  const handleProcessPurchase = () => {
    if (!proveedor) return alert('Seleccione un proveedor');
    if (!numeroFactura) return alert('Ingrese el número de factura');
    if (loteTemporal.length === 0) return alert('Agregue productos a la lista');

    const ahoraStr = Utils.ahora();
    const fechaVencimiento = condicion === 'credito' ? 
      new Date(new Date(fecha).getTime() + (diasPlazo * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10) : 
      fecha;

    // Determinar estado de la factura
    const estado: any = saldoPendienteUSD === 0 ? 'pagada' : 
                    saldoPendienteUSD === totalUSD ? 'pendiente' : 'parcial';

    // 1. Actualizar Productos (Stock y CPP)
    const nuevosProductos = state.productos.map(p => {
      const itemCompra = loteTemporal.find(i => i.productoId === p.id);
      if (itemCompra) {
        const stockActual = p.stock || 0;
        const costoActual = p.costoUSD || 0;
        const nuevaCantidad = itemCompra.cantidad;
        const nuevoCosto = itemCompra.costoUnitarioUSD;
        
        const stockTotal = stockActual + nuevaCantidad;
        // Fórmula CPP: ((S1*C1) + (S2*C2)) / (S1+S2)
        const costoPromedio = Utils.round(((stockActual * costoActual) + (nuevaCantidad * nuevoCosto)) / stockTotal);

        return { ...p, stock: stockTotal, costoUSD: costoPromedio };
      }
      return p;
    });

    // 2. Registrar Movimientos en Kardex
    const nuevosMovimientos: Movimiento[] = loteTemporal.map(item => {
      const p = state.productos.find(prod => prod.id === item.productoId);
      return {
        id: Store.uid(),
        productoId: item.productoId,
        tipo: 'compra',
        cantidad: item.cantidad,
        stockAntes: p?.stock || 0,
        stockDespues: (p?.stock || 0) + item.cantidad,
        fecha: ahoraStr,
        referencia: `COMPRA FACT: ${numeroFactura} - PROV: ${proveedor}`
      };
    });

    // 3. Si es Crédito o Parcial, crear CxP
    const nuevasCxP = [...state.cxp];
    if (saldoPendienteUSD > 0) {
      nuevasCxP.push({
        id: 'CXP-' + Store.uid().slice(0, 6).toUpperCase(),
        fecha: fecha,
        fechaVencimiento,
        proveedor,
        concepto: `FACTURA COMPRA #${numeroFactura}`,
        montoUSD: totalUSD,
        abonadoUSD: montoPagadoUSD,
        saldoUSD: saldoPendienteUSD,
        estado: estado === 'pagada' ? 'pagada' : (montoPagadoUSD > 0 ? 'parcial' : 'pendiente')
      });
    }

    updateState({
      productos: nuevosProductos,
      movimientos: [...state.movimientos, ...nuevosMovimientos],
      cxp: nuevasCxP
    });

    alert('Compra registrada exitosamente. Inventario y costos actualizados.');
    
    // Limpiar Formulario
    setProveedor('');
    setNumeroFactura('');
    setLoteTemporal([]);
    setCondicion('contado');
    setBusqueda('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#c8952e]/10 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-[#c8952e]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Entrada por Compra</h1>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Suministro de Inventario y Control de Costos</p>
          </div>
        </div>
        <div className="bg-black/40 px-4 py-2 rounded-lg border border-white/10 text-right">
          <p className="text-[9px] text-white/40 font-black uppercase">Tasa del Sistema</p>
          <p className="text-sm font-black text-[#c8952e]">{state.tasa.toFixed(2)} <span className="text-[10px] opacity-60">BS/USD</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: DATOS Y CONDICIONES */}
        <div className="space-y-6">
          {/* DATOS FACTURA */}
          <div className="card">
            <div className="card-head py-3 px-5 border-b border-white/5">
              <h3 className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#3a9bdc]" /> Datos de la Factura
              </h3>
            </div>
            <div className="card-body p-5 space-y-4">
              <div className="form-group mb-0">
                <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Proveedor</label>
                <select 
                  className="form-select bg-black border-white/10 h-10 text-xs font-black uppercase" 
                  value={proveedor} 
                  onChange={e => setProveedor(e.target.value)}
                >
                  <option value="">SELECCIONE PROVEEDOR</option>
                  {state.proveedores.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="text-[10px] font-black uppercase text-white/40 block mb-1">N° Factura</label>
                  <input className="form-input h-10 bg-black text-white border-white/10 text-xs font-black uppercase" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} placeholder="000123" />
                </div>
                <div className="form-group mb-0">
                  <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Tasa Compra</label>
                  <input type="number" className="form-input h-10 bg-black text-[#c8952e] border-[#c8952e]/30 text-xs font-black" value={tasaCompra} onChange={e => setTasaCompra(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="form-group mb-0">
                <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Fecha Emisión</label>
                <input type="date" className="form-input h-10 bg-black text-white border-white/10 text-xs" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>
          </div>

          {/* CONDICIONES PAGO */}
          <div className="card border-[#c8952e]/20">
            <div className="card-head py-3 px-5 border-b border-white/5">
              <h3 className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                <HandCoins className="w-3.5 h-3.5 text-[#c8952e]" /> Condiciones de Pago
              </h3>
            </div>
            <div className="card-body p-5 space-y-4">
              <div className="flex gap-1">
                {['contado', 'credito', 'mixto'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setCondicion(c as any)}
                    className={`flex-1 h-9 rounded text-[9px] font-black uppercase transition-all ${condicion === c ? 'bg-[#c8952e] text-black' : 'bg-black text-white/40 border border-white/5 hover:bg-white/5'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {condicion === 'credito' && (
                <div className="p-3 bg-black rounded border border-white/10 animate-in slide-in-from-top-2">
                  <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Días de Plazo</label>
                  <input type="number" className="form-input h-9 bg-[#111] text-white border-white/10 text-xs font-black" value={diasPlazo} onChange={e => setDiasPlazo(parseInt(e.target.value) || 0)} />
                </div>
              )}

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-white/40">TOTAL FACTURA USD:</span>
                  <span className="text-white font-black">{totalUSD.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-white/40">TOTAL PAGADO USD:</span>
                  {condicion === 'mixto' ? (
                    <input 
                      type="number" 
                      className="w-24 h-7 bg-black border border-[#27ae60]/30 text-[#27ae60] text-right rounded px-2 font-black" 
                      value={montoPagadoUSD}
                      onChange={e => handlePaidUsdChange(parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <span className="text-[#27ae60] font-black">{montoPagadoUSD.toFixed(4)}</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-white/40">SALDO PENDIENTE USD:</span>
                  <span className="text-[#e04848] font-black">{saldoPendienteUSD.toFixed(4)}</span>
                </div>

                {condicion === 'mixto' && (
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <label className="text-[8px] font-black uppercase text-[#c8952e] block">Convertidor a Bolívares (Abono)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        className="flex-1 h-9 bg-black border border-white/10 text-white text-xs font-black px-3 rounded"
                        placeholder="Monto en BS"
                        value={montoPagadoBS}
                        onChange={e => handlePaidBsChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-[10px] font-black text-white/20">BS.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: SELECCIÓN DE PRODUCTOS Y TABLA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-head py-3 px-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                <span onClick={() => setShowNewProductModal(true)} className="cursor-pointer hover:scale-110 transition-transform text-[#27ae60] font-black text-lg">+</span> AÑADIR PRODUCTOS AL LOTE
              </h3>
              <button 
                onClick={() => setShowNewProductModal(true)}
                className="text-[9px] font-black uppercase text-[#27ae60] hover:text-[#c8952e] transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Registrar Nuevo Item
              </button>
            </div>
            <div className="card-body p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Buscador */}
                <div className="md:col-span-5 relative">
                  <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Buscar Producto</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
                    <input 
                      className="form-input h-10 pl-10 bg-black text-white border-white/10 text-xs" 
                      placeholder="Nombre o Código..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    />
                  </div>
                  {matches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[#1e1e1e] border border-white/10 rounded-b-lg shadow-2xl z-[100] mt-1 overflow-hidden">
                      {matches.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleSelectItem(p)}
                          className="p-3 border-b border-white/5 hover:bg-[#c8952e]/20 cursor-pointer flex justify-between items-center"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase text-white">{p.nombre}</span>
                            <span className="text-[9px] text-white/40 mono">{p.codigo}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black text-[#c8952e]">${p.costoUSD.toFixed(2)}</div>
                            <div className="text-[8px] text-white/60 uppercase">Stock: {p.stock}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulario Adición */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Cant.</label>
                  <input type="number" className="form-input h-10 bg-black text-white border-white/10 text-xs font-black" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 0)} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[9px] font-black uppercase text-white/40 block mb-1">Costo Unit. $</label>
                  <input type="number" className="form-input h-10 bg-black text-[#c8952e] border-[#c8952e]/30 text-xs font-black" value={costoInput} onChange={e => setCostoInput(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="md:col-span-2">
                  <button 
                    onClick={handleAddTempItem}
                    disabled={!itemSeleccionado}
                    className="btn btn-primary h-10 w-full font-black uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-20"
                  >
                    Añadir <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {itemSeleccionado && (
                <div className="mt-3 p-2 bg-[#c8952e]/5 rounded border border-[#c8952e]/20 flex items-center gap-2 animate-in fade-in">
                  <Layers className="w-4 h-4 text-[#c8952e]" />
                  <span className="text-[10px] font-black uppercase text-white">Preparado para añadir: <strong className="text-[#c8952e]">{itemSeleccionado.nombre}</strong></span>
                </div>
              )}
            </div>

            <div className="table-wrap border-t border-white/5">
              <table className="text-[10px]">
                <thead>
                  <tr className="bg-black/40">
                    <th className="py-3 px-5 text-white/40 font-black uppercase">Producto</th>
                    <th className="py-3 text-white/40 font-black uppercase text-center">Cant.</th>
                    <th className="py-3 text-white/40 font-black uppercase text-right">Costo USD</th>
                    <th className="py-3 text-white/40 font-black uppercase text-right">Subtotal USD</th>
                    <th className="py-3 px-5 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {loteTemporal.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-5 font-black uppercase text-white">{item.nombre}</td>
                      <td className="py-2 text-center text-white font-bold">{item.cantidad}</td>
                      <td className="py-2 text-right text-white/60 font-bold">${item.costoUnitarioUSD.toFixed(2)}</td>
                      <td className="py-2 text-right text-[#c8952e] font-black">${item.subtotalUSD.toFixed(2)}</td>
                      <td className="py-2 px-5 text-center">
                        <button onClick={() => handleRemoveTempItem(idx)} className="text-white/20 hover:text-[#e04848] transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loteTemporal.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-white/20 font-black uppercase italic tracking-widest">
                        No hay productos en la lista temporal
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-foot p-5 bg-black/40 flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                <div className="bg-[#111] p-3 rounded-lg border border-white/10">
                  <p className="text-[8px] text-white/40 font-black uppercase mb-1">Total en Bolívares</p>
                  <p className="text-base font-black text-white">{Utils.fmtBS(totalBS)}</p>
                </div>
                <div className="bg-[#111] p-3 rounded-lg border border-[#c8952e]/20">
                  <p className="text-[8px] text-[#c8952e]/60 font-black uppercase mb-1">Total Factura USD</p>
                  <p className="text-base font-black text-[#c8952e]">{Utils.fmtUSD(totalUSD)}</p>
                </div>
                <div className="bg-[#111] p-3 rounded-lg border border-[#27ae60]/20">
                  <p className="text-[8px] text-[#27ae60]/60 font-black uppercase mb-1">Total Pagado USD</p>
                  <p className="text-base font-black text-[#27ae60]">{Utils.fmtUSD(montoPagadoUSD)}</p>
                </div>
                <div className="bg-[#111] p-3 rounded-lg border border-[#e04848]/20">
                  <p className="text-[8px] text-[#e04848]/60 font-black uppercase mb-1">Saldo Pendiente USD</p>
                  <p className="text-base font-black text-[#e04848]">{Utils.fmtUSD(saldoPendienteUSD)}</p>
                </div>
              </div>
              <button 
                onClick={handleProcessPurchase}
                disabled={loteTemporal.length === 0}
                className="btn btn-primary h-14 w-full font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-[#c8952e]/10 disabled:opacity-20 transition-all"
              >
                Registrar Compra <CheckCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNewProductModal && (
        <ModalProducto 
          state={state}
          onClose={() => setShowNewProductModal(false)}
          onUpdateLists={(lists) => updateState(lists)}
          onSave={(datos) => {
            const nuevo: Product = {
              ...datos,
              id: Store.uid(),
              fechaCreacion: Utils.hoy(),
              activo: true
            };
            updateState({ productos: [...state.productos, nuevo] });
            setShowNewProductModal(false);
            handleSelectItem(nuevo);
          }}
        />
      )}
    </div>
  );
}

// Subcomponentes del Modal de Producto (Replicados del inventario para independencia del módulo)
function ModalProducto({ producto, state, onClose, onSave, onUpdateLists }: { producto?: Product, state: AppState, onClose: () => void, onSave: (p: any) => void, onUpdateLists: (l: any) => void }) {
  const [datos, setDatos] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    categoria: producto?.categoria || state.categorias[0] || '',
    departamento: producto?.departamento || state.departamentos[0] || '',
    cantidad: producto?.cantidad || state.presentaciones[0] || '750ml',
    marca: producto?.marca || state.marcas[0] || '',
    costoUSD: Utils.round(producto?.costoUSD || 0),
    precioUSD: Utils.round(producto?.precioUSD || 0),
    precioEstandarUSD: Utils.round(producto?.precioEstandarUSD || producto?.precioUSD || 0),
    precioMayorUSD: Utils.round(producto?.precioMayorUSD || 0),
    precioOfertaUSD: Utils.round(producto?.precioOfertaUSD || 0),
    precioPromoUSD: Utils.round(producto?.precioPromoUSD || 0),
    tipoPrecioPrincipal: producto?.tipoPrecioPrincipal || 'estandar',
    margen: producto?.margen || 0,
    precioBS: Utils.round((producto?.precioUSD || 0) * state.tasa),
    stock: producto?.stock || 0,
    stockMinimo: producto?.stockMinimo || 3,
    proveedor: producto?.proveedor || '',
    aplicaIVA: producto?.aplicaIVA ?? true,
    isKit: producto?.isKit || false,
    kitType: producto?.kitType || 'stock_propio',
    kitItems: producto?.kitItems || [] as KitItem[]
  });

  const [provSearch, setProvSearch] = useState(datos.proveedor || '');
  const [showProvList, setShowProvList] = useState(false);
  const [kitSearch, setKitSearch] = useState('');

  const updateSelectedPrice = (usd: number) => {
    const rUSD = Utils.round(usd);
    setDatos(d => {
      const update: any = { precioUSD: rUSD, precioBS: Utils.round(rUSD * state.tasa) };
      if (d.tipoPrecioPrincipal === 'estandar') update.precioEstandarUSD = rUSD;
      else if (d.tipoPrecioPrincipal === 'mayor') update.precioMayorUSD = rUSD;
      else if (d.tipoPrecioPrincipal === 'oferta') update.precioOfertaUSD = rUSD;
      else if (d.tipoPrecioPrincipal === 'promo') update.precioPromoUSD = rUSD;
      return { ...d, ...update };
    });
  };

  const recalcularDesdeUSD = (usd: number, costo: number = datos.costoUSD) => {
    const rUSD = Utils.round(usd);
    const rCosto = Utils.round(costo);
    const nuevoMargen = rUSD > 0 ? ((rUSD - rCosto) / rUSD) * 100 : 0;
    setDatos(d => ({ ...d, precioUSD: rUSD, margen: nuevoMargen, precioBS: Utils.round(rUSD * state.tasa), costoUSD: rCosto }));
    updateSelectedPrice(rUSD);
  };

  const recalcularDesdeMargen = (m: number, costo: number = datos.costoUSD) => {
    const rCosto = Utils.round(costo);
    const factor = (1 - (m / 100));
    const usd = factor > 0 ? Utils.round(rCosto / factor) : 0;
    setDatos(d => ({ ...d, margen: m, precioUSD: usd, precioBS: Utils.round(usd * state.tasa), costoUSD: rCosto }));
    updateSelectedPrice(usd);
  };

  const recalcularDesdeBS = (bs: number) => {
    const usd = Utils.round(bs / state.tasa);
    const rCosto = Utils.round(datos.costoUSD);
    const nuevoMargen = usd > 0 ? ((usd - rCosto) / usd) * 100 : 0;
    setDatos(d => ({ ...d, precioBS: Utils.round(bs), precioUSD: usd, margen: nuevoMargen }));
    updateSelectedPrice(usd);
  };

  useEffect(() => {
    let p = datos.precioEstandarUSD;
    if (datos.tipoPrecioPrincipal === 'mayor') p = datos.precioMayorUSD;
    if (datos.tipoPrecioPrincipal === 'oferta') p = datos.precioOfertaUSD;
    if (datos.tipoPrecioPrincipal === 'promo') p = datos.precioPromoUSD;
    
    p = Utils.round(p);
    const rCosto = Utils.round(datos.costoUSD);
    const m = p > 0 ? ((p - rCosto) / p) * 100 : 0;
    setDatos(d => ({ ...d, precioUSD: p, precioBS: Utils.round(p * state.tasa), margen: m }));
  }, [datos.tipoPrecioPrincipal]);

  const handleSubmit = () => {
    if (!datos.nombre || !datos.codigo) return alert('Nombre y Código son requeridos');
    onSave(datos);
  };

  return (
    <div className="modal show">
      <div className="modal-bg" onClick={onClose}></div>
      <div className="modal-box" style={{ maxWidth: '680px' }}>
        <div className="modal-head py-3 px-5 bg-[#181818] border-b border-white/5">
          <h3 className="text-base font-black uppercase text-white">{producto ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <button className="btn-icon btn-sm" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body p-5 space-y-4 bg-[#131313]">
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group mb-0">
              <label className="form-label text-[10px] mb-1 uppercase text-white font-black">Código / Barcode</label>
              <input className="form-input py-1.5 mono text-sm bg-black" value={datos.codigo} onChange={e => setDatos({...datos, codigo: e.target.value})} placeholder="Escanee" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-[10px] m-0 uppercase text-white font-black mb-1">Dpto.</label>
              <select className="form-select py-1.5 text-xs bg-black text-white border-white/10" value={datos.departamento} onChange={e => setDatos({...datos, departamento: e.target.value})}>
                {state.departamentos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-[10px] m-0 uppercase text-white font-black mb-1">Cat.</label>
              <select className="form-select py-1.5 text-xs bg-black text-white border-white/10" value={datos.categoria} onChange={e => setDatos({...datos, categoria: e.target.value})}>
                {state.categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group mb-0">
              <label className="form-label text-[10px] m-0 uppercase text-white font-black mb-1">Marca</label>
              <select className="form-select py-1.5 text-xs bg-black text-white border-white/10" value={datos.marca} onChange={e => setDatos({...datos, marca: e.target.value})}>
                {state.marcas.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group mb-0 col-span-2">
              <label className="form-label text-[10px] mb-1 uppercase text-white font-black">Nombre del producto</label>
              <input className="form-input py-1.5 text-sm bg-black border-white/10" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} placeholder="Ej: Johnnie Walker" />
            </div>
          </div>
          <div className="bg-[#181818] p-3 rounded-lg border border-[#2a2a2a]">
            <div className="grid grid-cols-4 gap-3">
              <div className="form-group mb-0">
                <label className="form-label text-[9px] mb-1 text-white/60 uppercase">COSTO $</label>
                <input className="form-input py-1.5 text-sm bg-black" type="number" step="0.01" value={datos.costoUSD} onChange={e => recalcularDesdeMargen(datos.margen, parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[9px] mb-1 text-white/60 uppercase">MARGEN %</label>
                <input className="form-input py-1.5 text-sm text-[#27ae60] font-bold bg-black" type="number" step="0.01" value={Math.round(datos.margen * 100) / 100} onChange={e => recalcularDesdeMargen(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[9px] mb-1 text-white/60 uppercase">VENTA $</label>
                <input className="form-input py-1.5 text-sm text-[#c8952e] font-black bg-black" type="number" step="0.01" value={datos.precioUSD} onChange={e => recalcularDesdeUSD(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[9px] mb-1 text-white/60 uppercase">VENTA BS</label>
                <input className="form-input py-1.5 text-sm font-bold bg-black" type="number" step="0.01" value={datos.precioBS} onChange={e => recalcularDesdeBS(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group mb-0">
              <label className="form-label text-[10px] mb-1 uppercase text-white font-black">Stock Inicial</label>
              <input className="form-input py-1.5 text-sm bg-black" type="number" value={datos.stock} onChange={e => setDatos({...datos, stock: parseInt(e.target.value) || 0})} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-[10px] mb-1 uppercase text-white font-black">Mínimo</label>
              <input className="form-input py-1.5 text-sm bg-black" type="number" value={datos.stockMinimo} onChange={e => setDatos({...datos, stockMinimo: parseInt(e.target.value) || 0})} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-[10px] m-0 uppercase text-white font-black mb-1">Presentación</label>
              <select className="form-select py-1.5 text-xs bg-black text-white border-white/10" value={datos.cantidad} onChange={e => setDatos({...datos, cantidad: e.target.value})}>
                {state.presentaciones.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot py-3 px-5 bg-[#181818] border-t border-white/5 flex justify-end gap-2">
          <button className="btn btn-sm btn-secondary font-black uppercase text-white" onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-primary font-black uppercase" onClick={handleSubmit}>{producto ? 'Actualizar' : 'Crear e Importar'}</button>
        </div>
      </div>
    </div>
  );
}
