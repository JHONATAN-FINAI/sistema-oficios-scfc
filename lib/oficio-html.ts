import { CABECALHO_IMG, LARGURA_UTIL, ORGAO, PAGINA, RODAPE_TEXTO, ALTURA_UTIL } from "./layout";
import { converterQuebrasDePagina, escapeHtml, formatarDataExtenso } from "./html";

export interface DestinatarioPrint {
  nome: string;
  endereco?: string | null;
  cidade?: string | null;
  responsavel?: string | null;
  cargo?: string | null;
}

export interface OficioPrint {
  numero: string | null;
  status: string;
  /** data do ofício (emissão; se ainda rascunho, a data de hoje) */
  data: Date | string;
  assunto: string;
  /** HTML já sanitizado */
  conteudo: string;
  destinatario?: DestinatarioPrint | null;
  protocolo?: string | null;
}

export function montarDestinatarioHtml(dest?: DestinatarioPrint | null): string {
  if (!dest) return "";
  let html = "";
  if (dest.responsavel) {
    html += `<div>Ao Senhor</div><div><strong>${escapeHtml(dest.responsavel)}</strong></div>`;
    if (dest.cargo) html += `<div>${escapeHtml(dest.cargo)}</div>`;
  }
  html += `<div><strong>${escapeHtml(dest.nome)}</strong></div>`;
  if (dest.endereco) {
    html += `<div>${escapeHtml(dest.endereco)}${dest.cidade ? `, ${escapeHtml(dest.cidade)}` : ""}</div>`;
  }
  return `<div class="destinatario">${html}</div>`;
}

/**
 * Bloco de abertura do ofício (número, data, destinatário e assunto).
 * Usado igual no editor (bloco não editável) e na impressão.
 */
export function montarAberturaHtml(o: Pick<OficioPrint, "numero" | "data" | "assunto" | "destinatario">): string {
  const numero = o.numero ? escapeHtml(o.numero) : `____/${new Date(o.data).getFullYear()}/${ORGAO.sufixoNumero}`;
  return [
    `<div class="numero-oficio">OFÍCIO Nº ${numero}</div>`,
    `<div class="data-oficio">${ORGAO.cidade}, ${escapeHtml(formatarDataExtenso(o.data))}.</div>`,
    montarDestinatarioHtml(o.destinatario),
    o.assunto ? `<div class="assunto">Assunto: ${escapeHtml(o.assunto)}.</div>` : "",
  ].join("");
}

/** CSS compartilhado do texto do ofício (editor + impressão), para que ambos fiquem idênticos. */
export const CSS_TEXTO = `
  .numero-oficio { font-weight: bold; margin: 0 0 12px; }
  .data-oficio { text-align: right; margin: 0 0 18px; }
  .destinatario { margin: 0 0 18px; line-height: 1.7; }
  .assunto { font-weight: bold; margin: 0 0 20px; }
  .corpo { text-align: justify; }
  .corpo p { margin: 0 0 8px; text-align: justify; }
  .corpo table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 11pt; }
  .corpo td, .corpo th { border: 1px solid #000; padding: 4px 8px; vertical-align: top; }
  .corpo tr { break-inside: avoid; page-break-inside: avoid; }
  .corpo h1, .corpo h2, .corpo h3 { margin: 0 0 8px; }
  .corpo ul, .corpo ol { margin: 0 0 8px 1.2cm; }
`;

const MARCA_DAGUA: Record<string, string> = { rascunho: "RASCUNHO", cancelado: "CANCELADO" };

/**
 * Documento completo de impressão.
 *
 * Como a margem superior/inferior funciona em TODAS as páginas: cabeçalho e
 * rodapé são `position: fixed` (o navegador os repete em cada folha) e o texto
 * fica dentro de uma <table> cujo <thead>/<tfoot> são "espaçadores" com a
 * altura deles. Navegadores repetem thead/tfoot a cada página, então o texto
 * nunca invade o papel timbrado — o problema da versão anterior, que usava
 * apenas padding no body (válido só para a 1ª e a última página).
 */
export function gerarHtmlOficio(o: OficioPrint, opts: { baseUrl?: string } = {}): string {
  const base = (opts.baseUrl || "").replace(/\/$/, "");
  const marca = MARCA_DAGUA[o.status];
  const titulo = o.numero ? `Ofício ${o.numero}` : "Ofício (rascunho)";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  /* Chrome/Edge 131+: "Página X de Y" no canto inferior direito, a partir da 2ª página. */
  @page {
    size: A4;
    margin: 0 0 ${PAGINA.faixaNumeracao}px 0;
    @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 9pt Arial, sans-serif; color: #444; padding-right: ${PAGINA.margemDir}px; }
  }
  @page :first { @bottom-right { content: none; } }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5; color: #000; background: #fff; width: ${PAGINA.largura}px; }

  #cabecalho, #rodape { position: fixed; left: 0; right: 0; background: #fff; display: flex; align-items: center; justify-content: center; }
  #cabecalho { top: 0; height: ${PAGINA.cabecalho}px; padding: 12px ${PAGINA.margemDir}px 8px ${PAGINA.margemEsq}px; }
  #cabecalho img { max-width: 100%; max-height: 100%; object-fit: contain; }
  #rodape { bottom: 0; height: ${PAGINA.rodape}px; padding: 0 ${PAGINA.margemDir}px 0 ${PAGINA.margemEsq}px; font-size: 8pt; color: #555; text-align: center; }

  table.folha { width: 100%; border-collapse: collapse; }
  table.folha > thead { display: table-header-group; }
  table.folha > tfoot { display: table-footer-group; }
  table.folha > thead td > div { height: ${PAGINA.cabecalho}px; }
  table.folha > tfoot td > div { height: ${PAGINA.rodape}px; }
  table.folha > tbody > tr > td { padding: 0 ${PAGINA.margemDir}px 0 ${PAGINA.margemEsq}px; vertical-align: top; }

  .marca-dagua { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 110px; font-weight: bold; color: rgba(0,0,0,0.07); transform: rotate(-35deg); pointer-events: none; z-index: 0; }
  ${CSS_TEXTO}
  .protocolo { margin-top: 16px; font-size: 10pt; color: #555; }

  /* Visualização em tela (iframe): uma folha contínua; linhas tracejadas = onde cada página quebra. */
  @media screen {
    html { background: #525659; }
    body { position: relative; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,.4); min-height: ${PAGINA.altura}px; }
    #cabecalho { position: absolute; border-bottom: 1px solid #ddd; }
    #rodape { position: absolute; border-top: 1px solid #ddd; }
    .marca-dagua { position: absolute; }
    table.folha > tbody > tr > td {
      background-repeat: repeat-y;
      background-image: linear-gradient(to bottom, transparent calc(100% - 1px), rgba(229,57,53,.55) calc(100% - 1px));
      background-size: 100% ${ALTURA_UTIL}px;
    }
  }
</style>
</head>
<body>
  ${marca ? `<div class="marca-dagua">${marca}</div>` : ""}
  <div id="cabecalho"><img src="${base}${CABECALHO_IMG}" alt="" /></div>
  <div id="rodape">${escapeHtml(RODAPE_TEXTO)}</div>
  <table class="folha">
    <thead><tr><td><div></div></td></tr></thead>
    <tfoot><tr><td><div></div></td></tr></tfoot>
    <tbody><tr><td>
      ${montarAberturaHtml(o)}
      <div class="corpo">${converterQuebrasDePagina(o.conteudo)}</div>
      ${o.protocolo ? `<div class="protocolo">Protocolo: ${escapeHtml(o.protocolo)}</div>` : ""}
    </td></tr></tbody>
  </table>
</body>
</html>`;
}

export { ALTURA_UTIL, LARGURA_UTIL };
