import sanitizeHtml from "sanitize-html";

const TAG_REMOVER = "x-remover";
const MARCA_QUEBRA = '<div data-pagebreak="1"></div>';

/**
 * Sanitiza o HTML do corpo do ofício (defesa contra XSS armazenado) e remove
 * restos de elementos auxiliares do editor. Preserva tabelas, estilos de
 * alinhamento/recuo e as quebras de página manuais do TinyMCE.
 */
export function sanitizarConteudo(html: string): string {
  // sanitize-html descarta comentários; protegemos o marcador de quebra de página.
  const protegido = (html || "").replace(/<!--\s*pagebreak\s*-->/gi, MARCA_QUEBRA);

  const limpo = sanitizeHtml(protegido, {
    allowedTags: [
      TAG_REMOVER,
      "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr", "pre", "code",
      "ul", "ol", "li", "a",
      "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "td", "th",
    ],
    allowedAttributes: {
      "*": ["style", "class", "align", "data-pagebreak"],
      a: ["href", "target", "rel"],
      table: ["border", "cellpadding", "cellspacing", "width"],
      td: ["colspan", "rowspan", "valign", "width", "height"],
      th: ["colspan", "rowspan", "valign", "width", "height"],
      col: ["span", "width"],
      ol: ["start", "type"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        "text-indent": [/^-?[\d.]+(cm|mm|px|pt|em)$/],
        "font-family": [/^[\w\s,'"-]+$/],
        "font-size": [/^[\d.]+(pt|px|em|%)$/],
        "font-weight": [/^(bold|normal|[1-9]00)$/],
        "font-style": [/^(italic|normal)$/],
        "text-decoration": [/^[\w\s-]+$/],
        color: [/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i],
        "background-color": [/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i],
        width: [/^[\d.]+(px|%|cm|mm|pt)$/],
        height: [/^[\d.]+(px|%|cm|mm|pt)$/],
        "line-height": [/^[\d.]+(px|pt|em|%)?$/],
        "vertical-align": [/^[\w-]+$/],
        "white-space": [/^[\w-]+$/],
        "break-after": [/^(page|auto|avoid)$/],
        "page-break-after": [/^(always|auto|avoid)$/],
        "break-inside": [/^(avoid|auto)$/],
        "border-collapse": [/^(collapse|separate)$/],
        border: [/^[\w\s.#(),%-]+$/],
        "border-top": [/^[\w\s.#(),%-]+$/],
        "border-right": [/^[\w\s.#(),%-]+$/],
        "border-bottom": [/^[\w\s.#(),%-]+$/],
        "border-left": [/^[\w\s.#(),%-]+$/],
        "border-color": [/^[\w\s.#(),%-]+$/],
        padding: [/^[-\d.\spxtcmem%]+$/],
        margin: [/^[-\d.\spxtcmem%]+$/],
      },
    },
    // Marca os nós auxiliares ANTES da filtragem de atributos (depois dela, id/data-* já teriam sumido).
    transformTags: {
      "*": (tagName, attribs) => {
        const cls = attribs.class || "";
        const auxiliar =
          "data-oficio-chrome" in attribs ||
          /\b(page-break-marker|mce-pagebreak)\b/.test(cls) ||
          attribs.id === "pg-cab" ||
          attribs.id === "pg-rod";
        if (auxiliar) return { tagName: TAG_REMOVER, attribs: {} };
        if (tagName === "a") return { tagName, attribs: { ...attribs, rel: "noopener noreferrer" } };
        return { tagName, attribs };
      },
    },
  });

  // remove os nós auxiliares marcados acima (com tudo que estiver dentro deles)
  const re = new RegExp(`<${TAG_REMOVER}>[\\s\\S]*?</${TAG_REMOVER}>`, "g");
  let semAuxiliares = limpo;
  for (let anterior = ""; anterior !== semAuxiliares; ) {
    anterior = semAuxiliares;
    semAuxiliares = semAuxiliares.replace(re, "");
  }
  semAuxiliares = semAuxiliares.split(`<${TAG_REMOVER}>`).join("").split(`</${TAG_REMOVER}>`).join("");

  return semAuxiliares.replace(/<div data-pagebreak="1"><\/div>/g, "<!-- pagebreak -->");
}
