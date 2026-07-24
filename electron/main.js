const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const fs = require('fs');

// ============================================================
// CONFIGURACIÓN DE IMPRESIÓN
// ============================================================
const PRINTER_CONFIG = {
  type: PrinterTypes.STAR,
  interface: 'printer:POS-80', // Ajusta al nombre de tu impresora
  characterSet: CharacterSet.PC852_LATIN2,
  breakLine: BreakLine.WORD,
  driver: require('node-thermal-printer/drivers/windows')
};

// ============================================================
// MANEJADOR DE IMPRESIÓN
// ============================================================
async function handlePrintTicket(_event, ticketString) {
  try {
    const printer = new ThermalPrinter(PRINTER_CONFIG);
    const isConnected = await printer.isPrinterConnected();

    if (!isConnected) {
      throw new Error('Impresora no conectada o nombre incorrecto.');
    }

    printer.clear();
    printer.append(ticketString);
    await printer.execute();

    console.log('✅ Impresión completada');
    return { success: true };
  } catch (error) {
    console.error('❌ Error de impresión:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// MANEJADOR DE VERSIÓN
// ============================================================
function handleGetAppVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// ============================================================
// CREACIÓN DE VENTANA PRINCIPAL
// ============================================================
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/posven-logo.png'),
  });

  // Determinar entorno
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:9002');
    win.webContents.openDevTools();
  } else {
    // Producción: cargar el archivo estático generado por Next.js
    const indexPath = path.join(__dirname, '../out/index.html');
    win.loadFile(indexPath);
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    // Permitir que la aplicación termine
  });

  return win;
}

// ============================================================
// CICLO DE VIDA DE LA APLICACIÓN
// ============================================================
app.whenReady().then(() => {
  // Registrar manejadores IPC
  ipcMain.handle('print-ticket', handlePrintTicket);
  ipcMain.handle('get-app-version', handleGetAppVersion);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================
// ACTUALIZACIONES AUTOMÁTICAS (opcional)
// ============================================================
// const { autoUpdater } = require('electron-updater');
// app.whenReady().then(() => {
//   autoUpdater.checkForUpdatesAndNotify();
// });