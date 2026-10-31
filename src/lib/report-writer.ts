import { formatBRL } from "@/src/domain/money";

/**
 * Redação assistida (prévia local).
 * Monta textos organizados a partir dos registros do técnico. A mesma entrada
 * ({ ordem, diário, materiais }) é o que a IA real vai receber numa rota
 * server-side autenticada; até lá, este redator garante uma prévia útil e
 * sempre sujeita a revisão humana antes de ir para o cliente.
 */

export type WriterOrder = {
  id: string;
  service: string;
  professional: string;
  amountCents: number;
  status: "in_progress" | "waiting" | "completed";
  updatedAt: string;
  description: string;
  descriptionHistory?: Array<{ id: string; text: string; createdAt: string }>;
  diary: Array<{ id: string; text: string; createdAt: string }>;
  materialLines: Array<{ stockId: string; quantity: number }>;
};

export type WriterClient = { name: string; phone?: string; address?: string; city?: string; state?: string; document?: string };

function sentence(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const capitalised = clean[0].toUpperCase() + clean.slice(1);
  return /[.!?…]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

function bulletList(items: string[]) {
  return items.map((item) => `• ${item}`).join("\n");
}

export type ClientSummaryInput = {
  order: WriterOrder;
  client?: WriterClient;
  companyName: string;
  stockName: (stockId: string) => string;
  stockUnit: (stockId: string) => string;
  today: string;
};

/** Texto da ordem de serviço para entregar ao cliente. */
export function writeClientServiceSummary({ order, client, companyName, stockName, stockUnit, today }: ClientSummaryInput) {
  const entries = [...order.diary].reverse();
  const requested = order.descriptionHistory?.length ? order.descriptionHistory[order.descriptionHistory.length - 1].text : order.description;
  const done = entries.map((entry) => `${entry.createdAt} — ${sentence(entry.text)}`);
  const materials = order.materialLines.map((line) => `${line.quantity} ${stockUnit(line.stockId)} de ${stockName(line.stockId)}`);
  const place = [client?.address, [client?.city, client?.state].filter(Boolean).join(" · ")].filter(Boolean).join(", ");

  const lines: string[] = [];
  lines.push(`ORDEM DE SERVIÇO ${order.id}`);
  lines.push(companyName);
  lines.push("");
  lines.push(`Cliente: ${client?.name ?? "—"}${client?.document ? ` · ${client.document}` : ""}`);
  if (place) lines.push(`Local: ${place}`);
  lines.push(`Serviço: ${order.service}`);
  lines.push(`Responsável técnico: ${order.professional}`);
  lines.push(`Emitida em: ${today}`);
  lines.push("");
  lines.push("O QUE FOI SOLICITADO");
  lines.push(sentence(requested) || "Não informado.");
  lines.push("");
  lines.push("O QUE FOI FEITO");
  if (done.length) {
    lines.push(`Durante a execução do serviço, foram realizadas as seguintes etapas:`);
    lines.push(bulletList(done));
  } else {
    lines.push("Ainda não há etapas registradas no diário desta ordem.");
  }
  lines.push("");
  if (materials.length) {
    lines.push("MATERIAIS UTILIZADOS");
    lines.push(bulletList(materials));
    lines.push("");
  }
  lines.push("VALOR");
  lines.push(`${formatBRL(order.amountCents)}${order.status === "completed" ? " — serviço concluído." : " — valor previsto; o serviço ainda está em andamento."}`);
  lines.push("");
  lines.push(`Qualquer dúvida sobre o serviço realizado, fale com ${order.professional}. Obrigado pela confiança!`);
  return lines.join("\n");
}

/** Mensagem curta para mandar pelo WhatsApp junto com a ordem. */
export function writeWhatsappMessage(order: WriterOrder, clientName: string) {
  const first = clientName.split(" ")[0] || clientName;
  return order.status === "completed"
    ? `Olá, ${first}! O serviço "${order.service}" (${order.id}) foi concluído. Valor: ${formatBRL(order.amountCents)}. Qualquer dúvida estou à disposição.`
    : `Olá, ${first}! Segue a atualização do serviço "${order.service}" (${order.id}). Valor previsto: ${formatBRL(order.amountCents)}.`;
}

export type PeriodReportInput = {
  label: string;
  companyName: string;
  received: number;
  toReceive: number;
  overdue: number;
  paidOut: number;
  toPay: number;
  completedOrders: number;
  openOrders: number;
  appointments: number;
  topServices: Array<{ service: string; count: number; amountCents: number }>;
  byProfessional: Array<{ name: string; orders: number; amountCents: number }>;
  lowStock: string[];
  overdueTitles: string[];
};

/** Resumo gerencial do período, em linguagem direta. */
export function writePeriodReport(input: PeriodReportInput) {
  const result = input.received - input.paidOut;
  const lines: string[] = [];
  lines.push(`RELATÓRIO GERENCIAL — ${input.label.toUpperCase()}`);
  lines.push(input.companyName);
  lines.push("");
  lines.push("RESUMO");
  lines.push(
    `No período foram concluídas ${input.completedOrders} ordem(ns) de serviço e ${input.openOrders} segue(m) em aberto, com ${input.appointments} compromisso(s) na agenda. ` +
      `Entraram ${formatBRL(input.received)} e saíram ${formatBRL(input.paidOut)}, deixando um resultado de ${formatBRL(result)}${result < 0 ? " (negativo)" : ""}.`,
  );
  lines.push("");
  lines.push("DINHEIRO");
  lines.push(bulletList([
    `Recebido: ${formatBRL(input.received)}`,
    `A receber: ${formatBRL(input.toReceive)}${input.overdue ? ` (${formatBRL(input.overdue)} já vencido)` : ""}`,
    `Pago: ${formatBRL(input.paidOut)}`,
    `A pagar: ${formatBRL(input.toPay)}`,
  ]));
  if (input.topServices.length) {
    lines.push("");
    lines.push("SERVIÇOS QUE MAIS RENDERAM");
    lines.push(bulletList(input.topServices.map((item) => `${item.service}: ${item.count} ordem(ns) · ${formatBRL(item.amountCents)}`)));
  }
  if (input.byProfessional.length) {
    lines.push("");
    lines.push("POR RESPONSÁVEL");
    lines.push(bulletList(input.byProfessional.map((item) => `${item.name}: ${item.orders} ordem(ns) · ${formatBRL(item.amountCents)}`)));
  }
  const attention: string[] = [];
  if (input.overdueTitles.length) attention.push(`Cobranças vencidas: ${input.overdueTitles.join("; ")}.`);
  if (input.lowStock.length) attention.push(`Estoque abaixo do mínimo: ${input.lowStock.join(", ")}.`);
  lines.push("");
  lines.push("PONTOS DE ATENÇÃO");
  lines.push(attention.length ? bulletList(attention) : "Nada crítico no período.");
  return lines.join("\n");
}
