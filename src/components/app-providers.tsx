"use client";

import { useEffect } from "react";
import { DemoDataProvider } from "@/src/components/demo-data";
import { ConnectionBanner } from "@/src/components/connection-banner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return <DemoDataProvider><ConnectionBanner />{children}</DemoDataProvider>;
}
