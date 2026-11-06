"use client";

import { useEffect, useState } from "react";

/** Aviso discreto quando o aparelho fica sem internet: o que for registrado é enviado ao reconectar. */
export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  if (!offline) return null;
  return <div className="connection-banner" role="status">Sem internet. Você pode continuar registrando; tudo é enviado quando a conexão voltar.</div>;
}
