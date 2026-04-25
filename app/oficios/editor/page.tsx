"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

const CABECALHO_URL =
  "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";

const M_LEFT = 114;
const M_RIGHT = 76;
const M_TOP = 76;
const M_BOTTOM = 76;
const PAGE_W = 794;

interface Template { id: number; nome: string; conteudo: string; usaClassificacao: boolean; }
interface Destinatario { id: number; codigo: string; nome: string; endereco: string | null; cidade: string | null; responsavel: string | null; cargo: string | null; }
interface Classificacao { reduzido: string; funcional: string; fonte: string; naturezaDespesa: string; elemento: string; subelemento: string; }

function montarHtmlImpressao(params: {
  numero: string;
  dataHoje: string;
  dest: Destinatario | undefined;
  assunto: string;
  conteudo: string;
}) {
  const { numero, dataHoje, dest, assunto, conteudo } = params;

  let destinatarioHtml = "";
  if (dest) {
    if (dest.responsavel) {
      destinatarioHtml += `<div>Ao Senhor</div><div><strong>${dest.responsavel}</strong></div>`;
      if (dest.cargo) destinatarioHtml += `<div>${dest.cargo}</div>`;
    }
    destinatarioHtml += `<div><strong>${dest.nome}</strong></div>`;
    if (dest.endereco) destinatarioHtml += `<div>${dest.endereco}${dest.cidade ? `, ${dest.cidade}` : ""}</div>`;
    destinatarioHtml = `<div class="destinatario">${destinatarioHtml}</div>`;
  }

  const assuntoHtml = assunto
    ? `<div class="assunto">Assunto: ${assunto}.</div>`
    : "";

  // Limpa marcadores do editor antes de imprimir
  const conteudoLimpo = conteudo
    .replace(/<div[^>]*class="page-marker"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class="mce-pagebreak"[^>]*>[\s\S]*?<\/div>/gi, "");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

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
    padding: 47mm 20mm 28mm 30mm;
  }

  #cabecalho {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 47mm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5mm 20mm 3mm 30mm;
    
    background: #fff;
  }
  #cabecalho img { max-height: 35mm; max-width: 100%; object-fit: contain; }

  #rodape {
    position: fixed;
    bottom: 0; left: 0; right: 0;
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
    <img src="${CABECALHO_URL}" crossorigin="anonymous" />
  </div>
  <div id="rodape">
    Prefeitura Municipal de Rondonópolis – MT &nbsp;|&nbsp; Av. Duque de Caxias, 1000 &nbsp;|&nbsp; CEP: 78.800-000 &nbsp;|&nbsp; (66) 3411-7000
  </div>
  <div class="numero-oficio">OFÍCIO Nº ${numero}</div>
  <div class="data-oficio">Rondonópolis, ${dataHoje}.</div>
  ${destinatarioHtml}
  ${assuntoHtml}
  <div class="corpo">${conteudoLimpo}</div>
</body>
</html>`;
}


export default function EditorPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editar");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [proximoNumero, setProximoNumero] = useState("");
  const [numeroOficio, setNumeroOficio] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [reduzido, setReduzido] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [usaClassificacao, setUsaClassificacao] = useState(false);
  const [classificacao, setClassificacao] = useState<Classificacao | null>(null);
  const [buscandoClassificacao, setBuscandoClassificacao] = useState(false);
  const [erroClassificacao, setErroClassificacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [oficioId, setOficioId] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [conteudoInicial, setConteudoInicial] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") inicializar();
  }, [status]);

  useEffect(() => {
    if (!carregando && editorRef.current) {
      editorRef.current.innerHTML = conteudoInicial;
    }
  }, [carregando, conteudoInicial]);

  async function inicializar() {
    setCarregando(true);
    const [tRes, dRes, nRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/destinatarios"),
      fetch("/api/oficios/proximo-numero"),
    ]);
    const [tData, dData, nData] = await Promise.all([tRes.json(), dRes.json(), nRes.json()]);
    setTemplates(tData);
    setDestinatarios(dData);
    setProximoNumero(nData.numero);

    if (editId) {
      const res = await fetch(`/api/oficios/${editId}`);
      if (res.ok) {
        const oficio = await res.json();
        setModoEdicao(true);
        setOficioId(oficio.id);
        setNumeroOficio(oficio.numero);
        setTemplateId(oficio.templateId?.toString() || "");
        setDestinatarioId(oficio.destinatarioId?.toString() || "");
        setAssunto(oficio.assunto);
        setReduzido(oficio.reduzido || "");
        setValorEstimado(oficio.valorEstimado || "");
        if (oficio.classificacao) setClassificacao(oficio.classificacao);
        setConteudoInicial(oficio.conteudo || "");
        const template = tData.find((t: Template) => t.id === oficio.templateId);
        if (template) setUsaClassificacao(template.usaClassificacao);
      }
    }
    setCarregando(false);
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === Number(id));
    if (!template) return;
    setUsaClassificacao(template.usaClassificacao);
    if (!template.usaClassificacao) { setClassificacao(null); setReduzido(""); }
    if (template.conteudo && editorRef.current) {
      editorRef.current.innerHTML = template.conteudo;
    }
  }

  function aplicarFormato(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }

  function aplicarRecuo() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && (node as HTMLElement).nodeName !== "P" && (node as HTMLElement).nodeName !== "DIV") node = node.parentNode;
    if (node) { const el = node as HTMLElement; el.style.textIndent = el.style.textIndent === "2.5cm" ? "0" : "2.5cm"; }
  }

  async function buscarClassificacao() {
    if (!reduzido.trim()) { setErroClassificacao("Informe o número do reduzido."); return; }
    setBuscandoClassificacao(true);
    setErroClassificacao("");
    setClassificacao(null);
    try {
      const res = await fetch(`/api/classificacao/${reduzido.trim()}`);
      if (!res.ok) setErroClassificacao("Reduzido não encontrado.");
      else setClassificacao(await res.json());
    } catch { setErroClassificacao("Erro ao buscar."); }
    finally { setBuscandoClassificacao(false); }
  }

  function inserirQuadro() {
    if (!classificacao) { setErroClassificacao("Busque a classificação antes de inserir."); return; }
    const quadro = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:10pt;"><tbody><tr><td colspan="2" style="background:#e8e8e8;font-weight:bold;padding:5px 8px;border:1px solid #000;text-align:center;">CLASSIFICAÇÃO ORÇAMENTÁRIA DA DESPESA</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;width:40%;font-weight:bold;">Órgão:</td><td style="border:1px solid #000;padding:3px 8px;">02 - Prefeitura Municipal de Rondonópolis</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Unidade:</td><td style="border:1px solid #000;padding:3px 8px;">15 - Secretaria Municipal de Administração</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Funcional Programática:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.funcional}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Elemento de Despesa:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.elemento}${classificacao.subelemento ? ` / ${classificacao.subelemento}` : ""}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Fonte:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.fonte}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Reduzido:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.reduzido}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Valor Estimado:</td><td style="border:1px solid #000;padding:3px 8px;">${valorEstimado || "_______________"}</td></tr><tr><td colspan="2" style="border:1px solid #000;padding:10px 8px;"><strong>ANÁLISE DA SECRETARIA DE FAZENDA EM:</strong> _____ / _____ / _______<br/><br/>&nbsp;&nbsp;&nbsp;□ DEFERIDO &nbsp;&nbsp; □ INDEFERIDO &nbsp;&nbsp; Nº RESERVA: _______________<br/><br/><div style="text-align:center;margin-top:8px;">________________________________________<br/>Secretaria Municipal de Fazenda</div></td></tr></tbody></table>`;
    document.execCommand("insertHTML", false, quadro);
    editorRef.current?.focus();
  }

  async function salvarOficio(statusOficio: string): Promise<number | null> {
    if (!assunto.trim()) { alert("Informe o assunto."); return null; }
    const conteudo = editorRef.current?.innerHTML || "";
    if (!conteudo.trim()) { alert("O conteúdo está vazio."); return null; }

    const payload = {
      templateId: templateId ? Number(templateId) : null,
      destinatarioId: destinatarioId ? Number(destinatarioId) : null,
      assunto, conteudo,
      reduzido: reduzido || null,
      classificacao: classificacao || null,
      valorEstimado: valorEstimado || null,
      status: statusOficio,
    };

    let res;
    if (modoEdicao && oficioId) {
      res = await fetch(`/api/oficios/${oficioId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/oficios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }

    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.id || oficioId;
  }

  async function salvarRascunho() {
    setSalvando(true);
    try {
      await salvarOficio("rascunho");
      router.push("/oficios/historico");
    } catch { alert("Erro ao salvar."); }
    finally { setSalvando(false); }
  }

  async function gerarPdf() {
    setGerando(true);
    try {
      await salvarOficio("emitido");

      const conteudo = editorRef.current?.innerHTML || "";
      const dest = destinatarios.find((d) => d.id === Number(destinatarioId));
      const numero = numeroOficio || proximoNumero;
      const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

      const html = montarHtmlImpressao({ numero, dataHoje, dest, assunto, conteudo });

      const janela = window.open("", "_blank", "width=900,height=700");
      if (!janela) {
        alert("Permita pop-ups para este site e tente novamente.");
        return;
      }
      janela.document.open();
      janela.document.write(html);
      janela.document.close();

      janela.onload = () => {
        const img = janela.document.querySelector("img");
        const imprimir = () => setTimeout(() => janela.print(), 300);
        if (img && !img.complete) {
          img.onload = imprimir;
          img.onerror = imprimir;
        } else {
          imprimir();
        }
      };
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF.");
    } finally { setGerando(false); }
  }

  if (status === "loading" || carregando) {
    return (
      <div style={{ minHeight: "100vh", background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "Arial", color: "#666" }}>Carregando...</span>
      </div>
    );
  }

  const dest = destinatarios.find((d) => d.id === Number(destinatarioId));
  const numero = numeroOficio || proximoNumero;
  const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#E8EAED" }}>
      <style>{`
        #editor-conteudo { outline: none; }
        #editor-conteudo p { margin: 0 0 8px 0; }
        #editor-conteudo table { border-collapse: collapse; width: 100%; }
        #editor-conteudo td { border: 1px solid #000; padding: 3px 8px; }
      `}</style>

      <Navbar />

      {/* Barra de ferramentas */}
      <div style={{ background: "#fff", borderBottom: "1px solid #DDE3EC", padding: "6px 24px", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#0D3B7A", fontFamily: "Arial, sans-serif", marginRight: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {numero}
        </span>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("bold"); }} style={{ fontWeight: "700", background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 10px", fontSize: "13px", cursor: "pointer" }}>B</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("italic"); }} style={{ fontStyle: "italic", background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 10px", fontSize: "13px", cursor: "pointer" }}>I</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("underline"); }} style={{ textDecoration: "underline", background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 10px", fontSize: "13px", cursor: "pointer" }}>U</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarRecuo(); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 10px", fontSize: "11px", cursor: "pointer", color: "#444" }}>Recuo ¶</button>
        <div style={{ width: "1px", height: "20px", background: "#DDE3EC", margin: "0 2px" }} />
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyLeft"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", cursor: "pointer", color: "#444" }}>Esq</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyCenter"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", cursor: "pointer", color: "#444" }}>Cen</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyRight"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", cursor: "pointer", color: "#444" }}>Dir</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyFull"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", cursor: "pointer", color: "#444" }}>Just</button>
        <div style={{ width: "1px", height: "20px", background: "#DDE3EC", margin: "0 2px" }} />
        <select onChange={(e) => aplicarFormato("fontSize", e.target.value)} style={{ border: "1px solid #DDE3EC", borderRadius: "4px", padding: "3px 6px", fontSize: "12px", outline: "none" }}>
          <option value="">Tam</option>
          <option value="2">10</option>
          <option value="3">12</option>
          <option value="4">14</option>
          <option value="5">18</option>
          <option value="6">24</option>
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={salvarRascunho} disabled={salvando} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}>{salvando ? "Salvando..." : "Salvar Rascunho"}</button>
        <button onClick={gerarPdf} disabled={gerando || salvando} style={{ background: "linear-gradient(135deg, #0D3B7A, #1565C0)", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>{gerando ? "Gerando PDF..." : "Baixar PDF"}</button>
      </div>

      {/* Layout */}
      <div style={{ display: "flex", maxWidth: "1300px", margin: "0 auto", padding: "24px 16px" }}>

        {/* Painel lateral */}
        <div style={{ width: "260px", flexShrink: 0, marginRight: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #DDE3EC", padding: "14px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#0D3B7A", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Configurações</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#555", fontFamily: "Arial, sans-serif", marginBottom: "3px" }}>Modelo</label>
                <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", outline: "none" }}>
                  <option value="">-- Selecione --</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#555", fontFamily: "Arial, sans-serif", marginBottom: "3px" }}>Destinatário</label>
                <select value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)} style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", outline: "none" }}>
                  <option value="">-- Selecione --</option>
                  {destinatarios.map((d) => <option key={d.id} value={d.id}>{d.codigo} - {d.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#555", fontFamily: "Arial, sans-serif", marginBottom: "3px" }}>Assunto *</label>
                <input type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto do ofício" style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          {usaClassificacao && (
            <div style={{ background: "#EBF5FF", borderRadius: "8px", border: "1px solid #BBDEFB", padding: "14px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#0D3B7A", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Classificação Orçamentária</h3>
              <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                <input type="text" value={reduzido} onChange={(e) => { setReduzido(e.target.value); setErroClassificacao(""); setClassificacao(null); }} onKeyDown={(e) => e.key === "Enter" && buscarClassificacao()} placeholder="Nº Reduzido" style={{ flex: 1, border: "1.5px solid #90CAF9", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", outline: "none" }} />
                <button onClick={buscarClassificacao} disabled={buscandoClassificacao} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" }}>{buscandoClassificacao ? "..." : "Buscar"}</button>
              </div>
              {erroClassificacao && <p style={{ fontSize: "11px", color: "#C62828", margin: "0 0 6px" }}>{erroClassificacao}</p>}
              {classificacao && (
                <>
                  <div style={{ background: "#fff", borderRadius: "6px", padding: "8px", fontSize: "11px", marginBottom: "6px", lineHeight: "1.6" }}>
                    <div><strong>Funcional:</strong> {classificacao.funcional}</div>
                    <div><strong>Elemento:</strong> {classificacao.elemento}/{classificacao.subelemento}</div>
                    <div><strong>Fonte:</strong> {classificacao.fonte}</div>
                    <div><strong>Natureza:</strong> {classificacao.naturezaDespesa}</div>
                  </div>
                  <input type="text" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} placeholder="Valor estimado" style={{ width: "100%", border: "1.5px solid #90CAF9", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", outline: "none", boxSizing: "border-box", marginBottom: "6px" }} />
                  <button onClick={inserirQuadro} style={{ width: "100%", background: "#2E7D32", color: "#fff", border: "none", borderRadius: "6px", padding: "7px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>↓ Inserir Quadro</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Documento */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ width: `${PAGE_W}px`, background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.18)", minHeight: "1123px" }}>

            {/* Cabeçalho */}
            <div style={{ padding: `${M_TOP}px ${M_RIGHT}px 12px ${M_LEFT}px`, borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ textAlign: "center" }}>
                <img src={CABECALHO_URL} alt="Cabeçalho" crossOrigin="anonymous" style={{ maxWidth: "100%", maxHeight: "130px", objectFit: "contain" }} />
              </div>
            </div>

            {/* Metadados */}
            <div style={{ padding: `16px ${M_RIGHT}px 0 ${M_LEFT}px`, fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: "1.5" }}>
              <div style={{ fontWeight: "bold", marginBottom: "10px" }}>OFÍCIO Nº {numero}</div>
              <div style={{ textAlign: "right", marginBottom: "14px" }}>Rondonópolis, {dataHoje}.</div>
              {dest && (
                <div style={{ marginBottom: "14px", lineHeight: "1.6" }}>
                  {dest.responsavel ? (
                    <>
                      <div>Ao Senhor</div>
                      <div><strong>{dest.responsavel}</strong></div>
                      {dest.cargo && <div>{dest.cargo}</div>}
                    </>
                  ) : (
                    <div><strong>{dest.nome}</strong></div>
                  )}
                  {dest.endereco && <div>{dest.endereco}{dest.cidade ? `, ${dest.cidade}` : ""}</div>}
                </div>
              )}
              {assunto && <div style={{ marginBottom: "18px", fontWeight: "bold" }}>Assunto: {assunto}.</div>}
            </div>

            {/* Área editável */}
            <div
              id="editor-conteudo"
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              style={{
                padding: `0 ${M_RIGHT}px ${M_BOTTOM}px ${M_LEFT}px`,
                fontFamily: "Arial, sans-serif",
                fontSize: "12pt",
                lineHeight: "1.5",
                color: "#000",
                minHeight: "400px",
                outline: "none",
              }}
            />

            {/* Rodapé */}
            <div style={{ padding: `8px ${M_RIGHT}px 20px ${M_LEFT}px`, borderTop: "1px solid #ccc", fontSize: "8pt", color: "#555", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
              Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
