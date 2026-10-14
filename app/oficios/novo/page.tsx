"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import OficioEditor, { OficioEditorHandle } from "@/components/OficioEditor";
import PrintPreview from "@/components/PrintPreview";
import { api, rotuloNumero } from "@/lib/client";
import { montarAberturaHtml, gerarHtmlOficio } from "@/lib/oficio-html";
import { Classificacao, montarQuadroHtml } from "@/lib/quadro-orcamentario";

interface Template { id: number; nome: string; conteudo: string; usaClassificacao: boolean }
interface Destinatario { id: number; codigo: string; nome: string; endereco: string | null; cidade: string | null; responsavel: string | null; cargo: string | null }
interface OficioSalvo { id: number; numero: string | null; status: string; emitidoEm: string | null }

const AUTOSAVE_MS = 45_000;
const campo = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function NovoOficio() {
  const { status } = useSession();
  const router = useRouter();
  const editId = Number(useSearchParams().get("editar")) || null;
  const editor = useRef<OficioEditorHandle>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [pronto, setPronto] = useState(false);
  const [conteudoInicial, setConteudoInicial] = useState("");
  const [oficio, setOficio] = useState<OficioSalvo | null>(null);
  const [previsao, setPrevisao] = useState("");

  const [templateId, setTemplateId] = useState("");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [reduzido, setReduzido] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [classificacao, setClassificacao] = useState<Classificacao | null>(null);
  const [erroClassificacao, setErroClassificacao] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  const usaClassificacao = templates.find((t) => t.id === Number(templateId))?.usaClassificacao ?? false;
  const destinatario = destinatarios.find((d) => d.id === Number(destinatarioId)) ?? null;
  const editavel = !oficio || oficio.status === "rascunho" || oficio.status === "emitido";
  const dataOficio = oficio?.emitidoEm ?? new Date().toISOString();

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  // Carrega listas e (se for edição) o ofício ANTES de montar o editor: sem corridas de setContent.
  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const [t, d, p] = await Promise.all([
          api<Template[]>("/api/templates"),
          api<Destinatario[]>("/api/destinatarios"),
          api<{ numero: string }>("/api/oficios/proximo-numero"),
        ]);
        setTemplates(t); setDestinatarios(d); setPrevisao(p.numero);

        if (editId) {
          const o = await api<any>(`/api/oficios/${editId}`);
          if (o.status === "protocolado" || o.status === "cancelado") {
            router.replace(`/oficios/pdf/${editId}`);
            return;
          }
          setOficio({ id: o.id, numero: o.numero, status: o.status, emitidoEm: o.emitidoEm });
          setTemplateId(o.templateId?.toString() ?? "");
          setDestinatarioId(o.destinatarioId?.toString() ?? "");
          setAssunto(o.assunto);
          setReduzido(o.reduzido ?? "");
          setValorEstimado(o.valorEstimado ?? "");
          setClassificacao(o.classificacao ?? null);
          setConteudoInicial(o.conteudo);
        }
        setPronto(true);
      } catch (e: any) {
        setAviso({ tipo: "erro", texto: e.message });
      }
    })();
  }, [status, editId, router]);

  const marcarSujo = useCallback(() => setSujo(true), []);

  /** Salva (cria ou atualiza). Retorna o ofício salvo ou null em caso de erro/validação. */
  const salvar = useCallback(async (silencioso = false): Promise<OficioSalvo | null> => {
    if (!assunto.trim()) {
      if (!silencioso) setAviso({ tipo: "erro", texto: "Informe o assunto do ofício." });
      return null;
    }
    if (!editor.current || editor.current.isEmpty()) {
      if (!silencioso) setAviso({ tipo: "erro", texto: "O conteúdo do ofício está vazio." });
      return null;
    }
    setSalvando(true);
    try {
      const payload = {
        templateId: templateId ? Number(templateId) : null,
        destinatarioId: destinatarioId ? Number(destinatarioId) : null,
        assunto: assunto.trim(),
        conteudo: editor.current.getContent(),
        reduzido: reduzido || null,
        classificacao: classificacao ?? null,
        valorEstimado: valorEstimado || null,
      };
      const salvo = oficio
        ? await api<any>(`/api/oficios/${oficio.id}`, { method: "PUT", json: payload })
        : await api<any>("/api/oficios", { method: "POST", json: payload });
      const resumo = { id: salvo.id, numero: salvo.numero, status: salvo.status, emitidoEm: salvo.emitidoEm };
      setOficio(resumo);
      setSujo(false);
      if (!oficio) window.history.replaceState(null, "", `/oficios/novo?editar=${salvo.id}`);
      setAviso({ tipo: "ok", texto: `${silencioso ? "Salvo automaticamente" : "Salvo"} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` });
      return resumo;
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: `Não foi possível salvar: ${e.message}` });
      return null;
    } finally {
      setSalvando(false);
    }
  }, [assunto, templateId, destinatarioId, reduzido, classificacao, valorEstimado, oficio]);

  // Atalho Ctrl/Cmd+S, autosave de rascunhos e aviso ao sair com alterações pendentes.
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); salvarRef.current(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);
  useEffect(() => {
    if (!sujo || (oficio && oficio.status !== "rascunho")) return;
    const t = setTimeout(() => salvarRef.current(true), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [sujo, oficio, assunto, templateId, destinatarioId]);
  useEffect(() => {
    const sair = (e: BeforeUnloadEvent) => { if (sujo) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", sair);
    return () => window.removeEventListener("beforeunload", sair);
  }, [sujo]);

  function trocarModelo(id: string) {
    const novo = templates.find((t) => t.id === Number(id));
    if (novo && editor.current && !editor.current.isEmpty()) {
      if (!confirm("Substituir o texto atual pelo modelo selecionado?")) return;
    }
    setTemplateId(id);
    marcarSujo();
    if (novo) {
      editor.current?.setContent(novo.conteudo);
      if (!novo.usaClassificacao) { setClassificacao(null); setReduzido(""); }
    }
  }

  async function buscarClassificacao() {
    if (!reduzido.trim()) { setErroClassificacao("Informe o número do reduzido."); return; }
    setBuscando(true); setErroClassificacao(""); setClassificacao(null);
    try { setClassificacao(await api<Classificacao>(`/api/classificacao/${encodeURIComponent(reduzido.trim())}`)); }
    catch { setErroClassificacao("Reduzido não encontrado."); }
    finally { setBuscando(false); }
  }

  function inserirQuadro() {
    if (!classificacao) { setErroClassificacao("Busque a classificação antes de inserir."); return; }
    editor.current?.insertContent(montarQuadroHtml(classificacao, valorEstimado));
    marcarSujo();
  }

  const aberturaHtml = useMemo(
    () => montarAberturaHtml({ numero: oficio?.numero ?? null, data: dataOficio, assunto, destinatario }),
    [oficio?.numero, dataOficio, assunto, destinatario]
  );

  function visualizar() {
    setPrevia(
      gerarHtmlOficio(
        {
          numero: oficio?.numero ?? null,
          status: oficio?.status ?? "rascunho",
          data: dataOficio,
          assunto,
          conteudo: editor.current?.getContent() ?? "",
          destinatario,
        },
        { baseUrl: window.location.origin }
      )
    );
  }

  async function salvarEEmitir() {
    if (!confirm(`Emitir o ofício? Será atribuído o próximo número (previsto: ${previsao}) e ele não poderá ser excluído, apenas cancelado.`)) return;
    const salvo = await salvar();
    if (!salvo) return;
    try {
      await api(`/api/oficios/${salvo.id}/emitir`, { method: "POST" });
      setSujo(false);
      router.push(`/oficios/pdf/${salvo.id}`);
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: e.message });
    }
  }

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{oficio ? "Editar Ofício" : "Novo Ofício"}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {oficio?.numero
                ? <>Ofício <strong>{oficio.numero}</strong> — as alterações mantêm o mesmo número.</>
                : <>{oficio ? rotuloNumero(oficio) : "Novo rascunho"} — o número é atribuído ao <strong>emitir</strong> (previsão: {previsao || "…"}).</>}
            </p>
          </div>
          <button onClick={() => router.push("/oficios/historico")} className="text-sm text-gray-500 hover:text-gray-700">← Histórico</button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {oficio?.status === "emitido" && (
            <div className="text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded-md px-3 py-2">
              Este ofício já foi emitido. Você pode ajustá-lo; o número <strong>{oficio.numero}</strong> será preservado.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Ofício</label>
              <select value={templateId} onChange={(e) => trocarModelo(e.target.value)} disabled={!editavel} className={campo}>
                <option value="">-- Selecione um modelo --</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinatário</label>
              <select value={destinatarioId} onChange={(e) => { setDestinatarioId(e.target.value); marcarSujo(); }} disabled={!editavel} className={campo}>
                <option value="">-- Selecione o destinatário --</option>
                {destinatarios.map((d) => <option key={d.id} value={d.id}>{d.codigo} - {d.nome}</option>)}
              </select>
              {destinatario?.endereco && <p className="text-xs text-gray-400 mt-1">{destinatario.endereco}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto <span className="text-red-500">*</span></label>
            <input type="text" value={assunto} maxLength={500} disabled={!editavel} onChange={(e) => { setAssunto(e.target.value); marcarSujo(); }} placeholder="Descreva o assunto do ofício" className={campo} />
          </div>

          {usaClassificacao && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800">Classificação Orçamentária</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Reduzido</label>
                  <input type="text" value={reduzido} placeholder="Ex: 789" className={campo}
                    onChange={(e) => { setReduzido(e.target.value); setErroClassificacao(""); setClassificacao(null); marcarSujo(); }}
                    onKeyDown={(e) => e.key === "Enter" && buscarClassificacao()} />
                </div>
                <button onClick={buscarClassificacao} disabled={buscando} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">{buscando ? "Buscando..." : "Buscar"}</button>
              </div>
              {erroClassificacao && <p className="text-sm text-red-600">{erroClassificacao}</p>}
              {classificacao && (
                <div className="bg-white rounded border border-blue-200 p-3 space-y-1 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="font-medium text-gray-600">Funcional:</span> {classificacao.funcional}</div>
                    <div><span className="font-medium text-gray-600">Fonte:</span> {classificacao.fonte}</div>
                    <div><span className="font-medium text-gray-600">Elemento:</span> {classificacao.elemento}</div>
                    <div><span className="font-medium text-gray-600">Subelemento:</span> {classificacao.subelemento || "—"}</div>
                    <div className="col-span-2"><span className="font-medium text-gray-600">Natureza:</span> {classificacao.naturezaDespesa}</div>
                  </div>
                  <div className="mt-2 flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor Estimado</label>
                      <input type="text" value={valorEstimado} onChange={(e) => { setValorEstimado(e.target.value); marcarSujo(); }} placeholder="Ex: R$ 15.000,00" className={campo} />
                    </div>
                    <button onClick={inserirQuadro} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">Inserir Quadro no Ofício</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo do Ofício</label>
            {pronto ? (
              <OficioEditor ref={editor} valorInicial={conteudoInicial} aberturaHtml={aberturaHtml} somenteLeitura={!editavel} onChange={marcarSujo} />
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-md">Carregando editor…</div>
            )}
            <p className="text-xs text-gray-400 mt-2">Linhas vermelhas = quebra de página (A4, margens ABNT: 3 cm à esquerda, 2 cm à direita). Ctrl+S salva; rascunhos são salvos automaticamente.</p>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
            <div className="text-sm min-h-[20px]" role="status">
              {aviso && <span className={aviso.tipo === "erro" ? "text-red-600" : "text-green-700"}>{aviso.texto}</span>}
              {!aviso && sujo && <span className="text-amber-600">Alterações não salvas</span>}
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={visualizar} disabled={!pronto} className="px-5 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50">Visualizar / Imprimir</button>
              {editavel && (
                <button onClick={() => salvar()} disabled={salvando || !pronto} className="px-5 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50">
                  {salvando ? "Salvando..." : oficio?.status === "emitido" ? "Salvar alterações" : "Salvar rascunho"}
                </button>
              )}
              {(!oficio || oficio.status === "rascunho") && (
                <button onClick={salvarEEmitir} disabled={salvando || !pronto} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Salvar e emitir</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {previa && (
        <div className="fixed inset-0 z-50 bg-[#525659] overflow-auto">
          <PrintPreview html={previa} onClose={() => setPrevia(null)} />
        </div>
      )}
    </div>
  );
}

export default function NovoOficioPage() {
  return (
    <Suspense fallback={null}>
      <NovoOficio />
    </Suspense>
  );
}
