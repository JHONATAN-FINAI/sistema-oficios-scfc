"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Oficio {
  id: number;
  numero: string;
  ano: number;
  assunto: string;
  conteudo: string;
  status: string;
  protocolo: string | null;
  criadoEm: string;
  destinatario: {
    codigo: string;
    nome: string;
    endereco: string | null;
    cidade: string | null;
    responsavel: string | null;
    cargo: string | null;
  } | null;
}

const CABECALHO_URL =
  "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";

function limparConteudo(html: string): string {
  return html
    .replace(/<div[^>]*class="page-marker"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class="mce-pagebreak"[^>]*>[\s\S]*?<\/div>/gi, "");
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function montarDestinatarioHtml(dest: Oficio["destinatario"]): string {
  if (!dest) return "";
  let html = "";
  if (dest.responsavel) {
    html += `<div>Ao Senhor</div><div><strong>${dest.responsavel}</strong></div>`;
    if (dest.cargo) html += `<div>${dest.cargo}</div>`;
  }
  html += `<div><strong>${dest.nome}</strong></div>`;
  if (dest.endereco)
    html += `<div>${dest.endereco}${dest.cidade ? `, ${dest.cidade}` : ""}</div>`;
  return `<div class="destinatario">${html}</div>`;
}

function gerarHtmlImpressao(oficio: Oficio): string {
  const conteudoLimpo = limparConteudo(oficio.conteudo);
  const dataOficio = formatarData(oficio.criadoEm);
  const destinatarioHtml = montarDestinatarioHtml(oficio.destinatario);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Oficio ${oficio.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /*
     * PX idêntico ao editor TinyMCE para correspondência perfeita.
     * Editor: width=794px, pad-top=178px, pad-bot=106px, pad-l=113px, pad-r=76px
     * @page em px força o Chrome a usar exatamente o mesmo tamanho.
     */
    @page { size: 794px 1123px; margin: 0; }

    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      width: 794px;
      padding-top: 178px;
      padding-bottom: 106px;
      padding-left: 113px;
      padding-right: 76px;
    }

    #cabecalho {
      position: fixed;
      top: 0; left: 0; right: 0; height: 178px;
      display: flex; align-items: center; justify-content: center;
      padding: 10px 76px 6px 113px;
      background: #fff;
    }
    #cabecalho img { max-height: 140px; max-width: 100%; object-fit: contain; }

    #rodape {
      position: fixed;
      bottom: 0; left: 0; right: 0; height: 106px;
      display: flex; align-items: center; justify-content: center;
      font-size: 8pt; color: #555;
      padding: 0 76px 0 113px;
      background: #fff;
    }

    .numero-oficio { font-weight: bold; margin-bottom: 12px; }
    .data-oficio { text-align: right; margin-bottom: 18px; }
    .destinatario { margin-bottom: 18px; line-height: 1.7; }
    .assunto { font-weight: bold; margin-bottom: 20px; }
    .corpo { text-align: justify; }
    .corpo p { margin: 0 0 8px 0; text-align: justify; }
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
    Prefeitura Municipal de Rondonopolis - MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
  </div>
  <div class="numero-oficio">OFICIO No ${oficio.numero}</div>
  <div class="data-oficio">Rondonopolis, ${dataOficio}.</div>
  ${destinatarioHtml}
  ${oficio.assunto ? `<div class="assunto">Assunto: ${oficio.assunto}.</div>` : ""}
  <div class="corpo">${conteudoLimpo}</div>
  ${oficio.protocolo ? `<div style="margin-top:16px;font-size:10pt;color:#555;">Protocolo: ${oficio.protocolo}</div>` : ""}
</body>
</html>`;
}

export default function PdfPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [emitindo, setEmitindo] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id) carregarOficio();
  }, [id]);

  async function carregarOficio() {
    try {
      const res = await fetch(`/api/oficios/${id}`);
      if (!res.ok) { router.push("/oficios/historico"); return; }
      setOficio(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  async function handleImprimir() {
    if (!oficio) return;
    setEmitindo(true);
    try {
      if (oficio.status === "rascunho") {
        await fetch(`/api/oficios/${oficio.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "emitido" }),
        });
        setOficio((prev) => prev ? { ...prev, status: "emitido" } : prev);
      }
      const html = gerarHtmlImpressao(oficio);
      const janela = window.open("", "_blank", "width=960,height=800");
      if (!janela) { alert("Permita pop-ups para este site e tente novamente."); return; }
      janela.document.open();
      janela.document.write(html);
      janela.document.close();
      janela.onload = () => {
        const img = janela.document.querySelector("img");
        const imprimir = () => setTimeout(() => janela.print(), 400);
        if (img && !img.complete) { img.onload = imprimir; img.onerror = imprimir; }
        else imprimir();
      };
    } catch {
      alert("Erro ao preparar impressao.");
    } finally {
      setEmitindo(false);
    }
  }

  if (status === "loading" || carregando) return null;
  if (!oficio) return null;

  const dest = oficio.destinatario;
  const conteudoLimpo = limparConteudo(oficio.conteudo);

  return (
    <>
      <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /*
     * PX idêntico ao editor TinyMCE para correspondência perfeita.
     * Editor: width=794px, pad-top=178px, pad-bot=106px, pad-l=113px, pad-r=76px
     * @page em px força o Chrome a usar exatamente o mesmo tamanho.
     */
    @page { size: 794px 1123px; margin: 0; }

    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      width: 794px;
      padding-top: 178px;
      padding-bottom: 106px;
      padding-left: 113px;
      padding-right: 76px;
    }

    #cabecalho {
      position: fixed;
      top: 0; left: 0; right: 0; height: 178px;
      display: flex; align-items: center; justify-content: center;
      padding: 10px 76px 6px 113px;
      background: #fff;
    }
    #cabecalho img { max-height: 140px; max-width: 100%; object-fit: contain; }

    #rodape {
      position: fixed;
      bottom: 0; left: 0; right: 0; height: 106px;
      display: flex; align-items: center; justify-content: center;
      font-size: 8pt; color: #555;
      padding: 0 76px 0 113px;
      background: #fff;
    }

    .numero-oficio { font-weight: bold; margin-bottom: 12px; }
    .data-oficio { text-align: right; margin-bottom: 18px; }
    .destinatario { margin-bottom: 18px; line-height: 1.7; }
    .assunto { font-weight: bold; margin-bottom: 20px; }
    .corpo { text-align: justify; }
    .corpo p { margin: 0 0 8px 0; text-align: justify; }
    .corpo br { display: block; margin-bottom: 6px; }
    .corpo table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
    .corpo td, .corpo th { border: 1px solid #000; padding: 4px 8px; }
    .corpo h1, .corpo h2, .corpo h3 { margin: 0 0 8px 0; }
</style>

      <div style={{ minHeight: "100vh", background: "#525659" }}>
        <div style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", position: "sticky", top: 0, zIndex: 100 }}>
          <Navbar />
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "16px", fontWeight: "700", fontFamily: "Georgia, serif", color: "#0D3B7A", margin: "0 0 2px" }}>
                Visualização do Ofício
              </h1>
              <p style={{ fontSize: "12px", color: "#888", fontFamily: "Arial, sans-serif", margin: 0 }}>
                {oficio.numero}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => router.back()}
                style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}
              >
                ← Voltar
              </button>
              <button
                onClick={() => router.push(`/oficios/novo?editar=${oficio.id}`)}
                style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}
              >
                Editar
              </button>
              <button
                onClick={handleImprimir}
                disabled={emitindo}
                style={{
                  background: emitindo ? "#90A4AE" : "linear-gradient(135deg, #0D3B7A, #1565C0)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: emitindo ? "not-allowed" : "pointer",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {emitindo ? "Preparando..." : "🖨 Imprimir / Salvar PDF"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "32px 16px 48px" }}>
          <div className="pagina-preview">
            <div className="preview-cabecalho">
              <img src={CABECALHO_URL} alt="Cabeçalho" crossOrigin="anonymous" />
            </div>

            <div className="preview-corpo">
              <div style={{ fontWeight: "bold", marginBottom: "12px" }}>
                OFÍCIO Nº {oficio.numero}
              </div>
              <div style={{ textAlign: "right", marginBottom: "18px" }}>
                Rondonópolis, {formatarData(oficio.criadoEm)}.
              </div>

              {dest && (
                <div style={{ marginBottom: "18px", lineHeight: "1.7" }}>
                  {dest.responsavel && (
                    <>
                      <div>Ao Senhor</div>
                      <div><strong>{dest.responsavel}</strong></div>
                      {dest.cargo && <div>{dest.cargo}</div>}
                    </>
                  )}
                  <div><strong>{dest.nome}</strong></div>
                  {dest.endereco && (
                    <div>{dest.endereco}{dest.cidade ? `, ${dest.cidade}` : ""}</div>
                  )}
                </div>
              )}

              {oficio.assunto && (
                <div style={{ fontWeight: "bold", marginBottom: "20px" }}>
                  Assunto: {oficio.assunto}.
                </div>
              )}

              <div
                className="corpo-preview"
                style={{ textAlign: "justify" }}
                dangerouslySetInnerHTML={{ __html: conteudoLimpo }}
              />

              {oficio.protocolo && (
                <div style={{ marginTop: "16px", fontSize: "10pt", color: "#555" }}>
                  Protocolo: {oficio.protocolo}
                </div>
              )}
            </div>

            <div className="preview-rodape">
              Prefeitura Municipal de Rondonópolis – MT &nbsp;|&nbsp; Av. Duque de Caxias, 1000 &nbsp;|&nbsp; CEP: 78.800-000 &nbsp;|&nbsp; (66) 3411-7000
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
