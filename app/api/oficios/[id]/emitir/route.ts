import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oficios } from "@/db/schema";
import { conflito, getSessao, invalido, naoAutorizado, naoEncontrado, parseId, respostaDeErro } from "@/lib/api";
import { emitirOficio } from "@/lib/numeracao-db";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getSessao())) return naoAutorizado();
  const id = parseId(params.id);
  if (!id) return naoEncontrado();

  try {
    const [atual] = await db.select().from(oficios).where(eq(oficios.id, id)).limit(1);
    if (!atual) return naoEncontrado();
    if (atual.status !== "rascunho") return conflito("Este ofício já foi emitido.");
    if (!atual.assunto.trim() || !atual.conteudo.trim()) return invalido("Preencha assunto e conteúdo antes de emitir.");

    // Rascunho antigo que já tinha número no sistema anterior: preserva o número.
    if (atual.numero) {
      const [r] = await db
        .update(oficios)
        .set({ status: "emitido", emitidoEm: new Date(), atualizadoEm: new Date() })
        .where(eq(oficios.id, id))
        .returning();
      return NextResponse.json(r);
    }

    const emitido = await emitirOficio(id);
    if (!emitido) return conflito("Este ofício já foi emitido.");
    return NextResponse.json(emitido);
  } catch (err) {
    return respostaDeErro(err);
  }
}
