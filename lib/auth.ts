import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Hash legado (MD5 sem sal) — aceito apenas para migrar a senha no primeiro login. */
function md5(texto: string) {
  return createHash("md5").update(texto).digest("hex");
}

function iguais(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function hashSenha(senha: string) {
  return bcrypt.hash(senha, 12);
}

export async function senhaConfere(senha: string, hash: string): Promise<{ ok: boolean; migrar: boolean }> {
  if (hash.startsWith("$2")) return { ok: await bcrypt.compare(senha, hash), migrar: false };
  return { ok: iguais(md5(senha), hash), migrar: true };
}

function lista(env?: string) {
  return (env || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Google só entra se o e-mail já tem cadastro OU está nos domínios/e-mails liberados. */
function emailLiberado(email: string) {
  const e = email.toLowerCase();
  return lista(process.env.ALLOWED_EMAILS).includes(e) || lista(process.env.ALLOWED_EMAIL_DOMAINS).includes(e.split("@")[1]);
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email e Senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.trim().toLowerCase()))
          .limit(1);
        if (!user?.senhaHash) return null;

        const { ok, migrar } = await senhaConfere(credentials.password, user.senhaHash);
        if (!ok) return null;
        if (migrar) {
          await db.update(users).set({ senhaHash: await hashSenha(credentials.password) }).where(eq(users.id, user.id));
        }
        return { id: String(user.id), email: user.email, name: user.nome };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase();
      if (!email || (profile as { email_verified?: boolean } | undefined)?.email_verified === false) return false;

      const [existente] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existente) return true;
      if (!emailLiberado(email)) return false;

      await db.insert(users).values({ email, nome: user.name || "Usuário", role: "user" });
      return true;
    },
    async jwt({ token, user }) {
      // No login, `user` existe; carregamos id e perfil uma vez e guardamos no token.
      if (user?.email) {
        const [u] = await db.select().from(users).where(eq(users.email, user.email.toLowerCase())).limit(1);
        if (u) {
          token.uid = u.id;
          token.role = u.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as number | undefined;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
};
