'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, DollarSign, CreditCard, Banknote, Smartphone, Fingerprint, Plane, Plus, Trash2, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/lib/types';
import { formatBs, formatUsd, formatUsdNumber } from '@/lib/currency-formatter';

interface PaymentItem {
  id: string;
  method: string;
  amount: number; // Stored in Bs
  usdAmount?: number; // Optional original USD amount
}

interface FloatingPaymentModalProps {
  total: number; // Total in USD
  exchangeRate: number;
  onClose: () => void;
  onConfirm: (data: { payments: PaymentItem[]; totalPaid: number; change: number; method: string; customer?: Customer | null }) => void;
  isCredit?: boolean;
  customer?: Customer | null; 
}

const methods = [
  { id: 'efectivo_bs', label: 'EFECTIVO BS', icon: Banknote, currency: 'Bs' },
  { id: 'efectivo_usd', label: 'EFECTIVO $', icon: DollarSign, currency: 'USD' },
  { id: 'tarjeta', label: 'P. VENTA', icon: CreditCard, currency: 'Bs' },
  { id: 'biopago', label: 'BIOPAGO', icon: Fingerprint, currency: 'Bs' },
  { id: 'pagomovil', label: 'PAGO MÓVIL', icon: Smartphone, currency: 'Bs' },
  { id: 'zelle', label: 'ZELLE', icon: Plane, currency: 'USD' },
];

export default function FloatingPaymentModal({ 
  total, // This is total in USD
  exchangeRate, 
  onClose, 
  onConfirm, 
  isCredit = false, 
  customer = null 
}: FloatingPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [currentMethod, setCurrentMethod] = useState('efectivo_bs');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const totalBs = total * exchangeRate;

  const currentMethodObj = methods.find(m => m.id === currentMethod);
  const isUsdInput = currentMethodObj?.currency === 'USD';

  const totalPaidBs = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBs = Math.max(0, totalBs - totalPaidBs);
  const changeBs = Math.max(0, totalPaidBs - totalBs);
  const isFullyPaid = totalPaidBs >= totalBs;

  const addPayment = () => {
    let amount = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    const newPayment: PaymentItem = {
      id: crypto.randomUUID(),
      method: currentMethod,
      amount: isUsdInput ? amount * exchangeRate : amount,
      ...(isUsdInput && { usdAmount: amount }),
    };
    setPayments([...payments, newPayment]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const setExactAmount = () => {
    if (isUsdInput) {
      setInputValue((remainingBs / exchangeRate).toFixed(2));
    } else {
      setInputValue(remainingBs.toFixed(2));
    }
    inputRef.current?.focus();
  };

  const confirmAction = useCallback(() => {
    if (isCredit) {
      if (!customer) return;
      onConfirm({ payments: [], totalPaid: total, change: 0, method: 'credito', customer });
    } else {
      if (!isFullyPaid || payments.length === 0) return;
      setIsProcessing(true);
      const mainPayment = payments[0].method;
      onConfirm({ payments, totalPaid: totalPaidBs / exchangeRate, change: changeBs / exchangeRate, method: mainPayment, customer });
      setIsProcessing(false);
    }
  }, [payments, total, totalPaidBs, changeBs, isFullyPaid, isCredit, customer, onConfirm, exchangeRate]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.code === 'Space' || e.key === 'F2') {
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
  
  const isConfirmDisabled = isProcessing || (isCredit && !customer) || (!isCredit && (!isFullyPaid || payments.length === 0));

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in-50">
      <div className={cn("bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden w-[550px]")}>
        <div className={cn("p-2.5 text-white flex justify-between items-center select-none", isCredit ? "bg-blue-800" : "bg-gray-800")}>
          <div className="flex items-center gap-2">
            {isCredit ? <CreditCard size={18} /> : <Calculator size={18} />}
            <h3 className="font-black text-sm uppercase tracking-wider">{isCredit ? 'Confirmar Venta a Crédito' : 'Proceso de Pago'}</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 p-4 gap-4">
            {/* Columna Izquierda - Calculadora */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2">
                    {methods.map(m => (
                        <button key={m.id} onClick={() => setCurrentMethod(m.id)} className={cn(
                            "rounded-lg border-2 flex flex-col items-center justify-center p-2.5 transition-all",
                            currentMethod === m.id ? "bg-primary border-primary/50 text-black scale-105 shadow-lg" : "bg-gray-100 border-gray-200 text-gray-700 hover:border-gray-400"
                        )}>
                           <m.icon size={20} />
                           <span className="text-[9px] font-black mt-1">{m.label}</span>
                        </button>
                    ))}
                </div>
                
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xl text-gray-400">{isUsdInput ? '$' : 'Bs'}</span>
                    <input 
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPayment()}
                        placeholder="0.00"
                        className="w-full h-16 bg-gray-50 border-2 border-gray-200 rounded-lg text-center font-mono font-black text-3xl focus:ring-primary focus:border-primary focus:bg-white"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button onClick={setExactAmount} className="h-12 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg">MONTO EXACTO</button>
                    <button onClick={addPayment} className="h-12 bg-gray-800 hover:bg-black text-white font-bold rounded-lg flex items-center justify-center gap-2">
                        <Plus size={16}/> AÑADIR PAGO
                    </button>
                </div>
            </div>

            {/* Columna Derecha - Resumen */}
            <div className="bg-gray-50/70 rounded-xl p-3 flex flex-col border">
                <div className="bg-white p-3 rounded-lg text-center shadow-sm border">
                    <span className="text-[10px] font-black text-gray-500 uppercase">Total a Pagar</span>
                    <p className="text-3xl font-black text-gray-800">{formatBs(totalBs)}</p>
                    <p className="text-sm font-bold text-gray-500">≈ {formatUsd(total)}</p>
                </div>

                <div className="flex-1 mt-3 space-y-1.5 overflow-y-auto pr-1">
                    {payments.length === 0 ? (
                        <div className="text-center text-gray-400 pt-10">
                            <p className="font-bold text-sm">Añada un pago...</p>
                        </div>
                    ) : (
                        payments.map(p => (
                           <div key={p.id} className="bg-white p-2 rounded-lg flex justify-between items-center text-xs font-bold shadow-sm border">
                               <div>
                                   <p className="text-gray-800">{methods.find(m => m.id === p.method)?.label}</p>
                                   <p className="text-gray-500 font-mono text-[10px]">{formatBs(p.amount)} {p.usdAmount ? `(${formatUsd(p.usdAmount)})` : ''}</p>
                                </div>
                               <button onClick={() => removePayment(p.id)}><Trash2 className="w-4 h-4 text-red-400 hover:text-red-600"/></button>
                           </div>
                        ))
                    )}
                </div>

                <div className="mt-auto pt-3 space-y-2 text-center font-black">
                     <div className="bg-green-100/70 p-2 rounded-lg border border-green-200">
                        <p className="text-xs text-green-800">PAGADO</p>
                        <p className="text-2xl text-green-700">{formatBs(totalPaidBs)}</p>
                    </div>
                    {isFullyPaid && (
                        <div className="bg-blue-100/70 p-2 rounded-lg border border-blue-200 animate-in fade-in-50">
                            <p className="text-xs text-blue-800">VUELTO</p>
                            <p className="text-2xl text-blue-700">{formatBs(changeBs)}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="p-3 bg-gray-100 border-t">
            <button
              onClick={confirmAction}
              disabled={isConfirmDisabled}
              className={cn("w-full py-4 rounded-xl text-white font-black text-lg uppercase tracking-wider transition-all shadow-lg",
                !isConfirmDisabled
                  ? (isCredit ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700") 
                  : "bg-gray-400 cursor-not-allowed shadow-none")}>
              {isProcessing ? "PROCESANDO..." : (isCredit ? "CONFIRMAR CRÉDITO" : `COMPLETAR PAGO (F2)`)}
            </button>
        </div>
      </div>
    </div>
  );
}
