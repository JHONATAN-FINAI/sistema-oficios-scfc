"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { ALTURA_UTIL, CABECALHO_IMG, PAGINA, RECUO_PRIMEIRA_LINHA, RODAPE_TEXTO } from "@/lib/layout";
import { CSS_TEXTO } from "@/lib/oficio-html";

export interface OficioEditorHandle {
  getContent(): string;
  setContent(html: string): void;
  insertContent(html: string): void;
  isEmpty(): boolean;
}

interface Props {
  /** conteúdo inicial (o editor só é montado depois que ele está carregado) */
  valorInicial: string;
  /** HTML do bloco de abertura (nº, data, destinatário, assunto) mostrado como parte não editável da folha */
  aberturaHtml: string;
  somenteLeitura?: boolean;
  onChange?: (html: string) => void;
}

const ID_CAB = "pg-cab";
const ID_ABERTURA = "oficio-abertura";
const ID_ROD = "pg-rod";

/**
 * Editor A4. Em vez dos marcadores injetados (e dos números mágicos) da versão anterior:
 *  - a folha tem exatamente as mesmas dimensões da impressão (lib/layout.ts);
 *  - cabeçalho, abertura e rodapé são nós "bogus" do TinyMCE: aparecem na tela, mas NUNCA
 *    entram no conteúdo salvo nem no histórico de desfazer;
 *  - as linhas vermelhas mostram onde cada página quebra na impressão.
 */
const OficioEditor = forwardRef<OficioEditorHandle, Props>(function OficioEditor(
  { valorInicial, aberturaHtml, somenteLeitura, onChange },
  ref
) {
  const editorRef = useRef<any>(null);
  const aberturaRef = useRef(aberturaHtml);
  aberturaRef.current = aberturaHtml;

  const chaveTiny = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent() ?? "",
    setContent: (html) => editorRef.current?.setContent(html),
    insertContent: (html) => editorRef.current?.insertContent(html),
    isEmpty: () => !editorRef.current || !editorRef.current.getContent({ format: "text" }).trim(),
  }));

  // Mantém o bloco de abertura em sincronia com os campos do formulário.
  useEffect(() => {
    if (editorRef.current) garantirMoldura(editorRef.current, aberturaHtml);
  }, [aberturaHtml]);

  useEffect(() => {
    editorRef.current?.mode?.set(somenteLeitura ? "readonly" : "design");
  }, [somenteLeitura]);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {!chaveTiny && (
        <div className="bg-amber-50 border-b border-amber-300 text-amber-800 text-xs px-3 py-2">
          Defina <code>NEXT_PUBLIC_TINYMCE_API_KEY</code> no ambiente para liberar a edição (chave gratuita em tiny.cloud).
        </div>
      )}
      <Editor
        apiKey={chaveTiny || "no-api-key"}
        initialValue={valorInicial}
        onInit={(_evt: unknown, editor: any) => {
          editorRef.current = editor;
          garantirMoldura(editor, aberturaRef.current);
          if (somenteLeitura) editor.mode.set("readonly");
        }}
        onEditorChange={(html: string) => onChange?.(html)}
        init={{
          min_height: 900,
          menubar: "file edit view insert format tools table help",
          language: "pt_BR",
          plugins: [
            "advlist", "autolink", "lists", "link", "charmap", "preview", "searchreplace",
            "visualblocks", "code", "fullscreen", "insertdatetime", "table", "help",
            "wordcount", "autoresize", "pagebreak", "nonbreaking",
          ],
          toolbar_mode: "sliding",
          toolbar: [
            "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | removeformat",
            "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | recuoPrimeiraLinha | pagebreak fullscreen",
            "table tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells",
          ],
          font_size_formats: "8pt 9pt 10pt 11pt 12pt 14pt 18pt 24pt",
          font_family_formats: "Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Courier New=courier new,courier,monospace",
          table_toolbar:
            "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells | tablecellprops tablecellbackgroundcolor tablecellbordercolor",
          table_appearance_options: true,
          table_advtab: true,
          table_cell_advtab: true,
          table_row_advtab: true,
          table_column_resizing: "resizetable",
          table_default_attributes: { border: "1" },
          table_default_styles: { "border-collapse": "collapse", width: "100%" },
          pagebreak_separator: "<!-- pagebreak -->",
          body_class: "corpo",
          branding: false,
          promotion: false,
          resize: false,
          autoresize_bottom_margin: 40,
          content_style: estiloDaFolha(),
          setup: (editor: any) => {
            editor.ui.registry.addButton("recuoPrimeiraLinha", {
              text: "Recuo ¶",
              tooltip: `Recuo de primeira linha (${RECUO_PRIMEIRA_LINHA.replace(".", ",")}) — liga/desliga nos parágrafos selecionados`,
              onAction: () => {
                const blocos: HTMLElement[] = editor.selection.getSelectedBlocks().filter((b: HTMLElement) => b.nodeName === "P");
                if (!blocos.length) return;
                const ligar = blocos.some((b) => b.style.textIndent !== RECUO_PRIMEIRA_LINHA);
                editor.undoManager.transact(() => {
                  blocos.forEach((b) => editor.dom.setStyle(b, "text-indent", ligar ? RECUO_PRIMEIRA_LINHA : null));
                });
              },
            });
            // setContent (ex.: trocar de modelo) apaga o body inteiro: recolocamos a moldura.
            editor.on("SetContent NodeChange", () => garantirMoldura(editor, aberturaRef.current));
          },
        }}
      />
    </div>
  );
});

export default OficioEditor;

/** Cria/atualiza cabeçalho, abertura e rodapé dentro da folha, como nós que o TinyMCE ignora ao salvar. */
function garantirMoldura(editor: any, aberturaHtml: string) {
  const doc: Document | undefined = editor.getDoc?.();
  if (!doc?.body) return;
  const body = doc.body;

  const criar = (id: string) => {
    const el = doc.createElement("div");
    el.id = id;
    el.setAttribute("contenteditable", "false");
    el.setAttribute("data-mce-bogus", "all");
    el.setAttribute("data-oficio-chrome", "1");
    return el;
  };

  let cab = doc.getElementById(ID_CAB);
  if (!cab) {
    cab = criar(ID_CAB);
    cab.innerHTML = `<img src="${CABECALHO_IMG}" alt="" />`;
    body.insertBefore(cab, body.firstChild);
  }

  let abertura = doc.getElementById(ID_ABERTURA);
  if (!abertura) {
    abertura = criar(ID_ABERTURA);
    cab.after(abertura);
  }
  if (abertura.previousSibling !== cab) cab.after(abertura);
  if (abertura.innerHTML !== aberturaHtml) abertura.innerHTML = aberturaHtml;

  let rod = doc.getElementById(ID_ROD);
  if (!rod) {
    rod = criar(ID_ROD);
    rod.textContent = RODAPE_TEXTO;
  }
  if (body.lastChild !== rod) body.appendChild(rod);
}

function estiloDaFolha() {
  return `
    html { background: #525659; }
    body {
      font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5; color: #000;
      width: ${PAGINA.largura}px; min-height: ${PAGINA.altura}px; margin: 20px auto; box-sizing: border-box;
      position: relative; box-shadow: 0 4px 20px rgba(0,0,0,.4);
      padding: ${PAGINA.cabecalho}px ${PAGINA.margemDir}px ${PAGINA.rodape}px ${PAGINA.margemEsq}px;
      background-color: #fff;
      /* linha vermelha = fim de cada página (aproximado, no mesmo ritmo da impressão) */
      background-image: linear-gradient(to bottom, transparent calc(100% - 1px), rgba(229,57,53,.55) calc(100% - 1px));
      background-size: 100% ${ALTURA_UTIL}px;
      background-position: 0 ${PAGINA.cabecalho}px;
      background-repeat: repeat-y;
    }
    #${ID_CAB}, #${ID_ROD} {
      position: absolute; left: 0; right: 0; background: #fff; display: flex; align-items: center; justify-content: center;
      pointer-events: none; user-select: none;
    }
    #${ID_CAB} { top: 0; height: ${PAGINA.cabecalho}px; padding: 12px ${PAGINA.margemDir}px 8px ${PAGINA.margemEsq}px; border-bottom: 1px solid #ddd; }
    #${ID_CAB} img { max-width: 100%; max-height: 100%; object-fit: contain; }
    #${ID_ROD} { bottom: 0; height: ${PAGINA.rodape}px; padding: 0 ${PAGINA.margemDir}px 0 ${PAGINA.margemEsq}px; font-size: 8pt; color: #555; text-align: center; border-top: 1px solid #ddd; }
    #${ID_ABERTURA} { user-select: none; cursor: default; }
    ${CSS_TEXTO}
  `;
}
