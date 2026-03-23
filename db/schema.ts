import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  senhaHash: text("senha_hash"),
  nome: varchar("nome", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const destinatarios = pgTable(
  "destinatarios",
  {
    id: serial("id").primaryKey(),
    codigo: varchar("codigo", { length: 10 }).notNull(),
    nome: text("nome").notNull(),
    endereco: text("endereco"),
    cidade: varchar("cidade", { length: 255 }),
    responsavel: text("responsavel"),
    cargo: varchar("cargo", { length: 255 }),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
  },
  (t) => ({
    codigoUnique: uniqueIndex("destinatarios_codigo_unique").on(t.codigo),
  })
);

export const classificacaoOrcamentaria = pgTable("classificacao_orcamentaria", {
  id: serial("id").primaryKey(),
  reduzido: varchar("reduzido", { length: 20 }).notNull().unique(),
  funcional: varchar("funcional", { length: 100 }),
  fonte: varchar("fonte", { length: 100 }),
  naturezaDespesa: text("natureza_despesa"),
  elemento: varchar("elemento", { length: 50 }),
  subelemento: varchar("subelemento", { length: 50 }),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  conteudo: text("conteudo").notNull().default(""),
  usaClassificacao: boolean("usa_classificacao").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const oficios = pgTable("oficios", {
  id: serial("id").primaryKey(),
  numero: varchar("numero", { length: 50 }).notNull(),
  ano: integer("ano").notNull(),
  assunto: text("assunto").notNull(),
  conteudo: text("conteudo").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("rascunho"),
  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),
  destinatarioId: integer("destinatario_id").references(() => destinatarios.id, {
    onDelete: "set null",
  }),
  autorId: integer("autor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reduzido: varchar("reduzido", { length: 20 }),
  classificacao: jsonb("classificacao"),
  valorEstimado: varchar("valor_estimado", { length: 100 }),
  protocolo: varchar("protocolo", { length: 100 }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Destinatario = typeof destinatarios.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Oficio = typeof oficios.$inferSelect;
export type ClassificacaoOrcamentaria = typeof classificacaoOrcamentaria.$inferSelect;