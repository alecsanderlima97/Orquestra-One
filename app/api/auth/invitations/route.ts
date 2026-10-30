import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";

export const runtime = "nodejs";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const companyRoles = new Set(["company_owner", "company_admin"]);
const teamRoles = new Set(["Administrador", "Financeiro", "Profissional", "Auxiliar", "Visualizador"]);
const roleMap: Record<string, string> = {
  Administrador: "company_admin",
  Financeiro: "company_user",
  Profissional: "company_user",
  Auxiliar: "company_user",
  Visualizador: "viewer",
};

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const services = getFirebaseAdminServices();
  if (!token || !services) return NextResponse.json({ error: "A geração de convites ainda não foi configurada neste ambiente." }, { status: 503 });

  try {
    const identity = await services.auth.verifyIdToken(token);
    const callerSnapshot = await services.firestore.doc(`users/${identity.uid}`).get();
    const caller = callerSnapshot.data();
    const body = await request.json() as { email?: string; role?: string; kind?: "owner" | "team"; tenantId?: string };
    const email = body.email?.trim().toLowerCase();
    const kind = body.kind === "owner" ? "owner" : "team";
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });

    const callerRole = String(caller?.role ?? "");
    if (kind === "owner" && !platformRoles.has(callerRole)) return NextResponse.json({ error: "Somente a Central Admin pode convidar proprietários." }, { status: 403 });
    if (kind === "team" && !companyRoles.has(callerRole)) return NextResponse.json({ error: "Somente o proprietário ou administrador pode convidar a equipe." }, { status: 403 });
    if (kind === "team" && !teamRoles.has(String(body.role))) return NextResponse.json({ error: "A função escolhida não pode ser concedida neste convite." }, { status: 400 });

    const tenantId = kind === "team" ? String(caller?.tenantId ?? "") : String(body.tenantId ?? "").trim();
    if (!tenantId) return NextResponse.json({ error: "O convite precisa estar vinculado a uma empresa." }, { status: 400 });
    const companySnapshot = await services.firestore.doc(`companies/${tenantId}`).get();
    const companyStatus = companySnapshot.data()?.status;
    if (!companySnapshot.exists || companyStatus === "bloqueado") return NextResponse.json({ error: "A empresa não está disponível para convites." }, { status: 403 });

    const invitation = {
      email,
      kind,
      role: kind === "owner" ? "company_owner" : roleMap[String(body.role)],
      tenantId,
      status: "pending",
      createdBy: identity.uid,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const invitationRef = services.firestore.collection("invitations").doc();
    await invitationRef.set(invitation);
    return NextResponse.json({ id: invitationRef.id, status: invitation.status, expiresAt: invitation.expiresAt.toISOString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o convite agora." }, { status: 500 });
  }
}
