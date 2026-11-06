import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";
import { INVITABLE_ROLES, ROLE_CODES } from "@/src/lib/roles";

export const runtime = "nodejs";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const companyRoles = new Set(["company_owner", "company_admin"]);
const roleMap = ROLE_CODES;

function formatDate(value: unknown) {
  const date = value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? (value.toDate() as Date) : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(date);
}

/** Lista os convites de equipe da empresa de quem está logado (proprietário ou administrador). */
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const services = getFirebaseAdminServices();
  if (!token || !services) return NextResponse.json({ error: "Não configurado." }, { status: 503 });
  try {
    const identity = await services.auth.verifyIdToken(token);
    const caller = (await services.firestore.doc(`users/${identity.uid}`).get()).data();
    if (caller?.active !== true || !companyRoles.has(String(caller?.role ?? "")) || typeof caller?.tenantId !== "string") {
      return NextResponse.json({ error: "Sem permissão para ver convites." }, { status: 403 });
    }
    const snapshot = await services.firestore.collection("invitations").where("tenantId", "==", caller.tenantId).where("kind", "==", "team").get();
    const now = Date.now();
    const invitations = snapshot.docs.map((entry) => {
      const data = entry.data();
      const expires = data.expiresAt && typeof data.expiresAt.toMillis === "function" ? data.expiresAt.toMillis() : 0;
      const status = data.status === "pending" && expires && expires < now ? "expired" : String(data.status ?? "pending");
      return { id: entry.id, email: String(data.email ?? ""), role: String(data.uiRole ?? ""), kind: "team", status, createdAt: formatDate(data.createdAt), expiresAt: formatDate(data.expiresAt), createdMs: data.createdAt?.toMillis?.() ?? 0 };
    }).sort((a, b) => b.createdMs - a.createdMs).map(({ createdMs: _ignored, ...rest }) => rest);
    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os convites." }, { status: 401 });
  }
}

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

    if (caller?.active !== true) return NextResponse.json({ error: "Sem permissão para convidar." }, { status: 403 });
    const callerRole = String(caller?.role ?? "");
    if (kind === "owner" && !platformRoles.has(callerRole)) return NextResponse.json({ error: "Somente a Central Admin pode convidar proprietários." }, { status: 403 });
    if (kind === "team" && !companyRoles.has(callerRole)) return NextResponse.json({ error: "Somente o proprietário ou administrador pode convidar a equipe." }, { status: 403 });
    if (kind === "team" && !INVITABLE_ROLES.includes(String(body.role))) return NextResponse.json({ error: "A função escolhida não pode ser concedida neste convite." }, { status: 400 });

    const tenantId = kind === "team" ? String(caller?.tenantId ?? "") : String(body.tenantId ?? "").trim();
    if (!tenantId) return NextResponse.json({ error: "O convite precisa estar vinculado a uma empresa." }, { status: 400 });
    const companySnapshot = await services.firestore.doc(`companies/${tenantId}`).get();
    const companyStatus = companySnapshot.data()?.status;
    if (!companySnapshot.exists || companyStatus === "bloqueado") return NextResponse.json({ error: "A empresa não está disponível para convites." }, { status: 403 });

    const pending = await services.firestore.collection("invitations").where("email", "==", email).where("tenantId", "==", tenantId).where("status", "==", "pending").limit(1).get();
    if (!pending.empty) return NextResponse.json({ error: "Já existe um convite pendente para este e-mail." }, { status: 409 });

    const uiRole = kind === "owner" ? "Proprietário" : String(body.role);
    const invitation = {
      email,
      kind,
      uiRole,
      role: kind === "owner" ? "company_owner" : roleMap[uiRole],
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
