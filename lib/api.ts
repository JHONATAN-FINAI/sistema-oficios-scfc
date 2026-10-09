import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "./auth";

export async function getSessao() {
  return getServerSession(authOptions);
}

export const naoAutorizado = () => NextResponse.json({ error: "Não autorizado" }, { status: 401 });
export const naoEncontrado = () => NextResponse.json({ error: "Não encontrado" }, { status: 404 });
export const conflito = (message: string) => NextResponse.json({ error: message, message }, { status: 409 });
export const invalido = (message: string) => NextResponse.json({ error: message, message }, { status: 400 });

export function parseId(valor: string): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Converte erro de validação (zod) em 400 com mensagem legível. */
export function respostaDeErro(err: unknown) {
  if (err instanceof ZodError) {
    return invalido(err.issues.map((i) => `${i.path.join(".") || "campo"}: ${i.message}`).join("; "));
  }
  if (err instanceof SyntaxError) return invalido("JSON inválido.");
  console.error(err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

export function erroPg(err: unknown): string | undefined {
  return (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
}
