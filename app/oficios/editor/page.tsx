"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const CABECALHO_URL =
  "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const MARGIN_TOP = 76;
const MARGIN_BOTTOM = 76;
const MARGIN_LEFT = 114;
const MARGIN_RIGHT = 57;
const HEADER_HEIGHT = 190;
const FOOTER_HEIGHT = 30;

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
}
interface Classificacao {
  reduzido: string;
  funcional: string;
  fonte: string;
  naturezaDespesa: string;
  elemento: string;
  subelemento: string;
}

function Cabecalho() {
  return (
    <div style={{ width: "100%", height: `${HEADER_HEIGHT}px`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
      <img src={CABECALHO_URL} alt="Cabeçalho" crossOrigin="anonymous" style={{ maxWidth: "100%", maxHeight: `${HEADER_HEIGHT - 8}px`, objectFit: "contain" }} />
    </div>
  );
}

function Rodape() {
  return (
    <div style={{ width: "100%", height: `${FOOTER_HEIGHT}px`, borderTop: "1px solid #999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8pt", color: "#555", fontFamily: "Arial, sans-serif" }}>
      Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
    </div>
  );
}

function PaginaEditavel({ index, conteudoInicial, onChange }: { index: number; conteudoInicial: string; onChange: (index: number, html: string) => void; }) {
  const ref = useRef<HTMLDivElement>(null);
  const inicializado = useRef(false);

  useEffect(() => {
    if (ref.current && !inicializado.current) {
      ref.current.innerHTML = conteudoInicial;
      inicializado.current = true;
    }
  }, [conteudoInicial]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(index, (e.target as HTMLDivElement).innerHTML)}
      style={{ flex: 1, outline: "none", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: "1.5", color: "#000", textAlign: "justify", overflowY: "hidden", minHeight: "50px" }}
    />
  );
}

const estiloImpressao = `
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
    .barra-ferramentas, .painel-lateral, nav, .separador-pagina { display: none !important; }
    .area-paginas { all: unset !important; display: block !important; }
    .pagina-wrapper { display: block !important; }
    .pagina-a4 {
      width: 794px !important; height: 1123px !important; box-shadow: none !important;
      margin: 0 !important; padding: 76px 57px 76px 114px !important;
      page-break-after: always !important; box-sizing: border-box !important; overflow: hidden !important;
    }
    .pagina-a4:last-child { page-break-after: auto !important; }
  }
  @page { margin: 0 !important; size: A4 portrait; }
`;

export default function EditorPage() {
  const { status } = useSession();
  const router = useRouter();

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
  const [paginas, setPaginas] = useState<string[]>([""]);
  const paginaConteudoRefs = useRef<string[]>([""]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      carregarDados();
    }
  }, [status]);

  async function carregarDados() {
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

    const idParaEditar = new URLSearchParams(window.location.search).get("editar");
    if (idParaEditar) {
      await carregarOficioParaEdicao(Number(idParaEditar), tData);
    } else {
      setCarregando(false);
    }
  }

  async function carregarOficioParaEdicao(id: number, tData: Template[]) {
    const res = await fetch(`/api/oficios/${id}`);
    if (!res.ok) { setCarregando(false); return; }
    const oficio = await res.json();

    setModoEdicao(true);
    setOficioId(id);
    setNumeroOficio(oficio.numero);
    setTemplateId(oficio.templateId?.toString() || "");
    setDestinatarioId(oficio.destinatarioId?.toString() || "");
    setAssunto(oficio.assunto);
    setReduzido(oficio.reduzido || "");
    setValorEstimado(oficio.valorEstimado || "");
    if (oficio.classificacao) setClassificacao(oficio.classificacao);

    const conteudo = oficio.conteudo || "";
    setPaginas([conteudo]);
    paginaConteudoRefs.current = [conteudo];

    const template = tData.find((t: Template) => t.id === oficio.templateId);
    if (template) setUsaClassificacao(template.usaClassificacao);

    setCarregando(false);
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === Number(id));
    if (!template) return;
    setUsaClassificacao(template.usaClassificacao);
    if (template.conteudo) {
      setPaginas([template.conteudo]);
      paginaConteudoRefs.current = [template.conteudo];
    }
    if (!template.usaClassificacao) { setClassificacao(null); setReduzido(""); }
  }

  function handlePaginaChange(index: number, html: string) {
    paginaConteudoRefs.current[index] = html;
  }

  function getConteudoCompleto(): string {
    return paginaConteudoRefs.current.join("");
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
    } catch { setErroClassificacao("Erro ao buscar."); }
    finally { setBuscandoClassificacao(false); }
  }

  function inserirQuadro() {
    if (!classificacao) { setErroClassificacao("Busque a classificação antes de inserir."); return; }
    const quadro = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:10pt;"><tbody><tr><td colspan="2" style="background:#e8e8e8;font-weight:bold;padding:5px 8px;border:1px solid #000;text-align:center;">CLASSIFICAÇÃO ORÇAMENTÁRIA DA DESPESA</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;width:40%;font-weight:bold;">Órgão:</td><td style="border:1px solid #000;padding:3px 8px;">02 - Prefeitura Municipal de Rondonópolis</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Unidade:</td><td style="border:1px solid #000;padding:3px 8px;">15 - Secretaria Municipal de Administração</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Funcional Programática:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.funcional}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Elemento de Despesa:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.elemento}${classificacao.subelemento ? ` / ${classificacao.subelemento}` : ""}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Fonte:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.fonte}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Reduzido:</td><td style="border:1px solid #000;padding:3px 8px;">${classificacao.reduzido}</td></tr><tr><td style="border:1px solid #000;padding:3px 8px;font-weight:bold;">Valor Estimado:</td><td style="border:1px solid #000;padding:3px 8px;">${valorEstimado || "_______________"}</td></tr><tr><td colspan="2" style="border:1px solid #000;padding:10px 8px;"><strong>ANÁLISE DA SECRETARIA DE FAZENDA EM:</strong> _____ / _____ / _______<br/><br/>&nbsp;&nbsp;&nbsp;□ DEFERIDO &nbsp;&nbsp; □ INDEFERIDO &nbsp;&nbsp; Nº RESERVA: _______________<br/><br/><div style="text-align:center;margin-top:8px;">________________________________________<br/>Secretaria Municipal de Fazenda</div></td></tr></tbody></table>`;
    const ultimaIdx = paginas.length - 1;
    const novoConteudo = paginaConteudoRefs.current[ultimaIdx] + quadro;
    paginaConteudoRefs.current[ultimaIdx] = novoConteudo;
    const novasPaginas = [...paginas];
    novasPaginas[ultimaIdx] = novoConteudo;
    setPaginas(novasPaginas);
  }

  function aplicarFormato(comando: string, valor?: string) {
    document.execCommand(comando, false, valor);
  }

  function aplicarRecuo() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    while (node && (node as HTMLElement).nodeName !== "P" && (node as HTMLElement).nodeName !== "DIV") {
      node = node.parentNode;
    }
    if (node) {
      const el = node as HTMLElement;
      el.style.textIndent = el.style.textIndent === "2.5cm" ? "0" : "2.5cm";
    }
  }

  function imprimir() {
    const pagEls = Array.from(document.querySelectorAll(".pagina-a4")) as HTMLElement[];
    const paginasComConteudo = pagEls.filter((el) => {
      const editavel = el.querySelector("[contenteditable]") as HTMLElement;
      return !editavel || editavel.innerText.trim() !== "";
    });
    const htmlPaginas = paginasComConteudo.map((el) => el.outerHTML).join("");
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html, body { margin: 0; padding: 0; background: white; }
      @page { margin: 0; size: A4 portrait; }
      .pagina-a4 { width: 794px; height: 1123px; box-sizing: border-box; page-break-after: always; overflow: hidden; display: flex; flex-direction: column; padding: 76px 57px 76px 114px; }
      .pagina-a4:last-child { page-break-after: auto; }
    </style></head><body>${htmlPaginas}</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 500);
  }

  async function salvarRascunho() {
    if (!assunto.trim()) { alert("Informe o assunto."); return; }
    const conteudo = getConteudoCompleto();
    if (!conteudo.trim()) { alert("O conteúdo está vazio."); return; }
    setSalvando(true);
    try {
      const payload = { templateId: templateId ? Number(templateId) : null, destinatarioId: destinatarioId ? Number(destinatarioId) : null, assunto, conteudo, reduzido: reduzido || null, classificacao: classificacao || null, valorEstimado: valorEstimado || null, status: "rascunho" };
      let res;
      if (modoEdicao && oficioId) {
        res = await fetch(`/api/oficios/${oficioId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch("/api/oficios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw new Error();
      router.push("/oficios/historico");
    } catch { alert("Erro ao salvar."); }
    finally { setSalvando(false); }
  }

  async function gerarPdfDireto() {
    if (!assunto.trim()) { alert("Informe o assunto."); return; }
    setGerando(true);
    try {
      const conteudo = getConteudoCompleto();
      const payload = { templateId: templateId ? Number(templateId) : null, destinatarioId: destinatarioId ? Number(destinatarioId) : null, assunto, conteudo, reduzido: reduzido || null, classificacao: classificacao || null, valorEstimado: valorEstimado || null, status: "emitido" };
      let res;
      if (modoEdicao && oficioId) {
        res = await fetch(`/api/oficios/${oficioId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch("/api/oficios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw new Error();

      await new Promise((r) => setTimeout(r, 300));
      const pagEls = document.querySelectorAll(".pagina-a4");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pagEls.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pagEls[i] as HTMLElement, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#fff", width: PAGE_WIDTH, height: PAGE_HEIGHT, windowWidth: PAGE_WIDTH });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
      }

      const numeroFinal = (modoEdicao ? numeroOficio : proximoNumero).replace(/\//g, "-");
      pdf.save(`Oficio_${numeroFinal}.pdf`);
    } catch { alert("Erro ao gerar PDF."); }
    finally { setGerando(false); }
  }

  if (status === "loading" || carregando) {
    return (
      <div style={{ minHeight: "100vh", background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Arial, sans-serif", color: "#666", fontSize: "14px" }}>Carregando...</div>
      </div>
    );
  }

  const dest = destinatarios.find((d) => d.id === Number(destinatarioId));
  const numeroExibido = numeroOficio || proximoNumero;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8" }}>
      <style>{estiloImpressao}</style>
      <Navbar />

      <div className="barra-ferramentas" style={{ background: "#fff", borderBottom: "2px solid #E0E7EF", padding: "8px 24px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#0D3B7A", fontFamily: "Arial, sans-serif", marginRight: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {numeroExibido}
        </span>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("bold"); }} style={{ fontWeight: "700", background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 10px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>B</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("italic"); }} style={{ fontStyle: "italic", background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 10px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>I</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("underline"); }} style={{ textDecoration: "underline", background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 10px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>U</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarRecuo(); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", fontFamily: "Arial, sans-serif", color: "#444" }}>Recuo ¶</button>
        <div style={{ width: "1px", height: "24px", background: "#DDE3EC", margin: "0 4px" }} />
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyLeft"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif", color: "#444" }}>Esq</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyCenter"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif", color: "#444" }}>Cen</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyRight"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif", color: "#444" }}>Dir</button>
        <button onMouseDown={(e) => { e.preventDefault(); aplicarFormato("justifyFull"); }} style={{ background: "#F5F7FA", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif", color: "#444" }}>Just</button>
        <div style={{ width: "1px", height: "24px", background: "#DDE3EC", margin: "0 4px" }} />
        <select onChange={(e) => aplicarFormato("fontSize", e.target.value)} style={{ border: "1px solid #DDE3EC", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", fontFamily: "Arial, sans-serif", outline: "none" }}>
          <option value="">Tamanho</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "6px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Imprimir</button>
        <button onClick={salvarRascunho} disabled={salvando} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "6px 16px", fontSize: "12px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{salvando ? "Salvando..." : "Salvar Rascunho"}</button>
        <button onClick={gerarPdfDireto} disabled={gerando} style={{ background: "linear-gradient(135deg, #0D3B7A, #1565C0)", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{gerando ? "Gerando..." : "Baixar PDF"}</button>
      </div>

      <div style={{ display: "flex", gap: "24px", padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div className="painel-lateral" style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #DDE3EC", padding: "16px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#0D3B7A", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Configurações</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#555", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>Modelo</label>
                <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "7px 10px", fontSize: "12px", fontFamily: "Arial, sans-serif", outline: "none" }}>
                  <option value="">-- Selecione --</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#555", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>Destinatário</label>
                <select value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)} style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "7px 10px", fontSize: "12px", fontFamily: "Arial, sans-serif", outline: "none" }}>
                  <option value="">-- Selecione --</option>
                  {destinatarios.map((d) => <option key={d.id} value={d.id}>{d.codigo} - {d.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#555", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>Assunto *</label>
                <input type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto do ofício" style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "7px 10px", fontSize: "12px", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          {usaClassificacao && (
            <div style={{ background: "#EBF5FF", borderRadius: "8px", border: "1px solid #BBDEFB", padding: "16px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#0D3B7A", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Classificação Orçamentária</h3>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input type="text" value={reduzido} onChange={(e) => { setReduzido(e.target.value); setErroClassificacao(""); setClassificacao(null); }} onKeyDown={(e) => e.key === "Enter" && buscarClassificacao()} placeholder="Nº Reduzido" style={{ flex: 1, border: "1.5px solid #90CAF9", borderRadius: "6px", padding: "7px 10px", fontSize: "12px", fontFamily: "Arial, sans-serif", outline: "none" }} />
                <button onClick={buscarClassificacao} disabled={buscandoClassificacao} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: "6px", padding: "7px 12px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>{buscandoClassificacao ? "..." : "Buscar"}</button>
              </div>
              {erroClassificacao && <p style={{ fontSize: "11px", color: "#C62828", fontFamily: "Arial, sans-serif", margin: "0 0 8px" }}>{erroClassificacao}</p>}
              {classificacao && (
                <>
                  <div style={{ background: "#fff", borderRadius: "6px", padding: "10px", fontSize: "11px", fontFamily: "Arial, sans-serif", marginBottom: "8px", lineHeight: "1.6" }}>
                    <div><strong>Funcional:</strong> {classificacao.funcional}</div>
                    <div><strong>Elemento:</strong> {classificacao.elemento}/{classificacao.subelemento}</div>
                    <div><strong>Fonte:</strong> {classificacao.fonte}</div>
                    <div><strong>Natureza:</strong> {classificacao.naturezaDespesa}</div>
                  </div>
                  <input type="text" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} placeholder="Valor estimado" style={{ width: "100%", border: "1.5px solid #90CAF9", borderRadius: "6px", padding: "7px 10px", fontSize: "12px", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "8px" }} />
                  <button onClick={inserirQuadro} style={{ width: "100%", background: "#2E7D32", color: "#fff", border: "none", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>↓ Inserir Quadro</button>
                </>
              )}
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #DDE3EC", padding: "16px" }}>
            <p style={{ fontSize: "11px", color: "#888", fontFamily: "Arial, sans-serif", margin: "0 0 8px" }}>
              {paginas.length} página{paginas.length > 1 ? "s" : ""}
            </p>
            <button onClick={() => { const n = [...paginas, ""]; setPaginas(n); paginaConteudoRefs.current = [...paginaConteudoRefs.current, ""]; }} style={{ width: "100%", background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "Arial, sans-serif", marginBottom: "6px" }}>+ Adicionar Página</button>
            {paginas.length > 1 && (
              <button onClick={() => { setPaginas(paginas.slice(0, -1)); paginaConteudoRefs.current = paginaConteudoRefs.current.slice(0, -1); }} style={{ width: "100%", background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: "6px", padding: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>− Remover Última Página</button>
            )}
          </div>
        </div>

        <div className="area-paginas" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
          {paginas.map((conteudoInicial, index) => (
            <div key={`p-${index}-${paginas.length}`} className="pagina-wrapper">
              {index > 0 && (
                <div className="separador-pagina" style={{ textAlign: "center", fontSize: "11px", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: "8px" }}>
                  — Página {index + 1} —
                </div>
              )}
              <div className="pagina-a4" style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px`, background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", padding: `${MARGIN_TOP}px ${MARGIN_RIGHT}px ${MARGIN_BOTTOM}px ${MARGIN_LEFT}px`, boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                <Cabecalho />
                {index === 0 && (
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: "12pt", marginBottom: "12px" }}>
                    <div style={{ marginBottom: "10px" }}>OFÍCIO Nº {numeroExibido}</div>
                    <div style={{ textAlign: "right", marginBottom: "16px" }}>
                      Rondonópolis,{" "}{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}.
                    </div>
                    {dest && (
                      <div style={{ marginBottom: "16px", lineHeight: "1.6" }}>
                        {dest.responsavel ? (<><div>Ao Senhor</div><div><strong>{dest.responsavel}</strong></div>{dest.cidade && <div>{dest.cidade}</div>}</>) : (<div><strong>{dest.nome}</strong></div>)}
                        {dest.endereco && <div>{dest.endereco}{dest.cidade ? `, ${dest.cidade}` : ""}</div>}
                      </div>
                    )}
                    {assunto && <div style={{ marginBottom: "20px", fontWeight: "bold" }}>Assunto: {assunto}.</div>}
                  </div>
                )}
                <PaginaEditavel key={`e-${index}-${conteudoInicial.length}`} index={index} conteudoInicial={conteudoInicial} onChange={handlePaginaChange} />
                <Rodape />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
