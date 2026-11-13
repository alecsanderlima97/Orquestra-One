import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";
import { ROLE_CODES, ROLE_PRESETS, accessForRole, accessSummary } from "@/src/lib/roles";

export const runtime = "nodejs";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const roleMap = ROLE_CODES;
const fallbackUiRole: Record<string, string> = { company_owner: "Proprietário", company_admin: "Administrador", viewer: "Visualizador" };

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

  let stage = "verify_id_token";
  try {
    const identity = await services.auth.verifyIdToken(token);
    stage = "read_profile";
    const userRef = services.firestore.doc(`users/${identity.uid}`);
    const userSnapshot = await userRef.get();
    const profile = userSnapshot.exists ? userSnapshot.data() : undefined;
    let tenantId = typeof profile?.tenantId === "string" ? profile.tenantId : undefined;
    let role = typeof profile?.role === "string" ? profile.role : undefined;

    if (!profile || profile.active !== true) {
      const email = identity.email?.trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "A conta Google não possui um e-mail válido." }, { status: 403 });
      const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
      if (identity.email_verified !== true) return NextResponse.json({ error: "Confirme o e-mail da conta Google antes de entrar." }, { status: 403 });
      if (ownerEmail && email === ownerEmail) {
        stage = "bootstrap_platform_owner";
        await userRef.set({ name: identity.name ?? email, email, role: "platform_owner", active: true, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
        role = "platform_owner";
        tenantId = undefined;
      } else {
      stage = "read_invitation";
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
      const invitedRole = String(invitation.uiRole ?? "");
      const uiRole = invitation.kind === "owner" ? "Proprietário" : ROLE_PRESETS[invitedRole] && invitedRole !== "Proprietário" ? invitedRole : "Visualizador";
      role = roleMap[uiRole] ?? "viewer";
      if (!tenantId) return NextResponse.json({ error: "O convite não está vinculado a uma empresa válida." }, { status: 403 });

      stage = "read_company";
      const companySnapshot = await services.firestore.doc(`companies/${tenantId}`).get();
      const companyStatus = companySnapshot.data()?.status;
      if (!companySnapshot.exists || companyStatus === "bloqueado") {
        return NextResponse.json({ error: "A empresa deste convite não está disponível para acesso." }, { status: 403 });
      }

      stage = "claim_invitation";
      await services.firestore.runTransaction(async (transaction) => {
        const freshInvitation = await transaction.get(invitationDocument.ref);
        if (freshInvitation.data()?.status !== "pending") throw new Error("INVITATION_ALREADY_CLAIMED");
        transaction.set(userRef, { name: identity.name ?? email, email, role, uiRole, access: accessForRole(uiRole), tenantId, active: true, invitationId: invitationDocument.id, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
        transaction.update(invitationDocument.ref, { status: "accepted", claimedBy: identity.uid, claimedAt: new Date() });
        const memberName = identity.name ?? email;
        const memberId = `tm-${identity.uid}`;
        transaction.set(services.firestore.doc(`companies/${tenantId}/team/${memberId}`), {
          id: memberId, name: memberName, email, role: uiRole, access: accessSummary(uiRole), active: true,
          initials: memberName.split(" ").filter(Boolean).map((part: string) => part[0]).slice(0, 2).join("").toUpperCase() || "ON",
          tone: "mint", _ord: Date.now() * 1000,
        });
      });
      }
    } else if (!platformRoles.has(role ?? "")) {
      if (!tenantId) return NextResponse.json({ error: "O usuário não está vinculado a uma empresa." }, { status: 403 });
      stage = "read_company";
      const companySnapshot = await services.firestore.doc(`companies/${tenantId}`).get();
      if (!companySnapshot.exists || companySnapshot.data()?.status === "bloqueado") {
        return NextResponse.json({ error: "A empresa está bloqueada. Fale com o suporte do Orquestra One." }, { status: 403 });
      }
      // Perfis criados antes do mapa de acesso: deriva da função na equipe (ou do código da função).
      if (!profile.access || typeof profile.access !== "object") {
        stage = "backfill_access";
        const member = (await services.firestore.doc(`companies/${tenantId}/team/tm-${identity.uid}`).get()).data();
        const memberRole = String(member?.role ?? "");
        const uiRole = ROLE_PRESETS[memberRole] ? memberRole : fallbackUiRole[role ?? ""] ?? "Visualizador";
        role = roleMap[uiRole] ?? "viewer";
        await userRef.set({ role, uiRole, access: accessForRole(uiRole), updatedAt: new Date() }, { merge: true });
      }
    }

    stage = "create_session";
    const session = await services.auth.createSessionCookie(token, { expiresIn: 1000 * 60 * 60 * 8 });
    const result = NextResponse.json({ allowed: true, tenantId: tenantId ?? null, role: role ?? null });
    result.cookies.set("orquestra_one_session", session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 8, path: "/" });
    return result;
  } catch (error) {
    console.error("[auth/invitation/verify]", stage, error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Não foi possível validar o convite agora. Tente novamente." }, { status: 401 });
  }
}
