import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/src/lib/firebase-admin";

export const runtime = "nodejs";

type PortalDecision = { allowed?: boolean; tenantId?: string; role?: string; reason?: string };

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const adminAuth = getFirebaseAdminAuth();
  const verificationUrl = process.env.ORQUESTRA_PORTAL_INVITATION_VERIFY_URL;
  const serviceToken = process.env.ORQUESTRA_PORTAL_SERVICE_TOKEN;

  if (!token || !adminAuth || !verificationUrl || !serviceToken) {
    return NextResponse.json({ error: "A entrada por convite ainda não foi configurada neste ambiente." }, { status: 503 });
  }

  try {
    const identity = await adminAuth.verifyIdToken(token);
    const response = await fetch(verificationUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${serviceToken}` },
      body: JSON.stringify({ uid: identity.uid, email: identity.email ?? "" }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const decision = await response.json() as PortalDecision;
    if (!response.ok || !decision.allowed || !decision.tenantId || !decision.role) {
      return NextResponse.json({ error: decision.reason ?? "Este e-mail não possui um convite ativo." }, { status: 403 });
    }
    const session = await adminAuth.createSessionCookie(token, { expiresIn: 1000 * 60 * 60 * 8 });
    const result = NextResponse.json({ allowed: true, tenantId: decision.tenantId, role: decision.role });
    result.cookies.set("orquestra_one_session", session, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 8, path: "/" });
    return result;
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o convite agora. Tente novamente." }, { status: 401 });
  }
}
