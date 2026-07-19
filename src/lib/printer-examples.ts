import { generateSaleTicket, generateReport } from './thermal-printer';

// --- Datos de Prueba ---

const storeInfo = {
  name: 'MI TIENDA POSVEN',
  address: 'Av. Principal #123, Caracas',
  rif: 'J-12345678-9',
  phone: '0412-1234567'
};

const sampleSale = {
  id: '000012345',
  terminal: 'CAJA-01',
  cliente: {
    id: 'V-12345678',
    name: 'JOHN DOE'
  },
  items: [
    { cantidad: 2, nombre: 'FILTRO ACEITE 51515', precio: 12.00, total: 24.00 },
    { cantidad: 1, nombre: 'LIGA DE FRENO DOT3 500ML', precio: 8.50, total: 8.50 },
    { cantidad: 4, nombre: 'BUJIA BKR6E-11', precio: 7.50, total: 30.00 },
  ],
  subtotal: 53.88,
  iva: 8.62,
  total: 62.50
};

const sampleReportX = {
  terminal: 'CAJA-01',
  ventaBruta: 1520.75,
  descuentos: 50.25,
  devoluciones: 80.50,
  ventaNeta: 1390.00,
  baseImponible: 1200.00,
  iva: 192.00,
  igtf: 15.00,
  metodosPago: [
    { nombre: 'Efectivo USD', total: 850.00 },
    { nombre: 'Tarjeta Debito', total: 400.00 },
    { nombre: 'Zelle', total: 140.00 },
  ],
  facturasEmitidas: 45,
  notasCredito: 3,
  documentosAnulados: 2,
  ticketPromedio: 30.89
};

const sampleReportZ = {
  ...sampleReportX,
  numeroZ: '00128',
  ventaNeta: 1450.00, // Ajustado para el ejemplo
  facturasEmitidas: 48,
  notasCredito: 4,
  documentosAnulados: 3,
  ticketPromedio: 30.21
};

// --- Generación de Strings de Tickets ---

console.log('--- TICKET DE VENTA (80mm) ---\n');
const ticket80mm = generateSaleTicket(sampleSale, storeInfo, '80mm');
console.log(ticket80mm);

console.log('\n\n--- TICKET DE VENTA (56mm) ---\n');
const ticket56mm = generateSaleTicket(sampleSale, storeInfo, '56mm');
console.log(ticket56mm);

console.log('\n\n--- REPORTE X (80mm) ---\n');
const reportX = generateReport(sampleReportX, storeInfo, 'X', '80mm');
console.log(reportX);

console.log('\n\n--- REPORTE Z (80mm) ---\n');
const reportZ = generateReport(sampleReportZ, storeInfo, 'Z', '80mm');
console.log(reportZ);