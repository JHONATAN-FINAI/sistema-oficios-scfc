"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

interface Stats {
  total: number;
  emitidos: number;
  protocolados: number;
  rascunhos: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, emitidos: 0, protocolados: 0, rascunhos: 0 });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    async function carregarStats() {
      const res = await fetch("/api/oficios");
      if (!res.ok) return;
      const oficios = await res.json();
      setStats({
        total: oficios.length,
        emitidos: oficios.filter((o: any) => o.status === "emitido").length,
        protocolados: oficios.filter((o: any) => o.status === "protocolado").length,
        rascunhos: oficios.filter((o: any) => o.status === "rascunho").length,
      });
    }
    if (status === "authenticated") carregarStats();
  }, [status]);

  if (status === "loading") return null;

  const anoAtual = new Date().getFullYear();
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = session?.user?.name?.split(" ")[0] || "";

  const cards = [
    { label: "Total de Ofícios", valor: stats.total, cor: "#0D3B7A", bg: "#EBF2FF", borda: "#1565C0" },
    { label: "Emitidos", valor: stats.emitidos, cor: "#1565C0", bg: "#E3F0FF", borda: "#1E88E5" },
    { label: "Protocolados", valor: stats.protocolados, cor: "#2E7D32", bg: "#E8F5E9", borda: "#43A047" },
    { label: "Rascunhos", valor: stats.rascunhos, cor: "#795548", bg: "#EFEBE9", borda: "#8D6E63" },
  ];

  const acoes = [
    { label: "Novo Ofício", desc: "Criar um novo ofício", href: "/oficios/novo", cor: "#1565C0", icone: "✦" },
    { label: "Histórico", desc: "Consultar ofícios emitidos", href: "/oficios/historico", cor: "#0D3B7A", icone: "☰" },
    { label: "Destinatários", desc: "Gerenciar órgãos destinatários", href: "/destinatarios", cor: "#F57C00", icone: "◈" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8" }}>
      <Navbar />

      {/* Banner topo */}
      <div style={{
        background: "linear-gradient(135deg, #0D3B7A 0%, #1565C0 100%)",
        padding: "32px 24px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, width: "300px", height: "100%",
          background: "radial-gradient(circle at 80% 50%, rgba(245,124,0,0.15) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>
            {saudacao}, {primeiroNome} — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 style={{ color: "#fff", fontSize: "24px", fontFamily: "Georgia, serif", fontWeight: "700", margin: "0 0 4px" }}>
            Superintendência de Controle de Frotas e Combustível
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "Arial, sans-serif", margin: 0 }}>
            Sistema de Ofícios — {anoAtual}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 24px" }}>

        {/* Cards estatísticas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {cards.map((card) => (
            <div key={card.label} style={{
              background: card.bg,
              border: `1px solid ${card.borda}30`,
              borderLeft: `4px solid ${card.borda}`,
              borderRadius: "8px",
              padding: "20px 24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <p style={{ fontSize: "11px", color: "#666", fontFamily: "Arial, sans-serif", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {card.label}
              </p>
              <p style={{ fontSize: "36px", fontWeight: "700", color: card.cor, fontFamily: "Georgia, serif", margin: 0, lineHeight: 1 }}>
                {card.valor}
              </p>
            </div>
          ))}
        </div>

        {/* Ações rápidas */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #DDE3EC", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "13px", fontFamily: "Arial, sans-serif", fontWeight: "700", color: "#0D3B7A", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "2px solid #F0F4F8" }}>
            Ações Rápidas
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {acoes.map((acao) => (
              <button
                key={acao.href}
                onClick={() => router.push(acao.href)}
                style={{
                  background: "#fff",
                  border: `1px solid ${acao.cor}30`,
                  borderLeft: `4px solid ${acao.cor}`,
                  borderRadius: "8px",
                  padding: "16px 20px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${acao.cor}08`; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 10px rgba(0,0,0,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
              >
                <span style={{ fontSize: "18px", marginBottom: "8px", display: "block", color: acao.cor }}>{acao.icone}</span>
                <p style={{ fontFamily: "Arial, sans-serif", fontWeight: "700", fontSize: "14px", color: "#1a1a1a", margin: "0 0 4px" }}>{acao.label}</p>
                <p style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#888", margin: 0 }}>{acao.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}