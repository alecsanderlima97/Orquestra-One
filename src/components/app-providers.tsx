"use client";

import { DemoDataProvider } from "@/src/components/demo-data";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <DemoDataProvider>{children}</DemoDataProvider>;
}
