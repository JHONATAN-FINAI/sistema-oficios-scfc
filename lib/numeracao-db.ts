import { and, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db as dbPadrao } from "@/db";
import * as schema from "@/db/schema";
import { oficios } from "@/db/schema";
import { baseDoAno, configNumeracao } from "./numeracao";
import { erroPg } from "./api";

// Aceita qualquer driver Postgres do drizzle (neon-http em produção, node-postgres nos testes).
type Banco = PgDatabase<any, typeof schema>;

/**
 * Subconsulta SQL: próxima sequência do ano = maior já usada (ou a base do
 * sistema legado) + 1. Lê `sequencia` e, para registros antigos sem ela,
 * extrai o número do texto "066/2026/...".
 */
function proximaSequenciaSql(ano: number) {
  const base = baseDoAno(ano);
  return sql`(
    SELECT GREATEST(${base}::int, COALESCE(MAX(COALESCE(o.sequencia, NULLIF(substring(o.numero from '^([0-9]+)/'), '')::int)), 0)) + 1
    FROM oficios o WHERE o.ano = ${ano}
  )`;
}

/** Prévia (não reserva) do próximo número. */
export async function preverProximoNumero(ano = new Date().getFullYear(), db: Banco = dbPadrao) {
  const r = await db.execute(sql`SELECT ${proximaSequenciaSql(ano)} AS seq`);
  const seq = Number((r.rows[0] as { seq: number | string }).seq);
  const { sufixo } = configNumeracao();
  return { sequencia: seq, numero: `${String(seq).padStart(3, "0")}/${ano}/${sufixo}` };
}

/**
 * Atribui o número a um rascunho e o marca como emitido, em UMA instrução SQL.
 * O índice único (ano, sequencia) garante que duas emissões simultâneas nunca
 * recebam o mesmo número: a perdedora leva erro 23505 e tenta de novo.
 */
export async function emitirOficio(id: number, db: Banco = dbPadrao, ano = new Date().getFullYear()) {
  const { sufixo } = configNumeracao();

  for (let tentativa = 0; tentativa < 8; tentativa++) {
    try {
      const seq = proximaSequenciaSql(ano);
      const [emitido] = await db
        .update(oficios)
        .set({
          ano,
          sequencia: sql`${seq}`,
          numero: sql`lpad((${seq})::text, 3, '0') || ${`/${ano}/${sufixo}`}`,
          status: "emitido",
          emitidoEm: new Date(),
          atualizadoEm: new Date(),
        })
        .where(and(eq(oficios.id, id), eq(oficios.status, "rascunho"), isNull(oficios.numero)))
        .returning();
      return emitido ?? null;
    } catch (err) {
      if (erroPg(err) !== "23505") throw err;
      // conflito de número com outra emissão simultânea → recalcula e tenta novamente
    }
  }
  throw new Error("Não foi possível reservar um número de ofício. Tente novamente.");
}
