
import { generateSaleTicket, generateReport } from './thermal-printer';

// --- Datos de Prueba ---

const sampleSale = {
  id: '000012345',
  fecha: '15/07/2024 10:30 AM',
  cliente: 'JOHN DOE',
  items: [
    { cantidad: 2, nombre: 'FILTRO ACEITE 51515', total: 24.00 },
    { cantidad: 1, nombre: 'LIGA DE FRENO DOT3 500ML', total: 8.50 },
    { cantidad: 4, nombre: 'BUJIA BKR6E-11', total: 30.00 },
  ],
  subtotal: 53.88,
  iva: 8.62,
  total: 62.50,
  totalUSD: 62.50
};

const sampleReportX = {
  fecha: '15/07/2024 05:00 PM',
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
  ]
};

const sampleReportZ = {
  ...sampleReportX,
  numeroZ: '00128',
  ventaNeta: 1450.00 // Ajustado para el ejemplo
};


// --- Generación de Strings de Tickets ---

console.log('--- TICKET DE VENTA (80mm) ---\n');
const ticket80mm = generateSaleTicket(sampleSale, '80mm');
console.log(ticket80mm);

console.log('\n\n--- TICKET DE VENTA (56mm) ---\n');
const ticket56mm = generateSaleTicket(sampleSale, '56mm');
console.log(ticket56mm);

console.log('\n\n--- REPORTE X (80mm) ---\n');
const reportX = generateReport(sampleReportX, 'X', '80mm');
console.log(reportX);

console.log('\n\n--- REPORTE Z (80mm) ---\n');
const reportZ = generateReport(sampleReportZ, 'Z', '80mm');
console.log(reportZ);

