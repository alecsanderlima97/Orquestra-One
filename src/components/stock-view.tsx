"use client";

import { useState } from "react";
import { Activity, Boxes, PackageCheck, Search, Wrench } from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import { useDemoData, type StockRecord } from "@/src/components/demo-data";
import type { RecordKind } from "@/src/components/record-dialog";
import { EmptyState, Modal, PanelHeader, SelectField, TextField, centsToInput, parseMoneyToCents, rowOpenProps } from "@/src/components/ui-parts";

type CategoryFilter = "all" | StockRecord["category"] | "low";
type MovementMode = "in" | "out" | "count";

const CATEGORY_LABEL: Record<StockRecord["category"], string> = { consumable: "Consumo", resale: "Revenda", tool: "Ferramenta" };
const OUT_REASONS = ["Uso em serviço", "Perda ou quebra", "Venda", "Empréstimo", "Outro"];

function toNumber(value: string) {
  return Number(value.replace(",", "."));
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function StockView({ onOpen }: { onOpen: (kind: RecordKind) => void }) {
  const data = useDemoData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [detailId, setDetailId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const [movement, setMovement] = useState<{ stockId: string; mode: MovementMode }>();
  const isLow = (item: StockRecord) => item.quantity < item.minimum;
  const list = data.stock.filter((item) => {
    const matchesFilter = filter === "all" || (filter === "low" ? isLow(item) : item.category === filter);
    return matchesFilter && `${item.name} ${item.location} ${CATEGORY_LABEL[item.category]}`.toLowerCase().includes(query.toLowerCase());
  });
  const low = data.stock.filter(isLow).length;
  const totalValue = data.stock.reduce((sum, item) => sum + Math.round(item.quantity * item.costCents), 0);
  const filters: Array<{ id: CategoryFilter; label: string }> = [{ id: "all", label: "Tudo" }, { id: "consumable", label: "Consumo" }, { id: "resale", label: "Revenda" }, { id: "tool", label: "Ferramentas" }, { id: "low", label: `Abaixo do mínimo (${low})` }];

  function remove(item: StockRecord) {
    const linked = data.workOrders.filter((order) => order.status !== "completed" && order.materialLines.some((line) => line.stockId === item.id)).length;
    const warning = linked ? ` Ele será desvinculado de ${linked} ordem(ns) em andamento.` : "";
    if (window.confirm(`Excluir "${item.name}" do estoque?${warning} O histórico de movimentações deste item também será apagado.`)) data.removeStock(item.id);
  }

  return <section className="panel full-panel">
    <PanelHeader eyebrow="Estoque principal" title="Materiais e ferramentas" action="Adicionar item" onAction={() => onOpen("stock")} />
    <div className="stock-summary">
      <div><PackageCheck size={18} /><span>Itens cadastrados<strong>{data.stock.length}</strong></span></div>
      <div><Wrench size={18} /><span>Ferramentas<strong>{data.stock.filter((item) => item.category === "tool").length}</strong></span></div>
      <div className={low ? "stock-alert" : ""}><Activity size={18} /><span>Abaixo do mínimo<strong>{low}</strong></span></div>
      <div><Boxes size={18} /><span>Valor em estoque<strong>{formatBRL(totalValue)}</strong></span></div>
    </div>
    <div className="view-toolbar">
      <div className="filter-pills">{filters.map((item) => <button key={item.id} type="button" className={`filter-pill ${filter === item.id ? "filter-pill-active" : ""}`} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
      <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item ou local" /></label>
    </div>
    <p className="view-hint">Dê dois cliques (ou toque) em um item para ver o histórico de entradas e saídas.</p>
    <div className="stock-list">
      {list.map((item) => <div className="stock-row row-openable" key={item.id} {...rowOpenProps(() => setDetailId(item.id))}>
        <div className={`stock-symbol stock-symbol-${item.category}`}>{item.category === "tool" ? <Wrench size={17} /> : item.category === "resale" ? <PackageCheck size={17} /> : <Boxes size={17} />}</div>
        <div className="stock-info"><strong>{item.name}</strong><span>{item.location || "Sem local"} · {CATEGORY_LABEL[item.category]}{item.costCents ? ` · ${formatBRL(item.costCents)} por ${item.unit}` : ""}</span></div>
        <div className={`stock-quantity ${isLow(item) ? "stock-low" : ""}`}><strong>{formatQuantity(item.quantity)} {item.unit}</strong><small>{isLow(item) ? "Repor em breve" : `Mínimo ${formatQuantity(item.minimum)} ${item.unit}`}</small></div>
        <div className="row-actions">
          <button className="table-action table-action-success" type="button" onClick={() => setMovement({ stockId: item.id, mode: "in" })}>Entrada</button>
          <button className="table-action" type="button" onClick={() => setMovement({ stockId: item.id, mode: "out" })}>Saída</button>
          <button className="table-action" type="button" onClick={() => setMovement({ stockId: item.id, mode: "count" })}>Contagem</button>
          <button className="table-action" type="button" onClick={() => setEditId(item.id)}>Editar</button>
          <button className="table-action table-action-danger" type="button" onClick={() => remove(item)}>Excluir</button>
        </div>
      </div>)}
      {!list.length && <EmptyState message="Nenhum item corresponde aos filtros." />}
    </div>
    {detailId && <StockDetailDialog stockId={detailId} onClose={() => setDetailId(undefined)} onMove={(mode) => { setMovement({ stockId: detailId, mode }); setDetailId(undefined); }} onEdit={() => { setEditId(detailId); setDetailId(undefined); }} />}
    {movement && <StockMovementDialog stockId={movement.stockId} mode={movement.mode} onClose={() => setMovement(undefined)} />}
    {editId && <StockEditDialog stockId={editId} onClose={() => setEditId(undefined)} />}
  </section>;
}

function StockDetailDialog({ stockId, onClose, onMove, onEdit }: { stockId: string; onClose: () => void; onMove: (mode: MovementMode) => void; onEdit: () => void }) {
  const data = useDemoData();
  const item = data.stock.find((entry) => entry.id === stockId);
  if (!item) return null;
  const movements = (data.stockMovements ?? []).filter((entry) => entry.stockId === item.id);
  const reserved = data.workOrders.filter((order) => order.status !== "completed").flatMap((order) => order.materialLines.filter((line) => line.stockId === item.id).map((line) => ({ order, quantity: line.quantity })));
  return <Modal eyebrow={`${CATEGORY_LABEL[item.category]} · ${item.location || "sem local"}`} title={item.name} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Fechar</button><button className="secondary-button" type="button" onClick={onEdit}>Editar</button><button className="secondary-button" type="button" onClick={() => onMove("out")}>Saída</button><button className="primary-button" type="button" onClick={() => onMove("in")}>Entrada</button></>}>
    <section className="order-detail-section">
      <dl className="order-detail-grid">
        <div><dt>Em estoque</dt><dd>{formatQuantity(item.quantity)} {item.unit}</dd></div>
        <div><dt>Mínimo</dt><dd>{formatQuantity(item.minimum)} {item.unit}</dd></div>
        <div><dt>Custo por {item.unit}</dt><dd>{item.costCents ? formatBRL(item.costCents) : "Não informado"}</dd></div>
        <div><dt>Valor parado</dt><dd>{formatBRL(Math.round(item.quantity * item.costCents))}</dd></div>
      </dl>
      {item.quantity < item.minimum && <p className="agenda-edit-error">Abaixo do mínimo: faltam {formatQuantity(item.minimum - item.quantity)} {item.unit} para o nível seguro.</p>}
    </section>
    {reserved.length > 0 && <section className="order-detail-section"><h3>Previsto em ordens abertas</h3><ul className="order-detail-list">{reserved.map(({ order, quantity }) => <li key={order.id}><strong>{formatQuantity(quantity)} {item.unit}</strong> · {order.id} {order.service}</li>)}</ul><p className="order-detail-empty">A baixa só acontece quando a ordem é fechada.</p></section>}
    <section className="order-detail-section"><h3>Movimentações ({movements.length})</h3>{movements.length ? <ul className="order-detail-list">{movements.slice(0, 30).map((entry) => <li key={entry.id}><time>{entry.createdAt}</time><strong className={entry.delta > 0 ? "value-in" : "value-out"}>{entry.delta > 0 ? "+" : "−"}{formatQuantity(Math.abs(entry.delta))} {item.unit}</strong> · {entry.reason}</li>)}</ul> : <p className="order-detail-empty">Nenhuma entrada ou saída registrada ainda.</p>}</section>
  </Modal>;
}

function StockMovementDialog({ stockId, mode, onClose }: { stockId: string; mode: MovementMode; onClose: () => void }) {
  const data = useDemoData();
  const item = data.stock.find((entry) => entry.id === stockId);
  const [quantity, setQuantity] = useState(() => mode === "count" ? String(item?.quantity ?? 0) : item && item.quantity < item.minimum && mode === "in" ? String(item.minimum - item.quantity) : "1");
  const [reason, setReason] = useState(mode === "out" ? OUT_REASONS[0] : mode === "count" ? "Contagem de inventário" : "Compra");
  const [cost, setCost] = useState(item?.costCents ? centsToInput(item.costCents) : "");
  const [supplier, setSupplier] = useState("");
  const [launch, setLaunch] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  if (!item) return null;
  const titles: Record<MovementMode, string> = { in: "Entrada de material", out: "Saída de material", count: "Contagem de inventário" };

  function save() {
    if (!item) return;
    const amount = toNumber(quantity);
    if (!Number.isFinite(amount) || amount < 0 || (mode !== "count" && amount === 0)) return setError("Informe uma quantidade válida.");
    if (mode === "out") {
      if (amount > item.quantity) return setError(`Só há ${formatQuantity(item.quantity)} ${item.unit} em estoque.`);
      data.adjustStock(item.id, -amount, reason);
    } else if (mode === "count") {
      if (amount === item.quantity) return onClose();
      data.adjustStock(item.id, amount - item.quantity, reason);
    } else {
      const costCents = parseMoneyToCents(cost);
      if (launch && !costCents) return setError("Para lançar a compra no financeiro, informe o custo unitário.");
      data.adjustStock(item.id, amount, reason, costCents ? { costCents, ...(launch ? { party: supplier, dueDate } : {}) } : undefined);
    }
    onClose();
  }

  return <Modal eyebrow={`${item.name} · hoje ${formatQuantity(item.quantity)} ${item.unit}`} title={titles[mode]} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Registrar</button></>}>
    <TextField label={mode === "count" ? `Quantidade contada (${item.unit})` : `Quantidade (${item.unit})`} value={quantity} onChange={setQuantity} inputMode="decimal" required />
    {mode === "out" ? <SelectField label="Motivo" value={reason} onChange={setReason} options={OUT_REASONS.map((entry) => ({ value: entry, label: entry }))} /> : <TextField label="Motivo / observação" value={reason} onChange={setReason} />}
    {mode === "in" && <>
      <TextField label={`Custo por ${item.unit} (R$)`} value={cost} onChange={setCost} inputMode="decimal" placeholder="Opcional" />
      <label className="agenda-apply-all"><input type="checkbox" checked={launch} onChange={(event) => setLaunch(event.target.checked)} />Lançar esta compra em Contas a pagar</label>
      {launch && <div className="dialog-grid"><SelectField label="Fornecedor" value={supplier} onChange={setSupplier} options={data.suppliers.map((entry) => ({ value: entry.name, label: entry.name }))} placeholder="Sem fornecedor" /><TextField label="Vencimento" type="date" value={dueDate} onChange={setDueDate} /></div>}
    </>}
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}

function StockEditDialog({ stockId, onClose }: { stockId: string; onClose: () => void }) {
  const data = useDemoData();
  const item = data.stock.find((entry) => entry.id === stockId);
  const [form, setForm] = useState(() => ({ name: item?.name ?? "", category: item?.category ?? "consumable", unit: item?.unit ?? "un", minimum: String(item?.minimum ?? 0), location: item?.location ?? "", cost: item?.costCents ? centsToInput(item.costCents) : "" }));
  const [error, setError] = useState("");
  if (!item) return null;
  const set = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  function save() {
    if (!item) return;
    const minimum = toNumber(form.minimum);
    if (!form.name.trim()) return setError("Informe o nome do item.");
    if (!Number.isFinite(minimum) || minimum < 0) return setError("Informe um mínimo válido.");
    data.updateStock(item.id, { name: form.name.trim(), category: form.category as StockRecord["category"], unit: form.unit.trim() || "un", minimum, location: form.location.trim(), costCents: parseMoneyToCents(form.cost) });
    onClose();
  }

  return <Modal eyebrow="Editar item" title={item.name} onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={save}>Salvar alterações</button></>}>
    <TextField label="Nome" value={form.name} onChange={(value) => set("name", value)} required />
    <div className="dialog-grid"><SelectField label="Tipo" value={form.category} onChange={(value) => set("category", value)} options={[{ value: "consumable", label: "Consumo" }, { value: "resale", label: "Revenda" }, { value: "tool", label: "Ferramenta" }]} /><TextField label="Unidade" value={form.unit} onChange={(value) => set("unit", value)} placeholder="un, m, kg, L, cx" /></div>
    <div className="dialog-grid"><TextField label="Estoque mínimo" value={form.minimum} onChange={(value) => set("minimum", value)} inputMode="decimal" /><TextField label="Custo unitário (R$)" value={form.cost} onChange={(value) => set("cost", value)} inputMode="decimal" /></div>
    <TextField label="Local" value={form.location} onChange={(value) => set("location", value)} placeholder="Prateleira, veículo, maleta..." />
    <p className="agenda-period-hint">Para mudar a quantidade em estoque use Entrada, Saída ou Contagem: assim o histórico fica registrado.</p>
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}
