"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { appointments, clients, financeItems, stockItems, suppliers, teamMembers, workOrders } from "@/src/domain/mock-data";

export type ClientRecord = {
  id: string;
  name: string;
  kind: "pf" | "pj";
  document: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  cep: string;
  detail: string;
  initials: string;
  tone: string;
  history: string[];
};

export type SupplierRecord = {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  category: string;
  city: string;
  state: string;
  address: string;
  cep: string;
  initials: string;
  tone: string;
};

export type AppointmentRecord = (typeof appointments)[number] & { clientId: string; date: string; notes: string; workOrderId?: string };
export type WorkOrderRecord = (typeof workOrders)[number] & { clientId: string; description: string; diary: Array<{ id: string; text: string; createdAt: string }>; materialLines: Array<{ stockId: string; quantity: number }> };
export type FinanceRecord = (typeof financeItems)[number] & { originId?: string; category: string; paidAt?: string };
export type StockRecord = (typeof stockItems)[number] & { costCents: number };
export type TeamRecord = (typeof teamMembers)[number] & { email: string };
export type InvitationRecord = { id: string; email: string; role: string; kind: "owner" | "team"; status: "pending" | "accepted" | "expired"; createdAt: string; expiresAt: string };

type DemoState = {
  clients: ClientRecord[];
  suppliers: SupplierRecord[];
  appointments: AppointmentRecord[];
  workOrders: WorkOrderRecord[];
  finance: FinanceRecord[];
  stock: StockRecord[];
  team: TeamRecord[];
  invitations: InvitationRecord[];
};

type DemoActions = {
  addClient: (record: Omit<ClientRecord, "id" | "detail" | "initials" | "tone" | "history">) => void;
  addSupplier: (record: Omit<SupplierRecord, "id" | "initials" | "tone">) => void;
  addAppointment: (record: Omit<AppointmentRecord, "id" | "status">) => void;
  addWorkOrder: (record: Omit<WorkOrderRecord, "id" | "status" | "updatedAt" | "diary" | "materialLines"> & { materialLines?: WorkOrderRecord["materialLines"] }) => string;
  addFinance: (record: Omit<FinanceRecord, "id" | "status">) => void;
  addStock: (record: Omit<StockRecord, "id">) => void;
  addDiary: (workOrderId: string, text: string) => void;
  closeWorkOrder: (workOrderId: string) => void;
  invite: (email: string, role: string, kind: "owner" | "team") => void;
  addTeamMember: (record: Omit<TeamRecord, "id" | "initials" | "tone">) => void;
};

const storageKey = "orquestra-one-demo-v3";
const tones = ["mint", "blue", "sand", "rose", "violet"];

function buildInitialState(): DemoState {
  return {
    clients: clients.map((client, index) => ({ ...client, kind: "pf", document: "", email: "", phone: "", city: "Sorocaba", state: "SP", address: "", cep: "", history: [client.detail], tone: client.tone ?? tones[index % tones.length] })),
    suppliers: suppliers.map((supplier, index) => ({ ...supplier, document: "", email: "", state: "SP", address: "", cep: "", tone: supplier.tone ?? tones[index % tones.length] })),
    appointments: appointments.map((appointment, index) => ({ ...appointment, clientId: `cl-${Math.min(index + 1, 4)}`, date: "2026-10-29", notes: "" })),
    workOrders: workOrders.map((order, index) => ({ ...order, clientId: `cl-${Math.min(index + 1, 4)}`, description: order.service, diary: [], materialLines: [] })),
    finance: financeItems.map((item) => ({
      ...item,
      category: item.type === "receivable" ? "Serviços" : "Operacional",
      originId: item.title === "Manutenção elétrica" ? "OS-00128" : item.title === "Instalação de luminárias" ? "OS-00126" : undefined,
    })),
    stock: stockItems.map((item, index) => ({ ...item, costCents: [1290, 890, 35990, 2790][index] ?? 0 })),
    team: teamMembers.map((member) => ({ ...member, email: `${member.name.toLowerCase().replace(/\s+/g, ".")}@empresaexemplo.com` })),
    invitations: [
      { id: "invite-1", email: "rafael.lima@empresaexemplo.com", role: "Profissional", kind: "team", status: "pending", createdAt: "Hoje, 09:10", expiresAt: "05 nov 2026" },
    ],
  };
}

const DemoDataContext = createContext<(DemoState & DemoActions) | null>(null);

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "ON";
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(buildInitialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setState(JSON.parse(saved) as DemoState);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<DemoState & DemoActions>(() => ({
    ...state,
    addClient: (record) => setState((previous) => ({ ...previous, clients: [{ ...record, id: id("cl"), detail: "Novo cadastro", initials: initials(record.name), tone: tones[previous.clients.length % tones.length], history: ["Cadastro criado agora"] }, ...previous.clients] })),
    addSupplier: (record) => setState((previous) => ({ ...previous, suppliers: [{ ...record, id: id("fo"), initials: initials(record.name), tone: tones[previous.suppliers.length % tones.length] }, ...previous.suppliers] })),
    addAppointment: (record) => setState((previous) => ({ ...previous, appointments: [{ ...record, id: id("ag"), status: "pending" }, ...previous.appointments] })),
    addWorkOrder: (record) => {
      const nextId = `OS-${String(129 + state.workOrders.length).padStart(5, "0")}`;
      setState((previous) => ({ ...previous, workOrders: [{ ...record, id: nextId, status: "in_progress", updatedAt: "Criada agora", diary: [], materialLines: record.materialLines ?? [] }, ...previous.workOrders] }));
      return nextId;
    },
    addFinance: (record) => setState((previous) => ({ ...previous, finance: [{ ...record, id: id("fin"), status: "open" }, ...previous.finance] })),
    addStock: (record) => setState((previous) => ({ ...previous, stock: [{ ...record, id: id("st") }, ...previous.stock] })),
    addDiary: (workOrderId, text) => setState((previous) => ({ ...previous, workOrders: previous.workOrders.map((order) => order.id === workOrderId ? { ...order, updatedAt: "Diário atualizado agora", diary: [{ id: id("diary"), text, createdAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()) }, ...order.diary] } : order) })),
    closeWorkOrder: (workOrderId) => setState((previous) => {
      const order = previous.workOrders.find((item) => item.id === workOrderId);
      if (!order || order.status === "completed") return previous;
      const financeExists = previous.finance.some((item) => item.originId === order.id);
      const stock = previous.stock.map((item) => {
        const line = order.materialLines.find((material) => material.stockId === item.id);
        return line ? { ...item, quantity: Math.max(0, item.quantity - line.quantity) } : item;
      });
      const clientName = previous.clients.find((client) => client.id === order.clientId)?.name ?? order.client;
      return {
        ...previous,
        stock,
        workOrders: previous.workOrders.map((item) => item.id === order.id ? { ...item, status: "completed", updatedAt: "Fechada agora" } : item),
        finance: financeExists ? previous.finance : [{ id: id("fin"), title: order.service, party: clientName, dueDate: "A definir", amountCents: order.amountCents, type: "receivable", status: "open", originId: order.id, category: "Serviços" }, ...previous.finance],
        clients: previous.clients.map((client) => client.id === order.clientId ? { ...client, detail: `OS ${order.id} concluída agora`, history: [`Fechamento da ${order.id}: ${order.service}`, ...client.history] } : client),
      };
    }),
    invite: (email, role, kind) => setState((previous) => ({ ...previous, invitations: [{ id: id("invite"), email, role, kind, status: "pending", createdAt: "Agora", expiresAt: "Em 7 dias" }, ...previous.invitations] })),
    addTeamMember: (record) => setState((previous) => ({ ...previous, team: [{ ...record, id: id("tm"), initials: initials(record.name), tone: tones[previous.team.length % tones.length] }, ...previous.team] })),
  }), [state]);

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

export function useDemoData() {
  const value = useContext(DemoDataContext);
  if (!value) throw new Error("useDemoData must be used within DemoDataProvider");
  return value;
}
