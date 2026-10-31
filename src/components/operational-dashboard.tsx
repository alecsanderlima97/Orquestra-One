"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  Activity, ArrowDownRight, ArrowUpDown, ArrowUpRight, Bell, Boxes, Building2, CalendarClock, CalendarDays,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Clock3, FileBarChart,
  FilePlus2, LayoutDashboard, MapPin, Menu, PackageCheck, Plus, Search, Settings2,
  MessageCircle, ShieldCheck, Sparkles, UserCog, Users, WalletCards, Wrench, X, type LucideIcon,
} from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import type { SectionId } from "@/src/domain/types";
import { useDemoData, type AppointmentPatch, type AppointmentRecord, type ClientRecord, type FinanceRecord, type WorkOrderRecord } from "@/src/components/demo-data";
import { RecordDialog, type RecordKind } from "@/src/components/record-dialog";
import { VoiceDictationButton } from "@/src/components/voice-input";
import { EmptyState, PanelHeader, StatusPill, WhatsAppLink, type Status } from "@/src/components/ui-parts";
import { OrdersView } from "@/src/components/orders-view";
import { FinanceView } from "@/src/components/finance-view";
import { StockView } from "@/src/components/stock-view";
import { ClientsView, SuppliersView } from "@/src/components/people-views";
import { ReportsView } from "@/src/components/reports-view";
import { TeamView } from "@/src/components/team-view";
import { financeStatus } from "@/src/lib/finance-utils";
import { endTime, findConflicts, lengthMinutes, startMinutes, timeRange, todayDate } from "@/src/lib/agenda";

const navigation: Array<{ id: Exclude<SectionId, "settings">; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard }, { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "orders", label: "Ordens de serviço", icon: ClipboardList }, { id: "finance", label: "Financeiro", icon: WalletCards },
  { id: "stock", label: "Estoque e ferramentas", icon: Boxes }, { id: "clients", label: "Clientes", icon: Users },
  { id: "suppliers", label: "Fornecedores", icon: Building2 }, { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "team", label: "Equipe", icon: UserCog },
];

const sectionCopy: Record<SectionId, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Operação de hoje", title: "Bom dia, Alecsander", description: "Agenda, serviços e financeiro conectados para uma rotina mais leve." },
  agenda: { eyebrow: "Agenda de serviços", title: "O dia no seu ritmo", description: "Agendamentos já trazem cliente, endereço e contexto para a ordem de serviço." },
  orders: { eyebrow: "Operação", title: "Ordens de serviço", description: "Registre a execução, materiais e fechamento no mesmo fluxo." },
  finance: { eyebrow: "Controle financeiro", title: "Dinheiro com contexto", description: "Receitas, despesas e fechamentos vinculados aos serviços." },
  stock: { eyebrow: "Materiais e ferramentas", title: "Seu estoque sob controle", description: "A baixa é feita apenas no fechamento confirmado da OS." },
  clients: { eyebrow: "Relacionamento", title: "Clientes que movimentam o negócio", description: "Dados completos, histórico e próximos atendimentos em uma só ficha." },
  suppliers: { eyebrow: "Compras e parceiros", title: "Fornecedores", description: "Cadastros completos, categorias e localização para decidir mais rápido." },
  reports: { eyebrow: "Visão do negócio", title: "Relatórios que ajudam a decidir", description: "O resumo usa dados de agenda, execução, financeiro e estoque." },
  team: { eyebrow: "Acesso controlado", title: "Equipe e permissões", description: "Convites e níveis de acesso preparados para a gestão por empresa." },
  settings: { eyebrow: "Configurações", title: "Preferências da operação", description: "Defina como sua equipe enxerga, organiza e recebe alertas no One." },
};

type AgendaMode = "day" | "week" | "month";

const AGENDA_START_MINUTES = 7 * 60;
const AGENDA_END_MINUTES = 25 * 60;
const AGENDA_HOUR_HEIGHT = 66;
const AGENDA_SNAP_MINUTES = 30;

function parseAgendaDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatAgendaDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveAgendaDate(value: string, amount: number) {
  const date = parseAgendaDate(value);
  date.setDate(date.getDate() + amount);
  return formatAgendaDate(date);
}

function moveAgendaMonth(value: string, amount: number) {
  const date = parseAgendaDate(value);
  date.setMonth(date.getMonth() + amount, 1);
  return formatAgendaDate(date);
}

function startOfAgendaWeek(value: string) {
  const date = parseAgendaDate(value);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return formatAgendaDate(date);
}

function getAgendaMonthDays(value: string) {
  const date = parseAgendaDate(value);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstMondayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const totalDays = Math.ceil((firstMondayOffset + daysInMonth) / 7) * 7;
  const gridStart = new Date(date.getFullYear(), date.getMonth(), 1 - firstMondayOffset);
  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return formatAgendaDate(day);
  });
}

function agendaMonthLabel(value: string) {
  return parseAgendaDate(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function agendaLongDateLabel(value: string) {
  return parseAgendaDate(value).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function agendaShortWeekday(value: string) {
  return parseAgendaDate(value).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function appointmentHour(appointment: AppointmentRecord) {
  return Number(appointment.time.slice(0, 2));
}

function appointmentMinutes(appointment: AppointmentRecord) {
  return startMinutes(appointment);
}

function appointmentDurationMinutes(appointment: AppointmentRecord) {
  return lengthMinutes(appointment);
}

function snapAgendaMinutes(value: number) {
  return Math.round(value / AGENDA_SNAP_MINUTES) * AGENDA_SNAP_MINUTES;
}

function clampAgendaMinutes(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatAgendaTime(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatAgendaDuration(minutes: number) {
  if (minutes >= 8 * 60) return "Dia inteiro";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours}h ${remainder}` : `${hours}h`;
}

function appointmentCadenceLabel(cadence?: AppointmentRecord["cadence"]) {
  return cadence === "daily" ? "todos os dias" : cadence === "weekdays" ? "dias úteis" : cadence === "weekly" ? "semanal" : "somente este dia";
}

function professionalColor(name: string) {
  if (name === "Você") return "mint";
  const palette = ["blue", "violet", "amber", "rose"];
  const hash = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function OperationalDashboard() {
  const data = useDemoData();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<RecordKind | null>(null);
  const [workOrderId, setWorkOrderId] = useState<string>();
  const [orderLink, setOrderLink] = useState<{ appointmentId: string; clientId: string; service: string; description: string }>();
  const [today, setToday] = useState("");
  const [hour, setHour] = useState<number>();
  useEffect(() => { setToday(todayDate()); setHour(new Date().getHours()); }, []);
  const todayAppointments = today ? data.appointments.filter((appointment) => appointment.date === today).length : 0;
  const greeting = hour === undefined ? "Olá" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const copy = activeSection === "overview" ? { ...sectionCopy.overview, title: `${greeting}, Alecsander` } : sectionCopy[activeSection];

  function navigate(section: SectionId) { setActiveSection(section); setQuickOpen(false); setMobileMenuOpen(false); }
  function open(kind: RecordKind, orderId?: string) { setWorkOrderId(orderId); setDialog(kind); setQuickOpen(false); }
  const [slotPrefill, setSlotPrefill] = useState<{ date: string; time: string }>();
  function createAppointmentAt(date: string, time: string) { setSlotPrefill({ date, time }); open("appointment"); }
  function createOrderFromAppointment(appointment: AppointmentRecord) { setOrderLink({ appointmentId: appointment.id, clientId: appointment.clientId, service: appointment.service, description: appointment.notes }); open("order"); }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><div className="brand-mark"><span /><span /><span /></div><div><strong>orquestra<span>.</span></strong><small>ONE</small></div></div>
      <button className="workspace-switcher" type="button" onClick={() => navigate("settings")}><span className="workspace-avatar">EC</span><span className="workspace-copy"><strong>Empresa Central</strong><small>Workspace principal</small></span><ChevronDown size={16} /></button>
      <div className="nav-label">Navegação</div><nav className="main-nav" aria-label="Navegação principal">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`nav-item ${activeSection === id ? "nav-item-active" : ""}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={activeSection === id ? 2.25 : 1.8} /><span>{label}</span>{id === "agenda" && <em>{todayAppointments}</em>}</button>)}</nav>
      <div className="sidebar-spacer" /><div className="sidebar-note"><Sparkles size={16} /><span>Dados operacionais ficam conectados.<br /><strong>Feche a OS sem retrabalho.</strong></span></div>
      <a className="nav-item nav-settings" href="/central-admin"><ShieldCheck size={18} /><span>Central Admin</span></a><button className={`nav-item nav-settings ${activeSection === "settings" ? "nav-item-active" : ""}`} type="button" onClick={() => navigate("settings")}><Settings2 size={18} /><span>Configurações</span></button><div className="sidebar-footer"><ShieldCheck size={14} /> Base preparada para tenant</div>
    </aside>
    {mobileMenuOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}
    <main className="main-content"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-trigger" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><span className="topbar-context">Workspace <ChevronRight size={14} /> <strong>Empresa Central</strong></span></div><div className="topbar-actions"><GlobalSearch onNavigate={navigate} /><NotificationBell onNavigate={navigate} /><div className="topbar-user" role="button" tabIndex={0} onClick={() => navigate("settings")} onKeyDown={(event) => { if (event.key === "Enter") navigate("settings"); }}><span className="user-avatar">AL</span><span className="user-name">Alecsander Lima</span><ChevronDown size={15} /></div></div></header>
      <div className="page-wrap"><div className="page-heading"><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="page-description">{copy.description}</p></div><div className="heading-actions"><button className="secondary-button" type="button" onClick={() => navigate("agenda")}><CalendarClock size={17} /> Hoje</button><button className="primary-button" type="button" onClick={() => setQuickOpen((value) => !value)}><Plus size={18} /> Novo registro</button></div></div>
      {quickOpen && <QuickActions onOpen={open} onClose={() => setQuickOpen(false)} />}
      {activeSection === "overview" && <Overview onNavigate={navigate} onOpen={open} />}
      {activeSection === "agenda" && <AgendaView onOpen={open} onCreateOrder={createOrderFromAppointment} onCreateAt={createAppointmentAt} />}{activeSection === "orders" && <OrdersView onOpen={open} />}{activeSection === "finance" && <FinanceView onOpen={open} />}{activeSection === "stock" && <StockView onOpen={open} />}{activeSection === "clients" && <ClientsView onOpen={open} />}{activeSection === "suppliers" && <SuppliersView onOpen={open} />}{activeSection === "reports" && <ReportsView />}{activeSection === "team" && <TeamView />}{activeSection === "settings" && <SettingsView />}
      </div></main>
    <nav className="mobile-nav" aria-label="Navegação mobile">{navigation.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={activeSection === id ? "mobile-nav-active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label.split(" ")[0]}</span></button>)}</nav>
    {dialog && <RecordDialog kind={dialog} workOrderId={workOrderId} prefill={dialog === "order" ? orderLink : dialog === "appointment" ? slotPrefill : undefined} onOrderCreated={dialog === "order" && orderLink ? (orderId) => data.updateAppointment(orderLink.appointmentId, { workOrderId: orderId }) : undefined} onClose={() => { setDialog(null); setOrderLink(undefined); setSlotPrefill(undefined); }} />}
  </div>;
}

function confirmCloseOrder(orderId: string, close: (orderId: string) => void) {
  if (window.confirm(`Fechar a ${orderId}? Isso lança a cobrança no financeiro e baixa os materiais do estoque.`)) close(orderId);
}

type NavigationHit = { key: string; label: string; hint: string; section: SectionId };

function GlobalSearch({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  const data = useDemoData();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(term);
  const results: NavigationHit[] = term.length < 2 ? [] : [
    ...data.clients.filter((item) => matches(`${item.name} ${item.document} ${item.phone} ${item.city}`)).slice(0, 3).map((item) => ({ key: `cl-${item.id}`, label: item.name, hint: "Cliente", section: "clients" as SectionId })),
    ...data.workOrders.filter((item) => matches(`${item.id} ${item.client} ${item.service}`)).slice(0, 3).map((item) => ({ key: `os-${item.id}`, label: `${item.id} · ${item.service}`, hint: `Ordem de serviço · ${item.client}`, section: "orders" as SectionId })),
    ...data.appointments.filter((item) => matches(`${item.client} ${item.service} ${item.address}`)).slice(0, 3).map((item) => ({ key: `ag-${item.id}`, label: `${item.client} · ${item.service}`, hint: `Agenda · ${item.date.split("-").reverse().slice(0, 2).join("/")} às ${item.time}`, section: "agenda" as SectionId })),
    ...data.finance.filter((item) => matches(`${item.title} ${item.party}`)).slice(0, 2).map((item) => ({ key: `fin-${item.id}`, label: item.title, hint: `Financeiro · ${item.party}`, section: "finance" as SectionId })),
    ...data.suppliers.filter((item) => matches(`${item.name} ${item.category} ${item.document}`)).slice(0, 2).map((item) => ({ key: `fo-${item.id}`, label: item.name, hint: "Fornecedor", section: "suppliers" as SectionId })),
  ];

  useEffect(() => { if (expanded) inputRef.current?.focus(); }, [expanded]);

  function go(section: SectionId) {
    onNavigate(section);
    setQuery("");
    setExpanded(false);
  }

  return <div className={`search-box-wrap ${expanded ? "search-box-wrap-expanded" : ""}`}>
    <label className="search-box" onClick={() => setExpanded(true)}><Search size={17} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => { setExpanded(false); setQuery(""); }} onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); setExpanded(false); event.currentTarget.blur(); } }} placeholder="Buscar em todo o One" aria-label="Buscar em todo o One" /></label>
    {results.length > 0 && <ul className="search-results" role="listbox">{results.map((hit) => <li key={hit.key}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => go(hit.section)}><strong>{hit.label}</strong><small>{hit.hint}</small></button></li>)}</ul>}
    {term.length >= 2 && results.length === 0 && <div className="search-results search-results-empty">Nada encontrado para “{query.trim()}”.</div>}
  </div>;
}

function NotificationBell({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  const data = useDemoData();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  useEffect(() => { setToday(todayDate()); }, []);
  const alerts: NavigationHit[] = [];
  if (today) {
    data.appointments.filter((item) => item.date === today && item.status === "pending").forEach((item) => alerts.push({ key: `ag-${item.id}`, label: `Confirmar ${item.client} às ${item.time}`, hint: "Agenda de hoje", section: "agenda" }));
    data.finance.filter((item) => financeStatus(item, today) === "overdue").forEach((item) => alerts.push({ key: `fv-${item.id}`, label: `Vencido: ${item.title}`, hint: `${item.party} · ${formatBRL(item.amountCents)}`, section: "finance" }));
    data.finance.filter((item) => item.status !== "paid" && (item.dueDate === today || item.dueDate === "Hoje")).forEach((item) => alerts.push({ key: `fh-${item.id}`, label: `Vence hoje: ${item.title}`, hint: `${item.party} · ${formatBRL(item.amountCents)}`, section: "finance" }));
  }
  data.stock.filter((item) => item.quantity < item.minimum).forEach((item) => alerts.push({ key: `st-${item.id}`, label: `Estoque baixo: ${item.name}`, hint: `${item.quantity} ${item.unit} · mínimo ${item.minimum}`, section: "stock" }));
  data.workOrders.filter((item) => item.status === "waiting").forEach((item) => alerts.push({ key: `os-${item.id}`, label: `${item.id} aguardando retomada`, hint: `${item.service} · ${item.client}`, section: "orders" }));

  return <div className="notification-wrap">
    <button className="icon-button notification-button" type="button" aria-label={alerts.length ? `Notificações (${alerts.length})` : "Notificações"} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={19} />{alerts.length > 0 && <span />}</button>
    {open && <button className="popover-backdrop" type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)} />}
    {open && <div className="notification-popover" role="dialog" aria-label="Notificações"><h3>{alerts.length ? "Precisa da sua atenção" : "Tudo em dia"}</h3>{alerts.length ? <ul>{alerts.slice(0, 8).map((alert) => <li key={alert.key}><button type="button" onClick={() => { onNavigate(alert.section); setOpen(false); }}><strong>{alert.label}</strong><small>{alert.hint}</small></button></li>)}</ul> : <p className="notification-empty">Sem pendências de agenda, financeiro ou estoque.</p>}</div>}
  </div>;
}

function QuickActions({ onOpen, onClose }: { onOpen: (kind: RecordKind) => void; onClose: () => void }) {
  const actions: Array<{ label: string; description: string; icon: LucideIcon; kind: RecordKind }> = [{ label: "Nova ordem de serviço", description: "Comece um atendimento", icon: FilePlus2, kind: "order" }, { label: "Registrar lançamento", description: "Receita, despesa ou compra", icon: CircleDollarSign, kind: "finance" }, { label: "Adicionar cliente", description: "Salve um novo contato", icon: Users, kind: "client" }];
  return <div className="quick-actions"><div className="quick-actions-head"><div><p className="eyebrow">Ação rápida</p><h2>O que você precisa registrar?</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar ações rápidas"><X size={18} /></button></div><div className="quick-action-grid">{actions.map(({ label, description, icon: Icon, kind }) => <button key={label} type="button" className="quick-action" onClick={() => onOpen(kind)}><span className="quick-action-icon"><Icon size={19} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={16} /></button>)}</div></div>;
}

function AppointmentRow({ appointment, dateLabel }: { appointment: ReturnType<typeof useDemoData>["appointments"][number]; dateLabel?: string }) { return <div className="appointment-row"><div className="appointment-time"><strong>{appointment.time}</strong><span>{appointment.duration}</span></div><div className="appointment-line"><span className={`appointment-marker marker-${appointment.status}`} /></div><div className="appointment-info"><div className="appointment-title"><strong>{appointment.client}</strong><StatusPill status={appointment.status} /></div><span>{appointment.service}{dateLabel ? ` · ${dateLabel}` : ""}</span><small><MapPin size={12} /> {appointment.address}</small></div></div>; }
function OrderRow({ order, onDiary, onClose, onDescription, onToggleWaiting }: { order: WorkOrderRecord; onDiary: () => void; onClose: () => void; onDescription?: () => void; onToggleWaiting?: () => void }) { return <div className="order-row operational-order-row"><div className="order-id">{order.id}</div><div className="order-info"><strong>{order.service}</strong><span>{order.client} · {order.professional}{order.diary.length ? ` · ${order.diary.length} registro(s)` : ""}</span></div><div className="order-amount">{formatBRL(order.amountCents)}<small>{order.updatedAt}</small></div><StatusPill status={order.status} /><div className="row-actions"><button className="table-action" type="button" onClick={onDiary}>Diário</button>{onDescription && <button className="table-action" type="button" onClick={onDescription}>Descrição</button>}{onToggleWaiting && order.status !== "completed" && <button className="table-action" type="button" onClick={onToggleWaiting}>{order.status === "waiting" ? "Retomar" : "Pausar"}</button>}{order.status !== "completed" && <button className="table-action table-action-success" type="button" onClick={onClose}>Fechar</button>}</div></div>; }

function Overview({ onNavigate, onOpen }: { onNavigate: (section: SectionId) => void; onOpen: (kind: RecordKind, id?: string) => void }) {
  const data = useDemoData(); const [today, setToday] = useState(""); useEffect(() => { setToday(todayDate()); }, []);
  const todayList = today ? data.appointments.filter((appointment) => appointment.date === today) : [];
  const upcoming = today ? data.appointments.filter((appointment) => appointment.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 3) : [];
  const receivable = data.finance.filter((item) => item.type === "receivable" && item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0); const payable = data.finance.filter((item) => item.type === "payable" && item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0); const active = data.workOrders.filter((order) => order.status === "in_progress").length;
  return <><section className="metric-grid"><Metric icon={ArrowUpRight} label="A receber" value={formatBRL(receivable)} detail={`${data.finance.filter((item) => item.type === "receivable" && item.status !== "paid").length} títulos em aberto`} tone="mint" /><Metric icon={ArrowDownRight} label="A pagar" value={formatBRL(payable)} detail={`${data.finance.filter((item) => item.type === "payable" && item.status !== "paid").length} lançamentos`} tone="amber" /><Metric icon={Wrench} label="Serviços ativos" value={String(active).padStart(2, "0")} detail="acompanhe o diário" tone="blue" /><Metric icon={CalendarDays} label="Agenda de hoje" value={String(todayList.length).padStart(2, "0")} detail="vincule à ordem ao executar" tone="violet" /></section><div className="main-grid"><section className="panel agenda-panel"><PanelHeader eyebrow="Agenda de hoje" title="Próximos compromissos" action="Ver agenda" onAction={() => onNavigate("agenda")} /><div className="agenda-list">{upcoming.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} dateLabel={appointment.date === today ? undefined : appointment.date.split("-").reverse().slice(0, 2).join("/")} />)}{!upcoming.length && <EmptyState message="Nenhum compromisso a partir de hoje." />}</div><button className="panel-footer-link" type="button" onClick={() => onOpen("appointment")}>Adicionar compromisso <ArrowUpRight size={15} /></button></section><section className="panel focus-panel"><div className="focus-orb"><Activity size={19} /></div><p className="eyebrow">Próximo passo</p><h2>Registre cada andamento</h2><p>O diário da OS preserva decisões, materiais e observações para o fechamento e o relatório final.</p><button className="text-button" type="button" onClick={() => onNavigate("orders")}>Abrir operação <ArrowUpRight size={15} /></button></section></div><div className="content-grid lower-grid"><section className="panel orders-panel"><PanelHeader eyebrow="Operação" title="Ordens em andamento" action="Nova ordem" onAction={() => onOpen("order")} /><div className="order-list">{data.workOrders.filter((order) => order.status !== "completed").slice(0, 3).map((order) => <OrderRow key={order.id} order={order} onDiary={() => onOpen("diary", order.id)} onClose={() => confirmCloseOrder(order.id, data.closeWorkOrder)} onToggleWaiting={() => data.setWorkOrderStatus(order.id, order.status === "waiting" ? "in_progress" : "waiting")} />)}</div></section><section className="panel focus-panel"><div className="focus-orb"><WalletCards size={19} /></div><p className="eyebrow">Fechamento integrado</p><h2>Financeiro sem lançar duas vezes</h2><p>Ao concluir uma OS, a conta a receber é criada uma única vez e materiais vinculados são baixados.</p><button className="text-button" type="button" onClick={() => onNavigate("finance")}>Ver financeiro <ArrowUpRight size={15} /></button></section></div></>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: string }) { return <article className="metric-card"><div className={`metric-icon metric-icon-${tone}`}><Icon size={18} /></div><p>{label}</p><strong>{value}</strong><span className="metric-detail">{detail}</span></article>; }

function AgendaView({ onOpen, onCreateOrder, onCreateAt }: { onOpen: (kind: RecordKind, id?: string) => void; onCreateOrder: (appointment: AppointmentRecord) => void; onCreateAt: (date: string, time: string) => void }) {
  const data = useDemoData();
  const [mode, setMode] = useState<AgendaMode>(() => (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches ? "day" : "week"));
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [query, setQuery] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>();
  const [detailAppointmentId, setDetailAppointmentId] = useState<string>();
  const weekStart = startOfAgendaWeek(selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => moveAgendaDate(weekStart, index)), [weekStart]);
  const list = useMemo(() => data.appointments.filter((item) => {
    const matchesPeriod = mode === "day"
      ? item.date === selectedDate
      : mode === "week"
        ? item.date >= weekDays[0] && item.date <= weekDays[weekDays.length - 1]
        : item.date.slice(0, 7) === selectedDate.slice(0, 7);
    const matchesQuery = `${item.client} ${item.service} ${item.address}`.toLowerCase().includes(query.toLowerCase());
    return matchesPeriod && matchesQuery;
  }), [data.appointments, mode, query, selectedDate, weekDays]);
  const professionals = useMemo(() => Array.from(new Set(list.map((item) => item.professional))), [list]);
  const selectedAppointment = data.appointments.find((item) => item.id === selectedAppointmentId) ?? list[0] ?? null;
  const selectedClient = selectedAppointment ? data.clients.find((client) => client.id === selectedAppointment.clientId) : undefined;
  const selectedConflicts = selectedAppointment ? findConflicts(selectedAppointment, data.appointments) : [];
  const conflictCount = list.filter((item) => findConflicts(item, data.appointments).length > 0).length;
  const detailAppointment = data.appointments.find((item) => item.id === detailAppointmentId);
  const periodLabel = mode === "day"
    ? agendaLongDateLabel(selectedDate)
    : mode === "week"
      ? `${parseAgendaDate(weekDays[0]).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${parseAgendaDate(weekDays[6]).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
      : agendaMonthLabel(selectedDate);

  function chooseDate(date: string) {
    setSelectedDate(date);
    setSelectedAppointmentId(undefined);
  }

  function shiftPeriod(amount: number) {
    chooseDate(mode === "month" ? moveAgendaMonth(selectedDate, amount) : moveAgendaDate(selectedDate, mode === "week" ? amount * 7 : amount));
  }

  function selectAppointment(appointment: AppointmentRecord) {
    setSelectedAppointmentId(appointment.id);
    setSelectedDate(appointment.date);
  }

  function updateAppointment(appointmentId: string, patch: AppointmentPatch) {
    data.updateAppointment(appointmentId, patch);
    setSelectedAppointmentId(appointmentId);
    if (patch.date) setSelectedDate(patch.date);
  }

  return <section className="panel full-panel agenda-workspace">
    <PanelHeader eyebrow={`${list.length} compromisso(s) no período`} title="Calendário operacional" action="Novo agendamento" onAction={() => onOpen("appointment")} />
    <div className="agenda-controls">
      <div className="agenda-period-navigation">
        <button className="icon-button agenda-nav-button" type="button" onClick={() => shiftPeriod(-1)} aria-label={mode === "day" ? "Dia anterior" : mode === "week" ? "Semana anterior" : "Mês anterior"}><ChevronLeft size={17} /></button>
        <button className="agenda-today-button" type="button" onClick={() => chooseDate(todayDate())}>Hoje</button>
        <button className="icon-button agenda-nav-button" type="button" onClick={() => shiftPeriod(1)} aria-label={mode === "day" ? "Próximo dia" : mode === "week" ? "Próxima semana" : "Próximo mês"}><ChevronRight size={17} /></button>
        <strong>{periodLabel}</strong>
      </div>
      <div className="agenda-view-switcher" role="tablist" aria-label="Modo de visualização da agenda">
        {(["day", "week", "month"] as AgendaMode[]).map((item) => <button key={item} className={mode === item ? "agenda-view-active" : ""} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)}>{item === "day" ? "Dia" : item === "week" ? "Semana" : "Mês"}</button>)}
      </div>
    </div>
    <div className="agenda-toolbar-bottom">
      <span><CalendarDays size={15} /> {mode === "day" ? "Visualização diária" : mode === "week" ? "Agenda até 00:00 · arraste para mover e use a seta ↕ para ajustar" : "Visão ampla do mês"}</span>
      <div className="agenda-professional-legend" aria-label="Legenda de responsáveis">{professionals.map((professional) => <span key={professional}><i className={`agenda-professional-dot agenda-professional-${professionalColor(professional)}`} />{professional}</span>)}</div>
      {conflictCount > 0 && <span className="agenda-conflict-badge" role="status">{conflictCount} compromisso(s) com horário em conflito</span>}
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, serviço ou endereço" aria-label="Filtrar agenda" /></label>
    </div>
    <div className="agenda-calendar-layout">
      <div className="agenda-calendar-main">
        {mode === "day" && <div className="agenda-day-view"><div className="agenda-calendar-caption"><div><p className="eyebrow">Agenda do dia</p><h3>{agendaLongDateLabel(selectedDate)}</h3></div><span>{list.length} compromisso(s)</span></div><AgendaWeekView days={[selectedDate]} appointments={list} selectedDate={selectedDate} onSelectDate={chooseDate} onSelect={selectAppointment} onOpenDetail={setDetailAppointmentId} onUpdate={updateAppointment} onCreateAt={onCreateAt} /></div>}
        {mode === "week" && <AgendaWeekView days={weekDays} appointments={list} selectedDate={selectedDate} onSelectDate={chooseDate} onSelect={selectAppointment} onOpenDetail={setDetailAppointmentId} onUpdate={updateAppointment} onCreateAt={onCreateAt} />}
        {mode === "month" && <AgendaMonthView date={selectedDate} appointments={list} selectedDate={selectedDate} onSelectDate={chooseDate} />}
        {!list.length && <div className="agenda-filter-empty"><EmptyState message="Nenhum compromisso corresponde ao filtro neste período." /></div>}
      </div>
      <AgendaDetails appointment={selectedAppointment} client={selectedClient} conflicts={selectedConflicts} onOpenDetail={setDetailAppointmentId} onOpen={onOpen} onUpdate={updateAppointment} onRemove={(appointmentId) => { data.removeAppointment(appointmentId); setSelectedAppointmentId(undefined); }} />
    </div>
    {detailAppointment && <AppointmentOrderDialog appointment={detailAppointment} onClose={() => setDetailAppointmentId(undefined)} onOpen={onOpen} onCreateOrder={onCreateOrder} />}
  </section>;
}

type AgendaPointerHandler = (event: ReactPointerEvent<HTMLElement>) => void;

function AgendaAppointmentCard({ appointment, onSelect, onOpenDetail, compact = false, style, onStartDrag, onStartResize }: { appointment: AppointmentRecord; onSelect: (appointment: AppointmentRecord) => void; onOpenDetail?: (appointmentId: string) => void; compact?: boolean; style?: CSSProperties; onStartDrag?: AgendaPointerHandler; onStartResize?: AgendaPointerHandler }) {
  return <div
    className={`agenda-appointment-card agenda-tone-${professionalColor(appointment.professional)} ${compact ? "agenda-appointment-card-compact" : ""} ${onStartDrag ? "agenda-appointment-card-draggable" : ""}`}
    role="button"
    tabIndex={0}
    style={style}
    aria-label={`${timeRange(appointment)} ${appointment.client} ${appointment.service}. Clique duas vezes para abrir a ordem de serviço e os dados do cliente. Arraste para mover. Puxe a alça inferior para alterar a duração.`}
    onClick={() => { onSelect(appointment); if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) onOpenDetail?.(appointment.id); }}
    onDoubleClick={() => onOpenDetail?.(appointment.id)}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(appointment); } }}
    onPointerDown={(event) => { if (!onStartDrag || (event.pointerType === "mouse" && event.button !== 0)) return; event.preventDefault(); onStartDrag(event as ReactPointerEvent<HTMLElement>); }}
  >
    <span className="agenda-card-time"><i className={`agenda-professional-dot agenda-professional-${professionalColor(appointment.professional)}`} />{timeRange(appointment)}</span>
    <span className="agenda-card-copy"><strong>{appointment.client}</strong><span>{appointment.service}</span>{!compact && <small><MapPin size={11} /> {appointment.address}</small>}</span>
    <StatusPill status={appointment.status} />
    {onStartResize && <button className="agenda-resize-handle" type="button" aria-label={`Alterar duração de ${appointment.client}`} onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onStartResize(event as ReactPointerEvent<HTMLElement>); }}><ArrowUpDown size={13} /></button>}
  </div>;
}

type AgendaInteraction = {
  type: "drag" | "resize";
  pointerId: number;
  appointmentId: string;
  startX: number;
  startY: number;
  originDate: string;
  originMinutes: number;
  originDurationMinutes: number;
  date: string;
  minutes: number;
  durationMinutes: number;
};

function AgendaWeekView({ days, appointments, selectedDate, onSelectDate, onSelect, onOpenDetail, onUpdate, onCreateAt }: { onCreateAt?: (date: string, time: string) => void; onOpenDetail: (appointmentId: string) => void; days: string[]; appointments: AppointmentRecord[]; selectedDate: string; onSelectDate: (date: string) => void; onSelect: (appointment: AppointmentRecord) => void; onUpdate: (appointmentId: string, patch: AppointmentPatch) => void }) {
  const [interaction, setInteraction] = useState<AgendaInteraction | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const viewRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [fullDay, setFullDay] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Altura da hora menor no celular e faixa de horas que acompanha os compromissos (sem rolar até a meia-noite à toa).
  const hourHeight = narrow ? 44 : AGENDA_HOUR_HEIGHT;
  const level = days.length === 1 ? 3 : zoom ?? (narrow ? 0 : 2);
  const axisWidth = narrow ? 36 : 56;
  const inView = appointments.filter((item) => days.includes(item.date));
  const earliest = inView.reduce((value, item) => Math.min(value, appointmentMinutes(item)), AGENDA_START_MINUTES);
  const latest = inView.reduce((value, item) => Math.max(value, appointmentMinutes(item) + appointmentDurationMinutes(item)), 0);
  const rangeStart = Math.floor(earliest / 60) * 60;
  const rangeEnd = fullDay ? AGENDA_END_MINUTES : Math.min(AGENDA_END_MINUTES, Math.max(20 * 60, Math.ceil(latest / 60) * 60));
  const hourRows = Array.from({ length: Math.max(1, Math.round((rangeEnd - rangeStart) / 60)) }, (_, index) => {
    const hour = (rangeStart / 60 + index) % 24;
    return narrow ? `${hour}h` : `${String(hour).padStart(2, "0")}:00`;
  });
  const columnWidths = ["minmax(0, 1fr)", "minmax(84px, 1fr)", "minmax(120px, 1fr)", "minmax(160px, 1fr)"];

  // No celular a semana é mais larga que a tela: leva o dia selecionado para a vista.
  useEffect(() => {
    const view = viewRef.current;
    const column = columnRefs.current[selectedDate]?.parentElement;
    if (!view || !column || days.length < 2 || view.scrollWidth <= view.clientWidth) return;
    const axisWidth = view.querySelector<HTMLElement>(".agenda-week-axis")?.offsetWidth ?? 0;
    const left = column.getBoundingClientRect().left - view.getBoundingClientRect().left + view.scrollLeft - axisWidth;
    view.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selectedDate, days]);

  function beginInteraction(event: ReactPointerEvent<HTMLElement>, appointment: AppointmentRecord, type: AgendaInteraction["type"]) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const minutes = appointmentMinutes(appointment);
    const durationMinutes = appointmentDurationMinutes(appointment);
    onSelect(appointment);
    setInteraction({ type, pointerId: event.pointerId, appointmentId: appointment.id, startX: event.clientX, startY: event.clientY, originDate: appointment.date, originMinutes: minutes, originDurationMinutes: durationMinutes, date: appointment.date, minutes, durationMinutes });
  }

  function findDateAtX(clientX: number, fallback: string) {
    return days.find((date) => {
      const rect = columnRefs.current[date]?.getBoundingClientRect();
      return rect && clientX >= rect.left && clientX <= rect.right;
    }) ?? fallback;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    setInteraction((current) => {
      if (!current || current.pointerId !== event.pointerId) return current;
      event.preventDefault();
      const deltaMinutes = Math.round(((event.clientY - current.startY) * 60 / hourHeight) / AGENDA_SNAP_MINUTES) * AGENDA_SNAP_MINUTES;
      if (current.type === "resize") {
        const maximumDuration = rangeEnd - current.originMinutes;
        return { ...current, durationMinutes: clampAgendaMinutes(current.originDurationMinutes + deltaMinutes, AGENDA_SNAP_MINUTES, maximumDuration) };
      }
      const maximumStart = rangeEnd - current.originDurationMinutes;
      return { ...current, date: findDateAtX(event.clientX, current.originDate), minutes: clampAgendaMinutes(current.originMinutes + deltaMinutes, rangeStart, maximumStart) };
    });
  }

  function finishInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const appointment = appointments.find((item) => item.id === interaction.appointmentId);
    const changed = appointment && (interaction.date !== interaction.originDate || interaction.minutes !== interaction.originMinutes || interaction.durationMinutes !== interaction.originDurationMinutes);
    if (appointment && changed) {
      const patch: AppointmentPatch = { date: interaction.date, time: formatAgendaTime(interaction.minutes), duration: formatAgendaDuration(interaction.durationMinutes) };
      if (appointment.endDate === appointment.date) patch.endDate = interaction.date;
      onUpdate(appointment.id, patch);
    }
    setInteraction(null);
  }

  return <div className="agenda-week-wrap"><div className="agenda-week-tools" role="group" aria-label="Ajustes da grade">
    {days.length > 1 && <><button type="button" className="agenda-tool-button" onClick={() => setZoom(Math.max(0, level - 1))} disabled={level === 0} aria-label="Diminuir zoom">−</button><span className="agenda-tool-label">{level === 0 ? "Semana inteira" : `Zoom ${level}/3`}</span><button type="button" className="agenda-tool-button" onClick={() => setZoom(Math.min(3, level + 1))} disabled={level === 3} aria-label="Aumentar zoom">+</button></>}
    <button type="button" className={`agenda-tool-toggle ${fullDay ? "agenda-tool-toggle-on" : ""}`} aria-pressed={fullDay} onClick={() => setFullDay((value) => !value)}>{fullDay ? "Mostrando até 00h" : `Mostrando ${rangeStart / 60}h–${rangeEnd / 60 === 25 ? "00" : rangeEnd / 60}h`}</button>
  </div><div ref={viewRef} data-zoom={level} className={`agenda-week-view ${days.length === 1 ? "agenda-week-view-single" : ""}`} onPointerMove={handlePointerMove} onPointerUp={finishInteraction} onPointerCancel={finishInteraction}><div className="agenda-week-grid" style={{ gridTemplateColumns: `${axisWidth}px repeat(${days.length}, ${columnWidths[level]})`, minWidth: 0 }}><div className="agenda-week-axis"><div className="agenda-week-axis-head">{narrow ? "" : "Horário"}</div>{hourRows.map((hour) => <div className="agenda-week-hour" key={hour} style={{ height: hourHeight }}>{hour}</div>)}</div>{days.map((date) => {
    const dayAppointments = appointments.map((appointment) => {
      const active = interaction?.appointmentId === appointment.id ? interaction : undefined;
      return { appointment, date: active?.date ?? appointment.date, minutes: active?.minutes ?? appointmentMinutes(appointment), durationMinutes: active?.durationMinutes ?? appointmentDurationMinutes(appointment) };
    }).filter((item) => item.date === date).sort((a, b) => a.minutes - b.minutes);
    return <div className={`agenda-week-column ${date === selectedDate ? "agenda-week-column-active" : ""}`} key={date}>
      <button className="agenda-week-day" type="button" onClick={() => onSelectDate(date)}><span>{agendaShortWeekday(date)}</span><strong>{parseAgendaDate(date).getDate()}</strong><small>{dayAppointments.length} ag.</small></button>
      <div className="agenda-week-column-body" ref={(node) => { columnRefs.current[date] = node; }} data-agenda-date={date} style={{ height: hourRows.length * hourHeight }} onClick={(event) => {
        if (!onCreateAt || (event.target as HTMLElement).closest(".agenda-appointment-card")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const offset = Math.max(0, Math.floor(((event.clientY - rect.top) * 60 / hourHeight) / AGENDA_SNAP_MINUTES) * AGENDA_SNAP_MINUTES);
        onCreateAt(date, formatAgendaTime(Math.min(rangeEnd - AGENDA_SNAP_MINUTES, rangeStart + offset)));
      }}>
        {hourRows.map((hour, index) => <div className="agenda-week-time-slot" key={hour} aria-label={`${agendaShortWeekday(date)} ${hour}`} style={{ top: `${index * hourHeight}px`, height: hourHeight }} />)}
        {dayAppointments.map(({ appointment, minutes, durationMinutes }) => <AgendaAppointmentCard key={appointment.id} appointment={{ ...appointment, date, time: formatAgendaTime(minutes), duration: formatAgendaDuration(durationMinutes) }} onSelect={onSelect} onOpenDetail={onOpenDetail} compact style={{ top: `${(minutes - rangeStart) * hourHeight / 60 + 2}px`, height: `${Math.max(20, durationMinutes * hourHeight / 60 - 4)}px` }} onStartDrag={(event) => beginInteraction(event, appointment, "drag")} onStartResize={(event) => beginInteraction(event, appointment, "resize")} />)}
      </div>
    </div>;
  })}</div></div></div>;
}

function AgendaMonthView({ date, appointments, selectedDate, onSelectDate }: { date: string; appointments: AppointmentRecord[]; selectedDate: string; onSelectDate: (date: string) => void }) {
  const monthDays = getAgendaMonthDays(date);
  const monthKey = date.slice(0, 7);
  return <div className="agenda-month-view"><div className="agenda-weekday-row">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div><div className="agenda-month-grid">{monthDays.map((day) => { const dayAppointments = appointments.filter((appointment) => appointment.date === day).sort((a, b) => a.time.localeCompare(b.time)); const inMonth = day.slice(0, 7) === monthKey; return <button className={`agenda-month-cell ${inMonth ? "" : "agenda-month-cell-muted"} ${day === selectedDate ? "agenda-month-cell-active" : ""}`} key={day} type="button" onClick={() => onSelectDate(day)}><span className="agenda-month-number">{parseAgendaDate(day).getDate()}</span><span className="agenda-month-items">{dayAppointments.slice(0, 3).map((appointment) => <span className={`agenda-month-item agenda-tone-${professionalColor(appointment.professional)}`} key={appointment.id}><i className={`agenda-professional-dot agenda-professional-${professionalColor(appointment.professional)}`} /><b>{appointment.time}</b> {appointment.client}</span>)}{dayAppointments.length > 3 && <small>+{dayAppointments.length - 3} mais</small>}</span></button>; })}</div></div>;
}

const AGENDA_STATUS_OPTIONS: Array<{ value: AppointmentRecord["status"]; label: string }> = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "in_progress", label: "Em andamento" },
];

function isValidAgendaTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidAgendaDuration(value: string) {
  return /dia/i.test(value) || /\d+\s*h/i.test(value) || /\d+\s*min/i.test(value);
}

type AgendaDetailsProps = {
  appointment: AppointmentRecord | null;
  client?: ClientRecord;
  conflicts: AppointmentRecord[];
  onOpen: (kind: RecordKind, id?: string) => void;
  onOpenDetail: (appointmentId: string) => void;
  onUpdate: (appointmentId: string, patch: AppointmentPatch) => void;
  onRemove: (appointmentId: string) => void;
};

function AgendaDetails(props: AgendaDetailsProps) {
  const { appointment } = props;
  if (!appointment) return <aside className="agenda-details agenda-details-empty"><CalendarDays size={22} /><p>Selecione um compromisso para ver os detalhes.</p><span>A agenda reúne cliente, horário, endereço, observações e vínculo com a ordem de serviço.</span></aside>;
  return <AgendaDetailsBody key={appointment.id} {...props} appointment={appointment} />;
}

function AgendaDetailsBody({ appointment, client, conflicts, onOpen, onOpenDetail, onUpdate, onRemove }: Omit<AgendaDetailsProps, "appointment"> & { appointment: AppointmentRecord }) {
  const data = useDemoData();
  const series = appointment.seriesId ? data.appointments.filter((item) => item.seriesId === appointment.seriesId).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const seriesIndex = series.findIndex((item) => item.id === appointment.id);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ date: appointment.date, time: appointment.time, duration: appointment.duration, professional: appointment.professional, notes: appointment.notes, applyAll: false });

  function save() {
    const professional = draft.professional.trim();
    if (!draft.date) return setError("Informe a data.");
    if (!isValidAgendaTime(draft.time)) return setError("Use um horário válido, como 08:30.");
    if (!isValidAgendaDuration(draft.duration)) return setError("Use uma duração como 1h, 1h 30, 45 min ou Dia inteiro.");
    if (!professional) return setError("Informe o responsável.");
    const clashes = findConflicts({ id: appointment.id, date: draft.date, time: draft.time, duration: draft.duration, professional }, data.appointments);
    if (clashes.length && !window.confirm(`${professional} já tem compromisso nesse horário (${clashes[0].client}, ${clashes[0].time}). Salvar mesmo assim?`)) return;
    const single = !appointment.cadence || appointment.cadence === "single";
    onUpdate(appointment.id, { date: draft.date, time: draft.time, duration: draft.duration.trim(), professional, notes: draft.notes, ...(single ? { endDate: draft.date } : {}) });
    if (draft.applyAll) series.filter((item) => item.id !== appointment.id).forEach((item) => onUpdate(item.id, { time: draft.time, duration: draft.duration.trim(), professional }));
    setError("");
    setEditing(false);
  }

  function removeSeries() {
    if (window.confirm(`Remover os ${series.length} dias deste serviço de ${appointment.client}? Esta ação não pode ser desfeita.`)) series.forEach((item) => onRemove(item.id));
  }

  function remove() {
    if (window.confirm(`Remover o agendamento de ${appointment.client} (${agendaLongDateLabel(appointment.date)}, ${appointment.time})? Esta ação não pode ser desfeita.`)) onRemove(appointment.id);
  }

  return <aside className="agenda-details">
    <div className="agenda-details-head"><div><p className="eyebrow">Compromisso selecionado</p><h3>{appointment.client}</h3><span>{appointment.service}</span></div><StatusPill status={appointment.status} /></div>
    {conflicts.length > 0 && <div className="agenda-conflict-note" role="alert"><strong>Conflito de horário</strong><p>{conflicts.map((item) => `${item.client} (${item.time}, ${item.duration})`).join("; ")} — mesmo responsável, no mesmo horário.</p></div>}
    <div className="agenda-status-row" role="group" aria-label="Situação do compromisso">{AGENDA_STATUS_OPTIONS.map((option) => <button key={option.value} type="button" className={`filter-pill ${appointment.status === option.value ? "filter-pill-active" : ""}`} aria-pressed={appointment.status === option.value} onClick={() => onUpdate(appointment.id, { status: option.value })}>{option.label}</button>)}</div>
    {editing ? <div className="agenda-edit-form">
      <div className="agenda-edit-grid">
        <label className="field-wrap">Data<input type="date" value={draft.date} onChange={(event) => setDraft((previous) => ({ ...previous, date: event.target.value }))} /></label>
        <label className="field-wrap">Horário<input type="time" value={draft.time} onChange={(event) => setDraft((previous) => ({ ...previous, time: event.target.value }))} /></label>
        <label className="field-wrap">Duração<input value={draft.duration} placeholder="1h 30" onChange={(event) => setDraft((previous) => ({ ...previous, duration: event.target.value }))} /></label>
        <label className="field-wrap">Responsável<input value={draft.professional} onChange={(event) => setDraft((previous) => ({ ...previous, professional: event.target.value }))} /></label>
      </div>
      {series.length > 1 && <label className="agenda-apply-all"><input type="checkbox" checked={draft.applyAll} onChange={(event) => setDraft((previous) => ({ ...previous, applyAll: event.target.checked }))} />Aplicar horário, duração e responsável aos {series.length} dias</label>}{isValidAgendaTime(draft.time) && isValidAgendaDuration(draft.duration) && <p className="agenda-edit-hint">Termina às {endTime({ time: draft.time, duration: draft.duration })}</p>}
      <label className="field-wrap"><span className="field-label-row"><span>Observações</span><VoiceDictationButton value={draft.notes} onChange={(text) => setDraft((previous) => ({ ...previous, notes: text }))} /></span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft((previous) => ({ ...previous, notes: event.target.value }))} /></label>
      {error && <p className="agenda-edit-error" role="alert">{error}</p>}
      <div className="agenda-detail-actions"><button className="secondary-button" type="button" onClick={() => { setEditing(false); setError(""); }}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Salvar alterações</button></div>
    </div> : <>
      <div className="agenda-detail-list"><div><CalendarDays size={15} /><span><small>Data</small><strong>{agendaLongDateLabel(appointment.date)}</strong></span></div>{series.length > 1 ? <div><CalendarDays size={15} /><span><small>Serviço de vários dias</small><strong>Dia {seriesIndex + 1} de {series.length} · {series[0].date.split("-").reverse().slice(0, 2).join("/")} a {series[series.length - 1].date.split("-").reverse().slice(0, 2).join("/")} · {appointmentCadenceLabel(appointment.cadence)}</strong></span></div> : appointment.endDate && appointment.endDate !== appointment.date && <div><CalendarDays size={15} /><span><small>Período reservado</small><strong>Até {agendaLongDateLabel(appointment.endDate)} · {appointmentCadenceLabel(appointment.cadence)}</strong></span></div>}<div><Clock3 size={15} /><span><small>Horário e duração</small><strong>{timeRange(appointment)} · {appointment.duration}</strong></span></div><div><Users size={15} /><span><small>Responsável</small><strong>{appointment.professional}</strong></span></div><div><MapPin size={15} /><span><small>Local</small><strong>{appointment.address}</strong></span></div>{client?.phone && <div><MessageCircle size={15} /><span><small>Contato rápido</small><WhatsAppLink phone={client.phone} label="Enviar lembrete pelo WhatsApp" message={`Olá, ${client.name}! Confirmando o serviço de ${appointment.service} em ${agendaLongDateLabel(appointment.date)} às ${appointment.time}.`} /></span></div>}</div>
      {appointment.notes && <div className="agenda-notes"><small>Observações</small><p>{appointment.notes}</p></div>}
      <div className="agenda-detail-actions"><button className="primary-button" type="button" onClick={() => onOpenDetail(appointment.id)}>Ver ordem e dados do cliente</button><button className="secondary-button" type="button" onClick={() => setEditing(true)}>Editar compromisso</button>{appointment.workOrderId && <button className="secondary-button" type="button" onClick={() => onOpen("diary", appointment.workOrderId)}>Abrir diário da OS</button>}<button className="table-action" type="button" onClick={remove}>Remover este dia</button>{series.length > 1 && <button className="table-action" type="button" onClick={removeSeries}>Remover todos os {series.length} dias</button>}</div>
    </>}
  </aside>;
}

function AppointmentOrderDialog({ appointment, onClose, onOpen, onCreateOrder }: { appointment: AppointmentRecord; onClose: () => void; onOpen: (kind: RecordKind, id?: string) => void; onCreateOrder: (appointment: AppointmentRecord) => void }) {
  const data = useDemoData();
  const client = data.clients.find((item) => item.id === appointment.clientId);
  const order = appointment.workOrderId ? data.workOrders.find((item) => item.id === appointment.workOrderId) : undefined;
  const otherOrders = data.workOrders.filter((item) => item.clientId === appointment.clientId && item.id !== order?.id);
  const charges = order ? data.finance.filter((item) => item.originId === order.id) : [];
  const stockName = (stockId: string) => data.stock.find((item) => item.id === stockId)?.name ?? stockId;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function closeOrder() {
    if (order) confirmCloseOrder(order.id, data.closeWorkOrder);
  }

  return <div className="dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="record-dialog order-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
      <header><div><p className="eyebrow">Agendamento · {agendaLongDateLabel(appointment.date)}</p><h2 id="order-detail-title">{appointment.client}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
      <div className="dialog-body order-detail-body">
        <section className="order-detail-section">
          <h3>Compromisso</h3>
          <dl className="order-detail-grid">
            <div><dt>Serviço</dt><dd>{appointment.service}</dd></div>
            <div><dt>Horário</dt><dd>{timeRange(appointment)} · {appointment.duration}</dd></div>
            <div><dt>Responsável</dt><dd>{appointment.professional}</dd></div>
            <div><dt>Situação</dt><dd><StatusPill status={appointment.status} /></dd></div>
            <div className="order-detail-wide"><dt>Local</dt><dd>{appointment.address}</dd></div>
            {appointment.notes && <div className="order-detail-wide"><dt>Observações</dt><dd>{appointment.notes}</dd></div>}
          </dl>
        </section>
        <section className="order-detail-section">
          <h3>Cliente</h3>
          {client ? <>
            <dl className="order-detail-grid">
              <div><dt>Nome</dt><dd>{client.name}</dd></div>
              <div><dt>Tipo</dt><dd>{client.kind === "pj" ? "Pessoa jurídica" : "Pessoa física"}{client.document ? ` · ${client.document}` : ""}</dd></div>
              <div><dt>Telefone</dt><dd>{client.phone || "Não informado"}</dd></div>
              <div><dt>E-mail</dt><dd>{client.email || "Não informado"}</dd></div>
              <div className="order-detail-wide"><dt>Endereço</dt><dd>{[client.address, [client.city, client.state].filter(Boolean).join(" · "), client.cep].filter(Boolean).join(" — ") || "Não informado"}</dd></div>
            </dl>
            <WhatsAppLink phone={client.phone} label="Conversar no WhatsApp" message={`Olá, ${client.name}! Sobre o serviço de ${appointment.service} em ${agendaLongDateLabel(appointment.date)} às ${appointment.time}.`} />
            {client.history.length > 0 && <ul className="order-detail-list">{client.history.slice(0, 5).map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}</ul>}
          </> : <p className="order-detail-empty">Cadastro do cliente não encontrado.</p>}
        </section>
        <section className="order-detail-section">
          <h3>Ordem de serviço</h3>
          {order ? <>
            <div className="order-detail-meta"><strong>{order.id}</strong><StatusPill status={order.status} /><span>{formatBRL(order.amountCents)}</span><small>{order.updatedAt}</small></div>
            <dl className="order-detail-grid">
              <div className="order-detail-wide"><dt>Descrição atual{(order.descriptionHistory?.length ?? 0) > 1 ? ` · ${order.descriptionHistory?.length} versões salvas` : ""}</dt><dd>{order.description}</dd></div>
              <div className="order-detail-wide"><dt>Materiais vinculados</dt><dd>{order.materialLines.length ? order.materialLines.map((line) => `${line.quantity}× ${stockName(line.stockId)}`).join(", ") : "Nenhum"}</dd></div>
              {charges.map((charge) => <div className="order-detail-wide" key={charge.id}><dt>Cobrança gerada</dt><dd>{formatBRL(charge.amountCents)} · vence {charge.dueDate} · {charge.status === "paid" ? "pago" : "em aberto"}</dd></div>)}
            </dl>
            <h4 className="order-detail-subtitle">Diário ({order.diary.length})</h4>
            {order.diary.length ? <ul className="order-detail-list">{order.diary.map((entry) => <li key={entry.id}><time>{entry.createdAt}</time>{entry.text}</li>)}</ul> : <p className="order-detail-empty">Nenhum registro no diário ainda.</p>}
          </> : <div className="order-detail-empty"><p>Este agendamento ainda não tem ordem de serviço.</p><button className="primary-button" type="button" onClick={() => { onClose(); onCreateOrder(appointment); }}>Criar ordem de serviço</button></div>}
        </section>
        {otherOrders.length > 0 && <section className="order-detail-section">
          <h3>Outras ordens deste cliente</h3>
          <ul className="order-detail-list">{otherOrders.map((item) => <li key={item.id}><strong>{item.id}</strong> · {item.service} · {formatBRL(item.amountCents)}<small>{item.updatedAt}</small></li>)}</ul>
        </section>}
      </div>
      <footer><button className="secondary-button" type="button" onClick={onClose}>Fechar</button>{order && order.status !== "completed" && <button className="secondary-button" type="button" onClick={closeOrder}>Fechar ordem</button>}{order && <button className="primary-button" type="button" onClick={() => { onClose(); onOpen("diary", order.id); }}>Registrar no diário</button>}</footer>
    </section>
  </div>;
}

function SettingsView() { const [saved, setSaved] = useState(false); const [messages, setMessages] = useState(true); return <section className="panel full-panel settings-panel"><PanelHeader eyebrow="Preferências por empresa" title="Configurações gerais" action="Salvar alterações" onAction={() => setSaved(true)} /><div className="settings-grid"><label className="field-wrap">Nome de exibição<input defaultValue="Empresa Central" /></label><label className="field-wrap">Segmento<input defaultValue="Serviços e atendimento" /></label><label className="field-wrap">Moeda<select defaultValue="BRL"><option value="BRL">Real brasileiro (R$)</option></select></label><label className="field-wrap">Fuso horário<select defaultValue="America/Sao_Paulo"><option value="America/Sao_Paulo">São Paulo (GMT-3)</option></select></label></div><div className="settings-toggle"><div><strong>Notificações de vencimento</strong><span>Receba alertas de contas em aberto e estoque baixo.</span></div><button type="button" className={messages ? "toggle-active" : "toggle"} onClick={() => setMessages((value) => !value)} aria-pressed={messages}><span /></button></div>{saved && <p className="settings-success"><CheckCircle2 size={16} /> Preferências salvas nesta demonstração.</p>}<div className="permissions-note"><ShieldCheck size={17} /><span>Em produção, preferências, permissões, convite e dados devem ser gravados no tenant autenticado e validados no servidor.</span></div></section>; }
