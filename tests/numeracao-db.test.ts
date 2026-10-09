/**
 * Teste de integração (precisa de um Postgres):
 *   DATABASE_URL=postgresql://... npm run test:db
 * Pula automaticamente se TEST_DATABASE_URL/DATABASE_URL não apontar para localhost.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import { emitirOficio, preverProximoNumero } from "../lib/numeracao-db";

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
const rodar = /localhost|127\.0\.0\.1/.test(url);
const opt = { skip: rodar ? false : "defina TEST_DATABASE_URL apontando para um Postgres local" };

const pool = new Pool({ connectionString: url, max: 20 });
const db = drizzle(pool, { schema });
const ANO = 2026;

async function novoRascunho(extra: Partial<typeof schema.oficios.$inferInsert> = {}) {
  const [o] = await db.insert(schema.oficios).values({ ano: ANO, assunto: "t", conteudo: "<p>x</p>", ...extra }).returning();
  return o;
}

before(async () => { if (rodar) await pool.query("TRUNCATE oficios RESTART IDENTITY CASCADE"); });
after(async () => { await pool.end(); });

test("primeira emissão do ano legado continua do 65 → 066", opt, async () => {
  const o = await novoRascunho();
  const e = await emitirOficio(o.id, db, ANO);
  assert.equal(e?.numero, "066/2026/SCFC/ADMINISTRAÇÃO");
  assert.equal(e?.sequencia, 66);
  assert.equal(e?.status, "emitido");
});

test("registro legado SEM coluna sequencia (só texto do número) é respeitado", opt, async () => {
  await pool.query("INSERT INTO oficios (numero, ano, assunto, conteudo, status) VALUES ('080/2026/SCFC/ADMINISTRAÇÃO', 2026, 'legado', 'x', 'emitido')");
  const e = await emitirOficio((await novoRascunho()).id, db, ANO);
  assert.equal(e?.sequencia, 81);
});

test("20 emissões SIMULTÂNEAS recebem números únicos e consecutivos", opt, async () => {
  const rascunhos = await Promise.all(Array.from({ length: 20 }, () => novoRascunho()));
  const emitidos = await Promise.all(rascunhos.map((r) => emitirOficio(r.id, db, ANO)));
  const seqs = emitidos.map((e) => e!.sequencia!).sort((a, b) => a - b);
  assert.equal(new Set(seqs).size, 20, "números duplicados: " + seqs.join(","));
  assert.deepEqual(seqs, Array.from({ length: 20 }, (_, i) => 82 + i));
});

test("emitir duas vezes o mesmo ofício não gera outro número", opt, async () => {
  const o = await novoRascunho();
  assert.ok(await emitirOficio(o.id, db, ANO));
  assert.equal(await emitirOficio(o.id, db, ANO), null);
});

test("ano novo recomeça em 001 (o código antigo daria 066)", opt, async () => {
  const e = await emitirOficio((await novoRascunho({ ano: 2027 })).id, db, 2027);
  assert.equal(e?.numero, "001/2027/SCFC/ADMINISTRAÇÃO");
  assert.equal((await preverProximoNumero(2027, db)).numero, "002/2027/SCFC/ADMINISTRAÇÃO");
});

test("o índice único impede número repetido mesmo por inserção direta", opt, async () => {
  await assert.rejects(
    pool.query("INSERT INTO oficios (ano, sequencia, assunto, conteudo) VALUES (2026, 66, 'dup', 'x')"),
    /oficios_ano_sequencia_unique/
  );
});
