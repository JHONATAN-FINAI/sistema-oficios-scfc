"use client";

import { useRef, useState } from "react";
import { PAGINA } from "@/lib/layout";

interface Props {
  html: string;
  onClose?: () => void;
  /** botões extras na barra (ex.: emitir) */
  children?: React.ReactNode;
}

/**
 * Mostra o documento EXATAMENTE como será impresso (mesmo HTML da impressão) em um iframe
 * e imprime/gera PDF a partir dele — sem pop-ups, que o navegador costuma bloquear.
 */
export default function PrintPreview({ html, onClose, children }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [altura, setAltura] = useState<number>(PAGINA.altura);

  function ajustarAltura() {
    const d = frame.current?.contentDocument;
    if (d) setAltura(Math.max(PAGINA.altura, d.documentElement.scrollHeight));
  }

  function imprimir() {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  }

  return (
    <div className="flex flex-col bg-[#525659]" style={{ minHeight: "100%" }}>
      <div className="flex flex-wrap items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <p className="text-xs text-gray-500 flex-1 min-w-[220px]">
          As linhas vermelhas indicam onde cada página quebra. Na janela de impressão escolha <strong>Salvar como PDF</strong> para gerar o arquivo.
        </p>
        {children}
        <button onClick={imprimir} className="px-4 py-2 text-sm font-semibold text-white rounded-md bg-gradient-to-br from-[#0D3B7A] to-[#1565C0] hover:opacity-90">
          🖨 Imprimir / Salvar PDF
        </button>
        {onClose && (
          <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
            Fechar
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto flex justify-center py-6 px-2">
        <iframe
          ref={frame}
          title="Pré-visualização do ofício"
          srcDoc={html}
          onLoad={ajustarAltura}
          style={{ width: PAGINA.largura, height: altura, border: 0, background: "#fff", flexShrink: 0 }}
        />
      </div>
    </div>
  );
}
