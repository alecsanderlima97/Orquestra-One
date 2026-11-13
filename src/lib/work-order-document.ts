import { formatBRL } from "@/src/domain/money";
import type { OrderAttachment } from "@/src/lib/order-files";

export type OrderSignature = { dataUrl: string; signerName: string; signerDocument?: string; signedAt: string };

type DocOrder = {
  id: string; service: string; professional: string; amountCents: number; status: string; client: string;
  description: string; diary: Array<{ id: string; text: string; createdAt: string }>;
  materialLines: Array<{ stockId: string; quantity: number }>;
  attachments?: OrderAttachment[]; signature?: OrderSignature;
};
type DocClient = { name: string; document?: string; phone?: string; email?: string; address?: string; city?: string; state?: string; cep?: string };

const STATUS: Record<string, string> = { in_progress: "Em andamento", waiting: "Aguardando", completed: "Concluída" };

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

/** Só imagens próprias: data:image (demonstração/assinatura) ou o Storage do Firebase. */
function safeImageUrl(url: string) {
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url) || /^https:\/\/firebasestorage\.googleapis\.com\//.test(url) ? url : "";
}

export function buildWorkOrderHtml({ order, client, companyName, stockName, stockUnit, issuedAt }: {
  order: DocOrder; client?: DocClient; companyName: string; stockName: (id: string) => string; stockUnit: (id: string) => string; issuedAt: string;
}) {
  const place = [client?.address, [client?.city, client?.state].filter(Boolean).join(" / "), client?.cep].filter(Boolean).join(" — ");
  const diary = [...order.diary].reverse();
  const photos = (order.attachments ?? []).filter((item) => item.kind === "photo" && safeImageUrl(item.url));
  const files = (order.attachments ?? []).filter((item) => item.kind === "file");
  const signature = order.signature && safeImageUrl(order.signature.dataUrl) ? order.signature : undefined;
  const row = (label: string, value: string) => value ? `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>` : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(`${order.id} — ${order.service}`)}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1f2b25;margin:0;padding:32px;font-size:12px;line-height:1.5}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #2d7653;padding-bottom:12px;margin-bottom:18px}
h1{font-size:18px;margin:0}h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#2d7653;margin:18px 0 6px}
.muted{color:#5d6b64}dl{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin:0}dt{font-size:10px;color:#5d6b64;text-transform:uppercase}dd{margin:0}
.wide{grid-column:1/-1}ul{margin:0;padding-left:18px}li{margin:2px 0}.total{font-size:15px;font-weight:bold}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.photos figure{margin:0;break-inside:avoid}.photos img{width:100%;height:150px;object-fit:cover;border:1px solid #dfe8e2;border-radius:4px}.photos figcaption{font-size:9px;color:#5d6b64}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:28px;break-inside:avoid}.sign div{border-top:1px solid #1f2b25;padding-top:4px;text-align:center}.sign img{display:block;max-height:80px;margin:0 auto -4px}
footer{margin-top:24px;font-size:9px;color:#7a8780;border-top:1px solid #dfe8e2;padding-top:6px}
@media print{body{padding:0}@page{margin:16mm}}
</style></head><body>
<header><div><h1>Ordem de serviço ${esc(order.id)}</h1><div class="muted">${esc(companyName)}</div></div><div class="muted">Emitida em ${esc(issuedAt)}<br>Situação: ${esc(STATUS[order.status] ?? order.status)}</div></header>
<h2>Cliente</h2><dl>${row("Nome", client?.name ?? order.client)}${row("CPF/CNPJ", client?.document ?? "")}${row("Telefone", client?.phone ?? "")}${row("E-mail", client?.email ?? "")}${place ? `<div class="wide"><dt>Endereço</dt><dd>${esc(place)}</dd></div>` : ""}</dl>
<h2>Serviço</h2><dl>${row("Serviço", order.service)}${row("Responsável", order.professional)}<div class="wide"><dt>Descrição</dt><dd>${esc(order.description) || "—"}</dd></div></dl>
${diary.length ? `<h2>O que foi feito</h2><ul>${diary.map((entry) => `<li><span class="muted">${esc(entry.createdAt)}</span> — ${esc(entry.text)}</li>`).join("")}</ul>` : ""}
${order.materialLines.length ? `<h2>Materiais</h2><ul>${order.materialLines.map((line) => `<li>${esc(line.quantity)} ${esc(stockUnit(line.stockId))} — ${esc(stockName(line.stockId))}</li>`).join("")}</ul>` : ""}
<h2>Valor</h2><div class="total">${esc(formatBRL(order.amountCents))}</div>
${photos.length ? `<h2>Fotos</h2><div class="photos">${photos.map((item) => `<figure><img src="${esc(safeImageUrl(item.url))}" alt="${esc(item.name)}"><figcaption>${esc(item.createdAt)}</figcaption></figure>`).join("")}</div>` : ""}
${files.length ? `<h2>Anexos</h2><ul>${files.map((item) => `<li>${esc(item.name)}</li>`).join("")}</ul>` : ""}
<div class="sign"><div>${esc(companyName)}<br><span class="muted">Responsável: ${esc(order.professional)}</span></div>
<div>${signature ? `<img src="${esc(signature.dataUrl)}" alt="Assinatura do cliente">` : "<br><br>"}${esc(signature?.signerName ?? client?.name ?? order.client)}${signature?.signerDocument ? ` · ${esc(signature.signerDocument)}` : ""}<br><span class="muted">${signature ? `Assinado no aparelho em ${esc(signature.signedAt)}` : "Assinatura do cliente"}</span></div></div>
<footer>Documento gerado pelo Orquestra One. A assinatura desenhada na tela é uma assinatura eletrônica simples, registrada com nome e data/hora.</footer>
</body></html>`;
}

export function openWorkOrderPdf(html: string) {
  const popup = window.open("", "_blank", "width=900,height=1000");
  if (!popup) { window.alert("O navegador bloqueou a janela. Libere pop-ups para este site e tente de novo."); return; }
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  const images = Array.from(popup.document.images);
  Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = image.onerror = resolve; }))).then(() => popup.print());
}
