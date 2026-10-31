"use client";

import { useEffect, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { ArrowUpRight, MessageCircle, Search, X } from "lucide-react";
import { VoiceDictationButton } from "@/src/components/voice-input";

export type Status = "in_progress" | "waiting" | "completed" | "confirmed" | "pending" | "paid" | "open" | "overdue";

export function StatusPill({ status }: { status: Status }) {
  const copy: Record<Status, string> = { in_progress: "Em andamento", waiting: "Aguardando", completed: "Concluída", confirmed: "Confirmado", pending: "Pendente", paid: "Pago", open: "Em aberto", overdue: "Vencido" };
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{copy[status]}</span>;
}

export function PanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction: () => void }) {
  return <div className="panel-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="panel-action" type="button" onClick={onAction}>{action}<ArrowUpRight size={14} /></button></div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><Search size={18} /><span>{message}</span></div>;
}

export function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppLink({ phone, message, label }: { phone: string; message: string; label: string }) {
  const href = whatsappHref(phone, message);
  return href ? <a className="whatsapp-link" href={href} target="_blank" rel="noreferrer"><MessageCircle size={12} /> {label}</a> : <span className="whatsapp-link whatsapp-link-disabled"><MessageCircle size={12} /> WhatsApp não informado</span>;
}

/** Janela padrão: fecha com Esc e ao tocar fora. */
export function Modal({ eyebrow, title, onClose, children, footer, size = "default" }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: "default" | "wide" }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`record-dialog ${size === "wide" ? "order-detail-dialog" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
      <div className="dialog-body order-detail-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  </div>;
}

export function TextField({ label, value, onChange, type = "text", placeholder, required, inputMode, step, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; inputMode?: "text" | "decimal" | "numeric" | "tel" | "email"; step?: string; min?: string }) {
  return <label className="field-wrap">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} inputMode={inputMode} step={step} min={min} /></label>;
}

export function SelectField({ label, value, onChange, options, required, placeholder = "Selecione" }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean; placeholder?: string }) {
  return <label className="field-wrap">{label}<select value={value} onChange={(event) => onChange(event.target.value)} required={required}><option value="">{placeholder}</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
}

export function VoiceArea({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <label className="field-wrap"><span className="field-label-row"><span>{label}</span><VoiceDictationButton value={value} onChange={onChange} /></span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

/** Duplo clique abre o registro; no celular basta um toque (fora de botões e links). */
export function rowOpenProps(onOpen: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onDoubleClick: onOpen,
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return;
      if ((event.target as HTMLElement).closest("button, a, input, select, textarea, label")) return;
      onOpen();
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter") { event.preventDefault(); onOpen(); }
    },
  };
}

export function parseMoneyToCents(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export const COMPANY_NAME = "Empresa Central";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Abre uma janela de impressão (o navegador oferece "Salvar como PDF"). */
export function printDocument(title: string, text: string) {
  const popup = window.open("", "_blank", "width=820,height=900");
  if (!popup) { window.alert("O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente de novo."); return; }
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Georgia,'Times New Roman',serif;color:#1d2a24;margin:40px auto;max-width:720px;line-height:1.55}pre{white-space:pre-wrap;word-wrap:break-word;font:inherit;font-size:14px}h1{font:700 12px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#5a7b69;border-bottom:2px solid #5a7b69;padding-bottom:10px}</style></head><body><h1>${escapeHtml(COMPANY_NAME)}</h1><pre>${escapeHtml(text)}</pre></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
