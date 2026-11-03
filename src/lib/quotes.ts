import { formatBRL } from "@/src/domain/money";

export type QuoteItem = { id: string; description: string; quantity: number; unitCents: number };
export type QuoteStatus = "draft" | "sent" | "approved" | "rejected";
export type QuoteRecord = {
  id: string;
  clientId: string;
  client: string;
  title: string;
  items: QuoteItem[];
  discountCents: number;
  validUntil: string;
  notes: string;
  status: QuoteStatus;
  createdAt: string;
  workOrderId?: string;
};

export function quoteSubtotal(quote: Pick<QuoteRecord, "items">) {
  return quote.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitCents), 0);
}

export function quoteTotal(quote: Pick<QuoteRecord, "items" | "discountCents">) {
  return Math.max(0, quoteSubtotal(quote) - (quote.discountCents || 0));
}

/** Enviado e já passou da validade: o cliente não deveria mais aprovar sem renovar. */
export function quoteIsExpired(quote: Pick<QuoteRecord, "status" | "validUntil">, today: string) {
  return quote.status === "sent" && Boolean(quote.validUntil) && quote.validUntil < today;
}

export function addDaysIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, (day || 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function brDate(iso: string) {
  return iso ? iso.split("-").reverse().join("/") : "—";
}

function qty(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

export function itemsAsDescription(quote: Pick<QuoteRecord, "items">) {
  return quote.items.map((item) => `${qty(item.quantity)} × ${item.description}`).join("; ");
}

/** Texto do orçamento para enviar ao cliente (sempre revisável antes do envio). */
export function writeQuoteText(quote: QuoteRecord, companyName: string, clientName: string) {
  const lines: string[] = [];
  lines.push(`ORÇAMENTO ${quote.id}`);
  lines.push(companyName);
  lines.push("");
  lines.push(`Cliente: ${clientName}`);
  lines.push(`Serviço: ${quote.title}`);
  lines.push(`Emitido em: ${brDate(quote.createdAt)}`);
  if (quote.validUntil) lines.push(`Válido até: ${brDate(quote.validUntil)}`);
  lines.push("");
  lines.push("ITENS");
  for (const item of quote.items) {
    lines.push(`• ${qty(item.quantity)} × ${item.description} — ${formatBRL(Math.round(item.quantity * item.unitCents))}`);
  }
  lines.push("");
  if (quote.discountCents > 0) {
    lines.push(`Subtotal: ${formatBRL(quoteSubtotal(quote))}`);
    lines.push(`Desconto: − ${formatBRL(quote.discountCents)}`);
  }
  lines.push(`TOTAL: ${formatBRL(quoteTotal(quote))}`);
  if (quote.notes.trim()) {
    lines.push("");
    lines.push("OBSERVAÇÕES");
    lines.push(quote.notes.trim());
  }
  lines.push("");
  lines.push("Para aprovar, é só responder esta mensagem. Obrigado pela confiança!");
  return lines.join("\n");
}
