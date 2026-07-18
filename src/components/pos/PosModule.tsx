'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { create, all } from 'mathjs';
import { 
  Search, History, Users, Barcode, Trash2, X, Plus, Minus, DollarSign, CreditCard,
  Save, Printer, FileText, ChevronDown, BookOpen, HardDrive, Wifi, WifiOff
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useToast } from '../../hooks/use-toast';
import { cn } from '@/lib/utils';
import { Product, Customer } from '@/lib/types';
import { formatBs, formatUsd } from '@/lib/currency-formatter';
import { Store } from '@/lib/db-store';
import FloatingPaymentModal from './FloatingPaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { LoadCreditModal } from './LoadCreditModal';

const math = create(all);

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

export default function PosModule() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [store, setStore] = useState<any>(Store.get());

  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [isLoadCreditModalOpen, setLoadCreditModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);

  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = Store.subscribe(setStore);
    return () => unsubscribe();
  }, []);

  const exchangeRate = useMemo(() => store?.config?.exchangeRate || 1, [store]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    const products: Product[] = store?.products || [];
    return products.filter(p => 
      p.activo && (
        p.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
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

  const handlePayment = (isCredit = false) => {
    if (cart.length === 0) {
        toast({ title: "Carrito Vacío", description: "Agregue productos antes de proceder.", variant: "destructive" });
        return;
    }
    if (isCredit && !selectedCustomer) {
        toast({ title: "Seleccione Cliente", description: "Para una venta a crédito directa, primero seleccione un cliente.", variant: "default"});
        return;
    }
    setIsCreditSale(isCredit);
    setPaymentModalOpen(true);
  };
  
  const handleConfirmLoadCredit = (customer: Customer, amount: number) => {
      const creditSale = {
          id: `CRED-${Date.now()}`,
          type: 'CREDIT_LOAD',
          date: new Date().toISOString(),
          customer: { id: customer.id, name: customer.name },
          items: cart.length > 0 ? cart : [{ id: 'CREDIT', nombre: 'CARGA DE SALDO', quantity: 1, price: amount }],
          total: amount,
      };
  
      const updatedCustomers = (store.clientes || []).map((c: Customer) => 
          c.id === customer.id ? { ...c, debt: (c.debt || 0) + amount } : c
      );
      
      const newSales = [...(store.sales || []), creditSale];
      const updatedProducts = store.products.map((p: Product) => {
        const cartItem = cart.find(item => item.id === p.id);
        return cartItem ? { ...p, stock: (p.stock || 0) - cartItem.quantity } : p;
      });

      Store.set({ ...store, sales: newSales, productos: updatedProducts, clientes: updatedCustomers });
      
      toast({ title: "Crédito Cargado", description: `Se cargaron ${formatUsd(amount)} al cliente ${customer.name}.` });
      setLoadCreditModalOpen(false);
      setCart([]);
      setSelectedCustomer(null);
  };

  const finalizeTransaction = (data: any) => {
    const sale = {
      id: data.method === 'credito' ? `NC-${Date.now()}`: `FACT-${Date.now()}`,
      type: data.method === 'credito' ? 'CREDIT_SALE' : 'SALE',
      date: new Date().toISOString(),
      customer: data.customer || selectedCustomer || { id: '0', name: 'CONSUMIDOR FINAL' },
      items: cart,
      subtotal: total,
      tax: 0, // Simulado
      total: total,
      totalBs: total * exchangeRate,
      payments: data.payments,
      change: data.change,
      mainPaymentMethod: data.method
    };

    if (data.method === 'credito' && data.customer) {
        const updatedCustomers = store.clientes.map((c: Customer) => c.id === data.customer.id ? {...c, debt: (c.debt || 0) + total} : c);
        Store.set({ ...store, clientes: updatedCustomers });
    }

    const newSales = [...(store.sales || []), sale];
    const updatedProducts = store.products.map((p: Product) => {
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

  useHotkeys('f1', () => document.getElementById('search-input')?.focus(), { preventDefault: true });
  useHotkeys('f2', () => handlePayment(false), { preventDefault: true });
  useHotkeys('f3', () => handlePayment(true), { preventDefault: true });
  useHotkeys('f4', () => setCart([]), { preventDefault: true });

  if (!isClient) {
    return <div className="flex items-center justify-center h-screen bg-gray-100"><HardDrive className="w-10 h-10 animate-pulse text-gray-400" /></div>;
  }

  return (
    <div className="h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-gray-800 tracking-tighter">Pos<span className="text-[#D4A017]">VEN</span> pro</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-sm text-gray-800">{store?.user?.nombre || 'FIONA'}</p>
            <p className="text-[10px] font-bold text-gray-500">MODO OPERATIVO</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-black text-black">
            {(store?.user?.nombre || 'F').charAt(0)}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
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

          {/* Cart */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 flex text-xs font-bold uppercase tracking-wider">
              <div className="w-2/5">Descripción</div>
              <div className="w-1/5 text-center">Cant</div>
              <div className="w-1/5 text-right">Precio ($)</div>
              <div className="w-1/5 text-right">Total</div>
            </div>
            <div className="h-[calc(100%-120px)] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400"><Barcode className="mx-auto w-16 h-16 mb-2" /><p className="font-bold">El carrito está vacío</p></div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center px-4 py-3 border-b font-semibold text-gray-700">
                    <div className="w-2/5"><p className="font-bold text-sm text-gray-800 leading-tight">{item.nombre}</p></div>
                    <div className="w-1/5 flex justify-center items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Minus size={14}/></button>
                      <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-12 text-center bg-transparent font-bold text-lg"/>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Plus size={14}/></button>
                    </div>
                    <div className="w-1/5 text-right font-mono">{formatUsd(item.precioUSD)}</div>
                    <div className="w-1/5 text-right font-mono font-bold text-lg text-gray-800">{formatUsd(item.precioUSD * item.quantity)}</div>
                    <div className="pl-3"><button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></div>
                  </div>
                ))
              )}
            </div>
            <div className="bg-gray-800 h-24 p-4 flex justify-between items-center text-white">
                <button onClick={() => setCart([])} className="flex items-center gap-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/40 px-3 py-2 rounded-lg"><X className="w-4"/> LIMPIAR (F4)</button>
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-400">TOTAL FACTURA</p>
                    <p className="text-4xl font-black tracking-tighter">{formatUsd(total)}</p>
                    <p className="font-bold text-primary -mt-1">{formatBs(total * exchangeRate)}</p>
                </div>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-80 bg-white p-4 border-l border-gray-200 flex flex-col gap-4">
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <label className="text-xs font-bold text-gray-500">IDENTIFICACIÓN CLIENTE</label>
            <div className="mt-1 p-2 bg-white rounded-lg font-bold text-gray-800">{selectedCustomer ? selectedCustomer.name : 'CONSUMIDOR FINAL'}</div>
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

          <div className="text-xs text-center text-gray-400 font-semibold">Atajos: [F1] Buscar | [F2] Cobrar | [F3] Venta a Crédito | [F4] Limpiar</div>
        </aside>
      </div>

      {/* Modals */}
      {isPaymentModalOpen && (
        <FloatingPaymentModal 
          total={total}
          exchangeRate={exchangeRate}
          onClose={() => setPaymentModalOpen(false)}
          onConfirm={finalizeTransaction}
          isCredit={isCreditSale}
          customer={selectedCustomer}
        />
      )}

      {isLoadCreditModalOpen && (
        <LoadCreditModal 
            isOpen={isLoadCreditModalOpen}
            onClose={() => setLoadCreditModalOpen(false)}
            onConfirm={handleConfirmLoadCredit}
            totalAmount={total}
        />
      )}

      {isReceiptModalOpen && lastTransaction && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          saleData={lastTransaction}
          storeInfo={store.config}
        />
      )}
    </div>
  );
}
