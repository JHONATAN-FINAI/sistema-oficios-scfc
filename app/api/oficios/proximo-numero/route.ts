import { NextResponse } from "next/server";
import { getSessao, naoAutorizado } from "@/lib/api";
import { preverProximoNumero } from "@/lib/numeracao-db";

/** Apenas uma PREVISÃO: o número definitivo é reservado na emissão. */
export async function GET() {
  if (!(await getSessao())) return naoAutorizado();
  const { numero } = await preverProximoNumero();
  return NextResponse.json({ numero });
}
