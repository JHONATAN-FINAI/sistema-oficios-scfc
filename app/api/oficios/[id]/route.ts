import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oficios, destinatarios, templates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const result = await db
    .select()
    .from(oficios)
    .where(eq(oficios.id, id))
    .limit(1);

  if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oficio = result[0];

  const [destResult, tplResult] = await Promise.all([
    oficio.destinatarioId
      ? db.select().from(destinatarios).where(eq(destinatarios.id, oficio.destinatarioId)).limit(1)
      : Promise.resolve([]),
    oficio.templateId
      ? db.select().from(templates).where(eq(templates.id, oficio.templateId)).limit(1)
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    ...oficio,
    destinatario: destResult[0] || null,
    template: tplResult[0] || null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const body = await req.json();

  const campos: Record<string, any> = { atualizadoEm: new Date() };

  if (body.assunto !== undefined) campos.assunto = body.assunto;
if (body.conteudo !== undefined) campos.conteudo = body.conteudo.replace(/<div[^>]*class="page-marker"[^>]*>.*?<\/div>/gi, "");
  if (body.status !== undefined) campos.status = body.status;
  if (body.protocolo !== undefined) campos.protocolo = body.protocolo;
  if (body.templateId !== undefined) campos.templateId = body.templateId;
  if (body.destinatarioId !== undefined) campos.destinatarioId = body.destinatarioId;
  if (body.reduzido !== undefined) campos.reduzido = body.reduzido;
  if (body.classificacao !== undefined) campos.classificacao = body.classificacao;
  if (body.valorEstimado !== undefined) campos.valorEstimado = body.valorEstimado;

  await db.update(oficios).set(campos).where(eq(oficios.id, id));

  const updated = await db.select().from(oficios).where(eq(oficios.id, id)).limit(1);
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.delete(oficios).where(eq(oficios.id, Number(params.id)));
  return NextResponse.json({ ok: true });
}