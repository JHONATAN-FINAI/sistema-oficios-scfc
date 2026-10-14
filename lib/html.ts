export function escapeHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Converte o separador de página do TinyMCE em quebra de página CSS real. */
export function converterQuebrasDePagina(html: string): string {
  return html.replace(
    /<!--\s*pagebreak\s*-->/gi,
    '<div style="break-after:page;page-break-after:always;height:0;"></div>'
  );
}

export function formatarDataExtenso(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Cuiaba",
  });
}
