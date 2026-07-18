"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, DollarSign, CreditCard, Banknote, Smartphone, Fingerprint, Plane, Plus, Trash2, Calculator, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/lib/types';
import { formatBs, formatUsd, formatUsdNumber } from '@/lib/currency-formatter';
import { Store } from '@/lib/db-store';

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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [docPrefix, setDocPrefix] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  useEffect(() => {
    if (isCredit) {
      const allState = Store.get();
      setCustomers(allState?.clientes || []);
    }
  }, [isCredit]);
  
  const filteredCustomers = useMemo(() => {
      if (!customerSearch) return [];
      return customers.filter(c => 
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.id.toLowerCase().includes(customerSearch.toLowerCase())
      ).slice(0, 5);
  }, [customerSearch, customers]);

  useEffect(() => {
    if (selectedCustomer) {
        const [prefix, ...numParts] = selectedCustomer.id.split('-');
        setDocPrefix(prefix || 'V');
        setDocNumber(numParts.join('-'));
        setCustomerName(selectedCustomer.name);
        setCustomerSearch('');
        setIsNewCustomer(false);
    } else if (!isNewCustomer) {
        setDocPrefix('V');
        setDocNumber('');
        setCustomerName('');
    }
  }, [selectedCustomer, isNewCustomer]);
  
  const handleSelectCustomer = (customer: Customer) => {
      setSelectedCustomer(customer);
  }
  
  const handleToggleNewCustomer = () => {
      setIsNewCustomer(prev => !prev);
      setSelectedCustomer(null);
  }
  
  const formatCedula = (val: string) => {
      if (docPrefix === 'V') {
          const digits = val.replace(/\D/g, '');
          return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      } 
      return val.toUpperCase();
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
        let finalCustomer: Customer | undefined = selectedCustomer || undefined;

        if (isNewCustomer) {
            if (!customerName || !docNumber) {
                alert('Debe completar el nombre y la identificación para el nuevo cliente.');
                return;
            }
            finalCustomer = {
                id: `${docPrefix}-${docNumber}`,
                name: customerName.toUpperCase(),
                cedula: `${docPrefix}-${docNumber}`,
                phone: '',
                address: '',
                debt: 0
            };
            const currentState = Store.get() || {};
            const currentCustomers = currentState.clientes || [];
            const customerExists = currentCustomers.some((c: Customer) => c.id === finalCustomer?.id);
            if (!customerExists) {
                Store.set({ ...currentState, clientes: [...currentCustomers, finalCustomer] });
            }
        }

        if (!finalCustomer) {
             alert('Debe seleccionar un cliente existente o registrar uno nuevo para una venta a crédito.');
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
  }, [payments, total, totalPaid, isFullyPaid, isCredit, selectedCustomer, isNewCustomer, customerName, docNumber, docPrefix, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        if (isCredit || isFullyPaid) confirmAction();
      }
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        e.preventDefault();
        addPayment();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullyPaid, confirmAction, addPayment, onClose, isCredit]);

  useEffect(() => {
    if (!isCredit) {
      inputRef.current?.focus();
    }
  }, [isCredit]);

  const formatPaymentAmount = (payment: PaymentItem) => {
    return payment.usdAmount ? formatUsd(payment.usdAmount) : formatBs(payment.amount);
  };

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
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-blue-900 uppercase">Asignar a Cliente</h4>
                    <button onClick={handleToggleNewCustomer} className='flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900'>
                        <UserPlus size={14}/>
                        {isNewCustomer ? 'Seleccionar Existente' : 'Registrar Nuevo'}
                    </button>
                </div>

                {isNewCustomer ? (
                <div className='space-y-2 animate-in fade-in-50'>
                    <input className="form-input h-10" placeholder="Nombre Completo del Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <select className="form-select h-10" value={docPrefix} onChange={e => setDocPrefix(e.target.value)}>
                            {['V', 'E', 'J', 'G', 'P'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input className="form-input h-10" placeholder="Nro. de Identificación" value={docNumber} onChange={e => setDocNumber(formatCedula(e.target.value))} />
                    </div>
                </div>
                ) : (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                    className="form-input pl-9 h-10 w-full" 
                    placeholder="Buscar cliente por nombre o cédula..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    />
                    {filteredCustomers.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.map(c => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0">
                            <p className="font-bold text-sm text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.id}</p>
                        </div>
                        ))}
                    </div>
                    )}
                </div>
                )}
                
                {selectedCustomer && (
                    <div className='p-3 bg-green-100 border border-green-300 rounded-lg text-sm font-bold text-green-800 animate-in fade-in-50'>
                    Cliente Seleccionado: {selectedCustomer.name}
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
            <div className="space-y-3">
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y">
                    {payments.length === 0 ? (
                        <div className="text-center py-3 text-xs text-black/40">No hay pagos registrados</div>
                    ) : (
                        <div className="divide-y">
                        {payments.map(p => {
                            const methodInfo = methods.find(m => m.id === p.method);
                            return (
                            <div key={p.id} className="flex justify-between items-center p-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                {methodInfo?.icon && <methodInfo.icon size={14} />}
                                <span className="font-bold">{methodInfo?.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                <span className="font-mono">{formatPaymentAmount(p)}</span>
                                <button onClick={() => removePayment(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[8px] font-black uppercase text-black/60 block mb-0.5">Método</label>
                    <select value={currentMethod} onChange={(e) => setCurrentMethod(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs font-bold bg-white">
                    {methods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[8px] font-black uppercase text-black/60 block mb-0.5">Monto</label>
                    <div className="flex gap-1">
                    <input ref={inputRef} type="text" inputMode="decimal" value={inputValue} onChange={(e) => setInputValue(e.target.value.replace(/[^0-9.]/g, ''))} className="flex-1 border rounded-lg px-2 py-1.5 text-xs font-mono text-right" placeholder="0.00" />
                    <button onClick={addPayment} className="bg-primary px-2.5 rounded-lg text-black font-bold text-[10px]"><Plus size={12} /></button>
                    </div>
                </div>
                </div>

                <div className="flex justify-between gap-2">
                <button onClick={setExactAmount} className="flex-1 py-1.5 bg-gray-100 text-black text-[10px] font-bold rounded-lg border hover:bg-gray-200 transition">Monto Exacto</button>
                <button onClick={addPayment} className="flex-1 py-1.5 bg-[#D4A017] text-black text-[10px] font-bold rounded-lg hover:brightness-110 transition">Agregar pago</button>
                </div>

                <div className={cn("rounded-xl p-2.5 text-center border transition-colors", !isFullyPaid ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                {!isFullyPaid ? (
                    <>
                    <p className="text-[9px] font-black text-red-700 uppercase tracking-wider">FALTANTE</p>
                    <p className="text-3xl font-black text-red-700 mt-0.5">{formatBs(remaining)}</p>
                    </>
                ) : change > 0 ? (
                    <>
                    <p className="text-[9px] font-black text-green-700 uppercase tracking-wider">Vuelto en Bs</p>
                    <p className="text-3xl font-black text-green-700 mt-0.5">{formatBs(change)}</p>
                    </>
                ) : (
                    <p className="text-sm font-black text-green-700 py-1">✅ Pago exacto - Sin vuelto</p>
                )}
                </div>
            </div>
            )}

            <button
            onClick={confirmAction}
            disabled={isProcessing || (!isCredit && !isFullyPaid) || (isCredit && !selectedCustomer && (!isNewCustomer || !customerName || !docNumber))}
            className={cn("w-full py-3 rounded-xl text-white font-black text-base uppercase tracking-wider transition-all",
                (isCredit && (selectedCustomer || (isNewCustomer && customerName && docNumber))) || (!isCredit && isFullyPaid) 
                    ? (isCredit ? "bg-blue-600 hover:bg-blue-700 shadow-md" : "bg-green-600 hover:bg-green-700 shadow-md") 
                    : "bg-gray-400 cursor-not-allowed")}>
            {isProcessing ? "Procesando..." : (isCredit ? "Confirmar Venta a Crédito" : "Completar Pago")}
            </button>
            <p className="text-center text-[8px] text-black/40 mt-2">
            ␣ Espacio para finalizar | ESC para cerrar { !isCredit && '| Enter agrega monto'}
            </p>
        </div>
    </div>
  );
}
