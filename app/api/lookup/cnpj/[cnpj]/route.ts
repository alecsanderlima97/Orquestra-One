import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await params;
  const normalized = cnpj.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(normalized)) return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${normalized}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) return NextResponse.json({ error: "CNPJ não encontrado ou serviço indisponível." }, { status: response.status === 400 ? 400 : 503 });
  const payload = await response.json();
  return NextResponse.json({ name: payload.razao_social ?? payload.nome_fantasia ?? "", tradeName: payload.nome_fantasia ?? "", email: payload.email ?? "", phone: payload.ddd_telefone_1 ?? "", cep: payload.cep ?? "", street: payload.logradouro ?? "", number: payload.numero ?? "", complement: payload.complemento ?? "", neighborhood: payload.bairro ?? "", city: payload.municipio ?? "", state: payload.uf ?? "", source: "BrasilAPI" }, { headers: { "Cache-Control": "no-store" } });
}
