/**
 * Gera um HTML de exemplo (3+ páginas) para conferir a impressão no navegador:
 *   npx tsx scripts/gerar-exemplo.ts [saida.html]
 * Abra o arquivo no Chrome/Edge, Ctrl+P, "Salvar como PDF", margens: Nenhuma.
 */
import { readFileSync, writeFileSync } from "fs";
import { gerarHtmlOficio } from "../lib/oficio-html";

const paragrafo = (n: number) =>
  `<p style="text-indent:2.5cm">${n}. Vimos por meio deste solicitar a V.Sa. as providências cabíveis quanto ao assunto em epígrafe, visando atender às necessidades desta Superintendência de Controle de Frotas e Combustível, em conformidade com a legislação vigente e com os prazos estabelecidos pela Administração Municipal.</p>`;

const tabela =
  `<table style="border-collapse:collapse;width:100%"><tbody>` +
  Array.from(
    { length: 12 },
    (_, i) =>
      `<tr><td style="border:1px solid #000">Item ${i + 1}</td><td style="border:1px solid #000">Descrição do item ${i + 1}</td><td style="border:1px solid #000">R$ ${(i + 1) * 100},00</td></tr>`
  ).join("") +
  `</tbody></table>`;

const img = "data:image/png;base64," + readFileSync("public/cabecalho.png").toString("base64");

const html = gerarHtmlOficio({
  numero: "066/2026/SCFC/ADMINISTRAÇÃO",
  status: "emitido",
  data: new Date(),
  assunto: "Exemplo de ofício com várias páginas para teste de impressão",
  conteudo:
    "<p>Prezados Senhores,</p>" +
    Array.from({ length: 14 }, (_, i) => paragrafo(i + 1)).join("") +
    tabela +
    Array.from({ length: 10 }, (_, i) => paragrafo(i + 15)).join("") +
    "<p>Atenciosamente,</p>",
  destinatario: {
    nome: "SECRETARIA MUNICIPAL DE GOVERNO",
    responsavel: "Fulano de Tal",
    cargo: "Secretário Municipal",
    endereco: "Av. Exemplo, 100",
    cidade: "Rondonópolis - MT",
  },
}).replace('src="/cabecalho.png"', `src="${img}"`);

writeFileSync(process.argv[2] || "exemplo-oficio-multipagina.html", html);
console.log("gerado");
