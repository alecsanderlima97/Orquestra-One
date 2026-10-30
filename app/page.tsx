import { redirect } from "next/navigation";
import { OperationalDashboard } from "@/src/components/operational-dashboard";
import { getOneSession } from "@/src/lib/session";

export default async function Home() {
  if (!(await getOneSession())) redirect("/login");
  return <OperationalDashboard />;
}
