export function formatBRL(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

export function formatCompactBRL(amountCents: number) {
  const amount = amountCents / 100;
  if (amount >= 1000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatBRL(amountCents);
}
