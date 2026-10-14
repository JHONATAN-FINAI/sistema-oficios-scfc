/**
 * Rode UMA vez após `npm run db:push` para ofícios criados antes da coluna `sequencia`:
 *   npm run db:backfill
 * Preenche `sequencia` a partir do texto do número e `emitido_em` dos já emitidos.
 * É seguro rodar mais de uma vez. Relata duplicidades que já existiam no banco.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const duplicados = await sql`
    SELECT ano, substring(numero from '^([0-9]+)/')::int AS seq, count(*) AS qtd, array_agg(id) AS ids
    FROM oficios WHERE numero ~ '^[0-9]+/'
    GROUP BY 1, 2 HAVING count(*) > 1`;
  if (duplicados.length) {
    console.log("⚠️  Números DUPLICADOS já existentes (corrija manualmente antes de continuar):");
    console.table(duplicados);
    process.exit(1);
  }

  const r = await sql`
    UPDATE oficios
       SET sequencia = substring(numero from '^([0-9]+)/')::int,
           emitido_em = CASE WHEN status <> 'rascunho' THEN COALESCE(emitido_em, criado_em) ELSE emitido_em END
     WHERE sequencia IS NULL AND numero ~ '^[0-9]+/'
     RETURNING id`;
  console.log(`${r.length} ofício(s) atualizado(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
