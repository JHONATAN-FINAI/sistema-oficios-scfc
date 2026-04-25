"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Editor } from "@tinymce/tinymce-react";
import Navbar from "@/components/Navbar";

interface Template {
  id: number;
  nome: string;
  conteudo: string;
  usaClassificacao: boolean;
}

interface Destinatario {
  id: number;
  codigo: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  responsavel: string | null;
  cargo: string | null;
}

interface Classificacao {
  reduzido: string;
  funcional: string;
  fonte: string;
  naturezaDespesa: string;
  elemento: string;
  subelemento: string;
}

export default function NovoOficioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editar");
  const conteudoParaEditor = useRef<string>("");
  const editorRef = useRef<any>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [proximoNumero, setProximoNumero] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [reduzido, setReduzido] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [usaClassificacao, setUsaClassificacao] = useState(false);
  const [classificacao, setClassificacao] = useState<Classificacao | null>(null);
  const [buscandoClassificacao, setBuscandoClassificacao] = useState(false);
  const [erroClassificacao, setErroClassificacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [oficioId, setOficioId] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (editId && templates.length > 0) {
      carregarOficioParaEdicao(Number(editId));
    }
  }, [editId, templates]);

  async function carregarDados() {
    const [tRes, dRes, nRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/destinatarios"),
      fetch("/api/oficios/proximo-numero"),
    ]);
    const [tData, dData, nData] = await Promise.all([
      tRes.json(),
      dRes.json(),
      nRes.json(),
    ]);
    setTemplates(tData);
    setDestinatarios(dData);
    setProximoNumero(nData.numero);
  }

  async function carregarOficioParaEdicao(id: number) {
    const res = await fetch(`/api/oficios/${id}`);
    if (!res.ok) return;
    const oficio = await res.json();
    setModoEdicao(true);
    setOficioId(id);
    setTemplateId(oficio.templateId?.toString() || "");
    setDestinatarioId(oficio.destinatarioId?.toString() || "");
    setAssunto(oficio.assunto);
    setReduzido(oficio.reduzido || "");
    setValorEstimado(oficio.valorEstimado || "");
    setConteudo(oficio.conteudo);
    conteudoParaEditor.current = oficio.conteudo;
    // Se o editor já estiver montado, injeta imediatamente
    if (editorRef.current) {
      editorRef.current.setContent(oficio.conteudo);
    }
    if (oficio.classificacao) setClassificacao(oficio.classificacao);
    const template = templates.find((t) => t.id === oficio.templateId);
    if (template) setUsaClassificacao(template.usaClassificacao);
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === Number(id));
    if (!template) return;
    setUsaClassificacao(template.usaClassificacao);
    if (editorRef.current && template.conteudo) {
      editorRef.current.setContent(template.conteudo);
      setConteudo(template.conteudo);
    }
    if (!template.usaClassificacao) {
      setClassificacao(null);
      setReduzido("");
    }
  }

  async function buscarClassificacao() {
    if (!reduzido.trim()) { setErroClassificacao("Informe o número do reduzido."); return; }
    setBuscandoClassificacao(true);
    setErroClassificacao("");
    setClassificacao(null);
    try {
      const res = await fetch(`/api/classificacao/${reduzido.trim()}`);
      if (!res.ok) { setErroClassificacao("Reduzido não encontrado."); }
      else { setClassificacao(await res.json()); }
    } catch { setErroClassificacao("Erro ao buscar classificação."); }
    finally { setBuscandoClassificacao(false); }
  }

  function montarQuadroHTML(c: Classificacao, valor: string): string {
    return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:11pt;"><tbody><tr><td colspan="2" style="background:#e8e8e8;font-weight:bold;padding:6px 8px;border:1px solid #000;text-align:center;">CLASSIFICAÇÃO ORÇAMENTÁRIA DA DESPESA</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Órgão:</td><td style="border:1px solid #000;padding:4px 8px;">02 - Prefeitura Municipal de Rondonópolis</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Unidade:</td><td style="border:1px solid #000;padding:4px 8px;">15 - Secretaria Municipal de Administração</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Funcional Programática:</td><td style="border:1px solid #000;padding:4px 8px;">${c.funcional}</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Elemento de Despesa:</td><td style="border:1px solid #000;padding:4px 8px;">${c.elemento}${c.subelemento ? ` / ${c.subelemento}` : ""}</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Fonte:</td><td style="border:1px solid #000;padding:4px 8px;">${c.fonte}</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Reduzido:</td><td style="border:1px solid #000;padding:4px 8px;">${c.reduzido}</td></tr><tr><td style="border:1px solid #000;padding:4px 8px;font-weight:bold;">Valor Estimado:</td><td style="border:1px solid #000;padding:4px 8px;">${valor || "_______________"}</td></tr><tr><td colspan="2" style="border:1px solid #000;padding:12px 8px;"><strong>ANÁLISE DA SECRETARIA DE FAZENDA EM:</strong> _____ / _____ / _______<br/><br/>&nbsp;&nbsp;&nbsp;&nbsp;□ DEFERIDO &nbsp;&nbsp;&nbsp;&nbsp; □ INDEFERIDO &nbsp;&nbsp;&nbsp;&nbsp; Nº RESERVA: _______________<br/><br/><div style="text-align:center;margin-top:8px;">________________________________________<br/>Secretaria Municipal de Fazenda</div></td></tr></tbody></table>`;
  }

  function inserirQuadroNoEditor() {
    if (!classificacao) { setErroClassificacao("Busque a classificação antes de inserir."); return; }
    if (!editorRef.current) return;
    editorRef.current.insertContent(montarQuadroHTML(classificacao, valorEstimado));
  }

  function visualizarImpressao() {
    // Remove marcadores via DOM antes de extrair o conteúdo — mais confiável que regex
    let conteudoAtual = "";
    if (editorRef.current) {
      const doc = editorRef.current.getDoc();
      doc.querySelectorAll(".page-marker, .pg-header").forEach((el: Element) => el.remove());
      conteudoAtual = editorRef.current.getContent();
      setTimeout(() => { editorRef.current?.fire("SetContent"); }, 100);
    } else {
      conteudoAtual = conteudo;
    }
    // Segurança extra: remove qualquer rastro via regex
    const conteudoLimpo = conteudoAtual
      .replace(/<div[^>]*class="page-marker"[^>]*>[\s\S]*?<\/div>\s*/gi, "")
      .replace(/<div[^>]*class="pg-header"[^>]*>[\s\S]*?<\/div>\s*/gi, "")
      .replace(/<div[^>]*class="mce-pagebreak"[^>]*>[\s\S]*?<\/div>\s*/gi, "");

    const dest = destinatarios.find((d) => d.id === Number(destinatarioId));
    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const cabecalhoUrl = "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";

    let destinatarioHtml = "";
    if (dest) {
      if (dest.responsavel) {
        destinatarioHtml += `<div>Ao Senhor</div>`;
        destinatarioHtml += `<div><strong>${dest.responsavel}</strong></div>`;
        if (dest.cargo) destinatarioHtml += `<div>${dest.cargo}</div>`;
      }
      destinatarioHtml += `<div><strong>${dest.nome}</strong></div>`;
      if (dest.endereco) {
        destinatarioHtml += `<div>${dest.endereco}${dest.cidade ? `, ${dest.cidade}` : ""}</div>`;
      }
    }

    const numeroExibir = modoEdicao ? (proximoNumero || "RASCUNHO") : proximoNumero;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ofício ${numeroExibir}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /*
     * SOLUÇÃO CHROME: @page margin:0 + body padding + position:fixed top:0/bottom:0
     * 
     * Com @page margin:0, a página física vai de (0,0) até (210mm,297mm).
     * position:fixed com top:0 ancora no topo físico da página → aparece em todas as páginas.
     * position:fixed com bottom:0 ancora no rodapé físico → aparece em todas as páginas.
     * body padding reserva o espaço para o conteúdo não ficar sob cabeçalho/rodapé.
     */
    @page { size: A4 portrait; margin: 0; }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      /* padding reserva espaço: topo=cabeçalho(47mm), baixo=rodapé(22mm), lados */
      padding: 47mm 20mm 45mm 30mm;
    }

    /* Cabeçalho — fixo no TOPO físico de cada página */
    #cabecalho {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 47mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5mm 20mm 3mm 30mm;
      
      background: #fff;
    }
    #cabecalho img { max-height: 35mm; max-width: 100%; object-fit: contain; }

    /* Rodapé — fixo no FUNDO físico de cada página */
    #rodape {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 28mm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #555;
      
      padding: 0 20mm 0 30mm;
      background: #fff;
    }

    .numero-oficio { font-weight: bold; margin-bottom: 12px; }
    .data-oficio { text-align: right; margin-bottom: 18px; }
    .destinatario { margin-bottom: 18px; line-height: 1.7; }
    .assunto { font-weight: bold; margin-bottom: 20px; }
    .corpo { text-align: justify; }
    .corpo p { margin: 0 0 8px 0; text-align: justify; page-break-inside: avoid; orphans: 3; widows: 3; }
    .corpo table { page-break-inside: avoid; }
    .corpo br { display: block; margin-bottom: 6px; }
    .corpo table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
    .corpo td, .corpo th { border: 1px solid #000; padding: 4px 8px; }
    .corpo h1, .corpo h2, .corpo h3 { margin: 0 0 8px 0; }
  </style>
</head>
<body>

  <div id="cabecalho">
    <img src="${cabecalhoUrl}" crossorigin="anonymous" />
  </div>

  <div id="rodape">
    Prefeitura Municipal de Rondonópolis – MT &nbsp;|&nbsp; Av. Duque de Caxias, 1000 &nbsp;|&nbsp; CEP: 78.800-000 &nbsp;|&nbsp; (66) 3411-7000
  </div>

  <div class="numero-oficio">OFÍCIO Nº ${numeroExibir}</div>
  <div class="data-oficio">Rondonópolis, ${dataAtual}.</div>
  ${destinatarioHtml ? `<div class="destinatario">${destinatarioHtml}</div>` : ""}
  ${assunto ? `<div class="assunto">Assunto: ${assunto}.</div>` : ""}
  <div class="corpo">${conteudoLimpo}</div>

</body>
</html>`;

    const janela = window.open("", "_blank", "width=960,height=800");
    if (!janela) {
      alert("Permita pop-ups para este site e tente novamente.");
      return;
    }
    janela.document.open();
    janela.document.write(html);
    janela.document.close();

    janela.onload = () => {
      const img = janela.document.querySelector("img");
      const imprimir = () => setTimeout(() => janela.print(), 400);
      if (img && !img.complete) {
        img.onload = imprimir;
        img.onerror = imprimir;
      } else {
        imprimir();
      }
    };
  }

  async function salvar(gerarPdf = false) {
    if (!assunto.trim()) { alert("Informe o assunto do ofício."); return; }
    let conteudoAtual = "";
    if (editorRef.current) {
      const doc = editorRef.current.getDoc();
      doc.querySelectorAll(".page-marker, .pg-header").forEach((el: Element) => el.remove());
      conteudoAtual = editorRef.current.getContent();
      setTimeout(() => { editorRef.current?.fire("SetContent"); }, 100);
    } else {
      conteudoAtual = conteudo;
    }
    conteudoAtual = conteudoAtual
      .replace(/<div[^>]*class="page-marker"[^>]*>[\s\S]*?<\/div>\s*/gi, "")
      .replace(/<div[^>]*class="pg-header"[^>]*>[\s\S]*?<\/div>\s*/gi, "");
    if (!conteudoAtual.trim()) { alert("O conteúdo do ofício está vazio."); return; }
    setSalvando(true);
    try {
      const payload = {
        templateId: templateId ? Number(templateId) : null,
        destinatarioId: destinatarioId ? Number(destinatarioId) : null,
        assunto,
        conteudo: conteudoAtual,
        reduzido: reduzido || null,
        classificacao: classificacao || null,
        valorEstimado: valorEstimado || null,
        status: "rascunho",
      };
      let res;
      if (modoEdicao && oficioId) {
        res = await fetch(`/api/oficios/${oficioId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch("/api/oficios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw new Error("Erro ao salvar");
      const data = await res.json();
      if (gerarPdf) { router.push(`/oficios/pdf/${data.id}`); }
      else { router.push("/oficios/historico"); }
    } catch { alert("Erro ao salvar ofício."); }
    finally { setSalvando(false); }
  }

  if (status === "loading") return null;
  const destinatarioSelecionado = destinatarios.find((d) => d.id === Number(destinatarioId));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{modoEdicao ? "Editar Ofício" : "Novo Ofício"}</h1>
            <p className="text-sm text-gray-500 mt-1">{modoEdicao ? "Alterações salvas no mesmo número" : `Será criado: ${proximoNumero}`}</p>
          </div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Ofício</label>
              <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Selecione um modelo --</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinatário</label>
              <select value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Selecione o destinatário --</option>
                {destinatarios.map((d) => <option key={d.id} value={d.id}>{d.codigo} - {d.nome}</option>)}
              </select>
              {destinatarioSelecionado?.endereco && <p className="text-xs text-gray-400 mt-1">{destinatarioSelecionado.endereco}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto <span className="text-red-500">*</span></label>
            <input type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Descreva o assunto do ofício" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {usaClassificacao && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800">Classificação Orçamentária</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Reduzido</label>
                  <input type="text" value={reduzido} onChange={(e) => { setReduzido(e.target.value); setErroClassificacao(""); setClassificacao(null); }} onKeyDown={(e) => e.key === "Enter" && buscarClassificacao()} placeholder="Ex: 1234" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={buscarClassificacao} disabled={buscandoClassificacao} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">{buscandoClassificacao ? "Buscando..." : "Buscar"}</button>
              </div>
              {erroClassificacao && <p className="text-sm text-red-600">{erroClassificacao}</p>}
              {classificacao && (
                <div className="bg-white rounded border border-blue-200 p-3 space-y-1 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="font-medium text-gray-600">Funcional:</span> {classificacao.funcional}</div>
                    <div><span className="font-medium text-gray-600">Fonte:</span> {classificacao.fonte}</div>
                    <div><span className="font-medium text-gray-600">Elemento:</span> {classificacao.elemento}</div>
                    <div><span className="font-medium text-gray-600">Subelemento:</span> {classificacao.subelemento || "—"}</div>
                    <div className="col-span-2"><span className="font-medium text-gray-600">Natureza:</span> {classificacao.naturezaDespesa}</div>
                  </div>
                  <div className="mt-2 flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor Estimado</label>
                      <input type="text" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} placeholder="Ex: R$ 15.000,00" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={inserirQuadroNoEditor} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">Inserir Quadro no Ofício</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo do Ofício</label>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <Editor
                apiKey="vxdv4ca9oja0c9v2x277325dmvcju291qzd80ewa9l1j32xe"
                onInit={(evt, editor) => {
                  editorRef.current = editor;
                  // Usa o ref que sempre tem o valor mais atual (evita race condition)
                  const c = conteudoParaEditor.current || conteudo;
                  if (c && c !== "<p>Inicie digitando o conteúdo do ofício...</p>") {
                    editor.setContent(c);
                  }
                }}
                initialValue="<p>Inicie digitando o conteúdo do ofício...</p>"
                init={{
                  height: 900,
                  menubar: "file edit view insert format tools table help",
                  language: "pt-BR",
                  plugins: [
                    "advlist", "autolink", "lists", "link", "charmap", "preview", "searchreplace", "visualblocks",
                    "code", "fullscreen", "insertdatetime", "table", "help", "wordcount", "autoresize",
                    "pagebreak", "nonbreaking", "directionality"
                  ],
                  toolbar_mode: "sliding",
                  toolbar: [
                    "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | removeformat",
                    "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | recuoPrimeiraLinha | pagebreak fullscreen",
                    "table tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells"
                  ],
                  font_size_formats: "8pt 9pt 10pt 11pt 12pt 14pt 18pt 24pt 30pt 36pt 48pt 60pt 72pt 96pt",
                  font_family_formats: "Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; Times New Roman=times new roman,times,serif;",
                  table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells | tablecellprops tablecellbackgroundcolor tablecellbordercolor",
                  table_appearance_options: true,
                  table_advtab: true,
                  table_cell_advtab: true,
                  table_row_advtab: true,
                  table_column_resizing: "resizetable",
                  table_default_attributes: {
                    border: '1'
                  },
                  table_default_styles: {
                    'border-collapse': 'collapse',
                    'width': '100%'
                  },
                  content_style: `
                    /*
                     * Editor simula páginas A4 com área útil idêntica à impressão.
                     * Área útil: 775px de altura (205mm) x 605px de largura (160mm)
                     * = 297mm - 47mm(cab) - 45mm(rod) = 205mm
                     * = 210mm - 30mm(esq) - 20mm(dir) = 160mm
                     *
                     * O body tem padding: 178px top (cabeçalho) + 170px bottom (rodapé)
                     * para a 1ª página. Marcadores absolutos simulam cabeçalho/rodapé
                     * nas quebras de página seguintes.
                     */
                    html, body {
                      background: #525659 !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    body {
                      font-family: Arial, sans-serif;
                      font-size: 12pt;
                      line-height: 1.5;
                      color: #000;
                      /* Área útil da 1a página: entre padding-top e padding-bottom */
                      padding-top: 198px;   /* 47mm cab + 5mm folga */
                      padding-bottom: 195px; /* 45mm rod + 5mm folga */
                      padding-left: 113px;  /* 30mm */
                      padding-right: 76px;  /* 20mm */
                      width: 794px;
                      min-height: 1123px;
                      box-sizing: border-box;
                      position: relative;
                      /* Folha branca com sombra */
                      background-color: white !important;
                      box-shadow: 0 0 0 20px #525659, 4px 4px 16px rgba(0,0,0,0.4);
                    }
                    p { margin: 0 0 8px 0; text-align: justify; }
                    table { border-collapse: collapse; width: 100%; font-size: 11pt; }
                    table, th, td { border: 1px solid black; }
                    th, td { padding: 5px; }
                    /* Cabeçalho fixo da 1a página (topo do body) */
                    .pg-header {
                      position: absolute;
                      top: 0; left: 0; right: 0;
                      height: 190px;
                      background: #f9f9f9;
                      border-bottom: 2px solid #1565C0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      padding: 12px 76px 8px 113px;
                    }
                    .pg-header img { max-height: 140px; max-width: 100%; object-fit: contain; }
                    /* Separador + cab/rod de páginas seguintes (position:absolute) */
                    .page-marker {
                      position: absolute;
                      left: 0; right: 0;
                      pointer-events: none;
                      z-index: 9999;
                      background: transparent;
                    }
                    .page-marker .pm-rodape {
                      height: 185px;
                      background: #f9f9f9;
                      border-top: 2px solid #1565C0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 8pt;
                      color: #555;
                      font-family: Arial, sans-serif;
                      padding: 0 76px 0 113px;
                    }
                    .page-marker .pm-sep {
                      height: 28px;
                      background: #373b3e;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                    .page-marker .pm-sep span {
                      background: #e53935;
                      color: #fff;
                      font-size: 9px;
                      padding: 2px 12px;
                      border-radius: 3px;
                      font-family: Arial, sans-serif;
                    }
                    .page-marker .pm-cabecalho {
                      height: 190px;
                      background: #f9f9f9;
                      border-bottom: 2px solid #1565C0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      padding: 12px 76px 8px 113px;
                    }
                    .page-marker .pm-cabecalho img {
                      max-height: 140px; max-width: 100%; object-fit: contain;
                    }
                  `,
                  branding: false,
                  promotion: false,
                  forced_root_block: "p",
                  min_height: 900,
                  autoresize_bottom_margin: 80,
                  setup: (editor: any) => {
                    editor.ui.registry.addButton("recuoPrimeiraLinha", {
                      text: "Recuo ¶",
                      tooltip: "Recuo de primeira linha (2,5cm)",
                      onAction: () => {
                        const node = editor.selection.getNode();
                        const p = node.nodeName === "P" ? node : node.closest("p");
                        if (p) {
                          p.style.textIndent = p.style.textIndent === "2.5cm" ? "0" : "2.5cm";
                        }
                      },
                    });

                    editor.on("init", () => {
                      const doc = editor.getDoc();
                      const body = doc.body;

                      const CAB_URL = "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";
                      const ROD_TEXTO = "Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000";

                      // Insere o cabeçalho da 1ª página (fixo no topo do body)
                      function garantirCabecalhoPrimeiraPagina() {
                        if (!doc.querySelector(".pg-header")) {
                          const h = doc.createElement("div");
                          h.className = "pg-header";
                          h.setAttribute("contenteditable", "false");
                          h.innerHTML = '<img src="' + CAB_URL + '" />';
                          body.insertBefore(h, body.firstChild);
                        }
                      }

                      /*
                       * CÁLCULO DAS POSIÇÕES:
                       * Área útil por página = 775px (205mm a 96dpi)
                       * Bloco de separação (rodapé+sep+cabeçalho) = 185+28+190 = 403px
                       *
                       * O body tem:
                       *   padding-top: 198px  (cabeçalho 1ª pág = 190px + 8px folga)
                       *   padding-bottom: 195px (rodapé)
                       *
                       * 1ª quebra (top do marcador 1):
                       *   198 + 775 = 973px a partir do topo do body
                       *
                       * 2ª quebra (top do marcador 2):
                       *   198 + 775 + 403 + 775 = 2151px
                       *
                       * N-ésima quebra:
                       *   198 + N*(775 + 403) - 403    (simplificado)
                       *   = 198 + N*1178 - 403
                       *   Ou: top_N = PAD_TOP + N*AREA + (N-1)*BLOCO
                       */
                      const PAD_TOP = 198;
                      const AREA = 775;
                      const BLOCO = 403; // altura total do bloco rodapé+sep+cabeçalho

                      function atualizarMarcadores() {
                        doc.querySelectorAll(".page-marker").forEach((el: Element) => el.remove());
                        garantirCabecalhoPrimeiraPagina();

                        const bodyHeight = body.scrollHeight;
                        let n = 1;
                        while (true) {
                          const topMarcador = PAD_TOP + n * AREA + (n - 1) * BLOCO;
                          if (topMarcador >= bodyHeight + BLOCO) break;

                          const marker = doc.createElement("div");
                          marker.className = "page-marker";
                          marker.setAttribute("contenteditable", "false");
                          marker.style.top = topMarcador + "px";
                          marker.style.height = BLOCO + "px";

                          marker.innerHTML =
                            '<div class="pm-rodape">' + ROD_TEXTO + '</div>' +
                            '<div class="pm-sep"><span>Página ' + (n + 1) + '</span></div>' +
                            '<div class="pm-cabecalho"><img src="' + CAB_URL + '" /></div>';

                          body.appendChild(marker);
                          n++;
                        }
                      }

                      editor.on("input keyup Change NodeChange", atualizarMarcadores);
                      editor.on("SetContent", () => setTimeout(atualizarMarcadores, 300));
                      setTimeout(atualizarMarcadores, 600);
                    });
                  },
                }}
                onEditorChange={(content) => setConteudo(content)}
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <button onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
            <div className="flex gap-3">
              <button onClick={visualizarImpressao} type="button" className="px-5 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Visualizar Impressão</button>
              <button onClick={() => salvar(false)} disabled={salvando} className="px-5 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50">{salvando ? "Salvando..." : "Salvar Rascunho"}</button>
              <button onClick={() => salvar(true)} disabled={salvando} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{salvando ? "Salvando..." : "Salvar e Gerar PDF"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
