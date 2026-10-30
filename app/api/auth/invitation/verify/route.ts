import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";

export const runtime = "nodejs";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const roleMap: Record<string, string> = {
  Proprietário: "company_owner",
  Administrador: "company_admin",
  Financeiro: "company_user",
  Profissional: "company_user",
  Auxiliar: "company_user",
  Visualizador: "viewer",
};

function toMillis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const parsed = new Date(String(value ?? "")).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const services = getFirebaseAdminServices();

  if (!token || !services) {
    return NextResponse.json({ error: "A entrada por convite ainda não foi configurada neste ambiente." }, { status: 503 });
  }

  try {
    const identity = await services.auth.verifyIdToken(token);
    const userRef = services.firestore.doc(`users/${identity.uid}`);
    const userSnapshot = await userRef.get();
    const profile = userSnapshot.exists ? userSnapshot.data() : undefined;
    let tenantId = typeof profile?.tenantId === "string" ? profile.tenantId : undefined;
    let role = typeof profile?.role === "string" ? profile.role : undefined;

    if (!profile || profile.active !== true) {
      const email = identity.email?.trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "A conta Google não possui um e-mail válido." }, { status: 403 });
      const invitations = await services.firestore.collection("invitations")
        .where("email", "==", email)
        .where("status", "==", "pending")
        .limit(1)
        .get();
      if (invitations.empty) return NextResponse.json({ error: "Este e-mail não possui um convite ativo." }, { status: 403 });

      const invitationDocument = invitations.docs[0];
      const invitation = invitationDocument.data();
      if (toMillis(invitation.expiresAt) < Date.now()) {
        return NextResponse.json({ error: "Este convite expirou. Solicite um novo convite à Central Admin." }, { status: 403 });
      }
      tenantId = typeof invitation.tenantId === "string" ? invitation.tenantId : undefined;
      role = invitation.kind === "owner" ? "company_owner" : roleMap[String(invitation.role)] ?? "company_user";
      if (!tenantId) return NextResponse.json({ error: "O convite não está vinculado a uma empresa válida." }, { status: 403 });

      const companySnapshot = await services.firestore.doc(`companies/${tenantId}`).get();
      const companyStatus = companySnapshot.data()?.status;
      if (!companySnapshot.exists || companyStatus === "bloqueado") {
        return NextResponse.json({ error: "A empresa deste convite não está disponível para acesso." }, { status: 403 });
      }

      await services.firestore.runTransaction(async (transaction) => {
        const freshInvitation = await transaction.get(invitationDocument.ref);
        if (freshInvitation.data()?.status !== "pending") throw new Error("INVITATION_ALREADY_CLAIMED");
        transaction.set(userRef, { name: identity.name ?? email, email, role, tenantId, active: true, invitationId: invitationDocument.id, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
        transaction.update(invitationDocument.ref, { status: "accepted", claimedBy: identity.uid, claimedAt: new Date() });
      });
    } else if (!platformRoles.has(role ?? "")) {
      if (!tenantId) return NextResponse.json({ error: "O usuário não está vinculado a uma empresa." }, { status: 403 });
      const companySnapshot = await services.firestore.doc(`companies/${tenantId}`).get();
      if (!companySnapshot.exists || companySnapshot.data()?.status === "bloqueado") {
        return NextResponse.json({ error: "A empresa está bloqueada no Portal Orquestra.cs." }, { status: 403 });
      }
    }

    const session = await services.auth.createSessionCookie(token, { expiresIn: 1000 * 60 * 60 * 8 });
    const result = NextResponse.json({ allowed: true, tenantId: tenantId ?? null, role: role ?? null });
    result.cookies.set("orquestra_one_session", session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 8, path: "/" });
    return result;
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o convite agora. Tente novamente." }, { status: 401 });
  }
}
