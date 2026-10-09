import { ORGAO } from "./layout";

/**
 * Numeração dos ofícios: NNN/AAAA/SCFC/ADMINISTRAÇÃO
 *
 * O último número usado no sistema anterior vem de configuração (e não mais
 * fixo no código) e vale SOMENTE para o ano informado — antes, em todo novo
 * ano a contagem recomeçaria em 066 em vez de 001.
 */
export function configNumeracao() {
  return {
    ultimoLegado: Number(process.env.OFICIO_ULTIMO_NUMERO_LEGADO ?? 65),
    anoLegado: Number(process.env.OFICIO_ANO_LEGADO ?? 2026),
    sufixo: process.env.OFICIO_SUFIXO ?? ORGAO.sufixoNumero,
  };
}

export function formatarNumero(sequencia: number, ano: number, sufixo = ORGAO.sufixoNumero) {
  return `${String(sequencia).padStart(3, "0")}/${ano}/${sufixo}`;
}

/** Extrai a sequência de "066/2026/SCFC/ADMINISTRAÇÃO" → 66. Retorna null se inválido. */
export function extrairSequencia(numero: string | null | undefined): number | null {
  if (!numero) return null;
  const m = numero.match(/^(\d+)\//);
  return m ? parseInt(m[1], 10) : null;
}

/** Base mínima da contagem para um ano (0, exceto no ano do sistema legado). */
export function baseDoAno(ano: number, cfg = configNumeracao()) {
  return ano === cfg.anoLegado ? cfg.ultimoLegado : 0;
}

/** Calcula a próxima sequência a partir dos números já usados no ano (usado em testes e prévias). */
export function proximaSequencia(
  numerosExistentes: Array<string | null>,
  ano: number,
  cfg = configNumeracao()
) {
  let maior = baseDoAno(ano, cfg);
  for (const n of numerosExistentes) {
    const seq = extrairSequencia(n);
    if (seq !== null && seq > maior) maior = seq;
  }
  return maior + 1;
}
