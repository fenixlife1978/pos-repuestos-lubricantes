'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, X, AlertCircle, User, Phone, MapPin, CreditCard } from 'lucide-react';
import { Customer } from '@/lib/types';
import { Store } from '@/lib/db-store';
import { formatBs } from '@/lib/currency-formatter';

interface LoadCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer, amount: number) => void;
  totalAmount: number;
}

type DocumentType = 'V-' | 'J-' | 'G-' | 'E-' | 'P-';

export function LoadCreditModal({ isOpen, onClose, onConfirm, totalAmount }: LoadCreditModalProps) {
  const [step, setStep] = useState<'search' | 'existing' | 'create'>('search');
  const [documentType, setDocumentType] = useState<DocumentType>('V-');
  const [documentNumber, setDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<any>(Store.get());
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = Store.subscribe(setStore);
    return () => unsubscribe();
  }, []);

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setStep('search');
      setDocumentNumber('');
      setCustomerName('');
      setAddress('');
      setPhone('');
      setFoundCustomer(null);
      setShowNotFoundDialog(false);
      setDocumentType('V-');
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (!documentNumber.trim()) {
      alert('Por favor, ingrese un número de documento');
      return;
    }

    const fullDocument = `${documentType}${documentNumber}`;
    const customers: Customer[] = store?.clientes || [];
    
    // Buscar cliente por cédula
    const customer = customers.find(c => c.cedula === fullDocument);
    
    if (customer) {
      setFoundCustomer(customer);
      setStep('existing');
    } else {
      setShowNotFoundDialog(true);
    }
  };

  const handleCreateNew = () => {
    setShowNotFoundDialog(false);
    setStep('create');
  };

  const handleSaveNewCustomer = () => {
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

    // Guardar nuevo cliente
    const updatedCustomers = [...(store.clientes || []), newCustomer];
    Store.set({ ...store, clientes: updatedCustomers });

    setFoundCustomer(newCustomer);
    setStep('existing');
  };

  const handleConfirmLoad = () => {
    if (foundCustomer) {
      onConfirm(foundCustomer, totalAmount);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Cargar Crédito</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* PASO 1: Búsqueda de cliente */}
          {step === 'search' && (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-600 font-medium">
                Buscar Cliente
              </p>
              
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
                    placeholder="Número de documento"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                
                <button
                  onClick={handleSearch}
                  className="h-12 px-6 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Buscar
                </button>
              </div>

              <p className="text-xs text-center text-gray-400">
                Presione Enter para buscar o haga clic en el botón Buscar
              </p>
            </div>
          )}

          {/* Diálogo: Cliente no encontrado */}
          {showNotFoundDialog && (
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
                  onClick={() => setShowNotFoundDialog(false)}
                  className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleCreateNew}
                  className="flex-1 h-12 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Sí, Crear Cliente
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Cliente existente */}
          {step === 'existing' && foundCustomer && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-500">Nombre:</span>
                  <span className="font-bold text-gray-800">{foundCustomer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-12">Cédula:</span>
                  <span className="font-mono text-gray-800">{foundCustomer.cedula}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-500">Saldo Actual:</span>
                  <span className="font-bold text-lg text-red-600">{formatBs(foundCustomer.debt || 0)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('search');
                    setFoundCustomer(null);
                  }}
                  className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  Buscar Otro
                </button>
                <button
                  onClick={handleConfirmLoad}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Cargar Crédito
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Crear nuevo cliente */}
          {step === 'create' && (
            <div className="space-y-4 animate-in fade-in-50">
              <p className="text-center text-sm font-bold text-gray-700">
                Nuevo Cliente
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    NOMBRE COMPLETO *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNewCustomer()}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    DIRECCIÓN
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ej: Av. Principal #123"
                      className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    TELÉFONO
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 0412-1234567"
                      className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep('search');
                    setShowNotFoundDialog(false);
                  }}
                  className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewCustomer}
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Crear y Cargar Crédito
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}