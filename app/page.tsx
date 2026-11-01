import { redirect } from "next/navigation";
import { OperationalDashboard } from "@/src/components/operational-dashboard";
import { TenantConnector } from "@/src/components/tenant-connector";
import { getOneProfile } from "@/src/lib/session";

export default async function Home() {
  const me = await getOneProfile();
  if (!me) redirect("/login");
  if (!me.tenantId) redirect(["platform_owner", "orquestra_admin"].includes(me.role) ? "/central-admin" : "/login");
  return <TenantConnector tenantId={me.tenantId}><OperationalDashboard /></TenantConnector>;
}
