"use client";

import { useEffect, type ReactNode } from "react";
import { useDemoData } from "@/src/components/demo-data";

/** Liga o painel ao banco da empresa logada e só mostra a tela quando os dados chegaram. */
export function TenantConnector({ tenantId, children }: { tenantId: string; children: ReactNode }) {
  const { connectTenant, syncStatus } = useDemoData();
  useEffect(() => { connectTenant(tenantId); }, [connectTenant, tenantId]);
  if (syncStatus === "error") {
    return <main className="login-page"><section className="login-card"><div className="login-form-panel"><div className="login-copy"><p className="eyebrow">Conexão</p><h1>Não foi possível carregar seus dados.</h1><p>Entre novamente para renovar o acesso.</p></div><a className="login-submit" href="/login">Entrar de novo</a></div></section></main>;
  }
  if (syncStatus !== "online") {
    return <main className="login-page"><section className="login-card"><div className="login-form-panel"><div className="login-copy"><p className="eyebrow">Orquestra One</p><h1>Carregando seus dados…</h1></div></div></section></main>;
  }
  return <>{children}</>;
}
