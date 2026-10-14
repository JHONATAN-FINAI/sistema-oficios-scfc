import { escapeHtml } from "./html";

export interface Classificacao {
  reduzido: string;
  funcional: string | null;
  fonte: string | null;
  naturezaDespesa: string | null;
  elemento: string | null;
  subelemento: string | null;
}

const TD = "border:1px solid #000;padding:4px 8px;";

/** Quadro de classificação orçamentária inserido no corpo do ofício (modelos de empenho). */
export function montarQuadroHtml(c: Classificacao, valor: string): string {
  const linha = (rotulo: string, v: string) =>
    `<tr><td style="${TD}font-weight:bold;">${rotulo}</td><td style="${TD}">${escapeHtml(v)}</td></tr>`;
  const elemento = `${c.elemento ?? ""}${c.subelemento ? ` / ${c.subelemento}` : ""}`;

  return (
    `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:11pt;"><tbody>` +
    `<tr><td colspan="2" style="background-color:#e8e8e8;font-weight:bold;padding:6px 8px;border:1px solid #000;text-align:center;">CLASSIFICAÇÃO ORÇAMENTÁRIA DA DESPESA</td></tr>` +
    linha("Órgão:", "02 - Prefeitura Municipal de Rondonópolis") +
    linha("Unidade:", "15 - Secretaria Municipal de Administração") +
    linha("Funcional Programática:", c.funcional ?? "") +
    linha("Elemento de Despesa:", elemento) +
    linha("Fonte:", c.fonte ?? "") +
    linha("Reduzido:", c.reduzido) +
    linha("Valor Estimado:", valor || "_______________") +
    `<tr><td colspan="2" style="border:1px solid #000;padding:12px 8px;"><strong>ANÁLISE DA SECRETARIA DE FAZENDA EM:</strong> _____ / _____ / _______<br /><br />` +
    `&nbsp;&nbsp;&nbsp;&nbsp;□ DEFERIDO &nbsp;&nbsp;&nbsp;&nbsp; □ INDEFERIDO &nbsp;&nbsp;&nbsp;&nbsp; Nº RESERVA: _______________<br /><br />` +
    `<div style="text-align:center;margin-top:8px;">________________________________________<br />Secretaria Municipal de Fazenda</div></td></tr>` +
    `</tbody></table><p></p>`
  );
}
