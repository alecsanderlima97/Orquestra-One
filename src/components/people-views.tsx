"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import { formatCep, formatDocument, formatPhone } from "@/src/lib/brasil";
import { ISO_DATE, formatDueDate } from "@/src/lib/finance-utils";
import { todayDate } from "@/src/lib/agenda";
import { useDemoData, type ClientRecord, type SupplierRecord } from "@/src/components/demo-data";
import type { RecordKind } from "@/src/components/record-dialog";
import { EmptyState, Modal, PanelHeader, SelectField, StatusPill, TextField, WhatsAppLink, rowOpenProps } from "@/src/components/ui-parts";

type ContactForm = { name: string; kind: "pf" | "pj"; document: string; phone: string; email: string; cep: string; address: string; city: string; state: string; category: string };

function shortDate(value: string) {
  return ISO_DATE.test(value) ? value.split("-").reverse().slice(0, 2).join("/") : value;
}

function ContactFields({ form, set, supplier }: { form: ContactForm; set: (key: keyof ContactForm, value: string) => void; supplier?: boolean }) {
  return <>
    <TextField label={supplier ? "Nome do fornecedor" : "Nome"} value={form.name} onChange={(value) => set("name", value)} required />
    {supplier ? <TextField label="Categoria" value={form.category} onChange={(value) => set("category", value)} placeholder="Materiais, peças, elétrica..." /> : null}
    <div className="dialog-grid">
      <SelectField label="Tipo" value={form.kind} onChange={(value) => set("kind", value)} options={[{ value: "pf", label: "Pessoa física" }, { value: "pj", label: "Pessoa jurídica" }]} />
      <TextField label={form.kind === "pj" ? "CNPJ" : "CPF"} value={form.document} onChange={(value) => set("document", formatDocument(value, form.kind))} inputMode="numeric" />
    </div>
    <div className="dialog-grid">
      <TextField label="Telefone / WhatsApp" value={form.phone} onChange={(value) => set("phone", formatPhone(value))} inputMode="tel" />
      <TextField label="E-mail" type="email" value={form.email} onChange={(value) => set("email", value)} inputMode="email" />
    </div>
    <div className="dialog-grid"><TextField label="CEP" value={form.cep} onChange={(value) => set("cep", formatCep(value))} inputMode="numeric" /><TextField label="Endereço" value={form.address} onChange={(value) => set("address", value)} /></div>
    <div className="dialog-grid"><TextField label="Cidade" value={form.city} onChange={(value) => set("city", value)} /><TextField label="UF" value={form.state} onChange={(value) => set("state", value.toUpperCase().slice(0, 2))} /></div>
  </>;
}

/* ------------------------------------------------------------------ clientes */

export function ClientsView({ onOpen }: { onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "history">("name");
  const [detailId, setDetailId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const list = useMemo(() => data.clients.filter((item) => `${item.name} ${item.document} ${item.phone} ${item.city}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.history.length - a.history.length), [data.clients, query, sort]);

  function remove(client: ClientRecord) {
    const orders = data.workOrders.filter((order) => order.clientId === client.id).length;
    const appointments = data.appointments.filter((appointment) => appointment.clientId === client.id).length;
    if (orders || appointments) {
      window.alert(`${client.name} tem ${orders} ordem(ns) de serviço e ${appointments} agendamento(s). Para não perder o histórico, o cadastro não pode ser excluído. Você pode editar os dados.`);
      return;
    }
    if (window.confirm(`Excluir o cadastro de ${client.name}?`)) data.removeClient(client.id);
  }

  return <section className="panel full-panel">
    <PanelHeader eyebrow={`${data.clients.length} pessoas e empresas`} title="Clientes" action="Novo cliente" onAction={() => onOpen("client")} />
    <div className="view-toolbar">
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, CPF/CNPJ, telefone ou cidade" /></label>
      <label className="table-select">Ordenar por<select value={sort} onChange={(event) => setSort(event.target.value as "name" | "history")}><option value="name">Nome</option><option value="history">Histórico</option></select></label>
    </div>
    <p className="view-hint">Dê dois cliques (ou toque) em um cliente para abrir a ficha completa.</p>
    <div className="people-list">
      {list.map((client) => {
        const orders = data.workOrders.filter((order) => order.clientId === client.id).length;
        return <article className="people-row row-openable" key={client.id} {...rowOpenProps(() => setDetailId(client.id))}>
          <span className={`client-avatar client-${client.tone}`}>{client.initials}</span>
          <div className="people-main"><strong>{client.name}</strong><small>{client.kind === "pj" ? "Pessoa jurídica" : "Pessoa física"}{client.document ? ` · ${client.document}` : ""}</small></div>
          <div className="people-cell"><strong>{client.phone || "Sem telefone"}</strong><small>{client.email || "Sem e-mail"}</small></div>
          <div className="people-cell"><strong>{client.city || "Cidade não informada"}{client.state ? ` · ${client.state}` : ""}</strong><small>{client.address || "Endereço não informado"}</small></div>
          <div className="people-cell"><strong>{orders} ordem(ns)</strong><small>{client.history[0] || "Sem histórico"}</small></div>
          <div className="row-actions">
            <WhatsAppLink phone={client.phone} label="WhatsApp" message={`Olá, ${client.name}! Aqui é da sua equipe de atendimento. Como podemos ajudar?`} />
            <button className="table-action" type="button" onClick={() => setDetailId(client.id)}>Ficha</button>
            <button className="table-action" type="button" onClick={() => setEditId(client.id)}>Editar</button>
            <button className="table-action table-action-danger" type="button" onClick={() => remove(client)}>Excluir</button>
          </div>
        </article>;
      })}
      {!list.length && <EmptyState message="Nenhum cliente corresponde à busca." />}
    </div>
    {detailId && <ClientDetailDialog clientId={detailId} onClose={() => setDetailId(undefined)} onEdit={() => { setEditId(detailId); setDetailId(undefined); }} onOpen={onOpen} />}
    {editId && <ClientEditDialog clientId={editId} onClose={() => setEditId(undefined)} />}
  </section>;
}

function ClientDetailDialog({ clientId, onClose, onEdit, onOpen }: { clientId: string; onClose: () => void; onEdit: () => void; onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData();
  const client = data.clients.find((item) => item.id === clientId);
  if (!client) return null;
  const today = todayDate();
  const orders = data.workOrders.filter((order) => order.clientId === client.id);
  const upcoming = data.appointments.filter((item) => item.clientId === client.id && item.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 5);
  const charges = data.finance.filter((item) => item.type === "receivable" && (orders.some((order) => order.id === item.originId) || item.party === client.name));
  const openTotal = charges.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0);
  const totalDone = orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.amountCents, 0);

  return <Modal size="wide" eyebrow={client.kind === "pj" ? "Pessoa jurídica" : "Pessoa física"} title={client.name} onClose={onClose} footer={<>
    <button className="secondary-button" type="button" onClick={onClose}>Fechar</button>
    <button className="secondary-button" type="button" onClick={onEdit}>Editar</button>
    <button className="secondary-button" type="button" onClick={() => { onClose(); onOpen("appointment"); }}>Novo agendamento</button>
    <button className="primary-button" type="button" onClick={() => { onClose(); onOpen("order"); }}>Nova ordem</button>
  </>}>
    <section className="order-detail-section">
      <h3>Contato</h3>
      <dl className="order-detail-grid">
        <div><dt>{client.kind === "pj" ? "CNPJ" : "CPF"}</dt><dd>{client.document || "Não informado"}</dd></div>
        <div><dt>Telefone</dt><dd>{client.phone || "Não informado"}</dd></div>
        <div><dt>E-mail</dt><dd>{client.email || "Não informado"}</dd></div>
        <div className="order-detail-wide"><dt>Endereço</dt><dd>{[client.address, [client.city, client.state].filter(Boolean).join(" · "), client.cep].filter(Boolean).join(" — ") || "Não informado"}</dd></div>
      </dl>
      <WhatsAppLink phone={client.phone} label="Conversar no WhatsApp" message={`Olá, ${client.name}! Aqui é da sua equipe de atendimento. Como podemos ajudar?`} />
    </section>
    <section className="order-detail-section">
      <h3>Resumo</h3>
      <dl className="order-detail-grid">
        <div><dt>Ordens de serviço</dt><dd>{orders.length}</dd></div>
        <div><dt>Já concluído</dt><dd>{formatBRL(totalDone)}</dd></div>
        <div><dt>Em aberto a receber</dt><dd>{formatBRL(openTotal)}</dd></div>
        <div><dt>Próximos agendamentos</dt><dd>{upcoming.length}</dd></div>
      </dl>
    </section>
    {upcoming.length > 0 && <section className="order-detail-section"><h3>Próximos agendamentos</h3><ul className="order-detail-list">{upcoming.map((item) => <li key={item.id}><strong>{shortDate(item.date)} às {item.time}</strong> · {item.service} · {item.professional}</li>)}</ul></section>}
    <section className="order-detail-section">
      <h3>Ordens de serviço ({orders.length})</h3>
      {orders.length ? <ul className="order-detail-list">{orders.map((order) => <li key={order.id}><strong>{order.id}</strong> · {order.service} · {formatBRL(order.amountCents)} <StatusPill status={order.status} /></li>)}</ul> : <p className="order-detail-empty">Nenhuma ordem ainda.</p>}
    </section>
    {charges.length > 0 && <section className="order-detail-section"><h3>Cobranças</h3><ul className="order-detail-list">{charges.map((item) => <li key={item.id}>{item.title} · {formatBRL(item.amountCents)} · {item.status === "paid" ? "recebido" : `vence ${formatDueDate(item.dueDate)}`}</li>)}</ul></section>}
    <section className="order-detail-section"><h3>Histórico</h3><ul className="order-detail-list">{client.history.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}</ul></section>
  </Modal>;
}

function ClientEditDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const data = useDemoData();
  const client = data.clients.find((item) => item.id === clientId);
  const [form, setForm] = useState<ContactForm>(() => ({ name: client?.name ?? "", kind: client?.kind ?? "pf", document: client?.document ?? "", phone: client?.phone ?? "", email: client?.email ?? "", cep: client?.cep ?? "", address: client?.address ?? "", city: client?.city ?? "", state: client?.state ?? "", category: "" }));
  const [error, setError] = useState("");
  if (!client) return null;
  const set = (key: keyof ContactForm, value: string) => setForm((previous) => ({ ...previous, [key]: value }) as ContactForm);

  function save() {
    if (!client) return;
    if (!form.name.trim()) return setError("Informe o nome do cliente.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) return setError("Confira o e-mail.");
    data.updateClient(client.id, { name: form.name.trim(), kind: form.kind, document: form.document, phone: form.phone, email: form.email, cep: form.cep, address: form.address, city: form.city, state: form.state });
    onClose();
  }

  return <Modal eyebrow="Editar cliente" title={client.name} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Salvar alterações</button></>}>
    <ContactFields form={form} set={set} />
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}

/* ------------------------------------------------------------------ fornecedores */

export function SuppliersView({ onOpen }: { onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData();
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const list = data.suppliers.filter((item) => `${item.name} ${item.category} ${item.city} ${item.document}`.toLowerCase().includes(query.toLowerCase()));

  function remove(supplier: SupplierRecord) {
    const open = data.finance.filter((item) => item.party === supplier.name && item.status !== "paid").length;
    if (open) {
      window.alert(`${supplier.name} tem ${open} lançamento(s) em aberto no Financeiro. Baixe ou exclua esses lançamentos antes de remover o fornecedor.`);
      return;
    }
    if (window.confirm(`Excluir o fornecedor ${supplier.name}?`)) data.removeSupplier(supplier.id);
  }

  return <section className="panel full-panel">
    <PanelHeader eyebrow={`${data.suppliers.length} fornecedores cadastrados`} title="Fornecedores" action="Novo fornecedor" onAction={() => onOpen("supplier")} />
    <div className="view-toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fornecedor, CNPJ, categoria ou cidade" /></label></div>
    <p className="view-hint">Dê dois cliques (ou toque) em um fornecedor para ver as compras e os dados completos.</p>
    <div className="people-list">
      {list.map((supplier) => {
        const purchases = data.finance.filter((item) => item.type === "payable" && item.party === supplier.name);
        const owed = purchases.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0);
        return <article className="people-row row-openable" key={supplier.id} {...rowOpenProps(() => setDetailId(supplier.id))}>
          <span className={`client-avatar client-${supplier.tone}`}>{supplier.initials}</span>
          <div className="people-main"><strong>{supplier.name}</strong><small>{supplier.document || "Documento não informado"}</small></div>
          <div className="people-cell"><strong>{supplier.category || "Sem categoria"}</strong><small>{purchases.length} compra(s)</small></div>
          <div className="people-cell"><strong>{supplier.phone || "Sem telefone"}</strong><small>{supplier.email || "Sem e-mail"}</small></div>
          <div className="people-cell"><strong>{supplier.city || "Cidade não informada"}{supplier.state ? ` · ${supplier.state}` : ""}</strong><small>{owed ? `A pagar: ${formatBRL(owed)}` : "Nada em aberto"}</small></div>
          <div className="row-actions">
            <WhatsAppLink phone={supplier.phone} label="WhatsApp" message={`Olá, ${supplier.name}! Precisamos confirmar uma informação sobre o fornecimento. Pode nos retornar, por favor?`} />
            <button className="table-action" type="button" onClick={() => setDetailId(supplier.id)}>Ficha</button>
            <button className="table-action" type="button" onClick={() => setEditId(supplier.id)}>Editar</button>
            <button className="table-action table-action-danger" type="button" onClick={() => remove(supplier)}>Excluir</button>
          </div>
        </article>;
      })}
      {!list.length && <EmptyState message="Nenhum fornecedor corresponde à busca." />}
    </div>
    {detailId && <SupplierDetailDialog supplierId={detailId} onClose={() => setDetailId(undefined)} onEdit={() => { setEditId(detailId); setDetailId(undefined); }} onOpen={onOpen} />}
    {editId && <SupplierEditDialog supplierId={editId} onClose={() => setEditId(undefined)} />}
  </section>;
}

function SupplierDetailDialog({ supplierId, onClose, onEdit, onOpen }: { supplierId: string; onClose: () => void; onEdit: () => void; onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData();
  const supplier = data.suppliers.find((item) => item.id === supplierId);
  if (!supplier) return null;
  const purchases = data.finance.filter((item) => item.type === "payable" && item.party === supplier.name);
  const owed = purchases.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amountCents, 0);
  const paid = purchases.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amountCents, 0);
  return <Modal size="wide" eyebrow={supplier.category || "Fornecedor"} title={supplier.name} onClose={onClose} footer={<>
    <button className="secondary-button" type="button" onClick={onClose}>Fechar</button>
    <button className="secondary-button" type="button" onClick={onEdit}>Editar</button>
    <button className="primary-button" type="button" onClick={() => { onClose(); onOpen("finance"); }}>Lançar compra</button>
  </>}>
    <section className="order-detail-section">
      <h3>Contato</h3>
      <dl className="order-detail-grid">
        <div><dt>Documento</dt><dd>{supplier.document || "Não informado"}</dd></div>
        <div><dt>Telefone</dt><dd>{supplier.phone || "Não informado"}</dd></div>
        <div><dt>E-mail</dt><dd>{supplier.email || "Não informado"}</dd></div>
        <div className="order-detail-wide"><dt>Endereço</dt><dd>{[supplier.address, [supplier.city, supplier.state].filter(Boolean).join(" · "), supplier.cep].filter(Boolean).join(" — ") || "Não informado"}</dd></div>
      </dl>
      <WhatsAppLink phone={supplier.phone} label="Conversar no WhatsApp" message={`Olá, ${supplier.name}! Precisamos confirmar uma informação sobre o fornecimento. Pode nos retornar, por favor?`} />
    </section>
    <section className="order-detail-section">
      <h3>Compras</h3>
      <dl className="order-detail-grid"><div><dt>Em aberto</dt><dd>{formatBRL(owed)}</dd></div><div><dt>Já pago</dt><dd>{formatBRL(paid)}</dd></div></dl>
      {purchases.length ? <ul className="order-detail-list">{purchases.map((item) => <li key={item.id}>{item.title} · {formatBRL(item.amountCents)} · {item.status === "paid" ? "pago" : `vence ${formatDueDate(item.dueDate)}`}</li>)}</ul> : <p className="order-detail-empty">Nenhuma compra lançada para este fornecedor. Lançamentos a pagar com este nome aparecem aqui.</p>}
    </section>
  </Modal>;
}

function SupplierEditDialog({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const data = useDemoData();
  const supplier = data.suppliers.find((item) => item.id === supplierId);
  const [form, setForm] = useState<ContactForm>(() => ({ name: supplier?.name ?? "", kind: supplier && supplier.document.replace(/\D/g, "").length <= 11 && supplier.document ? "pf" : "pj", document: supplier?.document ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", cep: supplier?.cep ?? "", address: supplier?.address ?? "", city: supplier?.city ?? "", state: supplier?.state ?? "", category: supplier?.category ?? "" }));
  const [error, setError] = useState("");
  if (!supplier) return null;
  const set = (key: keyof ContactForm, value: string) => setForm((previous) => ({ ...previous, [key]: value }) as ContactForm);

  function save() {
    if (!supplier) return;
    if (!form.name.trim()) return setError("Informe o nome do fornecedor.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) return setError("Confira o e-mail.");
    const renamed = form.name.trim() !== supplier.name;
    data.updateSupplier(supplier.id, { name: form.name.trim(), category: form.category.trim(), document: form.document, phone: form.phone, email: form.email, cep: form.cep, address: form.address, city: form.city, state: form.state });
    if (renamed) data.finance.filter((item) => item.party === supplier.name).forEach((item) => data.updateFinance(item.id, { party: form.name.trim() }));
    onClose();
  }

  return <Modal eyebrow="Editar fornecedor" title={supplier.name} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Salvar alterações</button></>}>
    <ContactFields form={form} set={set} supplier />
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}
