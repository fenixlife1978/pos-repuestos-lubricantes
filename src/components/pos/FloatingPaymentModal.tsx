"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, DollarSign, CreditCard, Banknote, Smartphone, Fingerprint, Plane, Plus, Trash2, Calculator, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/lib/types';
import { formatBs, formatUsd, formatUsdNumber } from '@/lib/currency-formatter';
import { Store } from '@/lib/db-store';
import { toast } from '@/hooks/use-toast';

interface PaymentItem {
  id: string;
  method: string;
  amount: number;
  usdAmount?: number;
}

interface FloatingPaymentModalProps {
  total: number;
  exchangeRate: number;
  onClose: () => void;
  onConfirm: (data: { payments: PaymentItem[]; totalPaid: number; change: number; method: string; customer?: Customer }) => void;
  isCredit?: boolean;
}

const methods = [
  { id: 'efectivo_bs', label: 'EFECTIVO Bs', icon: Banknote, currency: 'Bs' },
  { id: 'efectivo_usd', label: 'EFECTIVO USD', icon: DollarSign, currency: 'USD' },
  { id: 'tarjeta', label: 'TARJETA', icon: CreditCard, currency: 'Bs' },
  { id: 'biopago', label: 'BIOPAGO', icon: Fingerprint, currency: 'Bs' },
  { id: 'pagomovil', label: 'PAGO MÓVIL', icon: Smartphone, currency: 'Bs' },
  { id: 'zelle', label: 'ZELLE', icon: Plane, currency: 'USD' },
];

export default function FloatingPaymentModal({ 
  total, 
  exchangeRate, 
  onClose, 
  onConfirm, 
  isCredit = false 
}: FloatingPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [currentMethod, setCurrentMethod] = useState('efectivo_bs');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // State for credit sales
  const [docPrefix, setDocPrefix] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [searchedCustomer, setSearchedCustomer] = useState<Customer | null | undefined>(undefined);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const formatCedula = (val: string) => {
      const digits = val.replace(/\D/g, '');
      if (docPrefix === 'V' || docPrefix === 'E') {
          return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      } 
      return digits.toUpperCase();
  };

  const handleSearchCustomer = () => {
    if (!docNumber.trim()) {
        toast({ title: "Validación", description: "Debe ingresar un número de documento.", variant: "destructive" });
        return;
    }
    const fullId = `${docPrefix}-${docNumber.replace(/\./g, '')}`;
    const allState = Store.get();
    const customers = allState?.clientes || [];
    const foundCustomer = customers.find((c: Customer) => c.id.toUpperCase() === fullId.toUpperCase());
    
    setSearchedCustomer(foundCustomer || null);
    setSearchAttempted(true);
    setNewCustomerName(''); // Reset new name field on new search
  };
  
  const currentMethodObj = methods.find(m => m.id === currentMethod);
  const isUsd = currentMethodObj?.currency === 'USD';

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const isFullyPaid = totalPaid >= total;
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const addPayment = () => {
    let amount = parseFloat(inputValue);
    if (isNaN(amount) || amount <= 0) return;

    const newPayment: PaymentItem = {
      id: crypto.randomUUID(),
      method: currentMethod,
      amount: isUsd ? amount * exchangeRate : amount,
      ...(isUsd && { usdAmount: amount }),
    };
    setPayments([...payments, newPayment]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const setExactAmount = () => {
    const currentRemaining = Math.max(0, total - totalPaid);
    if (isUsd) {
      setInputValue((currentRemaining / exchangeRate).toFixed(2));
    } else {
      setInputValue(currentRemaining.toFixed(2));
    }
  };

  const confirmAction = useCallback(() => {
    if (isCredit) {
        let finalCustomer: Customer | undefined = searchedCustomer || undefined;
        const fullId = `${docPrefix}-${docNumber.replace(/\./g, '')}`;

        // If customer was not found, we are creating a new one
        if (searchedCustomer === null) {
            if (!newCustomerName.trim()) {
                toast({ title: "Cliente Nuevo", description: "Debe ingresar el nombre completo para el nuevo cliente.", variant: "destructive" });
                return;
            }
            
            const currentState = Store.get() || {};
            const currentCustomers = currentState.clientes || [];
            
            // Final check for duplicates before creating
            const customerExists = currentCustomers.some((c: Customer) => c.id.toUpperCase() === fullId.toUpperCase());
            if (customerExists) {
                toast({ title: "Error de Duplicidad", description: `El cliente con ID ${fullId} ya fue registrado. Intente buscar de nuevo.`, variant: "destructive" });
                setSearchedCustomer(customerExists); // Show existing customer data
                return;
            }

            finalCustomer = {
                id: fullId.toUpperCase(),
                name: newCustomerName.toUpperCase(),
                cedula: fullId.toUpperCase(),
                phone: '',
                address: '',
                debt: 0
            };
            
            Store.set({ ...currentState, clientes: [...currentCustomers, finalCustomer] });
            toast({ title: "Cliente Registrado", description: `El cliente ${finalCustomer.name} fue guardado exitosamente.` });
        }

        if (!finalCustomer) {
            toast({ title: "Venta a Crédito", description: 'Debe buscar y asignar un cliente para una venta a crédito.', variant: "destructive" });
            return;
        }

        onConfirm({ payments: [], totalPaid: total, change: 0, method: 'credito', customer: finalCustomer });

    } else {
        if (!isFullyPaid) return;
        setIsProcessing(true);
        const mainPayment = payments[0] || { method: 'efectivo_bs' };
        onConfirm({ payments, totalPaid, change, method: mainPayment.method });
        setIsProcessing(false);
    }
  }, [payments, total, totalPaid, isFullyPaid, isCredit, searchedCustomer, newCustomerName, docNumber, docPrefix, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isCredit || isFullyPaid) confirmAction();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isCredit) addPayment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullyPaid, confirmAction, addPayment, onClose, isCredit]);

  useEffect(() => {
    if (!isCredit) inputRef.current?.focus();
  }, [isCredit]);
  
  const isConfirmDisabled = isProcessing || 
      (isCredit && (!searchAttempted || (searchedCustomer === null && !newCustomerName.trim()))) ||
      (!isCredit && !isFullyPaid);

  return (
    <div
      className={cn(
          "fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all",
          isCredit ? "w-[600px]" : "w-[500px]"
      )}
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
        <div className={cn("p-2 text-white flex justify-between items-center select-none", isCredit ? "bg-blue-900" : "bg-black")}>
            <div className="flex items-center gap-2">
            {isCredit ? <CreditCard size={18} /> : <Calculator size={18} />}
            <h3 className="font-black text-sm">{isCredit ? 'Venta a Crédito' : 'Pago / Cobro'}</h3>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
            {isCredit && (
            <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h4 className="text-xs font-black text-blue-900 uppercase">Buscar Cliente por Documento</h4>
                <div className="flex items-center gap-2">
                    <select className="form-select h-10 w-[100px]" value={docPrefix} onChange={e => setDocPrefix(e.target.value)}>
                        {['V', 'E', 'J', 'G', 'P'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input 
                        className="form-input h-10 w-full" 
                        placeholder="Nro. de Identificación" 
                        value={docNumber} 
                        onChange={e => setDocNumber(formatCedula(e.target.value))} 
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchCustomer() }}
                    />
                    <button onClick={handleSearchCustomer} className="btn-primary h-10 px-4 whitespace-nowrap">
                        <Search size={16} /> Buscar
                    </button>
                </div>

                {searchAttempted && (
                  <div className="pt-2 animate-in fade-in-50">
                    {searchedCustomer ? (
                      <div className='p-3 bg-green-100 border border-green-300 rounded-lg text-sm'>
                          <p className='font-bold text-green-800'>Cliente Encontrado: {searchedCustomer.name}</p>
                          <p className='text-xs text-green-700 font-semibold mt-1'>Saldo Actual: {formatBs(searchedCustomer.debt || 0)}</p>
                      </div>
                    ) : (
                      <div className='p-3 bg-orange-100 border border-orange-300 rounded-lg text-sm space-y-2'>
                          <p className='font-bold text-orange-800'>Cliente no registrado.</p>
                          <p className='text-xs text-orange-700 font-semibold'>Ingrese el nombre para afiliarlo al sistema.</p>
                          <input 
                            className="form-input h-10 w-full" 
                            placeholder="Nombre Completo del Nuevo Cliente" 
                            value={newCustomerName} 
                            onChange={e => setNewCustomerName(e.target.value)}
                           />
                      </div>
                    )}
                  </div>
                )}
            </div>
            )}

            <div className={cn("grid gap-3", isCredit ? "grid-cols-1" : "grid-cols-2")}>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-xl text-center shadow-sm">
                    <span className="text-[10px] font-black text-black/60 uppercase tracking-wider">{isCredit ? 'Monto a Cargar' : 'Total a pagar'}</span>
                    <p className="text-3xl font-black mt-1 text-black">{formatBs(total)}</p>
                    <p className="text-xs font-bold text-black/60 mt-0.5">≈ {formatUsd(total / exchangeRate)}</p>
                </div>
                {!isCredit && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl text-center shadow-sm">
                        <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">Pagado</span>
                        <p className="text-3xl font-black mt-1 text-green-700">{formatBs(totalPaid)}</p>
                        {payments.some(p => p.usdAmount) && <p className="text-xs font-bold text-green-600 mt-0.5">USD {formatUsdNumber(payments.reduce((s, p) => s + (p.usdAmount || 0), 0))}</p>}
                    </div>
                )}
            </div>

            {!isCredit && (
              <div className="space-y-3 pt-2">
                {/* Payment methods and details UI */}
              </div>
            )}

            <button
                onClick={confirmAction}
                disabled={isConfirmDisabled}
                className={cn("w-full py-3 rounded-xl text-white font-black text-base uppercase tracking-wider transition-all",
                    !isConfirmDisabled
                        ? (isCredit ? "bg-blue-600 hover:bg-blue-700 shadow-md" : "bg-green-600 hover:bg-green-700 shadow-md") 
                        : "bg-gray-400 cursor-not-allowed")}>
                {isProcessing ? "Procesando..." : (isCredit ? "Confirmar Venta a Crédito" : "Completar Pago")}
            </button>
            <p className="text-center text-[8px] text-black/40 -mt-2">
                ␣ Espacio para finalizar | ESC para cerrar
            </p>
        </div>
    </div>
  );
}
