import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oficios, destinatarios, templates } from "@/db/schema";
import { conflito, getSessao, invalido, naoAutorizado, naoEncontrado, parseId, respostaDeErro } from "@/lib/api";
import { atualizarOficioSchema } from "@/lib/validators";
import { sanitizarConteudo } from "@/lib/sanitize";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await getSessao())) return naoAutorizado();
  const id = parseId(params.id);
  if (!id) return naoEncontrado();

  const [oficio] = await db.select().from(oficios).where(eq(oficios.id, id)).limit(1);
  if (!oficio) return naoEncontrado();

  const [dest, tpl] = await Promise.all([
    oficio.destinatarioId
      ? db.select().from(destinatarios).where(eq(destinatarios.id, oficio.destinatarioId)).limit(1)
      : Promise.resolve([]),
    oficio.templateId
      ? db.select().from(templates).where(eq(templates.id, oficio.templateId)).limit(1)
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    ...oficio,
    // conteúdo salvo antes da sanitização existir também passa pelo filtro
    conteudo: sanitizarConteudo(oficio.conteudo),
    destinatario: dest[0] ?? null,
    template: tpl[0] ?? null,
  });
}

/**
 * Regras de edição:
 *  - rascunho e emitido: texto e dados podem ser alterados (o número é preservado);
 *  - protocolado e cancelado: texto travado (só o protocolo pode ser ajustado em protocolado).
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await getSessao())) return naoAutorizado();
  const id = parseId(params.id);
  if (!id) return naoEncontrado();

  try {
    const dados = atualizarOficioSchema.parse(await req.json());
    const [atual] = await db.select().from(oficios).where(eq(oficios.id, id)).limit(1);
    if (!atual) return naoEncontrado();

    const mudaTexto = ["assunto", "conteudo", "templateId", "destinatarioId", "reduzido", "classificacao", "valorEstimado"].some(
      (k) => (dados as Record<string, unknown>)[k] !== undefined
    );
    if (atual.status === "cancelado") return conflito("Ofício cancelado não pode ser alterado.");
    if (atual.status === "protocolado" && mudaTexto) {
      return conflito("Ofício protocolado não pode ter o texto alterado. Duplique-o para criar uma nova versão.");
    }
    if (dados.protocolo !== undefined && atual.status === "rascunho") {
      return invalido("Emita o ofício antes de lançar o protocolo.");
    }

    const campos: Partial<typeof oficios.$inferInsert> = { atualizadoEm: new Date() };
    if (dados.assunto !== undefined) campos.assunto = dados.assunto;
    if (dados.conteudo !== undefined) campos.conteudo = sanitizarConteudo(dados.conteudo);
    if (dados.templateId !== undefined) campos.templateId = dados.templateId;
    if (dados.destinatarioId !== undefined) campos.destinatarioId = dados.destinatarioId;
    if (dados.reduzido !== undefined) campos.reduzido = dados.reduzido;
    if (dados.classificacao !== undefined) campos.classificacao = dados.classificacao;
    if (dados.valorEstimado !== undefined) campos.valorEstimado = dados.valorEstimado;
    if (dados.protocolo !== undefined) {
      campos.protocolo = dados.protocolo || null;
      campos.status = dados.protocolo ? "protocolado" : "emitido";
    }

    const [atualizado] = await db.update(oficios).set(campos).where(eq(oficios.id, id)).returning();
    return NextResponse.json(atualizado);
  } catch (err) {
    return respostaDeErro(err);
  }
}

/** Só rascunhos podem ser excluídos. Ofícios numerados são CANCELADOS (o número nunca é reaproveitado). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await getSessao())) return naoAutorizado();
  const id = parseId(params.id);
  if (!id) return naoEncontrado();

  const [atual] = await db.select({ status: oficios.status, numero: oficios.numero }).from(oficios).where(eq(oficios.id, id)).limit(1);
  if (!atual) return naoEncontrado();
  if (atual.status !== "rascunho" || atual.numero) {
    return conflito("Ofícios emitidos não podem ser excluídos; cancele-o informando o motivo.");
  }
  await db.delete(oficios).where(eq(oficios.id, id));
  return NextResponse.json({ ok: true });
}
