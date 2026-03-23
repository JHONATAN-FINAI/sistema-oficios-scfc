import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

function md5(text: string) {
  return createHash("md5").update(text).digest("hex");
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email e Senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);
        const user = result[0];
        if (!user) return null;
        if (user.senhaHash !== md5(credentials.password)) return null;
        return { id: String(user.id), email: user.email, name: user.nome };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);
        if (!existing.length) {
          await db.insert(users).values({
            email: user.email!,
            nome: user.name || "Usuário",
            role: "user",
          });
        }
      }
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };