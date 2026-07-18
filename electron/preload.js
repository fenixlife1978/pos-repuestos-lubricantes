
const { contextBridge, ipcRenderer } = require('electron');

// Exponer de forma segura las APIs del proceso principal al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Envía el string del ticket al proceso principal para su impresión.
   * @param {string} ticketString - El ticket formateado como un solo string.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  printTicket: (ticketString) => ipcRenderer.invoke('print-ticket', ticketString),

  /**
   * Obtiene la versión de la aplicación desde el package.json
   * @returns {Promise<string>}
   */
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

