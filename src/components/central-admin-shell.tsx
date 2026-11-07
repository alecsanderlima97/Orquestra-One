"use client";

import { createContext, useCallback, useContext, useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronRight,
  CircleDollarSign,
  FileClock,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { formatBRL } from "@/src/domain/money";

type Tenant = { id: string; name: string; segment: string; plan: string; monthlyFeeCents: number; maxUsers?: number | null; users: number; accessStatus: string; billingStatus: string; since: string; initials: string; tone: string; ownerEmail?: string; ownerPending?: boolean };
type AuditEntry = { id: string; action: string; subject: string; actor: string; time: string; tone: string };
const AdminDataContext = createContext<{ tenants: Tenant[]; audit: AuditEntry[]; reload: () => Promise<void> }>({ tenants: [], audit: [], reload: async () => undefined });
const useAdmin = () => useContext(AdminDataContext);

type AdminSection = "overview" | "tenants" | "billing" | "audit";

const adminNavigation: Array<{ id: AdminSection; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "tenants", label: "Clientes e tenants", icon: Building2 },
  { id: "billing", label: "Planos e cobrança", icon: WalletCards },
  { id: "audit", label: "Auditoria", icon: FileClock },
];

function adminStatusClass(value: string) {
  if (value === "Ativo" || value === "Em dia") return "admin-status-good";
  if (value === "Em tolerância") return "admin-status-warn";
  return "admin-status-bad";
}

function AdminStatus({ value }: { value: string }) {
  return <span className={`admin-status ${adminStatusClass(value)}`}><span />{value}</span>;
}

export function CentralAdminShell() {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [selectedId, setSelectedId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadError, setLoadError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/central/companies", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { tenants: Tenant[]; audit: AuditEntry[] };
      setTenants(result.tenants);
      setAudit(result.audit);
      setLoadError("");
    } catch {
      setLoadError("Não foi possível carregar as empresas agora.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedId) ?? tenants[0];

  return <AdminDataContext.Provider value={{ tenants, audit, reload: load }}><main className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark"><i /><i /><i /></span><span>orquestra<strong>. central</strong></span></div><div className="admin-context"><ShieldCheck size={16} /><span><strong>Central Admin</strong><small>Ambiente de desenvolvimento</small></span></div><p className="admin-nav-label">Gestão da plataforma</p><nav className="admin-nav">{adminNavigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={activeSection === id ? "admin-nav-active" : ""} onClick={() => setActiveSection(id)}><Icon size={17} /><span>{label}</span>{id === "tenants" && <em>{tenants.length}</em>}</button>)}</nav><div className="admin-sidebar-spacer" /><div className="admin-integrity"><Activity size={15} /><span><strong>Sistema saudável</strong><small>{tenants.length} empresa(s) cadastrada(s)</small></span></div><a className="admin-back-link" href="/"><ChevronRight size={15} /> Abrir Orquestra One</a><div className="admin-footer"><Settings2 size={14} /> Configurações da plataforma <LogOut size={14} /></div></aside><section className="admin-main"><header className="admin-topbar"><div className="admin-breadcrumb"><span>Orquestra.cs</span><ChevronRight size={14} /><strong>Central Admin</strong></div><div className="admin-top-actions"><label className="admin-search"><Search size={16} /><input placeholder="Buscar cliente ou serviço" aria-label="Buscar cliente ou serviço" /></label><button className="icon-button" type="button" aria-label="Notificações"><Bell size={18} /></button><span className="admin-user-avatar">AL</span><span className="admin-user-name">Alecsander</span></div></header><div className="admin-page"><div className="admin-heading"><div><p className="eyebrow">Controle da plataforma</p><h1>{activeSection === "overview" ? "Central Admin" : adminNavigation.find((item) => item.id === activeSection)?.label}</h1><p>Tenants, serviços e acesso comercial em uma visão segura.</p></div><div className="admin-heading-actions"><span className="dev-badge"><span /> Desenvolvimento</span><button className="admin-primary-button" type="button" onClick={() => setInviteOpen(true)}><Building2 size={16} /> Nova empresa</button></div></div>{loadError && <p className="dialog-error">{loadError}</p>}{activeSection === "overview" && !selectedTenant && <section className="admin-panel"><AdminPanelHeader eyebrow="Primeiros passos" title="Nenhuma empresa cadastrada" action="Nova empresa" onAction={() => setInviteOpen(true)} /><p style={{ padding: "0 20px 20px" }}>Cadastre a primeira empresa e convide o proprietário pelo Gmail dele. Cada empresa tem dados próprios e isolados.</p></section>}{activeSection === "overview" && selectedTenant && <AdminOverview selectedTenant={selectedTenant} onSelect={setSelectedId} onNavigate={setActiveSection} />}{activeSection === "tenants" && <TenantDirectory selectedId={selectedId} onSelect={setSelectedId} />}{activeSection === "billing" && <BillingView />}{activeSection === "audit" && <AuditView />}</div></section></main>{inviteOpen && <NewCompanyDialog onClose={() => setInviteOpen(false)} onCreated={() => { setInviteOpen(false); void load(); }} />}</AdminDataContext.Provider>;
}

function AdminOverview({ selectedTenant, onSelect, onNavigate }: { selectedTenant: Tenant; onSelect: (id: string) => void; onNavigate: (section: AdminSection) => void }) { const { tenants, audit } = useAdmin(); return <><section className="admin-metric-grid"><AdminMetric label="Empresas ativas" value={String(tenants.filter((tenant) => tenant.accessStatus === "Ativo").length)} detail={`${tenants.length} cadastrada(s)`} icon={Building2} tone="blue" /><AdminMetric label="MRR contratado" value={formatBRL(tenants.reduce((sum, tenant) => sum + tenant.monthlyFeeCents, 0))} detail="Soma das mensalidades" icon={CircleDollarSign} tone="mint" /><AdminMetric label="Usuários" value={String(tenants.reduce((sum, tenant) => sum + tenant.users, 0))} detail="Com acesso ativo" icon={ShieldCheck} tone="violet" /><AdminMetric label="Convites de proprietário" value={String(tenants.filter((tenant) => tenant.ownerPending).length)} detail="Aguardando aceite" icon={FileClock} tone="amber" /></section><div className="admin-content-grid"><section className="admin-panel admin-tenants-panel"><AdminPanelHeader eyebrow="Clientes da plataforma" title="Tenants recentes" action="Ver todos" onAction={() => onNavigate("tenants")} /><div className="admin-tenant-list">{tenants.slice(0, 4).map((tenant) => <TenantRow key={tenant.id} tenant={tenant} selected={selectedTenant.id === tenant.id} onSelect={onSelect} />)}</div></section><section className="admin-panel admin-insight-panel"><div className="admin-insight-icon"><SlidersHorizontal size={18} /></div><p className="eyebrow">Atenção recomendada</p><h2>{tenants.filter((tenant) => tenant.billingStatus !== "Em dia").length} cobrança(s) em atenção</h2><p>O plano e a cobrança de cada empresa serão acompanhados aqui.</p><button type="button" className="admin-text-button" onClick={() => onNavigate("billing")}>Revisar cobrança <ArrowUpRight size={15} /></button></section></div><section className="admin-panel admin-detail-panel"><div className="admin-detail-head"><div><p className="eyebrow">Tenant selecionado</p><h2>{selectedTenant.name}</h2><span>{selectedTenant.segment} · desde {selectedTenant.since}</span></div><div className="admin-detail-actions"><AdminStatus value={selectedTenant.accessStatus} /><button className="admin-outline-button" type="button">Abrir detalhes</button><button className="icon-button" type="button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div></div><div className="admin-detail-grid"><div><span>Plano</span><strong>{selectedTenant.plan}</strong></div><div><span>Mensalidade</span><strong>{formatBRL(selectedTenant.monthlyFeeCents)}</strong></div><div><span>Usuários</span><strong>{selectedTenant.users} ativos</strong></div><div><span>Cobrança</span><strong><AdminStatus value={selectedTenant.billingStatus} /></strong></div></div></section></>;
}

function AdminMetric({ label, value, detail, icon: Icon, tone, trend }: { label: string; value: string; detail: string; icon: LucideIcon; tone: string; trend?: "up" | "down" }) { return <article className="admin-metric"><span className={`admin-metric-icon admin-tone-${tone}`}><Icon size={18} /></span><span>{label}</span><strong>{value}</strong><small className={trend ? `admin-trend-${trend}` : ""}>{trend === "up" ? <ArrowUpRight size={12} /> : trend === "down" ? <ArrowDownRight size={12} /> : null}{detail}</small></article>; }

function AdminPanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) { return <div className="admin-panel-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && onAction && <button className="admin-panel-action" type="button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button>}</div>; }

function TenantRow({ tenant, selected, onSelect }: { tenant: Tenant; selected: boolean; onSelect: (id: string) => void }) { return <button type="button" className={`admin-tenant-row ${selected ? "admin-tenant-selected" : ""}`} onClick={() => onSelect(tenant.id)}><span className={`admin-tenant-avatar admin-avatar-${tenant.tone}`}>{tenant.initials}</span><span className="admin-tenant-name"><strong>{tenant.name}</strong><small>{tenant.segment}</small></span><span className="admin-tenant-plan">{tenant.plan}<small>{formatBRL(tenant.monthlyFeeCents)}/mês</small></span><AdminStatus value={tenant.accessStatus} /><ChevronRight size={15} /></button>; }

function TenantDirectory({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) { const { tenants, audit } = useAdmin(); return <section className="admin-panel admin-directory-panel"><AdminPanelHeader eyebrow={`${tenants.length} empresas cadastradas`} title="Clientes e tenants" action="Exportar lista" onAction={() => undefined} /><div className="admin-toolbar"><label className="admin-inline-search"><Search size={15} /><input placeholder="Buscar por nome ou segmento" aria-label="Buscar por nome ou segmento" /></label><button className="admin-outline-button" type="button"><SlidersHorizontal size={15} /> Filtros</button></div><div className="admin-table-head"><span>Empresa</span><span>Plano</span><span>Usuários</span><span>Acesso</span><span>Cobrança</span><span /></div><div className="admin-directory-list">{tenants.map((tenant) => <button type="button" className={`admin-directory-row ${selectedId === tenant.id ? "admin-tenant-selected" : ""}`} key={tenant.id} onClick={() => onSelect(tenant.id)}><span className={`admin-tenant-avatar admin-avatar-${tenant.tone}`}>{tenant.initials}</span><span className="admin-tenant-name"><strong>{tenant.name}</strong><small>{tenant.segment}</small></span><span className="admin-tenant-plan">{tenant.plan}<small>{formatBRL(tenant.monthlyFeeCents)}/mês</small></span><span>{tenant.users} ativos</span><AdminStatus value={tenant.accessStatus} /><AdminStatus value={tenant.billingStatus} /><ChevronRight size={15} /></button>)}</div></section>; }

function BillingView() {
  const { tenants, reload } = useAdmin();
  const [editing, setEditing] = useState<Tenant | null>(null);
  return <section className="admin-panel admin-directory-panel"><AdminPanelHeader eyebrow="Plano, limite e acesso de cada empresa" title="Planos e cobrança" />
    <div className="billing-notice"><WalletCards size={17} /><span><strong>Como funciona:</strong> plano, mensalidade, limite de pessoas e acesso de cada empresa são definidos aqui, com motivo e registro na auditoria. A cobrança automática ainda não está integrada. Bloquear impede o acesso, mas preserva todos os dados.</span></div>
    <div className="admin-billing-list">{tenants.map((tenant) => <div className="admin-billing-row" key={tenant.id}><span className={`admin-tenant-avatar admin-avatar-${tenant.tone}`}>{tenant.initials}</span><div className="admin-tenant-name"><strong>{tenant.name}</strong><small>{tenant.plan} · {formatBRL(tenant.monthlyFeeCents)}/mês · {tenant.maxUsers ? `até ${tenant.maxUsers} pessoas` : "sem limite de pessoas"} · {tenant.users} ativas</small></div><div className="admin-billing-status"><AdminStatus value={tenant.billingStatus} /><AdminStatus value={tenant.accessStatus} /></div><span className="admin-billing-date">Desde {tenant.since}</span><button className="admin-outline-button" type="button" onClick={() => setEditing(tenant)}>Editar</button></div>)}</div>
    {editing && <CompanyPlanDialog tenant={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
  </section>;
}

function CompanyPlanDialog({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [plan, setPlan] = useState(tenant.plan);
  const [fee, setFee] = useState((tenant.monthlyFeeCents / 100).toFixed(2).replace(".", ","));
  const [maxUsers, setMaxUsers] = useState(tenant.maxUsers ? String(tenant.maxUsers) : "");
  const [status, setStatus] = useState(tenant.accessStatus === "Bloqueado" ? "bloqueado" : "ativo");
  const [billingStatus, setBillingStatus] = useState(tenant.billingStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const cents = Math.round(Number(fee.replace(/\./g, "").replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) return setError("Mensalidade inválida.");
    if (status === "bloqueado" && tenant.accessStatus !== "Bloqueado" && !window.confirm(`Bloquear ${tenant.name}? Ninguém da empresa consegue entrar até desbloquear. Os dados são preservados.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/central/companies/${encodeURIComponent(tenant.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, monthlyFeeCents: cents, maxUsers: maxUsers.trim() ? Number(maxUsers) : null, status, billingStatus, reason }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(result.error ?? "Não foi possível salvar."); return; }
      onSaved();
    } catch {
      setError("Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }
  return <div className="dialog-backdrop" role="presentation"><section className="record-dialog" role="dialog" aria-modal="true" aria-label={`Plano de ${tenant.name}`}><header><div><p className="eyebrow">Planos e cobrança</p><h2>{tenant.name}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">×</button></header><form onSubmit={submit}><div className="dialog-body">
    <label className="field-wrap">Plano<input value={plan} onChange={(event) => setPlan(event.target.value)} required maxLength={40} /></label>
    <label className="field-wrap">Mensalidade (R$)<input value={fee} onChange={(event) => setFee(event.target.value)} inputMode="decimal" required /></label>
    <label className="field-wrap">Limite de pessoas (vazio = sem limite)<input value={maxUsers} onChange={(event) => setMaxUsers(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /></label>
    <label className="field-wrap">Cobrança<select value={billingStatus} onChange={(event) => setBillingStatus(event.target.value)}><option>Em dia</option><option>Em tolerância</option><option>Inadimplente</option></select></label>
    <label className="field-wrap">Acesso<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado (dados preservados)</option></select></label>
    <label className="field-wrap">Motivo da alteração<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} rows={2} placeholder="Ex.: upgrade combinado por WhatsApp em 07/11" /></label>
  </div>{error && <p className="dialog-error">{error}</p>}<footer><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></footer></form></section></div>;
}

function AuditView() { const { tenants, audit } = useAdmin(); return <section className="admin-panel admin-directory-panel"><AdminPanelHeader eyebrow="Trilha imutável de eventos" title="Auditoria da plataforma" action="Exportar auditoria" onAction={() => undefined} /><div className="audit-list">{audit.map((entry) => <div className="audit-row" key={entry.id}><span className={`admin-tenant-avatar admin-avatar-${entry.tone}`}>{entry.subject.slice(0, 2).toUpperCase()}</span><div><strong>{entry.action}</strong><small>{entry.subject} · por {entry.actor}</small></div><time>{entry.time}</time><ShieldCheck size={16} /></div>)}</div></section>; }

function NewCompanyDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/central/companies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, segment, ownerEmail }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(result.error ?? "Não foi possível criar a empresa."); return; }
      onCreated();
    } catch {
      setError("Não foi possível criar a empresa agora.");
    } finally {
      setSaving(false);
    }
  }
  return <div className="dialog-backdrop" role="presentation"><section className="record-dialog" role="dialog" aria-modal="true" aria-label="Nova empresa"><header><div><p className="eyebrow">Central Admin</p><h2>Nova empresa</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">×</button></header><form onSubmit={submit}><div className="dialog-body"><div className="dialog-notice">A empresa nasce com banco de dados próprio e vazio. O proprietário entra com o Gmail informado; o convite vale por 7 dias.</div><label className="field-wrap">Nome da empresa<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="field-wrap">Segmento<input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Ex.: elétrica residencial" /></label><label className="field-wrap">Gmail do proprietário<input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required /></label></div>{error && <p className="dialog-error">{error}</p>}<footer><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Criando..." : "Criar e convidar"}</button></footer></form></section></div>;
}
