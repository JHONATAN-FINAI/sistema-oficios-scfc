"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PrintPreview from "@/components/PrintPreview";
import { api, rotuloNumero, STATUS } from "@/lib/client";
import { gerarHtmlOficio } from "@/lib/oficio-html";

interface Oficio {
  id: number; numero: string | null; status: string; assunto: string; conteudo: string;
  protocolo: string | null; criadoEm: string; emitidoEm: string | null; motivoCancelamento: string | null;
  destinatario: { nome: string; endereco: string | null; cidade: string | null; responsavel: string | null; cargo: string | null } | null;
}

const botao = "px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50";

export default function VisualizarOficioPage() {
  const { status } = useSession();
  const router = useRouter();
  const id = useParams().id as string;
  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  useEffect(() => {
    if (status !== "authenticated") return;
    api<Oficio>(`/api/oficios/${id}`).then(setOficio).catch(() => router.replace("/oficios/historico"));
  }, [id, status, router]);

  const html = useMemo(
    () =>
      oficio
        ? gerarHtmlOficio(
            {
              numero: oficio.numero, status: oficio.status,
              data: oficio.emitidoEm ?? new Date().toISOString(),
              assunto: oficio.assunto, conteudo: oficio.conteudo,
              destinatario: oficio.destinatario, protocolo: oficio.protocolo,
            },
            { baseUrl: typeof window !== "undefined" ? window.location.origin : "" }
          )
        : "",
    [oficio]
  );

  async function acao(fn: () => Promise<unknown>) {
    setOcupado(true); setErro("");
    try { await fn(); } catch (e: any) { setErro(e.message); } finally { setOcupado(false); }
  }

  const emitir = () => acao(async () => {
    if (!confirm("Emitir o ofício? Será atribuído o próximo número e ele não poderá ser excluído, apenas cancelado.")) return;
    setOficio({ ...oficio!, ...(await api<Partial<Oficio>>(`/api/oficios/${id}/emitir`, { method: "POST" })) });
  });
  const duplicar = () => acao(async () => {
    const novo = await api<{ id: number }>(`/api/oficios/${id}/duplicar`, { method: "POST" });
    router.push(`/oficios/novo?editar=${novo.id}`);
  });
  const cancelar = () => acao(async () => {
    const r = await api<Partial<Oficio>>(`/api/oficios/${id}/cancelar`, { method: "POST", json: { motivo } });
    setOficio({ ...oficio!, ...r }); setCancelando(false); setMotivo("");
  });

  if (status === "loading" || !oficio) return null;
  const st = STATUS[oficio.status] ?? STATUS.rascunho;
  const editavel = oficio.status === "rascunho" || oficio.status === "emitido";

  return (
    <div className="min-h-screen bg-[#525659] flex flex-col">
      <div className="bg-white shadow sticky top-0 z-20">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[#0D3B7A]" style={{ fontFamily: "Georgia, serif" }}>
              {rotuloNumero(oficio)}{" "}
              <span className="ml-2 align-middle text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </h1>
            <p className="text-xs text-gray-500 truncate max-w-[60ch]">{oficio.assunto}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={botao} onClick={() => router.push("/oficios/historico")}>← Histórico</button>
            {editavel && <button className={botao} onClick={() => router.push(`/oficios/novo?editar=${oficio.id}`)}>Editar</button>}
            <button className={botao} disabled={ocupado} onClick={duplicar}>Duplicar</button>
            {oficio.status === "rascunho" && (
              <button disabled={ocupado} onClick={emitir} className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Emitir ofício</button>
            )}
            {(oficio.status === "emitido" || oficio.status === "protocolado") && (
              <button className="px-3 py-2 text-sm rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => setCancelando(true)}>Cancelar ofício</button>
            )}
          </div>
        </div>
        {(erro || oficio.status === "cancelado") && (
          <div className="max-w-6xl mx-auto px-6 pb-3 text-sm">
            {erro && <p className="text-red-600">{erro}</p>}
            {oficio.status === "cancelado" && <p className="text-red-700">Cancelado. Motivo: {oficio.motivoCancelamento}</p>}
          </div>
        )}
      </div>

      <PrintPreview html={html} />

      {cancelando && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-bold text-red-700 mb-1" style={{ fontFamily: "Georgia, serif" }}>Cancelar ofício</h2>
            <p className="text-sm text-gray-600 mb-3">O número <strong>{oficio.numero}</strong> será mantido no histórico como cancelado e não será reutilizado.</p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Motivo do cancelamento (obrigatório)" className="w-full border border-gray-300 rounded-md p-2 text-sm mb-3" />
            <div className="flex justify-end gap-2">
              <button className={botao} onClick={() => setCancelando(false)}>Voltar</button>
              <button disabled={ocupado || motivo.trim().length < 5} onClick={cancelar} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Confirmar cancelamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
