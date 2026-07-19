'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { create, all } from 'mathjs';
import { 
  Search, History, Users, Barcode, Trash2, X, Plus, Minus, DollarSign, CreditCard,
  Save, Printer, FileText, ChevronDown, BookOpen, HardDrive, Wifi, WifiOff,
  User, Phone, MapPin, AlertCircle, UserPlus
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useToast } from '../../hooks/use-toast';
import { cn } from '@/lib/utils';
import { Product, Customer } from '@/lib/types';
import { formatBs, formatUsd } from '@/lib/currency-formatter';
import { Store } from '@/lib/db-store';
import FloatingPaymentModal from './FloatingPaymentModal';
import { ReceiptModal } from './ReceiptModal';

const math = create(all);

// DEV-NOTE: Se ha movido el hook useDebounce aquí para solucionar un problema de resolución de módulos.
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type DocumentType = 'V-' | 'J-' | 'G-' | 'E-' | 'P-';

export default function PosModule() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [store, setStore] = useState<any>(Store.get());

  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isLoadCreditModalOpen, setLoadCreditModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);

  const [syncStatus, setSyncStatus] = useState('idle');

  // Estados para el modal de crédito (integrado directamente)
  const [creditStep, setCreditStep] = useState<'search' | 'existing' | 'create' | 'notfound'>('search');
  const [documentType, setDocumentType] = useState<DocumentType>('V-');
  const [documentNumber, setDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = Store.subscribe(setStore);
    return () => unsubscribe();
  }, []);

  // Resetear estados del modal de crédito cuando se cierra
  useEffect(() => {
    if (!isLoadCreditModalOpen) {
      setCreditStep('search');
      setDocumentNumber('');
      setCustomerName('');
      setAddress('');
      setPhone('');
      setFoundCustomer(null);
      setDocumentType('V-');
    }
  }, [isLoadCreditModalOpen]);

  const exchangeRate = useMemo(() => store?.config?.exchangeRate || 1, [store]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    const products: Product[] = store?.products || [];
    return products.filter(p => 
      p.activo && (
        p.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    ).slice(0, 20);
  }, [debouncedSearchTerm, store?.products]);

  const addToCart = (product: Product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + quantity);
    } else {
      setCart(prev => [...prev, { ...product, quantity, precioUSD: product.precioUSD ?? 0 }]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 0) return;
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.precioUSD * item.quantity), 0);
  }, [cart]);

  // ============================================
  // LÓGICA DEL MODAL DE CRÉDITO (integrada)
  // ============================================
  
  const handleCreditSearch = () => {
    if (!documentNumber.trim()) {
      alert('Por favor, ingrese un número de documento');
      return;
    }

    const fullDocument = `${documentType}${documentNumber}`;
    const customers: Customer[] = store?.clientes || [];
    
    const customer = customers.find(c => c.cedula === fullDocument);
    
    if (customer) {
      setFoundCustomer(customer);
      setCreditStep('existing');
    } else {
      setCreditStep('notfound');
    }
  };

  const handleCreditCreateNew = () => {
    setCreditStep('create');
  };

  const handleCreditSaveNewCustomer = () => {
    if (!customerName.trim()) {
      alert('Por favor, ingrese el nombre del cliente');
      return;
    }

    const fullDocument = `${documentType}${documentNumber}`;
    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      cedula: fullDocument,
      name: customerName,
      address: address || 'Sin dirección',
      phone: phone || 'Sin teléfono',
      debt: 0,
    };

    const updatedCustomers = [...(store.clientes || []), newCustomer];
    Store.set({ ...store, clientes: updatedCustomers });

    setFoundCustomer(newCustomer);
    setCreditStep('existing');
  };

  const handleCreditConfirmLoad = () => {
    if (foundCustomer) {
      // Crear registro de carga de crédito
      const creditSale = {
        id: `CRED-${Date.now()}`,
        type: 'CREDIT_LOAD',
        date: new Date().toISOString(),
        customer: {
          id: foundCustomer.id,
          name: foundCustomer.name,
        },
        items: [{
          id: 'CREDIT',
          nombre: 'CARGA DE SALDO',
          quantity: 1,
          price: total
        }],
        total: total,
      };

      const updatedCustomers = (store.clientes || []).map((c: Customer) => 
        c.id === foundCustomer.id ? { ...c, debt: (c.debt || 0) + total } : c
      );

      Store.set({ 
        ...store, 
        sales: [...(store.sales || []), creditSale],
        clientes: updatedCustomers
      });

      toast({ 
        title: "Crédito Cargado", 
        description: `Se cargaron ${formatUsd(total)} al cliente ${foundCustomer.name}.` 
      });
      
      setLoadCreditModalOpen(false);
      setCreditStep('search');
      setDocumentNumber('');
      setFoundCustomer(null);
    }
  };

  const handleCreditBackToSearch = () => {
    setCreditStep('search');
    setFoundCustomer(null);
    setDocumentNumber('');
  };

  const handlePayment = (isCredit = false) => {
    if (cart.length === 0) {
        toast({ title: "Carrito Vacío", description: "Agregue productos antes de proceder.", variant: "destructive" });
        return;
    }
    
    if (isCredit) {
      if (!selectedCustomer) {
          toast({ title: "Venta a Crédito", description: "Por favor, busque y seleccione un cliente antes de proceder.", variant: "default"});
          return;
      }
      // Finalize credit sale directly
      finalizeTransaction({ method: 'credito', customer: selectedCustomer, payments: [], change: 0 });
    } else {
      setPaymentModalOpen(true);
    }
  };

  const finalizeTransaction = (data: any) => {
    const sale = {
      id: data.method === 'credito' ? `NC-${Date.now()}`: `FACT-${Date.now()}`,
      type: data.method === 'credito' ? 'CREDIT_SALE' : 'SALE',
      date: new Date().toISOString(),
      customer: data.customer || selectedCustomer || { id: '0', name: 'CONSUMIDOR FINAL' },
      items: cart,
      subtotal: total,
      tax: total * 0.16, // Simulado
      total: total,
      totalBs: total * exchangeRate,
      payments: data.payments,
      change: data.change,
      mainPaymentMethod: data.method
    };

    if (data.method === 'credito' && data.customer) {
        const updatedCustomers = (store.clientes || []).map((c: Customer) => c.id === data.customer.id ? {...c, debt: (c.debt || 0) + total} : c);
        Store.set({ ...store, clientes: updatedCustomers });
    }

    const newSales = [...(store.sales || []), sale];
    const updatedProducts = (store.products || []).map((p: Product) => {
      const cartItem = cart.find(item => item.id === p.id);
      return cartItem ? { ...p, stock: (p.stock || 0) - cartItem.quantity } : p;
    });

    Store.set({ ...store, sales: newSales, products: updatedProducts });
    
    setLastTransaction(sale);
    setCart([]);
    setSelectedCustomer(null);
    setPaymentModalOpen(false);
    setReceiptModalOpen(true);
    toast({ title: "Venta Completada", description: "La transacción se ha guardado exitosamente." });
  };

  const syncData = async () => {
    setSyncStatus('syncing');
    toast({ title: "Sincronizando...", description: "Enviando datos a la nube." });
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSyncStatus('success');
    toast({ title: "Sincronización Exitosa", description: "Los datos están actualizados en la nube." });
    setTimeout(() => setSyncStatus('idle'), 3000);
  };

  useHotkeys('f1', () => document.getElementById('search-input')?.focus(), { preventDefault: true });
  useHotkeys('f2', () => handlePayment(false), { preventDefault: true });
  useHotkeys('f3', () => handlePayment(true), { preventDefault: true });
  useHotkeys('f4', () => setCart([]), { preventDefault: true });
  useHotkeys('f6', () => setPaymentModalOpen(true), { preventDefault: true });

  if (!isClient) {
    return <div className="flex items-center justify-center h-screen bg-gray-100"><HardDrive className="w-10 h-10 animate-pulse text-gray-400" /></div>;
  }

  return (
    <div className="h-screen bg-white flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-gray-800 tracking-tighter">Pos<span className="text-[#D4A017]">VEN</span> pro</h1>
            <div className="flex items-center gap-3">
              <button className="font-bold text-xs flex items-center gap-2 bg-primary px-3 py-1.5 rounded-lg text-black"><BookOpen className="w-4 h-4"/> PUNTO DE VENTA</button>
              <button className="font-bold text-xs flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg"><History className="w-4 h-4"/> HISTORIAL</button>
            </div>
        </div>
        <div className="flex items-center gap-4">
          <div 
            onClick={syncData}
            className={cn(
              "flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-colors",
              syncStatus === 'idle' && "bg-gray-100 hover:bg-gray-200 text-gray-600",
              syncStatus === 'syncing' && "bg-blue-100 text-blue-600 animate-pulse",
              syncStatus === 'success' && "bg-green-100 text-green-700",
            )}
          >
            {syncStatus === 'syncing' ? <Wifi className="w-4 h-4 animate-ping"/> : <Wifi className="w-4 h-4"/>}
            CLOUD SYNC
          </div>
          <div className="text-right">
            <p className="font-bold text-sm text-gray-800">{store?.user?.nombre || 'FIONA'}</p>
            <p className="text-[10px] font-bold text-gray-500">MODO OPERATIVO</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-black text-black">
            {(store?.user?.nombre || 'F').charAt(0)}
          </div>
          <button className="text-gray-500 hover:text-gray-800">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col p-4 bg-gray-50 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escanee o busque producto por código o descripción... (F1)"
                className="w-full h-12 pl-12 pr-4 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {debouncedSearchTerm && filteredProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow-md border mb-4 animate-in fade-in-50">
              {filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToCart(p)} className="flex justify-between items-center p-3 border-b last:border-b-0 hover:bg-primary/20 cursor-pointer">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{p.nombre}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.codigo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-800">{formatUsd(p.precioUSD)}</p>
                    <p className="text-xs text-gray-500 font-mono">Stock: {p.stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 flex text-xs font-bold uppercase tracking-wider">
              <div className="w-2/5">Descripción</div>
              <div className="w-1/5 text-center">Cant</div>
              <div className="w-1/5 text-right">Precio ($)</div>
              <div className="w-1/5 text-right">Total</div>
            </div>
            <div className="h-[calc(100%-120px)] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Barcode className="mx-auto w-16 h-16 mb-2" />
                  <p className="font-bold">El carrito está vacío</p>
                  <p className="text-sm">Agregue productos para iniciar una venta</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center px-4 py-3 border-b font-semibold text-gray-700">
                    <div className="w-2/5">
                      <p className="font-bold text-sm text-gray-800 leading-tight">{item.nombre}</p>
                      <p className="text-xs text-gray-500 font-mono">{item.codigo}</p>
                    </div>
                    <div className="w-1/5 flex justify-center items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Minus size={14}/></button>
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        className="w-12 text-center bg-transparent font-bold text-lg"
                      />
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Plus size={14}/></button>
                    </div>
                    <div className="w-1/5 text-right font-mono">{formatUsd(item.precioUSD)}</div>
                    <div className="w-1/5 text-right font-mono font-bold text-lg text-gray-800">{formatUsd(item.precioUSD * item.quantity)}</div>
                    <div className="pl-3">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="bg-gray-800 h-24 p-4 flex justify-between items-center text-white">
                <div className="flex gap-4">
                    <button onClick={() => setCart([])} className="flex items-center gap-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/40 px-3 py-2 rounded-lg"><X className="w-4"/> LIMPIAR (F4)</button>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-400">TOTAL FACTURA</p>
                    <p className="text-4xl font-black tracking-tighter">{formatUsd(total)}</p>
                    <p className="font-bold text-primary -mt-1">{formatBs(total * exchangeRate)}</p>
                </div>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-white p-4 border-l border-gray-200 flex flex-col gap-4">
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <label className="text-xs font-bold text-gray-500">IDENTIFICACIÓN CLIENTE</label>
            <div className="mt-1 p-2 bg-white rounded-lg font-bold text-gray-800">
              {selectedCustomer ? selectedCustomer.name : 'CONSUMIDOR FINAL'}
            </div>
          </div>
          
          <button 
            onClick={() => setLoadCreditModalOpen(true)}
            className="w-full h-16 bg-blue-50 border-2 border-blue-500 text-blue-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
          >
            <CreditCard className="w-5 h-5" /> CARGAR A CRÉDITO
          </button>
          
          <div className="flex-1 flex flex-col gap-3">
            <button onClick={() => handlePayment(false)} className="w-full flex-1 bg-[#D4A017] text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-transform active:scale-95">
                <DollarSign /> COBRAR (F2)
            </button>
            <button onClick={() => handlePayment(true)} className="w-full flex-1 bg-gray-800 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-md hover:bg-gray-900 transition-transform active:scale-95">
                <Users/> VENTA A CRÉDITO (F3)
            </button>
          </div>

          <div className="text-xs text-center text-gray-400 font-semibold">
            Atajos: [F1] Buscar | [F2] Cobrar | [F3] Crédito | [F4] Limpiar
          </div>
        </aside>
      </div>

      {isPaymentModalOpen && (
        <FloatingPaymentModal 
          total={total}
          totalCents={Math.round(total * exchangeRate * 100)}
          exchangeRate={exchangeRate}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={finalizeTransaction}
        />
      )}

      {/* MODAL DE CRÉDITO INTEGRADO DIRECTAMENTE */}
      {isLoadCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header con fondo negro */}
            <div className="bg-black px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Cargar Crédito</h2>
              <button
                onClick={() => setLoadCreditModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Mostrar monto a deber */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                <p className="text-xs font-bold text-amber-700 uppercase">Monto a deber</p>
                <p className="text-2xl font-black text-amber-800">{formatUsd(total)}</p>
              </div>

              {/* PASO 1: SOLO BÚSQUEDA DE CLIENTE */}
              {creditStep === 'search' && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Documento de Identidad</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                        className="h-12 px-3 bg-gray-100 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="V-">V-</option>
                        <option value="J-">J-</option>
                        <option value="G-">G-</option>
                        <option value="E-">E-</option>
                        <option value="P-">P-</option>
                      </select>
                    </div>
                    
                    <div className="flex-1">
                      <input
                        type="text"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="XX.XXX.XXX"
                        className="w-full h-12 px-4 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreditSearch()}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setLoadCreditModalOpen(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreditSearch}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Buscar
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: CLIENTE NO ENCONTRADO */}
              {creditStep === 'notfound' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-amber-700">Cliente no encontrado</p>
                    <p className="text-sm text-amber-600 mt-1">
                      No existe un cliente con el documento {documentType}{documentNumber}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreditBackToSearch}
                      className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                      No
                    </button>
                    <button
                      onClick={handleCreditCreateNew}
                      className="flex-1 h-12 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Sí, Crear Cliente
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: CLIENTE EXISTENTE */}
              {creditStep === 'existing' && foundCustomer && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="font-bold text-lg text-gray-800">{foundCustomer.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Cédula:</span>
                      <span className="font-mono text-gray-800">{foundCustomer.cedula}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-500">Saldo:</span>
                      <span className="font-bold text-lg text-red-600">{formatUsd(foundCustomer.debt || 0)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreditConfirmLoad}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-5 h-5" />
                    Cargar Crédito
                  </button>
                </div>
              )}

              {/* PASO 4: CREAR NUEVO CLIENTE */}
              {creditStep === 'create' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <p className="text-center text-sm font-bold text-gray-700">Nuevo Cliente</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">NOMBRE COMPLETO</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreditSaveNewCustomer()}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">CÉDULA / IDENTIFICACIÓN</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                          className="h-12 px-3 bg-gray-100 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="V-">V-</option>
                          <option value="J-">J-</option>
                          <option value="G-">G-</option>
                          <option value="E-">E-</option>
                          <option value="P-">P-</option>
                        </select>
                        <input
                          type="text"
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Número"
                          className="flex-1 h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          disabled
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">TELÉFONO (XXXX-XXXXXXX)</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="04XX-XXXXXXX"
                        className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">DIRECCIÓN</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej: Av. Principal #123"
                        className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCreditBackToSearch}
                      className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleCreditSaveNewCustomer}
                      className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Guardar y Cargar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isReceiptModalOpen && lastTransaction && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          saleData={lastTransaction}
          storeInfo={store.config}
          type="SALE"
        />
      )}
    </div>
  );
}