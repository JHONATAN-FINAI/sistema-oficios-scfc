"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, rotuloNumero, STATUS } from "@/lib/client";

interface Oficio {
  id: number; numero: string | null; ano: number; assunto: string; status: string;
  protocolo: string | null; criadoEm: string; emitidoEm: string | null;
  destinatario: { nome: string; codigo: string } | null; template: { nome: string } | null;
}

const POR_PAGINA = 25;
const input = "border border-[#DDE3EC] rounded-md px-3 py-2 text-[13px] outline-none bg-white focus:border-[#1565C0]";
const btn = "rounded px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer";

const dataDe = (o: Oficio) => new Date(o.emitidoEm ?? o.criadoEm).toLocaleDateString("pt-BR");

function baixarCsv(linhas: Oficio[]) {
  const aspas = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const cab = ["Número", "Data", "Destinatário", "Assunto", "Protocolo", "Status"];
  const corpo = linhas.map((o) =>
    [rotuloNumero(o), dataDe(o), o.destinatario ? `${o.destinatario.codigo} - ${o.destinatario.nome}` : "", o.assunto, o.protocolo ?? "", STATUS[o.status]?.label ?? o.status].map(aspas).join(";")
  );
  // BOM + ';' para o Excel em português abrir com acentos e colunas corretos
  const blob = new Blob(["\ufeff" + [cab.map(aspas).join(";"), ...corpo].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `oficios-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function HistoricoPage() {
  const { status } = useSession();
  const router = useRouter();

  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [pagina, setPagina] = useState(1);

  const [protocolando, setProtocolando] = useState<Oficio | null>(null);
  const [protocolo, setProtocolo] = useState("");
  const [excluindo, setExcluindo] = useState<Oficio | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  const carregar = useCallback(async () => {
    try { setOficios(await api<Oficio[]>("/api/oficios")); setErro(""); }
    catch (e: any) { setErro(e.message); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { if (status === "authenticated") carregar(); }, [status, carregar]);
  useEffect(() => setPagina(1), [busca, filtroAno, filtroStatus]);

  const anos = useMemo(() => Array.from(new Set(oficios.map((o) => o.ano))).sort((a, b) => b - a), [oficios]);
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return oficios.filter((o) =>
      (!q || [o.numero, o.assunto, o.destinatario?.nome, o.protocolo].some((v) => v?.toLowerCase().includes(q))) &&
      (!filtroAno || o.ano === Number(filtroAno)) &&
      (!filtroStatus || o.status === filtroStatus)
    );
  }, [oficios, busca, filtroAno, filtroStatus]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visiveis = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  async function executar(fn: () => Promise<unknown>) {
    setOcupado(true);
    try { await fn(); await carregar(); } catch (e: any) { setErro(e.message); } finally { setOcupado(false); }
  }
  const salvarProtocolo = () => executar(async () => {
    await api(`/api/oficios/${protocolando!.id}`, { method: "PUT", json: { protocolo: protocolo.trim() || null } });
    setProtocolando(null);
  });
  const excluir = () => executar(async () => {
    await api(`/api/oficios/${excluindo!.id}`, { method: "DELETE" });
    setExcluindo(null);
  });
  const duplicar = (o: Oficio) => executar(async () => {
    const novo = await api<{ id: number }>(`/api/oficios/${o.id}/duplicar`, { method: "POST" });
    router.push(`/oficios/novo?editar=${novo.id}`);
  });

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <Navbar />
      <div className="max-w-[1280px] mx-auto p-6">
        <div className="bg-white rounded-[10px] border border-[#DDE3EC] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b-[3px] border-[#F57C00]" style={{ background: "linear-gradient(135deg, #0D3B7A 0%, #1565C0 100%)" }}>
            <div>
              <h1 className="text-white text-lg font-bold" style={{ fontFamily: "Georgia, serif" }}>Histórico de Ofícios</h1>
              <p className="text-white/65 text-xs">{filtrados.length} ofício{filtrados.length !== 1 && "s"} encontrado{filtrados.length !== 1 && "s"}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => baixarCsv(filtrados)} disabled={!filtrados.length} className="bg-white/15 text-white border border-white/30 rounded-md px-4 py-2 text-[13px] font-semibold hover:bg-white/25 disabled:opacity-40">Exportar CSV</button>
              <button onClick={() => router.push("/oficios/novo")} className="bg-[#F57C00] text-white rounded-md px-4 py-2 text-[13px] font-bold">+ Novo Ofício</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6 py-4 border-b border-[#EEF0F4] bg-[#FAFBFC]">
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, assunto, destinatário ou protocolo..." className={`${input} flex-1 min-w-[220px]`} />
            <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className={input}>
              <option value="">Todos os anos</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={input}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(busca || filtroAno || filtroStatus) && (
              <button onClick={() => { setBusca(""); setFiltroAno(""); setFiltroStatus(""); }} className={`${input} text-xs text-gray-600`}>Limpar</button>
            )}
          </div>

          {erro && <p className="px-6 py-3 text-sm text-red-600 bg-red-50">{erro}</p>}

          {carregando ? (
            <div className="text-center py-16 text-gray-400">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Nenhum ofício encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#EEF0F4] text-left text-[11px] uppercase tracking-wide text-[#0D3B7A]">
                    {["Número", "Data", "Destinatário", "Assunto", "Protocolo", "Status", "Ações"].map((h, i) => (
                      <th key={h} className={`py-3 px-4 font-semibold ${i === 6 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((o, i) => {
                    const st = STATUS[o.status] ?? STATUS.rascunho;
                    const editavel = o.status === "rascunho" || o.status === "emitido";
                    return (
                      <tr key={o.id} className={`border-b border-[#EEF0F4] ${i % 2 ? "bg-[#FAFBFC]" : "bg-white"}`}>
                        <td className="py-3 px-4 font-mono font-semibold text-[#0D3B7A] whitespace-nowrap">{rotuloNumero(o)}</td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{dataDe(o)}</td>
                        <td className="py-3 px-4 text-gray-800">{o.destinatario ? `${o.destinatario.codigo} - ${o.destinatario.nome}` : "—"}</td>
                        <td className="py-3 px-4 text-gray-800 max-w-[260px] truncate" title={o.assunto}>{o.assunto}</td>
                        <td className="py-3 px-4">
                          {o.protocolo ? <span className="font-mono">{o.protocolo}</span>
                            : (o.status === "emitido") ? <button onClick={() => { setProtocolando(o); setProtocolo(""); }} className="text-[#1565C0] text-xs hover:underline">+ Lançar</button>
                            : "—"}
                        </td>
                        <td className="py-3 px-4"><span className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => router.push(`/oficios/pdf/${o.id}`)} className={`${btn} bg-[#E3F0FF] text-[#1565C0]`}>Ver / Imprimir</button>
                            {editavel && <button onClick={() => router.push(`/oficios/novo?editar=${o.id}`)} className={`${btn} bg-[#F5F7FA] text-gray-700 border !border-[#DDE3EC]`}>Editar</button>}
                            <button disabled={ocupado} onClick={() => duplicar(o)} className={`${btn} bg-[#F5F7FA] text-gray-700 border !border-[#DDE3EC]`}>Duplicar</button>
                            {o.protocolo && o.status === "protocolado" && <button onClick={() => { setProtocolando(o); setProtocolo(o.protocolo ?? ""); }} className={`${btn} bg-[#F5F7FA] text-gray-700 border !border-[#DDE3EC]`}>Protocolo</button>}
                            {o.status === "rascunho" && <button onClick={() => setExcluindo(o)} className={`${btn} bg-[#FFEBEE] text-[#C62828]`}>Excluir</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-6 py-3 text-xs text-gray-500 border-t border-[#EEF0F4]">
              <span>Página {pagina} de {totalPaginas}</span>
              <div className="flex gap-2">
                <button disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)} className={`${input} disabled:opacity-40`}>Anterior</button>
                <button disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)} className={`${input} disabled:opacity-40`}>Próxima</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {protocolando && (
        <Modal titulo="Lançar Protocolo" sub={<>Ofício: <strong>{protocolando.numero}</strong></>} onClose={() => setProtocolando(null)}
          acao={<button onClick={salvarProtocolo} disabled={ocupado} className="rounded-md px-4 py-2 text-[13px] font-bold text-white bg-[#1565C0] disabled:opacity-50">Salvar</button>}>
          <input autoFocus value={protocolo} onChange={(e) => setProtocolo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvarProtocolo()} placeholder="Número do protocolo (vazio remove)" className={`${input} w-full`} />
        </Modal>
      )}
      {excluindo && (
        <Modal titulo="Excluir rascunho" sub={<>Deseja excluir o <strong>{rotuloNumero(excluindo)}</strong>? Não poderá ser desfeito.</>} onClose={() => setExcluindo(null)}
          acao={<button onClick={excluir} disabled={ocupado} className="rounded-md px-4 py-2 text-[13px] font-bold text-white bg-[#C62828] disabled:opacity-50">Excluir</button>} />
      )}
    </div>
  );
}

function Modal({ titulo, sub, children, acao, onClose }: { titulo: string; sub?: React.ReactNode; children?: React.ReactNode; acao: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[10px] p-7 w-full max-w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b-[3px] border-[#F57C00] pb-3 mb-5">
          <h2 className="text-base font-bold text-[#0D3B7A]" style={{ fontFamily: "Georgia, serif" }}>{titulo}</h2>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        {children && <div className="mb-5">{children}</div>}
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-[13px] border border-[#DDE3EC] bg-[#F5F7FA] text-gray-700">Cancelar</button>
          {acao}
        </div>
      </div>
    </div>
  );
}
