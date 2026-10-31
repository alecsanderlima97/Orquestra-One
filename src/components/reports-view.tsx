"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { formatBRL } from "@/src/domain/money";
import { todayDate } from "@/src/lib/agenda";
import { ISO_DATE, financeStatus } from "@/src/lib/finance-utils";
import { writePeriodReport } from "@/src/lib/report-writer";
import { useDemoData } from "@/src/components/demo-data";
import { ClientSummaryDialog } from "@/src/components/orders-view";
import { COMPANY_NAME, PanelHeader, SelectField, copyToClipboard, printDocument } from "@/src/components/ui-parts";

type Period = "month" | "30d" | "year" | "all";

function periodStart(period: Period, today: string) {
  if (period === "all") return "0000-00-00";
  if (period === "month") return `${today.slice(0, 7)}-01`;
  if (period === "year") return `${today.slice(0, 4)}-01-01`;
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - 29);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const PERIOD_LABEL: Record<Period, string> = { month: "Este mês", "30d": "Últimos 30 dias", year: "Este ano", all: "Todo o período" };

function ReportMetric({ label, value, detail, negative }: { label: string; value: string; detail: string; negative?: boolean }) {
  return <div><span>{label}</span><strong>{value}</strong><small className={negative ? "report-negative" : ""}>{detail}</small></div>;
}

export function ReportsView() {
  const data = useDemoData();
  const today = todayDate();
  const [period, setPeriod] = useState<Period>("month");
  const [draft, setDraft] = useState("");
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);
  const [summaryOrderId, setSummaryOrderId] = useState<string>();
  const start = periodStart(period, today);

  const figures = useMemo(() => {
    const inRange = (date?: string) => Boolean(date) && (date as string).slice(0, 10) >= start;
    const paidIn = data.finance.filter((item) => item.type === "receivable" && item.status === "paid" && inRange(item.paidAt));
    const paidOut = data.finance.filter((item) => item.type === "payable" && item.status === "paid" && inRange(item.paidAt));
    const openIn = data.finance.filter((item) => item.type === "receivable" && item.status !== "paid");
    const openOut = data.finance.filter((item) => item.type === "payable" && item.status !== "paid");
    const overdue = openIn.filter((item) => financeStatus(item, today) === "overdue");
    const sum = (items: Array<{ amountCents: number }>) => items.reduce((total, item) => total + item.amountCents, 0);
    const completed = data.workOrders.filter((order) => order.status === "completed");
    const byService = new Map<string, { count: number; amountCents: number }>();
    const byProfessional = new Map<string, { orders: number; amountCents: number }>();
    completed.forEach((order) => {
      const service = byService.get(order.service) ?? { count: 0, amountCents: 0 };
      byService.set(order.service, { count: service.count + 1, amountCents: service.amountCents + order.amountCents });
      const person = byProfessional.get(order.professional) ?? { orders: 0, amountCents: 0 };
      byProfessional.set(order.professional, { orders: person.orders + 1, amountCents: person.amountCents + order.amountCents });
    });
    return {
      received: sum(paidIn), paidOut: sum(paidOut), toReceive: sum(openIn), toPay: sum(openOut), overdue: sum(overdue), overdueTitles: overdue.map((item) => item.title),
      completed: completed.length, open: data.workOrders.length - completed.length,
      appointments: data.appointments.filter((item) => item.date >= start && (!ISO_DATE.test(item.date) || item.date <= today)).length,
      ticket: completed.length ? Math.round(completed.reduce((total, order) => total + order.amountCents, 0) / completed.length) : 0,
      topServices: [...byService.entries()].map(([service, value]) => ({ service, ...value })).sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
      byProfessional: [...byProfessional.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.amountCents - a.amountCents),
      lowStock: data.stock.filter((item) => item.quantity < item.minimum).map((item) => item.name),
    };
  }, [data.finance, data.workOrders, data.appointments, data.stock, start, today]);

  function generate() {
    setDraft(writePeriodReport({
      label: PERIOD_LABEL[period], companyName: COMPANY_NAME, received: figures.received, toReceive: figures.toReceive, overdue: figures.overdue, paidOut: figures.paidOut, toPay: figures.toPay,
      completedOrders: figures.completed, openOrders: figures.open, appointments: figures.appointments, topServices: figures.topServices, byProfessional: figures.byProfessional, lowStock: figures.lowStock, overdueTitles: figures.overdueTitles,
    }));
    setCopied(false);
  }

  async function copy() {
    setCopied(await copyToClipboard(draft));
    window.setTimeout(() => setCopied(false), 2000);
  }

  const result = figures.received - figures.paidOut;
  const maxService = Math.max(1, ...figures.topServices.map((item) => item.amountCents));
  const summaryOrder = data.workOrders.find((order) => order.id === summaryOrderId);

  return <section className="panel full-panel">
    <PanelHeader eyebrow="Dados operacionais consolidados" title="Relatórios" action="Gerar relatório" onAction={generate} />
    <div className="view-toolbar"><div className="filter-pills">{(Object.keys(PERIOD_LABEL) as Period[]).map((item) => <button key={item} type="button" className={`filter-pill ${period === item ? "filter-pill-active" : ""}`} onClick={() => { setPeriod(item); setDraft(""); }}>{PERIOD_LABEL[item]}</button>)}</div></div>
    <div className="report-metrics">
      <ReportMetric label="Recebido" value={formatBRL(figures.received)} detail={`A receber: ${formatBRL(figures.toReceive)}`} />
      <ReportMetric label="Pago" value={formatBRL(figures.paidOut)} detail={`A pagar: ${formatBRL(figures.toPay)}`} negative />
      <ReportMetric label="Resultado" value={formatBRL(result)} detail={figures.overdue ? `${formatBRL(figures.overdue)} vencido` : "Sem cobrança vencida"} negative={result < 0} />
      <ReportMetric label="OS concluídas" value={String(figures.completed)} detail={`${figures.open} em aberto · ticket ${formatBRL(figures.ticket)}`} />
    </div>
    <div className="report-columns">
      <div className="report-chart">
        <div className="report-chart-head"><strong>Serviços que mais renderam</strong><span><i /> Ordens concluídas</span></div>
        {figures.topServices.length ? <ul className="report-bars">{figures.topServices.map((item) => <li key={item.service}><span>{item.service}<small>{item.count} ordem(ns)</small></span><div><i style={{ width: `${Math.max(6, Math.round(item.amountCents / maxService * 100))}%` }} /></div><strong>{formatBRL(item.amountCents)}</strong></li>)}</ul> : <p className="report-explainer">Nenhuma ordem concluída ainda. Feche uma ordem para ela aparecer aqui.</p>}
      </div>
      <div className="report-chart">
        <div className="report-chart-head"><strong>Por responsável</strong></div>
        {figures.byProfessional.length ? <ul className="report-bars">{figures.byProfessional.map((item) => <li key={item.name}><span>{item.name}<small>{item.orders} ordem(ns)</small></span><div><i style={{ width: `${Math.max(6, Math.round(item.amountCents / Math.max(1, figures.byProfessional[0].amountCents) * 100))}%` }} /></div><strong>{formatBRL(item.amountCents)}</strong></li>)}</ul> : <p className="report-explainer">Sem ordens concluídas por responsável.</p>}
      </div>
    </div>
    <div className="report-chart">
      <div className="report-chart-head"><strong>Relatório gerencial com redação assistida</strong><span className="report-badge">Prévia local · IA real em seguida</span></div>
      <p className="report-explainer">Monta um texto pronto com os números do período e os pontos de atenção. Você revisa e edita antes de usar. A IA real entra depois, numa rota protegida no servidor, com limite de uso, usando estes mesmos dados.</p>
      <button className="primary-button" type="button" onClick={generate}><Sparkles size={16} /> Montar relatório de {PERIOD_LABEL[period].toLowerCase()}</button>
      {draft && <>
        <label className="field-wrap">Texto do relatório (editável)<textarea className="summary-textarea" rows={16} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        <div className="report-actions"><button className="secondary-button" type="button" onClick={copy}>{copied ? "Copiado!" : "Copiar"}</button><button className="secondary-button" type="button" onClick={() => printDocument(`Relatório — ${PERIOD_LABEL[period]}`, draft)}>Imprimir / PDF</button></div>
      </>}
    </div>
    <div className="report-chart">
      <div className="report-chart-head"><strong>Ordem de serviço para entregar ao cliente</strong><span className="report-badge">Usa o diário do técnico</span></div>
      <p className="report-explainer">Escolha uma ordem: o sistema organiza descrição, etapas do diário e materiais em um texto bonito para o cliente, que você revisa, imprime em PDF ou envia no WhatsApp.</p>
      <div className="report-order-pick">
        <SelectField label="Ordem de serviço" value={orderId} onChange={setOrderId} options={data.workOrders.map((order) => ({ value: order.id, label: `${order.id} · ${order.client} · ${order.service}` }))} />
        <button className="primary-button" type="button" disabled={!orderId} onClick={() => setSummaryOrderId(orderId)}><Sparkles size={16} /> Montar texto da OS</button>
      </div>
    </div>
    {summaryOrder && <ClientSummaryDialog order={summaryOrder} onClose={() => setSummaryOrderId(undefined)} />}
  </section>;
}
