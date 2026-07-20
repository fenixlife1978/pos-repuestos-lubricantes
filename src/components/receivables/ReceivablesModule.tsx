"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, HandCoins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Store } from '@/lib/db-store';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from '@/hooks/use-toast';

// Modelo para la visualización
interface Receivable {
  id: string;
  customerId: string;
  customerName: string;
  customerCedula: string;
  totalBS: number;
  paid: number;
  balance: number;
  status: string;
}

// Modelo de datos real en el Store
interface Debt {
  id: string;
  fecha: string;
  fechaVencimiento: string;
  cliente: string;
  montoUSD: number;
  abonadoUSD: number;
  saldoUSD: number;
  estado: 'pendiente' | 'parcial' | 'pagada';
  historialPagos: any[];
  ventaId: string;
}

export function ReceivablesModule() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const refreshData = useCallback(() => {
    const state = Store.get() || {};
    const allCustomers = (state.clientes || []) as any[];
    const allDebts = (state.cxc || []) as Debt[];
    const tasa = state.tasa || 1;

    const allReceivables: Receivable[] = allDebts.map(debt => {
        const cedulaMatch = debt.cliente.match(/\[(.*?)\]/);
        const cedula = cedulaMatch ? cedulaMatch[1] : '';
        const name = debt.cliente.replace(/\[.*?\]/, '').trim();
        const customer = allCustomers.find(c => c.cedula === cedula);
        
        return {
            id: debt.id,
            customerId: customer ? customer.id : '',
            customerName: name,
            customerCedula: cedula,
            totalBS: debt.montoUSD * tasa,
            paid: (debt.montoUSD - debt.saldoUSD) * tasa,
            balance: debt.saldoUSD * tasa,
            status: debt.estado,
        };
    });

    let displayList: Receivable[] = [...allReceivables];

    const customersInReceivables = new Set(allReceivables.map(r => r.customerId).filter(id => id));
    const customersWithoutReceivables = allCustomers.filter(
      (c) => !customersInReceivables.has(c.id)
    );

    const placeholderReceivables: Receivable[] = customersWithoutReceivables.map(
      (c) => ({
        id: `historial-${c.id}`,
        customerId: c.id,
        customerName: c.name,
        customerCedula: c.cedula,
        totalBS: 0,
        paid: 0,
        balance: 0,
        status: 'pagada',
      } as Receivable)
    );

    displayList.push(...placeholderReceivables);

    displayList.sort((a, b) => {
        if (a.customerName < b.customerName) return -1;
        if (a.customerName > b.customerName) return 1;
        if (a.id.startsWith('historial-')) return 1;
        if (b.id.startsWith('historial-')) return -1;
        return a.id.localeCompare(b.id);
    });

    setReceivables(displayList);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const totalOutstanding = receivables.reduce((acc, r) => acc + r.balance, 0);

  const filtered = receivables.filter((r: Receivable) => 
    r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.includes(searchTerm)
  );

  const handlePay = (id: string) => {
    if (id.startsWith('historial-')) return; 

    const currentState = Store.get();
    if (!currentState) return;

    const allDebts = [...(currentState.cxc || [])] as Debt[];
    const idx = allDebts.findIndex((d: Debt) => d.id === id);
    if (idx < 0) return;

    const debtToPay = allDebts[idx];
    const amountUSD = debtToPay.saldoUSD;
    debtToPay.abonadoUSD += amountUSD;
    debtToPay.saldoUSD = 0;
    debtToPay.estado = 'pagada';

    const allCusts = [...(currentState.clientes || [])] as any[];
    const cedulaMatch = debtToPay.cliente.match(/\[(.*?)\]/);
    const cedula = cedulaMatch ? cedulaMatch[1] : '';

    const cIdx = allCusts.findIndex((c: any) => c.cedula === cedula);
    if (cIdx >= 0) {
      const customerTotalDebtUSD = allDebts
        .filter(d => {
            const dCedulaMatch = d.cliente.match(/\[(.*?)\]/);
            return dCedulaMatch ? dCedulaMatch[1] === cedula : false;
        })
        .reduce((sum, d) => sum + d.saldoUSD, 0);
      allCusts[cIdx].debt = customerTotalDebtUSD;
    }

    Store.set({
        ...currentState,
        cxc: allDebts,
        clientes: allCusts,
    });
    
    refreshData();
    
    toast({ title: "Pago registrado exitosamente" });
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-primary">Cuentas por Cobrar</h2>
          <p className="text-sm text-muted-foreground">Seguimiento de ventas a crédito y pagos pendientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Por Cobrar</p>
            <p className="text-3xl font-black text-destructive">Bs. {totalOutstanding.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por cliente o factura..." 
          className="pl-9 bg-secondary/30"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="flex-1 overflow-hidden bg-card border-none shadow-xl">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="bg-secondary/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-bold">Factura / Historial</TableHead>
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Total BS</TableHead>
                <TableHead className="font-bold">Pendiente BS</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="text-right font-bold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: Receivable) => (
                <TableRow key={r.id} className="hover:bg-secondary/20">
                  <TableCell className="font-code text-xs font-bold">{r.id.startsWith('historial-') ? 'Ver Historial' : r.id}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{r.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{r.customerCedula}</p>
                  </TableCell>
                  <TableCell>Bs. {r.totalBS.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-destructive">Bs. {r.balance.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'pagada' ? "secondary" : "destructive"} className={r.status === 'pagada' ? 'bg-emerald-500/20 text-emerald-500' : ''}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.balance > 0 && (
                      <Button variant="outline" size="sm" className="gap-1 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handlePay(r.id)}>
                        <HandCoins className="w-4 h-4" /> Cobrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
