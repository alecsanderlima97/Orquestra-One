/**
 * Direitos e limites de cada empresa, num lugar só (PlanEntitlements).
 * Os valores vêm do documento companies/{id}, definidos pela Central Admin — nada de
 * `if (plan === "...")` espalhado e nenhum preço ou plano fixo no código.
 */
export type CompanyAccessStatus = "ativo" | "bloqueado";
export type BillingStatus = "Em dia" | "Em tolerância" | "Inadimplente";

export type PlanEntitlements = {
  plan: string;
  /** Pessoas ativas + convites pendentes. null = sem limite definido. */
  maxUsers: number | null;
  accessStatus: CompanyAccessStatus;
  billingStatus: BillingStatus;
};

export const BILLING_STATUSES: BillingStatus[] = ["Em dia", "Em tolerância", "Inadimplente"];

export function entitlementsFrom(company: Record<string, unknown> | undefined): PlanEntitlements {
  const maxUsers = Number(company?.maxUsers);
  const billing = String(company?.billingStatus ?? "Em dia");
  return {
    plan: String(company?.plan ?? "Teste"),
    maxUsers: Number.isInteger(maxUsers) && maxUsers > 0 ? maxUsers : null,
    accessStatus: company?.status === "bloqueado" ? "bloqueado" : "ativo",
    billingStatus: (BILLING_STATUSES as string[]).includes(billing) ? billing as BillingStatus : "Em dia",
  };
}

/** Pode incluir mais uma pessoa? (ativos + convites pendentes contra o limite) */
export function canAddUser(entitlements: PlanEntitlements, activeUsers: number, pendingInvites: number) {
  return entitlements.maxUsers === null || activeUsers + pendingInvites < entitlements.maxUsers;
}
