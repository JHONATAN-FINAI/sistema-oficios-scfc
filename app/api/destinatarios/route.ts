import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { destinatarios } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select()
    .from(destinatarios)
    .orderBy(asc(destinatarios.codigo));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  try {
    const result = await db
      .insert(destinatarios)
      .values({
        codigo: body.codigo,
        nome: body.nome,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        responsavel: body.responsavel || null,
        cargo: body.cargo || null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
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