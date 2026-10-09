import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarNumero, extrairSequencia, proximaSequencia } from "../lib/numeracao";
import { sanitizarConteudo } from "../lib/sanitize";
import { escapeHtml } from "../lib/html";
import { gerarHtmlOficio } from "../lib/oficio-html";
import { ALTURA_UTIL } from "../lib/layout";

const cfg = { ultimoLegado: 65, anoLegado: 2026, sufixo: "SCFC/ADMINISTRAÇÃO" };

test("numeração: formato e extração", () => {
  assert.equal(formatarNumero(7, 2026), "007/2026/SCFC/ADMINISTRAÇÃO");
  assert.equal(formatarNumero(1234, 2026), "1234/2026/SCFC/ADMINISTRAÇÃO");
  assert.equal(extrairSequencia("066/2026/SCFC/ADMINISTRAÇÃO"), 66);
  assert.equal(extrairSequencia(null), null);
  assert.equal(extrairSequencia("abc"), null);
});

test("numeração: ano do legado continua do 65; ano novo recomeça do 1", () => {
  assert.equal(proximaSequencia([], 2026, cfg), 66);
  assert.equal(proximaSequencia(["066/2026/X", "070/2026/X"], 2026, cfg), 71);
  assert.equal(proximaSequencia([], 2027, cfg), 1); // bug antigo: daria 66
  assert.equal(proximaSequencia(["001/2027/X", null], 2027, cfg), 2);
});

test("sanitize: remove script/handlers e mantém tabelas, alinhamento e quebra de página", () => {
  const sujo =
    '<p style="text-align:justify;text-indent:2.5cm" onclick="x()">Oi<script>alert(1)</script></p>' +
    '<table style="border-collapse:collapse;width:100%"><tbody><tr><td colspan="2" style="border:1px solid #000">a</td></tr></tbody></table>' +
    "<!-- pagebreak -->" +
    '<img src=x onerror=alert(1)><a href="javascript:alert(1)">l</a>';
  const limpo = sanitizarConteudo(sujo);
  assert.ok(!/script|onclick|onerror|javascript:|<img/i.test(limpo), limpo);
  assert.ok(limpo.includes("text-indent:2.5cm"));
  assert.ok(limpo.includes('colspan="2"'));
  assert.ok(limpo.includes("<!-- pagebreak -->"));
});

test("sanitize: descarta elementos auxiliares do editor", () => {
  const html =
    '<div id="pg-cab"><img src="x"></div><div data-oficio-chrome="1">meta</div>' +
    '<div class="page-break-marker">m</div><p>texto</p>';
  assert.equal(sanitizarConteudo(html), "<p>texto</p>");
});

test("escapeHtml", () => {
  assert.equal(escapeHtml(`<b onclick="x">&'`), "&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;");
});

test("impressão: escapa assunto/destinatário e usa espaçadores repetidos por página", () => {
  const html = gerarHtmlOficio({
    numero: "001/2026/SCFC/ADMINISTRAÇÃO",
    status: "emitido",
    data: "2026-10-09T12:00:00Z",
    assunto: '<img src=x onerror=alert(1)>',
    conteudo: "<p>ok</p><!-- pagebreak --><p>pág 2</p>",
    destinatario: { nome: "<script>x</script>", responsavel: "Fulano" },
  });
  assert.ok(!html.includes("<script>x"));
  assert.ok(!html.includes("<img src=x onerror"));
  assert.ok(html.includes("table-header-group") && html.includes("table-footer-group"));
  assert.ok(html.includes("break-after:page"));
  assert.ok(!html.includes("marca-dagua\">"), "emitido não tem marca d'água");
  assert.ok(gerarHtmlOficio({ numero: null, status: "rascunho", data: new Date(), assunto: "a", conteudo: "" }).includes("RASCUNHO"));
});

test("layout: altura útil positiva e coerente", () => {
  assert.equal(ALTURA_UTIL, 1123 - 38 - 178 - 106);
});

test("senha: bcrypt confere; MD5 legado confere e pede migração; errada falha", async () => {
  process.env.DATABASE_URL ??= "postgresql://x:x@localhost/x";
  const { senhaConfere, hashSenha } = await import("../lib/auth");
  const hash = await hashSenha("segredo");
  assert.deepEqual(await senhaConfere("segredo", hash), { ok: true, migrar: false });
  assert.equal((await senhaConfere("errada", hash)).ok, false);
  const md5 = "7ed8a0ec9d4f7e1a6c0b6a0d6f1b1f3c"; // hash qualquer (não confere)
  assert.equal((await senhaConfere("segredo", md5)).ok, false);
  const { createHash } = await import("node:crypto");
  const legado = createHash("md5").update("admin123").digest("hex");
  assert.deepEqual(await senhaConfere("admin123", legado), { ok: true, migrar: true });
});
