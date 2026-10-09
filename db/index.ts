import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Durante o `next build` o banco não é consultado; em execução a URL é obrigatória.
const emBuild = process.env.NEXT_PHASE === "phase-production-build";
const url =
  process.env.DATABASE_URL ||
  (emBuild ? "postgresql://dummy:dummy@ep-dummy-db.us-east-1.aws.neon.tech/neondb?sslmode=require" : "");

if (!url) {
  throw new Error("DATABASE_URL não definida. Copie .env.example para .env.local e preencha.");
}

export const db = drizzle(neon(url), { schema });
