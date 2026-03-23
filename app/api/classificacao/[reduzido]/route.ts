import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classificacaoOrcamentaria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  req: NextRequest,
  { params }: { params: { reduzido: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select()
    .from(classificacaoOrcamentaria)
    .where(eq(classificacaoOrcamentaria.reduzido, params.reduzido))
    .limit(1);

  if (!result.length) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}