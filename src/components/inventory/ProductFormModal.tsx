"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AppState, Product, KitItem } from '@/lib/types';
import { Utils, Store } from '@/lib/db-store';
import { 
  X, Box, PlusCircle, MinusCircle, Search, Trash2, 
  Hash, DollarSign, RefreshCw, Printer, Scan,
  Tag, Eye, EyeOff, Save, FilePlus, Wrench, Fuel,
  Check, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// ===== INTERFAZ UNIFICADA QUE SOPORTA AMBOS SISTEMAS =====
interface ProductFormModalProps {
  isOpen?: boolean;
  onClose: () => void;
  editingProduct?: Product | null;
  store?: AppState;
  updateStore?: (newState: Partial<AppState>) => void;
  producto?: Product;
  state?: AppState;
  onSave?: (p: any) => void;
  onUpdateLists?: (l: any) => void;
}

const CleanInput = React.forwardRef<any, any>(
  ({ className, type = "text", ...props }, ref) => (
    <Input 
      ref={ref}
      type={type} 
      className={`${className} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} 
      {...props} 
    />
  )
);
CleanInput.displayName = 'CleanInput';

export function ProductFormModalComponent({ 
  isOpen = true,
  onClose,
  editingProduct,
  store,
  updateStore,
  producto,
  state,
  onSave,
  onUpdateLists
}: ProductFormModalProps) {
  const effectiveState = (store || state || {}) as AppState;
  const effectiveProduct = editingProduct || producto || null;
  
  const handleSave = (productData: any) => {
    if (onSave) {
      onSave(productData);
      return;
    }
    if (updateStore) {
      const currentProducts = effectiveState.productos || [];
      if (effectiveProduct) {
        updateStore({
          productos: currentProducts.map((p: any) => p.id === effectiveProduct.id ? productData : p)
        });
      } else {
        updateStore({
          productos: [...currentProducts, productData]
        });
      }
      onClose();
      return;
    }
    console.warn('No se encontró onSave ni updateStore');
  };
  
  const handleUpdateLists = (listData: any) => {
    if (onUpdateLists) {
      onUpdateLists(listData);
      return;
    }
    if (updateStore) {
      updateStore(listData);
      return;
    }
    console.warn('No se encontró onUpdateLists ni updateStore');
  };
  
  const safeState = effectiveState || ({} as AppState);
  const exchangeRate = safeState?.tasa || 36.50;
  
  const categorias = safeState?.categorias || ['Repuesto', 'Lubricante', 'Filtro', 'Químico', 'Accesorio', 'Batería', 'Caucho', 'Freno', 'Suspensión', 'Motor', 'Eléctrico', 'Transmisión', 'Servicio'];
  const departamentos = safeState?.departamentos || ['Licores', 'Viveres', 'Otros'];
  const marcas = safeState?.marcas || ['Genérica'];
  const presentaciones = safeState?.presentaciones || ['750ml', '1L', 'Unidad', 'Caja'];
  
  const [scanning, setScanning] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showPricesWithIVA, setShowPricesWithIVA] = useState([false, false, false]);
  const [activeTab, setActiveTab] = useState<'general' | 'precios' | 'inventario' | 'kit'>('general');
  
  const [modalMarca, setModalMarca] = useState({ open: false, name: '' });
  const [modalGrupo, setModalGrupo] = useState({ open: false, name: '' });
  const [modalSubGrupo, setModalSubGrupo] = useState({ open: false, name: '' });
  const [modalLinea, setModalLinea] = useState({ open: false, name: '' });
  const [modalProveedor, setModalProveedor] = useState({ open: false, name: '', code: '' });
  
  const unidades = safeState?.productUnits || ['unidad', 'litro', 'galón', 'kit', 'juego'];
  const tiposArticulo = safeState?.productCategories || ['Repuesto', 'Lubricante', 'Filtro', 'Químico', 'Accesorio', 'Batería', 'Caucho', 'Freno', 'Suspensión', 'Motor', 'Eléctrico', 'Transmisión', 'Servicio'];
  const colores = safeState?.productColors || ['No Aplica', 'Negro', 'Gris', 'Cromo', 'Rojo', 'Azul', 'Blanco', 'Ámbar'];
  const tallas = safeState?.productSizes || ['N/A', 'Estándar', '0.10', '0.20', '0.30', '0.40', '0.50', '20', '30', '40', '50', '60'];
  
  const groups: any[] = safeState?.groups || [];
  const subgroups: any[] = safeState?.subgroups || [];
  const lines: any[] = safeState?.lines || [];
  const brands: any[] = safeState?.brands || [];
  const suppliers: any[] = safeState?.suppliers || [];
  
  const [datos, setDatos] = useState<any>({
    codigo: effectiveProduct?.codigo || '',
    nombre: effectiveProduct?.nombre || '',
    categoria: effectiveProduct?.categoria || (categorias.length > 0 ? categorias[0] : ''),
    departamento: effectiveProduct?.departamento || (departamentos.length > 0 ? departamentos[0] : ''),
    marca: effectiveProduct?.marca || (marcas.length > 0 ? marcas[0] : ''),
    costoUSD: effectiveProduct?.costoUSD?.toString() ?? '0',
    margen: effectiveProduct?.margen?.toString() ?? '0',
    precioUSD: effectiveProduct?.precioUSD?.toString() ?? '0',
    precioBS: effectiveProduct ? (effectiveProduct.precioUSD * exchangeRate).toFixed(2) : '0',
    stock: effectiveProduct?.stock?.toString() ?? '0',
    stockMinimo: effectiveProduct?.stockMinimo?.toString() ?? '3',
    aplicaIVA: effectiveProduct?.aplicaIVA ?? false,
    isKit: effectiveProduct?.isKit || false,
    kitType: effectiveProduct?.kitType || 'stock_propio',
    kitItems: effectiveProduct?.kitItems || [],
    proveedor: effectiveProduct?.proveedor || '',
    cantidad: effectiveProduct?.cantidad || (presentaciones.length > 0 ? presentaciones[0] : 'Unidad'),
    
    barcode: effectiveProduct?.barcode || '',
    internalCode: effectiveProduct?.internalCode || effectiveProduct?.codigo || '',
    alternateCode: effectiveProduct?.alternateCode || '',
    description: effectiveProduct?.description || effectiveProduct?.nombre || '',
    shortDescription: effectiveProduct?.shortDescription || '',
    type: effectiveProduct?.type || (tiposArticulo.length > 0 ? tiposArticulo[0] : 'Repuesto'),
    groupId: effectiveProduct?.groupId || 0,
    subgroupId: effectiveProduct?.subgroupId || 0,
    brandId: effectiveProduct?.brandId || 0,
    lineId: effectiveProduct?.lineId || 0,
    model: effectiveProduct?.model || '',
    color: effectiveProduct?.color || (colores.length > 0 ? colores[0] : 'No Aplica'),
    size: effectiveProduct?.size || (tallas.length > 0 ? tallas[0] : 'N/A'),
    supplierId: effectiveProduct?.supplierId || 0,
    supplierCode: effectiveProduct?.supplierCode || '',
    mainUnit: effectiveProduct?.unit || (unidades.length > 0 ? unidades[0] : 'unidad'),
    altUnit: effectiveProduct?.altUnit || '',
    conversionFactor: effectiveProduct?.conversionFactor?.toString() || '',
    maxStock: effectiveProduct?.maxStock?.toString() || '',
    reorderPoint: effectiveProduct?.reorderPoint?.toString() || '',
    warehouse: effectiveProduct?.warehouse || '',
    managesLots: effectiveProduct?.managesLots || false,
    managesSerials: effectiveProduct?.managesSerials || false,
    managesExpiration: effectiveProduct?.managesExpiration || false,
    taxType: effectiveProduct?.taxType || 'Gravado',
    ivaRate: effectiveProduct?.ivaRate || 16,
    igtfRate: effectiveProduct?.igtfRate || 3,
    maxDiscount: effectiveProduct?.maxDiscount?.toString() || '',
    netWeight: effectiveProduct?.netWeight?.toString() || '',
    grossWeight: effectiveProduct?.grossWeight?.toString() || '',
    volume: effectiveProduct?.volume?.toString() || '',
    barcodeLabel: effectiveProduct?.barcodeLabel || '',
    observations: effectiveProduct?.observations || '',
    active: effectiveProduct?.activo ?? true
  });

  const [kitSearch, setKitSearch] = useState('');
  
  const [prices, setPrices] = useState(() => {
    if (effectiveProduct && effectiveProduct.prices && effectiveProduct.prices.length >= 3) {
      return effectiveProduct.prices.map((p: any, i: number) => ({
        name: p.name || `Precio ${i + 1}`,
        usd: p.usd?.toString() || '',
        bs: p.ves?.toString() || ''
      }));
    }
    const cost = parseFloat(effectiveProduct?.costoUSD?.toString() || '0');
    if (cost > 0) {
      const price1USD = cost / (1 - (parseFloat(effectiveProduct?.margen?.toString() || '30') / 100));
      const price2USD = cost / (1 - 0.15);
      const price3USD = cost / (1 - 0.20);
      return [
        { name: 'Precio 1 - Detal', usd: price1USD.toFixed(4), bs: (price1USD * exchangeRate).toFixed(2) },
        { name: 'Precio 2 - Mayor', usd: price2USD.toFixed(4), bs: (price2USD * exchangeRate).toFixed(2) },
        { name: 'Precio 3 - Oferta', usd: price3USD.toFixed(4), bs: (price3USD * exchangeRate).toFixed(2) },
      ];
    }
    return [
      { name: 'Precio 1 - Detal', usd: '0', bs: '0' },
      { name: 'Precio 2 - Mayor', usd: '0', bs: '0' },
      { name: 'Precio 3 - Oferta', usd: '0', bs: '0' },
    ];
  });

  const round2 = (num: number) => Math.round(num * 100) / 100;
  const round4 = (num: number) => Math.round(num * 10000) / 10000;

  const productos: any[] = safeState?.productos || [];

  const filteredProdsForKit = useMemo(() => {
    if (kitSearch.length < 2) return [];
    return productos.filter((p: any) => 
      p.activo && 
      !p.isKit && 
      (p.nombre?.toLowerCase().includes(kitSearch.toLowerCase()) || p.codigo?.toLowerCase().includes(kitSearch.toLowerCase()))
    ).slice(0, 5);
  }, [kitSearch, productos]);

  const validarDecimal = (val: string) => /^[\d]*\.?[\d]*$/.test(val) || val === '';

  const recalcFromCostAndMargin = useCallback((costStr: string, marginStr: string) => {
    const cost = parseFloat(costStr);
    const margin = parseFloat(marginStr);
    if (isNaN(cost) || cost <= 0 || isNaN(margin) || margin <= 0 || margin >= 100) return;

    const newPrices = prices.map((p: any, i: number) => {
      let tierMargin;
      if (i === 0) tierMargin = margin;
      else if (i === 1) tierMargin = 15;
      else tierMargin = 20;
      if (tierMargin >= 100) return { ...p, usd: '', bs: '' };
      const tierPriceUSD = round4(cost / (1 - (tierMargin / 100)));
      const tierPriceBS = round2(tierPriceUSD * exchangeRate);
      return { ...p, usd: tierPriceUSD.toString(), bs: tierPriceBS.toString() };
    });
    setPrices(newPrices);
    if (newPrices[0]) {
      setDatos((prev: any) => ({ ...prev, precioUSD: newPrices[0].usd, precioBS: newPrices[0].bs }));
    }
  }, [prices, exchangeRate]);

  const recalcMarginFromPrice = useCallback((priceUSDStr: string, costStr: string) => {
    const priceUSD = parseFloat(priceUSDStr);
    const cost = parseFloat(costStr);
    if (isNaN(priceUSD) || priceUSD <= 0 || isNaN(cost) || cost <= 0) return;
    const newMargin = round2(((priceUSD - cost) / priceUSD) * 100);
    setDatos((prev: any) => ({ ...prev, margen: newMargin.toString() }));
    recalcFromCostAndMargin(costStr, newMargin.toString());
  }, [recalcFromCostAndMargin]);

  const recalcularTridireccional = (field: 'margen' | 'precioUSD' | 'precioBS', value: string) => {
    if (!validarDecimal(value)) return;
    const cost = parseFloat(datos.costoUSD) || 0;
    const val = parseFloat(value) || 0;
    const tasa = exchangeRate;
    let newMargen = parseFloat(datos.margen) || 0;
    let newUSD = parseFloat(datos.precioUSD) || 0;
    let newBS = parseFloat(datos.precioBS) || 0;

    if (field === 'margen') {
      newMargen = val;
      if (newMargen < 100) { newUSD = cost / (1 - (newMargen / 100)); newBS = newUSD * tasa; }
    } else if (field === 'precioUSD') {
      newUSD = val;
      if (newUSD > 0) { newMargen = ((newUSD - cost) / newUSD) * 100; newBS = newUSD * tasa; }
    } else if (field === 'precioBS') {
      newBS = val;
      if (newBS > 0) { newUSD = newBS / tasa; newMargen = ((newUSD - cost) / newUSD) * 100; }
    }

    setDatos({ ...datos, [field]: value, margen: field === 'margen' ? value : newMargen.toFixed(2), precioUSD: field === 'precioUSD' ? value : newUSD.toFixed(2), precioBS: field === 'precioBS' ? value : newBS.toFixed(2) });
    recalcFromCostAndMargin(datos.costoUSD, field === 'margen' ? value : newMargen.toFixed(2));
  };

  const handleCostChange = (value: string) => {
    setDatos({...datos, costoUSD: value});
    const margin = parseFloat(datos.margen);
    if (!isNaN(margin) && margin > 0 && margin < 100) {
      recalcFromCostAndMargin(value, datos.margen);
    } else {
      recalcFromCostAndMargin(value, '30');
      setDatos((prev: any) => ({ ...prev, margen: '30' }));
    }
  };

  const handleMarginChange = (value: string) => {
    setDatos({...datos, margen: value});
    const cost = parseFloat(datos.costoUSD);
    if (!isNaN(cost) && cost > 0) recalcFromCostAndMargin(datos.costoUSD, value);
  };

  const handlePriceUSDChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index].usd = value;
    const usd = parseFloat(value);
    newPrices[index].bs = (!isNaN(usd) && usd > 0) ? round2(usd * exchangeRate).toString() : '';
    setPrices(newPrices);
    if (index === 0) {
      const cost = parseFloat(datos.costoUSD);
      if (!isNaN(cost) && cost > 0) recalcMarginFromPrice(value, datos.costoUSD);
      setDatos((prev: any) => ({ ...prev, precioUSD: value, precioBS: newPrices[0].bs }));
    }
  };

  const handlePriceBSChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index].bs = value;
    const bs = parseFloat(value);
    newPrices[index].usd = (!isNaN(bs) && bs > 0) ? round4(bs / exchangeRate).toString() : '';
    setPrices(newPrices);
    if (index === 0) {
      const cost = parseFloat(datos.costoUSD);
      const newUSD = parseFloat(newPrices[index].usd);
      if (!isNaN(cost) && cost > 0 && !isNaN(newUSD) && newUSD > 0) recalcMarginFromPrice(newPrices[index].usd, datos.costoUSD);
      setDatos((prev: any) => ({ ...prev, precioBS: value, precioUSD: newPrices[0].usd }));
    }
  };

  useEffect(() => {
    if (scanning) {
      const timer = setTimeout(() => {
        setDatos((prev: any) => ({ ...prev, barcode: '750' + Math.floor(Math.random() * 100000000000) }));
        setScanning(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [scanning]);

  useEffect(() => {
    if (effectiveProduct) {
      setDatos((prev: any) => ({
        ...prev,
        barcode: effectiveProduct.barcode || '',
        internalCode: effectiveProduct.internalCode || effectiveProduct.codigo || '',
        alternateCode: effectiveProduct.alternateCode || '',
        description: effectiveProduct.description || effectiveProduct.nombre || '',
        shortDescription: effectiveProduct.shortDescription || '',
        type: effectiveProduct.type || (tiposArticulo.length > 0 ? tiposArticulo[0] : 'Repuesto'),
        groupId: effectiveProduct.groupId || 0,
        subgroupId: effectiveProduct.subgroupId || 0,
        brandId: effectiveProduct.brandId || 0,
        lineId: effectiveProduct.lineId || 0,
        model: effectiveProduct.model || '',
        color: effectiveProduct.color || (colores.length > 0 ? colores[0] : 'No Aplica'),
        size: effectiveProduct.size || (tallas.length > 0 ? tallas[0] : 'N/A'),
        supplierId: effectiveProduct.supplierId || 0,
        supplierCode: effectiveProduct.supplierCode || '',
        mainUnit: effectiveProduct.unit || (unidades.length > 0 ? unidades[0] : 'unidad'),
        altUnit: effectiveProduct.altUnit || '',
        conversionFactor: effectiveProduct.conversionFactor?.toString() || '',
        maxStock: effectiveProduct.maxStock?.toString() || '',
        reorderPoint: effectiveProduct.reorderPoint?.toString() || '',
        warehouse: effectiveProduct.warehouse || '',
        managesLots: effectiveProduct.managesLots || false,
        managesSerials: effectiveProduct.managesSerials || false,
        managesExpiration: effectiveProduct.managesExpiration || false,
        taxType: effectiveProduct.taxType || 'Gravado',
        ivaRate: effectiveProduct.ivaRate || 16,
        igtfRate: effectiveProduct.igtfRate || 3,
        maxDiscount: effectiveProduct.maxDiscount?.toString() || '',
        netWeight: effectiveProduct.netWeight?.toString() || '',
        grossWeight: effectiveProduct.grossWeight?.toString() || '',
        volume: effectiveProduct.volume?.toString() || '',
        barcodeLabel: effectiveProduct.barcodeLabel || '',
        observations: effectiveProduct.observations || '',
        active: effectiveProduct.activo ?? true
      }));
      if (effectiveProduct.prices && effectiveProduct.prices.length > 0) {
        setPrices(effectiveProduct.prices.map((p: any, i: number) => ({
          name: p.name || `Precio ${i + 1}`,
          usd: p.usd?.toString() || '',
          bs: p.ves?.toString() || ''
        })));
      }
    }
  }, [effectiveProduct]);

  const handleAddListItem = (listName: string, newVal: string) => {
    if (!newVal || !newVal.trim()) return;
    const currentList = (safeState as any)[listName];
    if (Array.isArray(currentList)) {
      handleUpdateLists({ [listName]: [...currentList, newVal.trim()] });
    }
  };

  const handleRemoveListItem = (listName: string, current: string) => {
    if (!current) return;
    if (confirm(`¿Eliminar \"${current}\" de la lista?`)) {
      const currentList = (safeState as any)[listName];
      if (Array.isArray(currentList)) {
        const newList = currentList.filter((i: any) => i !== current);
        handleUpdateLists({ [listName]: newList });
      }
    }
  };

  const handleAddObject = (collection: string, name: string, extraData?: any) => {
    if (!name || !name.trim()) return null;
    const currentList = (safeState as any)[collection];
    if (Array.isArray(currentList)) {
      const newId = Math.max(...currentList.map((item: any) => item.id || 0), 0) + 1;
      const newItem = { id: newId, name: name.trim(), ...extraData };
      handleUpdateLists({ [collection]: [...currentList, newItem] });
      return newId;
    }
    return null;
  };

  const handleRemoveObject = (collection: string, id: any) => {
    if (!id || id === 0) return;
    const currentList = (safeState as any)[collection];
    if (Array.isArray(currentList)) {
      const itemToRemove = currentList.find((item: any) => item.id === id);
      if (!itemToRemove) return;
      if (confirm(`¿Eliminar \"${itemToRemove.name}\" de la lista?`)) {
        const newList = currentList.filter((item: any) => item.id !== id);
        handleUpdateLists({ [collection]: newList });
      }
    }
  };

  const SelectWithAddString = React.memo((props: any) => (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <Label className="text-[10px] font-black uppercase text-black">{props.label}</Label>
      <div className="flex gap-1">
        <Select 
          value={props.value} 
          onValueChange={props.onChange}
        >
          <SelectTrigger 
            className="h-9 bg-white rounded-lg text-sm flex-1 border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder={props.placeholder || "Seleccione"} />
          </SelectTrigger>
          <SelectContent 
            className="bg-white z-[100]"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            {props.options}
          </SelectContent>
        </Select>
        <div className="flex gap-1 shrink-0">
          <Button 
            size="icon" 
            variant="outline" 
            onClick={(e) => { e.stopPropagation(); props.onAdd(); }} 
            className="h-9 w-9 bg-white border-gray-300"
            title="Agregar nuevo"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            disabled={!props.value || props.value === '0' || props.value === ''}
            onClick={(e) => { e.stopPropagation(); props.onDelete && props.onDelete(props.value); }} 
            className="h-9 w-9 bg-white border-gray-300 hover:text-red-500 transition-colors"
            title="Eliminar seleccionado"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  ));

  const SelectWithAddObject = React.memo((props: any) => (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <Label className="text-[10px] font-black uppercase text-black">{props.label}</Label>
      <div className="flex gap-1">
        <Select 
          value={props.value} 
          onValueChange={props.onChange}
        >
          <SelectTrigger 
            className="h-9 bg-white rounded-lg text-sm flex-1 border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder={props.placeholder || "Seleccione"} />
          </SelectTrigger>
          <SelectContent 
            className="bg-white z-[100]"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            {props.options}
          </SelectContent>
        </Select>
        <div className="flex gap-1 shrink-0">
          <Button 
            size="icon" 
            variant="outline" 
            onClick={(e) => { e.stopPropagation(); props.onAdd(); }} 
            className="h-9 w-9 bg-white border-gray-300"
            title="Agregar nuevo"
          >
            <PlusCircle className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            disabled={!props.value || props.value === '0' || props.value === ''}
            onClick={(e) => { e.stopPropagation(); props.onDelete && props.onDelete(props.value); }} 
            className="h-9 w-9 bg-white border-gray-300 hover:text-red-500 transition-colors"
            title="Eliminar seleccionado"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  ));

  const BarcodePreview = () => (
    <div className="bg-white p-3 rounded-lg border border-gray-300 text-center">
      {datos.barcode ? (
        <>
          <div className="font-mono text-lg font-bold tracking-widest text-black mb-1">{datos.barcode}</div>
          <div className="h-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxwYXR0ZXJuIGlkPSJiYXIiIHdpZHRoPSI0IiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMTAwIiBmaWxsPSIjMDAwIi8+PC9wYXR0ZXJuPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYmFyKSIvPjwvc3ZnPg==')] bg-repeat-x bg-contain"></div>
          <div className="text-[9px] text-black font-bold mt-1">{datos.shortDescription || datos.nombre || 'Repuesto'}</div>
        </>
      ) : (
        <div className="text-black font-bold text-xs py-2">Escanee o ingrese código</div>
      )}
    </div>
  );

  const onSaveProduct = () => {
    if (!datos.nombre || !datos.codigo) {
      alert('Nombre y Código requeridos');
      return;
    }
    const existe = productos.find((p: any) => p.activo && p.codigo === datos.codigo && p.id !== effectiveProduct?.id);
    if (existe) {
      alert(`ERROR: El código \"${datos.codigo}\" ya se encuentra registrado para el producto \"${existe.nombre}\".`);
      return;
    }

    const productData = {
      ...datos,
      costoUSD: parseFloat(datos.costoUSD) || 0,
      margen: parseFloat(datos.margen) || 0,
      precioUSD: parseFloat(datos.precioUSD) || 0,
      precioBS: parseFloat(datos.precioBS) || 0,
      stock: parseFloat(datos.stock) || 0,
      stockMinimo: parseFloat(datos.stockMinimo) || 0,
      id: effectiveProduct?.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      barcode: datos.barcode || datos.codigo,
      internalCode: datos.internalCode || datos.codigo,
      code: datos.codigo,
      name: datos.nombre,
      description: datos.description || datos.nombre,
      priceVES: parseFloat(datos.precioBS) || 0,
      prices: prices.map((p: any) => ({ name: p.name, usd: round2(parseFloat(p.usd) || 0), ves: round2(parseFloat(p.bs) || 0) })),
      costPrice: parseFloat(datos.costoUSD) || 0,
      profitPercentage: parseFloat(datos.margen) || 0,
      unit: datos.mainUnit || datos.cantidad || 'unidad',
      conversionFactor: parseFloat(datos.conversionFactor) || 1,
      maxStock: parseFloat(datos.maxStock) || 0,
      reorderPoint: parseFloat(datos.reorderPoint) || 0,
      ivaRate: datos.ivaRate || 16,
      maxDiscount: parseFloat(datos.maxDiscount) || 0,
      netWeight: parseFloat(datos.netWeight) || 0,
      grossWeight: parseFloat(datos.grossWeight) || 0,
      volume: parseFloat(datos.volume) || 0,
      createdAt: effectiveProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activo: datos.active ?? true,
      cantidad: datos.cantidad || datos.mainUnit || 'Unidad',
      categoria: datos.categoria || datos.type || 'Repuesto',
      departamento: datos.departamento || 'Otros',
      marca: datos.marca || 'Genérica'
    };
    handleSave(productData);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal show">
        <div className="modal-bg" onClick={() => onClose()}></div>
        <div className="modal-box bg-white max-w-5xl border-2 border-line rounded-xl overflow-hidden shadow-2xl max-h-[95vh]">
          <div className="modal-head py-4 px-6 border-b border-line bg-ink flex justify-between items-center text-white">
            <h3 className="font-black uppercase italic tracking-tighter text-sm flex items-center gap-2">
              <Box className="w-5 h-5 text-brand-gold" /> {effectiveProduct ? 'EDITAR FICHA' : 'NUEVO ÍTEM / PRODUCTO'}
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowPreview(!showPreview)} className="text-white/40 hover:text-white text-[10px] font-black uppercase flex items-center gap-1">
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} PREVIEW
              </button>
              <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
          </div>

          <div className="flex h-[calc(95vh-120px)]">
            <div className="flex-1 overflow-y-auto">
              <div className="flex bg-surface-soft border-b border-line sticky top-0 z-10">
                <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'general' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>
                  <Wrench className="w-4 h-4 inline mr-1" /> General
                </button>
                <button onClick={() => setActiveTab('precios')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'precios' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>
                  <DollarSign className="w-4 h-4 inline mr-1" /> Precios
                </button>
                <button onClick={() => setActiveTab('inventario')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'inventario' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>
                  <Box className="w-4 h-4 inline mr-1" /> Inventario
                </button>
                <button onClick={() => setActiveTab('kit')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'kit' ? 'border-brand-gold text-brand-gold bg-white' : 'border-transparent text-ink/40'}`}>
                  <Tag className="w-4 h-4 inline mr-1" /> Kits
                </button>
              </div>

              <div className="modal-body p-6 space-y-6 bg-white">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    {/* IDENTIFICACIÓN */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-ink/50 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <Hash className="w-4 h-4 text-brand-gold" /> Identificación
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-black">Código de Barras (EAN/UPC)</Label>
                          <div className="flex gap-2">
                            <CleanInput 
                              value={datos.barcode} 
                              onChange={(e: any) => setDatos((prev: any) => ({ ...prev, barcode: e.target.value }))}
                              placeholder="7501234567890" 
                              className="h-9 text-sm bg-white rounded-lg font-mono tracking-wider flex-1" 
                            />
                            <Button type="button" size="icon" variant="outline" onClick={() => setScanning(true)} className="h-9 w-9 bg-white border-gray-300 shrink-0">
                              <Scan className={`w-4 h-4 ${scanning ? 'animate-pulse text-brand-gold' : 'text-black'}`} />
                            </Button>
                          </div>
                          {showPreview && <div className="mt-2"><BarcodePreview /></div>}
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-black">Código de Parte (Interno)</Label>
                            <CleanInput 
                              value={datos.internalCode || datos.codigo} 
                              onChange={(e: any) => setDatos((prev: any) => ({ ...prev, internalCode: e.target.value, codigo: e.target.value }))}
                              placeholder="EX: 12345-ABC" 
                              className="h-9 text-sm bg-white rounded-lg font-mono font-bold" 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-black">Código OEM / Referencia Alterna</Label>
                            <CleanInput 
                              value={datos.alternateCode} 
                              onChange={(e: any) => setDatos((prev: any) => ({ ...prev, alternateCode: e.target.value }))}
                              placeholder="Original Equipment Manufacturer Code" 
                              className="h-9 text-sm bg-white rounded-lg font-mono" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-ink/50 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <Box className="w-4 h-4 text-brand-gold" /> Descripción
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-black">Nombre del Producto</Label>
                          <Input 
                            className="h-9 font-black text-ink uppercase bg-white" 
                            value={datos.nombre} 
                            onChange={(e) => setDatos({...datos, nombre: e.target.value})} 
                            placeholder="Nombre comercial"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-black">Descripción Técnica Completa</Label>
                          <Textarea 
                            value={datos.description} 
                            onChange={(e: any) => setDatos((prev: any) => ({ ...prev, description: e.target.value }))}
                            rows={2}
                            placeholder="Ej: Kit de Embrague para Toyota Corolla 1.8 (2009-2014)" 
                            className="text-sm bg-white rounded-lg resize-none" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-black">Nombre para Informe/Recibo</Label>
                          <Input 
                            value={datos.shortDescription || datos.nombre} 
                            onChange={(e: any) => setDatos((prev: any) => ({ ...prev, shortDescription: e.target.value }))}
                            placeholder="Nombre resumido para etiquetas y tickets..." 
                            className="h-9 text-sm bg-white rounded-lg" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-black">Proveedor</Label>
                          <Input 
                            value={datos.proveedor} 
                            onChange={(e) => setDatos({...datos, proveedor: e.target.value})} 
                            placeholder="Nombre del proveedor" 
                            className="h-9 text-sm bg-white rounded-lg" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* CLASIFICACIÓN - CON CATEGORÍA, DEPARTAMENTO Y MARCA CON +/- */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-ink/50 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-brand-gold" /> Clasificación
                      </h4>
                      
                      {/* ===== CATEGORÍA CON +/- ===== */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <SelectWithAddString 
                          label="Categoría"
                          value={datos.categoria}
                          onChange={(v: any) => setDatos({...datos, categoria: v, type: v})}
                          options={categorias.map((cat: string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nueva Categoría:");
                            if(n) handleAddListItem('categorias', n);
                          }}
                          onDelete={(v: any) => {
                            if (confirm(`¿Eliminar categoría "${v}"?`)) {
                              const newList = (safeState.categorias || []).filter((c: string) => c !== v);
                              handleUpdateLists({ categorias: newList });
                              setDatos((prev: any) => ({ ...prev, categoria: '', type: '' }));
                            }
                          }}
                        />

                        {/* ===== DEPARTAMENTO CON +/- ===== */}
                        <SelectWithAddString 
                          label="Departamento"
                          value={datos.departamento}
                          onChange={(v: any) => setDatos({...datos, departamento: v})}
                          options={departamentos.map((dep: string) => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nuevo Departamento:");
                            if(n) handleAddListItem('departamentos', n);
                          }}
                          onDelete={(v: any) => {
                            if (confirm(`¿Eliminar departamento "${v}"?`)) {
                              const newList = (safeState.departamentos || []).filter((d: string) => d !== v);
                              handleUpdateLists({ departamentos: newList });
                              setDatos((prev: any) => ({ ...prev, departamento: '' }));
                            }
                          }}
                        />

                        {/* ===== MARCA CON +/- ===== */}
                        <SelectWithAddString 
                          label="Marca"
                          value={datos.marca}
                          onChange={(v: any) => setDatos({...datos, marca: v})}
                          options={marcas.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nueva Marca:");
                            if(n) handleAddListItem('marcas', n);
                          }}
                          onDelete={(v: any) => {
                            if (confirm(`¿Eliminar marca "${v}"?`)) {
                              const newList = (safeState.marcas || []).filter((m: string) => m !== v);
                              handleUpdateLists({ marcas: newList });
                              setDatos((prev: any) => ({ ...prev, marca: '' }));
                            }
                          }}
                        />
                      </div>

                      {/* FAMILIA, SUB-FAMILIA, LÍNEA (objetos) */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <SelectWithAddObject 
                          label="Familia / Grupo"
                          value={datos.groupId?.toString() ?? ''}
                          onChange={(v: any) => setDatos((prev: any) => ({ ...prev, groupId: parseInt(v) || 0, subgroupId: 0 }))}
                          options={groups.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nuevo Grupo:");
                            if(n) {
                              const newId = handleAddObject('groups', n);
                              if (newId) setDatos((prev: any) => ({ ...prev, groupId: newId }));
                            }
                          }}
                          onDelete={(v: any) => handleRemoveObject('groups', parseInt(v))}
                        />
                        
                        <SelectWithAddObject 
                          label="Sub-Familia"
                          value={datos.subgroupId?.toString() ?? ''}
                          onChange={(v: any) => setDatos((prev: any) => ({ ...prev, subgroupId: parseInt(v) || 0 }))}
                          options={subgroups.filter((s: any) => s.groupId === datos.groupId).map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                          onAdd={() => {
                            if (!datos.groupId) { alert('Primero seleccione un grupo'); return; }
                            const n = prompt("Nueva Sub-Familia:");
                            if(n) {
                              const newId = handleAddObject('subgroups', n, { groupId: datos.groupId });
                              if (newId) setDatos((prev: any) => ({ ...prev, subgroupId: newId }));
                            }
                          }}
                          onDelete={(v: any) => handleRemoveObject('subgroups', parseInt(v))}
                        />
                        
                        <SelectWithAddObject 
                          label="Línea de Producto"
                          value={datos.lineId?.toString() ?? ''}
                          onChange={(v: any) => setDatos((prev: any) => ({ ...prev, lineId: parseInt(v) || 0 }))}
                          options={lines.map((l: any) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nueva Línea:");
                            if(n) {
                              const newId = handleAddObject('lines', n);
                              if (newId) setDatos((prev: any) => ({ ...prev, lineId: newId }));
                            }
                          }}
                          onDelete={(v: any) => handleRemoveObject('lines', parseInt(v))}
                        />
                      </div>

                      {/* MARCA (objeto), PROVEEDOR, COD. PARTE */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <SelectWithAddObject 
                          label="Marca"
                          value={datos.brandId?.toString() ?? ''}
                          onChange={(v: any) => setDatos((prev: any) => ({ ...prev, brandId: parseInt(v) || 0, marca: brands.find((b: any) => b.id === parseInt(v))?.name || '' }))}
                          options={brands.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nueva Marca:");
                            if(n) {
                              const newId = handleAddObject('brands', n);
                              if (newId) setDatos((prev: any) => ({ ...prev, brandId: newId, marca: n }));
                            }
                          }}
                          onDelete={(v: any) => handleRemoveObject('brands', parseInt(v))}
                        />
                        
                        <SelectWithAddObject 
                          label="Proveedor"
                          value={datos.supplierId?.toString() ?? ''}
                          onChange={(v: any) => setDatos((prev: any) => ({ ...prev, supplierId: parseInt(v) || 0, proveedor: suppliers.find((s: any) => s.id === parseInt(v))?.name || '' }))}
                          options={suppliers.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                          onAdd={() => {
                            const n = prompt("Nombre del Proveedor:");
                            if(n) {
                              const newId = handleAddObject('suppliers', n);
                              if (newId) setDatos((prev: any) => ({ ...prev, supplierId: newId, proveedor: n }));
                            }
                          }}
                          onDelete={(v: any) => handleRemoveObject('suppliers', parseInt(v))}
                        />
                        
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-black">Cod. Parte Proveedor</Label>
                          <CleanInput 
                            value={datos.supplierCode} 
                            onChange={(e: any) => setDatos((prev: any) => ({ ...prev, supplierCode: e.target.value }))}
                            placeholder="Referencia Proveedor" 
                            className="h-9 text-sm bg-white rounded-lg font-mono" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* ===== ELIMINADOS: Color y Medida/Talla ===== */}
                    {/* Ya no se muestran Color y Medida/Talla */}
                  </div>
                )}

                {activeTab === 'precios' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-soft p-5 rounded-2xl border border-line shadow-inner">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-ink/50">Costo ($)</Label>
                        <CleanInput className="h-12 font-black text-lg bg-white" value={datos.costoUSD} onChange={(e: any) => handleCostChange(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-brand-gold-deep">Margen %</Label>
                        <CleanInput className="h-12 font-black text-lg text-brand-gold-deep bg-white" value={datos.margen} onChange={(e: any) => handleMarginChange(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-status-success">Venta ($)</Label>
                        <CleanInput className="h-12 font-black text-lg text-status-success bg-white" value={datos.precioUSD} onChange={(e: any) => recalcularTridireccional('precioUSD', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-ink">Venta (BS)</Label>
                        <CleanInput className="h-12 font-black text-lg bg-white" value={datos.precioBS} onChange={(e: any) => recalcularTridireccional('precioBS', e.target.value)} />
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 text-black font-black uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left w-1/4">Escalafón de Venta</th>
                            <th className="px-3 py-2 text-center w-24">Precio + IVA</th>
                            <th className="px-3 py-2 text-right">Precio USD</th>
                            <th className="px-3 py-2 text-right">Precio Bs.</th>
                            <th className="px-3 py-2 text-right w-24">Utilidad %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {prices.map((price: any, i: number) => {
                            const usdVal = parseFloat(price.usd) || 0;
                            const cost = parseFloat(datos.costoUSD) || 0;
                            const margin = (usdVal > 0 && cost > 0) ? ((usdVal - cost) / usdVal) * 100 : 0;
                            const label = i === 0 ? 'Detal' : i === 1 ? 'Mayor (15%)' : 'Oferta (20%)';
                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-black text-black">Precio {i + 1} - {label}</td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Switch checked={showPricesWithIVA[i]} onCheckedChange={(v) => { const newShow = [...showPricesWithIVA]; newShow[i] = v; setShowPricesWithIVA(newShow); }} className="scale-75" />
                                    <span className="text-[10px] text-black font-bold">{showPricesWithIVA[i] ? 'Sí' : 'No'}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <CleanInput type="number" step="0.01" value={price.usd} onChange={(e: any) => handlePriceUSDChange(i, e.target.value)} placeholder="0.00" className="h-8 text-xs bg-white rounded text-right font-mono font-bold" />
                                </td>
                                <td className="px-3 py-2">
                                  <CleanInput type="number" step="0.01" value={price.bs} onChange={(e: any) => handlePriceBSChange(i, e.target.value)} placeholder="0.00" className="h-8 text-xs bg-white rounded text-right font-mono font-bold" />
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-black font-black text-[10px]">{margin > 0 ? margin.toFixed(1) + '%' : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-[10px] text-black font-black uppercase">Fórmula Automática: PV = Costo / (1 - Margen%)<br/><span className="text-[8px] text-gray-500">Precio 2: Mayor (15%) | Precio 3: Oferta (20%)</span></span>
                      <Badge variant="outline" className="text-[10px] text-black font-black border-black">TASA VIGENTE: {exchangeRate} Bs/USD</Badge>
                    </div>

                    <div className="grid grid-cols-6 gap-4 mt-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Impuesto</Label>
                        <Select value={datos.taxType} onValueChange={(v) => setDatos((prev: any) => ({ ...prev, taxType: v }))}>
                          <SelectTrigger className="h-9 bg-white rounded-lg text-sm border-gray-200"><SelectValue /></SelectTrigger>
                          <SelectContent>{['Gravado', 'Exento', 'No Aplica'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">% IVA</Label>
                        <CleanInput type="number" step="0.1" value={datos.ivaRate} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, ivaRate: parseFloat(e.target.value) || 0 }))} className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">% IGTF</Label>
                        <CleanInput type="number" step="0.1" value={datos.igtfRate} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, igtfRate: parseFloat(e.target.value) || 0 }))} className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Desc. Máx.</Label>
                        <CleanInput type="number" step="0.1" value={datos.maxDiscount} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, maxDiscount: e.target.value }))} placeholder="0" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 h-9 mt-6">
                        <Checkbox checked={datos.aplicaIVA} onCheckedChange={(v) => setDatos((prev: any) => ({ ...prev, aplicaIVA: v as boolean }))} className="w-4 h-4" />
                        <span className="text-xs font-black text-black uppercase">Aplica IVA</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'inventario' && (
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase text-ink/50 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                      <Box className="w-4 h-4 text-brand-gold" /> Gestión de Inventario
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <SelectWithAddString 
                        label="Unidad de Despacho"
                        value={datos.mainUnit || datos.cantidad || 'unidad'}
                        onChange={(v: any) => setDatos((prev: any) => ({ ...prev, mainUnit: v, cantidad: v }))}
                        options={unidades.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        onAdd={() => { const n = prompt("Nueva Unidad:"); if(n) handleAddListItem('productUnits', n); }}
                        onDelete={(v: any) => { handleRemoveListItem('productUnits', v); setDatos((prev: any) => ({ ...prev, mainUnit: '', cantidad: '' })); }}
                      />
                      
                      {/* ===== UNIDAD DE COMPRA (EMPAQUE) CON +/- ===== */}
                      <SelectWithAddString 
                        label="Unidad de Compra (Empaque)"
                        value={datos.altUnit}
                        onChange={(v: any) => setDatos((prev: any) => ({ ...prev, altUnit: v }))}
                        options={unidades.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        placeholder="Opcional"
                        onAdd={() => { const n = prompt("Nueva Unidad de Empaque:"); if(n) handleAddListItem('productUnits', n); }}
                        onDelete={(v: any) => { handleRemoveListItem('productUnits', v); setDatos((prev: any) => ({ ...prev, altUnit: '' })); }}
                      />
                      
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Contenido por Empaque</Label>
                        <CleanInput type="number" value={datos.conversionFactor} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, conversionFactor: e.target.value }))} placeholder="1.0" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Existencia Inicial</Label>
                        <CleanInput type="number" value={datos.stock} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, stock: e.target.value }))} disabled={!!effectiveProduct} placeholder="0" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Alerta Stock Mín.</Label>
                        <CleanInput type="number" value={datos.stockMinimo} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, stockMinimo: e.target.value }))} placeholder="5" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Tope Stock Máx.</Label>
                        <CleanInput type="number" value={datos.maxStock} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, maxStock: e.target.value }))} placeholder="100" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Pedir en:</Label>
                        <CleanInput type="number" value={datos.reorderPoint} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, reorderPoint: e.target.value }))} placeholder="10" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Ubicación (Pasillo/Gaveta)</Label>
                        <CleanInput value={datos.warehouse} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, warehouse: e.target.value }))} placeholder="P-01 G-02" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                    </div>

                    {/* ===== ELIMINADOS: Maneja Lotes, Maneja Seriales, Control de Vencimiento ===== */}
                    {/* Estos tres checkboxes han sido eliminados */}

                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Peso Neto (kg)</Label>
                        <CleanInput type="number" step="0.01" value={datos.netWeight} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, netWeight: e.target.value }))} placeholder="0.00" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Peso Bruto (kg)</Label>
                        <CleanInput type="number" step="0.01" value={datos.grossWeight} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, grossWeight: e.target.value }))} placeholder="0.00" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Volumen (m³)</Label>
                        <CleanInput type="number" step="0.001" value={datos.volume} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, volume: e.target.value }))} placeholder="0.000" className="h-9 text-sm bg-white rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Estado del Artículo</Label>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 h-9">
                          <Switch checked={datos.active} onCheckedChange={(v) => setDatos((prev: any) => ({ ...prev, active: v }))} className="scale-75" />
                          <span className="text-xs font-black text-black uppercase">{datos.active ? 'Habilitado' : 'Deshabilitado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Contenido Etiqueta Barcode</Label>
                        <div className="flex gap-2">
                          <CleanInput value={datos.barcodeLabel} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, barcodeLabel: e.target.value }))} placeholder="Texto para impresión térmica" className="h-9 text-sm bg-white rounded-lg flex-1" />
                          <Button size="icon" variant="outline" className="h-9 w-9 bg-white border-gray-300 shrink-0" title="Probar impresión de etiqueta"><Printer className="w-4 h-4 text-black" /></Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-black">Observaciones / Notas Internas</Label>
                        <Textarea value={datos.observations} onChange={(e: any) => setDatos((prev: any) => ({ ...prev, observations: e.target.value }))} rows={2} placeholder="Detalles sobre compatibilidad, fragilidad o proveedor..." className="text-sm bg-white rounded-lg resize-none" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'kit' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 p-4 bg-ink text-white rounded-xl">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setDatos({...datos, isKit: !datos.isKit})} className={`w-12 h-6 rounded-full transition-all relative ${datos.isKit ? 'bg-brand-gold' : 'bg-white/20'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${datos.isKit ? 'right-1' : 'left-1'}`} />
                        </button>
                        <Label className="text-[11px] font-black uppercase tracking-widest cursor-pointer" onClick={() => setDatos({...datos, isKit: !datos.isKit})}>Habilitar KIT / COMBO</Label>
                      </div>
                      {datos.isKit && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <Label className="text-[9px] font-black uppercase opacity-40">Tipo de Gestión de Stock</Label>
                          <div className="flex gap-4">
                            <button onClick={() => setDatos({...datos, kitType: 'stock_propio'})} className={`flex-1 py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all ${datos.kitType === 'stock_propio' ? 'bg-brand-gold text-ink border-brand-gold' : 'bg-white/5 border-white/20 text-white/40'}`}>Stock Propio</button>
                            <button onClick={() => setDatos({...datos, kitType: 'stock_componentes'})} className={`flex-1 py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all ${datos.kitType === 'stock_componentes' ? 'bg-brand-gold text-ink border-brand-gold' : 'bg-white/5 border-white/20 text-white/40'}`}>Stock Virtual</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {datos.isKit && (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 w-4 h-4 text-ink/30" />
                          <Input className="h-12 pl-10 text-xs font-black uppercase bg-white" placeholder="Buscar productos componentes..." value={kitSearch} onChange={(e) => setKitSearch(e.target.value)} />
                          {(filteredProdsForKit || []).length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-line rounded-lg shadow-2xl z-50 mt-1 overflow-hidden">
                              {filteredProdsForKit.map((pk: any) => (
                                <div key={pk.id} onClick={() => { setDatos({...datos, kitItems: [...(datos.kitItems || []), { productoId: pk.id, nombre: pk.nombre, cantidad: 1 }]}); setKitSearch(''); }} className="p-3 border-b border-line hover:bg-brand-gold-soft cursor-pointer flex justify-between items-center">
                                  <span className="text-xs font-black uppercase text-ink">{pk.nombre}</span><PlusCircle className="w-4 h-4 text-brand-gold"/>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Card className="border-line shadow-sm overflow-hidden bg-white">
                          <div className="table-wrap">
                            <table>
                              <thead className="bg-surface-soft"><tr><th className="text-[10px] font-black uppercase text-ink">Componente</th><th className="text-[10px] font-black uppercase text-center text-ink">Cant</th><th /></tr></thead>
                              <tbody>
                                {(datos.kitItems || []).map((ki: KitItem, index: number) => (
                                  <tr key={index} className="border-b border-line/30">
                                    <td className="text-[11px] font-black uppercase text-ink">{ki.nombre}</td>
                                    <td className="text-center"><Input className="w-12 h-8 text-center font-black bg-surface-soft border-line inline-block" type="number" value={ki.cantidad} onChange={(e) => { const n = [...(datos.kitItems || [])]; n[index].cantidad = parseInt(e.target.value) || 1; setDatos({...datos, kitItems: n}); }} /></td>
                                    <td className="text-center"><button onClick={() => setDatos({...datos, kitItems: (datos.kitItems || []).filter((_: any, i: number) => i !== index)})} className="text-status-danger"><Trash2 className="w-4 h-4"/></button></td>
                                  </tr>
                                ))}
                                {(datos.kitItems || []).length === 0 && <tr><td colSpan={3} className="text-center py-4 text-ink/40 text-xs font-black uppercase">No hay componentes agregados</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showPreview && (
              <div className="w-72 bg-gray-100 border-l border-gray-300 p-4 space-y-4 overflow-y-auto shrink-0">
                <h4 className="text-xs font-black uppercase text-black border-b border-gray-300 pb-2 tracking-widest">VISTA PREVIA</h4>
                <div className="bg-white rounded-xl p-3 shadow-sm"><div className="text-[10px] text-black uppercase font-black mb-2">IDENTIFICADOR</div><BarcodePreview /></div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">PRECIOS ($/BS)</div>
                  <div className="space-y-2">
                    {prices.map((p: any, i: number) => {
                      const usd = parseFloat(p.usd) || 0;
                      const bs = parseFloat(p.bs) || 0;
                      const label = i === 0 ? 'Detal' : i === 1 ? 'Mayor' : 'Oferta';
                      return (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-black text-[10px] font-black uppercase">Precio {i+1} {label}</span>
                          <div className="text-right"><div className="font-mono font-black text-[#0a1628]">{usd > 0 ? '$' + usd.toFixed(2) : '-'}</div><div className="font-mono text-[9px] text-black font-black">{bs > 0 ? 'Bs. ' + bs.toFixed(2) : '-'}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">RESUMEN DE EXISTENCIA</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><span className="text-xs text-black font-black uppercase">Actual:</span><Badge className={parseInt(datos.stock) <= parseInt(datos.stockMinimo) ? "bg-red-100 text-red-700 font-black" : "bg-green-100 text-green-700 font-black"}>{datos.stock || '0'} {datos.mainUnit || datos.cantidad || 'unidad'}</Badge></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] text-black font-black uppercase">Stock Mínimo:</span><span className="text-xs font-mono font-black text-black">{datos.stockMinimo || '0'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] text-black font-black uppercase">Punto Reorden:</span><span className="text-xs font-mono font-black text-black">{datos.reorderPoint || '0'}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">PROYECCIÓN DE MARGEN</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-brand-gold rounded-full transition-all" style={{ width: `${Math.min(parseFloat(datos.margen) || 0, 100)}%` }} /></div>
                    <span className="text-xs font-black text-[#0a1628]">{datos.margen || '0'}%</span>
                  </div>
                  <div className="text-[9px] text-black font-black mt-1 uppercase leading-tight">Utilidad estimada sobre el precio detal (Sin IVA)</div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">INFORMACIÓN</div>
                  <div className="space-y-1 text-[10px] text-black">
                    <div><span className="font-black">Tipo:</span> {datos.type || 'N/A'}</div>
                    <div><span className="font-black">Marca:</span> {datos.marca || datos.brandId ? (brands.find((b: any) => b.id === datos.brandId)?.name || 'N/A') : 'N/A'}</div>
                    <div><span className="font-black">Modelo:</span> {datos.model || 'N/A'}</div>
                    <div><span className="font-black">IVA:</span> {datos.aplicaIVA ? `${datos.ivaRate}%` : 'Exento'}</div>
                    {/* ===== ELIMINADOS: Color y Talla de la vista previa ===== */}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-foot p-5 bg-surface-soft border-t border-line flex justify-between items-center">
            <div className="text-[9px] text-ink/40 font-black uppercase">{effectiveProduct ? 'Modo Edición' : 'Modo Registro'} • Todos los campos son opcionales</div>
            <div className="flex gap-3">
              <Button variant="secondary" className="px-8 font-black uppercase text-[10px]" onClick={onClose}>Cancelar</Button>
              <Button className="bg-brand-gold hover:bg-brand-gold-deep text-ink px-10 font-black uppercase text-[10px] shadow-lg" onClick={onSaveProduct}>{effectiveProduct ? 'ACTUALIZAR' : 'CREAR PRODUCTO'}</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modales de creación rápida */}
      <Dialog open={modalMarca.open} onOpenChange={(open) => !open && setModalMarca({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200">
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Marca</DialogTitle>
          <CleanInput value={modalMarca.name} onChange={(e: any) => setModalMarca((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre de la marca" className="bg-white border-2 focus:border-brand-gold" autoFocus onKeyDown={(e: any) => { if (e.key === 'Enter') { const newId = handleAddObject('brands', modalMarca.name); if (newId) { setDatos((prev: any) => ({ ...prev, brandId: newId, marca: modalMarca.name })); setModalMarca({ open: false, name: '' }); } } }} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalMarca({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => { const newId = handleAddObject('brands', modalMarca.name); if (newId) { setDatos((prev: any) => ({ ...prev, brandId: newId, marca: modalMarca.name })); setModalMarca({ open: false, name: '' }); } }} className="bg-ink font-black uppercase text-[10px]">Crear Marca</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalGrupo.open} onOpenChange={(open) => !open && setModalGrupo({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200">
          <DialogTitle className="text-black text-xs font-black uppercase">Nuevo Grupo</DialogTitle>
          <CleanInput value={modalGrupo.name} onChange={(e: any) => setModalGrupo((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre del grupo" className="bg-white border-2 focus:border-brand-gold" autoFocus onKeyDown={(e: any) => { if (e.key === 'Enter') { const newId = handleAddObject('groups', modalGrupo.name); if (newId) { setDatos((prev: any) => ({ ...prev, groupId: newId })); setModalGrupo({ open: false, name: '' }); } } }} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalGrupo({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => { const newId = handleAddObject('groups', modalGrupo.name); if (newId) { setDatos((prev: any) => ({ ...prev, groupId: newId })); setModalGrupo({ open: false, name: '' }); } }} className="bg-ink font-black uppercase text-[10px]">Crear Grupo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalSubGrupo.open} onOpenChange={(open) => !open && setModalSubGrupo({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200">
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Sub-Familia</DialogTitle>
          <CleanInput value={modalSubGrupo.name} onChange={(e: any) => setModalSubGrupo((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre de la sub-familia" className="bg-white border-2 focus:border-brand-gold" autoFocus onKeyDown={(e: any) => { if (e.key === 'Enter') { if (!datos.groupId) { alert('Primero seleccione un grupo'); return; } const newId = handleAddObject('subgroups', modalSubGrupo.name, { groupId: datos.groupId }); if (newId) { setDatos((prev: any) => ({ ...prev, subgroupId: newId })); setModalSubGrupo({ open: false, name: '' }); } } }} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalSubGrupo({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => { if (!datos.groupId) { alert('Primero seleccione un grupo'); return; } const newId = handleAddObject('subgroups', modalSubGrupo.name, { groupId: datos.groupId }); if (newId) { setDatos((prev: any) => ({ ...prev, subgroupId: newId })); setModalSubGrupo({ open: false, name: '' }); } }} className="bg-ink font-black uppercase text-[10px]">Crear Sub-Familia</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalLinea.open} onOpenChange={(open) => !open && setModalLinea({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200">
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Línea</DialogTitle>
          <CleanInput value={modalLinea.name} onChange={(e: any) => setModalLinea((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre de la línea" className="bg-white border-2 focus:border-brand-gold" autoFocus onKeyDown={(e: any) => { if (e.key === 'Enter') { const newId = handleAddObject('lines', modalLinea.name); if (newId) { setDatos((prev: any) => ({ ...prev, lineId: newId })); setModalLinea({ open: false, name: '' }); } } }} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalLinea({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => { const newId = handleAddObject('lines', modalLinea.name); if (newId) { setDatos((prev: any) => ({ ...prev, lineId: newId })); setModalLinea({ open: false, name: '' }); } }} className="bg-ink font-black uppercase text-[10px]">Crear Línea</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalProveedor.open} onOpenChange={(open) => !open && setModalProveedor({ open: false, name: '', code: '' })}>
        <DialogContent className="max-w-sm bg-gray-200">
          <DialogTitle className="text-black text-xs font-black uppercase">Nuevo Proveedor</DialogTitle>
          <CleanInput value={modalProveedor.name} onChange={(e: any) => setModalProveedor((prev) => ({ ...prev, name: e.target.value }))} placeholder="Razón Social del Proveedor" className="bg-white border-2 focus:border-brand-gold mb-2" autoFocus />
          <CleanInput value={modalProveedor.code} onChange={(e: any) => setModalProveedor((prev) => ({ ...prev, code: e.target.value }))} placeholder="Código / RIF" className="bg-white border-2 focus:border-brand-gold" onKeyDown={(e: any) => { if (e.key === 'Enter') { const newId = handleAddObject('suppliers', modalProveedor.name, { code: modalProveedor.code }); if (newId) { setDatos((prev: any) => ({ ...prev, supplierId: newId, proveedor: modalProveedor.name, supplierCode: modalProveedor.code })); setModalProveedor({ open: false, name: '', code: '' }); } } }} />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalProveedor({ open: false, name: '', code: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => { const newId = handleAddObject('suppliers', modalProveedor.name, { code: modalProveedor.code }); if (newId) { setDatos((prev: any) => ({ ...prev, supplierId: newId, proveedor: modalProveedor.name, supplierCode: modalProveedor.code })); setModalProveedor({ open: false, name: '', code: '' }); } }} className="bg-ink font-black uppercase text-[10px]">Crear Proveedor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ProductForm = ProductFormModalComponent;