"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isFirebaseClientConfigured, signInWithGoogle } from "@/src/lib/firebase-client";

export function LoginView() {
  const router = useRouter();
  const [message, setMessage] = useState("A entrada é liberada por convite da Central Admin.");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Use o convite recebido e entre com a conta Google autorizada.");
  }

  async function handleGoogle() {
    setLoading(true); setMessage("");
    try {
      const token = await signInWithGoogle();
      const response = await fetch("/api/auth/invitation/verify", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      const result = await response.json() as { allowed?: boolean; error?: string };
      if (!response.ok || !result.allowed) throw new Error(result.error ?? "Convite não autorizado.");
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível validar o acesso.");
    } finally { setLoading(false); }
  }

  return <main className="login-page"><section className="login-card"><div className="login-form-panel"><div className="login-brand"><span className="login-brand-mark"><i /><i /><i /></span><span>orquestra<strong>One</strong></span></div><div className="login-copy"><p className="eyebrow">Acesso por convite</p><h1>Seu negócio, protegido desde a entrada.</h1><p>Proprietários recebem convite da Central Admin. Eles convidam a própria equipe com a permissão adequada.</p></div><form onSubmit={handleSubmit}><label className="login-label">E-mail do convite<input type="email" placeholder="voce@empresa.com" required /></label><button className="login-submit" type="submit">Validar orientação <ArrowRight size={16} /></button></form><div className="login-divider"><span>Entre com a conta autorizada</span></div><div className="social-login"><button type="button" onClick={handleGoogle} disabled={loading || !isFirebaseClientConfigured}>{loading ? <LoaderCircle size={15} className="spin" /> : "G"} <span>{loading ? "Validando..." : "Google"}</span></button><button type="button" onClick={() => router.push("/demo")}>◌ <span>Abrir demonstração</span></button></div><p className="login-demo"><ShieldCheck size={13} /> {message}</p></div><div className="login-presentation"><div className="login-presentation-art"><span className="art-ring art-ring-one" /><span className="art-ring art-ring-two" /><span className="art-tool art-tool-one" /><span className="art-tool art-tool-two" /><span className="art-tool art-tool-three" /><span className="art-glow" /></div><div className="login-presentation-copy"><p className="eyebrow">Orquestra One</p><h2>Clientes, serviços, financeiro e estoque em um só lugar.</h2><div className="login-benefits"><span><CheckCircle2 size={15} /> Convites e papéis por empresa</span><span><CheckCircle2 size={15} /> Operação ligada ao financeiro</span><span><CheckCircle2 size={15} /> Feito para autônomos e pequenas equipes</span></div></div><div className="login-presentation-footer"><Sparkles size={14} /> Seu trabalho tem ritmo. O One organiza o compasso.</div></div></section></main>;
}
