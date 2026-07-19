'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, DollarSign, CreditCard, Banknote, Smartphone, Fingerprint, Plane, Plus, Trash2, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer } from '@/lib/types';
import { formatBs, formatUsd, formatUsdNumber } from '@/lib/currency-formatter';

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
  onConfirm: (data: { payments: PaymentItem[]; totalPaid: number; change: number; method: string; customer?: Customer | null }) => void;
  isCredit?: boolean;
  customer?: Customer | null; 
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
  isCredit = false, 
  customer = null 
}: FloatingPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [currentMethod, setCurrentMethod] = useState('efectivo_bs');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (!customer) return;
      onConfirm({ payments: [], totalPaid: total, change: 0, method: 'credito', customer });
    } else {
      if (!isFullyPaid) return;
      setIsProcessing(true);
      const mainPayment = payments[0] || { method: 'efectivo_bs' };
      onConfirm({ payments, totalPaid, change, method: mainPayment.method, customer });
      setIsProcessing(false);
    }
  }, [payments, total, totalPaid, isFullyPaid, isCredit, customer, onConfirm]);

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
  
  const isConfirmDisabled = isProcessing || (isCredit && !customer) || (!isCredit && !isFullyPaid);

  return (
    <div
      className={cn(
          "fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all w-[500px]"
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
        {isCredit && customer && (
          <div className='p-3 bg-blue-100 border border-blue-300 rounded-lg text-sm'>
            <p className='font-bold text-blue-800'>Cliente: {customer.name}</p>
            <p className='text-xs text-blue-700 font-semibold mt-1'>Saldo Actual: {formatBs(customer.debt || 0)}</p>
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