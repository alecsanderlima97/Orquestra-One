import { redirect } from "next/navigation";
import { CentralAdminShell } from "@/src/components/central-admin-shell";
import { getPlatformSession } from "@/src/lib/session";

export default async function CentralAdminPage() {
  if (!(await getPlatformSession())) redirect("/login");
  return <CentralAdminShell />;
}
