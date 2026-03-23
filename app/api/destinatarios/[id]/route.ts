import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { destinatarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const body = await req.json();

  try {
    await db
      .update(destinatarios)
      .set({
        codigo: body.codigo,
        nome: body.nome,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        responsavel: body.responsavel || null,
        cargo: body.cargo || null,
      })
      .where(eq(destinatarios.id, id));

    const updated = await db
      .select()
      .from(destinatarios)
      .where(eq(destinatarios.id, id))
      .limit(1);

    return NextResponse.json(updated[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { message: "Já existe um destinatário com este codigo." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.delete(destinatarios).where(eq(destinatarios.id, Number(params.id)));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "23503") {
      return NextResponse.json(
        { message: "Este destinatário está vinculado a ofícios e não pode ser excluído." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}