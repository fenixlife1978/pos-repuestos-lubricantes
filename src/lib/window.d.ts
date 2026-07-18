export {};

declare global {
  interface Window {
    electronAPI?: {
      printTicket: (ticketString: string) => Promise<{ success: boolean; error?: string }>;
      getAppVersion: () => Promise<string>;
    };
  }
}
