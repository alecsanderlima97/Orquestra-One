import { NextRequest, NextResponse } from "next/server";
import { INVITABLE_ROLES, ROLE_CODES, accessForRole, accessSummary } from "@/src/lib/roles";
import { requireCompanyManager } from "@/src/lib/tenant-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ memberId: string }> };

/** Carrega o membro da empresa de quem chama e aplica as regras que valem para alterar e remover. */
async function loadTarget(request: NextRequest, params: Params["params"]) {
  const caller = await requireCompanyManager(request);
  if ("error" in caller) return { response: NextResponse.json({ error: caller.error }, { status: caller.status }) };
  const { memberId } = await params;
  if (!/^tm-[A-Za-z0-9]{1,128}$/.test(memberId)) return { response: NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 }) };
  const uid = memberId.slice(3);
  const { firestore } = caller.services;
  const memberRef = firestore.doc(`companies/${caller.tenantId}/team/${memberId}`);
  const userRef = firestore.doc(`users/${uid}`);
  const [member, user] = await Promise.all([memberRef.get(), userRef.get()]);
  // O membro precisa ser da mesma empresa de quem chama (nunca confia no id vindo do navegador).
  if (!member.exists || user.data()?.tenantId !== caller.tenantId) return { response: NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 }) };
  const currentRole = String(member.data()?.role ?? "");
  if (currentRole === "Proprietário" || user.data()?.role === "company_owner") return { response: NextResponse.json({ error: "O proprietário não pode ser alterado nem removido." }, { status: 403 }) };
  if (uid === caller.uid) return { response: NextResponse.json({ error: "Você não pode alterar o próprio acesso." }, { status: 403 }) };
  if (caller.role !== "company_owner" && currentRole === "Administrador") return { response: NextResponse.json({ error: "Somente o proprietário altera um administrador." }, { status: 403 }) };
  return { caller, uid, memberRef, userRef, member: member.data() ?? {}, currentRole };
}

/** Altera a função e/ou ativa/desativa a pessoa. O acesso real (users/{uid}) muda junto. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const target = await loadTarget(request, params);
  if ("response" in target) return target.response;
  const { caller, uid, memberRef, userRef, member, currentRole } = target;
  const body = await request.json().catch(() => ({})) as { role?: unknown; active?: unknown };
  const nextRole = typeof body.role === "string" ? body.role : currentRole;
  const nextActive = typeof body.active === "boolean" ? body.active : member.active !== false;
  if (!INVITABLE_ROLES.includes(nextRole)) return NextResponse.json({ error: "Função inválida." }, { status: 400 });
  if (nextRole === "Administrador" && caller.role !== "company_owner") return NextResponse.json({ error: "Somente o proprietário promove a administrador." }, { status: 403 });

  const { firestore, auth } = caller.services;
  const now = new Date();
  const batch = firestore.batch();
  batch.set(userRef, { role: ROLE_CODES[nextRole], uiRole: nextRole, access: accessForRole(nextRole), active: nextActive, updatedAt: now }, { merge: true });
  batch.set(memberRef, { role: nextRole, access: accessSummary(nextRole), active: nextActive }, { merge: true });
  batch.set(firestore.collection(`companies/${caller.tenantId}/audit`).doc(), {
    action: "Acesso alterado", subject: String(member.name ?? member.email ?? uid), actor: caller.name, actorUid: caller.uid,
    before: { role: currentRole, active: member.active !== false }, after: { role: nextRole, active: nextActive }, createdAt: now,
  });
  await batch.commit();
  if (!nextActive) await auth.revokeRefreshTokens(uid).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

/** Remove da equipe: corta o acesso na hora (perfil inativo + sessões revogadas). Registros criados continuam. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const target = await loadTarget(request, params);
  if ("response" in target) return target.response;
  const { caller, uid, memberRef, userRef, member, currentRole } = target;
  const { firestore, auth } = caller.services;
  const now = new Date();
  const batch = firestore.batch();
  batch.set(userRef, { active: false, access: accessForRole(""), removedAt: now, removedBy: caller.uid, updatedAt: now }, { merge: true });
  batch.delete(memberRef);
  batch.set(firestore.collection(`companies/${caller.tenantId}/audit`).doc(), {
    action: "Pessoa removida da equipe", subject: String(member.name ?? member.email ?? uid), actor: caller.name, actorUid: caller.uid,
    before: { role: currentRole, active: member.active !== false }, after: null, createdAt: now,
  });
  await batch.commit();
  await auth.revokeRefreshTokens(uid).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
