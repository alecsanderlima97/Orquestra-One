import type { NextRequest } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";

const managerRoles = new Set(["company_owner", "company_admin"]);

export type CompanyManager = {
  uid: string;
  name: string;
  role: string;
  tenantId: string;
  services: NonNullable<ReturnType<typeof getFirebaseAdminServices>>;
};

/** Valida o token do Firebase e exige proprietário/administrador ativo de uma empresa ativa. */
export async function requireCompanyManager(request: NextRequest): Promise<CompanyManager | { status: number; error: string }> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const services = getFirebaseAdminServices();
  if (!services) return { status: 503, error: "Não configurado neste ambiente." };
  if (!token) return { status: 401, error: "Entre novamente." };
  let uid: string;
  try {
    uid = (await services.auth.verifyIdToken(token, true)).uid;
  } catch {
    return { status: 401, error: "Entre novamente." };
  }
  const profile = (await services.firestore.doc(`users/${uid}`).get()).data();
  const tenantId = typeof profile?.tenantId === "string" ? profile.tenantId : "";
  if (profile?.active !== true || !managerRoles.has(String(profile.role ?? "")) || !tenantId) return { status: 403, error: "Sem permissão para gerenciar a equipe." };
  const company = await services.firestore.doc(`companies/${tenantId}`).get();
  if (!company.exists || company.data()?.status === "bloqueado") return { status: 403, error: "A empresa não está disponível." };
  return { uid, name: String(profile.name ?? profile.email ?? ""), role: String(profile.role), tenantId, services };
}
