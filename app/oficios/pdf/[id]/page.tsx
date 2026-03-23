"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Oficio {
  id: number;
  numero: string;
  ano: number;
  assunto: string;
  conteudo: string;
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

const CABECALHO_URL = "https://raw.githubusercontent.com/JHONATAN-FINAI/assets-prefeitura-rondonopolis/af6fa70c4657ac5660342f7838f3f067b9f13124/SECRETARIA%20MUNICIPAL%20DE%20ADMINISTRA%C3%87%C3%83O%2C%20GEST%C3%83O%20DE%20PESSOAS%20E%20INOVA%C3%87%C3%83O.png";

const estiloBase: React.CSSProperties = {
  width: "794px",
  minHeight: "1123px",
  backgroundColor: "#fff",
  padding: "10mm 20mm 25mm 20mm",
  fontFamily: "Arial, sans-serif",
  fontSize: "12pt",
  lineHeight: "1.5",
  color: "#000",
  boxSizing: "border-box",
  position: "relative",
};

function Cabecalho() {
  return (
    <div style={{ textAlign: "center", marginBottom: "8px", width: "100%" }}>
      <img
        src={CABECALHO_URL}
        alt="Cabeçalho"
        crossOrigin="anonymous"
        style={{ width: "100%", maxHeight: "90px", objectFit: "contain", objectPosition: "center" }}
      />
    </div>
  );
}

function Rodape() {
  return (
    <div style={{
      marginTop: "40px",
      borderTop: "1px solid #999",
      paddingTop: "4px",
      fontSize: "8pt",
      color: "#555",
      textAlign: "center",
    }}>
      Prefeitura Municipal de Rondonópolis – MT | Av. Duque de Caxias, 1000 | CEP: 78.800-000 | (66) 3411-7000
    </div>
  );
}

function limparConteudo(html: string): string {
  return html.replace(/<div[^>]*class="page-marker"[^>]*>.*?<\/div>/gi, "");
}

export default function PdfPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);

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

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  async function gerarPdf() {
    if (!oficio) return;
    setGerando(true);
    try {
      const elemento = document.querySelector(".pagina-oficio") as HTMLElement;
      if (!elemento) return;

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const pageHeightPx = pdfHeight / ratio;

      let posY = 0;
      let page = 0;

      while (posY < imgHeight) {
        if (page > 0) pdf.addPage();
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = Math.min(pageHeightPx, imgHeight - posY);
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, -posY);
        pdf.addImage(
          sliceCanvas.toDataURL("image/jpeg", 0.95),
          "JPEG", 0, 0, pdfWidth, sliceCanvas.height * ratio
        );
        posY += pageHeightPx;
        page++;
      }

      await fetch(`/api/oficios/${oficio.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "emitido" }),
      });

      pdf.save(`Oficio_${oficio.numero.replace(/\//g, "-")}.pdf`);
    } catch {
      alert("Erro ao gerar PDF.");
    } finally {
      setGerando(false);
    }
  }

  if (status === "loading" || carregando) return null;
  if (!oficio) return null;

  const dest = oficio.destinatario;
  const conteudoLimpo = limparConteudo(oficio.conteudo);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .pagina-oficio { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        <div className="no-print">
          <Navbar />
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Visualização do Ofício</h1>
                <p className="text-sm text-gray-500">{oficio.numero}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 bg-white">← Voltar</button>
                <button onClick={() => router.push(`/oficios/novo?editar=${oficio.id}`)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 bg-white">Editar</button>
                <button onClick={() => window.print()} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 bg-white">Imprimir</button>
                <button onClick={gerarPdf} disabled={gerando} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {gerando ? "Gerando..." : "Baixar PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center py-6">
          <div className="pagina-oficio" style={{ ...estiloBase, boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}>
            <Cabecalho />

            <div style={{ fontWeight: "bold", marginBottom: "16px" }}>
              OFÍCIO: {oficio.numero}
            </div>

            <div style={{ marginBottom: "16px", textAlign: "right" }}>
              Rondonópolis, {formatarData(oficio.criadoEm)}
            </div>

            {dest && (
              <div style={{ marginBottom: "16px", lineHeight: "1.6" }}>
                {dest.responsavel && (
                  <div><strong>Para:</strong> {dest.responsavel}{dest.cargo ? ` — ${dest.cargo}` : ""}</div>
                )}
                <div><strong>Órgão:</strong> {dest.nome}</div>
                {dest.endereco && (
                  <div><strong>Endereço:</strong> {dest.endereco}{dest.cidade ? `, ${dest.cidade}` : ""}</div>
                )}
              </div>
            )}

            <div style={{ marginBottom: "24px" }}>
              <strong>Assunto:</strong> {oficio.assunto}
            </div>

            <div
              style={{ textAlign: "justify" }}
              dangerouslySetInnerHTML={{ __html: conteudoLimpo }}
            />

            {oficio.protocolo && (
              <div style={{ marginTop: "16px", fontSize: "10pt", color: "#555" }}>
                Protocolo: {oficio.protocolo}
              </div>
            )}

            <Rodape />
          </div>
        </div>
      </div>
    </>
  );
}