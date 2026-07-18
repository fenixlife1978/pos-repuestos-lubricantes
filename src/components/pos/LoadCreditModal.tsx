'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/lib/types';
import { Store } from '@/lib/db-store';
import { toast } from '../../hooks/use-toast';
import { formatBs } from '@/lib/currency-formatter';
import { Search, UserPlus, CreditCard, X, Save, Phone, MapPin } from 'lucide-react';

interface LoadCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer, amount: number) => void;
  totalAmount: number;
}

export const LoadCreditModal: React.FC<LoadCreditModalProps> = ({ isOpen, onClose, onConfirm, totalAmount }) => {
  const [step, setStep] = useState(1); // 1: Search, 2: Found, 3: Register
  const [docPrefix, setDocPrefix] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);

  // Campos para nuevo cliente
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  const resetState = () => {
    setStep(1);
    setDocPrefix('V');
    setDocNumber('');
    setFoundCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = () => {
    if (!docNumber.trim()) {
      toast({ title: "Error", description: "Por favor, ingrese un número de documento.", variant: "destructive" });
      return;
    }
    const fullId = `${docPrefix}-${docNumber.replace(/\./g, '')}`;
    const customers = Store.get()?.clientes || [];
    const customer = customers.find((c: Customer) => c.id.toUpperCase() === fullId.toUpperCase());

    if (customer) {
      setFoundCustomer(customer);
      setStep(2);
    } else {
      if (window.confirm('Cliente no encontrado. ¿Desea registrarlo ahora?')) {
        setStep(3);
      } else {
        handleClose();
      }
    }
  };

  const handleRegisterAndLoad = () => {
    if (!newCustomerName.trim()) {
      toast({ title: "Error", description: "El nombre del cliente es obligatorio.", variant: "destructive" });
      return;
    }

    const fullId = `${docPrefix}-${docNumber.replace(/\./g, '')}`;
    const currentState = Store.get() || {};
    const currentCustomers = currentState.clientes || [];
    
    if (currentCustomers.some((c: Customer) => c.id.toUpperCase() === fullId.toUpperCase())) {
        toast({ title: "Error de Duplicidad", description: "Ya existe un cliente con este documento.", variant: "destructive" });
        setStep(1); // Vuelve a la búsqueda
        return;
    }

    const newCustomer: Customer = {
      id: fullId.toUpperCase(),
      cedula: fullId.toUpperCase(),
      name: newCustomerName.toUpperCase(),
      phone: newCustomerPhone,
      address: newCustomerAddress,
      debt: 0,
    };

    Store.set({ ...currentState, clientes: [...currentCustomers, newCustomer] });
    toast({ title: "Éxito", description: `Cliente ${newCustomer.name} registrado.` });
    onConfirm(newCustomer, totalAmount);
    handleClose();
  };

  const handleLoadCredit = () => {
    if (foundCustomer) {
      onConfirm(foundCustomer, totalAmount);
      handleClose();
    }
  };

  const formatCedula = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-white rounded-xl shadow-2xl border-gray-300 sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-black text-gray-800 flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            CARGAR CRÉDITO A CLIENTE
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4 animate-in fade-in-50 space-y-4">
            <p className="text-sm text-center text-gray-600 font-semibold">Introduzca el documento de identidad para comenzar.</p>
            <div className="flex items-center gap-2 px-4">
              <Select value={docPrefix} onValueChange={setDocPrefix}>
                <SelectTrigger className="w-[100px] h-11 bg-gray-50 border-gray-300 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['V', 'E', 'J', 'G', 'P'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                autoFocus
                value={docNumber}
                onChange={(e) => setDocNumber(formatCedula(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: 12.345.678"
                className="h-11 text-center font-mono text-lg tracking-wider border-gray-300"
              />
            </div>
            <div className="px-4">
                <Button onClick={handleSearch} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base">
                    <Search className="w-4 h-4 mr-2" />
                    BUSCAR CLIENTE
                </Button>
            </div>
          </div>
        )}

        {step === 2 && foundCustomer && (
          <div className="py-4 animate-in fade-in-50 space-y-4">
            <div className="px-6 text-center">
              <Label className="text-xs font-bold text-gray-500">CLIENTE ENCONTRADO</Label>
              <p className="text-xl font-bold text-gray-800">{foundCustomer.name}</p>
            </div>
            <div className="px-6 text-center bg-gray-50 py-3 rounded-lg mx-4 border border-gray-200">
              <Label className="text-xs font-bold text-gray-500">SALDO ACTUAL</Label>
              <p className="text-2xl font-mono font-black text-blue-700">{formatBs(foundCustomer.debt || 0)}</p>
            </div>
            <div className="px-4">
                <Button onClick={handleLoadCredit} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base">
                    <CreditCard className="w-4 h-4 mr-2" />
                    CARGAR CRÉDITO POR {formatBs(totalAmount)}
                </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-4 animate-in fade-in-50 space-y-4">
            <p className="text-sm text-center text-gray-600 font-semibold">Cliente no encontrado. Complete los datos para registrarlo.</p>
            <div className="px-4 space-y-3">
                <div className="space-y-1">
                    <Label className="font-bold text-gray-700">Nombre Completo o Razón Social</Label>
                    <Input autoFocus value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Ej: John Doe C.A." className="h-10 border-gray-300" />
                </div>
                <div className="space-y-1">
                    <Label className="font-bold text-gray-700 flex items-center gap-1"><Phone className="w-3 h-3"/>Teléfono (Opcional)</Label>
                    <Input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="Ej: 0412-1234567" className="h-10 border-gray-300" />
                </div>
                <div className="space-y-1">
                    <Label className="font-bold text-gray-700 flex items-center gap-1"><MapPin className="w-3 h-3"/>Dirección (Opcional)</Label>
                    <Input value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} placeholder="Ej: Av. Principal, Edif. ABC" className="h-10 border-gray-300" />
                </div>
            </div>
            <div className="px-4">
                <Button onClick={handleRegisterAndLoad} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base">
                    <Save className="w-4 h-4 mr-2" />
                    REGISTRAR Y CARGAR CRÉDITO
                </Button>
            </div>
          </div>
        )}

        <DialogFooter className="p-3 bg-gray-50 border-t border-gray-200">
            <Button variant="ghost" onClick={handleClose} className="font-bold text-gray-600 hover:text-gray-800">
                <X className="w-4 h-4 mr-1"/>
                Cancelar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};