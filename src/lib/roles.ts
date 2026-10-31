export type PermissionArea = "agenda" | "orders" | "finance" | "stock" | "clients" | "suppliers" | "reports" | "team";
export type AccessLevel = "none" | "view" | "edit";

export const PERMISSION_AREAS: Array<{ id: PermissionArea; label: string }> = [
  { id: "agenda", label: "Agenda" },
  { id: "orders", label: "Ordens de serviço" },
  { id: "finance", label: "Financeiro" },
  { id: "stock", label: "Estoque" },
  { id: "clients", label: "Clientes" },
  { id: "suppliers", label: "Fornecedores" },
  { id: "reports", label: "Relatórios" },
  { id: "team", label: "Equipe" },
];

export type RolePreset = { summary: string; description: string; access: Record<PermissionArea, AccessLevel> };

export const ROLE_PRESETS: Record<string, RolePreset> = {
  Proprietário: {
    summary: "Acesso total",
    description: "Dono da empresa no sistema. Vê e altera tudo, convida e remove pessoas. Só existe um por empresa.",
    access: { agenda: "edit", orders: "edit", finance: "edit", stock: "edit", clients: "edit", suppliers: "edit", reports: "edit", team: "edit" },
  },
  Administrador: {
    summary: "Gestão completa",
    description: "Braço direito do dono: opera todas as áreas e gerencia a equipe, menos o proprietário.",
    access: { agenda: "edit", orders: "edit", finance: "edit", stock: "edit", clients: "edit", suppliers: "edit", reports: "edit", team: "edit" },
  },
  Financeiro: {
    summary: "Financeiro e relatórios",
    description: "Cuida de cobranças, contas a pagar e relatórios. Consulta ordens, clientes e agenda.",
    access: { agenda: "view", orders: "view", finance: "edit", stock: "view", clients: "view", suppliers: "edit", reports: "edit", team: "none" },
  },
  Profissional: {
    summary: "Agenda e serviços",
    description: "Executa os serviços: agenda, ordens e diário. Consulta clientes e estoque.",
    access: { agenda: "edit", orders: "edit", finance: "none", stock: "view", clients: "view", suppliers: "none", reports: "none", team: "none" },
  },
  Auxiliar: {
    summary: "Serviços atribuídos",
    description: "Ajuda na execução: registra no diário das ordens atribuídas e consulta a agenda.",
    access: { agenda: "view", orders: "edit", finance: "none", stock: "view", clients: "none", suppliers: "none", reports: "none", team: "none" },
  },
  Visualizador: {
    summary: "Somente consulta",
    description: "Apenas olha: não cria nem altera nada. Não vê a equipe.",
    access: { agenda: "view", orders: "view", finance: "view", stock: "view", clients: "view", suppliers: "view", reports: "view", team: "none" },
  },
};

export const ROLE_NAMES = Object.keys(ROLE_PRESETS);
export const INVITABLE_ROLES = ROLE_NAMES.filter((role) => role !== "Proprietário");

export function accessSummary(role: string) {
  return ROLE_PRESETS[role]?.summary ?? "Acesso personalizado";
}

export const ACCESS_LABEL: Record<AccessLevel, string> = { none: "Sem acesso", view: "Só consulta", edit: "Consulta e edição" };

export function isGoogleAccount(email: string) {
  return /@(gmail|googlemail)\.com$/i.test(email.trim());
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
