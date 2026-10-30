"use client";

import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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

type Status = "in_progress" | "waiting" | "completed" | "confirmed" | "pending" | "paid" | "open" | "overdue";
type AgendaMode = "day" | "week" | "month";

const DEMO_TODAY = "2026-10-29";
const AGENDA_HOURS = Array.from({ length: 13 }, (_, index) => `${String(index + 7).padStart(2, "0")}:00`);
const AGENDA_START_MINUTES = 7 * 60;
const AGENDA_END_MINUTES = 20 * 60;
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
  const [hours, minutes] = appointment.time.split(":").map(Number);
  return hours * 60 + minutes;
}

function appointmentDurationMinutes(appointment: AppointmentRecord) {
  if (appointment.duration.toLowerCase().includes("dia")) return 8 * 60;
  const duration = appointment.duration.match(/(\d+)h(?:\s*(\d+))?/i);
  const minutesOnly = appointment.duration.match(/(\d+)\s*min/i);
  return Math.max(AGENDA_SNAP_MINUTES, (Number(duration?.[1] ?? 0) * 60) + Number(duration?.[2] ?? minutesOnly?.[1] ?? 0));
}

function snapAgendaMinutes(value: number) {
  return Math.round(value / AGENDA_SNAP_MINUTES) * AGENDA_SNAP_MINUTES;
}

function clampAgendaMinutes(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatAgendaTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
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

function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function WhatsAppLink({ phone, message, label }: { phone: string; message: string; label: string }) {
  const href = whatsappHref(phone, message);
  return href ? <a className="whatsapp-link" href={href} target="_blank" rel="noreferrer"><MessageCircle size={12} /> {label}</a> : <span className="whatsapp-link whatsapp-link-disabled"><MessageCircle size={12} /> WhatsApp não informado</span>;
}

function StatusPill({ status }: { status: Status }) {
  const copy: Record<Status, string> = { in_progress: "Em andamento", waiting: "Aguardando", completed: "Concluída", confirmed: "Confirmado", pending: "Pendente", paid: "Pago", open: "Em aberto", overdue: "Vencido" };
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{copy[status]}</span>;
}

function PanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction: () => void }) {
  return <div className="panel-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="panel-action" type="button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button></div>;
}

export function OperationalDashboard() {
  const data = useDemoData();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<RecordKind | null>(null);
  const [workOrderId, setWorkOrderId] = useState<string>();
  const copy = sectionCopy[activeSection];
  const todayAppointments = data.appointments.filter((appointment) => appointment.date === "2026-10-29").length;

  function navigate(section: SectionId) { setActiveSection(section); setQuickOpen(false); setMobileMenuOpen(false); }
  function open(kind: RecordKind, orderId?: string) { setWorkOrderId(orderId); setDialog(kind); setQuickOpen(false); }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><div className="brand-mark"><span /><span /><span /></div><div><strong>orquestra<span>.</span></strong><small>ONE</small></div></div>
      <button className="workspace-switcher" type="button" onClick={() => navigate("settings")}><span className="workspace-avatar">EC</span><span className="workspace-copy"><strong>Empresa Central</strong><small>Workspace principal</small></span><ChevronDown size={16} /></button>
      <div className="nav-label">Navegação</div><nav className="main-nav" aria-label="Navegação principal">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`nav-item ${activeSection === id ? "nav-item-active" : ""}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={activeSection === id ? 2.25 : 1.8} /><span>{label}</span>{id === "agenda" && <em>{todayAppointments}</em>}</button>)}</nav>
      <div className="sidebar-spacer" /><div className="sidebar-note"><Sparkles size={16} /><span>Dados operacionais ficam conectados.<br /><strong>Feche a OS sem retrabalho.</strong></span></div>
      <a className="nav-item nav-settings" href="/central-admin"><ShieldCheck size={18} /><span>Central Admin</span></a><button className={`nav-item nav-settings ${activeSection === "settings" ? "nav-item-active" : ""}`} type="button" onClick={() => navigate("settings")}><Settings2 size={18} /><span>Configurações</span></button><div className="sidebar-footer"><ShieldCheck size={14} /> Base preparada para tenant</div>
    </aside>
    {mobileMenuOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}
    <main className="main-content"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-trigger" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><span className="topbar-context">Workspace <ChevronRight size={14} /> <strong>Empresa Central</strong></span></div><div className="topbar-actions"><label className="search-box"><Search size={17} /><input placeholder="Buscar em todo o One" aria-label="Buscar em todo o One" /></label><button className="icon-button notification-button" type="button" aria-label="Notificações"><Bell size={19} /><span /></button><div className="topbar-user"><span className="user-avatar">AL</span><span className="user-name">Alecsander Lima</span><ChevronDown size={15} /></div></div></header>
      <div className="page-wrap"><div className="page-heading"><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="page-description">{copy.description}</p></div><div className="heading-actions"><button className="secondary-button" type="button" onClick={() => navigate("agenda")}><CalendarClock size={17} /> Hoje</button><button className="primary-button" type="button" onClick={() => setQuickOpen((value) => !value)}><Plus size={18} /> Novo registro</button></div></div>
      {quickOpen && <QuickActions onOpen={open} onClose={() => setQuickOpen(false)} />}
      {activeSection === "overview" && <Overview onNavigate={navigate} onOpen={open} />}
      {activeSection === "agenda" && <AgendaView onOpen={open} />}{activeSection === "orders" && <OrdersView onOpen={open} />}{activeSection === "finance" && <FinanceView onOpen={open} />}{activeSection === "stock" && <StockView onOpen={open} />}{activeSection === "clients" && <ClientsView onOpen={open} />}{activeSection === "suppliers" && <SuppliersView onOpen={open} />}{activeSection === "reports" && <ReportsView />}{activeSection === "team" && <TeamView onOpen={open} />}{activeSection === "settings" && <SettingsView />}
      </div></main>
    <nav className="mobile-nav" aria-label="Navegação mobile">{navigation.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={activeSection === id ? "mobile-nav-active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label.split(" ")[0]}</span></button>)}</nav>
    {dialog && <RecordDialog kind={dialog} workOrderId={workOrderId} onClose={() => setDialog(null)} />}
  </div>;
}

function QuickActions({ onOpen, onClose }: { onOpen: (kind: RecordKind) => void; onClose: () => void }) {
  const actions: Array<{ label: string; description: string; icon: LucideIcon; kind: RecordKind }> = [{ label: "Nova ordem de serviço", description: "Comece um atendimento", icon: FilePlus2, kind: "order" }, { label: "Registrar lançamento", description: "Receita, despesa ou compra", icon: CircleDollarSign, kind: "finance" }, { label: "Adicionar cliente", description: "Salve um novo contato", icon: Users, kind: "client" }];
  return <div className="quick-actions"><div className="quick-actions-head"><div><p className="eyebrow">Ação rápida</p><h2>O que você precisa registrar?</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar ações rápidas"><X size={18} /></button></div><div className="quick-action-grid">{actions.map(({ label, description, icon: Icon, kind }) => <button key={label} type="button" className="quick-action" onClick={() => onOpen(kind)}><span className="quick-action-icon"><Icon size={19} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={16} /></button>)}</div></div>;
}

function AppointmentRow({ appointment }: { appointment: ReturnType<typeof useDemoData>["appointments"][number] }) { return <div className="appointment-row"><div className="appointment-time"><strong>{appointment.time}</strong><span>{appointment.duration}</span></div><div className="appointment-line"><span className={`appointment-marker marker-${appointment.status}`} /></div><div className="appointment-info"><div className="appointment-title"><strong>{appointment.client}</strong><StatusPill status={appointment.status} /></div><span>{appointment.service}</span><small><MapPin size={12} /> {appointment.address}</small></div></div>; }
function OrderRow({ order, onDiary, onClose, onDescription }: { order: WorkOrderRecord; onDiary: () => void; onClose: () => void; onDescription?: () => void }) { return <div className="order-row operational-order-row"><div className="order-id">{order.id}</div><div className="order-info"><strong>{order.service}</strong><span>{order.client} · {order.professional}{order.diary.length ? ` · ${order.diary.length} registro(s)` : ""}</span></div><div className="order-amount">{formatBRL(order.amountCents)}<small>{order.updatedAt}</small></div><StatusPill status={order.status} /><div className="row-actions"><button className="table-action" type="button" onClick={onDiary}>Diário</button>{onDescription && <button className="table-action" type="button" onClick={onDescription}>Descrição</button>}{order.status !== "completed" && <button className="table-action table-action-success" type="button" onClick={onClose}>Fechar</button>}</div></div>; }

function Overview({ onNavigate, onOpen }: { onNavigate: (section: SectionId) => void; onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData(); const receivable = data.finance.filter((item) => item.type === "receivable" && item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0); const payable = data.finance.filter((item) => item.type === "payable" && item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0); const active = data.workOrders.filter((order) => order.status === "in_progress").length;
  return <><section className="metric-grid"><Metric icon={ArrowUpRight} label="A receber" value={formatBRL(receivable)} detail={`${data.finance.filter((item) => item.type === "receivable" && item.status !== "paid").length} títulos em aberto`} tone="mint" /><Metric icon={ArrowDownRight} label="A pagar" value={formatBRL(payable)} detail={`${data.finance.filter((item) => item.type === "payable" && item.status !== "paid").length} lançamentos`} tone="amber" /><Metric icon={Wrench} label="Serviços ativos" value={String(active).padStart(2, "0")} detail="acompanhe o diário" tone="blue" /><Metric icon={CalendarDays} label="Agenda de hoje" value={String(data.appointments.length).padStart(2, "0")} detail="vincule à ordem ao executar" tone="violet" /></section><div className="main-grid"><section className="panel agenda-panel"><PanelHeader eyebrow="Agenda de hoje" title="Próximos compromissos" action="Ver agenda" onAction={() => onNavigate("agenda")} /><div className="agenda-list">{data.appointments.slice(0, 3).map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}</div><button className="panel-footer-link" type="button" onClick={() => onOpen("appointment")}>Adicionar compromisso <ArrowUpRight size={15} /></button></section><section className="panel focus-panel"><div className="focus-orb"><Activity size={19} /></div><p className="eyebrow">Próximo passo</p><h2>Registre cada andamento</h2><p>O diário da OS preserva decisões, materiais e observações para o fechamento e o relatório final.</p><button className="text-button" type="button" onClick={() => onNavigate("orders")}>Abrir operação <ArrowUpRight size={15} /></button></section></div><div className="content-grid lower-grid"><section className="panel orders-panel"><PanelHeader eyebrow="Operação" title="Ordens em andamento" action="Nova ordem" onAction={() => onOpen("order")} /><div className="order-list">{data.workOrders.filter((order) => order.status !== "completed").slice(0, 3).map((order) => <OrderRow key={order.id} order={order} onDiary={() => onNavigate("orders")} onClose={() => {}} />)}</div></section><section className="panel focus-panel"><div className="focus-orb"><WalletCards size={19} /></div><p className="eyebrow">Fechamento integrado</p><h2>Financeiro sem lançar duas vezes</h2><p>Ao concluir uma OS, a conta a receber é criada uma única vez e materiais vinculados são baixados.</p><button className="text-button" type="button" onClick={() => onNavigate("finance")}>Ver financeiro <ArrowUpRight size={15} /></button></section></div></>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: string }) { return <article className="metric-card"><div className={`metric-icon metric-icon-${tone}`}><Icon size={18} /></div><p>{label}</p><strong>{value}</strong><span className="metric-detail">{detail}</span></article>; }

function AgendaView({ onOpen }: { onOpen: (kind: RecordKind, id?: string) => void }) {
  const data = useDemoData();
  const [mode, setMode] = useState<AgendaMode>("week");
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);
  const [query, setQuery] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>();
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
        <button className="agenda-today-button" type="button" onClick={() => chooseDate(DEMO_TODAY)}>Hoje</button>
        <button className="icon-button agenda-nav-button" type="button" onClick={() => shiftPeriod(1)} aria-label={mode === "day" ? "Próximo dia" : mode === "week" ? "Próxima semana" : "Próximo mês"}><ChevronRight size={17} /></button>
        <strong>{periodLabel}</strong>
      </div>
      <div className="agenda-view-switcher" role="tablist" aria-label="Modo de visualização da agenda">
        {(["day", "week", "month"] as AgendaMode[]).map((item) => <button key={item} className={mode === item ? "agenda-view-active" : ""} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)}>{item === "day" ? "Dia" : item === "week" ? "Semana" : "Mês"}</button>)}
      </div>
    </div>
    <div className="agenda-toolbar-bottom">
      <span><CalendarDays size={15} /> {mode === "day" ? "Visualização diária" : mode === "week" ? "Arraste para mover · use a seta ↕ para ajustar a duração" : "Visão ampla do mês"}</span>
      <div className="agenda-professional-legend" aria-label="Legenda de responsáveis">{professionals.map((professional) => <span key={professional}><i className={`agenda-professional-dot agenda-professional-${professionalColor(professional)}`} />{professional}</span>)}</div>
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, serviço ou endereço" aria-label="Filtrar agenda" /></label>
    </div>
    <div className="agenda-calendar-layout">
      <div className="agenda-calendar-main">
        {mode === "day" && <AgendaDayView date={selectedDate} appointments={list} onSelect={selectAppointment} />}
        {mode === "week" && <AgendaWeekView days={weekDays} appointments={list} selectedDate={selectedDate} onSelectDate={chooseDate} onSelect={selectAppointment} onUpdate={updateAppointment} />}
        {mode === "month" && <AgendaMonthView date={selectedDate} appointments={list} selectedDate={selectedDate} onSelectDate={chooseDate} />}
        {!list.length && <div className="agenda-filter-empty"><EmptyState message="Nenhum compromisso corresponde ao filtro neste período." /></div>}
      </div>
      <AgendaDetails appointment={selectedAppointment} client={selectedClient} onOpen={onOpen} />
    </div>
  </section>;
}

type AgendaPointerHandler = (event: ReactPointerEvent<HTMLElement>) => void;

function AgendaAppointmentCard({ appointment, onSelect, compact = false, style, onStartDrag, onStartResize }: { appointment: AppointmentRecord; onSelect: (appointment: AppointmentRecord) => void; compact?: boolean; style?: CSSProperties; onStartDrag?: AgendaPointerHandler; onStartResize?: AgendaPointerHandler }) {
  return <div
    className={`agenda-appointment-card ${compact ? "agenda-appointment-card-compact" : ""} ${onStartDrag ? "agenda-appointment-card-draggable" : ""}`}
    role="button"
    tabIndex={0}
    style={style}
    aria-label={`${appointment.time} ${appointment.client} ${appointment.service}. Arraste para mover. Puxe a alça inferior para alterar a duração.`}
    onClick={() => onSelect(appointment)}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(appointment); } }}
    onPointerDown={(event) => { if (!onStartDrag || (event.pointerType === "mouse" && event.button !== 0)) return; event.preventDefault(); onStartDrag(event as ReactPointerEvent<HTMLElement>); }}
  >
    <span className="agenda-card-time"><i className={`agenda-professional-dot agenda-professional-${professionalColor(appointment.professional)}`} />{appointment.time}</span>
    <span className="agenda-card-copy"><strong>{appointment.client}</strong><span>{appointment.service}</span>{!compact && <small><MapPin size={11} /> {appointment.address}</small>}</span>
    <StatusPill status={appointment.status} />
    {onStartResize && <button className="agenda-resize-handle" type="button" aria-label={`Alterar duração de ${appointment.client}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onStartResize(event as ReactPointerEvent<HTMLElement>); }}><ArrowUpDown size={13} /></button>}
  </div>;
}

function AgendaDayView({ date, appointments, onSelect }: { date: string; appointments: AppointmentRecord[]; onSelect: (appointment: AppointmentRecord) => void }) {
  return <div className="agenda-day-view"><div className="agenda-calendar-caption"><div><p className="eyebrow">Agenda do dia</p><h3>{agendaLongDateLabel(date)}</h3></div><span>{appointments.length} compromisso(s)</span></div><div className="agenda-time-grid">{AGENDA_HOURS.map((hour) => { const hourAppointments = appointments.filter((appointment) => appointmentHour(appointment) === Number(hour.slice(0, 2))); return <div className="agenda-time-row" key={hour}><div className="agenda-hour-label"><Clock3 size={13} />{hour}</div><div className="agenda-time-slot">{hourAppointments.length ? hourAppointments.map((appointment) => <AgendaAppointmentCard key={appointment.id} appointment={appointment} onSelect={onSelect} />) : <span className="agenda-free-slot">Horário livre</span>}</div></div>; })}</div></div>;
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

function AgendaWeekView({ days, appointments, selectedDate, onSelectDate, onSelect, onUpdate }: { days: string[]; appointments: AppointmentRecord[]; selectedDate: string; onSelectDate: (date: string) => void; onSelect: (appointment: AppointmentRecord) => void; onUpdate: (appointmentId: string, patch: AppointmentPatch) => void }) {
  const [interaction, setInteraction] = useState<AgendaInteraction | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      const deltaMinutes = Math.round(((event.clientY - current.startY) * 60 / AGENDA_HOUR_HEIGHT) / AGENDA_SNAP_MINUTES) * AGENDA_SNAP_MINUTES;
      if (current.type === "resize") {
        const maximumDuration = AGENDA_END_MINUTES - current.originMinutes;
        return { ...current, durationMinutes: clampAgendaMinutes(current.originDurationMinutes + deltaMinutes, AGENDA_SNAP_MINUTES, maximumDuration) };
      }
      const maximumStart = AGENDA_END_MINUTES - current.originDurationMinutes;
      return { ...current, date: findDateAtX(event.clientX, current.originDate), minutes: clampAgendaMinutes(current.originMinutes + deltaMinutes, AGENDA_START_MINUTES, maximumStart) };
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

  return <div className="agenda-week-view" onPointerMove={handlePointerMove} onPointerUp={finishInteraction} onPointerCancel={finishInteraction}><div className="agenda-week-grid"><div className="agenda-week-axis"><div className="agenda-week-axis-head">Horário</div>{AGENDA_HOURS.map((hour) => <div className="agenda-week-hour" key={hour}>{hour}</div>)}</div>{days.map((date) => {
    const dayAppointments = appointments.map((appointment) => {
      const active = interaction?.appointmentId === appointment.id ? interaction : undefined;
      return { appointment, date: active?.date ?? appointment.date, minutes: active?.minutes ?? appointmentMinutes(appointment), durationMinutes: active?.durationMinutes ?? appointmentDurationMinutes(appointment) };
    }).filter((item) => item.date === date).sort((a, b) => a.minutes - b.minutes);
    return <div className={`agenda-week-column ${date === selectedDate ? "agenda-week-column-active" : ""}`} key={date}>
      <button className="agenda-week-day" type="button" onClick={() => onSelectDate(date)}><span>{agendaShortWeekday(date)}</span><strong>{parseAgendaDate(date).getDate()}</strong><small>{dayAppointments.length} ag.</small></button>
      <div className="agenda-week-column-body" ref={(node) => { columnRefs.current[date] = node; }} data-agenda-date={date}>
        {AGENDA_HOURS.map((hour, index) => <div className="agenda-week-time-slot" key={hour} aria-label={`${agendaShortWeekday(date)} ${hour}`} style={{ top: `${index * AGENDA_HOUR_HEIGHT}px` }} />)}
        {dayAppointments.map(({ appointment, minutes, durationMinutes }) => <AgendaAppointmentCard key={appointment.id} appointment={{ ...appointment, date, time: formatAgendaTime(minutes), duration: formatAgendaDuration(durationMinutes) }} onSelect={onSelect} compact style={{ top: `${(minutes - AGENDA_START_MINUTES) * AGENDA_HOUR_HEIGHT / 60 + 3}px`, height: `${Math.max(28, durationMinutes * AGENDA_HOUR_HEIGHT / 60 - 6)}px` }} onStartDrag={(event) => beginInteraction(event, appointment, "drag")} onStartResize={(event) => beginInteraction(event, appointment, "resize")} />)}
      </div>
    </div>;
  })}</div></div>;
}

function AgendaMonthView({ date, appointments, selectedDate, onSelectDate }: { date: string; appointments: AppointmentRecord[]; selectedDate: string; onSelectDate: (date: string) => void }) {
  const monthDays = getAgendaMonthDays(date);
  const monthKey = date.slice(0, 7);
  return <div className="agenda-month-view"><div className="agenda-weekday-row">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div><div className="agenda-month-grid">{monthDays.map((day) => { const dayAppointments = appointments.filter((appointment) => appointment.date === day).sort((a, b) => a.time.localeCompare(b.time)); const inMonth = day.slice(0, 7) === monthKey; return <button className={`agenda-month-cell ${inMonth ? "" : "agenda-month-cell-muted"} ${day === selectedDate ? "agenda-month-cell-active" : ""}`} key={day} type="button" onClick={() => onSelectDate(day)}><span className="agenda-month-number">{parseAgendaDate(day).getDate()}</span><span className="agenda-month-items">{dayAppointments.slice(0, 3).map((appointment) => <span className="agenda-month-item" key={appointment.id}><i className={`agenda-professional-dot agenda-professional-${professionalColor(appointment.professional)}`} /><b>{appointment.time}</b> {appointment.client}</span>)}{dayAppointments.length > 3 && <small>+{dayAppointments.length - 3} mais</small>}</span></button>; })}</div></div>;
}

function AgendaDetails({ appointment, client, onOpen }: { appointment: AppointmentRecord | null; client?: ClientRecord; onOpen: (kind: RecordKind, id?: string) => void }) {
  if (!appointment) return <aside className="agenda-details agenda-details-empty"><CalendarDays size={22} /><p>Selecione um compromisso para ver os detalhes.</p><span>A agenda reúne cliente, horário, endereço, observações e vínculo com a ordem de serviço.</span></aside>;
  return <aside className="agenda-details"><div className="agenda-details-head"><div><p className="eyebrow">Compromisso selecionado</p><h3>{appointment.client}</h3><span>{appointment.service}</span></div><StatusPill status={appointment.status} /></div><div className="agenda-detail-list"><div><CalendarDays size={15} /><span><small>Data</small><strong>{agendaLongDateLabel(appointment.date)}</strong></span></div>{appointment.endDate && appointment.endDate !== appointment.date && <div><CalendarDays size={15} /><span><small>Período reservado</small><strong>Até {agendaLongDateLabel(appointment.endDate)} · {appointmentCadenceLabel(appointment.cadence)}</strong></span></div>}<div><Clock3 size={15} /><span><small>Horário e duração</small><strong>{appointment.time} · {appointment.duration}</strong></span></div><div><MapPin size={15} /><span><small>Local</small><strong>{appointment.address}</strong></span></div>{client?.phone && <div><MessageCircle size={15} /><span><small>Contato rápido</small><WhatsAppLink phone={client.phone} label="Enviar lembrete pelo WhatsApp" message={`Olá, ${client.name}! Confirmando o serviço de ${appointment.service} em ${agendaLongDateLabel(appointment.date)} às ${appointment.time}.`} /></span></div>}</div>{appointment.notes && <div className="agenda-notes"><small>Observações</small><p>{appointment.notes}</p></div>}<div className="agenda-detail-actions"><button className="secondary-button" type="button" onClick={() => onOpen("appointment")}>Editar agenda</button>{appointment.workOrderId && <button className="primary-button" type="button" onClick={() => onOpen("diary", appointment.workOrderId)}>Abrir diário da OS</button>}</div></aside>;
}

function OrdersView({ onOpen }: { onOpen: (kind: RecordKind, id?: string) => void }) { const data = useDemoData(); const [filter, setFilter] = useState<"all" | WorkOrderRecord["status"]>("all"); const [query, setQuery] = useState(""); const [descriptionOrderId, setDescriptionOrderId] = useState<string>(); const list = data.workOrders.filter((item) => (filter === "all" || item.status === filter) && `${item.id} ${item.client} ${item.service}`.toLowerCase().includes(query.toLowerCase())); const descriptionOrder = data.workOrders.find((order) => order.id === descriptionOrderId); return <section className="panel full-panel"><PanelHeader eyebrow={`${data.workOrders.length} ordens registradas`} title="Acompanhe os serviços" action="Nova ordem" onAction={() => onOpen("order")} /><div className="view-toolbar"><div className="filter-pills"><button className={`filter-pill ${filter === "all" ? "filter-pill-active" : ""}`} type="button" onClick={() => setFilter("all")}>Todas <span>{data.workOrders.length}</span></button><button className={`filter-pill ${filter === "in_progress" ? "filter-pill-active" : ""}`} type="button" onClick={() => setFilter("in_progress")}>Em andamento <span>{data.workOrders.filter((item) => item.status === "in_progress").length}</span></button><button className={`filter-pill ${filter === "waiting" ? "filter-pill-active" : ""}`} type="button" onClick={() => setFilter("waiting")}>Aguardando <span>{data.workOrders.filter((item) => item.status === "waiting").length}</span></button></div><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS ou cliente" /></label></div><div className="orders-table"><div className="table-head"><span>Ordem</span><span>Serviço / cliente</span><span>Valor</span><span>Status</span><span>Ações</span></div>{list.map((order) => <OrderRow key={order.id} order={order} onDiary={() => onOpen("diary", order.id)} onDescription={() => setDescriptionOrderId(order.id)} onClose={() => data.closeWorkOrder(order.id)} />)}{!list.length && <EmptyState message="Nenhuma ordem corresponde aos filtros." />}</div>{descriptionOrder && <DescriptionHistory order={descriptionOrder} onSave={(text) => data.reviseWorkOrderDescription(descriptionOrder.id, text)} onClose={() => setDescriptionOrderId(undefined)} />}</section>; }

function DescriptionHistory({ order, onSave, onClose }: { order: WorkOrderRecord; onSave: (text: string) => void; onClose: () => void }) { const [draft, setDraft] = useState(order.description); return <section className="description-history-panel"><div className="description-history-head"><div><p className="eyebrow">Descrição preservada · {order.id}</p><h3>Versões do escopo e do relato do cliente</h3></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar histórico da descrição"><X size={17} /></button></div><p className="description-history-note">Cada ajuste cria uma nova versão. Nada é apagado: o histórico completo segue disponível para conferência e para o relatório assistido.</p><label className="field-wrap">Descrição atual<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} /></label><button className="primary-button description-save" type="button" onClick={() => { onSave(draft); setDraft(draft); }}><CheckCircle2 size={15} /> Salvar nova versão</button><div className="description-version-list">{(order.descriptionHistory ?? [{ id: "legacy", text: order.description, createdAt: "Versão atual" }]).map((revision, index) => <article key={revision.id}><span>{index === 0 ? "Atual" : `Versão ${index + 1}`}</span><p>{revision.text}</p><small>{revision.createdAt}</small></article>)}</div></section>; }

function FinanceView({ onOpen }: { onOpen: (kind: RecordKind) => void }) { const data = useDemoData(); const [filter, setFilter] = useState<"all" | FinanceRecord["type"]>("all"); const list = data.finance.filter((item) => filter === "all" || item.type === filter); const incoming = data.finance.filter((item) => item.type === "receivable" && item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0); const outgoing = data.finance.filter((item) => item.type === "payable" && item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0); return <section className="panel full-panel"><PanelHeader eyebrow="Fluxo conectado ao fechamento" title="Financeiro" action="Novo lançamento" onAction={() => onOpen("finance")} /><div className="finance-summary-grid"><Summary label="Entradas previstas" value={formatBRL(incoming)} detail={`${data.finance.filter((item) => item.type === "receivable" && item.status !== "paid").length} títulos em aberto`} /><Summary label="Saídas previstas" value={formatBRL(outgoing)} detail={`${data.finance.filter((item) => item.type === "payable" && item.status !== "paid").length} despesas abertas`} tone="out" /><Summary label="Resultado estimado" value={formatBRL(incoming - outgoing)} detail="Antes de impostos e retiradas" tone="result" /></div><div className="view-toolbar"><div className="filter-pills"><button type="button" className={`filter-pill ${filter === "all" ? "filter-pill-active" : ""}`} onClick={() => setFilter("all")}>Todos</button><button type="button" className={`filter-pill ${filter === "receivable" ? "filter-pill-active" : ""}`} onClick={() => setFilter("receivable")}>A receber</button><button type="button" className={`filter-pill ${filter === "payable" ? "filter-pill-active" : ""}`} onClick={() => setFilter("payable")}>A pagar</button></div></div><div className="finance-list">{list.map((item) => <div className="finance-row" key={item.id}><div className={`finance-type finance-type-${item.type}`}>{item.type === "receivable" ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</div><div className="finance-info"><strong>{item.title}</strong><span>{item.party} · Vence {item.dueDate}{item.originId ? " · origem OS" : ""}</span></div><strong className={item.type === "receivable" ? "value-in" : "value-out"}>{item.type === "receivable" ? "+" : "−"} {formatBRL(item.amountCents)}</strong><StatusPill status={item.status} /></div>)}</div></section>; }
function Summary({ label, value, detail, tone = "" }: { label: string; value: string; detail: string; tone?: "" | "out" | "result" }) { return <div className={`finance-summary-card ${tone ? `finance-summary-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }

function StockView({ onOpen }: { onOpen: (kind: RecordKind) => void }) { const data = useDemoData(); const [query, setQuery] = useState(""); const list = data.stock.filter((item) => `${item.name} ${item.category} ${item.location}`.toLowerCase().includes(query.toLowerCase())); const low = data.stock.filter((item) => item.quantity < item.minimum).length; return <section className="panel full-panel"><PanelHeader eyebrow="Estoque principal" title="Materiais e ferramentas" action="Adicionar item" onAction={() => onOpen("stock")} /><div className="stock-summary"><div><PackageCheck size={18} /><span>Itens cadastrados<strong>{data.stock.length}</strong></span></div><div><Wrench size={18} /><span>Ferramentas<strong>{data.stock.filter((item) => item.category === "tool").length}</strong></span></div><div className="stock-alert"><Activity size={18} /><span>Abaixo do mínimo<strong>{low}</strong></span></div></div><div className="view-toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item, categoria ou local" /></label></div><div className="stock-list">{list.map((item) => <div className="stock-row" key={item.id}><div className={`stock-symbol stock-symbol-${item.category}`}>{item.category === "tool" ? <Wrench size={17} /> : item.category === "resale" ? <PackageCheck size={17} /> : <Boxes size={17} />}</div><div className="stock-info"><strong>{item.name}</strong><span>{item.location} · {item.category === "tool" ? "Ferramenta" : item.category === "resale" ? "Revenda" : "Consumo"}</span></div><div className={`stock-quantity ${item.quantity < item.minimum ? "stock-low" : ""}`}><strong>{item.quantity} {item.unit}</strong><small>{item.quantity < item.minimum ? "Repor em breve" : `Mínimo ${item.minimum} ${item.unit}`}</small></div></div>)}</div></section>; }

function ClientsView({ onOpen }: { onOpen: (kind: RecordKind) => void }) { const data = useDemoData(); const [query, setQuery] = useState(""); const [sort, setSort] = useState<"name" | "history">("name"); const list = useMemo(() => data.clients.filter((item) => `${item.name} ${item.document} ${item.phone} ${item.city}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.history.length - a.history.length), [data.clients, query, sort]); return <section className="panel full-panel"><PanelHeader eyebrow={`${data.clients.length} pessoas e empresas`} title="Clientes" action="Novo cliente" onAction={() => onOpen("client")} /><div className="view-toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, CPF/CNPJ, telefone ou cidade" /></label><label className="table-select">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value as "name" | "history")}><option value="name">Nome</option><option value="history">Histórico</option></select></label></div><div className="directory-table"><div className="directory-head"><span>Cliente</span><span>Contato</span><span>Localidade</span><span>Histórico</span></div>{list.map((client) => <article className="directory-record" key={client.id}><span className={`client-avatar client-${client.tone}`}>{client.initials}</span><div><strong>{client.name}</strong><small>{client.kind === "pj" ? "Pessoa jurídica" : "Pessoa física"}{client.document ? ` · ${client.document}` : ""}</small></div><div><strong>{client.phone || "Sem telefone"}</strong><small>{client.email || "Sem e-mail"}</small><WhatsAppLink phone={client.phone} label="Conversar no WhatsApp" message={`Olá, ${client.name}! Aqui é da sua equipe de atendimento. Como podemos ajudar?`} /></div><div><strong>{client.city || "Cidade não informada"}{client.state ? ` · ${client.state}` : ""}</strong><small>{client.address || "Endereço não informado"}</small></div><div><strong>{client.history.length} evento(s)</strong><small>{client.history[0] || "Sem histórico"}</small></div></article>)}{!list.length && <EmptyState message="Nenhum cliente corresponde à busca." />}</div></section>; }

function SuppliersView({ onOpen }: { onOpen: (kind: RecordKind) => void }) { const data = useDemoData(); const [query, setQuery] = useState(""); const list = data.suppliers.filter((item) => `${item.name} ${item.category} ${item.city} ${item.document}`.toLowerCase().includes(query.toLowerCase())); return <section className="panel full-panel"><PanelHeader eyebrow={`${data.suppliers.length} fornecedores cadastrados`} title="Fornecedores" action="Novo fornecedor" onAction={() => onOpen("supplier")} /><div className="view-toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fornecedor, CNPJ, categoria ou cidade" /></label></div><div className="directory-table"><div className="directory-head"><span>Fornecedor</span><span>Categoria</span><span>Contato</span><span>Localidade</span></div>{list.map((supplier) => <article className="directory-record" key={supplier.id}><span className={`client-avatar client-${supplier.tone}`}>{supplier.initials}</span><div><strong>{supplier.name}</strong><small>{supplier.document || "Documento não informado"}</small></div><div><strong>{supplier.category}</strong><small>Cadastro ativo</small></div><div><strong>{supplier.phone || "Sem telefone"}</strong><small>{supplier.email || "Sem e-mail"}</small><WhatsAppLink phone={supplier.phone} label="Lembrar pelo WhatsApp" message={`Olá, ${supplier.name}! Precisamos confirmar uma informação sobre o fornecimento. Pode nos retornar, por favor?`} /></div><div><strong>{supplier.city || "Cidade não informada"}{supplier.state ? ` · ${supplier.state}` : ""}</strong><small>{supplier.address || "Endereço não informado"}</small></div></article>)}{!list.length && <EmptyState message="Nenhum fornecedor corresponde à busca." />}</div></section>; }

function ReportsView() { const data = useDemoData(); const [draft, setDraft] = useState(""); const receivable = data.finance.filter((item) => item.type === "receivable").reduce((sum, item) => sum + item.amountCents, 0); const payable = data.finance.filter((item) => item.type === "payable").reduce((sum, item) => sum + item.amountCents, 0); const generate = () => { const order = data.workOrders.find((item) => item.diary.length) ?? data.workOrders[0]; if (!order) return; const descriptionHistory = (order.descriptionHistory ?? [{ id: "legacy", text: order.description, createdAt: "Versão atual" }]).map((revision) => `${revision.createdAt}: ${revision.text}`).join(" | "); setDraft(`Prévia estruturada — ${order.id}\nCliente: ${order.client}\nServiço: ${order.service}\nDescrição atual: ${order.description}\nHistórico de alterações: ${descriptionHistory}\nDiário: ${order.diary.map((entry) => entry.text).join(" | ") || "Sem registros adicionais."}\nMateriais vinculados: ${order.materialLines.length ? order.materialLines.map((entry) => `${entry.quantity} item(ns)`).join(", ") : "Não informados."}\nFechamento: ${order.status === "completed" ? "concluído e lançado no financeiro" : "pendente de fechamento"}.`); };
  return <section className="panel full-panel"><PanelHeader eyebrow="Dados operacionais consolidados" title="Relatórios" action="Gerar prévia" onAction={generate} /><div className="report-metrics"><ReportMetric label="Receitas registradas" value={formatBRL(receivable)} detail={`${data.finance.filter((item) => item.type === "receivable").length} lançamentos`} /><ReportMetric label="Despesas registradas" value={formatBRL(payable)} detail={`${data.finance.filter((item) => item.type === "payable").length} lançamentos`} negative /><ReportMetric label="Resultado estimado" value={formatBRL(receivable - payable)} detail="Dados atuais" /><ReportMetric label="OS concluídas" value={String(data.workOrders.filter((item) => item.status === "completed").length)} detail={`de ${data.workOrders.length} ordens`} /></div><div className="report-chart"><div className="report-chart-head"><strong>Relatório por serviço</strong><span><i /> Base operacional</span></div><p className="report-explainer">A prévia compila escopo, diário, materiais e fechamento. A IA real deve usar esta mesma base, em rota server-side com limite de uso e revisão humana antes de enviar ao cliente.</p><button className="primary-button" type="button" onClick={generate}><Sparkles size={16} /> Montar prévia de relatório</button>{draft && <pre className="report-draft">{draft}</pre>}</div></section>; }
function ReportMetric({ label, value, detail, negative }: { label: string; value: string; detail: string; negative?: boolean }) { return <div><span>{label}</span><strong>{value}</strong><small className={negative ? "report-negative" : ""}>{detail}</small></div>; }

function TeamView({ onOpen }: { onOpen: (kind: RecordKind) => void }) { const data = useDemoData(); return <section className="panel full-panel"><PanelHeader eyebrow={`${data.team.length} pessoas ativas`} title="Equipe e permissões" action="Convidar pessoa" onAction={() => onOpen("invite")} /><div className="view-toolbar"><div className="permissions-note"><ShieldCheck size={17} /><span>O proprietário deverá criar convites para funcionários. A Central Admin cria o convite do proprietário do tenant.</span></div><button className="secondary-button" type="button" onClick={() => onOpen("team")}><UserCog size={16} /> Cadastro direto</button></div><div className="team-table"><div className="table-head team-head"><span>Nome</span><span>Função</span><span>Permissões</span><span>Status</span><span /></div>{data.team.map((member) => <div className="team-row" key={member.id}><span className={`client-avatar client-${member.tone}`}>{member.initials}</span><div className="team-name"><strong>{member.name}</strong><span>{member.email}</span></div><span className="team-access">{member.role}</span><span className="team-access">{member.access}</span><StatusPill status="confirmed" /></div>)}</div><section className="invite-section"><div className="table-head"><span>Convites em andamento</span><span>Função</span><span>Expiração</span><span>Status</span></div>{data.invitations.map((invite) => <div className="invite-row" key={invite.id}><span><strong>{invite.email}</strong><small>{invite.kind === "owner" ? "Proprietário do tenant" : "Membro da equipe"}</small></span><span>{invite.role}</span><span>{invite.expiresAt}</span><span className="status-pill status-pending"><span className="status-dot" />Pendente</span></div>)}</section></section>; }

function SettingsView() { const [saved, setSaved] = useState(false); const [messages, setMessages] = useState(true); return <section className="panel full-panel settings-panel"><PanelHeader eyebrow="Preferências por empresa" title="Configurações gerais" action="Salvar alterações" onAction={() => setSaved(true)} /><div className="settings-grid"><label className="field-wrap">Nome de exibição<input defaultValue="Empresa Central" /></label><label className="field-wrap">Segmento<input defaultValue="Serviços e atendimento" /></label><label className="field-wrap">Moeda<select defaultValue="BRL"><option value="BRL">Real brasileiro (R$)</option></select></label><label className="field-wrap">Fuso horário<select defaultValue="America/Sao_Paulo"><option value="America/Sao_Paulo">São Paulo (GMT-3)</option></select></label></div><div className="settings-toggle"><div><strong>Notificações de vencimento</strong><span>Receba alertas de contas em aberto e estoque baixo.</span></div><button type="button" className={messages ? "toggle-active" : "toggle"} onClick={() => setMessages((value) => !value)} aria-pressed={messages}><span /></button></div>{saved && <p className="settings-success"><CheckCircle2 size={16} /> Preferências salvas nesta demonstração.</p>}<div className="permissions-note"><ShieldCheck size={17} /><span>Em produção, preferências, permissões, convite e dados devem ser gravados no tenant autenticado e validados no servidor.</span></div></section>; }
function EmptyState({ message }: { message: string }) { return <div className="empty-state"><Search size={18} /><span>{message}</span></div>; }
