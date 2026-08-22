import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";

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
      allowDangerousEmailAccountLinking: true,
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
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const userId = (token?.id as string) || token?.sub || (session.user as any).id;
        if (userId) {
          (session.user as any).id = userId;

          try {
            const email = session.user?.email;
            const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
              .split(",")
              .map((e) => e.trim().toLowerCase())
              .filter(Boolean);

            let dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { plan: true, role: true },
            });

            const isConfiguredAdmin = Boolean(email && adminEmails.includes(email.toLowerCase()));

            if (isConfiguredAdmin && dbUser && dbUser.role !== "ADMIN") {
              dbUser = await prisma.user.update({
                where: { id: userId },
                data: { role: "ADMIN", plan: "ENTERPRISE" },
                select: { plan: true, role: true },
              });
            }

            (session.user as any).plan = dbUser?.plan ?? "FREE";
            (session.user as any).role = dbUser?.role ?? (isConfiguredAdmin ? "ADMIN" : "WORKSPACE");
          } catch (err) {
            console.error("Error resolving session user role:", err);
          }
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

