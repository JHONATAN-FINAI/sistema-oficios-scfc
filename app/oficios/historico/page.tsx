"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Oficio {
  id: number;
  numero: string;
  ano: number;
  assunto: string;
  status: string;
  protocolo: string | null;
  criadoEm: string;
  destinatario: { nome: string; codigo: string } | null;
  template: { nome: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  emitido: { label: "Emitido", color: "bg-blue-100 text-blue-700" },
  protocolado: { label: "Protocolado", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  rascunho: { label: "Rascunho", bg: "#F5F5F5", color: "#616161" },
  emitido: { label: "Emitido", bg: "#E3F0FF", color: "#1565C0" },
  protocolado: { label: "Protocolado", bg: "#E8F5E9", color: "#2E7D32" },
  cancelado: { label: "Cancelado", bg: "#FFEBEE", color: "#C62828" },
};

export default function HistoricoPage() {
  const { status } = useSession();
  const router = useRouter();

  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [modalProtocolo, setModalProtocolo] = useState(false);
  const [oficioSelecionado, setOficioSelecionado] = useState<Oficio | null>(null);
  const [novoProtocolo, setNovoProtocolo] = useState("");
  const [salvandoProtocolo, setSalvandoProtocolo] = useState(false);

  const [modalExclusao, setModalExclusao] = useState(false);
  const [oficioParaExcluir, setOficioParaExcluir] = useState<Oficio | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { carregarOficios(); }, []);

  async function carregarOficios() {
    setCarregando(true);
    try {
      const res = await fetch("/api/oficios");
      setOficios(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  async function salvarProtocolo() {
    if (!oficioSelecionado) return;
    setSalvandoProtocolo(true);
    try {
      await fetch(`/api/oficios/${oficioSelecionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolo: novoProtocolo, status: novoProtocolo ? "protocolado" : "emitido" }),
      });
      await carregarOficios();
      setModalProtocolo(false);
    } finally {
      setSalvandoProtocolo(false);
    }
  }

  async function excluir() {
    if (!oficioParaExcluir) return;
    setExcluindo(true);
    try {
      await fetch(`/api/oficios/${oficioParaExcluir.id}`, { method: "DELETE" });
      await carregarOficios();
      setModalExclusao(false);
    } finally {
      setExcluindo(false);
    }
  }

  const anos = [...new Set(oficios.map((o) => o.ano))].sort((a, b) => b - a);
  const filtrados = oficios.filter((o) => {
    const matchBusca = !busca || o.numero.toLowerCase().includes(busca.toLowerCase()) || o.assunto.toLowerCase().includes(busca.toLowerCase()) || o.destinatario?.nome.toLowerCase().includes(busca.toLowerCase());
    const matchAno = !filtroAno || o.ano === Number(filtroAno);
    const matchStatus = !filtroStatus || o.status === filtroStatus;
    return matchBusca && matchAno && matchStatus;
  });

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  if (status === "loading") return null;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8" }}>
      <Navbar />
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #DDE3EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>

          {/* Cabeçalho */}
          <div style={{ background: "linear-gradient(135deg, #0D3B7A 0%, #1565C0 100%)", borderBottom: "3px solid #F57C00", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ color: "#fff", fontSize: "18px", fontFamily: "Georgia, serif", fontWeight: "700", margin: "0 0 2px" }}>Histórico de Ofícios</h1>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", fontFamily: "Arial, sans-serif", margin: 0 }}>{filtrados.length} ofício{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => router.push("/oficios/novo")} style={{ background: "#F57C00", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 18px", fontSize: "13px", fontWeight: "700", fontFamily: "Arial, sans-serif", cursor: "pointer" }}>
              + Novo Ofício
            </button>
          </div>

          {/* Filtros */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #EEF0F4", display: "flex", gap: "12px", flexWrap: "wrap" as const, background: "#FAFBFC" }}>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, assunto ou destinatário..."
              style={{ flex: 1, minWidth: "200px", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none" }}
            />
            <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} style={{ border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none", background: "#fff" }}>
              <option value="">Todos os anos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none", background: "#fff" }}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(busca || filtroAno || filtroStatus) && (
              <button onClick={() => { setBusca(""); setFiltroAno(""); setFiltroStatus(""); }} style={{ background: "none", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "8px 12px", fontSize: "12px", fontFamily: "Arial, sans-serif", cursor: "pointer", color: "#666" }}>
                Limpar
              </button>
            )}
          </div>

          {/* Tabela */}
          {carregando ? (
            <div style={{ textAlign: "center", padding: "64px", color: "#AAA", fontFamily: "Arial, sans-serif" }}>Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px", color: "#AAA", fontFamily: "Arial, sans-serif" }}>Nenhum ofício encontrado.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: "Arial, sans-serif" }}>
              <thead>
                <tr style={{ background: "#F5F7FA", borderBottom: "1px solid #EEF0F4" }}>
                  <th style={{ textAlign: "left", padding: "12px 24px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Número</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Data</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Destinatário</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Assunto</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Protocolo</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                  <th style={{ textAlign: "right", padding: "12px 24px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((oficio, i) => {
                  const st = STATUS_STYLES[oficio.status] || STATUS_STYLES.rascunho;
                  return (
                    <tr key={oficio.id} style={{ borderBottom: "1px solid #EEF0F4", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                      <td style={{ padding: "12px 24px", fontFamily: "monospace", fontWeight: "600", color: "#0D3B7A" }}>{oficio.numero}</td>
                      <td style={{ padding: "12px 16px", color: "#666", whiteSpace: "nowrap" as const }}>{formatarData(oficio.criadoEm)}</td>
                      <td style={{ padding: "12px 16px", color: "#333" }}>{oficio.destinatario ? `${oficio.destinatario.codigo} - ${oficio.destinatario.nome}` : "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#333", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{oficio.assunto}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {oficio.protocolo ? (
                          <span style={{ fontFamily: "monospace", color: "#333" }}>{oficio.protocolo}</span>
                        ) : (
                          <button onClick={() => { setOficioSelecionado(oficio); setNovoProtocolo(""); setModalProtocolo(true); }} style={{ background: "none", border: "none", color: "#1565C0", fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "Arial, sans-serif" }}>
                            + Lançar
                          </button>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: st.bg, color: st.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button onClick={() => router.push(`/oficios/pdf/${oficio.id}`)} style={{ background: "#E3F0FF", color: "#1565C0", border: "none", borderRadius: "4px", padding: "5px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>PDF</button>
                          <button onClick={() => router.push(`/oficios/editor?editar=${oficio.id}`)} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Editar</button>
                          {oficio.protocolo && (
                            <button onClick={() => { setOficioSelecionado(oficio); setNovoProtocolo(oficio.protocolo || ""); setModalProtocolo(true); }} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "5px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Protocolo</button>
                          )}
                          <button onClick={() => { setOficioParaExcluir(oficio); setModalExclusao(true); }} style={{ background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: "4px", padding: "5px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Protocolo */}
      {modalProtocolo && oficioSelecionado && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "28px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ borderBottom: "3px solid #F57C00", paddingBottom: "12px", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontFamily: "Georgia, serif", fontWeight: "700", color: "#0D3B7A", margin: 0 }}>Lançar Protocolo</h2>
              <p style={{ fontSize: "12px", color: "#888", fontFamily: "Arial, sans-serif", margin: "4px 0 0" }}>Ofício: <strong>{oficioSelecionado.numero}</strong></p>
            </div>
            <input type="text" value={novoProtocolo} onChange={(e) => setNovoProtocolo(e.target.value)} placeholder="Número do protocolo" autoFocus style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setModalProtocolo(false)} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Cancelar</button>
              <button onClick={salvarProtocolo} disabled={salvandoProtocolo} style={{ background: "linear-gradient(135deg, #0D3B7A, #1565C0)", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{salvandoProtocolo ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {modalExclusao && oficioParaExcluir && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "28px", width: "100%", maxWidth: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "16px", fontFamily: "Georgia, serif", fontWeight: "700", color: "#C62828", margin: "0 0 8px" }}>Excluir Ofício</h2>
            <p style={{ fontSize: "13px", color: "#555", fontFamily: "Arial, sans-serif", margin: "0 0 20px" }}>Deseja excluir o ofício <strong>{oficioParaExcluir.numero}</strong>? Esta ação não pode ser desfeita.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setModalExclusao(false)} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Cancelar</button>
              <button onClick={excluir} disabled={excluindo} style={{ background: "#C62828", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{excluindo ? "Excluindo..." : "Excluir"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}