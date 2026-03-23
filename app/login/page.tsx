"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin() {
    setCarregando(true);
    setErro("");
    const res = await signIn("credentials", { email, password: senha, redirect: false });
    setCarregando(false);
    if (res?.error) { setErro("Email ou senha incorretos."); }
    else { router.push("/dashboard"); }
  }

  async function handleGoogle() {
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0D3B7A 0%, #1565C0 60%, #1E88E5 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decoração de fundo */}
      <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(245,124,0,0.08)" }} />
      <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

      <div style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        position: "relative",
      }}>
        {/* Faixa laranja topo */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #F57C00, #FF9800)", borderRadius: "12px 12px 0 0" }} />

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0D3B7A, #1565C0)",
            color: "#fff",
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            fontSize: "22px",
            marginBottom: "16px",
            boxShadow: "0 4px 12px rgba(21,101,192,0.3)",
          }}>
            ✦
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: "700", color: "#0D3B7A", margin: "0 0 4px" }}>
            Sistema de Ofícios
          </h1>
          <p style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#888", margin: 0 }}>
            Superintendência de Controle de Frotas e Combustível
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "6px" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="seu@email.com"
              style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box", transition: "border 0.15s" }}
              onFocus={(e) => e.target.style.border = "1.5px solid #1565C0"}
              onBlur={(e) => e.target.style.border = "1.5px solid #DDE3EC"}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#444", fontFamily: "Arial, sans-serif", marginBottom: "6px" }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              style={{ width: "100%", border: "1.5px solid #DDE3EC", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", fontFamily: "Arial, sans-serif", outline: "none", boxSizing: "border-box", transition: "border 0.15s" }}
              onFocus={(e) => e.target.style.border = "1.5px solid #1565C0"}
              onBlur={(e) => e.target.style.border = "1.5px solid #DDE3EC"}
            />
          </div>

          {erro && (
            <div style={{ background: "#FFF3F3", border: "1px solid #FFCDD2", borderRadius: "6px", padding: "10px 12px", fontSize: "12px", color: "#C62828", fontFamily: "Arial, sans-serif" }}>
              {erro}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={carregando}
            style={{
              background: carregando ? "#90A4AE" : "linear-gradient(135deg, #0D3B7A, #1565C0)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "700",
              fontFamily: "Arial, sans-serif",
              cursor: carregando ? "not-allowed" : "pointer",
              boxShadow: "0 3px 10px rgba(21,101,192,0.3)",
              transition: "all 0.15s",
              letterSpacing: "0.3px",
            }}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "#EEE" }} />
            <span style={{ fontSize: "11px", color: "#AAA", fontFamily: "Arial, sans-serif" }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: "#EEE" }} />
          </div>

          <button
            onClick={handleGoogle}
            style={{
              background: "#fff",
              border: "1.5px solid #DDE3EC",
              borderRadius: "6px",
              padding: "11px",
              fontSize: "13px",
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#444",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F8F9FA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "#BBB", fontFamily: "Arial, sans-serif", margin: "24px 0 0" }}>
          Prefeitura Municipal de Rondonópolis — MT
        </p>
      </div>
    </div>
  );
}