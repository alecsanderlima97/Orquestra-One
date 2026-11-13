import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";
import { getPlatformSession } from "@/src/lib/session";
import { BILLING_STATUSES, entitlementsFrom } from "@/src/lib/plans";

export const runtime = "nodejs";

type Body = { plan?: unknown; monthlyFeeCents?: unknown; maxUsers?: unknown; status?: unknown; billingStatus?: unknown; reason?: unknown };

/**
 * Central Admin altera plano, mensalidade, limite de usuários e acesso de uma empresa.
 * Campos por allowlist; motivo obrigatório; auditoria com valor anterior e novo. Nunca apaga dados.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const platform = await getPlatformSession();
  const services = getFirebaseAdminServices();
  if (!platform || !services) return NextResponse.json({ error: "Acesso restrito à Central Admin." }, { status: 403 });
  const { companyId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

  const body = await request.json().catch(() => ({})) as Body;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 5) return NextResponse.json({ error: "Informe o motivo da alteração." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.plan !== undefined) {
    const plan = String(body.plan).trim();
    if (plan.length < 2 || plan.length > 40) return NextResponse.json({ error: "Nome do plano inválido." }, { status: 400 });
    patch.plan = plan;
  }
  if (body.monthlyFeeCents !== undefined) {
    const cents = Number(body.monthlyFeeCents);
    if (!Number.isInteger(cents) || cents < 0 || cents > 100_000_000) return NextResponse.json({ error: "Mensalidade inválida." }, { status: 400 });
    patch.monthlyFeeCents = cents;
  }
  if (body.maxUsers !== undefined) {
    if (body.maxUsers === null) patch.maxUsers = null;
    else {
      const max = Number(body.maxUsers);
      if (!Number.isInteger(max) || max < 1 || max > 1000) return NextResponse.json({ error: "Limite de usuários inválido." }, { status: 400 });
      patch.maxUsers = max;
    }
  }
  if (body.status !== undefined) {
    if (body.status !== "ativo" && body.status !== "bloqueado") return NextResponse.json({ error: "Situação inválida." }, { status: 400 });
    patch.status = body.status;
  }
  if (body.billingStatus !== undefined) {
    if (!(BILLING_STATUSES as unknown[]).includes(body.billingStatus)) return NextResponse.json({ error: "Situação de cobrança inválida." }, { status: 400 });
    patch.billingStatus = body.billingStatus;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nada para alterar." }, { status: 400 });

  const companyRef = services.firestore.doc(`companies/${companyId}`);
  const actor = String(platform.profile.name ?? platform.profile.email ?? "Central Admin");
  try {
    await services.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(companyRef);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      const current = snapshot.data() ?? {};
      const before = Object.fromEntries(Object.keys(patch).map((key) => [key, current[key] ?? null]));
      const now = new Date();
      transaction.update(companyRef, { ...patch, updatedAt: now, updatedBy: platform.identity.uid });
      transaction.set(services.firestore.collection("audit").doc(), {
        action: "Plano/acesso da empresa alterado", subject: String(current.name ?? companyId), companyId,
        actor, actorUid: platform.identity.uid, reason, before, after: patch, createdAt: now,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  }
  const fresh = (await companyRef.get()).data();
  return NextResponse.json({ ok: true, entitlements: entitlementsFrom(fresh) });
}
