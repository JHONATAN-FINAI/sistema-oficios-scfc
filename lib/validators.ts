import { z } from "zod";

const idOpcional = z.number().int().positive().nullable().optional();

export const oficioSchema = z.object({
  assunto: z.string().trim().min(1, "Informe o assunto").max(500),
  conteudo: z.string().max(500_000),
  templateId: idOpcional,
  destinatarioId: idOpcional,
  reduzido: z.string().max(20).nullable().optional(),
  classificacao: z.record(z.string(), z.unknown()).nullable().optional(),
  valorEstimado: z.string().max(100).nullable().optional(),
});

export const atualizarOficioSchema = oficioSchema.partial().extend({
  protocolo: z.string().trim().max(100).nullable().optional(),
});

export const cancelarSchema = z.object({
  motivo: z.string().trim().min(5, "Informe o motivo do cancelamento (mín. 5 caracteres)").max(1000),
});
