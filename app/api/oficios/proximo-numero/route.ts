import { NextResponse } from "next/server";
import { db } from "@/db";
import { oficios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ano = new Date().getFullYear();
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

  return NextResponse.json({ numero });
}