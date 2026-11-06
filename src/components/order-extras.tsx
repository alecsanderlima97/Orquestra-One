"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, PenLine, Trash2 } from "lucide-react";
import { useDemoData, type WorkOrderRecord } from "@/src/components/demo-data";
import { SignaturePad } from "@/src/components/signature-pad";
import { buildWorkOrderHtml, openWorkOrderPdf } from "@/src/lib/work-order-document";

const nowLabel = () => new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function useWorkOrderPdf(companyName: string) {
  const data = useDemoData();
  return (order: WorkOrderRecord) => {
    const client = data.clients.find((item) => item.id === order.clientId);
    const stockOf = (stockId: string) => data.stock.find((item) => item.id === stockId);
    openWorkOrderPdf(buildWorkOrderHtml({
      order, client, companyName, issuedAt: nowLabel(),
      stockName: (stockId) => stockOf(stockId)?.name ?? stockId,
      stockUnit: (stockId) => stockOf(stockId)?.unit ?? "un",
    }));
  };
}

export function OrderAttachmentsSection({ order }: { order: WorkOrderRecord }) {
  const data = useDemoData();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attachments = order.attachments ?? [];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    for (const file of Array.from(files)) {
      const failure = await data.addOrderAttachment(order.id, file);
      if (failure) { setError(`${file.name}: ${failure}`); break; }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return <section className="order-detail-section">
    <h3>Fotos e anexos ({attachments.length})</h3>
    {attachments.length ? <ul className="order-attachments">{attachments.map((item) => <li key={item.id}>
      {item.kind === "photo"
        ? <a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={item.name} loading="lazy" /></a>
        : <a className="order-attachment-file" href={item.url} target="_blank" rel="noreferrer"><FileText size={22} /><span>{item.name}</span></a>}
      <small>{item.createdAt}</small>
      <button className="icon-button" type="button" aria-label={`Remover ${item.name}`} onClick={() => { if (window.confirm(`Remover "${item.name}"?`)) data.removeOrderAttachment(order.id, item.id); }}><Trash2 size={15} /></button>
    </li>)}</ul> : <p className="order-detail-empty">Nenhuma foto ou anexo. Registre o antes e o depois do serviço.</p>}
    <input ref={input} type="file" accept="image/*,application/pdf" multiple capture="environment" hidden onChange={(event) => void upload(event.target.files)} />
    <button className="secondary-button" type="button" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={16} /> {busy ? "Enviando…" : "Adicionar foto ou PDF"}</button>
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </section>;
}

export function OrderSignatureSection({ order, defaultName }: { order: WorkOrderRecord; defaultName: string }) {
  const data = useDemoData();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [document, setDocument] = useState("");
  const locked = order.status === "completed";

  function save() {
    if (!image || !name.trim()) return;
    data.signWorkOrder(order.id, { dataUrl: image, signerName: name.trim(), signerDocument: document.trim() || undefined, signedAt: nowLabel() });
    setOpen(false);
    setImage(null);
  }

  return <section className="order-detail-section">
    <h3>Assinatura do cliente</h3>
    {order.signature ? <div className="order-signature">
      <img src={order.signature.dataUrl} alt={`Assinatura de ${order.signature.signerName}`} />
      <p><strong>{order.signature.signerName}</strong>{order.signature.signerDocument ? ` · ${order.signature.signerDocument}` : ""}<br /><small>Assinado em {order.signature.signedAt}</small></p>
      {!locked && <button className="table-action" type="button" onClick={() => { if (window.confirm("Apagar a assinatura e colher de novo?")) data.clearWorkOrderSignature(order.id); }}>Refazer</button>}
    </div> : open ? <div className="order-signature-form">
      <SignaturePad onChange={setImage} />
      <label className="field-wrap">Nome de quem assina<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="field-wrap">CPF (opcional)<input value={document} onChange={(event) => setDocument(event.target.value)} inputMode="numeric" /></label>
      <div className="order-signature-actions"><button className="secondary-button" type="button" onClick={() => { setOpen(false); setImage(null); }}>Cancelar</button><button className="primary-button" type="button" onClick={save} disabled={!image || !name.trim()}>Salvar assinatura</button></div>
    </div> : <>
      <p className="order-detail-empty">Peça para o cliente assinar na tela ao concluir o serviço. A assinatura sai no PDF da O.S.</p>
      <button className="secondary-button" type="button" onClick={() => setOpen(true)}><PenLine size={16} /> Colher assinatura</button>
    </>}
  </section>;
}
