import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oficios } from "@/db/schema";
import { conflito, getSessao, naoAutorizado, naoEncontrado, parseId, respostaDeErro } from "@/lib/api";
import { cancelarSchema } from "@/lib/validators";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getSessao())) return naoAutorizado();
  const id = parseId(params.id);
  if (!id) return naoEncontrado();

  try {
    const { motivo } = cancelarSchema.parse(await req.json());
    const [atual] = await db.select({ status: oficios.status }).from(oficios).where(eq(oficios.id, id)).limit(1);
    if (!atual) return naoEncontrado();
    if (atual.status === "cancelado") return conflito("Ofício já está cancelado.");
    if (atual.status === "rascunho") return conflito("Rascunhos não são cancelados: exclua-o.");

    const [r] = await db
      .update(oficios)
      .set({ status: "cancelado", canceladoEm: new Date(), motivoCancelamento: motivo, atualizadoEm: new Date() })
      .where(eq(oficios.id, id))
      .returning();
    return NextResponse.json(r);
  } catch (err) {
    return respostaDeErro(err);
  }
}
