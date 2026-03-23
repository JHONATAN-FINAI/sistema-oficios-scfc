import { NextResponse } from "next/server";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select()
    .from(templates)
    .where(eq(templates.ativo, true))
    .orderBy(asc(templates.nome));

  return NextResponse.json(result);
}