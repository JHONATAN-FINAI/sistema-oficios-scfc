import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oficios, destinatarios, templates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select({
      id: oficios.id,
      numero: oficios.numero,
      ano: oficios.ano,
      assunto: oficios.assunto,
      status: oficios.status,
      protocolo: oficios.protocolo,
      criadoEm: oficios.criadoEm,
      destinatario: {
        codigo: destinatarios.codigo,
        nome: destinatarios.nome,
      },
      template: {
        nome: templates.nome,
      },
    })
    .from(oficios)
    .leftJoin(destinatarios, eq(oficios.destinatarioId, destinatarios.id))
    .leftJoin(templates, eq(oficios.templateId, templates.id))
    .orderBy(desc(oficios.criadoEm));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ano = new Date().getFullYear();

  // Próximo número
const existentes = await db
    .select({ numero: oficios.numero })
    .from(oficios)
    .where(eq(oficios.ano, ano));

  // Extrai o maior número sequencial existente e soma 1
  let maiorSequencia = 65; // Inicia a partir do 65 (último do sistema anterior)
  existentes.forEach(({ numero }) => {
    const match = numero.match(/^(\d+)\//);
    if (match) {
      const seq = parseInt(match[1]);
      if (seq > maiorSequencia) maiorSequencia = seq;
    }
  });

  const sequencia = maiorSequencia + 1;
  const numero = `${String(sequencia).padStart(3, "0")}/${ano}/SCFC/ADMINISTRAÇÃO`; 

  // Remove marcadores visuais de página inseridos pelo editor
const conteudoLimpo = body.conteudo.replace(/<div[^>]*class="page-marker"[^>]*>.*?<\/div>/gi, "");

  const result = await db
    .insert(oficios)
    .values({
      numero,
      ano,
      assunto: body.assunto,
      conteudo: (body.conteudo || "").replace(/<div[^>]*class="page-marker"[^>]*>.*?<\/div>/gi, ""),
      status: body.status || "rascunho",
      templateId: body.templateId || null,
      destinatarioId: body.destinatarioId || null,
      reduzido: body.reduzido || null,
      classificacao: body.classificacao || null,
      valorEstimado: body.valorEstimado || null,
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}