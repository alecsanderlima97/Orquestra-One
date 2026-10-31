"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { accessSummary } from "@/src/lib/roles";
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

export type AppointmentCadence = "single" | "daily" | "weekdays" | "weekly";
export type AppointmentRecord = (typeof appointments)[number] & { clientId: string; date: string; endDate?: string; cadence?: AppointmentCadence; seriesId?: string; notes: string; workOrderId?: string };
export type AppointmentPatch = Partial<Pick<AppointmentRecord, "date" | "time" | "duration" | "endDate" | "status" | "professional" | "notes" | "workOrderId">>;
export type DescriptionRevision = { id: string; text: string; createdAt: string };
export type WorkOrderRecord = (typeof workOrders)[number] & { clientId: string; description: string; descriptionHistory?: DescriptionRevision[]; diary: Array<{ id: string; text: string; createdAt: string }>; materialLines: Array<{ stockId: string; quantity: number }> };
export type FinanceRecord = (typeof financeItems)[number] & { originId?: string; category: string; paidAt?: string };
export type StockRecord = (typeof stockItems)[number] & { costCents: number };
export type TeamRecord = (typeof teamMembers)[number] & { email: string; active?: boolean };
export type StockMovement = { id: string; stockId: string; delta: number; reason: string; createdAt: string };
export type InvitationRecord = { id: string; email: string; role: string; kind: "owner" | "team"; status: "pending" | "accepted" | "expired" | "revoked"; createdAt: string; expiresAt: string };

type DemoState = {
  clients: ClientRecord[];
  suppliers: SupplierRecord[];
  appointments: AppointmentRecord[];
  workOrders: WorkOrderRecord[];
  finance: FinanceRecord[];
  stock: StockRecord[];
  team: TeamRecord[];
  invitations: InvitationRecord[];
  stockMovements: StockMovement[];
};

type DemoActions = {
  addClient: (record: Omit<ClientRecord, "id" | "detail" | "initials" | "tone" | "history">) => void;
  addSupplier: (record: Omit<SupplierRecord, "id" | "initials" | "tone">) => void;
  addAppointment: (record: Omit<AppointmentRecord, "id" | "status">) => void;
  addAppointments: (records: Array<Omit<AppointmentRecord, "id" | "status">>) => void;
  updateAppointment: (appointmentId: string, patch: AppointmentPatch) => void;
  removeAppointment: (appointmentId: string) => void;
  addWorkOrder: (record: Omit<WorkOrderRecord, "id" | "status" | "updatedAt" | "diary" | "materialLines"> & { materialLines?: WorkOrderRecord["materialLines"] }) => string;
  addFinance: (record: Omit<FinanceRecord, "id" | "status">) => void;
  markFinancePaid: (financeId: string, paid: boolean) => void;
  setFinanceDueDate: (financeId: string, dueDate: string) => void;
  setWorkOrderStatus: (workOrderId: string, status: "in_progress" | "waiting") => void;
  addStock: (record: Omit<StockRecord, "id">) => void;
  addDiary: (workOrderId: string, text: string) => void;
  reviseWorkOrderDescription: (workOrderId: string, text: string) => void;
  closeWorkOrder: (workOrderId: string) => void;
  invite: (email: string, role: string, kind: "owner" | "team") => void;
  addTeamMember: (record: Omit<TeamRecord, "id" | "initials" | "tone">) => void;
  updateClient: (clientId: string, patch: Partial<Omit<ClientRecord, "id" | "initials" | "tone" | "history" | "detail">>) => void;
  removeClient: (clientId: string) => void;
  updateSupplier: (supplierId: string, patch: Partial<Omit<SupplierRecord, "id" | "initials" | "tone">>) => void;
  removeSupplier: (supplierId: string) => void;
  updateWorkOrder: (workOrderId: string, patch: Partial<Pick<WorkOrderRecord, "service" | "amountCents" | "professional">>) => void;
  removeWorkOrder: (workOrderId: string) => void;
  addOrderMaterial: (workOrderId: string, stockId: string, quantity: number) => void;
  removeOrderMaterial: (workOrderId: string, stockId: string) => void;
  updateFinance: (financeId: string, patch: Partial<Pick<FinanceRecord, "title" | "party" | "amountCents" | "dueDate" | "category" | "type">>) => void;
  removeFinance: (financeId: string) => void;
  updateStock: (stockId: string, patch: Partial<Omit<StockRecord, "id">>) => void;
  removeStock: (stockId: string) => void;
  adjustStock: (stockId: string, delta: number, reason: string, purchase?: { costCents?: number; party?: string; dueDate?: string }) => void;
  updateTeamMember: (memberId: string, patch: Partial<Pick<TeamRecord, "name" | "email" | "role" | "access" | "active">>) => void;
  removeTeamMember: (memberId: string) => void;
  resendInvite: (inviteId: string) => void;
  revokeInvite: (inviteId: string) => void;
  acceptInvite: (inviteId: string) => void;
};

const storageKey = "orquestra-one-demo-v5";
const tones = ["mint", "blue", "sand", "rose", "violet"];

function buildInitialState(): DemoState {
  return {
    clients: clients.map((client, index) => ({ ...client, kind: "pf", document: "", email: `${client.name.toLowerCase().replace(/\\s+/g, ".")}@exemplo.com`, phone: ["(15) 99847-8705", "(15) 99711-2400", "(15) 99620-1188", "(15) 99140-2233"][index] ?? "", city: "Sorocaba", state: "SP", address: "", cep: "", history: [client.detail], tone: client.tone ?? tones[index % tones.length] })),
    suppliers: suppliers.map((supplier, index) => ({ ...supplier, document: "", email: "", state: "SP", address: "", cep: "", tone: supplier.tone ?? tones[index % tones.length] })),
    appointments: appointments.map((appointment, index) => ({ ...appointment, clientId: `cl-${Math.min(index + 1, 4)}`, date: "2026-10-29", endDate: "2026-10-29", cadence: "single", notes: "", workOrderId: ["OS-00128", "OS-00126", "OS-00127", ""][index] || undefined })),
    workOrders: workOrders.map((order, index) => ({ ...order, clientId: `cl-${Math.min(index + 1, 4)}`, description: order.service, descriptionHistory: [{ id: `desc-${order.id}`, text: order.service, createdAt: "Descrição inicial" }], diary: [], materialLines: [] })),
    finance: financeItems.map((item) => ({
      ...item,
      category: item.type === "receivable" ? "Serviços" : "Operacional",
      originId: item.title === "Manutenção elétrica" ? "OS-00128" : item.title === "Instalação de luminárias" ? "OS-00126" : undefined,
    })),
    stock: stockItems.map((item, index) => ({ ...item, costCents: [1290, 890, 35990, 2790][index] ?? 0 })),
    team: teamMembers.map((member) => ({ ...member, email: `${member.name.toLowerCase().replace(/\s+/g, ".")}@empresaexemplo.com` })),
    stockMovements: [],
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
      if (saved) setState((current) => ({ ...current, ...(JSON.parse(saved) as Partial<DemoState>) }));
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
    addAppointments: (records) => setState((previous) => ({ ...previous, appointments: [...records.map((record) => ({ ...record, id: id("ag"), status: "pending" as const })), ...previous.appointments] })),
    updateAppointment: (appointmentId, patch) => setState((previous) => ({ ...previous, appointments: previous.appointments.map((appointment) => appointment.id === appointmentId ? { ...appointment, ...patch } : appointment) })),
    removeAppointment: (appointmentId) => setState((previous) => ({ ...previous, appointments: previous.appointments.filter((appointment) => appointment.id !== appointmentId) })),
    addWorkOrder: (record) => {
      const nextId = `OS-${String(129 + state.workOrders.length).padStart(5, "0")}`;
      setState((previous) => ({ ...previous, workOrders: [{ ...record, id: nextId, status: "in_progress", updatedAt: "Criada agora", descriptionHistory: [{ id: id("desc"), text: record.description, createdAt: "Descrição inicial" }], diary: [], materialLines: record.materialLines ?? [] }, ...previous.workOrders] }));
      return nextId;
    },
    addFinance: (record) => setState((previous) => ({ ...previous, finance: [{ ...record, id: id("fin"), status: "open" }, ...previous.finance] })),
    markFinancePaid: (financeId, paid) => setState((previous) => ({ ...previous, finance: previous.finance.map((item) => item.id === financeId ? { ...item, status: (paid ? "paid" : "open") as FinanceRecord["status"], paidAt: paid ? new Date().toISOString() : undefined } : item) })),
    setFinanceDueDate: (financeId, dueDate) => setState((previous) => ({ ...previous, finance: previous.finance.map((item) => item.id === financeId ? { ...item, dueDate } : item) })),
    setWorkOrderStatus: (workOrderId, status) => setState((previous) => ({ ...previous, workOrders: previous.workOrders.map((order) => order.id === workOrderId && order.status !== "completed" ? { ...order, status, updatedAt: status === "waiting" ? "Pausada agora" : "Retomada agora" } : order) })),
    addStock: (record) => setState((previous) => ({ ...previous, stock: [{ ...record, id: id("st") }, ...previous.stock] })),
    addDiary: (workOrderId, text) => setState((previous) => ({ ...previous, workOrders: previous.workOrders.map((order) => order.id === workOrderId ? { ...order, updatedAt: "Diário atualizado agora", diary: [{ id: id("diary"), text, createdAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()) }, ...order.diary] } : order) })),
    reviseWorkOrderDescription: (workOrderId, text) => setState((previous) => ({ ...previous, workOrders: previous.workOrders.map((order) => { if (order.id !== workOrderId || !text.trim()) return order; const history = order.descriptionHistory?.length ? order.descriptionHistory : [{ id: id("desc"), text: order.description, createdAt: "Descrição inicial" }]; return { ...order, description: text.trim(), updatedAt: "Descrição revisada agora", descriptionHistory: [{ id: id("desc"), text: text.trim(), createdAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()) }, ...history] }; }) })),
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

    updateClient: (clientId, patch) => setState((previous) => {
      const nameChanged = typeof patch.name === "string" && patch.name.trim();
      return {
        ...previous,
        clients: previous.clients.map((client) => client.id === clientId ? { ...client, ...patch, ...(nameChanged ? { initials: initials(patch.name as string) } : {}) } : client),
        workOrders: nameChanged ? previous.workOrders.map((order) => order.clientId === clientId ? { ...order, client: patch.name as string } : order) : previous.workOrders,
        appointments: nameChanged ? previous.appointments.map((appointment) => appointment.clientId === clientId ? { ...appointment, client: patch.name as string } : appointment) : previous.appointments,
      };
    }),
    removeClient: (clientId) => setState((previous) => ({ ...previous, clients: previous.clients.filter((client) => client.id !== clientId) })),
    updateSupplier: (supplierId, patch) => setState((previous) => ({ ...previous, suppliers: previous.suppliers.map((supplier) => supplier.id === supplierId ? { ...supplier, ...patch, ...(patch.name?.trim() ? { initials: initials(patch.name) } : {}) } : supplier) })),
    removeSupplier: (supplierId) => setState((previous) => ({ ...previous, suppliers: previous.suppliers.filter((supplier) => supplier.id !== supplierId) })),
    updateWorkOrder: (workOrderId, patch) => setState((previous) => ({
      ...previous,
      workOrders: previous.workOrders.map((order) => order.id === workOrderId ? { ...order, ...patch, updatedAt: "Editada agora" } : order),
      finance: typeof patch.amountCents === "number" ? previous.finance.map((item) => item.originId === workOrderId && item.status !== "paid" ? { ...item, amountCents: patch.amountCents as number } : item) : previous.finance,
    })),
    removeWorkOrder: (workOrderId) => setState((previous) => ({
      ...previous,
      workOrders: previous.workOrders.filter((order) => order.id !== workOrderId || order.status === "completed"),
      appointments: previous.appointments.map((appointment) => appointment.workOrderId === workOrderId ? { ...appointment, workOrderId: "" } : appointment),
    })),
    addOrderMaterial: (workOrderId, stockId, quantity) => setState((previous) => ({
      ...previous,
      workOrders: previous.workOrders.map((order) => {
        if (order.id !== workOrderId || order.status === "completed" || quantity <= 0) return order;
        const existing = order.materialLines.find((line) => line.stockId === stockId);
        const materialLines = existing ? order.materialLines.map((line) => line.stockId === stockId ? { ...line, quantity: line.quantity + quantity } : line) : [...order.materialLines, { stockId, quantity }];
        return { ...order, materialLines, updatedAt: "Materiais atualizados agora" };
      }),
    })),
    removeOrderMaterial: (workOrderId, stockId) => setState((previous) => ({
      ...previous,
      workOrders: previous.workOrders.map((order) => order.id === workOrderId && order.status !== "completed" ? { ...order, materialLines: order.materialLines.filter((line) => line.stockId !== stockId), updatedAt: "Materiais atualizados agora" } : order),
    })),
    updateFinance: (financeId, patch) => setState((previous) => ({ ...previous, finance: previous.finance.map((item) => item.id === financeId ? { ...item, ...patch } : item) })),
    removeFinance: (financeId) => setState((previous) => ({ ...previous, finance: previous.finance.filter((item) => item.id !== financeId) })),
    updateStock: (stockId, patch) => setState((previous) => ({ ...previous, stock: previous.stock.map((item) => item.id === stockId ? { ...item, ...patch } : item) })),
    removeStock: (stockId) => setState((previous) => ({
      ...previous,
      stock: previous.stock.filter((item) => item.id !== stockId),
      stockMovements: (previous.stockMovements ?? []).filter((movement) => movement.stockId !== stockId),
      workOrders: previous.workOrders.map((order) => order.status === "completed" ? order : { ...order, materialLines: order.materialLines.filter((line) => line.stockId !== stockId) }),
    })),
    adjustStock: (stockId, delta, reason, purchase) => setState((previous) => {
      const item = previous.stock.find((entry) => entry.id === stockId);
      if (!item || !Number.isFinite(delta) || delta === 0) return previous;
      const quantity = Math.max(0, Math.round((item.quantity + delta) * 1000) / 1000);
      const applied = quantity - item.quantity;
      const costCents = delta > 0 && purchase?.costCents ? purchase.costCents : item.costCents;
      const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
      const payable = delta > 0 && purchase?.party !== undefined && purchase.costCents ? [{ id: id("fin"), title: `Compra: ${item.name}`, party: purchase.party || "Fornecedor", dueDate: purchase.dueDate || "A definir", amountCents: Math.round(purchase.costCents * delta), type: "payable" as const, status: "open" as const, category: "Materiais" }] : [];
      return {
        ...previous,
        stock: previous.stock.map((entry) => entry.id === stockId ? { ...entry, quantity, costCents } : entry),
        stockMovements: [{ id: id("mv"), stockId, delta: applied, reason: reason.trim() || (delta > 0 ? "Entrada" : "Saída"), createdAt }, ...(previous.stockMovements ?? [])].slice(0, 500),
        finance: [...payable, ...previous.finance],
      };
    }),
    updateTeamMember: (memberId, patch) => setState((previous) => ({ ...previous, team: previous.team.map((member) => member.id === memberId ? { ...member, ...patch, ...(patch.name?.trim() ? { initials: initials(patch.name) } : {}) } : member) })),
    removeTeamMember: (memberId) => setState((previous) => ({ ...previous, team: previous.team.filter((member) => member.id !== memberId || member.role === "Proprietário") })),
    resendInvite: (inviteId) => setState((previous) => ({ ...previous, invitations: previous.invitations.map((invite) => invite.id === inviteId ? { ...invite, status: "pending", createdAt: "Reenviado agora", expiresAt: "Em 7 dias" } : invite) })),
    revokeInvite: (inviteId) => setState((previous) => ({ ...previous, invitations: previous.invitations.map((invite) => invite.id === inviteId ? { ...invite, status: "revoked" } : invite) })),
    acceptInvite: (inviteId) => setState((previous) => {
      const invite = previous.invitations.find((item) => item.id === inviteId);
      if (!invite || invite.status !== "pending") return previous;
      const name = invite.email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") || invite.email;
      const already = previous.team.some((member) => member.email.toLowerCase() === invite.email.toLowerCase());
      return {
        ...previous,
        invitations: previous.invitations.map((item) => item.id === inviteId ? { ...item, status: "accepted" } : item),
        team: already ? previous.team : [{ id: id("tm"), name, email: invite.email, role: invite.role, access: accessSummary(invite.role), active: true, initials: initials(name), tone: tones[previous.team.length % tones.length] }, ...previous.team],
      };
    }),
  }), [state]);

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

export function useDemoData() {
  const value = useContext(DemoDataContext);
  if (!value) throw new Error("useDemoData must be used within DemoDataProvider");
  return value;
}
