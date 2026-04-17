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

  async function registrarEEmitir() {
    if (!oficio) return;
    setGerando(true);
    try {
      await fetch(`/api/oficios/${oficio.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "emitido" }),
      });
      
      setGerando(false);
      setTimeout(() => {
        window.print();
      }, 100);
    } catch {
      alert("Erro ao preparar impressão.");
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
          @page { size: A4 portrait; margin: 15mm 20mm; }
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; font-size: 12pt; display: block; }
          .pagina-oficio { width: 100% !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; min-height: auto !important; position: static !important; }
          h1, h2, h3, h4, h5 { page-break-after: avoid; }
          .rodape-absolute { position: fixed !important; bottom: 0; left: 0; width: 100%; }
          .espaco-rodape { display: block !important; height: 50px; }
        }
        @media screen {
          .pagina-oficio { padding-top: 35mm; padding-bottom: 25mm; position: relative; }
          .rodape-absolute { position: absolute; bottom: 25mm; left: 20mm; right: 20mm; }
          .espaco-rodape { display: none; }
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
                <button onClick={() => window.print()} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 bg-white">Visualizar Impressão</button>
                <button onClick={registrarEEmitir} disabled={gerando} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {gerando ? "Carregando..." : "Imprimir / Salvar PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center py-6">
          <div className="pagina-oficio" style={{ ...estiloBase, boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}>
            <table style={{ width: "100%", border: "none" }}>
              <thead style={{ display: "table-header-group" }}>
                <tr>
                  <td style={{ border: "none", padding: 0, paddingBottom: "16px" }}>
                    <Cabecalho />
                  </td>
                </tr>
              </thead>
              <tbody style={{ display: "table-row-group" }}>
                <tr>
                  <td style={{ border: "none", padding: 0, verticalAlign: "top" }}>
                    <div className="oficio-corpo">
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
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot style={{ display: "table-footer-group" }}>
                <tr>
                  <td style={{ border: "none", padding: 0, paddingTop: "32px" }}>
                    <div className="rodape-absolute">
                      <Rodape />
                    </div>
                    <div className="espaco-rodape"></div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}