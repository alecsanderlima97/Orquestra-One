"use client";

import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import { todayDate } from "@/src/lib/agenda";
import { addDaysIso, quoteIsExpired, quoteSubtotal, quoteTotal, writeQuoteText, type QuoteItem, type QuoteRecord } from "@/src/lib/quotes";
import { useDemoData } from "@/src/components/demo-data";
import {
  COMPANY_NAME, EmptyState, Modal, PanelHeader, SelectField, TextField, VoiceArea, centsToInput, copyToClipboard, parseMoneyToCents, printDocument, rowOpenProps, whatsappHref,
} from "@/src/components/ui-parts";

type Shown = "draft" | "sent" | "approved" | "rejected" | "expired";

function shownStatus(quote: QuoteRecord, today: string): Shown {
  return quoteIsExpired(quote, today) ? "expired" : quote.status;
}

const STATUS_COPY: Record<Shown, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "status-open" },
  sent: { label: "Enviado", className: "status-confirmed" },
  approved: { label: "Aprovado", className: "status-in_progress" },
  rejected: { label: "Recusado", className: "status-overdue" },
  expired: { label: "Vencido", className: "status-overdue" },
};

function QuotePill({ shown }: { shown: Shown }) {
  const item = STATUS_COPY[shown];
  return <span className={`status-pill ${item.className}`}><span className="status-dot" />{item.label}</span>;
}

export function QuotesView({ onGoToOrders }: { onGoToOrders: () => void }) {
  const data = useDemoData();
  const today = todayDate();
  const [filter, setFilter] = useState<"all" | Shown>("all");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string>();
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const list = data.quotes.filter((quote) => (filter === "all" || shownStatus(quote, today) === filter) && `${quote.id} ${quote.client} ${quote.title}`.toLowerCase().includes(query.toLowerCase()));
  const count = (status: Shown) => data.quotes.filter((quote) => shownStatus(quote, today) === status).length;
  const filters: Array<{ id: "all" | Shown; label: string; total: number }> = [
    { id: "all", label: "Todos", total: data.quotes.length },
    { id: "draft", label: "Rascunhos", total: count("draft") },
    { id: "sent", label: "Enviados", total: count("sent") },
    { id: "approved", label: "Aprovados", total: count("approved") },
    { id: "rejected", label: "Recusados", total: count("rejected") },
  ];
  const openTotal = data.quotes.filter((quote) => quote.status === "sent").reduce((sum, quote) => sum + quoteTotal(quote), 0);

  return <section className="panel full-panel">
    <PanelHeader eyebrow={`${data.quotes.length} orçamentos · ${formatBRL(openTotal)} aguardando resposta`} title="Orçamentos" action="Novo orçamento" onAction={() => setEditing({})} />
    <div className="view-toolbar">
      <div className="filter-pills">{filters.map((item) => <button key={item.id} className={`filter-pill ${filter === item.id ? "filter-pill-active" : ""}`} type="button" onClick={() => setFilter(item.id)}>{item.label} <span>{item.total}</span></button>)}</div>
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar orçamento ou cliente" /></label>
    </div>
    <p className="view-hint">Monte o orçamento, envie pelo WhatsApp e, quando o cliente aprovar, um toque gera a ordem de serviço.</p>
    <div className="orders-table">
      <div className="table-head"><span>Orçamento</span><span>Serviço / cliente</span><span>Valor</span><span>Status</span><span>Ações</span></div>
      {list.map((quote) => <div className="order-row operational-order-row row-openable" key={quote.id} {...rowOpenProps(() => setDetailId(quote.id))}>
        <div className="order-id">{quote.id}</div>
        <div className="order-info"><strong>{quote.title}</strong><span>{quote.client}{quote.validUntil ? ` · válido até ${quote.validUntil.split("-").reverse().join("/")}` : ""}</span></div>
        <div className="order-amount">{formatBRL(quoteTotal(quote))}<small>{quote.items.length} item(ns)</small></div>
        <QuotePill shown={shownStatus(quote, today)} />
        <div className="row-actions">
          <button className="table-action" type="button" onClick={() => setDetailId(quote.id)}>Abrir</button>
          {quote.status !== "approved" && <button className="table-action" type="button" onClick={() => setEditing({ id: quote.id })}>Editar</button>}
        </div>
      </div>)}
      {!list.length && <EmptyState message={data.quotes.length ? "Nenhum orçamento corresponde aos filtros." : "Nenhum orçamento ainda. Toque em “Novo orçamento”."} />}
    </div>
    {detailId && <QuoteDetailDialog quoteId={detailId} onClose={() => setDetailId(undefined)} onEdit={() => { setEditing({ id: detailId }); setDetailId(undefined); }} onGoToOrders={() => { setDetailId(undefined); onGoToOrders(); }} />}
    {editing && <QuoteEditDialog quoteId={editing.id} onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); setDetailId(id); }} />}
  </section>;
}

type DraftItem = { id: string; description: string; quantity: string; unit: string };

function newItem(): DraftItem {
  return { id: `it-${crypto.randomUUID().slice(0, 8)}`, description: "", quantity: "1", unit: "" };
}

function toNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function QuoteEditDialog({ quoteId, onClose, onSaved }: { quoteId?: string; onClose: () => void; onSaved: (id: string) => void }) {
  const data = useDemoData();
  const existing = quoteId ? data.quotes.find((quote) => quote.id === quoteId) : undefined;
  const [clientId, setClientId] = useState(existing?.clientId ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [items, setItems] = useState<DraftItem[]>(existing ? existing.items.map((item) => ({ id: item.id, description: item.description, quantity: String(item.quantity).replace(".", ","), unit: centsToInput(item.unitCents) })) : [newItem()]);
  const [discount, setDiscount] = useState(existing?.discountCents ? centsToInput(existing.discountCents) : "");
  const [validUntil, setValidUntil] = useState(existing?.validUntil ?? addDaysIso(todayDate(), 7));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");

  const parsed: QuoteItem[] = items.filter((item) => item.description.trim()).map((item) => ({ id: item.id, description: item.description.trim(), quantity: toNumber(item.quantity), unitCents: parseMoneyToCents(item.unit) }));
  const discountCents = parseMoneyToCents(discount);
  const total = quoteTotal({ items: parsed, discountCents });

  function patchItem(id: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function save() {
    const client = data.clients.find((item) => item.id === clientId);
    if (!client) return setError("Escolha o cliente.");
    if (!title.trim()) return setError("Informe o serviço do orçamento.");
    if (!parsed.length) return setError("Adicione ao menos um item com descrição.");
    if (parsed.some((item) => item.quantity <= 0 || item.unitCents <= 0)) return setError("Cada item precisa de quantidade e valor maiores que zero.");
    if (discountCents > quoteTotal({ items: parsed, discountCents: 0 })) return setError("O desconto não pode ser maior que o total.");
    if (existing) {
      data.updateQuote(existing.id, { clientId: client.id, client: client.name, title: title.trim(), items: parsed, discountCents, validUntil, notes: notes.trim() });
      onSaved(existing.id);
    } else {
      onSaved(data.addQuote({ clientId: client.id, client: client.name, title: title.trim(), items: parsed, discountCents, validUntil, notes: notes.trim() }));
    }
  }

  return <Modal size="wide" eyebrow="Orçamento" title={existing ? `Editar ${existing.id}` : "Novo orçamento"} onClose={onClose} footer={<>
    <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
    <button className="primary-button" type="button" onClick={save}>Salvar orçamento</button>
  </>}>
    <div className="dialog-grid">
      <SelectField label="Cliente" value={clientId} onChange={setClientId} options={data.clients.map((client) => ({ value: client.id, label: client.name }))} required />
      <TextField label="Serviço" value={title} onChange={setTitle} placeholder="Ex.: Troca da fiação da cozinha" required />
    </div>
    <div className="quote-items">
      <h4>Itens</h4>
      {items.map((item) => <div className="quote-item-row" key={item.id}>
        <TextField label="Descrição" value={item.description} onChange={(value) => patchItem(item.id, { description: value })} placeholder="Material ou mão de obra" />
        <TextField label="Qtd." value={item.quantity} onChange={(value) => patchItem(item.id, { quantity: value })} inputMode="decimal" />
        <TextField label="Valor unit." value={item.unit} onChange={(value) => patchItem(item.id, { unit: value })} inputMode="decimal" placeholder="0,00" />
        <button className="icon-button" type="button" aria-label="Remover item" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 size={15} /></button>
      </div>)}
      <button className="secondary-button" type="button" onClick={() => setItems((current) => [...current, newItem()])}><Plus size={14} /> Adicionar item</button>
    </div>
    <div className="dialog-grid">
      <TextField label="Desconto (R$)" value={discount} onChange={setDiscount} inputMode="decimal" placeholder="0,00" />
      <TextField label="Válido até" type="date" value={validUntil} onChange={setValidUntil} />
    </div>
    <VoiceArea label="Observações para o cliente" value={notes} onChange={setNotes} rows={3} placeholder="Prazo, forma de pagamento, o que não está incluído…" />
    <p className="quote-total">Total: <strong>{formatBRL(total)}</strong></p>
    {error && <p className="dialog-error">{error}</p>}
  </Modal>;
}

function QuoteDetailDialog({ quoteId, onClose, onEdit, onGoToOrders }: { quoteId: string; onClose: () => void; onEdit: () => void; onGoToOrders: () => void }) {
  const data = useDemoData();
  const quote = data.quotes.find((item) => item.id === quoteId);
  const client = quote ? data.clients.find((item) => item.id === quote.clientId) : undefined;
  const today = todayDate();
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState("");
  if (!quote) return null;
  const text = writeQuoteText(quote, COMPANY_NAME, client?.name ?? quote.client);
  const whatsapp = client?.phone ? whatsappHref(client.phone, text) : "";
  const locked = quote.status === "approved";

  function approve() {
    if (!quote || !window.confirm(`Aprovar o orçamento ${quote.id}? Uma ordem de serviço de ${formatBRL(quoteTotal(quote))} será criada para ${quote.client}.`)) return;
    const orderId = data.approveQuote(quote.id);
    if (orderId) setCreated(orderId);
  }

  return <Modal size="wide" eyebrow={`Orçamento ${quote.id}`} title={quote.title} onClose={onClose} footer={<>
    {!locked && <button className="secondary-button" type="button" onClick={onEdit}>Editar</button>}
    <button className="secondary-button" type="button" onClick={async () => { setCopied(await copyToClipboard(text)); window.setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copiado!" : "Copiar"}</button>
    <button className="secondary-button" type="button" onClick={() => printDocument(`${quote.id} — ${quote.title}`, text)}>Imprimir / PDF</button>
    {whatsapp
      ? <a className="secondary-button" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => { if (quote.status === "draft") data.setQuoteStatus(quote.id, "sent"); }}>Enviar no WhatsApp</a>
      : <button className="secondary-button" type="button" disabled>Cliente sem WhatsApp</button>}
    {!locked && <button className="primary-button" type="button" onClick={approve}>Aprovar e gerar OS</button>}
  </>}>
    <div className="order-detail-section">
      <p><QuotePill shown={shownStatus(quote, today)} /> · Cliente: <strong>{client?.name ?? quote.client}</strong>{quote.validUntil ? ` · válido até ${quote.validUntil.split("-").reverse().join("/")}` : ""}</p>
      <ul className="quote-lines">{quote.items.map((item) => <li key={item.id}><span>{item.quantity} × {item.description}</span><strong>{formatBRL(Math.round(item.quantity * item.unitCents))}</strong></li>)}</ul>
      {quote.discountCents > 0 && <p>Subtotal {formatBRL(quoteSubtotal(quote))} · desconto − {formatBRL(quote.discountCents)}</p>}
      <p className="quote-total">Total: <strong>{formatBRL(quoteTotal(quote))}</strong></p>
      {quote.notes && <p>{quote.notes}</p>}
    </div>
    {(quote.workOrderId || created) && <p className="settings-success">Ordem de serviço <strong>{quote.workOrderId ?? created}</strong> criada a partir deste orçamento. <button className="text-button" type="button" onClick={onGoToOrders}>Abrir ordens</button></p>}
    {!locked && <div className="row-actions">
      {quote.status !== "rejected" && <button className="table-action table-action-danger" type="button" onClick={() => { if (window.confirm("Marcar como recusado pelo cliente?")) data.setQuoteStatus(quote.id, "rejected"); }}>Cliente recusou</button>}
      {quote.status === "rejected" && <button className="table-action" type="button" onClick={() => data.setQuoteStatus(quote.id, "draft")}>Reabrir</button>}
      <button className="table-action table-action-danger" type="button" onClick={() => { if (window.confirm(`Excluir o orçamento ${quote.id}?`)) { data.removeQuote(quote.id); onClose(); } }}>Excluir</button>
    </div>}
  </Modal>;
}
