import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";
import { getPlatformSession } from "@/src/lib/session";

export const runtime = "nodejs";

const tones = ["mint", "blue", "sand", "violet", "rose"];

function toDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate() as Date;
  return new Date(String(value ?? ""));
}

function formatDate(value: unknown, withTime = false) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(date);
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "EM";
}

/** Lista as empresas do One e a trilha de auditoria (só a Central Admin acessa). */
export async function GET() {
  const platform = await getPlatformSession();
  const services = getFirebaseAdminServices();
  if (!platform || !services) return NextResponse.json({ error: "Acesso restrito à Central Admin." }, { status: 403 });

  const [companies, users, invites, audit] = await Promise.all([
    services.firestore.collection("companies").orderBy("createdAt", "desc").get(),
    services.firestore.collection("users").get(),
    services.firestore.collection("invitations").where("kind", "==", "owner").where("status", "==", "pending").get(),
    services.firestore.collection("audit").orderBy("createdAt", "desc").limit(50).get(),
  ]);
  const userCount = new Map<string, number>();
  users.forEach((entry) => {
    const data = entry.data();
    if (data.active === true && typeof data.tenantId === "string") userCount.set(data.tenantId, (userCount.get(data.tenantId) ?? 0) + 1);
  });
  const pendingOwner = new Set<string>();
  invites.forEach((entry) => { const tenantId = entry.data().tenantId; if (typeof tenantId === "string") pendingOwner.add(tenantId); });

  const tenants = companies.docs.map((entry, index) => {
    const data = entry.data();
    const name = String(data.name ?? "Empresa");
    return {
      id: entry.id,
      name,
      segment: String(data.segment ?? ""),
      plan: String(data.plan ?? "Teste"),
      monthlyFeeCents: Number(data.monthlyFeeCents ?? 0),
      maxUsers: typeof data.maxUsers === "number" ? data.maxUsers : null,
      users: userCount.get(entry.id) ?? 0,
      accessStatus: data.status === "bloqueado" ? "Bloqueado" : "Ativo",
      billingStatus: String(data.billingStatus ?? "Em dia"),
      since: formatDate(data.createdAt),
      initials: initials(name),
      tone: tones[index % tones.length],
      ownerEmail: String(data.ownerEmail ?? ""),
      ownerPending: pendingOwner.has(entry.id),
    };
  });
  const events = audit.docs.map((entry, index) => {
    const data = entry.data();
    return { id: entry.id, action: String(data.action ?? ""), subject: String(data.subject ?? ""), actor: String(data.actor ?? ""), time: formatDate(data.createdAt, true), tone: tones[index % tones.length] };
  });
  return NextResponse.json({ tenants, audit: events });
}

/** Cria a empresa e o convite do proprietário. */
export async function POST(request: NextRequest) {
  const platform = await getPlatformSession();
  const services = getFirebaseAdminServices();
  if (!platform || !services) return NextResponse.json({ error: "Acesso restrito à Central Admin." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { name?: string; segment?: string; ownerEmail?: string };
  const name = body.name?.trim() ?? "";
  const segment = body.segment?.trim() ?? "";
  const ownerEmail = body.ownerEmail?.trim().toLowerCase() ?? "";
  if (name.length < 2) return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return NextResponse.json({ error: "Informe um e-mail válido para o proprietário." }, { status: 400 });

  const existing = await services.firestore.collection("invitations").where("email", "==", ownerEmail).where("status", "==", "pending").limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: "Este e-mail já tem um convite pendente." }, { status: 409 });

  const now = new Date();
  const companyRef = services.firestore.collection("companies").doc();
  const inviteRef = services.firestore.collection("invitations").doc();
  const auditRef = services.firestore.collection("audit").doc();
  const actor = String(platform.profile.name ?? platform.profile.email ?? "Central Admin");
  const batch = services.firestore.batch();
  batch.set(companyRef, { name, segment, status: "ativo", plan: "Teste", monthlyFeeCents: 0, billingStatus: "Em dia", ownerEmail, createdAt: now, createdBy: platform.identity.uid });
  batch.set(inviteRef, { email: ownerEmail, kind: "owner", role: "company_owner", tenantId: companyRef.id, status: "pending", createdBy: platform.identity.uid, createdAt: now, expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) });
  batch.set(auditRef, { action: "Empresa criada e proprietário convidado", subject: name, actor, createdAt: now });
  await batch.commit();
  return NextResponse.json({ id: companyRef.id }, { status: 201 });
}
