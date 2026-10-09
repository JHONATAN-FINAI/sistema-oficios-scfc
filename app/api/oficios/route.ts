import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { oficios, destinatarios, templates } from "@/db/schema";
import { getSessao, naoAutorizado, respostaDeErro } from "@/lib/api";
import { oficioSchema } from "@/lib/validators";
import { sanitizarConteudo } from "@/lib/sanitize";

export async function GET() {
  if (!(await getSessao())) return naoAutorizado();

  const result = await db
    .select({
      id: oficios.id,
      numero: oficios.numero,
      ano: oficios.ano,
      assunto: oficios.assunto,
      status: oficios.status,
      protocolo: oficios.protocolo,
      criadoEm: oficios.criadoEm,
      emitidoEm: oficios.emitidoEm,
      atualizadoEm: oficios.atualizadoEm,
      destinatario: { codigo: destinatarios.codigo, nome: destinatarios.nome },
      template: { nome: templates.nome },
    })
    .from(oficios)
    .leftJoin(destinatarios, eq(oficios.destinatarioId, destinatarios.id))
    .leftJoin(templates, eq(oficios.templateId, templates.id))
    .orderBy(desc(oficios.criadoEm));

  return NextResponse.json(result);
}

/** Cria um RASCUNHO. O número só é atribuído na emissão (/api/oficios/[id]/emitir). */
export async function POST(req: NextRequest) {
  const sessao = await getSessao();
  if (!sessao) return naoAutorizado();

  try {
    const dados = oficioSchema.parse(await req.json());
    const [criado] = await db
      .insert(oficios)
      .values({
        ano: new Date().getFullYear(),
        assunto: dados.assunto,
        conteudo: sanitizarConteudo(dados.conteudo),
        status: "rascunho",
        templateId: dados.templateId ?? null,
        destinatarioId: dados.destinatarioId ?? null,
        reduzido: dados.reduzido ?? null,
        classificacao: dados.classificacao ?? null,
        valorEstimado: dados.valorEstimado ?? null,
        autorId: sessao.user.id ?? null,
      })
      .returning();
    return NextResponse.json(criado, { status: 201 });
  } catch (err) {
    return respostaDeErro(err);
  }
}
