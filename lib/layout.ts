/**
 * Fonte ÚNICA da verdade para o layout do ofício (A4, px a 96 dpi).
 * Editor, pré-visualização e impressão usam estas constantes.
 *
 * Margens seguem a ABNT NBR 14724: esquerda 3 cm, direita 2 cm.
 * O topo (47 mm) e o rodapé (28 mm) abrigam o papel timbrado da Prefeitura.
 */
export const MM = 96 / 25.4; // 1 mm em px

export const PAGINA = {
  largura: 794, // 210 mm
  altura: 1123, // 297 mm
  margemEsq: 113, // 30 mm
  margemDir: 76, // 20 mm
  cabecalho: 178, // 47 mm (papel timbrado, repetido em toda página)
  rodape: 106, // 28 mm
  /** faixa livre no pé da folha onde o navegador imprime "Página X de Y" */
  faixaNumeracao: 38, // 10 mm
} as const;

/** Altura útil de texto em cada página. */
export const ALTURA_UTIL =
  PAGINA.altura - PAGINA.faixaNumeracao - PAGINA.cabecalho - PAGINA.rodape;

/** Largura útil de texto (área entre as margens). */
export const LARGURA_UTIL = PAGINA.largura - PAGINA.margemEsq - PAGINA.margemDir;

export const CABECALHO_IMG = "/cabecalho.png";

export const RODAPE_TEXTO =
  "Prefeitura Municipal de Rondonópolis – MT  |  Av. Duque de Caxias, 1000  |  CEP: 78.800-000  |  (66) 3411-7000";

export const ORGAO = {
  cidade: "Rondonópolis",
  sufixoNumero: "SCFC/ADMINISTRAÇÃO",
} as const;

/** Recuo de primeira linha usado nos parágrafos de ofício (Manual de Redação da Presidência). */
export const RECUO_PRIMEIRA_LINHA = "2.5cm";
