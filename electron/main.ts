
import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

// Función para manejar la lógica de impresión
async function handlePrintTicket(_event: IpcMainInvokeEvent, ticketString: string) {
  // Configura tu impresora. Es crucial que el "type" y la "interface" sean correctos.
  // Ejemplo para una impresora Epson TM-T20 en red:
  // const printer = new ThermalPrinter({
  //   type: PrinterTypes.EPSON,
  //   interface: 'tcp://192.168.1.123:9100',
  //   characterSet: CharacterSet.PC852_LATIN2
  // });

  // Ejemplo para una impresora conectada por USB (más común en Windows)
  // Reemplaza 'POS-80' con el nombre de tu impresora como aparece en Windows.
  const printer = new ThermalPrinter({
    type: PrinterTypes.STAR, // O EPSON, o el que corresponda
    interface: 'printer:POS-80', // SINTAXIS: 'printer:NOMBRE_IMPRESORA'
    characterSet: CharacterSet.PC852_LATIN2,
    breakLine: BreakLine.WORD, // Ayuda a prevenir cortes de palabras
    driver: require('node-thermal-printer/drivers/windows') // Driver específico para Windows
  });

  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error('Impresora no conectada o nombre incorrecto.');
    }

    // El string ya viene formateado, solo necesitamos añadirlo y ejecutar.
    printer.clear();
    printer.append(ticketString); // Añade el string tal cual
    
    const execute = await printer.execute();
    console.log('Impresión completada:', execute);
    
    return { success: true };

  } catch (error: any) {
    console.error("Error de impresión en el proceso principal:", error);
    return { success: false, error: error.message };
  }
}

// Cuando Electron esté listo
app.whenReady().then(() => {
  // Crear la ventana, etc...
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        // __dirname apunta al directorio actual del archivo (electron/ en este caso)
        // process.cwd() apunta a la raíz del proyecto
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('path/to/your/index.html');

  // Escuchar por el evento 'print-ticket' desde el proceso de renderizado
  ipcMain.handle('print-ticket', handlePrintTicket);
});

