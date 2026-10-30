import type { Appointment, FinanceItem, StockItem, WorkOrder } from "./types";

export const appointments: Appointment[] = [
  {
    id: "ag-1024",
    time: "08:00",
    duration: "2h 30",
    client: "Mariana Costa",
    service: "Manutenção elétrica",
    address: "Jardim América · Sorocaba",
    status: "in_progress",
    professional: "Você",
  },
  {
    id: "ag-1025",
    time: "10:45",
    duration: "1h 30",
    client: "Eduardo Nunes",
    service: "Instalação de luminárias",
    address: "Vila Hortência · Sorocaba",
    status: "confirmed",
    professional: "Você",
  },
  {
    id: "ag-1026",
    time: "14:00",
    duration: "3h",
    client: "Clínica Essenza",
    service: "Adequação de quadro",
    address: "Centro · Sorocaba",
    status: "confirmed",
    professional: "Rafael Lima",
  },
  {
    id: "ag-1027",
    time: "17:30",
    duration: "1h",
    client: "Paulo Mendes",
    service: "Visita técnica",
    address: "Wanel Ville · Sorocaba",
    status: "pending",
    professional: "Você",
  },
];

export const workOrders: WorkOrder[] = [
  { id: "OS-00128", client: "Mariana Costa", service: "Manutenção elétrica", professional: "Você", amountCents: 128000, status: "in_progress", updatedAt: "Atualizada há 18 min" },
  { id: "OS-00127", client: "Clínica Essenza", service: "Adequação de quadro", professional: "Rafael Lima", amountCents: 345000, status: "waiting", updatedAt: "Aguardando aprovação" },
  { id: "OS-00126", client: "Eduardo Nunes", service: "Instalação de luminárias", professional: "Você", amountCents: 89000, status: "in_progress", updatedAt: "Atualizada ontem" },
  { id: "OS-00125", client: "Ana Beatriz", service: "Revisão de tomadas", professional: "Você", amountCents: 64000, status: "completed", updatedAt: "Concluída em 28 out" },
];

export const financeItems: FinanceItem[] = [
  { id: "fin-1", title: "Manutenção elétrica", party: "Mariana Costa", dueDate: "Hoje", amountCents: 128000, type: "receivable", status: "open" },
  { id: "fin-2", title: "Materiais elétricos", party: "EletroMix", dueDate: "Amanhã", amountCents: 43800, type: "payable", status: "open" },
  { id: "fin-3", title: "Instalação de luminárias", party: "Eduardo Nunes", dueDate: "31 out", amountCents: 89000, type: "receivable", status: "open" },
  { id: "fin-4", title: "Combustível", party: "Posto Avenida", dueDate: "28 out", amountCents: 18640, type: "payable", status: "paid" },
];

export const stockItems: StockItem[] = [
  { id: "st-1", name: "Cabo flexível 2,5 mm", category: "consumable", quantity: 42, unit: "m", minimum: 30, location: "Almoxarifado" },
  { id: "st-2", name: "Lâmpada LED 9W", category: "resale", quantity: 18, unit: "un", minimum: 10, location: "Estoque principal" },
  { id: "st-3", name: "Furadeira de impacto", category: "tool", quantity: 1, unit: "un", minimum: 1, location: "Com você" },
  { id: "st-4", name: "Disjuntor bipolar  joh 25A", category: "consumable", quantity: 4, unit: "un", minimum: 8, location: "Estoque principal" },
];

export const clients = [
  { id: "cl-1", name: "Mariana Costa", detail: "4 serviços · Último em hoje", initials: "MC", tone: "mint" },
  { id: "cl-2", name: "Clínica Essenza", detail: "2 serviços · Último em 14 out", initials: "CE", tone: "sand" },
  { id: "cl-3", name: "Eduardo Nunes", detail: "3 serviços · Último em 22 out", initials: "EN", tone: "blue" },
  { id: "cl-4", name: "Ana Beatriz", detail: "1 serviço · Último em 28 out", initials: "AB", tone: "rose" },
];

export const suppliers = [
  { id: "fo-1", name: "Casa das Tintas", category: "Materiais", city: "São Paulo", phone: "(11) 4003-4022", initials: "CT", tone: "orange" },
  { id: "fo-2", name: "Distribuidora Elétrica", category: "Elétrica", city: "São Paulo", phone: "(11) 3214-5566", initials: "DE", tone: "mint" },
  { id: "fo-3", name: "Auto Peças Silva", category: "Peças", city: "Sorocaba", phone: "(15) 3344-7788", initials: "AS", tone: "blue" },
  { id: "fo-4", name: "Depósito Construção", category: "Construção", city: "Guarulhos", phone: "(11) 3565-9000", initials: "DC", tone: "violet" },
];

export const teamMembers = [
  { id: "tm-1", name: "Marcos Silva", role: "Proprietário", access: "Acesso total", initials: "MS", tone: "mint" },
  { id: "tm-2", name: "João Pedro", role: "Profissional", access: "Agenda e serviços", initials: "JP", tone: "blue" },
  { id: "tm-3", name: "Ana Costa", role: "Financeiro", access: "Financeiro e relatórios", initials: "AC", tone: "sand" },
  { id: "tm-4", name: "Carlos Lima", role: "Auxiliar", access: "Serviços atribuídos", initials: "CL", tone: "rose" },
];

export const centralTenants = [
  { id: "tenant-1", name: "Marcos Silva Serviços", segment: "Elétrica residencial", plan: "Profissional", monthlyFeeCents: 9900, users: 3, accessStatus: "Ativo", billingStatus: "Em dia", since: "18 out 2026", initials: "MS", tone: "mint" },
  { id: "tenant-2", name: "Clínica Essenza", segment: "Manutenção predial", plan: "Equipe", monthlyFeeCents: 19900, users: 8, accessStatus: "Ativo", billingStatus: "Em dia", since: "12 out 2026", initials: "CE", tone: "blue" },
  { id: "tenant-3", name: "Ana Souza Reformas", segment: "Pintura e reformas", plan: "Profissional", monthlyFeeCents: 9900, users: 2, accessStatus: "Em tolerância", billingStatus: "Vencida", since: "03 out 2026", initials: "AS", tone: "sand" },
  { id: "tenant-4", name: "Oficina Silva", segment: "Mecânica automotiva", plan: "Equipe", monthlyFeeCents: 19900, users: 5, accessStatus: "Ativo", billingStatus: "Em dia", since: "27 set 2026", initials: "OS", tone: "violet" },
  { id: "tenant-5", name: "Paulo Mendes", segment: "Instalações", plan: "Essencial", monthlyFeeCents: 4900, users: 1, accessStatus: "Bloqueado", billingStatus: "Vencida", since: "19 set 2026", initials: "PM", tone: "rose" },
];

export const centralAudit = [
  { id: "audit-1", action: "Acesso liberado", subject: "Clínica Essenza", actor: "Orquestra Admin", time: "Hoje, 09:42", tone: "mint" },
  { id: "audit-2", action: "Plano alterado", subject: "Oficina Silva", actor: "Alecsander Lima", time: "Ontem, 17:18", tone: "blue" },
  { id: "audit-3", action: "Cobrança marcada em tolerância", subject: "Ana Souza Reformas", actor: "Sistema", time: "Ontem, 08:05", tone: "sand" },
  { id: "audit-4", action: "Novo tenant criado", subject: "Marcos Silva Serviços", actor: "Portal Orquestra.cs", time: "28 out, 14:20", tone: "violet" },
];
