"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/oficios/editor", label: "Novo Ofício" },
  { href: "/oficios/historico", label: "Histórico" },
  { href: "/destinatarios", label: "Destinatários" },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav style={{
      background: "linear-gradient(135deg, #0D3B7A 0%, #1565C0 60%, #1E88E5 100%)",
      borderBottom: "3px solid #F57C00",
      padding: "0",
      boxShadow: "0 2px 12px rgba(13,59,122,0.18)",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "stretch", justifyContent: "space-between", height: "56px" }}>
        {/* Logo / Título */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <Link href="/dashboard" style={{
            fontFamily: "'Georgia', serif",
            fontWeight: "700",
            fontSize: "15px",
            color: "#fff",
            textDecoration: "none",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{
              background: "#F57C00",
              color: "#fff",
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "11px",
              fontFamily: "Arial, sans-serif",
              fontWeight: "700",
              letterSpacing: "1px",
            }}>SCFC</span>
            Sistema de Ofícios
          </Link>

          <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
            {LINKS.map((l) => {
              const ativo = l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    fontSize: "13px",
                    fontFamily: "Arial, sans-serif",
                    fontWeight: ativo ? "700" : "400",
                    color: ativo ? "#fff" : "rgba(255,255,255,0.75)",
                    textDecoration: "none",
                    borderBottom: ativo ? "3px solid #F57C00" : "3px solid transparent",
                    borderTop: "3px solid transparent",
                    transition: "all 0.15s",
                    marginBottom: "-3px",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Usuário */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {session?.user?.name && (
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: "Arial, sans-serif" }}>
              {session.user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              fontSize: "12px",
              padding: "5px 14px",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
              transition: "background 0.15s",
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}