"use client";

import { AppState } from './types';
import { db } from './firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// Usamos sessionStorage para garantizar INDEPENDENCIA TOTAL ENTRE PESTAÑAS
// y asegurar que la información no se mezcle entre diferentes inicios de sesión o usuarios.
const STORAGE_KEY = 'posven_pro_session_data_cache';
const COLLECTION = 'pos_system_data';
const DOC_ID = 'state';

export const initialState: AppState = {
  tasa: 36.50,
  pinDevolucion: '000000',
  productos: [],
  ventas: [],
  cxc: [],
  cxp: [],
  clientes: [],
  devoluciones: [],
  movimientos: [],
  carrito: [],
  terminales: [],
  reportesZ: [],
  ultimoZ: 0,
  proximoRecibo: 1,
  proximaDevolucion: 1,
  acumuladoHistorico: 0,
  empresa: { 
    nombre: 'NOMBRE DE SU NEGOCIO', 
    rif: 'J-00000000-0', 
    direccion: 'DIRECCIÓN FISCAL', 
    telefono: '0000-0000000' 
  },
  departamentos: ['Licores', 'Viveres', 'Otros'],
  categorias: ['Ron', 'Vino', 'Cerveza', 'Whisky', 'Refrescos', 'Otros'],
  marcas: ['Genérica'],
  presentaciones: ['750ml', '1L', 'Unidad', 'Caja'],
  proveedores: []
};

export const Store = {
  // Suscribirse a cambios en tiempo real usando Firestore con soporte Offline
  subscribe(callback: (state: Partial<AppState>) => void) {
    if (typeof window === 'undefined') return () => {};

    const docRef = doc(db, COLLECTION, DOC_ID);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.data();
        // Combinar con initialState para asegurar que todos los campos existan
        const merged = { ...initialState, ...val };
        
        // El carrito NO se sincroniza globalmente por diseño, es local por pestaña
        delete (merged as any).carrito; 
        
        callback(merged);
        
        // Guardar cache de seguridad en sessionStorage para persistir ante recargas (F5)
        // pero aislarlo de otras pestañas o navegadores.
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } else {
        // Fallback a cache local si no hay documento (pestaña nueva offline sin data previa en firestore)
        const local = Store.get();
        callback(local);
        
        const { carrito, ...toPersist } = initialState;
        setDoc(docRef, toPersist).catch(e => console.error("Error init firestore:", e));
      }
    }, (error) => {
      console.warn("Firestore Sync Warning (Normal if Offline):", error);
      callback(Store.get());
    });
  },

  get(): AppState {
    if (typeof window === 'undefined') return initialState;
    const d = sessionStorage.getItem(STORAGE_KEY);
    if (!d) return initialState;
    try {
      return JSON.parse(d);
    } catch {
      return initialState;
    }
  },

  set(state: AppState) {
    if (typeof window === 'undefined') return;
    
    // Definimos qué datos son globales y deben persistir en la nube
    const dataToPersist = {
      tasa: state.tasa,
      pinDevolucion: state.pinDevolucion,
      productos: state.productos || [],
      ventas: state.ventas || [],
      cxc: state.cxc || [],
      cxp: state.cxp || [],
      clientes: state.clientes || [],
      devoluciones: state.devoluciones || [],
      movimientos: state.movimientos || [],
      terminales: state.terminales || [],
      empresa: state.empresa,
      departamentos: state.departamentos,
      categorias: state.categorias,
      marcas: state.marcas,
      presentaciones: state.presentaciones,
      proveedores: state.proveedores,
      reportesZ: state.reportesZ || [],
      ultimoZ: state.ultimoZ || 0,
      proximoRecibo: state.proximoRecibo || 1,
      proximaDevolucion: state.proximaDevolucion || 1,
      acumuladoHistorico: state.acumuladoHistorico || 0
    };

    // Actualización inmediata del cache de sesión de la pestaña actual
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToPersist));
    
    // Persistencia asíncrona en la nube. Si no hay internet, Firebase lo encola automáticamente.
    const docRef = doc(db, COLLECTION, DOC_ID);
    setDoc(docRef, dataToPersist).catch(err => {
        // El error de red es manejado internamente por el SDK offline
        console.error("Firestore Error (Will retry automatically):", err);
    });
  },

  uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }
};

export const Utils = {
  getVzlaDate: () => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;
    return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
  },
  hoy: () => Utils.getVzlaDate().slice(0, 10),
  ahora: () => Utils.getVzlaDate(),
  round: (v: any) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
  },
  fmtUSD: (v: number) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  fmtBS: (v: number) => 'Bs. ' + Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  fmtFecha: (f: string) => {
    if (!f) return '-';
    const datePart = f.includes('T') ? f.split('T')[0] : f;
    const p = datePart.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  },
  metodoLabel: (m: string) => {
    const map: Record<string, string> = { 
      efectivo_usd: 'Efectivo USD', 
      efectivo_bs: 'Efectivo Bs.', 
      punto_venta: 'Punto de Venta', 
      biopago: 'Biopago',
      pagomovil: 'PagoMovil',
      zelle: 'Zelle',
      credito: 'Crédito', 
      mixto: 'Mixto' 
    };
    return map[m] || m;
  }
};
