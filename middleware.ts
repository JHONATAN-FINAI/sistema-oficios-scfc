import { withAuth } from "next-auth/middleware";

// Protege as páginas no servidor (antes só havia redirecionamento no navegador).
// As rotas /api validam a sessão por conta própria e respondem 401.
export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: ["/dashboard/:path*", "/oficios/:path*", "/destinatarios/:path*"],
};
