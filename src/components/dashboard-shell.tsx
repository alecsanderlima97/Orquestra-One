"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FilePlus2,
  FileBarChart,
  Building2,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  UserCog,
  WalletCards,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { appointments, clients, financeItems, stockItems, suppliers, teamMembers, workOrders } from "@/src/domain/mock-data";
import { formatBRL, formatCompactBRL } from "@/src/domain/money";
import type { SectionId } from "@/src/domain/types";

const navigation: Array<{ id: SectionId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "orders", label: "Ordens de serviço", icon: ClipboardList },
  { id: "finance", label: "Financeiro", icon: WalletCards },
  { id: "stock", label: "Estoque e ferramentas", icon: Boxes },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "suppliers", label: "Fornecedores", icon: Building2 },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "team", label: "Equipe", icon: UserCog },
];

const sectionCopy: Record<SectionId, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Quarta-feira, 29 de outubro", title: "Bom dia, Alecsander", description: "Uma visão clara do que precisa acontecer hoje." },
  agenda: { eyebrow: "Agenda de serviços", title: "O dia no seu ritmo", description: "Compromissos, deslocamentos e próximos passos em um só lugar." },
  orders: { eyebrow: "Operação", title: "Ordens em andamento", description: "Acompanhe cada serviço sem perder o contexto do cliente." },
  finance: { eyebrow: "Controle financeiro", title: "Dinheiro com contexto", description: "Veja o que entra, o que sai e o que ainda precisa de atenção." },
  stock: { eyebrow: "Materiais e ferramentas", title: "Seu estoque sob controle", description: "Saiba o que está disponível antes de sair para o próximo serviço." },
  clients: { eyebrow: "Relacionamento", title: "Clientes que movimentam o negócio", description: "Histórico, próximos serviços e informações importantes na hora certa." },
  suppliers: { eyebrow: "Compras e parceiros", title: "Fornecedores", description: "Tudo que você compra, organizado para a próxima decisão." },
  reports: { eyebrow: "Visão do negócio", title: "Relatórios que ajudam a decidir", description: "Transforme o movimento da operação em clareza para o próximo passo." },
  team: { eyebrow: "Acesso controlado", title: "Equipe e permissões", description: "Cada pessoa vê e faz o que precisa, com segurança." },
  settings: { eyebrow: "Configurações", title: "Preferências da operação", description: "Ajustes gerais do workspace." },
};

const moneyStats = [
  { label: "A receber", value: 845000, detail: "+12,4% este mês", icon: ArrowUpRight, tone: "mint", trend: "up" },
  { label: "A pagar", value: 218000, detail: "3 vencem nesta semana", icon: ArrowDownRight, tone: "amber", trend: "down" },
];

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function StatusPill({ status }: { status: "in_progress" | "waiting" | "completed" | "confirmed" | "pending" | "paid" | "open" | "overdue" }) {
  const copy = {
    in_progress: "Em andamento",
    waiting: "Aguardando",
    completed: "Concluída",
    confirmed: "Confirmado",
    pending: "Pendente",
    paid: "Pago",
    open: "Em aberto",
    overdue: "Vencido",
  }[status];
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{copy}</span>;
}

export function DashboardShell() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const copy = sectionCopy[activeSection];

  function navigate(section: SectionId) {
    setActiveSection(section);
    setQuickOpen(false);
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>orquestra<span>.</span></strong><small>ONE</small></div>
        </div>

        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">EC</span>
          <span className="workspace-copy"><strong>Empresa Central</strong><small>Workspace principal</small></span>
          <ChevronDown size={16} />
        </button>

        <div className="nav-label">Navegação</div>
        <nav className="main-nav" aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-item ${activeSection === id ? "nav-item-active" : ""}`} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={activeSection === id ? 2.25 : 1.8} />
              <span>{label}</span>
              {id === "agenda" && <em>5</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-note"><Sparkles size={16} /><span>Você está no controle.<br /><strong>O One cuida do resto.</strong></span></div>
        <a className="nav-item nav-settings" href="/central-admin"><ShieldCheck size={18} /><span>Central Admin</span></a>
        <button className="nav-item nav-settings" type="button"><Settings2 size={18} /><span>Configurações</span></button>
        <div className="sidebar-footer"><ShieldCheck size={14} /> Dados protegidos por tenant</div>
      </aside>

      {mobileMenuOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button menu-trigger" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><span className="topbar-context">Workspace <ChevronRight size={14} /> <strong>Empresa Central</strong></span></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input placeholder="Buscar em todo o One" aria-label="Buscar em todo o One" /></label>
            <button className="icon-button notification-button" type="button" aria-label="Notificações"><Bell size={19} /><span /></button>
            <div className="topbar-user"><span className="user-avatar">AL</span><span className="user-name">Alecsander Lima</span><ChevronDown size={15} /></div>
          </div>
        </header>

        <div className="page-wrap">
          <div className="page-heading">
            <div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="page-description">{copy.description}</p></div>
            <div className="heading-actions"><button className="secondary-button" type="button"><CalendarClock size={17} /> Hoje</button><button className="primary-button" type="button" onClick={() => setQuickOpen((value) => !value)}><Plus size={18} /> Novo registro</button></div>
          </div>

          {quickOpen && <QuickActions onNavigate={navigate} onClose={() => setQuickOpen(false)} />}
          {renderSection(activeSection, navigate)}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navegação mobile">
        {navigation.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={activeSection === id ? "mobile-nav-active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label.split(" ")[0]}</span></button>)}
      </nav>
    </div>
  );
}

function QuickActions({ onNavigate, onClose }: { onNavigate: (section: SectionId) => void; onClose: () => void }) {
  const actions: Array<{ label: string; description: string; icon: LucideIcon; section: SectionId }> = [
    { label: "Nova ordem de serviço", description: "Comece um atendimento", icon: FilePlus2, section: "orders" },
    { label: "Registrar despesa", description: "Boleto, Pix ou compra", icon: CircleDollarSign, section: "finance" },
    { label: "Adicionar cliente", description: "Salve um novo contato", icon: Users, section: "clients" },
  ];
  return <div className="quick-actions"><div className="quick-actions-head"><div><p className="eyebrow">Ação rápida</p><h2>O que você precisa registrar?</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar ações rápidas"><X size={18} /></button></div><div className="quick-action-grid">{actions.map(({ label, description, icon: Icon, section }) => <button key={label} type="button" className="quick-action" onClick={() => onNavigate(section)}><span className="quick-action-icon"><Icon size={19} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={16} /></button>)}</div></div>;
}

function renderSection(section: SectionId, navigate: (section: SectionId) => void) {
  if (section === "overview") return <Overview navigate={navigate} />;
  if (section === "agenda") return <AgendaView />;
  if (section === "orders") return <OrdersView />;
  if (section === "finance") return <FinanceView />;
  if (section === "stock") return <StockView />;
  if (section === "clients") return <ClientsView />;
  if (section === "suppliers") return <SuppliersView />;
  if (section === "reports") return <ReportsView />;
  return <TeamView />;
}

function Overview({ navigate }: { navigate: (section: SectionId) => void }) {
  return <>
    <section className="metric-grid" aria-label="Indicadores principais">
      {moneyStats.map(({ label, value, detail, icon: Icon, tone, trend }) => <article className="metric-card" key={label}><div className={`metric-icon metric-icon-${tone}`}><Icon size={18} /></div><p>{label}</p><strong>{formatCompactBRL(value)}</strong><span className={`metric-detail metric-${trend}`}><Icon size={13} /> {detail}</span></article>)}
      <article className="metric-card"><div className="metric-icon metric-icon-blue"><ClipboardList size={18} /></div><p>Serviços ativos</p><strong>12</strong><span className="metric-detail">4 aguardando aprovação</span></article>
      <article className="metric-card"><div className="metric-icon metric-icon-rose"><CalendarDays size={18} /></div><p>Agenda de hoje</p><strong>05</strong><span className="metric-detail">Próximo às 10:45</span></article>
    </section>
    <div className="content-grid main-grid">
      <section className="panel agenda-panel"><PanelHeader eyebrow="Agenda de hoje" title="Próximos compromissos" action="Ver agenda" onAction={() => navigate("agenda")} /><div className="agenda-list">{appointments.slice(0, 3).map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}</div><button className="panel-footer-link" type="button" onClick={() => navigate("agenda")}>Ver todos os compromissos <ArrowUpRight size={15} /></button></section>
      <section className="panel pulse-panel"><PanelHeader eyebrow="Visão financeira" title="Pulso do mês" action="Abrir financeiro" onAction={() => navigate("finance")} /><div className="pulse-summary"><div><span>Resultado estimado</span><strong>R$ 6.270,00</strong><small><ArrowUpRight size={13} /> 8,6% contra setembro</small></div><div className="pulse-legend"><span><i className="legend-in" />Entradas</span><span><i className="legend-out" />Saídas</span></div></div><MiniChart /></section>
    </div>
    <div className="content-grid lower-grid"><section className="panel orders-panel"><PanelHeader eyebrow="Operação" title="Ordens em andamento" action="Ver ordens" onAction={() => navigate("orders")} /><div className="order-list">{workOrders.slice(0, 3).map((order) => <OrderRow key={order.id} order={order} />)}</div></section><section className="panel focus-panel"><div className="focus-orb"><Activity size={19} /></div><p className="eyebrow">Foco recomendado</p><h2>Finalize o que já está em campo</h2><p>Você tem 2 serviços em andamento. Registrar materiais e observações agora deixa o fechamento muito mais simples.</p><button className="text-button" type="button" onClick={() => navigate("orders")}>Abrir operação <ArrowUpRight size={15} /></button></section></div>
  </>;
}

function PanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction: () => void }) { return <div className="panel-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="panel-action" type="button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button></div>; }

function AppointmentRow({ appointment }: { appointment: (typeof appointments)[number] }) { return <div className="appointment-row"><div className="appointment-time"><strong>{appointment.time}</strong><span>{appointment.duration}</span></div><div className="appointment-line"><span className={`appointment-marker marker-${appointment.status}`} /></div><div className="appointment-info"><div className="appointment-title"><strong>{appointment.client}</strong><StatusPill status={appointment.status} /></div><span>{appointment.service}</span><small><MapPin size={12} /> {appointment.address}</small></div><button className="icon-button row-more" type="button" aria-label={`Mais opções de ${appointment.client}`}><MoreHorizontal size={18} /></button></div>; }

function OrderRow({ order }: { order: (typeof workOrders)[number] }) { return <div className="order-row"><div className="order-id">{order.id}</div><div className="order-info"><strong>{order.service}</strong><span>{order.client} · {order.professional}</span></div><div className="order-amount">{formatBRL(order.amountCents)}<small>{order.updatedAt}</small></div><StatusPill status={order.status} /><button className="icon-button row-more" type="button" aria-label={`Mais opções da ${order.id}`}><MoreHorizontal size={18} /></button></div>; }

function MiniChart() { const bars = [38, 52, 46, 68, 55, 78, 64, 86, 73, 92, 81, 100]; return <div className="chart-wrap"><div className="chart-y"><span>R$ 5k</span><span>R$ 2,5k</span><span>R$ 0</span></div><div className="chart-bars">{bars.map((height, index) => <div className="chart-column" key={index}><div className="bar-group"><span className="bar bar-in" style={{ height: `${height}%` }} /><span className="bar bar-out" style={{ height: `${Math.max(18, height - 30)}%` }} /></div><small>{["Nov 1", "", "", "Nov 4", "", "", "Nov 7", "", "", "Nov 10", "", "Hoje"][index]}</small></div>)}</div></div>; }

function AgendaView() { return <section className="panel full-panel"><PanelHeader eyebrow="Quarta-feira, 29 de outubro" title="Todos os compromissos" action="Novo agendamento" onAction={() => undefined} /><div className="view-toolbar"><div className="date-tabs"><button className="date-tab date-tab-active" type="button">Hoje <span>5</span></button><button className="date-tab" type="button">Amanhã <span>3</span></button><button className="date-tab" type="button">Esta semana <span>12</span></button></div><button className="secondary-button" type="button"><CalendarDays size={16} /> Calendário</button></div><div className="agenda-full-list">{appointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}</div></section>; }

function OrdersView() { return <section className="panel full-panel"><PanelHeader eyebrow="4 ordens visíveis" title="Acompanhe os serviços" action="Nova ordem" onAction={() => undefined} /><div className="view-toolbar"><div className="filter-pills"><button className="filter-pill filter-pill-active" type="button">Todas <span>12</span></button><button className="filter-pill" type="button">Em andamento <span>4</span></button><button className="filter-pill" type="button">Aguardando <span>3</span></button></div><button className="secondary-button" type="button"><Search size={16} /> Filtrar</button></div><div className="orders-table"><div className="table-head"><span>Ordem</span><span>Serviço</span><span>Valor</span><span>Status</span><span /></div>{workOrders.map((order) => <OrderRow key={order.id} order={order} />)}</div></section>; }

function FinanceView() { return <section className="panel full-panel"><PanelHeader eyebrow="Fluxo do mês" title="Financeiro" action="Novo lançamento" onAction={() => undefined} /><div className="finance-summary-grid"><div className="finance-summary-card"><span>Entradas previstas</span><strong>R$ 8.450,00</strong><small>7 lançamentos em aberto</small></div><div className="finance-summary-card finance-summary-out"><span>Saídas previstas</span><strong>R$ 2.180,00</strong><small>3 títulos nesta semana</small></div><div className="finance-summary-card finance-summary-result"><span>Resultado estimado</span><strong>R$ 6.270,00</strong><small>Antes de despesas indiretas</small></div></div><div className="finance-list">{financeItems.map((item) => <div className="finance-row" key={item.id}><div className={`finance-type finance-type-${item.type}`}>{item.type === "receivable" ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</div><div className="finance-info"><strong>{item.title}</strong><span>{item.party} · Vence {item.dueDate}</span></div><strong className={item.type === "receivable" ? "value-in" : "value-out"}>{item.type === "receivable" ? "+" : "−"} {formatBRL(item.amountCents)}</strong><StatusPill status={item.status} /></div>)}</div></section>; }

function StockView() { return <section className="panel full-panel"><PanelHeader eyebrow="Estoque principal" title="Materiais e ferramentas" action="Adicionar item" onAction={() => undefined} /><div className="stock-summary"><div><PackageCheck size={18} /><span>Itens cadastrados<strong>38</strong></span></div><div><Wrench size={18} /><span>Ferramentas em uso<strong>7</strong></span></div><div className="stock-alert"><Activity size={18} /><span>Abaixo do mínimo<strong>2</strong></span></div></div><div className="stock-list">{stockItems.map((item) => <div className="stock-row" key={item.id}><div className={`stock-symbol stock-symbol-${item.category}`}>{item.category === "tool" ? <Wrench size={17} /> : item.category === "resale" ? <PackageCheck size={17} /> : <Boxes size={17} />}</div><div className="stock-info"><strong>{item.name}</strong><span>{item.location} · {item.category === "tool" ? "Ferramenta" : item.category === "resale" ? "Revenda" : "Consumo"}</span></div><div className={`stock-quantity ${item.quantity < item.minimum ? "stock-low" : ""}`}><strong>{item.quantity} {item.unit}</strong><small>{item.quantity < item.minimum ? "Repor em breve" : `Mínimo ${item.minimum} ${item.unit}`}</small></div><button className="icon-button row-more" type="button" aria-label={`Mais opções de ${item.name}`}><MoreHorizontal size={18} /></button></div>)}</div></section>; }

function ClientsView() { return <section className="panel full-panel"><PanelHeader eyebrow="Base de clientes" title="Pessoas e empresas" action="Novo cliente" onAction={() => undefined} /><div className="view-toolbar"><label className="inline-search"><Search size={16} /><input placeholder="Buscar cliente" aria-label="Buscar cliente" /></label><button className="secondary-button" type="button"><Users size={16} /> Importar</button></div><div className="client-grid">{clients.map((client) => <div className="client-card" key={client.id}><span className={`client-avatar client-${client.tone}`}>{client.initials}</span><div><strong>{client.name}</strong><span>{client.detail}</span></div><ChevronRight size={17} /></div>)}</div></section>; }

function SuppliersView() { return <section className="panel full-panel"><PanelHeader eyebrow="Compras e parceiros" title="Fornecedores" action="Novo fornecedor" onAction={() => undefined} /><div className="view-toolbar"><label className="inline-search"><Search size={16} /><input placeholder="Buscar fornecedor" aria-label="Buscar fornecedor" /></label><button className="secondary-button" type="button"><Building2 size={16} /> Categorias</button></div><div className="directory-list">{suppliers.map((supplier) => <div className="directory-row" key={supplier.id}><span className={`client-avatar client-${supplier.tone}`}>{supplier.initials}</span><div className="directory-info"><strong>{supplier.name}</strong><span>{supplier.category} · {supplier.phone}</span></div><span className="directory-city">{supplier.city}</span><StatusPill status="confirmed" /><button className="icon-button row-more" type="button" aria-label={`Mais opções de ${supplier.name}`}><MoreHorizontal size={18} /></button></div>)}</div></section>; }

function ReportsView() { return <section className="panel full-panel"><PanelHeader eyebrow="Últimos 3 meses" title="Relatórios" action="Gerar relatório" onAction={() => undefined} /><div className="report-filters"><button type="button">Financeiro <ChevronDown size={14} /></button><button type="button">Últimos 3 meses <ChevronDown size={14} /></button><button type="button">Todas as categorias <ChevronDown size={14} /></button></div><div className="report-metrics"><div><span>Faturamento</span><strong>R$ 36.800</strong><small>+14,2%</small></div><div><span>Despesas</span><strong>R$ 14.250</strong><small className="report-negative">+5,8%</small></div><div><span>Lucro estimado</span><strong>R$ 22.550</strong><small>+18,1%</small></div><div><span>Margem</span><strong>61,3%</strong><small>Saudável</small></div></div><div className="report-chart"><div className="report-chart-head"><strong>Evolução do faturamento</strong><span><i /> Receita</span></div><div className="line-chart"><span className="line-segment line-one" /><span className="line-segment line-two" /><span className="line-segment line-three" /><div className="line-point point-one" /><div className="line-point point-two" /><div className="line-point point-three" /><div className="line-point point-four" /></div><div className="report-chart-labels"><span>Ago/24</span><span>Set/24</span><span>Out/24</span></div></div></section>; }

function TeamView() { return <section className="panel full-panel"><PanelHeader eyebrow="4 pessoas ativas" title="Equipe e permissões" action="Novo usuário" onAction={() => undefined} /><div className="team-table"><div className="table-head team-head"><span>Nome</span><span>Função</span><span>Permissões</span><span>Status</span><span /></div>{teamMembers.map((member) => <div className="team-row" key={member.id}><span className={`client-avatar client-${member.tone}`}>{member.initials}</span><div className="team-name"><strong>{member.name}</strong><span>{member.role}</span></div><span className="team-access">{member.access}</span><StatusPill status="confirmed" /><button className="icon-button row-more" type="button" aria-label={`Mais opções de ${member.name}`}><MoreHorizontal size={18} /></button></div>)}</div><div className="permissions-note"><ShieldCheck size={17} /><span>As permissões são verificadas no servidor por empresa e por ação. O perfil visual não concede acesso por si só.</span></div></section>; }
