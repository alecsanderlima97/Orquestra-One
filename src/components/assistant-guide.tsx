"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Compass, HelpCircle, Lightbulb, PlayCircle, Sparkles, X } from "lucide-react";
import type { SectionId } from "@/src/domain/types";
import { CHANGELOG, CURRENT_VERSION, unseenEntries } from "@/src/lib/changelog";
import { SECTION_GUIDE, TOUR_ORDER } from "@/src/lib/guide-content";

const TOUR_KEY = "orquestra-one-tour-done";
const SEEN_KEY = "orquestra-one-seen-version";

function read(key: string) { try { return window.localStorage.getItem(key); } catch { return null; } }
function write(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch { /* sem armazenamento */ } }

type Rect = { top: number; left: number; width: number; height: number };

/** Assistente do One: tour pelas abas na primeira entrada, dicas da tela atual e novidades a cada atualização. */
export function AssistantGuide({ activeSection, onNavigate }: { activeSection: SectionId; onNavigate: (section: SectionId) => void }) {
  const [panel, setPanel] = useState<"closed" | "menu" | "news">("closed");
  const [step, setStep] = useState<number | null>(null);
  const [target, setTarget] = useState<Rect | null>(null);
  const [newsEntries, setNewsEntries] = useState(CHANGELOG.slice(0, 1));

  // Primeira vez: tour. Depois, se houver versão nova: novidades.
  useEffect(() => {
    if (!read(TOUR_KEY)) { setStep(0); return; }
    const unseen = unseenEntries(read(SEEN_KEY));
    if (unseen.length) { setNewsEntries(unseen); setPanel("news"); }
  }, []);

  const section = step === null ? null : TOUR_ORDER[step];

  useEffect(() => { if (section) onNavigate(section); }, [section, onNavigate]);

  const measure = useCallback(() => {
    if (!section) { setTarget(null); return; }
    const nav = document.querySelector<HTMLElement>(`[data-tour="${section}"]`);
    const element = nav && nav.offsetParent !== null ? nav : document.querySelector<HTMLElement>(".page-heading");
    if (!element) { setTarget(null); return; }
    const box = element.getBoundingClientRect();
    setTarget({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [section]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  function finishTour() {
    setStep(null);
    write(TOUR_KEY, "1");
    write(SEEN_KEY, CURRENT_VERSION);
  }
  function closeNews() { setPanel("closed"); write(SEEN_KEY, CURRENT_VERSION); }
  function startTour() { setPanel("closed"); setStep(0); }

  useEffect(() => {
    if (step === null && panel === "closed") return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { if (step !== null) finishTour(); else if (panel === "news") closeNews(); else setPanel("closed"); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tips = SECTION_GUIDE[activeSection];
  const popoverStyle = target && window.innerWidth > 900
    ? { top: Math.min(Math.max(16, target.top - 12), window.innerHeight - 260), left: target.left + target.width + 16 }
    : undefined;

  return <>
    {step === null && <button className="assistant-fab" type="button" onClick={() => setPanel(panel === "closed" ? "menu" : "closed")} aria-expanded={panel !== "closed"} aria-label="Abrir assistente"><HelpCircle size={20} /><span>Ajuda</span></button>}

    {panel === "menu" && <div className="assistant-panel" role="dialog" aria-label="Assistente">
      <header><Compass size={18} /><strong>Assistente do One</strong><button className="icon-button" type="button" onClick={() => setPanel("closed")} aria-label="Fechar"><X size={16} /></button></header>
      <section><h4><Lightbulb size={15} /> Nesta tela: {tips.title}</h4><p>{tips.tour}</p><ul>{tips.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>
      <div className="assistant-actions">
        <button className="secondary-button" type="button" onClick={startTour}><PlayCircle size={16} /> Fazer o tour pelas abas</button>
        <button className="secondary-button" type="button" onClick={() => { setNewsEntries(CHANGELOG); setPanel("news"); }}><Sparkles size={16} /> O que há de novo</button>
      </div>
    </div>}

    {panel === "news" && <div className="dialog-backdrop" role="presentation"><section className="record-dialog assistant-news" role="dialog" aria-modal="true" aria-label="Novidades">
      <header><div><p className="eyebrow">Atualização do sistema</p><h2>O que há de novo</h2></div><button className="icon-button" type="button" onClick={closeNews} aria-label="Fechar">×</button></header>
      <div className="dialog-body">{newsEntries.map((entry) => <article key={entry.version}><h3>{entry.title} <small>{entry.date}</small></h3><ul>{entry.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      <footer><button className="secondary-button" type="button" onClick={() => { closeNews(); startTour(); }}>Fazer o tour</button><button className="primary-button" type="button" onClick={closeNews}>Entendi</button></footer>
    </section></div>}

    {step !== null && section && <div className="assistant-tour" role="dialog" aria-modal="true" aria-label={`Tour: ${SECTION_GUIDE[section].title}`}>
      {target && <div className="assistant-spotlight" style={{ top: target.top - 6, left: target.left - 6, width: target.width + 12, height: target.height + 12 }} />}
      <div className="assistant-tour-card" style={popoverStyle}>
        <p className="eyebrow">Tour · {step + 1} de {TOUR_ORDER.length}</p>
        <h3>{SECTION_GUIDE[section].title}</h3>
        <p>{SECTION_GUIDE[section].tour}</p>
        <div className="assistant-tour-actions">
          <button className="table-action" type="button" onClick={finishTour}>Pular tour</button>
          <span />
          {step > 0 && <button className="secondary-button" type="button" onClick={() => setStep(step - 1)}>Voltar</button>}
          {step < TOUR_ORDER.length - 1
            ? <button className="primary-button" type="button" onClick={() => setStep(step + 1)} autoFocus>Próximo</button>
            : <button className="primary-button" type="button" onClick={() => { finishTour(); onNavigate("overview"); }} autoFocus>Começar a usar</button>}
        </div>
      </div>
    </div>}
  </>;
}
