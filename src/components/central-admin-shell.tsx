"use client";

import { useState } from "react";
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
import { centralAudit, centralTenants } from "@/src/domain/mock-data";
import { formatBRL } from "@/src/domain/money";
import { RecordDialog } from "@/src/components/record-dialog";
import { useDemoData } from "@/src/components/demo-data";

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
  const [selectedId, setSelectedId] = useState(centralTenants[0].id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const data = useDemoData();
  const selectedTenant = centralTenants.find((tenant) => tenant.id === selectedId) ?? centralTenants[0];

  return <><main className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark"><i /><i /><i /></span><span>orquestra<strong>. central</strong></span></div><div className="admin-context"><ShieldCheck size={16} /><span><strong>Central Admin</strong><small>Ambiente de desenvolvimento</small></span></div><p className="admin-nav-label">Gestão da plataforma</p><nav className="admin-nav">{adminNavigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={activeSection === id ? "admin-nav-active" : ""} onClick={() => setActiveSection(id)}><Icon size={17} /><span>{label}</span>{id === "tenants" && <em>{centralTenants.length}</em>}</button>)}</nav><div className="admin-sidebar-spacer" /><div className="admin-integrity"><Activity size={15} /><span><strong>Sistema saudável</strong><small>{data.invitations.length} convite(s) monitorado(s)</small></span></div><a className="admin-back-link" href="/"><ChevronRight size={15} /> Abrir Orquestra One</a><div className="admin-footer"><Settings2 size={14} /> Configurações da plataforma <LogOut size={14} /></div></aside><section className="admin-main"><header className="admin-topbar"><div className="admin-breadcrumb"><span>Orquestra.cs</span><ChevronRight size={14} /><strong>Central Admin</strong></div><div className="admin-top-actions"><label className="admin-search"><Search size={16} /><input placeholder="Buscar cliente ou serviço" aria-label="Buscar cliente ou serviço" /></label><button className="icon-button" type="button" aria-label="Notificações"><Bell size={18} /></button><span className="admin-user-avatar">AL</span><span className="admin-user-name">Alecsander</span></div></header><div className="admin-page"><div className="admin-heading"><div><p className="eyebrow">Controle da plataforma</p><h1>{activeSection === "overview" ? "Central Admin" : adminNavigation.find((item) => item.id === activeSection)?.label}</h1><p>Tenants, serviços e acesso comercial em uma visão segura.</p></div><div className="admin-heading-actions"><span className="dev-badge"><span /> Desenvolvimento</span><button className="admin-primary-button" type="button" onClick={() => setInviteOpen(true)}><Building2 size={16} /> Convidar proprietário</button></div></div>{activeSection === "overview" && <AdminOverview selectedTenant={selectedTenant} onSelect={setSelectedId} onNavigate={setActiveSection} />}{activeSection === "tenants" && <TenantDirectory selectedId={selectedId} onSelect={setSelectedId} />}{activeSection === "billing" && <BillingView />}{activeSection === "audit" && <AuditView />}</div></section></main>{inviteOpen && <RecordDialog kind="invite" defaultInviteKind="owner" onClose={() => setInviteOpen(false)} />}</>;
}

function AdminOverview({ selectedTenant, onSelect, onNavigate }: { selectedTenant: (typeof centralTenants)[number]; onSelect: (id: string) => void; onNavigate: (section: AdminSection) => void }) {
  return <><section className="admin-metric-grid"><AdminMetric label="Tenants ativos" value="4" detail="+2 este mês" icon={Building2} tone="blue" trend="up" /><AdminMetric label="MRR contratado" value="R$ 642" detail="+18,4% este mês" icon={CircleDollarSign} tone="mint" trend="up" /><AdminMetric label="Acessos liberados" value="4" detail="1 em tolerância" icon={ShieldCheck} tone="violet" /><AdminMetric label="Pendências" value="02" detail="Requerem atenção" icon={FileClock} tone="amber" trend="down" /></section><div className="admin-content-grid"><section className="admin-panel admin-tenants-panel"><AdminPanelHeader eyebrow="Clientes da plataforma" title="Tenants recentes" action="Ver todos" onAction={() => onNavigate("tenants")} /><div className="admin-tenant-list">{centralTenants.slice(0, 4).map((tenant) => <TenantRow key={tenant.id} tenant={tenant} selected={selectedTenant.id === tenant.id} onSelect={onSelect} />)}</div></section><section className="admin-panel admin-insight-panel"><div className="admin-insight-icon"><SlidersHorizontal size={18} /></div><p className="eyebrow">Atenção recomendada</p><h2>1 acesso em tolerância comercial</h2><p>Ana Souza Reformas possui cobrança vencida. O acesso continua liberado dentro da janela configurada.</p><button type="button" className="admin-text-button" onClick={() => onNavigate("billing")}>Revisar cobrança <ArrowUpRight size={15} /></button></section></div><section className="admin-panel admin-detail-panel"><div className="admin-detail-head"><div><p className="eyebrow">Tenant selecionado</p><h2>{selectedTenant.name}</h2><span>{selectedTenant.segment} · desde {selectedTenant.since}</span></div><div className="admin-detail-actions"><AdminStatus value={selectedTenant.accessStatus} /><button className="admin-outline-button" type="button">Abrir detalhes</button><button className="icon-button" type="button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div></div><div className="admin-detail-grid"><div><span>Plano</span><strong>{selectedTenant.plan}</strong></div><div><span>Mensalidade</span><strong>{formatBRL(selectedTenant.monthlyFeeCents)}</strong></div><div><span>Usuários</span><strong>{selectedTenant.users} ativos</strong></div><div><span>Cobrança</span><strong><AdminStatus value={selectedTenant.billingStatus} /></strong></div></div></section></>;
}

function AdminMetric({ label, value, detail, icon: Icon, tone, trend }: { label: string; value: string; detail: string; icon: LucideIcon; tone: string; trend?: "up" | "down" }) { return <article className="admin-metric"><span className={`admin-metric-icon admin-tone-${tone}`}><Icon size={18} /></span><span>{label}</span><strong>{value}</strong><small className={trend ? `admin-trend-${trend}` : ""}>{trend === "up" ? <ArrowUpRight size={12} /> : trend === "down" ? <ArrowDownRight size={12} /> : null}{detail}</small></article>; }

function AdminPanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction: () => void }) { return <div className="admin-panel-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="admin-panel-action" type="button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button></div>; }

function TenantRow({ tenant, selected, onSelect }: { tenant: (typeof centralTenants)[number]; selected: boolean; onSelect: (id: string) => void }) { return <button type="button" className={`admin-tenant-row ${selected ? "admin-tenant-selected" : ""}`} onClick={() => onSelect(tenant.id)}><span className={`admin-tenant-avatar admin-avatar-${tenant.tone}`}>{tenant.initials}</span><span className="admin-tenant-name"><strong>{tenant.name}</strong><small>{tenant.segment}</small></span><span className="admin-tenant-plan">{tenant.plan}<small>{formatBRL(tenant.monthlyFeeCents)}/mês</small></span><AdminStatus value={tenant.accessStatus} /><ChevronRight size={15} /></button>; }

function TenantDirectory({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) { return <section className="admin-panel admin-directory-panel"><AdminPanelHeader eyebrow={`${centralTenants.length} empresas cadastradas`} title="Clientes e tenants" action="Exportar lista" onAction={() => undefined} /><div className="admin-toolbar"><label className="admin-inline-search"><Search size={15} /><input placeholder="Buscar por nome ou segmento" aria-label="Buscar por nome ou segmento" /></label><button className="admin-outline-button" type="button"><SlidersHorizontal size={15} /> Filtros</button></div><div className="admin-table-head"><span>Empresa</span><span>Plano</span><span>Usuários</span><span>Acesso</span><span>Cobrança</span><span /></div><div className="admin-directory-list">{centralTenants.map((tenant) => <button type="button" className={`admin-directory-row ${selectedId === tenant.id ? "admin-tenant-selected" : ""}`} key={tenant.id} onClick={() => onSelect(tenant.id)}><span className={`admin-tenant-avatar admin-avatar-${tenant.tone}`}>{tenant.initials}</span><span className="admin-tenant-name"><strong>{tenant.name}</strong><small>{tenant.segment}</small></span><span className="admin-tenant-plan">{tenant.plan}<small>{formatBRL(tenant.monthlyFeeCents)}/mês</small></span><span>{tenant.users} ativos</span><AdminStatus value={tenant.accessStatus} /><AdminStatus value={tenant.billingStatus} /><ChevronRight size={15} /></button>)}</div></section>; }

function BillingView() { return <section className="admin-panel admin-directory-panel"><AdminPanelHeader eyebrow="Assinaturas gerenciadas pelo Portal" title="Planos e cobrança" action="Nova cobrança" onAction={() => undefined} /><div className="billing-notice"><WalletCards size={17} /><span><strong>Fonte de verdade:</strong> nesta demonstração, o Portal Orquestra.cs continua responsável por plano, cobrança e `accessStatus`. A Central Admin apenas acompanha e audita o estado.</span></div><div className="admin-billing-list">{centralTenants.map((tenant) => <div className="admin-billing-row" key={tenant.id}><span className={`admin-tenant-avatar admin-avatar-${tenant.tone}`}>{tenant.initials}</span><div className="admin-tenant-name"><strong>{tenant.name}</strong><small>{tenant.plan} · {formatBRL(tenant.monthlyFeeCents)}/mês</small></div><div className="admin-billing-status"><AdminStatus value={tenant.billingStatus} /><AdminStatus value={tenant.accessStatus} /></div><span className="admin-billing-date">Atualizado {tenant.since}</span><button className="icon-button" type="button" aria-label={`Mais opções de ${tenant.name}`}><MoreHorizontal size={18} /></button></div>)}</div></section>; }

function AuditView() { return <section className="admin-panel admin-directory-panel"><AdminPanelHeader eyebrow="Trilha imutável de eventos" title="Auditoria da plataforma" action="Exportar auditoria" onAction={() => undefined} /><div className="audit-list">{centralAudit.map((entry) => <div className="audit-row" key={entry.id}><span className={`admin-tenant-avatar admin-avatar-${entry.tone}`}>{entry.subject.slice(0, 2).toUpperCase()}</span><div><strong>{entry.action}</strong><small>{entry.subject} · por {entry.actor}</small></div><time>{entry.time}</time><ShieldCheck size={16} /></div>)}</div></section>; }
