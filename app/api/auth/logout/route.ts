import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Encerra a sessão do One neste navegador (apaga o cookie HttpOnly). */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("orquestra_one_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
