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
    const conteudoAtual = editorRef.current ? editorRef.current.getContent() : conteudo;
    const dest = destinatarios.find((d) => d.id === Number(destinatarioId));
    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const cabecalhoUrl = "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";
    const conteudoLimpo = conteudoAtual.replace(/<div[^>]*class="page-marker"[^>]*>.*?<\/div>/gi, "");

    let destHtml = "";
    if (dest) {
      const resNome = dest.responsavel || "";
      const resCargo = dest.cargo ? ` — ${dest.cargo}` : "";
      const responsavelText = resNome ? `<div><strong>Para:</strong> ${resNome}${resCargo}</div>` : "";
      
      const resEnd = dest.endereco || "";
      const resCid = dest.cidade ? `, ${dest.cidade}` : "";
      const enderecoText = resEnd ? `<div><strong>Endereço:</strong> ${resEnd}${resCid}</div>` : "";

      destHtml = `
        <div style="margin-bottom: 16px; line-height: 1.6;">
          ${responsavelText}
          <div><strong>Órgão:</strong> ${dest.nome}</div>
          ${enderecoText}
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Visualizar Impressão - Rascunho</title>
        <style>
          @media print {
            @page { size: A4 portrait; margin: 40mm 20mm 25mm 20mm; }
            body, .preview-page { display: block !important; margin: 0; padding: 0; background: white; font-size: 12pt; font-family: Arial, sans-serif; color: #000; }
            .preview-page { position: static !important; width: 100% !important; box-shadow: none !important; border: none !important; min-height: auto !important; }
            h1, h2, h3, h4, h5 { page-break-after: avoid; }
            p { text-align: justify; }
            .oficio-corpo table, .oficio-corpo figure { page-break-inside: avoid; }
            .print-header-fixed { position: fixed !important; top: -35mm; left: 0; width: 100%; display: block !important; }
            .print-footer-fixed { position: fixed !important; bottom: -20mm; left: 0; width: 100%; display: block !important; }
            .screen-header, .screen-footer { display: none !important; }
          }
          @media screen {
            body { background: #525659; display: flex; justify-content: center; padding: 20px; font-family: Arial, sans-serif; }
            .preview-page { background: white; width: 210mm; min-height: 297mm; padding: 35mm 20mm 25mm 20mm; box-shadow: 0 4px 8px rgba(0,0,0,0.5); position: relative; box-sizing: border-box; font-size: 12pt; line-height: 1.5; color: #000; }
            .screen-footer { position: absolute; bottom: 25mm; left: 20mm; right: 20mm; width: auto; font-size: 8pt; color: #555; text-align: center; border-top: 1px solid #999; padding-top: 4px; }
            .print-header-fixed, .print-footer-fixed { display: none !important; }
            p { text-align: justify; }
          }
          .cabecalho-img { width: 100%; max-height: 90px; object-fit: contain; object-position: center; }
        </style>
      </head>
      <body>
        <div class="preview-page">
          <div class="screen-header" style="text-align: center; width: 100%; padding-bottom: 16px;">
            <img src="${cabecalhoUrl}" class="cabecalho-img" crossorigin="anonymous" />
          </div>
          <div class="print-header-fixed" style="text-align: center; width: 100%;">
            <img src="${cabecalhoUrl}" class="cabecalho-img" crossorigin="anonymous" />
          </div>
          
          <div class="oficio-corpo">
            <div style="font-weight: bold; margin-bottom: 16px;">
              OFÍCIO: ${proximoNumero}
            </div>
            <div style="margin-bottom: 16px; text-align: right;">
              Rondonópolis, ${dataAtual}
            </div>
            ${destHtml}
            <div style="margin-bottom: 24px;">
              <strong>Assunto:</strong> ${assunto}
            </div>
            <div style="text-align: justify;">
              ${conteudoLimpo}
            </div>
          </div>
          
          <div class="screen-footer">
            Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
          </div>
          <div class="print-footer-fixed" style="font-size: 8pt; color: #555; text-align: center; border-top: 1px solid #999; padding-top: 4px;">
            Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const janela = window.open("", "_blank");
    if (janela) {
      janela.document.write(html);
      janela.document.close();
    }
  }

  async function salvar(gerarPdf = false) {
    if (!assunto.trim()) { alert("Informe o assunto do ofício."); return; }
    const conteudoAtual = editorRef.current ? editorRef.current.getContent() : conteudo;
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
                  if (conteudo) editor.setContent(conteudo);
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
                    body {
                      font-family: Arial, sans-serif;
                      font-size: 12pt;
                      line-height: 1.5;
                      color: #000;
                      background: #c8c8c8;
                      margin: 0;
                      padding: 0;
                    }
                    .page {
                      background: white;
                      width: 754px;
                      min-height: 1063px;
                      margin: 20px auto;
                      padding: 60px 60px 80px 80px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                      box-sizing: border-box;
                    }
                    p { margin: 0 0 8px 0; text-align: justify; }
                    table { border-collapse: collapse; width: 100%; font-size: 11pt; }
                    table, th, td { border: 1px solid black; }
                    th, td { padding: 5px; }
                  `,
                  branding: false,
                  promotion: false,
                  forced_root_block: "p",
                  body_class: "page",
                  min_height: 900,
                  autoresize_bottom_margin: 50,
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
                      const alturaUtil = 973;

                      function atualizarMarcadores() {
                        doc.querySelectorAll(".page-marker").forEach((el: Element) => el.remove());
                        const bodyHeight = body.scrollHeight;
                        let pagina = 1;
                        while (pagina * alturaUtil < bodyHeight) {
                          const marker = doc.createElement("div");
                          marker.className = "page-marker";
                          marker.setAttribute("contenteditable", "false");
                          marker.style.cssText = "position:absolute;left:-80px;right:-60px;top:" + (pagina * alturaUtil) + "px;height:20px;background:#b0b0b0;border-top:2px solid #e53935;border-bottom:2px solid #e53935;display:flex;align-items:center;justify-content:center;font-size:9px;color:#333;letter-spacing:1px;pointer-events:none;z-index:9999;font-family:Arial,sans-serif;";
                          marker.innerHTML = "── Página " + (pagina + 1) + " ──";
                          body.style.position = "relative";
                          body.appendChild(marker);
                          pagina++;
                        }
                      }

                      editor.on("input keyup", atualizarMarcadores);
                      editor.on("SetContent", atualizarMarcadores);
                      setTimeout(atualizarMarcadores, 800);
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