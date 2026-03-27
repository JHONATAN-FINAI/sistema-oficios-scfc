"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const CABECALHO_URL =
  "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";

// A4 em pixels a 96dpi
const PAGE_W = 794;
const PAGE_H = 1123;
// Margens em px (3cm esq, 2cm dir, 2cm sup, 2cm inf)
const M_TOP = 76;
const M_BOTTOM = 76;
const M_LEFT = 114;
const M_RIGHT = 76;
const HEADER_H = 160;
const FOOTER_H = 32;
// Altura útil de conteúdo por página
const CONTENT_H = PAGE_H - M_TOP - M_BOTTOM - HEADER_H - FOOTER_H;

interface Template { id: number; nome: string; conteudo: string; usaClassificacao: boolean; }
interface Destinatario { id: number; codigo: string; nome: string; endereco: string | null; cidade: string | null; responsavel: string | null; cargo: string | null; }
interface Classificacao { reduzido: string; funcional: string; fonte: string; naturezaDespesa: string; elemento: string; subelemento: string; }

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
  const conteudoAtualRef = useRef("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") inicializar();
  }, [status]);

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
        const c = oficio.conteudo || "";
        setConteudoInicial(c);
        conteudoAtualRef.current = c;
        const template = tData.find((t: Template) => t.id === oficio.templateId);
        if (template) setUsaClassificacao(template.usaClassificacao);
      }
    }
    setCarregando(false);
  }

  // Injeta conteúdo no editor após render
  useEffect(() => {
    if (!carregando && editorRef.current && conteudoInicial) {
      editorRef.current.innerHTML = conteudoInicial;
      conteudoAtualRef.current = conteudoInicial;
    }
  }, [carregando, conteudoInicial]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === Number(id));
    if (!template) return;
    setUsaClassificacao(template.usaClassificacao);
    if (!template.usaClassificacao) { setClassificacao(null); setReduzido(""); }
    if (template.conteudo && editorRef.current) {
      editorRef.current.innerHTML = template.conteudo;
      conteudoAtualRef.current = template.conteudo;
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

  async function salvar(status_oficio: string, gerarPdf = false) {
    if (!assunto.trim()) { alert("Informe o assunto."); return; }
    const conteudo = editorRef.current?.innerHTML || "";
    if (!conteudo.trim()) { alert("O conteúdo está vazio."); return; }
    setSalvando(true);
    try {
      const payload = { templateId: templateId ? Number(templateId) : null, destinatarioId: destinatarioId ? Number(destinatarioId) : null, assunto, conteudo, reduzido: reduzido || null, classificacao: classificacao || null, valorEstimado: valorEstimado || null, status: status_oficio };
      let res;
      if (modoEdicao && oficioId) {
        res = await fetch(`/api/oficios/${oficioId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch("/api/oficios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (gerarPdf) await executarGeracaoPdf(data.id || oficioId);
      else router.push("/oficios/historico");
    } catch { alert("Erro ao salvar."); }
    finally { setSalvando(false); }
  }

  async function executarGeracaoPdf(id: number | null) {
    if (!id) return;
    setGerando(true);
    try {
      const elemento = document.getElementById("area-impressao");
      if (!elemento) return;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const canvas = await html2canvas(elemento, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#fff",
        width: PAGE_W, windowWidth: PAGE_W,
      });

      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = pdfW / imgW;
      const pageHpx = pdfH / ratio;

      let posY = 0;
      let page = 0;
      while (posY < imgH) {
        if (page > 0) pdf.addPage();
        const slice = document.createElement("canvas");
        slice.width = imgW;
        slice.height = Math.min(pageHpx, imgH - posY);
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, -posY);
        pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pdfW, slice.height * ratio);
        posY += pageHpx;
        page++;
      }

      const num = (modoEdicao ? numeroOficio : proximoNumero).replace(/\//g, "-");
      pdf.save(`Oficio_${num}.pdf`);
    } finally { setGerando(false); }
  }

  function imprimir() {
    window.print();
  }

  if (status === "loading" || carregando) {
    return (
    <>
      <style>{`...`}</style>

      {/* Elementos fixos apenas para impressão */}
      <div id="cabecalho-fixo" style={{ display: "none" }}>
        <img src={CABECALHO_URL} alt="Cabeçalho" crossOrigin="anonymous" style={{ maxHeight: "130px", objectFit: "contain" }} />
      </div>
      <div id="rodape-fixo" style={{ display: "none" }}>
        Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
      </div>
  <img src={CABECALHO_URL} alt="Cabeçalho" crossOrigin="anonymous" style={{ maxHeight: "130px", objectFit: "contain" }} />
</div>
<div id="rodape-fixo" style={{ display: "none" }}>
  Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
</div>
    
      <div style={{ minHeight: "100vh", background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "Arial", color: "#666" }}>Carregando...</span>
      </div>
    );
  }

  const dest = destinatarios.find((d) => d.id === Number(destinatarioId));
  const numero = numeroOficio || proximoNumero;
  const dataHoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: white; }
    .no-print { display: none !important; }

    @page {
      size: A4 portrait;
      margin: 160px 76px 60px 114px;
    }

    #cabecalho-fixo {
      position: fixed;
      top: -140px;
      left: 0;
      right: 0;
      height: 140px;
      text-align: center;
    }

    #rodape-fixo {
      position: fixed;
      bottom: -50px;
      left: 0;
      right: 0;
      height: 40px;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      color: #555;
      text-align: center;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #area-impressao {
      width: 100% !important;
      box-shadow: none !important;
      background: white !important;
    }

    #cabecalho-documento { display: none !important; }
    #rodape-documento { display: none !important; }
  }

  @page { size: A4 portrait; }

  #editor-conteudo:empty:before {
    content: 'Digite o conteúdo do ofício aqui...';
    color: #aaa;
    font-style: italic;
  }
  #editor-conteudo:focus { outline: none; }
  #editor-conteudo p { margin: 0 0 8px 0; text-align: justify; }
  #editor-conteudo table { border-collapse: collapse; width: 100%; }
  #editor-conteudo td { border: 1px solid #000; padding: 3px 8px; }
`}</style>

      <div style={{ minHeight: "100vh", background: "#E8EAED" }}>
        {/* Navbar */}
        <div className="no-print">
          <Navbar />
        </div>

        {/* Barra de ferramentas */}
        <div className="no-print" style={{ background: "#fff", borderBottom: "1px solid #DDE3EC", padding: "6px 24px", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
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

          <button onClick={imprimir} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}>Imprimir</button>
          <button onClick={() => salvar("rascunho")} disabled={salvando} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}>{salvando ? "Salvando..." : "Salvar Rascunho"}</button>
          <button onClick={() => salvar("emitido", true)} disabled={gerando || salvando} style={{ background: "linear-gradient(135deg, #0D3B7A, #1565C0)", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>{gerando ? "Gerando..." : "Baixar PDF"}</button>
        </div>

        {/* Layout principal */}
        <div style={{ display: "flex", gap: "0", maxWidth: "1300px", margin: "0 auto", padding: "24px 16px" }}>

          {/* Painel lateral */}
          <div className="no-print" style={{ width: "260px", flexShrink: 0, marginRight: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
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

          {/* Área do documento — estilo Google Docs */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div
              id="area-impressao"
              style={{
                width: `${PAGE_W}px`,
                background: "#fff",
                boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
                minHeight: `${PAGE_H}px`,
              }}
            >
              {/* Cabeçalho fixo */}
              <div style={{
                padding: `${M_TOP}px ${M_RIGHT}px 0 ${M_LEFT}px`,
                borderBottom: "1px solid #e0e0e0",
                paddingBottom: "12px",
                marginBottom: "8px",
              }}>
                <div style={{ textAlign: "center" }}>
                  <img src={CABECALHO_URL} alt="Cabeçalho" crossOrigin="anonymous" style={{ maxWidth: "100%", maxHeight: "130px", objectFit: "contain" }} />
                </div>
              </div>

              {/* Metadados do ofício */}
              <div style={{ padding: `0 ${M_RIGHT}px 0 ${M_LEFT}px`, fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: "1.5" }}>
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

                {assunto && (
                  <div style={{ marginBottom: "18px", fontWeight: "bold" }}>Assunto: {assunto}.</div>
                )}
              </div>

              {/* Área editável — conteúdo contínuo */}
              <div
                id="editor-conteudo"
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => { conteudoAtualRef.current = editorRef.current?.innerHTML || ""; }}
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
              <div style={{
                padding: `8px ${M_RIGHT}px 16px ${M_LEFT}px`,
                borderTop: "1px solid #ccc",
                fontSize: "8pt",
                color: "#555",
                textAlign: "center",
                fontFamily: "Arial, sans-serif",
              }}>
                Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
