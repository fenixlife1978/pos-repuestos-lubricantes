'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Plus, Check, DollarSign, RefreshCw, Printer, Scan,
  Hash, Box, Tag, Barcode, Eye, EyeOff, Trash2, Save, FilePlus, Wrench, Fuel
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  store: any;
  updateStore: any;
  editingProduct?: any | null;
}

// Input sin flechas de spinner
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

export const ProductForm: React.FC<ProductFormProps> = ({ 
  isOpen, onClose, store, updateStore, editingProduct 
}) => {
  const exchangeRate = store?.config?.exchangeRate || 1;
  const [scanning, setScanning] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showPricesWithIVA, setShowPricesWithIVA] = useState([false, false, false, false, false]);
  
  const unidades = store?.productUnits || ['unidad', 'litro', 'galón', 'kit', 'juego'];
  const tiposArticulo = store?.productCategories || ['Repuesto', 'Lubricante', 'Filtro'];
  const colores = store?.productColors || ['No Aplica', 'Negro', 'Gris'];
  const tallas = store?.productSizes || ['N/A', 'Estándar', '0.10', '0.20'];
  
  const [modalMarca, setModalMarca] = useState({ open: false, name: '' });
  const [modalGrupo, setModalGrupo] = useState({ open: false, name: '' });
  const [modalSubGrupo, setModalSubGrupo] = useState({ open: false, name: '' });
  const [modalLinea, setModalLinea] = useState({ open: false, name: '' });
  const [modalProveedor, setModalProveedor] = useState({ open: false, name: '', code: '' });
  
  const [costPrice, setCostPrice] = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [prices, setPrices] = useState([
    { name: 'Precio 1 - Detal', usd: '', bs: '' },
    { name: 'Precio 2 - Mayor', usd: '', bs: '' },
    { name: 'Precio 3 - Oferta', usd: '', bs: '' },
    { name: 'Precio 4 - Promo', usd: '', bs: '' },
    { name: 'Precio 5 - Especial', usd: '', bs: '' },
  ]);

  const [formData, setFormData] = useState({
    barcode: '',
    internalCode: '',
    alternateCode: '',
    description: '',
    shortDescription: '',
    type: 'Repuesto',
    groupId: 0,
    subgroupId: 0,
    brandId: 0,
    lineId: 0,
    model: '',
    color: 'No Aplica',
    size: 'N/A',
    supplierId: 0,
    supplierCode: '',
    mainUnit: 'unidad',
    altUnit: '',
    conversionFactor: '',
    stock: '',
    minStock: '',
    maxStock: '',
    reorderPoint: '',
    warehouse: '',
    managesLots: false,
    managesSerials: false,
    managesExpiration: false,
    taxType: 'Gravado',
    ivaRate: 16,
    igtfRate: 3,
    maxDiscount: '',
    netWeight: '',
    grossWeight: '',
    volume: '',
    barcodeLabel: '',
    observations: '',
    active: true
  });

  // Referencia para evitar que el dialog se cierre
  const dialogRef = useRef<HTMLDivElement>(null);

  const round2 = (num: number) => Math.round(num * 100) / 100;
  const round4 = (num: number) => Math.round(num * 10000) / 10000;

  const recalcFromCostAndMargin = useCallback((costStr: string, marginStr: string) => {
    const cost = parseFloat(costStr);
    const margin = parseFloat(marginStr);
    
    if (isNaN(cost) || cost <= 0 || isNaN(margin) || margin <= 0 || margin >= 100) {
      return;
    }

    const newPrices = prices.map((p, i) => {
      const tierMargin = margin + (i * 5); 
      if (tierMargin >= 100) return { ...p, usd: '', bs: '' };
      
      const tierPriceUSD = round4(cost / (1 - (tierMargin / 100)));
      const tierPriceBS = round2(tierPriceUSD * exchangeRate);
      
      return {
        ...p,
        usd: tierPriceUSD.toString(),
        bs: tierPriceBS.toString()
      };
    });
    
    setPrices(newPrices);
  }, [prices, exchangeRate]);

  const recalcMarginFromPrice = useCallback((priceUSDStr: string, costStr: string) => {
    const priceUSD = parseFloat(priceUSDStr);
    const cost = parseFloat(costStr);
    
    if (isNaN(priceUSD) || priceUSD <= 0 || isNaN(cost) || cost <= 0) {
      return;
    }

    const newMargin = round2(((priceUSD - cost) / priceUSD) * 100);
    setMarginPercent(newMargin.toString());
    recalcFromCostAndMargin(costStr, newMargin.toString());
  }, [recalcFromCostAndMargin]);

  const handleCostChange = (value: string) => {
    setCostPrice(value);
    const margin = parseFloat(marginPercent);
    if (!isNaN(margin) && margin > 0 && margin < 100) {
      recalcFromCostAndMargin(value, marginPercent);
    }
  };

  const handleMarginChange = (value: string) => {
    setMarginPercent(value);
    const cost = parseFloat(costPrice);
    if (!isNaN(cost) && cost > 0) {
      recalcFromCostAndMargin(costPrice, value);
    }
  };

  const handlePriceUSDChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index].usd = value;
    
    const usd = parseFloat(value);
    if (!isNaN(usd) && usd > 0) {
      const bs = round2(usd * exchangeRate);
      newPrices[index].bs = bs.toString();
    } else {
      newPrices[index].bs = '';
    }
    
    setPrices(newPrices);
    if (index === 0) {
      const cost = parseFloat(costPrice);
      if (!isNaN(cost) && cost > 0) {
        recalcMarginFromPrice(value, costPrice);
      }
    }
  };

  const handlePriceBSChange = (index: number, value: string) => {
    const newPrices = [...prices];
    newPrices[index].bs = value;
    
    const bs = parseFloat(value);
    if (!isNaN(bs) && bs > 0) {
      const usd = round4(bs / exchangeRate);
      newPrices[index].usd = usd.toString();
    } else {
      newPrices[index].usd = '';
    }
    
    setPrices(newPrices);
    if (index === 0) {
      const cost = parseFloat(costPrice);
      const newUSD = parseFloat(newPrices[index].usd);
      if (!isNaN(cost) && cost > 0 && !isNaN(newUSD) && newUSD > 0) {
        recalcMarginFromPrice(newPrices[index].usd, costPrice);
      }
    }
  };

  useEffect(() => {
    if (scanning) {
      const timer = setTimeout(() => {
        setFormData(prev => ({ ...prev, barcode: '750' + Math.floor(Math.random() * 100000000000) }));
        setScanning(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [scanning]);

  useEffect(() => {
    if (editingProduct) {
      setFormData(prev => ({
        ...prev,
        barcode: editingProduct.barcode || '',
        internalCode: editingProduct.internalCode || editingProduct.code || '',
        alternateCode: editingProduct.alternateCode || '',
        description: editingProduct.description || '',
        shortDescription: editingProduct.shortDescription || '',
        type: editingProduct.type || 'Repuesto',
        groupId: editingProduct.groupId || 0,
        subgroupId: editingProduct.subgroupId || 0,
        brandId: editingProduct.brandId || 0,
        lineId: editingProduct.lineId || 0,
        model: editingProduct.model || '',
        color: editingProduct.color || 'No Aplica',
        size: editingProduct.size || 'N/A',
        supplierId: editingProduct.supplierId || 0,
        supplierCode: editingProduct.supplierCode || '',
        mainUnit: editingProduct.unit || 'unidad',
        stock: editingProduct.stock?.toString() || '',
        minStock: editingProduct.minStock?.toString() || '',
        ivaRate: editingProduct.ivaRate || 16,
        active: editingProduct.active ?? true
      }));
      setCostPrice(editingProduct.costPrice?.toString() || '');
      setMarginPercent(editingProduct.profitPercentage?.toString() || '');
      
      if (editingProduct.priceUSD || editingProduct.priceVES) {
        const usd = editingProduct.priceUSD || 0;
        const bs = editingProduct.priceVES || 0;
        setPrices(prev => prev.map((p, i) => {
          if (i === 0) return { ...p, usd: usd.toString(), bs: bs.toString() };
          if (editingProduct.prices && editingProduct.prices[i]) {
            return {
              ...p,
              usd: editingProduct.prices[i].usd?.toString() || '',
              bs: editingProduct.prices[i].ves?.toString() || ''
            };
          }
          return p;
        }));
      }
    } else {
      resetForm();
    }
  }, [editingProduct]);

  const resetForm = () => {
    setFormData({
      barcode: '', internalCode: '', alternateCode: '', description: '', shortDescription: '',
      type: 'Repuesto', groupId: 0, subgroupId: 0, brandId: 0, lineId: 0, model: '', color: 'No Aplica', size: 'N/A',
      supplierId: 0, supplierCode: '',
      mainUnit: 'unidad', altUnit: '', conversionFactor: '', stock: '', minStock: '', maxStock: '',
      reorderPoint: '', warehouse: '', managesLots: false, managesSerials: false, managesExpiration: false,
      taxType: 'Gravado', ivaRate: 16, igtfRate: 3, maxDiscount: '',
      netWeight: '', grossWeight: '', volume: '', barcodeLabel: '', observations: '',
      active: true
    });
    setCostPrice(''); 
    setMarginPercent('');
    setPrices([
      { name: 'Precio 1 - Detal', usd: '', bs: '' },
      { name: 'Precio 2 - Mayor', usd: '', bs: '' },
      { name: 'Precio 3 - Oferta', usd: '', bs: '' },
      { name: 'Precio 4 - Promo', usd: '', bs: '' },
      { name: 'Precio 5 - Especial', usd: '', bs: '' },
    ]);
  };

  const handleCreate = (type: string, data: any) => {
    const collections: any = {
      marca: 'brands', grupo: 'groups', subgrupo: 'subgroups', linea: 'lines', proveedor: 'suppliers'
    };
    const collection = collections[type];
    if (!collection || !data.name.trim()) return;
    
    const items = store[collection] || [];
    const newId = Math.max(...items.map((b: any) => b.id), 0) + 1;
    const newItem = { id: newId, name: data.name, ...(data.code && { code: data.code }) };
    
    updateStore((prev: any) => ({
      ...prev,
      [collection]: [...(prev[collection] || []), newItem]
    }));
    
    const fieldMap: any = {
      marca: 'brandId', grupo: 'groupId', subgrupo: 'subgroupId', linea: 'lineId', proveedor: 'supplierId'
    };
    setFormData(prev => ({ ...prev, [fieldMap[type]]: newId }));
    
    const modalMap: any = {
      marca: setModalMarca, grupo: setModalGrupo, subgrupo: setModalSubGrupo,
      linea: setModalLinea, proveedor: setModalProveedor
    };
    modalMap[type]({ open: false, name: '', code: '' });
  };
  
  const handleSimpleListCreate = (listKey: string, newValue: string) => {
    if (!newValue || !newValue.trim()) return;
    updateStore((prev: any) => ({
      ...prev,
      [listKey]: [...(prev[listKey] || []), newValue.trim()]
    }));
  };

  const handleDelete = (type: string, idOrValue: any) => {
    if (!idOrValue || idOrValue === '0' || idOrValue === '') return;
    
    if (!confirm(`¿Está seguro de eliminar "${idOrValue}"? Esta acción no se puede deshacer.`)) return;

    const collections: any = {
      marca: 'brands', grupo: 'groups', subgrupo: 'subgroups', linea: 'lines', proveedor: 'suppliers',
      categoria: 'productCategories', unidad: 'productUnits', color: 'productColors', talla: 'productSizes'
    };
    
    const collectionKey = collections[type];
    if (collectionKey) {
      updateStore((prev: any) => {
        const oldList = prev[collectionKey] || [];
        const isObjectList = oldList.some((item: any) => typeof item === 'object');
        const newList = isObjectList
          ? oldList.filter((item: any) => item.id.toString() !== idOrValue.toString())
          : oldList.filter((item: any) => item !== idOrValue);
        return { ...prev, [collectionKey]: newList };
      });
      
      const fieldMap: any = {
        marca: 'brandId', grupo: 'groupId', subgrupo: 'subgroupId', linea: 'lineId', proveedor: 'supplierId',
        categoria: 'type', color: 'color', talla: 'size', unidad: 'mainUnit'
      };

      const fieldToUpdate = fieldMap[type];
      if (fieldToUpdate && formData[fieldToUpdate as keyof typeof formData] == idOrValue) {
        const resetValue = ['brandId', 'groupId', 'subgroupId', 'lineId', 'supplierId'].includes(fieldToUpdate) ? 0 : '';
        setFormData(prev => ({ ...prev, [fieldToUpdate]: resetValue }));
      }
    }
  };

  const buildProduct = () => {
    return {
      id: editingProduct?.id || Date.now(),
      code: formData.internalCode || 'SIN-CODIGO',
      barcode: formData.barcode,
      internalCode: formData.internalCode,
      alternateCode: formData.alternateCode,
      name: formData.description || 'Producto sin descripción',
      description: formData.description,
      shortDescription: formData.shortDescription,
      type: formData.type,
      groupId: formData.groupId,
      subgroupId: formData.subgroupId,
      brandId: formData.brandId,
      lineId: formData.lineId,
      model: formData.model,
      color: formData.color,
      size: formData.size,
      supplierId: formData.supplierId,
      supplierCode: formData.supplierCode,
      unit: formData.mainUnit,
      altUnit: formData.altUnit,
      conversionFactor: parseFloat(formData.conversionFactor) || 1,
      stock: editingProduct ? parseInt(formData.stock) || 0 : 0,
      minStock: parseInt(formData.minStock) || 0,
      maxStock: parseInt(formData.maxStock) || 0,
      reorderPoint: parseInt(formData.reorderPoint) || 0,
      warehouse: formData.warehouse,
      managesLots: formData.managesLots,
      managesSerials: formData.managesSerials,
      managesExpiration: formData.managesExpiration,
      costPrice: round4(parseFloat(costPrice) || 0),
      profitPercentage: parseFloat(marginPercent) || 0,
      priceUSD: round2(parseFloat(prices[0].usd) || 0),
      priceVES: round2(parseFloat(prices[0].bs) || 0),
      prices: prices.map(p => ({ 
        name: p.name, 
        usd: round2(parseFloat(p.usd) || 0), 
        ves: round2(parseFloat(p.bs) || 0) 
      })),
      taxType: formData.taxType,
      ivaRate: formData.ivaRate,
      igtfRate: formData.igtfRate,
      maxDiscount: parseFloat(formData.maxDiscount) || 0,
      netWeight: parseFloat(formData.netWeight) || 0,
      grossWeight: parseFloat(formData.grossWeight) || 0,
      volume: parseFloat(formData.volume) || 0,
      barcodeLabel: formData.barcodeLabel,
      observations: formData.observations,
      active: formData.active,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const handleSubmit = (andNew = false) => {
    const product = buildProduct();
    if (!product) return;

    if (editingProduct) {
      updateStore((prev: any) => ({
        ...prev, products: prev.products.map((p: any) => p.id === editingProduct.id ? product : p)
      }));
      onClose();
    } else {
      updateStore((prev: any) => ({ ...prev, products: [...prev.products, product] }));
      if (andNew) {
        resetForm();
        const scrollContainer = document.querySelector('.overflow-y-auto');
        scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        onClose();
      }
    }
  };

  const filteredSubgroups = (store.subgroups || []).filter((s: any) => s.groupId === formData.groupId);

  const BarcodePreview = () => (
    <div className="bg-white p-3 rounded-lg border border-gray-300 text-center">
      {formData.barcode ? (
        <>
          <div className="font-mono text-lg font-bold tracking-widest text-black mb-1">
            {formData.barcode}
          </div>
          <div className="h-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxwYXR0ZXJuIGlkPSJiYXIiIHdpZHRoPSI0IiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMTAwIiBmaWxsPSIjMDAwIi8+PC9wYXR0ZXJuPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYmFyKSIvPjwvc3ZnPg==')] bg-repeat-x bg-contain"></div>
          <div className="text-[9px] text-black font-bold mt-1">{formData.shortDescription || formData.description || 'Repuesto'}</div>
        </>
      ) : (
        <div className="text-black font-bold text-xs py-2">Escanee o ingrese código</div>
      )}
    </div>
  );

  // SelectWithAdd corregido - ahora maneja eventos correctamente
  const SelectWithAdd = React.memo((props: any) => (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <Label className="text-[10px] font-black uppercase text-black">{props.label}</Label>
      <div className="flex gap-1">
        <Select 
          value={props.value} 
          onValueChange={props.onChange}
          onOpenChange={(open) => {
            // Prevenir que el dialog se cierre cuando el select se abre
            if (open) {
              // No hacemos nada, solo permitimos que el select se abra
            }
          }}
        >
          <SelectTrigger 
            className="h-9 bg-white rounded-lg text-sm flex-1 border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder={props.placeholder || "Seleccione"} />
          </SelectTrigger>
          <SelectContent 
            className="bg-white z-[100]"
            onPointerDownOutside={(e) => {
              // Prevenir que el clic fuera del select cierre el dialog principal
              e.preventDefault();
            }}
          >
            {props.options}
          </SelectContent>
        </Select>
        <div className="flex gap-1 shrink-0">
          <Button 
            size="icon" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              props.onAdd();
            }} 
            className="h-9 w-9 bg-white border-gray-300"
            title="Agregar nuevo"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            disabled={!props.value || props.value === '0' || props.value === ''}
            onClick={(e) => {
              e.stopPropagation();
              props.onDelete && props.onDelete(props.value);
            }} 
            className="h-9 w-9 bg-white border-gray-300 hover:text-red-500 transition-colors"
            title="Eliminar seleccionado"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  ));

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent 
          className="max-w-6xl p-0 rounded-xl overflow-hidden bg-[#d4d4d4] border-gray-400 max-h-[95vh]"
          ref={dialogRef}
          onPointerDownOutside={(e) => {
            // Prevenir cierre al hacer clic fuera si es un select
            const target = e.target as HTMLElement;
            if (target.closest('[role="listbox"]') || target.closest('[role="option"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogTitle className="sr-only">{editingProduct ? 'Editar Repuesto/Lubricante' : 'Nuevo Repuesto/Lubricante'}</DialogTitle>
          
          <div className="bg-[#0a1628] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#c9a227] rounded-lg flex items-center justify-center">
                {formData.type === 'Lubricante' ? <Fuel className="w-4 h-4 text-[#0a1628]" /> : <Wrench className="w-4 h-4 text-[#0a1628]" />}
              </div>
              <span className="text-white font-bold text-sm uppercase tracking-tight">
                {editingProduct ? 'Editar Artículo' : 'Registro de Repuestos y Lubricantes'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPreview(!showPreview)} 
                className="text-white hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors font-bold"
              >
                {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                PREVIEW
              </button>
              <button onClick={onClose} className="text-white/40 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex h-[calc(95vh-52px)]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-black mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Hash className="w-4 h-4 text-[#c9a227]" /> Identificación del Repuesto
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Código de Barras (EAN/UPC)</Label>
                    <div className="flex gap-2">
                      <CleanInput 
                        value={formData.barcode} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                        placeholder="7501234567890" 
                        className="h-9 text-sm bg-white rounded-lg font-mono tracking-wider" 
                      />
                      <Button type="button" size="icon" variant="outline" onClick={() => setScanning(true)} className="h-9 w-9 bg-white border-gray-300 shrink-0">
                        <Scan className={`w-4 h-4 ${scanning ? 'animate-pulse text-[#c9a227]' : 'text-black'}`} />
                      </Button>
                    </div>
                    {showPreview && <div className="mt-2"><BarcodePreview /></div>}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-black">Código de Parte (Interno)</Label>
                      <CleanInput 
                        value={formData.internalCode} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, internalCode: e.target.value }))}
                        placeholder="EX: 12345-ABC" 
                        className="h-9 text-sm bg-white rounded-lg font-mono font-bold" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-black">Código OEM / Referencia Alterna</Label>
                      <CleanInput 
                        value={formData.alternateCode} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, alternateCode: e.target.value }))}
                        placeholder="Original Equipment Manufacturer Code" 
                        className="h-9 text-sm bg-white rounded-lg font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Descripción Técnica Completa</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="Ej: Kit de Embrague para Toyota Corolla 1.8 (2009-2014)" 
                      className="text-sm bg-white rounded-lg resize-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Nombre para Informe/Recibo</Label>
                    <Textarea 
                      value={formData.shortDescription} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                      rows={3}
                      placeholder="Nombre resumido para etiquetas y tickets..." 
                      className="text-sm bg-white rounded-lg resize-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <SelectWithAdd 
                    label="Categoría de Artículo"
                    value={formData.type}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, type: v }))}
                    options={tiposArticulo.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    onAdd={() => {
                        const n = prompt("Nueva Categoría:");
                        if(n) handleSimpleListCreate('productCategories', n);
                    }}
                    onDelete={(v: any) => handleDelete('categoria', v)}
                  />
                  
                  <SelectWithAdd 
                    label="Familia / Grupo"
                    value={formData.groupId?.toString() ?? ''}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, groupId: parseInt(v) || 0, subgroupId: 0 }))}
                    options={(store.groups || [])?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                    onAdd={() => setModalGrupo({ open: true, name: '' })}
                    onDelete={(v: any) => handleDelete('grupo', v)}
                  />
                  
                  <SelectWithAdd 
                    label="Sub-Familia"
                    value={formData.subgroupId?.toString() ?? ''}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, subgroupId: parseInt(v) || 0 }))}
                    options={filteredSubgroups?.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    onAdd={() => setModalSubGrupo({ open: true, name: '' })}
                    onDelete={(v: any) => handleDelete('subgrupo', v)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <SelectWithAdd 
                    label="Marca (Vehículo / Fabricante)"
                    value={formData.brandId?.toString() ?? ''}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, brandId: parseInt(v) || 0 }))}
                    options={(store.brands || [])?.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                    onAdd={() => setModalMarca({ open: true, name: '' })}
                    onDelete={(v: any) => handleDelete('marca', v)}
                  />
                  
                  <SelectWithAdd 
                    label="Línea de Producto"
                    value={formData.lineId?.toString() ?? ''}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, lineId: parseInt(v) || 0 }))}
                    options={(store.lines || [])?.map((l: any) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                    onAdd={() => setModalLinea({ open: true, name: '' })}
                    onDelete={(v: any) => handleDelete('linea', v)}
                  />
                  
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Modelo / Aplicación / Año</Label>
                    <CleanInput 
                      value={formData.model} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="EX: Corolla 2009-2014" 
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <SelectWithAdd 
                    label="Color / Acabado"
                    value={formData.color}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, color: v }))}
                    options={colores.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    onAdd={() => {
                        const n = prompt("Nuevo Color:");
                        if(n) handleSimpleListCreate('productColors', n);
                    }}
                    onDelete={(v: any) => handleDelete('color', v)}
                  />
                  
                  <SelectWithAdd 
                    label="Medida / Talla / Grado"
                    value={formData.size}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, size: v }))}
                    options={tallas.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    onAdd={() => {
                        const n = prompt("Nueva Talla/Medida:");
                        if(n) handleSimpleListCreate('productSizes', n);
                    }}
                    onDelete={(v: any) => handleDelete('talla', v)}
                  />
                  
                  <SelectWithAdd 
                    label="Proveedor"
                    value={formData.supplierId?.toString() ?? ''}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, supplierId: parseInt(v) || 0 }))}
                    options={(store.suppliers || [])?.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    onAdd={() => setModalProveedor({ open: true, name: '', code: '' })}
                    onDelete={(v: any) => handleDelete('proveedor', v)}
                  />
                  
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Cod. Parte Proveedor</Label>
                    <CleanInput 
                      value={formData.supplierCode} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, supplierCode: e.target.value }))}
                      placeholder="Referencia Proveedor" 
                      className="h-9 text-sm bg-white rounded-lg font-mono" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-black mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Box className="w-4 h-4 text-[#c9a227]" /> Inventario & Almacén
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <SelectWithAdd 
                    label="Unidad de Despacho"
                    value={formData.mainUnit}
                    onChange={(v: any) => setFormData(prev => ({ ...prev, mainUnit: v }))}
                    options={unidades.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    onAdd={() => {
                        const n = prompt("Nueva Unidad:");
                        if(n) handleSimpleListCreate('productUnits', n);
                    }}
                    onDelete={(v: any) => handleDelete('unidad', v)}
                  />
                  
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Unidad de Compra (Empaque)</Label>
                    <Select value={formData.altUnit} onValueChange={(v) => setFormData(prev => ({ ...prev, altUnit: v }))}>
                      <SelectTrigger className="h-9 bg-white rounded-lg text-sm border-gray-200">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>{unidades.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Contenido por Empaque</Label>
                    <CleanInput 
                      type="number"
                      value={formData.conversionFactor} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, conversionFactor: e.target.value }))}
                      placeholder="1.0" 
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Existencia Inicial</Label>
                    <CleanInput 
                      type="number"
                      value={formData.stock} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                      disabled={!!editingProduct} 
                      placeholder="0"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Alerta Stock Mín.</Label>
                    <CleanInput 
                      type="number"
                      value={formData.minStock} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                      placeholder="5"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Tope Stock Máx.</Label>
                    <CleanInput 
                      type="number"
                      value={formData.maxStock} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, maxStock: e.target.value }))}
                      placeholder="100"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Pedir en:</Label>
                    <CleanInput 
                      type="number"
                      value={formData.reorderPoint} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, reorderPoint: e.target.value }))}
                      placeholder="10"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Ubicación (Pasillo/Gaveta)</Label>
                    <CleanInput 
                      value={formData.warehouse} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
                      placeholder="P-01 G-02" 
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <Checkbox 
                      checked={formData.managesLots} 
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, managesLots: v as boolean }))} 
                      className="w-4 h-4" 
                    />
                    <span className="text-xs font-black text-black uppercase">Maneja Lotes / Cargas</span>
                  </label>
                  <label className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <Checkbox 
                      checked={formData.managesSerials} 
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, managesSerials: v as boolean }))} 
                      className="w-4 h-4" 
                    />
                    <span className="text-xs font-black text-black uppercase">Maneja Seriales / Chasis</span>
                  </label>
                  <label className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <Checkbox 
                      checked={formData.managesExpiration} 
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, managesExpiration: v as boolean }))} 
                      className="w-4 h-4" 
                    />
                    <span className="text-xs font-black text-black uppercase">Control de Vencimiento</span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-black mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <DollarSign className="w-4 h-4 text-[#c9a227]" /> Estructura de Costos & Precios
                </h3>

                <div className="grid grid-cols-6 gap-4 mb-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Impuesto</Label>
                    <Select value={formData.taxType} onValueChange={(v) => setFormData(prev => ({ ...prev, taxType: v }))}>
                      <SelectTrigger className="h-9 bg-white rounded-lg text-sm border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{['Gravado', 'Exento', 'No Aplica'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">% IVA</Label>
                    <CleanInput 
                      type="number"
                      step="0.1" 
                      value={formData.ivaRate} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, ivaRate: parseFloat(e.target.value) || 0 }))}
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">% IGTF</Label>
                    <CleanInput 
                      type="number"
                      step="0.1" 
                      value={formData.igtfRate} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, igtfRate: parseFloat(e.target.value) || 0 }))}
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Desc. Máx.</Label>
                    <CleanInput 
                      type="number"
                      step="0.1" 
                      value={formData.maxDiscount} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, maxDiscount: e.target.value }))}
                      placeholder="0"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Costo USD (FOB)</Label>
                    <CleanInput 
                      type="number"
                      step="0.0001" 
                      value={costPrice} 
                      onChange={(e: any) => handleCostChange(e.target.value)}
                      placeholder="0.00"
                      className="h-9 text-sm bg-white rounded-lg font-bold text-[#c9a227]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">% Margen Bruto</Label>
                    <div className="flex gap-1">
                      <CleanInput 
                        type="number"
                        step="0.1"
                        value={marginPercent} 
                        onChange={(e: any) => handleMarginChange(e.target.value)}
                        placeholder="30"
                        className="h-9 text-sm bg-white rounded-lg" 
                      />
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleMarginChange(marginPercent)} 
                        className="h-9 w-9 bg-white border-gray-300 shrink-0"
                        title="Recalcular tabla de precios"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
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
                      {prices.map((price, i) => {
                        const usdVal = parseFloat(price.usd) || 0;
                        const cost = parseFloat(costPrice) || 0;
                        const margin = (usdVal > 0 && cost > 0) ? ((usdVal - cost) / usdVal) * 100 : 0;
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-black text-black">{price.name}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Switch 
                                  checked={showPricesWithIVA[i]} 
                                  onCheckedChange={(v) => {
                                    const newShow = [...showPricesWithIVA];
                                    newShow[i] = v;
                                    setShowPricesWithIVA(newShow);
                                  }} 
                                  className="scale-75" 
                                />
                                <span className="text-[10px] text-black font-bold">{showPricesWithIVA[i] ? 'Sí' : 'No'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <CleanInput 
                                type="number"
                                step="0.01" 
                                value={price.usd} 
                                onChange={(e: any) => handlePriceUSDChange(i, e.target.value)}
                                placeholder="0.00"
                                className="h-8 text-xs bg-white rounded text-right font-mono font-bold" 
                              />
                            </td>
                            <td className="px-3 py-2">
                              <CleanInput 
                                type="number"
                                step="0.01" 
                                value={price.bs} 
                                onChange={(e: any) => handlePriceBSChange(i, e.target.value)}
                                placeholder="0.00"
                                className="h-8 text-xs bg-white rounded text-right font-mono font-bold" 
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-black font-black text-[10px]">
                              {margin > 0 ? margin.toFixed(1) + '%' : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[10px] text-black font-black uppercase">
                    Fórmula Automática: PV = Costo / (1 - Margen%)
                  </span>
                  <Badge variant="outline" className="text-[10px] text-black font-black border-black">TASA VIGENTE: {exchangeRate} Bs/USD</Badge>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-black mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Tag className="w-4 h-4 text-[#c9a227]" /> Datos Adicionales (Logística)
                </h3>
                
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Peso Neto (kg)</Label>
                    <CleanInput 
                      type="number"
                      step="0.01" 
                      value={formData.netWeight} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, netWeight: e.target.value }))}
                      placeholder="0.00"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Peso Bruto (kg)</Label>
                    <CleanInput 
                      type="number"
                      step="0.01" 
                      value={formData.grossWeight} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, grossWeight: e.target.value }))}
                      placeholder="0.00"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Volumen (m³)</Label>
                    <CleanInput 
                      type="number"
                      step="0.001" 
                      value={formData.volume} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, volume: e.target.value }))}
                      placeholder="0.000"
                      className="h-9 text-sm bg-white rounded-lg" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Estado del Artículo</Label>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 h-9">
                      <Switch 
                        checked={formData.active} 
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, active: v }))} 
                        className="scale-75" 
                      />
                      <span className="text-xs font-black text-black uppercase">{formData.active ? 'Habilitado' : 'Deshabilitado'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Contenido Etiqueta Barcode</Label>
                    <div className="flex gap-2">
                      <CleanInput 
                        value={formData.barcodeLabel} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, barcodeLabel: e.target.value }))}
                        placeholder="Texto para impresión térmica" 
                        className="h-9 text-sm bg-white rounded-lg flex-1" 
                      />
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-9 w-9 bg-white border-gray-300 shrink-0" 
                        title="Probar impresión de etiqueta"
                      >
                        <Printer className="w-4 h-4 text-black" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-black">Observaciones / Notas Internas</Label>
                    <Textarea 
                      value={formData.observations} 
                      onChange={(e: any) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                      rows={2}
                      placeholder="Detalles sobre compatibilidad, fragilidad o proveedor..." 
                      className="text-sm bg-white rounded-lg resize-none" 
                    />
                  </div>
                </div>
              </div>

              {!editingProduct && (
                <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-3">
                  <h3 className="text-xs font-black uppercase text-black flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#c9a227]" /> Confirmar Registro
                  </h3>
                  <p className="text-[10px] text-black text-center font-black uppercase">
                    Verifique los datos antes de guardar. Ningún campo es obligatorio.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      size="default"
                      variant="outline"
                      onClick={() => handleSubmit(true)} 
                      className="rounded-xl text-sm border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#0a1628] px-6 h-10 font-black uppercase"
                    >
                      <FilePlus className="w-4 h-4 mr-2" />
                      Guardar y Seguir
                    </Button>
                    <Button 
                      size="default"
                      onClick={() => handleSubmit(false)} 
                      className="bg-[#0a1628] hover:bg-[#1e3a5f] text-white rounded-xl text-sm font-black px-8 h-10 uppercase"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Registrar Artículo
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {showPreview && (
              <div className="w-72 bg-gray-100 border-l border-gray-300 p-4 space-y-4 overflow-y-auto">
                <h4 className="text-xs font-black uppercase text-black border-b border-gray-300 pb-2 tracking-widest">VISTA PREVIA TÉCNICA</h4>
                
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">IDENTIFICADOR VISUAL</div>
                  <BarcodePreview />
                </div>

                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">LISTA DE PRECIOS ($/BS)</div>
                  <div className="space-y-2">
                    {prices.map((p, i) => {
                      const usd = parseFloat(p.usd) || 0;
                      const bs = parseFloat(p.bs) || 0;
                      return (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-black text-[10px] font-black uppercase">{p.name.split('-')[1].trim()}</span>
                          <div className="text-right">
                            <div className="font-mono font-black text-[#0a1628]">
                              {usd > 0 ? '$' + usd.toFixed(2) : '-'}
                            </div>
                            <div className="font-mono text-[9px] text-black font-black">
                              {bs > 0 ? 'Bs. ' + bs.toFixed(2) : '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">RESUMEN DE EXISTENCIA</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-black font-black uppercase">Actual:</span>
                      <Badge className={parseInt(formData.stock) <= parseInt(formData.minStock) ? "bg-red-100 text-red-700 font-black" : "bg-green-100 text-green-700 font-black"}>
                        {formData.stock || '0'} {formData.mainUnit}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-black font-black uppercase">Stock Mínimo:</span>
                      <span className="text-xs font-mono font-black text-black">{formData.minStock || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-black font-black uppercase">Punto Reorden:</span>
                      <span className="text-xs font-mono font-black text-black">{formData.reorderPoint || '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-[10px] text-black uppercase font-black mb-2">PROYECCIÓN DE MARGEN</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#c9a227] rounded-full transition-all"
                        style={{ width: `${Math.min(parseFloat(marginPercent) || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-[#0a1628]">{marginPercent || '0'}%</span>
                  </div>
                  <div className="text-[9px] text-black font-black mt-1 uppercase leading-tight">
                    Utilidad estimada sobre el precio detal (Sin IVA)
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-6 py-3 border-t border-gray-300 bg-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-black font-black uppercase">
                {editingProduct ? 'Modo Edición: Actualizando datos de parte' : 'Modo Registro: Nuevo artículo en base de datos'}
              </span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose} 
                className="rounded-lg text-xs border border-gray-400 bg-white hover:bg-gray-100 px-6 h-9 font-black text-black uppercase transition-colors"
              >
                CANCELAR
              </button>
              {editingProduct ? (
                <Button 
                  size="sm" 
                  onClick={() => handleSubmit(false)} 
                  className="bg-[#0a1628] hover:bg-[#1e3a5f] text-white rounded-lg text-xs font-black px-8 h-9 uppercase shadow-md"
                >
                  <Save className="w-4 h-4 mr-2" />
                  ACTUALIZAR DATOS
                </Button>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSubmit(true)} 
                    className="rounded-lg text-xs border-2 border-[#c9a227] text-[#0a1628] bg-transparent hover:bg-[#c9a227] px-6 h-9 font-black uppercase transition-all"
                  >
                    <FilePlus className="w-4 h-4 mr-2" />
                    CREAR Y SEGUIR
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleSubmit(false)} 
                    className="bg-[#0a1628] hover:bg-[#1e3a5f] text-white rounded-lg text-xs font-black px-8 h-9 uppercase shadow-md"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    GUARDAR ARTÍCULO
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mini Modales de Creación Rápida */}
      <Dialog open={modalMarca.open} onOpenChange={(open) => !open && setModalMarca({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Marca de Vehículo/Repuesto</DialogTitle>
          <CleanInput 
            value={modalMarca.name} 
            onChange={(e: any) => setModalMarca(prev => ({ ...prev, name: e.target.value }))} 
            placeholder="Nombre de la marca (Ej: Toyota, ACDelco)" 
            className="bg-white border-2 focus:border-[#c9a227]" 
            autoFocus 
            onKeyDown={(e: any) => { if (e.key === 'Enter') handleCreate('marca', modalMarca); }} 
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalMarca({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => handleCreate('marca', modalMarca)} className="bg-[#0a1628] font-black uppercase text-[10px]">Crear Marca</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalGrupo.open} onOpenChange={(open) => !open && setModalGrupo({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Familia / Grupo</DialogTitle>
          <CleanInput 
            value={modalGrupo.name} 
            onChange={(e: any) => setModalGrupo(prev => ({ ...prev, name: e.target.value }))} 
            placeholder="Nombre del grupo (Ej: Tren Delantero)" 
            className="bg-white border-2 focus:border-[#c9a227]" 
            autoFocus 
            onKeyDown={(e: any) => { if (e.key === 'Enter') handleCreate('grupo', modalGrupo); }} 
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalGrupo({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => handleCreate('grupo', modalGrupo)} className="bg-[#0a1628] font-black uppercase text-[10px]">Crear Grupo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalSubGrupo.open} onOpenChange={(open) => !open && setModalSubGrupo({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Sub-Familia</DialogTitle>
          <CleanInput 
            value={modalSubGrupo.name} 
            onChange={(e: any) => setModalSubGrupo(prev => ({ ...prev, name: e.target.value }))} 
            placeholder="Ej: Amortiguadores" 
            className="bg-white border-2 focus:border-[#c9a227]" 
            autoFocus 
            onKeyDown={(e: any) => { if (e.key === 'Enter') handleCreate('subgrupo', modalSubGrupo); }} 
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalSubGrupo({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => handleCreate('subgrupo', modalSubGrupo)} className="bg-[#0a1628] font-black uppercase text-[10px]">Crear Sub-Grupo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalLinea.open} onOpenChange={(open) => !open && setModalLinea({ open: false, name: '' })}>
        <DialogContent className="max-w-sm bg-gray-200" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-black text-xs font-black uppercase">Nueva Línea de Producto</DialogTitle>
          <CleanInput 
            value={modalLinea.name} 
            onChange={(e: any) => setModalLinea(prev => ({ ...prev, name: e.target.value }))} 
            placeholder="Ej: Línea Pesada / Liviana" 
            className="bg-white border-2 focus:border-[#c9a227]" 
            autoFocus 
            onKeyDown={(e: any) => { if (e.key === 'Enter') handleCreate('linea', modalLinea); }} 
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalLinea({ open: false, name: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => handleCreate('linea', modalLinea)} className="bg-[#0a1628] font-black uppercase text-[10px]">Crear Línea</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalProveedor.open} onOpenChange={(open) => !open && setModalProveedor({ open: false, name: '', code: '' })}>
        <DialogContent className="max-w-sm bg-gray-200" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-black text-xs font-black uppercase">Nuevo Proveedor / Mayorista</DialogTitle>
          <CleanInput 
            value={modalProveedor.name} 
            onChange={(e: any) => setModalProveedor(prev => ({ ...prev, name: e.target.value }))} 
            placeholder="Razón Social del Proveedor" 
            className="bg-white border-2 focus:border-[#c9a227] mb-2" 
            autoFocus 
          />
          <CleanInput 
            value={modalProveedor.code} 
            onChange={(e: any) => setModalProveedor(prev => ({ ...prev, code: e.target.value }))} 
            placeholder="Código / RIF" 
            className="bg-white border-2 focus:border-[#c9a227]" 
            onKeyDown={(e: any) => { if (e.key === 'Enter') handleCreate('proveedor', modalProveedor); }} 
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setModalProveedor({ open: false, name: '', code: '' })} className="font-black uppercase text-[10px]">Cerrar</Button>
            <Button size="sm" onClick={() => handleCreate('proveedor', modalProveedor)} className="bg-[#0a1628] font-black uppercase text-[10px]">Crear Proveedor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};