"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import { todayDate } from "@/src/lib/agenda";
import { ISO_DATE, financeStatus, formatDueDate } from "@/src/lib/finance-utils";
import { useDemoData, type FinanceRecord } from "@/src/components/demo-data";
import type { RecordKind } from "@/src/components/record-dialog";
import { EmptyState, Modal, PanelHeader, SelectField, StatusPill, TextField, centsToInput, parseMoneyToCents, rowOpenProps } from "@/src/components/ui-parts";

type StatusFilter = "all" | "open" | "overdue" | "paid";

function Summary({ label, value, detail, tone = "" }: { label: string; value: string; detail: string; tone?: "" | "out" | "result" }) {
  return <div className={`finance-summary-card ${tone ? `finance-summary-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export function FinanceView({ onOpen }: { onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData();
  const [type, setType] = useState<"all" | FinanceRecord["type"]>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string>();
  const today = todayDate();
  const shown = (item: FinanceRecord) => financeStatus(item, today);
  const list = data.finance
    .filter((item) => (type === "all" || item.type === type) && (status === "all" || shown(item) === status) && `${item.title} ${item.party} ${item.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(a.status === "paid") - Number(b.status === "paid") || (ISO_DATE.test(a.dueDate) ? a.dueDate : "9999").localeCompare(ISO_DATE.test(b.dueDate) ? b.dueDate : "9999"));
  const open = (kind: FinanceRecord["type"]) => data.finance.filter((item) => item.type === kind && item.status !== "paid");
  const sum = (items: FinanceRecord[]) => items.reduce((total, item) => total + item.amountCents, 0);
  const monthPrefix = today.slice(0, 7);
  const receivedMonth = sum(data.finance.filter((item) => item.type === "receivable" && item.status === "paid" && item.paidAt?.slice(0, 7) === monthPrefix));
  const overdueTotal = sum(data.finance.filter((item) => item.type === "receivable" && shown(item) === "overdue"));
  const statusFilters: Array<{ id: StatusFilter; label: string }> = [{ id: "all", label: "Todos" }, { id: "open", label: "Em aberto" }, { id: "overdue", label: "Vencidos" }, { id: "paid", label: "Pagos" }];

  function remove(item: FinanceRecord) {
    const warning = item.originId ? ` Ele foi gerado pela ${item.originId}; apagar não reabre a ordem.` : "";
    if (window.confirm(`Excluir "${item.title}" (${formatBRL(item.amountCents)})?${warning}`)) data.removeFinance(item.id);
  }

  return <section className="panel full-panel">
    <PanelHeader eyebrow="Fluxo conectado ao fechamento" title="Financeiro" action="Novo lançamento" onAction={() => onOpen("finance")} />
    <div className="finance-summary-grid">
      <Summary label="A receber" value={formatBRL(sum(open("receivable")))} detail={`${open("receivable").length} títulos em aberto${overdueTotal ? ` · ${formatBRL(overdueTotal)} vencido` : ""}`} />
      <Summary label="A pagar" value={formatBRL(sum(open("payable")))} detail={`${open("payable").length} despesas abertas`} tone="out" />
      <Summary label="Resultado previsto" value={formatBRL(sum(open("receivable")) - sum(open("payable")))} detail={`Recebido neste mês: ${formatBRL(receivedMonth)}`} tone="result" />
    </div>
    <div className="view-toolbar">
      <div className="filter-pills">
        <button type="button" className={`filter-pill ${type === "all" ? "filter-pill-active" : ""}`} onClick={() => setType("all")}>Tudo</button>
        <button type="button" className={`filter-pill ${type === "receivable" ? "filter-pill-active" : ""}`} onClick={() => setType("receivable")}>A receber</button>
        <button type="button" className={`filter-pill ${type === "payable" ? "filter-pill-active" : ""}`} onClick={() => setType("payable")}>A pagar</button>
      </div>
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar título, cliente ou categoria" /></label>
    </div>
    <div className="view-toolbar view-toolbar-tight"><div className="filter-pills">{statusFilters.map((item) => <button key={item.id} type="button" className={`filter-pill ${status === item.id ? "filter-pill-active" : ""}`} onClick={() => setStatus(item.id)}>{item.label}</button>)}</div></div>
    <p className="view-hint">Dê dois cliques (ou toque) em um lançamento para editar.</p>
    <div className="finance-list">
      {list.map((item) => <div className="finance-row row-openable" key={item.id} {...rowOpenProps(() => setEditId(item.id))}>
        <div className={`finance-type finance-type-${item.type}`}>{item.type === "receivable" ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</div>
        <div className="finance-info"><strong>{item.title}</strong><span>{item.party} · {item.status === "paid" ? `Baixado${item.paidAt ? ` em ${new Date(item.paidAt).toLocaleDateString("pt-BR")}` : ""}` : `Vence ${formatDueDate(item.dueDate)}`}{item.category ? ` · ${item.category}` : ""}{item.originId ? ` · origem ${item.originId}` : ""}</span></div>
        <strong className={item.type === "receivable" ? "value-in" : "value-out"}>{item.type === "receivable" ? "+" : "−"} {formatBRL(item.amountCents)}</strong>
        <StatusPill status={shown(item)} />
        <div className="finance-actions">
          {item.status !== "paid" && !ISO_DATE.test(item.dueDate) && <label className="finance-due-input">Definir data<input type="date" onChange={(event) => { if (event.target.value) data.setFinanceDueDate(item.id, event.target.value); }} /></label>}
          <button className="table-action table-action-success" type="button" onClick={() => data.markFinancePaid(item.id, item.status !== "paid")}>{item.status === "paid" ? "Reabrir" : item.type === "receivable" ? "Marcar recebido" : "Marcar pago"}</button>
          <button className="table-action" type="button" onClick={() => setEditId(item.id)}>Editar</button>
          <button className="table-action table-action-danger" type="button" onClick={() => remove(item)}>Excluir</button>
        </div>
      </div>)}
      {!list.length && <EmptyState message="Nenhum lançamento corresponde aos filtros." />}
    </div>
    {editId && <FinanceEditDialog financeId={editId} onClose={() => setEditId(undefined)} />}
  </section>;
}

function FinanceEditDialog({ financeId, onClose }: { financeId: string; onClose: () => void }) {
  const data = useDemoData();
  const item = data.finance.find((entry) => entry.id === financeId);
  const [form, setForm] = useState(() => ({
    title: item?.title ?? "",
    party: item?.party ?? "",
    amount: item ? centsToInput(item.amountCents) : "",
    dueDate: item && ISO_DATE.test(item.dueDate) ? item.dueDate : "",
    category: item?.category ?? "",
    type: item?.type ?? "receivable",
  }));
  const [error, setError] = useState("");
  if (!item) return null;
  const set = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  const parties = Array.from(new Set([...data.clients.map((client) => client.name), ...data.suppliers.map((supplier) => supplier.name)]));

  function save() {
    if (!item) return;
    const cents = parseMoneyToCents(form.amount);
    if (!form.title.trim()) return setError("Informe o título do lançamento.");
    if (cents <= 0) return setError("Informe um valor maior que zero.");
    data.updateFinance(item.id, { title: form.title.trim(), party: form.party.trim(), amountCents: cents, dueDate: form.dueDate || "A definir", category: form.category.trim(), type: form.type as FinanceRecord["type"] });
    onClose();
  }

  return <Modal eyebrow={item.originId ? `Lançamento · origem ${item.originId}` : "Editar lançamento"} title={item.title} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Salvar alterações</button></>}>
    <SelectField label="Tipo" value={form.type} onChange={(value) => set("type", value)} options={[{ value: "receivable", label: "A receber (entrada)" }, { value: "payable", label: "A pagar (saída)" }]} />
    <TextField label="Título" value={form.title} onChange={(value) => set("title", value)} required />
    <label className="field-wrap">{form.type === "receivable" ? "Cliente" : "Fornecedor / destino"}<input list="finance-parties" value={form.party} onChange={(event) => set("party", event.target.value)} /><datalist id="finance-parties">{parties.map((name) => <option key={name} value={name} />)}</datalist></label>
    <div className="dialog-grid"><TextField label="Valor (R$)" value={form.amount} onChange={(value) => set("amount", value)} inputMode="decimal" required /><TextField label="Vencimento" type="date" value={form.dueDate} onChange={(value) => set("dueDate", value)} /></div>
    <TextField label="Categoria" value={form.category} onChange={(value) => set("category", value)} />
    {item.status === "paid" && <p className="agenda-period-hint">Este lançamento já está baixado. Para alterar a situação, use "Reabrir" na lista.</p>}
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}
