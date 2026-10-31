"use client";

import { useMemo, useState } from "react";
import { Check, LoaderCircle, Search, X } from "lucide-react";
import { useDemoData, type AppointmentCadence } from "@/src/components/demo-data";
import { findConflicts, todayDate } from "@/src/lib/agenda";
import { VoiceDictationButton } from "@/src/components/voice-input";
import { formatCep, formatCentsInput, formatDocument, formatPhone, onlyDigits, parseCurrencyToCents } from "@/src/lib/brasil";
import { getCurrentFirebaseUserToken, isFirebaseClientConfigured } from "@/src/lib/firebase-client";

export type RecordKind = "client" | "supplier" | "appointment" | "order" | "finance" | "stock" | "team" | "invite" | "diary";

type Props = { kind: RecordKind; onClose: () => void; workOrderId?: string; defaultInviteKind?: "owner" | "team"; prefill?: { clientId?: string; service?: string; description?: string }; onOrderCreated?: (orderId: string) => void };

const titles: Record<RecordKind, { eyebrow: string; title: string; action: string }> = {
  client: { eyebrow: "Cadastro", title: "Novo cliente", action: "Salvar cliente" },
  supplier: { eyebrow: "Cadastro", title: "Novo fornecedor", action: "Salvar fornecedor" },
  appointment: { eyebrow: "Agenda", title: "Novo agendamento", action: "Agendar serviço" },
  order: { eyebrow: "Operação", title: "Nova ordem de serviço", action: "Criar ordem" },
  finance: { eyebrow: "Financeiro", title: "Novo lançamento", action: "Salvar lançamento" },
  stock: { eyebrow: "Estoque", title: "Novo item", action: "Adicionar item" },
  team: { eyebrow: "Equipe", title: "Novo membro", action: "Adicionar membro" },
  invite: { eyebrow: "Acesso controlado", title: "Gerar convite", action: "Gerar convite" },
  diary: { eyebrow: "Diário de serviço", title: "Registrar andamento", action: "Adicionar ao diário" },
};

const initial = {
  name: "", kind: "pf", document: "", email: "", phone: "", cep: "", address: "", number: "", neighborhood: "", city: "", state: "", category: "", clientId: "", service: "", description: "", date: "2026-10-29", endDate: "2026-10-29", cadence: "single", time: "08:00", duration: "1h", professional: "Você", amount: "", financeType: "receivable", party: "", dueDate: "", stockCategory: "consumable", quantity: "1", unit: "un", minimum: "0", location: "Estoque principal", role: "Profissional", access: "Agenda e serviços", inviteKind: "team", tenantId: "", stockId: "", materialQuantity: "0", text: "",
};

function buildAppointmentDates(startValue: string, endValue: string, cadence: AppointmentCadence) {
  const [startYear, startMonth, startDay] = startValue.split("-").map(Number);
  const [endYear, endMonth, endDay] = endValue.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  if (cadence === "single") return [startValue];
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end && dates.length < 370; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    const include = cadence === "daily" || cadence === "weekly" || (cadence === "weekdays" && day > 0 && day < 6);
    if (!include) continue;
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const date = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${cursor.getFullYear()}-${month}-${date}`);
    if (cadence === "weekly") cursor.setDate(cursor.getDate() + 6);
  }
  return dates;
}

function isAppointmentKind(kind: RecordKind): boolean {
  return kind === "appointment";
}

export function RecordDialog({ kind, onClose, workOrderId, defaultInviteKind = "team", prefill, onOrderCreated }: Props) {
  const data = useDemoData();
  const [form, setForm] = useState(() => ({ ...initial, inviteKind: defaultInviteKind, role: defaultInviteKind === "owner" ? "Proprietário" : initial.role, ...(prefill ? { clientId: prefill.clientId ?? "", service: prefill.service ?? "", description: prefill.description ?? "" } : {}) }));
  const [loading, setLoading] = useState<"cep" | "cnpj" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const meta = titles[kind];
  const selectedClient = useMemo(() => data.clients.find((client) => client.id === form.clientId), [data.clients, form.clientId]);
  if (isAppointmentKind(kind)) return <AppointmentDialog onClose={onClose} />;

  function update(key: keyof typeof initial, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function lookupCep() {
    const cep = onlyDigits(form.cep);
    if (cep.length !== 8) return setError("Informe um CEP com 8 dígitos.");
    setLoading("cep"); setError("");
    try {
      const response = await fetch(`/api/lookup/cep/${cep}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível consultar o CEP.");
      setForm((previous) => ({ ...previous, address: payload.street || previous.address, neighborhood: payload.neighborhood || previous.neighborhood, city: payload.city || previous.city, state: payload.state || previous.state }));
    } catch (lookupError) { setError(lookupError instanceof Error ? lookupError.message : "Não foi possível consultar o CEP."); } finally { setLoading(null); }
  }

  async function lookupCnpj() {
    const cnpj = onlyDigits(form.document);
    if (cnpj.length !== 14) return setError("Informe um CNPJ com 14 dígitos.");
    setLoading("cnpj"); setError("");
    try {
      const response = await fetch(`/api/lookup/cnpj/${cnpj}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível consultar o CNPJ.");
      setForm((previous) => ({ ...previous, name: payload.name || previous.name, email: payload.email || previous.email, phone: payload.phone ? formatPhone(payload.phone) : previous.phone, cep: payload.cep ? formatCep(payload.cep) : previous.cep, address: payload.street || previous.address, number: payload.number || previous.number, neighborhood: payload.neighborhood || previous.neighborhood, city: payload.city || previous.city, state: payload.state || previous.state }));
    } catch (lookupError) { setError(lookupError instanceof Error ? lookupError.message : "Não foi possível consultar o CNPJ."); } finally { setLoading(null); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (kind === "client") {
      if (!form.name.trim()) return setError("Informe o nome do cliente.");
      data.addClient({ name: form.name.trim(), kind: form.kind as "pf" | "pj", document: form.document, email: form.email, phone: form.phone, city: form.city, state: form.state, address: [form.address, form.number].filter(Boolean).join(", "), cep: form.cep });
    }
    if (kind === "supplier") {
      if (!form.name.trim()) return setError("Informe o nome do fornecedor.");
      data.addSupplier({ name: form.name.trim(), document: form.document, email: form.email, phone: form.phone, category: form.category || "Geral", city: form.city, state: form.state, address: [form.address, form.number].filter(Boolean).join(", "), cep: form.cep });
    }
    if (kind === "appointment") {
      if (!selectedClient || !form.service.trim()) return setError("Selecione um cliente e descreva o serviço.");
      const cadence = form.cadence as AppointmentCadence;
      const endDate = cadence === "single" ? form.date : form.endDate;
      const dates = buildAppointmentDates(form.date, endDate, cadence);
      if (!dates.length) return setError("Confira o período informado. A data final precisa ser igual ou posterior à inicial.");
      const seriesId = cadence === "single" ? undefined : crypto.randomUUID();
      const baseAppointment = { time: form.time, duration: form.duration, client: selectedClient.name, clientId: selectedClient.id, service: form.service, address: selectedClient.address || `${selectedClient.city} · ${selectedClient.state}`, professional: "Você", endDate, cadence, seriesId, notes: form.description, workOrderId: "" };
      data.addAppointments(dates.map((date) => ({ ...baseAppointment, date })));
    }
    if (kind === "order") {
      if (!selectedClient || !form.service.trim() || parseCurrencyToCents(form.amount) <= 0) return setError("Cliente, serviço e valor são obrigatórios.");
      const createdOrderId = data.addWorkOrder({ client: selectedClient.name, clientId: selectedClient.id, service: form.service, professional: "Você", amountCents: parseCurrencyToCents(form.amount), description: form.description || form.service, materialLines: form.stockId && Number(form.materialQuantity) > 0 ? [{ stockId: form.stockId, quantity: Number(form.materialQuantity) }] : [] });
      onOrderCreated?.(createdOrderId);
    }
    if (kind === "finance") {
      if (!form.party.trim() || !form.description.trim() || parseCurrencyToCents(form.amount) <= 0) return setError("Descrição, pessoa e valor são obrigatórios.");
      data.addFinance({ title: form.description, party: form.party, dueDate: form.dueDate || "A definir", amountCents: parseCurrencyToCents(form.amount), type: form.financeType as "receivable" | "payable", category: form.category || "Geral" });
    }
    if (kind === "stock") {
      if (!form.name.trim() || Number(form.quantity) <= 0) return setError("Nome e quantidade são obrigatórios.");
      data.addStock({ name: form.name, category: form.stockCategory as "consumable" | "resale" | "tool", quantity: Number(form.quantity), unit: form.unit || "un", minimum: Number(form.minimum || 0), location: form.location || "Estoque principal", costCents: parseCurrencyToCents(form.amount) });
    }
    if (kind === "team") {
      if (!form.name.trim() || !form.email.trim()) return setError("Nome e e-mail são obrigatórios.");
      data.addTeamMember({ name: form.name, email: form.email, role: form.role, access: form.access });
    }
    if (kind === "invite") {
      if (!form.email.trim()) return setError("Informe o e-mail que receberá o convite.");
      if (form.inviteKind === "owner" && !form.tenantId.trim()) return setError("Informe o ID da empresa do Portal para o convite do proprietário.");
      if (isFirebaseClientConfigured) {
        setSubmitting(true);
        try {
          const token = await getCurrentFirebaseUserToken();
          if (!token) throw new Error("Entre com a conta autorizada da Central Admin antes de gerar convites reais.");
          const response = await fetch("/api/auth/invitations", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ email: form.email, role: form.role, kind: form.inviteKind, tenantId: form.tenantId || undefined }) });
          const payload = await response.json() as { error?: string };
          if (!response.ok) throw new Error(payload.error ?? "Não foi possível gerar o convite.");
        } catch (submitError) {
          setSubmitting(false);
          return setError(submitError instanceof Error ? submitError.message : "Não foi possível gerar o convite.");
        }
        setSubmitting(false);
      }
      data.invite(form.email, form.role, form.inviteKind as "owner" | "team");
    }
    if (kind === "diary") {
      if (!workOrderId || !form.text.trim()) return setError("Descreva o andamento do serviço.");
      data.addDiary(workOrderId, form.text.trim());
    }
    onClose();
  }

  const diaryOrder = kind === "diary" ? data.workOrders.find((order) => order.id === workOrderId) : undefined;

  return <div className="dialog-backdrop" role="presentation"><section className="record-dialog" role="dialog" aria-modal="true" aria-labelledby="record-dialog-title"><header><div><p className="eyebrow">{meta.eyebrow}</p><h2 id="record-dialog-title">{meta.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar formulário"><X size={18} /></button></header><form onSubmit={submit}><div className="dialog-body">{(kind === "client" || kind === "supplier") && <ContactFields kind={kind} form={form} update={update} lookupCep={lookupCep} lookupCnpj={lookupCnpj} loading={loading} />}{kind === "appointment" && <><Select label="Cliente" value={form.clientId} onChange={(value) => update("clientId", value)} options={data.clients.map((client) => ({ value: client.id, label: client.name }))} required /><Field label="Serviço previsto" value={form.service} onChange={(value) => update("service", value)} required /><div className="dialog-grid"><Field label="Data" type="date" value={form.date} onChange={(value) => update("date", value)} required /><Field label="Horário" type="time" value={form.time} onChange={(value) => update("time", value)} required /></div><Select label="Duração estimada" value={form.duration} onChange={(value) => update("duration", value)} options={[{ value: "1h", label: "1 hora" }, { value: "2h", label: "2 horas" }, { value: "3h", label: "3 horas" }, { value: "Dia", label: "Dia inteiro" }]} /><TextArea label="Descrição e observações" value={form.description} onChange={(value) => update("description", value)} placeholder="O que foi combinado, materiais previstos e pendências." /></>}{kind === "order" && <><Select label="Cliente" value={form.clientId} onChange={(value) => update("clientId", value)} options={data.clients.map((client) => ({ value: client.id, label: client.name }))} required /><div className="dialog-grid"><Field label="Serviço" value={form.service} onChange={(value) => update("service", value)} required /><CurrencyField label="Valor cobrado" value={form.amount} onChange={(value) => update("amount", value)} /></div><TextArea label="Escopo do serviço" value={form.description} onChange={(value) => update("description", value)} placeholder="Descreva o serviço e o que está incluído." /><div className="dialog-grid"><Select label="Material vinculado" value={form.stockId} onChange={(value) => update("stockId", value)} options={[{ value: "", label: "Sem material" }, ...data.stock.map((item) => ({ value: item.id, label: `${item.name} (${item.quantity} ${item.unit})` }))]} /><Field label="Quantidade a baixar no fechamento" type="number" value={form.materialQuantity} onChange={(value) => update("materialQuantity", value)} /></div></>}{kind === "finance" && <><div className="dialog-grid"><Select label="Tipo" value={form.financeType} onChange={(value) => update("financeType", value)} options={[{ value: "receivable", label: "Conta a receber" }, { value: "payable", label: "Conta a pagar" }]} /><CurrencyField label="Valor" value={form.amount} onChange={(value) => update("amount", value)} /></div><Field label={form.financeType === "receivable" ? "Cliente ou pagador" : "Fornecedor ou beneficiário"} value={form.party} onChange={(value) => update("party", value)} required /><div className="dialog-grid"><Field label="Descrição" value={form.description} onChange={(value) => update("description", value)} required /><Field label="Vencimento" type="date" value={form.dueDate} onChange={(value) => update("dueDate", value)} /></div><Field label="Categoria" value={form.category} onChange={(value) => update("category", value)} placeholder="Ex.: combustível, materiais, mão de obra" /></>}{kind === "stock" && <><Field label="Nome do item" value={form.name} onChange={(value) => update("name", value)} required /><div className="dialog-grid"><Select label="Tipo" value={form.stockCategory} onChange={(value) => update("stockCategory", value)} options={[{ value: "consumable", label: "Material de consumo" }, { value: "resale", label: "Peça ou revenda" }, { value: "tool", label: "Ferramenta" }]} /><Field label="Localização" value={form.location} onChange={(value) => update("location", value)} /></div><div className="dialog-grid dialog-grid-three"><Field label="Quantidade" type="number" value={form.quantity} onChange={(value) => update("quantity", value)} /><Field label="Unidade" value={form.unit} onChange={(value) => update("unit", value)} /><Field label="Estoque mínimo" type="number" value={form.minimum} onChange={(value) => update("minimum", value)} /></div><CurrencyField label="Custo unitário" value={form.amount} onChange={(value) => update("amount", value)} /></>}{kind === "team" && <><Field label="Nome" value={form.name} onChange={(value) => update("name", value)} required /><Field label="E-mail" type="email" value={form.email} onChange={(value) => update("email", value)} required /><div className="dialog-grid"><Select label="Função" value={form.role} onChange={(value) => update("role", value)} options={roleOptions} /><Select label="Acesso" value={form.access} onChange={(value) => update("access", value)} options={accessOptions} /></div></>}{kind === "invite" && <><div className="dialog-notice">{isFirebaseClientConfigured ? "O convite será validado no Firebase do Portal Orquestra.cs e expira em 7 dias." : "Modo demonstração: o convite fica registrado somente neste navegador até o Firebase ser configurado."}</div><Field label="E-mail" type="email" value={form.email} onChange={(value) => update("email", value)} required />{form.inviteKind === "owner" && <Field label="ID da empresa no Portal" value={form.tenantId} onChange={(value) => update("tenantId", value)} placeholder="Ex.: empresa_abc123" required />}<div className="dialog-grid"><Select label="Tipo de convite" value={form.inviteKind} onChange={(value) => update("inviteKind", value)} options={[{ value: "owner", label: "Proprietário do tenant" }, { value: "team", label: "Funcionário da equipe" }]} /><Select label="Função" value={form.role} onChange={(value) => update("role", value)} options={roleOptions} /></div></>}{kind === "diary" && <>{diaryOrder && <section className="diary-history" aria-label="Registros anteriores"><div className="diary-history-head"><strong>{diaryOrder.id} · {diaryOrder.service}</strong><span>{diaryOrder.client}</span></div><h4>Registros anteriores ({diaryOrder.diary.length})</h4>{diaryOrder.diary.length ? <ol>{diaryOrder.diary.map((entry) => <li key={entry.id}><time>{entry.createdAt}</time><p>{entry.text}</p></li>)}</ol> : <p className="diary-history-empty">Nenhum registro ainda. O primeiro será salvo abaixo.</p>}</section>}<TextArea label="O que foi feito?" value={form.text} onChange={(value) => update("text", value)} placeholder="Registre execução, materiais, imprevistos e próximos passos." /><div className="dialog-notice">O registro ficará no histórico da OS e no cliente. Na fase de IA, essas entradas serão a fonte do relatório final assistido.</div></>}</div>{error && <p className="dialog-error">{error}</p>}<footer><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={submitting}><Check size={16} /> {submitting ? "Validando..." : meta.action}</button></footer></form></section></div>;
}

function AppointmentDialog({ onClose }: { onClose: () => void }) {
  const data = useDemoData();
  const [form, setForm] = useState(() => ({ ...initial, date: todayDate(), endDate: todayDate() }));
  const [error, setError] = useState("");
  const [acceptedClash, setAcceptedClash] = useState("");
  const selectedClient = useMemo(() => data.clients.find((client) => client.id === form.clientId), [data.clients, form.clientId]);

  function update(key: keyof typeof initial, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedClient || !form.service.trim()) return setError("Selecione um cliente e descreva o serviço.");
    const cadence = form.cadence as AppointmentCadence;
    const endDate = cadence === "single" ? form.date : form.endDate;
    const dates = buildAppointmentDates(form.date, endDate, cadence);
    if (!dates.length) return setError("Confira o período informado. A data final precisa ser igual ou posterior à inicial.");
    const clashes = dates.flatMap((date) => findConflicts({ date, time: form.time, duration: form.duration, professional: form.professional }, data.appointments).map((item) => ({ date, item })));
    const clashKey = JSON.stringify([dates, form.time, form.duration, form.professional]);
    if (clashes.length && acceptedClash !== clashKey) {
      setAcceptedClash(clashKey);
      return setError(`Atenção: ${form.professional || "o responsável"} já tem compromisso nesse horário (${clashes[0].item.client}, ${clashes[0].date.split("-").reverse().join("/")} às ${clashes[0].item.time}${clashes.length > 1 ? `, e mais ${clashes.length - 1}` : ""}). Envie novamente para agendar mesmo assim, ou ajuste o horário.`);
    }
    const seriesId = cadence === "single" ? undefined : crypto.randomUUID();
    const baseAppointment = { time: form.time, duration: form.duration, client: selectedClient.name, clientId: selectedClient.id, service: form.service, address: selectedClient.address || `${selectedClient.city} · ${selectedClient.state}`, professional: form.professional, endDate, cadence, seriesId, notes: form.description, workOrderId: "" };
    data.addAppointments(dates.map((date) => ({ ...baseAppointment, date })));
    onClose();
  }

  return <div className="dialog-backdrop" role="presentation"><section className="record-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-dialog-title"><header><div><p className="eyebrow">Agenda</p><h2 id="appointment-dialog-title">Novo agendamento</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar formulário"><X size={18} /></button></header><form onSubmit={submit}><div className="dialog-body"><Select label="Cliente" value={form.clientId} onChange={(value) => update("clientId", value)} options={data.clients.map((client) => ({ value: client.id, label: client.name }))} required /><Field label="Serviço previsto" value={form.service} onChange={(value) => update("service", value)} required /><Select label="Responsável pelo serviço" value={form.professional} onChange={(value) => update("professional", value)} options={[{ value: "Você", label: "Você" }, ...data.team.map((member) => ({ value: member.name, label: member.name }))]} /><div className="dialog-grid"><Field label="Data inicial" type="date" value={form.date} onChange={(value) => update("date", value)} required /><Field label="Horário diário" type="time" value={form.time} onChange={(value) => update("time", value)} required /></div><div className="dialog-grid"><Select label="Repetição do serviço" value={form.cadence} onChange={(value) => update("cadence", value)} options={[{ value: "single", label: "Somente este dia" }, { value: "daily", label: "Todos os dias" }, { value: "weekdays", label: "Dias úteis (seg. a sex.)" }, { value: "weekly", label: "Uma vez por semana" }]} /><Field label="Data final do período" type="date" value={form.endDate} onChange={(value) => update("endDate", value)} required={form.cadence !== "single"} /></div><Select label="Duração por visita" value={form.duration} onChange={(value) => update("duration", value)} options={[{ value: "1h", label: "1 hora" }, { value: "2h", label: "2 horas" }, { value: "3h", label: "3 horas" }, { value: "Dia", label: "Dia inteiro" }]} />{form.cadence !== "single" && <div className="dialog-notice">O período cria um compromisso em cada dia compatível, sempre no horário informado. Outros serviços podem ser incluídos no mesmo dia em horários diferentes.</div>}<TextArea label="Descrição e observações" value={form.description} onChange={(value) => update("description", value)} placeholder="Ex.: pintura da casa da cliente, etapa 1 de 3 meses, materiais e pendências." /></div>{error && <p className="dialog-error">{error}</p>}<footer><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit"><Check size={16} /> Agendar serviço</button></footer></form></section></div>;
}

const roleOptions = [{ value: "Proprietário", label: "Proprietário" }, { value: "Administrador", label: "Administrador" }, { value: "Financeiro", label: "Financeiro" }, { value: "Profissional", label: "Profissional" }, { value: "Auxiliar", label: "Auxiliar" }, { value: "Visualizador", label: "Visualizador" }];
const accessOptions = [{ value: "Acesso total", label: "Acesso total" }, { value: "Financeiro e relatórios", label: "Financeiro e relatórios" }, { value: "Agenda e serviços", label: "Agenda e serviços" }, { value: "Serviços atribuídos", label: "Serviços atribuídos" }, { value: "Somente visualização", label: "Somente visualização" }];

function ContactFields({ kind, form, update, lookupCep, lookupCnpj, loading }: { kind: "client" | "supplier"; form: typeof initial; update: (key: keyof typeof initial, value: string) => void; lookupCep: () => void; lookupCnpj: () => void; loading: "cep" | "cnpj" | null }) { const [isCompany, setIsCompany] = useState(kind === "supplier"); const useCnpj = kind === "supplier" || isCompany; return <><div className="dialog-grid"><Select label="Tipo" value={useCnpj ? "pj" : "pf"} onChange={(value) => { setIsCompany(value === "pj"); update("kind", value); update("document", ""); }} options={[{ value: "pf", label: "Pessoa física" }, { value: "pj", label: "Pessoa jurídica" }]} /><div className="field-wrap"><label>{useCnpj ? "CNPJ" : "CPF"}<div className="field-with-action"><input value={formatDocument(form.document, useCnpj ? "pj" : "pf")} onChange={(event) => update("document", event.target.value)} placeholder={useCnpj ? "00.000.000/0000-00" : "000.000.000-00"} /><button type="button" onClick={lookupCnpj} disabled={!useCnpj || loading === "cnpj"}>{loading === "cnpj" ? <LoaderCircle size={14} className="spin" /> : <Search size={14} />}</button></div></label></div></div><Field label={useCnpj ? "Razão social ou nome" : "Nome completo"} value={form.name} onChange={(value) => update("name", value)} required /><div className="dialog-grid"><Field label="E-mail" type="email" value={form.email} onChange={(value) => update("email", value)} /><Field label="Telefone" value={formatPhone(form.phone)} onChange={(value) => update("phone", value)} /></div>{kind === "supplier" && <Field label="Categoria principal" value={form.category} onChange={(value) => update("category", value)} placeholder="Ex.: materiais, combustível, peças" />}<div className="dialog-grid"><div className="field-wrap"><label>CEP<div className="field-with-action"><input value={formatCep(form.cep)} onChange={(event) => update("cep", event.target.value)} placeholder="00000-000" /><button type="button" onClick={lookupCep} disabled={loading === "cep"}>{loading === "cep" ? <LoaderCircle size={14} className="spin" /> : <Search size={14} />}</button></div></label></div><Field label="Número" value={form.number} onChange={(value) => update("number", value)} /></div><Field label="Logradouro" value={form.address} onChange={(value) => update("address", value)} /><Field label="Bairro" value={form.neighborhood} onChange={(value) => update("neighborhood", value)} /><div className="dialog-grid"><Field label="Cidade" value={form.city} onChange={(value) => update("city", value)} /><Field label="UF" value={form.state} onChange={(value) => update("state", value.toUpperCase().slice(0, 2))} /></div></>; }

function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) { return <label className="field-wrap">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} /></label>; }
function CurrencyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { const cents = parseCurrencyToCents(value); return <label className="field-wrap">{label}<input inputMode="numeric" value={value ? formatCentsInput(cents) : ""} onChange={(event) => onChange(event.target.value)} placeholder="R$ 0,00" /></label>; }
function Select({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean }) { return <label className="field-wrap">{label}<select value={value} onChange={(event) => onChange(event.target.value)} required={required}><option value="">Selecione</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>; }
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="field-wrap"><span className="field-label-row"><span>{label}</span><VoiceDictationButton value={value} onChange={onChange} /></span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} /></label>; }
