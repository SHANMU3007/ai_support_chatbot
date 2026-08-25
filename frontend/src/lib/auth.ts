import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";

export function isUserAdmin(email?: string | null, role?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.includes(cleanEmail)) return true;
  return role === "ADMIN";
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "p5/SUyOnvA0fIf1hjEEVAUlR8daxBcrXOH+4f17i5lw=",
  debug: false,
  logger: {
    error(code, metadata) {
      console.error("[NEXTAUTH_ERROR]", code, metadata);
    },
    warn(code) {
      console.warn("[NEXTAUTH_WARN]", code);
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: false,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "noreply@chatbot.ai",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[NEXTAUTH] signIn callback triggered for user:", user?.email);
      return true;
    },
    async jwt({ token, user }) {
      if (user && user.email) {
        token.email = user.email.toLowerCase().trim();
      }
      const email = token?.email || user?.email;
      if (email) {
        try {
          const cleanEmail = email.toLowerCase().trim();
          const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          const isConfiguredAdmin = adminEmails.includes(cleanEmail);

          let dbUser = await prisma.user.findUnique({
            where: { email: cleanEmail },
            select: { id: true, email: true, role: true, plan: true },
          });

          if (dbUser) {
            if (isConfiguredAdmin && (dbUser.role !== "ADMIN" || dbUser.plan !== "ENTERPRISE")) {
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: { role: "ADMIN", plan: "ENTERPRISE" },
                select: { id: true, email: true, role: true, plan: true },
              });
            }
            token.id = dbUser.id;
            token.email = dbUser.email;
            token.role = dbUser.role;
            token.plan = dbUser.plan;
          } else if (isConfiguredAdmin) {
            token.role = "ADMIN";
            token.plan = "ENTERPRISE";
          } else {
            token.role = "WORKSPACE";
            token.plan = "FREE";
          }
        } catch (e) {
          console.error("JWT user lookup error:", e);
        }
      } else if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.email) {
        if (!session.user) (session as any).user = {};
        session.user.email = token.email as string;
      }
      if (session?.user && session.user.email) {
        try {
          const email = session.user.email.toLowerCase().trim();
          const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          const isConfiguredAdmin = adminEmails.includes(email);

          let dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, plan: true, role: true },
          });

          if (dbUser) {
            if (isConfiguredAdmin && (dbUser.role !== "ADMIN" || dbUser.plan !== "ENTERPRISE")) {
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: { role: "ADMIN", plan: "ENTERPRISE" },
                select: { id: true, plan: true, role: true },
              });
            }

            (session.user as any).id = dbUser.id;
            (session.user as any).plan = dbUser.plan;
            (session.user as any).role = dbUser.role;
          } else {
            const fallbackId = (token?.id as string) || (token?.sub as string) || (session.user as any).id;
            (session.user as any).id = fallbackId;
            (session.user as any).plan = isConfiguredAdmin ? "ENTERPRISE" : (token?.plan as string) || "FREE";
            (session.user as any).role = isConfiguredAdmin ? "ADMIN" : (token?.role as string) || "WORKSPACE";
          }
        } catch (err) {
          console.error("Error resolving session user:", err);
          (session.user as any).id = (token?.id as string) || token?.sub;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login?verify=1",
  },
};

