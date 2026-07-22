'use client';
import { useState, useEffect } from 'react';
import { X, Search, CreditCard, User, UserPlus, AlertCircle } from 'lucide-react';
import { Customer } from '@/lib/types';
import { Store } from '@/lib/db-store';
import { formatUsd } from '@/lib/currency-formatter';
import { useToast } from '@/hooks/use-toast';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer, amount: number) => void;
  totalAmount: number;
}

export function CreditModal({ isOpen, onClose, onConfirm, totalAmount }: CreditModalProps) {
  const { toast } = useToast();
  const [store, setStore] = useState<any>(Store.get());

  const [view, setView] = useState<'search' | 'found' | 'create'>('search');
  const [docType, setDocType] = useState('V-');
  const [docNumber, setDocNumber] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    const unsubscribe = Store.subscribe(setStore);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView('search');
      setDocType('V-');
      setDocNumber('');
      setFoundCustomer(null);
      setNewName('');
      setNewPhone('');
      setNewAddress('');
    }
  }, [isOpen]);

  // Función para formatear cédula con puntos (solo para V- y E-)
  const formatCedula = (value: string, type: string) => {
    // Solo aplicar formato para V- y E-
    if (type !== 'V-' && type !== 'E-') {
      return value.replace(/\D/g, ''); // solo dígitos sin formato
    }
    const digits = value.replace(/\D/g, '');
    // Aplicar formato XX.XXX.XXX (máximo 8 dígitos)
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return digits.slice(0, 2) + '.' + digits.slice(2);
    if (digits.length <= 8) return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5);
    return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5, 8);
  };

  const handleDocNumberChange = (value: string) => {
    const formatted = formatCedula(value, docType);
    setDocNumber(formatted);
  };

  const handleDocTypeChange = (type: string) => {
    setDocType(type);
    // Reformatear el número actual con el nuevo tipo
    if (docNumber) {
      const formatted = formatCedula(docNumber.replace(/\D/g, ''), type);
      setDocNumber(formatted);
    }
  };

  const handleSearch = () => {
    if (!docNumber.trim()) {
      toast({ title: "Documento Requerido", description: "Por favor, ingrese un documento de identidad.", variant: "destructive" });
      return;
    }
    // Limpiar puntos para la búsqueda
    const cleanDoc = docNumber.replace(/\./g, '');
    const fullDoc = `${docType}${cleanDoc}`;
    const customers: Customer[] = store.clientes || [];
    const customer = customers.find(c => c.cedula === fullDoc);

    if (customer) {
      setFoundCustomer(customer);
      setView('found');
    } else {
      setFoundCustomer(null);
      setView('create');
    }
  };

  const handleConfirmCharge = () => {
    if (foundCustomer) {
      onConfirm(foundCustomer, totalAmount);
    }
  };
  
  const handleCreateAndCharge = () => {
    const cleanDoc = docNumber.replace(/\./g, '');
    const fullDoc = `${docType}${cleanDoc}`;
    if (!newName.trim() || !fullDoc) {
      toast({ title: "Campos Incompletos", description: "El nombre y la identificación son obligatorios.", variant: "destructive" });
      return;
    }

    // Verificar duplicado
    const customers: Customer[] = store.clientes || [];
    const existing = customers.find(c => c.cedula === fullDoc);
    if (existing) {
      toast({ 
        title: "Cliente ya existe", 
        description: `Ya existe un cliente con el documento ${fullDoc}: ${existing.name}`,
        variant: "destructive"
      });
      return;
    }

    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      cedula: fullDoc,
      name: newName.trim().toUpperCase(),
      phone: newPhone.trim(),
      address: newAddress.trim(),
      debt: 0
    };
    
    const updatedCustomers = [...(store.clientes || []), newCustomer];
    Store.set({ ...store, clientes: updatedCustomers });

    toast({ title: "Cliente Creado", description: `Se ha registrado a ${newName}. Procediendo a cargar el crédito.` });
    
    onConfirm(newCustomer, totalAmount);
  };

  const handleBackToSearch = () => {
    setView('search');
    setFoundCustomer(null);
    setDocNumber('');
    setNewName('');
    setNewPhone('');
    setNewAddress('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 overflow-hidden">
        {/* HEADER - más compacto */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-black">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#D4A017]" />
            <h2 className="text-base font-bold text-white">CARGAR CRÉDITO</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* PASO 1: BÚSQUEDA */}
        {/* ============================================================ */}
        {view === 'search' && (
          <div className="p-4 bg-white">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
              <p className="text-[10px] font-bold text-amber-700 uppercase">Monto a deber</p>
              <p className="text-xl font-black text-amber-800">{formatUsd(totalAmount)}</p>
            </div>

            <div className="space-y-1 mb-3">
              <label htmlFor="doc-input" className="block text-[10px] font-bold text-gray-500">Documento de Identidad</label>
              <div className="flex items-center gap-2">
                <select 
                  value={docType} 
                  onChange={e => handleDocTypeChange(e.target.value)} 
                  className="h-10 bg-gray-100 border border-gray-300 rounded-lg px-2 font-bold text-gray-700 focus:ring-2 focus:ring-[#D4A017] outline-none text-sm"
                >
                  <option>V-</option> <option>E-</option> <option>J-</option> <option>G-</option>
                </select>
                <input
                  id="doc-input"
                  type="text"
                  value={docNumber}
                  onChange={(e) => handleDocNumberChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={docType === 'V-' || docType === 'E-' ? "XX.XXX.XXX" : "Número de identificación"}
                  className="flex-1 h-10 px-3 bg-white border border-gray-300 rounded-lg font-medium focus:ring-2 focus:ring-[#D4A017] outline-none text-sm"
                />
                <button 
                  onClick={handleSearch} 
                  className="h-10 px-3 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center hover:bg-blue-700 transition-all"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={onClose}
                className="px-5 py-1.5 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 2: CLIENTE ENCONTRADO */}
        {/* ============================================================ */}
        {view === 'found' && foundCustomer && (
          <div className="p-4 bg-white">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
              <p className="text-[10px] font-bold text-amber-700 uppercase">Monto a deber</p>
              <p className="text-xl font-black text-amber-800">{formatUsd(totalAmount)}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center">
              <p className="font-bold text-base text-gray-800">{foundCustomer.name}</p>
              <p className="text-sm text-gray-500">SALDO: <span className="font-bold text-red-600">{formatUsd(foundCustomer.debt || 0)}</span></p>
            </div>

            <button
              onClick={handleConfirmCharge}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-base hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              CARGAR CRÉDITO
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 3: CLIENTE NO ENCONTRADO - PREGUNTAR SI CREAR */}
        {/* ============================================================ */}
        {view === 'create' && !foundCustomer && (
          <div className="p-4 bg-white">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
              <p className="text-[10px] font-bold text-amber-700 uppercase">Monto a deber</p>
              <p className="text-xl font-black text-amber-800">{formatUsd(totalAmount)}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
              <p className="font-bold text-yellow-700 text-base">Cliente no encontrado</p>
              <p className="text-sm text-yellow-600 mt-1">
                No existe un cliente con el documento {docType}{docNumber.replace(/\./g, '')}
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBackToSearch}
                className="flex-1 h-10 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm"
              >
                No
              </button>
              <button
                onClick={() => {
                  // Forzamos que foundCustomer sea null para mostrar el formulario
                  setFoundCustomer(null);
                  // Ya estamos en 'create', solo nos aseguramos
                }}
                className="flex-1 h-10 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Sí, Crear Cliente
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 4: CREAR NUEVO CLIENTE - IMAGEN 2 */}
        {/* ============================================================ */}
        {view === 'create' && foundCustomer === null && (
          <div className="bg-white">
            <div className="p-4 space-y-3">
              <p className="text-center text-sm font-bold text-gray-700">Nuevo Cliente</p>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">NOMBRE COMPLETO</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-semibold focus:ring-2 focus:ring-[#D4A017] outline-none text-sm uppercase" 
                  placeholder="GLORIA MACHETE"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">CÉDULA / IDENTIFICACIÓN</label>
                <div className="flex items-center gap-2">
                  <select 
                    value={docType} 
                    onChange={e => handleDocTypeChange(e.target.value)} 
                    className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-[#D4A017] outline-none text-sm"
                  >
                    <option>V-</option><option>E-</option><option>J-</option><option>G-</option>
                  </select>
                  <input 
                    type="text" 
                    value={docNumber} 
                    onChange={(e) => handleDocNumberChange(e.target.value)} 
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-semibold focus:ring-2 focus:ring-[#D4A017] outline-none text-sm" 
                    placeholder={docType === 'V-' || docType === 'E-' ? "XX.XXX.XXX" : "Número de identificación"}
                    disabled={false} // Permitir edición en creación
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">TELÉFONO</label>
                <input 
                  type="tel" 
                  value={newPhone} 
                  onChange={e => setNewPhone(e.target.value)} 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-semibold focus:ring-2 focus:ring-[#D4A017] outline-none text-sm" 
                  placeholder="04125896659"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">DIRECCIÓN</label>
                <input 
                  type="text" 
                  value={newAddress} 
                  onChange={e => setNewAddress(e.target.value)} 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-semibold focus:ring-2 focus:ring-[#D4A017] outline-none text-sm" 
                  placeholder="Dirección del cliente"
                />
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col gap-2">
              <button 
                onClick={handleCreateAndCharge} 
                className="w-full h-10 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                GUARDAR Y CARGAR
              </button>
              <button 
                onClick={handleBackToSearch} 
                className="font-bold text-gray-600 hover:underline text-xs text-center"
              >
                VOLVER A LA LISTA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}