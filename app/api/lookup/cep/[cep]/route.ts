import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ cep: string }> }) {
  const { cep } = await params;
  const digits = cep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) return NextResponse.json({ error: "CEP inválido." }, { status: 400 });

  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) return NextResponse.json({ error: "CEP não encontrado ou serviço indisponível." }, { status: response.status === 404 ? 404 : 503 });
  const payload = await response.json();
  return NextResponse.json({ street: payload.street ?? "", neighborhood: payload.neighborhood ?? "", city: payload.city ?? "", state: payload.state ?? "", source: "BrasilAPI" }, { headers: { "Cache-Control": "no-store" } });
}
