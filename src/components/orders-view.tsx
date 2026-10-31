"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, Sparkles } from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import { todayDate } from "@/src/lib/agenda";
import { writeClientServiceSummary, writeWhatsappMessage } from "@/src/lib/report-writer";
import { useDemoData, type WorkOrderRecord } from "@/src/components/demo-data";
import type { RecordKind } from "@/src/components/record-dialog";
import {
  COMPANY_NAME, EmptyState, Modal, PanelHeader, SelectField, StatusPill, TextField, VoiceArea, WhatsAppLink, centsToInput, copyToClipboard,
  parseMoneyToCents, printDocument, rowOpenProps, whatsappHref,
} from "@/src/components/ui-parts";

type OpenRecord = (kind: RecordKind, id?: string) => void;

function confirmCloseOrder(orderId: string, close: (orderId: string) => void) {
  if (window.confirm(`Fechar a ${orderId}? Isso lança a cobrança no financeiro e baixa os materiais do estoque.`)) close(orderId);
}

export function OrdersView({ onOpen }: { onOpen: OpenRecord }) {
  const data = useDemoData();
  const [filter, setFilter] = useState<"all" | WorkOrderRecord["status"]>("all");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const [descriptionId, setDescriptionId] = useState<string>();
  const list = data.workOrders.filter((item) => (filter === "all" || item.status === filter) && `${item.id} ${item.client} ${item.service} ${item.professional}`.toLowerCase().includes(query.toLowerCase()));
  const count = (status: WorkOrderRecord["status"]) => data.workOrders.filter((item) => item.status === status).length;
  const filters: Array<{ id: "all" | WorkOrderRecord["status"]; label: string; total: number }> = [
    { id: "all", label: "Todas", total: data.workOrders.length },
    { id: "in_progress", label: "Em andamento", total: count("in_progress") },
    { id: "waiting", label: "Aguardando", total: count("waiting") },
    { id: "completed", label: "Concluídas", total: count("completed") },
  ];

  function cancelOrder(order: WorkOrderRecord) {
    if (window.confirm(`Cancelar a ${order.id} (${order.service})? O diário e a descrição serão apagados. Os agendamentos continuam, sem ordem vinculada.`)) data.removeWorkOrder(order.id);
  }

  return <section className="panel full-panel">
    <PanelHeader eyebrow={`${data.workOrders.length} ordens registradas`} title="Acompanhe os serviços" action="Nova ordem" onAction={() => onOpen("order")} />
    <div className="view-toolbar">
      <div className="filter-pills">{filters.map((item) => <button key={item.id} className={`filter-pill ${filter === item.id ? "filter-pill-active" : ""}`} type="button" onClick={() => setFilter(item.id)}>{item.label} <span>{item.total}</span></button>)}</div>
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, cliente ou responsável" /></label>
    </div>
    <p className="view-hint">Dê dois cliques (ou toque, no celular) em uma ordem para ver tudo: cliente, materiais, diário e o texto para entregar ao cliente.</p>
    <div className="orders-table">
      <div className="table-head"><span>Ordem</span><span>Serviço / cliente</span><span>Valor</span><span>Status</span><span>Ações</span></div>
      {list.map((order) => <div className="order-row operational-order-row row-openable" key={order.id} {...rowOpenProps(() => setDetailId(order.id))}>
        <div className="order-id">{order.id}</div>
        <div className="order-info"><strong>{order.service}</strong><span>{order.client} · {order.professional}{order.diary.length ? ` · ${order.diary.length} registro(s)` : ""}</span></div>
        <div className="order-amount">{formatBRL(order.amountCents)}<small>{order.updatedAt}</small></div>
        <StatusPill status={order.status} />
        <div className="row-actions">
          <button className="table-action" type="button" onClick={() => setDetailId(order.id)}>Detalhes</button>
          <button className="table-action" type="button" onClick={() => onOpen("diary", order.id)}>Diário</button>
          <button className="table-action" type="button" onClick={() => setEditId(order.id)}>Editar</button>
          <button className="table-action" type="button" onClick={() => setDescriptionId(order.id)}>Descrição</button>
          {order.status !== "completed" && <button className="table-action" type="button" onClick={() => data.setWorkOrderStatus(order.id, order.status === "waiting" ? "in_progress" : "waiting")}>{order.status === "waiting" ? "Retomar" : "Pausar"}</button>}
          {order.status !== "completed" && <button className="table-action table-action-success" type="button" onClick={() => confirmCloseOrder(order.id, data.closeWorkOrder)}>Fechar</button>}
          {order.status !== "completed" && <button className="table-action table-action-danger" type="button" onClick={() => cancelOrder(order)}>Cancelar</button>}
        </div>
      </div>)}
      {!list.length && <EmptyState message="Nenhuma ordem corresponde aos filtros." />}
    </div>
    {detailId && <OrderDetailDialog orderId={detailId} onClose={() => setDetailId(undefined)} onOpen={onOpen} onEdit={() => { setEditId(detailId); setDetailId(undefined); }} onDescription={() => { setDescriptionId(detailId); setDetailId(undefined); }} />}
    {editId && <OrderEditDialog orderId={editId} onClose={() => setEditId(undefined)} />}
    {descriptionId && <DescriptionDialog orderId={descriptionId} onClose={() => setDescriptionId(undefined)} />}
  </section>;
}

function OrderEditDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const data = useDemoData();
  const order = data.workOrders.find((item) => item.id === orderId);
  const [service, setService] = useState(order?.service ?? "");
  const [professional, setProfessional] = useState(order?.professional ?? "Você");
  const [amount, setAmount] = useState(order ? centsToInput(order.amountCents) : "");
  const [error, setError] = useState("");
  if (!order) return null;
  const charge = data.finance.find((item) => item.originId === order.id);
  const amountLocked = charge?.status === "paid";
  const people = Array.from(new Set(["Você", ...data.team.filter((member) => member.active !== false).map((member) => member.name), order.professional]));

  function save() {
    if (!order) return;
    if (!service.trim()) return setError("Descreva o serviço.");
    const cents = parseMoneyToCents(amount);
    if (cents < 0) return setError("Informe um valor válido.");
    data.updateWorkOrder(order.id, { service: service.trim(), professional, ...(amountLocked ? {} : { amountCents: cents }) });
    onClose();
  }

  return <Modal eyebrow={`Editar · ${order.id}`} title={order.client} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Salvar alterações</button></>}>
    <TextField label="Serviço" value={service} onChange={setService} required />
    <SelectField label="Responsável" value={professional} onChange={setProfessional} options={people.map((name) => ({ value: name, label: name }))} />
    <TextField label="Valor do serviço (R$)" value={amount} onChange={setAmount} inputMode="decimal" />
    {amountLocked ? <p className="agenda-period-hint">O valor não pode mudar porque a cobrança desta ordem já foi recebida. Reabra a cobrança no Financeiro para alterar.</p> : charge ? <p className="agenda-period-hint">A cobrança em aberto no Financeiro será atualizada junto.</p> : null}
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}

function DescriptionDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const data = useDemoData();
  const order = data.workOrders.find((item) => item.id === orderId);
  const [draft, setDraft] = useState(order?.description ?? "");
  if (!order) return null;
  const versions = order.descriptionHistory ?? [{ id: "legacy", text: order.description, createdAt: "Versão atual" }];
  return <Modal eyebrow={`Descrição preservada · ${order.id}`} title="Versões do escopo e do relato do cliente" onClose={onClose} footer={<button className="secondary-button" type="button" onClick={onClose}>Fechar</button>}>
    <p className="description-history-note">Cada ajuste cria uma nova versão. Nada é apagado: o histórico completo segue disponível para conferência e para o texto entregue ao cliente.</p>
    <VoiceArea label="Descrição atual" value={draft} onChange={setDraft} />
    <button className="primary-button description-save" type="button" onClick={() => data.reviseWorkOrderDescription(order.id, draft)} disabled={!draft.trim() || draft.trim() === order.description}><CheckCircle2 size={15} /> Salvar nova versão</button>
    <div className="description-version-list">{versions.map((revision, index) => <article key={revision.id}><span>{index === 0 ? "Atual" : `Versão ${versions.length - index}`}</span><p>{revision.text}</p><small>{revision.createdAt}</small></article>)}</div>
  </Modal>;
}

function OrderDetailDialog({ orderId, onClose, onOpen, onEdit, onDescription }: { orderId: string; onClose: () => void; onOpen: OpenRecord; onEdit: () => void; onDescription: () => void }) {
  const data = useDemoData();
  const order = data.workOrders.find((item) => item.id === orderId);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [materialQty, setMaterialQty] = useState("1");
  const [materialError, setMaterialError] = useState("");
  if (!order) return null;
  const client = data.clients.find((item) => item.id === order.clientId);
  const charges = data.finance.filter((item) => item.originId === order.id);
  const appointments = data.appointments.filter((item) => item.workOrderId === order.id).sort((a, b) => a.date.localeCompare(b.date));
  const stockOf = (stockId: string) => data.stock.find((item) => item.id === stockId);
  const locked = order.status === "completed";
  const usable = data.stock.filter((item) => item.category !== "tool");

  function addMaterial() {
    if (!order) return;
    const quantity = Number(materialQty.replace(",", "."));
    if (!materialId) return setMaterialError("Escolha o material.");
    if (!Number.isFinite(quantity) || quantity <= 0) return setMaterialError("Informe uma quantidade maior que zero.");
    const item = stockOf(materialId);
    const already = order.materialLines.find((line) => line.stockId === materialId)?.quantity ?? 0;
    if (item && already + quantity > item.quantity && !window.confirm(`O estoque de "${item.name}" tem ${item.quantity} ${item.unit}, menos do que o total vinculado (${already + quantity}). Vincular mesmo assim?`)) return;
    data.addOrderMaterial(order.id, materialId, quantity);
    setMaterialId("");
    setMaterialQty("1");
    setMaterialError("");
  }

  return <>
    <Modal size="wide" eyebrow={`Ordem de serviço · ${order.id}`} title={order.service} onClose={onClose} footer={<>
      <button className="secondary-button" type="button" onClick={onClose}>Fechar</button>
      <button className="secondary-button" type="button" onClick={onEdit}>Editar</button>
      <button className="secondary-button" type="button" onClick={() => setSummaryOpen(true)}><Sparkles size={15} /> Texto para o cliente</button>
      {!locked && <button className="secondary-button" type="button" onClick={() => confirmCloseOrder(order.id, data.closeWorkOrder)}>Fechar ordem</button>}
      <button className="primary-button" type="button" onClick={() => { onClose(); onOpen("diary", order.id); }}>Registrar no diário</button>
    </>}>
      <section className="order-detail-section">
        <h3>Resumo</h3>
        <div className="order-detail-meta"><strong>{order.id}</strong><StatusPill status={order.status} /><span>{formatBRL(order.amountCents)}</span><small>{order.updatedAt}</small></div>
        <dl className="order-detail-grid">
          <div><dt>Responsável</dt><dd>{order.professional}</dd></div>
          <div><dt>Cliente</dt><dd>{order.client}</dd></div>
          <div className="order-detail-wide"><dt>Descrição atual{(order.descriptionHistory?.length ?? 0) > 1 ? ` · ${order.descriptionHistory?.length} versões salvas` : ""}</dt><dd>{order.description}</dd></div>
        </dl>
        <button className="table-action" type="button" onClick={onDescription}>Ver e revisar descrição</button>
      </section>
      <section className="order-detail-section">
        <h3>Cliente</h3>
        {client ? <>
          <dl className="order-detail-grid">
            <div><dt>Telefone</dt><dd>{client.phone || "Não informado"}</dd></div>
            <div><dt>E-mail</dt><dd>{client.email || "Não informado"}</dd></div>
            <div className="order-detail-wide"><dt>Endereço</dt><dd>{[client.address, [client.city, client.state].filter(Boolean).join(" · "), client.cep].filter(Boolean).join(" — ") || "Não informado"}</dd></div>
          </dl>
          <WhatsAppLink phone={client.phone} label="Conversar no WhatsApp" message={writeWhatsappMessage(order, client.name)} />
        </> : <p className="order-detail-empty">Cadastro do cliente não encontrado.</p>}
      </section>
      <section className="order-detail-section">
        <h3>Materiais usados</h3>
        {order.materialLines.length ? <ul className="order-detail-list">{order.materialLines.map((line) => {
          const item = stockOf(line.stockId);
          return <li key={line.stockId}><strong>{line.quantity} {item?.unit ?? "un"}</strong> · {item?.name ?? line.stockId}{!locked && <button className="table-action" type="button" onClick={() => data.removeOrderMaterial(order.id, line.stockId)}>Remover</button>}</li>;
        })}</ul> : <p className="order-detail-empty">Nenhum material vinculado. {locked ? "" : "A baixa no estoque acontece quando a ordem é fechada."}</p>}
        {!locked && <div className="material-add-row">
          <SelectField label="Adicionar material" value={materialId} onChange={setMaterialId} options={usable.map((item) => ({ value: item.id, label: `${item.name} (${item.quantity} ${item.unit})` }))} />
          <TextField label="Quantidade" value={materialQty} onChange={setMaterialQty} inputMode="decimal" />
          <button className="secondary-button" type="button" onClick={addMaterial}>Vincular</button>
        </div>}
        {materialError && <p className="agenda-edit-error" role="alert">{materialError}</p>}
      </section>
      {charges.length > 0 && <section className="order-detail-section">
        <h3>Cobrança</h3>
        <ul className="order-detail-list">{charges.map((charge) => <li key={charge.id}>{formatBRL(charge.amountCents)} · vence {charge.dueDate} · {charge.status === "paid" ? "recebido" : "em aberto"}</li>)}</ul>
      </section>}
      {appointments.length > 0 && <section className="order-detail-section">
        <h3>Agenda desta ordem</h3>
        <ul className="order-detail-list">{appointments.map((item) => <li key={item.id}>{item.date.split("-").reverse().join("/")} às {item.time} · {item.duration} · {item.professional}</li>)}</ul>
      </section>}
      <section className="order-detail-section">
        <h3>Diário ({order.diary.length})</h3>
        {order.diary.length ? <ul className="order-detail-list">{order.diary.map((entry) => <li key={entry.id}><time>{entry.createdAt}</time>{entry.text}</li>)}</ul> : <p className="order-detail-empty">Nenhum registro no diário ainda.</p>}
      </section>
    </Modal>
    {summaryOpen && <ClientSummaryDialog order={order} onClose={() => setSummaryOpen(false)} />}
  </>;
}

export function ClientSummaryDialog({ order, onClose }: { order: WorkOrderRecord; onClose: () => void }) {
  const data = useDemoData();
  const client = data.clients.find((item) => item.id === order.clientId);
  const generate = useMemo(() => () => writeClientServiceSummary({
    order,
    client,
    companyName: COMPANY_NAME,
    stockName: (stockId) => data.stock.find((item) => item.id === stockId)?.name ?? stockId,
    stockUnit: (stockId) => data.stock.find((item) => item.id === stockId)?.unit ?? "un",
    today: todayDate().split("-").reverse().join("/"),
  }), [order, client, data.stock]);
  const [text, setText] = useState(generate);
  const [copied, setCopied] = useState(false);
  const whatsapp = client?.phone ? whatsappHref(client.phone, text) : "";

  async function copy() {
    setCopied(await copyToClipboard(text));
    window.setTimeout(() => setCopied(false), 2000);
  }

  return <Modal size="wide" eyebrow={`Texto para o cliente · ${order.id}`} title="Revise antes de enviar" onClose={onClose} footer={<>
    <button className="secondary-button" type="button" onClick={() => { if (window.confirm("Montar o texto de novo? Suas edições nesta tela serão substituídas.")) setText(generate()); }}>Montar de novo</button>
    <button className="secondary-button" type="button" onClick={copy}>{copied ? "Copiado!" : "Copiar"}</button>
    <button className="secondary-button" type="button" onClick={() => printDocument(`${order.id} — ${order.service}`, text)}>Imprimir / PDF</button>
    {whatsapp ? <a className="primary-button" href={whatsapp} target="_blank" rel="noreferrer">Enviar no WhatsApp</a> : <button className="primary-button" type="button" disabled>Cliente sem WhatsApp</button>}
  </>}>
    <p className="description-history-note">O texto é montado com a descrição do pedido, o diário do técnico e os materiais. Hoje a redação é local (prévia); a IA real entra numa rota protegida no servidor, sempre com revisão sua antes de enviar. Edite o que precisar abaixo.</p>
    <label className="field-wrap">Texto da ordem de serviço<textarea className="summary-textarea" rows={18} value={text} onChange={(event) => setText(event.target.value)} /></label>
  </Modal>;
}
