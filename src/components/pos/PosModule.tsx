"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store } from '@/lib/db-store';
import { Product, Sale, SaleItem, Customer, PagoRealizado, PaymentMethod } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import FloatingPaymentModal from './FloatingPaymentModal';
import { ReceiptModal } from './ReceiptModal';

interface CartItem {
    productId: string;
    barcode: string;
    name: string;
    price: number;
    qty: number;
    maxStock: number;
}

// Interface for the payment data coming from the modal
interface ModalPaymentItem {
  id: string;
  method: string;
  amount: number; // Bs amount
  usdAmount?: number;
}

export function PosModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState(36.5);
  const [isCashOpen, setIsCashOpen] = useState(true); // Default to true
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = Store.get();
    setProducts(state?.productos || []);
    setExchangeRate(state?.tasa || 36.5);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [searchTerm, products]);

  useEffect(() => {
      setSelectedIndex(-1);
  }, [searchTerm]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
        const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
  }, [selectedIndex]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({ title: "Sin Stock", variant: "destructive" });
      return;
    }
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        toast({ title: "Stock Máximo", variant: "destructive" });
        return;
      }
      setCart(cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { 
        productId: product.id,
        barcode: product.codigo || '',
        name: product.nombre,
        price: product.precioUSD || 0,
        qty: 1,
        maxStock: product.stock 
      }]);
    }
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
            addToCart(filteredProducts[selectedIndex]);
          }
          setSelectedIndex(-1);
      }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(currentCart => {
        const itemIndex = currentCart.findIndex(item => item.productId === productId);
        if (itemIndex === -1) return currentCart;

        const item = currentCart[itemIndex];
        const newQty = item.qty + delta;

        if (newQty > item.maxStock) {
            toast({ title: "Stock insuficiente", variant: "destructive" });
            return currentCart;
        }

        if (newQty <= 0) {
            return currentCart.filter(it => it.productId !== productId);
        }

        return currentCart.map(it => it.productId === productId ? { ...it, qty: newQty } : it);
    });
  };

  const totalUSD = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalBS = totalUSD * exchangeRate;

  const handleSaleComplete = (saleData: { customer?: Customer; method: string; payments: ModalPaymentItem[]; change: number; }) => {
    const saleItems: SaleItem[] = cart.map(item => ({
      productoId: item.productId,
      cantidad: item.qty,
      precioUnitUSD: item.price,
      subtotalUSD: item.price * item.qty,
      nombre: item.name,
    }));
    
    // CORRECT MAPPING from ModalPaymentItem[] to PagoRealizado[]
    const paymentsForSale: PagoRealizado[] = saleData.payments.map(p => ({
      metodo: p.method as PaymentMethod,
      montoBS: p.amount,
      montoUSD: p.usdAmount || (p.amount / exchangeRate)
    }));

    const newSale: Sale = {
      id: `VTA-${Date.now()}`,
      fecha: new Date().toISOString(),
      cliente: saleData.customer ? `${saleData.customer.name} [${saleData.customer.id}]` : 'CONSUMIDOR FINAL',
      items: saleItems,
      subtotalUSD: totalUSD,
      descuentoUSD: 0, // Assuming no discount for now
      totalUSD: totalUSD,
      totalBS: totalBS,
      metodoPago: saleData.method,
      estado: 'completada', // Assuming a default state
      change: saleData.change || 0,
      payments: paymentsForSale // CORRECT property name and structure
    };

    const currentState = Store.get() || {};
    const updatedProducts = (currentState.productos || []).map((p: Product) => {
      const itemVendido = newSale.items.find(i => i.productoId === p.id);
      if (itemVendido) {
        return { ...p, stock: p.stock - itemVendido.cantidad };
      }
      return p;
    });

    setProducts(updatedProducts);
    
    let newState: any = {
      ...currentState,
      productos: updatedProducts,
      ventas: [...(currentState.ventas || []), newSale],
    };

    if (saleData.customer && newSale.metodoPago === 'credito') {
      const newDebt = {
        id: `CXC-${Date.now()}`,
        fecha: new Date().toISOString(),
        fechaVencimiento: '2099-12-31',
        cliente: `${saleData.customer.name} [${saleData.customer.id}]`,
        montoUSD: totalUSD,
        abonadoUSD: 0,
        saldoUSD: totalUSD,
        estado: 'pendiente',
        historialPagos: [],
        ventaId: newSale.id,
      };
      newState.cxc = [...(currentState.cxc || []), newDebt];
    }

    Store.set(newState);

    setLastSale(newSale);
    setIsReceiptOpen(true);
    setCart([]);
    setIsPaymentOpen(false);
    setIsCreditOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full p-2 lg:p-4 overflow-hidden">
      <div className="w-full lg:w-[420px] flex flex-col gap-4">
        <Card className="bg-card border-border shadow-xl">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                ref={searchInputRef}
                placeholder="Buscar por Nombre o Código..."
                className="pl-10 h-12 text-base bg-background/50 border-border focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
            </div>
          </CardContent>
        </Card>

        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredProducts.map((p, index) => (
            <div 
              key={p.id} 
              className={`p-3 border rounded-lg transition-all transform hover:translate-x-1 cursor-pointer ${selectedIndex === index ? 'bg-primary/10 border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
              onClick={() => addToCart(p)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm line-clamp-2 leading-tight">{p.nombre}</span>
                <div className='text-right'>
                    <span className="text-primary font-bold text-sm">${(p.precioUSD || 0).toFixed(2)}</span>
                    <span className="text-muted-foreground text-[10px] block">Bs. {((p.precioUSD || 0) * exchangeRate).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between items-end mt-2">
                <span className="text-[10px] text-muted-foreground font-mono">{p.codigo}</span>
                <Badge variant={p.stock <= (p.stockMinimo || 0) ? "destructive" : "secondary"} className="text-[10px] font-bold py-0 h-5">
                  Stock: {p.stock}
                </Badge>
              </div>
            </div>
          ))}
          {searchTerm && filteredProducts.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10 px-4">
                <p className='font-bold'>Sin resultados para "{searchTerm}"</p>
                <p className='text-xs mt-1'>Intente con otro término de búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border-none shadow-2xl relative">
          {!isCashOpen && (
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
              <div className="max-w-xs">
                <h3 className="text-xl font-bold mb-2">Caja Cerrada</h3>
                <p className="text-muted-foreground mb-4">Debe abrir una sesión de caja para poder procesar ventas.</p>
              </div>
            </div>
          )}
          
          <CardHeader className="border-b bg-card">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Nota de Entrega
              </CardTitle>
              <Button variant="outline" size='sm' className='text-destructive hover:text-destructive h-8' onClick={() => setCart([])} disabled={cart.length === 0}>
                  <Trash2 className='w-4 h-4 mr-2'/> Vaciar
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className='font-bold'>Carrito vacío</p>
                <p className='text-sm'>Agregue productos desde el buscador</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 p-3 bg-background/30 rounded-xl border animate-in slide-in-from-top-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={() => updateQty(item.productId, -1)}><Minus className="w-4 h-4" /></Button>
                    <span className="w-8 text-center font-bold text-base tabular-nums">{item.qty}</span>
                    <Button variant="outline" size="icon" className="w-8 h-8 rounded-full" onClick={() => updateQty(item.productId, 1)}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="w-28 text-right">
                    <p className="font-bold text-base">$ {(item.price * item.qty).toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 w-8 h-8" onClick={() => updateQty(item.productId, -item.qty)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))
            )}
          </CardContent>
          
          <CardFooter className="flex-col gap-4 border-t bg-card/80 p-4">
            <div className="w-full space-y-2">
               <div className="flex justify-between text-muted-foreground">
                 <span className='font-bold'>Subtotal ({cart.reduce((a,b) => a+b.qty, 0)} items)</span>
                 <span className='font-bold'>$ {totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-primary">
                <span>TOTAL A PAGAR</span>
                <span>$ {totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-muted-foreground">
                <span>≈ Equivalente en Bs.</span>
                <span>{totalBS.toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button variant="outline" size="lg" className="h-14 font-bold border-2 text-base border-primary/50 hover:bg-primary/10 hover:border-primary" disabled={cart.length === 0 || !isCashOpen} onClick={() => setIsCreditOpen(true)}>
                <CreditCard className="w-5 h-5 mr-2"/> Venta a Crédito
              </Button>
              <Button size="lg" className="h-14 font-black bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-lg uppercase tracking-wider" disabled={cart.length === 0 || !isCashOpen} onClick={() => setIsPaymentOpen(true)}>
                <DollarSign className="w-6 h-6 mr-2"/> Cobrar
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {(isPaymentOpen || isCreditOpen) && (
        <FloatingPaymentModal 
            total={totalBS}
            exchangeRate={exchangeRate}
            onClose={() => { setIsPaymentOpen(false); setIsCreditOpen(false); }}
            onConfirm={handleSaleComplete}
            isCredit={isCreditOpen}
        />
      )}

      {lastSale && (
        <ReceiptModal 
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={lastSale}
        />
      )}
    </div>
  );
}
