'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, X, AlertCircle, User, Phone, MapPin, CreditCard, DollarSign, ArrowLeft } from 'lucide-react';
import { Customer } from '@/lib/types';
import { Store } from '@/lib/db-store';
import { formatBs, formatUsd } from '@/lib/currency-formatter';

interface LoadCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer, amount: number) => void;
  totalAmount: number;
}

type DocumentType = 'V-' | 'J-' | 'G-' | 'E-' | 'P-';

export function LoadCreditModal({ isOpen, onClose, onConfirm, totalAmount }: LoadCreditModalProps) {
  const [step, setStep] = useState<'search' | 'found' | 'create'>('search');
  const [documentType, setDocumentType] = useState<DocumentType>('V-');
  const [documentNumber, setDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [store, setStore] = useState<any>(Store.get());

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
      setDocumentType('V-');
      setIsSearching(false);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (!documentNumber.trim()) {
      alert('Por favor, ingrese un número de documento');
      return;
    }

    setIsSearching(true);
    const fullDocument = `${documentType}${documentNumber}`;
    const customers: Customer[] = store?.clientes || [];
    
    // Simular un pequeño delay para la búsqueda
    setTimeout(() => {
      const customer = customers.find(c => c.cedula === fullDocument);
      if (customer) {
        setFoundCustomer(customer);
        setStep('found');
      } else {
        setFoundCustomer(null);
        setStep('create');
      }
      setIsSearching(false);
    }, 300);
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
      name: customerName.trim(),
      address: address || 'Sin dirección',
      phone: phone || 'Sin teléfono',
      debt: 0,
    };

    // Guardar nuevo cliente
    const updatedCustomers = [...(store.clientes || []), newCustomer];
    Store.set({ ...store, clientes: updatedCustomers });

    setFoundCustomer(newCustomer);
    setStep('found');
    
    alert(`Cliente ${newCustomer.name} registrado exitosamente.`);
  };

  const handleConfirmLoad = () => {
    if (foundCustomer) {
      onConfirm(foundCustomer, totalAmount);
    }
  };

  const handleBackToSearch = () => {
    setStep('search');
    setFoundCustomer(null);
    setDocumentNumber('');
    setCustomerName('');
    setAddress('');
    setPhone('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header con fondo negro */}
        <div className="bg-black px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Cargar Crédito</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Mostrar monto a deber - IGUAL EN TODOS LOS PASOS */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-xs font-bold text-amber-700 uppercase">Monto a deber</p>
            <p className="text-2xl font-black text-amber-800">{formatUsd(totalAmount)}</p>
          </div>

          {/* ========================================== */}
          {/* PASO 1: BÚSQUEDA - IMAGEN 1 */}
          {/* ========================================== */}
          {step === 'search' && (
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
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="h-12 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PASO 2: CLIENTE ENCONTRADO - IMAGEN 2 */}
          {/* ========================================== */}
          {step === 'found' && foundCustomer && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
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
                onClick={handleConfirmLoad}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Cargar Crédito
              </button>
            </div>
          )}

          {/* ========================================== */}
          {/* PASO 3: CREAR NUEVO CLIENTE - IMAGEN 3 */}
          {/* ========================================== */}
          {step === 'create' && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">NOMBRE COMPLETO</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="GLORIA MACHETE"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNewCustomer()}
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
                      placeholder="11.254.685"
                      className="flex-1 h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">TELÉFONO</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="04125896659"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">DIRECCIÓN</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Dirección del cliente"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBackToSearch}
                  className="flex-1 h-12 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  Volver a la lista
                </button>
                <button
                  onClick={handleSaveNewCustomer}
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
  );
}