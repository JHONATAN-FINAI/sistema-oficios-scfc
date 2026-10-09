/** fetch JSON com tratamento de erro padronizado (lança Error com a mensagem do servidor). */
export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...resto } = init ?? {};
  const res = await fetch(url, {
    ...resto,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(resto.headers ?? {}) } : resto.headers,
    body: json !== undefined ? JSON.stringify(json) : resto.body,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Sessão expirada.");
  }
  const dados = await res.json().catch(() => null);
  if (!res.ok) throw new Error(dados?.message || dados?.error || `Erro ${res.status}`);
  return dados as T;
}

export const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  rascunho: { label: "Rascunho", bg: "#F5F5F5", color: "#616161" },
  emitido: { label: "Emitido", bg: "#E3F0FF", color: "#1565C0" },
  protocolado: { label: "Protocolado", bg: "#E8F5E9", color: "#2E7D32" },
  cancelado: { label: "Cancelado", bg: "#FFEBEE", color: "#C62828" },
};

export function rotuloNumero(o: { numero: string | null; id: number }) {
  return o.numero ?? `Rascunho nº ${o.id}`;
}
