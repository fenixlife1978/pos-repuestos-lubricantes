import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import app from '@/lib/firebase';

export async function migrarEstructura() {
  const db = getFirestore(app);
  const resultados = {
    config: 0,
    catalogos: 0,
    inventario: 0,
    ventas: 0,
    movimientos: 0,
    terminales: 0,
    proveedores: 0,
    devoluciones: 0
  };

  try {
    const stateRef = doc(db, 'data', 'state');
    const stateDoc = await getDoc(stateRef);
    
    if (!stateDoc.exists()) {
      throw new Error('Documento state no encontrado');
    }
    
    const data = stateDoc.data();
    console.log('📊 Datos encontrados:', Object.keys(data).length, 'campos');

    await setDoc(doc(db, 'config', 'general'), {
      acumuladoHistorico: data.acumuladoHistorico || 0,
      pinDevolucion: data.pinDevolucion || '123456',
      proximaDevolucion: data.proximaDevolucion || 1,
      proximoRecibo: data.proximoRecibo || 1,
      tasa: data.tasa || 0,
      ultimoZ: data.ultimoZ || 0,
      empresa: data.empresa || {}
    });
    resultados.config = 1;

    await setDoc(doc(db, 'catalogos', 'categorias'), { lista: data.categorias || [] });
    await setDoc(doc(db, 'catalogos', 'departamentos'), { lista: data.departamentos || [] });
    await setDoc(doc(db, 'catalogos', 'marcas'), { lista: data.marcas || [] });
    await setDoc(doc(db, 'catalogos', 'presentaciones'), { lista: data.presentaciones || [] });
    resultados.catalogos = 4;

    if (data.productos && Array.isArray(data.productos)) {
      const batch = [];
      data.productos.forEach((producto, index) => {
        const id = producto.id || `prod_${index}`;
        batch.push(setDoc(doc(db, 'inventario', id), producto));
      });
      await Promise.all(batch);
      resultados.inventario = data.productos.length;
    }

    if (data.ventas && Array.isArray(data.ventas)) {
      const batch = [];
      data.ventas.forEach((venta) => {
        const id = venta.id || `venta_${Date.now()}_${Math.random()}`;
        batch.push(setDoc(doc(db, 'ventas', id), venta));
      });
      await Promise.all(batch);
      resultados.ventas = data.ventas.length;
    }

    if (data.movimientos && Array.isArray(data.movimientos)) {
      const batch = [];
      data.movimientos.forEach((mov) => {
        const id = mov.id || `mov_${Date.now()}_${Math.random()}`;
        batch.push(setDoc(doc(db, 'movimientos', id), mov));
      });
      await Promise.all(batch);
      resultados.movimientos = data.movimientos.length;
    }

    if (data.terminales && Array.isArray(data.terminales)) {
      const batch = [];
      data.terminales.forEach((term) => {
        const id = term.id || `term_${Date.now()}_${Math.random()}`;
        batch.push(setDoc(doc(db, 'terminales', id), term));
      });
      await Promise.all(batch);
      resultados.terminales = data.terminales.length;
    }

    if (data.proveedores && Array.isArray(data.proveedores)) {
      const batch = [];
      data.proveedores.forEach((prov) => {
        const id = prov.id || `prov_${Date.now()}_${Math.random()}`;
        batch.push(setDoc(doc(db, 'proveedores', id), prov));
      });
      await Promise.all(batch);
      resultados.proveedores = data.proveedores.length;
    }

    if (data.devoluciones && Array.isArray(data.devoluciones)) {
      const batch = [];
      data.devoluciones.forEach((dev) => {
        const id = dev.id || `dev_${Date.now()}_${Math.random()}`;
        batch.push(setDoc(doc(db, 'devoluciones', id), dev));
      });
      await Promise.all(batch);
      resultados.devoluciones = data.devoluciones.length;
    }

    return { success: true, resultados };
  } catch (error) {
    console.error('❌ Error en migración:', error);
    return { success: false, error: String(error) };
  }
}
