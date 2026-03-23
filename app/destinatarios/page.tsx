"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Destinatario {
  id: number;
  codigo: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  responsavel: string | null;
  cargo: string | null;
}

const VAZIO = { codigo: "", nome: "", endereco: "", cidade: "Rondonópolis - MT", responsavel: "", cargo: "" };

export default function DestinatariosPage() {
  const { status } = useSession();
  const router = useRouter();

  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Partial<typeof VAZIO>>({});
  const [modalExclusao, setModalExclusao] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Destinatario | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/destinatarios");
      setDestinatarios(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  function abrirCriacao() {
    setModoEdicao(false);
    setIdEdicao(null);
    setForm({ ...VAZIO });
    setErros({});
    setModalAberto(true);
  }

  function abrirEdicao(d: Destinatario) {
    setModoEdicao(true);
    setIdEdicao(d.id);
    setForm({ codigo: d.codigo, nome: d.nome, endereco: d.endereco || "", cidade: d.cidade || "Rondonópolis - MT", responsavel: d.responsavel || "", cargo: d.cargo || "" });
    setErros({});
    setModalAberto(true);
  }

  async function salvar() {
    const e: Partial<typeof VAZIO> = {};
    if (!form.codigo.trim()) e.codigo = "Informe o código.";
    if (!form.nome.trim()) e.nome = "Informe o nome.";
    setErros(e);
    if (Object.keys(e).length > 0) return;

    setSalvando(true);
    try {
      const payload = {
        codigo: form.codigo.trim().padStart(3, "0"),
        nome: form.nome.trim().toUpperCase(),
        endereco: form.endereco?.trim() || null,
        cidade: form.cidade?.trim() || null,
        responsavel: form.responsavel?.trim() || null,
        cargo: form.cargo?.trim() || null,
      };
      const res = modoEdicao && idEdicao
        ? await fetch(`/api/destinatarios/${idEdicao}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/destinatarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (!res.ok) {
        const err = await res.json();
        if (err.message?.includes("codigo")) { setErros({ codigo: "Este código já está em uso." }); return; }
        alert("Erro ao salvar."); return;
      }
      await carregar();
      setModalAberto(false);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/destinatarios/${paraExcluir.id}`, { method: "DELETE" });
      if (res.ok) { await carregar(); setModalExclusao(false); }
      else { const err = await res.json(); alert(err.message || "Erro ao excluir."); }
    } finally {
      setExcluindo(false);
    }
  }

  const filtrados = destinatarios.filter((d) =>
    !busca || d.codigo.includes(busca) || d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const inputStyle = (erro?: string): React.CSSProperties => ({
    width: "100%",
    border: `1.5px solid ${erro ? "#EF9A9A" : "#DDE3EC"}`,
    borderRadius: "6px",
    padding: "9px 12px",
    fontSize: "13px",
    fontFamily: "Arial, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  });

  if (status === "loading") return null;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8" }}>
      <Navbar />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #DDE3EC", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>

          {/* Cabeçalho */}
          <div style={{ background: "linear-gradient(135deg, #0D3B7A 0%, #1565C0 100%)", borderBottom: "3px solid #F57C00", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ color: "#fff", fontSize: "18px", fontFamily: "Georgia, serif", fontWeight: "700", margin: "0 0 2px" }}>Destinatários</h1>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", fontFamily: "Arial, sans-serif", margin: 0 }}>{filtrados.length} cadastrado{filtrados.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={abrirCriacao} style={{ background: "#F57C00", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 18px", fontSize: "13px", fontWeight: "700", fontFamily: "Arial, sans-serif", cursor: "pointer" }}>
              + Novo Destinatário
            </button>
          </div>

          {/* Busca */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #EEF0F4", background: "#FAFBFC" }}>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código ou nome..." style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box" as const }} />
          </div>

          {/* Tabela */}
          {carregando ? (
            <div style={{ textAlign: "center", padding: "64px", color: "#AAA", fontFamily: "Arial, sans-serif" }}>Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px", color: "#AAA", fontFamily: "Arial, sans-serif" }}>Nenhum destinatário encontrado.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: "Arial, sans-serif" }}>
              <thead>
                <tr style={{ background: "#F5F7FA", borderBottom: "1px solid #EEF0F4" }}>
                  <th style={{ textAlign: "left", padding: "12px 24px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px", width: "80px" }}>Código</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Nome</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Responsável</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Cidade</th>
                  <th style={{ textAlign: "right", padding: "12px 24px", fontWeight: "600", color: "#0D3B7A", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #EEF0F4", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ padding: "12px 24px", fontFamily: "monospace", fontWeight: "700", color: "#0D3B7A" }}>{d.codigo}</td>
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1a1a1a" }}>{d.nome}</td>
                    <td style={{ padding: "12px 16px", color: "#666" }}>{d.responsavel ? `${d.responsavel}${d.cargo ? ` / ${d.cargo}` : ""}` : "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#666" }}>{d.cidade || "—"}</td>
                    <td style={{ padding: "12px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button onClick={() => abrirEdicao(d)} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "4px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Editar</button>
                        <button onClick={() => { setParaExcluir(d); setModalExclusao(true); }} style={{ background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: "4px", padding: "5px 12px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "10px", width: "100%", maxWidth: "500px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #0D3B7A, #1565C0)", borderBottom: "3px solid #F57C00", padding: "16px 24px" }}>
              <h2 style={{ color: "#fff", fontSize: "16px", fontFamily: "Georgia, serif", fontWeight: "700", margin: 0 }}>{modoEdicao ? "Editar Destinatário" : "Novo Destinatário"}</h2>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column" as const, gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>Código *</label>
                  <input type="text" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="001" style={inputStyle(erros.codigo)} />
                  {erros.codigo && <p style={{ fontSize: "11px", color: "#C62828", margin: "4px 0 0", fontFamily: "Arial, sans-serif" }}>{erros.codigo}</p>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>Nome *</label>
                  <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="SECRETARIA MUNICIPAL DE..." style={inputStyle(erros.nome)} />
                  {erros.nome && <p style={{ fontSize: "11px", color: "#C62828", margin: "4px 0 0", fontFamily: "Arial, sans-serif" }}>{erros.nome}</p>}
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>Endereço</label>
                <input type="text" value={form.endereco || ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro" style={inputStyle()} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>Cidade</label>
                <input type="text" value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} style={inputStyle()} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>Responsável</label>
                  <input type="text" value={form.responsavel || ""} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" style={inputStyle()} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "5px", textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>Cargo</label>
                  <input type="text" value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Secretário(a)" style={inputStyle()} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button onClick={() => setModalAberto(false)} style={{ background: "#F5F7FA", color: "#444", border: "1px solid #DDE3EC", borderRadius: "6px", padding: "9px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>Cancelar</button>
                <button onClick={salvar} disabled={salvando} style={{ background: "linear-gradient(135deg, #0D3B7A, #1565C0)", color: "#fff", border: "none", borderRadius: "6px", padding: "9px 18px", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>{salvando ? "Salvando..." : modoEdicao ? "Salvar Alterações" : "Cadastrar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {modalExclusao && paraExcluir && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "28px", width: "100%", maxWidth: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ fontSize: "16px", fontFamily: "Georgia, serif", fontWeight: "700", color: "#C62828", margin: "0 0 8px" }}>Excluir Destinatário</h2>
            <p style={{ fontSize: "13px", color: "#555", fontFamily: "Arial, sans-serif", margin: "0 0 20px" }}>Deseja excluir <strong>{paraExcluir.nome}</strong>?</p>
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