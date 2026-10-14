# Sistema de Ofícios — SCFC

Criação, controle e impressão de ofícios da Superintendência de Controle de Frotas e Combustível
(Prefeitura de Rondonópolis). Next.js 14 · Drizzle + Neon (Postgres) · NextAuth · TinyMCE.

## Rodando

```bash
cp .env.example .env.local     # preencha DATABASE_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_TINYMCE_API_KEY...
npm install
npm run db:push                # cria/atualiza as tabelas
npm run db:backfill            # só se já existem ofícios de antes (preenche a coluna "sequencia")
npm run db:seed                # usuário admin, destinatários, modelos e classificação orçamentária
npm run dev
```

Testes: `npm test` (lógica) · `npm run test:db` (numeração contra um Postgres **local**, ver `tests/numeracao-db.test.ts`) · `npm run typecheck`.

## Como funciona

**Ciclo de vida do ofício**

| Status | Pode editar texto | Pode excluir | Observação |
|---|---|---|---|
| `rascunho` | sim (salva sozinho a cada 45 s) | sim | **não tem número** |
| `emitido` | sim (número preservado) | não — cancelar | número atribuído na emissão |
| `protocolado` | não | não — cancelar | lançar protocolo move para este status |
| `cancelado` | não | não | exige motivo; o número **nunca** é reaproveitado |

**Numeração** — `NNN/AAAA/SCFC/ADMINISTRAÇÃO`, atribuída no ato de **emitir** (rascunhos e exclusões não deixam
buracos na sequência). Atribuição feita em uma única instrução SQL com índice único `(ano, sequencia)` e
nova tentativa em caso de conflito: duas pessoas emitindo ao mesmo tempo nunca recebem o mesmo número.
O último número do sistema anterior vem de `OFICIO_ULTIMO_NUMERO_LEGADO` e vale só para `OFICIO_ANO_LEGADO`;
nos demais anos a contagem começa em 001.

**Layout / ABNT** — todas as medidas ficam em `lib/layout.ts` (A4; margens esquerda 3 cm e direita 2 cm; fonte
Arial 12, entrelinha 1,5, texto justificado; papel timbrado de 47 mm no topo e 28 mm no rodapé, repetidos em
**todas** as páginas). Editor, pré-visualização e impressão usam o mesmo HTML/CSS (`lib/oficio-html.ts`),
então o que se vê é o que sai. "Página X de Y" é impresso a partir da 2ª página (Chrome/Edge 131+).

**Segurança** — páginas protegidas no servidor (`middleware.ts`); senhas com bcrypt (hashes MD5 antigos são
migrados automaticamente no primeiro login); Google só entra com e-mail já cadastrado ou em
`ALLOWED_EMAIL_DOMAINS`/`ALLOWED_EMAILS`; HTML dos ofícios é sanitizado ao salvar e ao ler.

## Estrutura

```
lib/layout.ts         medidas A4/ABNT (fonte única)
lib/oficio-html.ts    HTML de impressão e bloco de abertura (usado por editor, preview e impressão)
lib/numeracao*.ts     formato do número e emissão atômica
lib/sanitize.ts       sanitização do HTML do TinyMCE
lib/auth.ts           NextAuth (bcrypt, Google restrito)
components/OficioEditor.tsx   TinyMCE com folha A4
components/PrintPreview.tsx   pré-visualização + impressão por iframe (sem pop-up)
app/api/oficios/[id]/{emitir,cancelar,duplicar}
```

## Impressão

Use **Imprimir / Salvar PDF** na tela do ofício; na janela do navegador deixe margens em *Nenhuma* e marque
*Gráficos de segundo plano*. Para conferir o resultado sem o sistema: `npx tsx scripts/gerar-exemplo.ts`.
