import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oficios } from "@/db/schema";
import { getSessao, naoAutorizado, naoEncontrado, parseId, respostaDeErro } from "@/lib/api";

/** Cria um novo RASCUNHO a partir de um ofício existente (sem número nem protocolo). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getSessao();
  if (!sessao) return naoAutorizado();
  const id = parseId(params.id);
  if (!id) return naoEncontrado();

  try {
    const [o] = await db.select().from(oficios).where(eq(oficios.id, id)).limit(1);
    if (!o) return naoEncontrado();

    const [novo] = await db
      .insert(oficios)
      .values({
        ano: new Date().getFullYear(),
        assunto: o.assunto,
        conteudo: o.conteudo,
        status: "rascunho",
        templateId: o.templateId,
        destinatarioId: o.destinatarioId,
        reduzido: o.reduzido,
        classificacao: o.classificacao,
        valorEstimado: o.valorEstimado,
        autorId: sessao.user.id ?? null,
      })
      .returning();
    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    return respostaDeErro(err);
  }
}
