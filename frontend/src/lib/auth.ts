import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
  callbacks: {
    async session({ session, user }) {
      if (session?.user && user?.id) {
        session.user.id = user.id;

        try {
          const email = user?.email || session.user?.email;
          const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

          let dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { plan: true, role: true },
          });

          const isConfiguredAdmin = email && adminEmails.includes(email.toLowerCase());

          if (isConfiguredAdmin && dbUser?.role !== "ADMIN") {
            dbUser = await prisma.user.update({
              where: { id: user.id },
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
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login?verify=1",
  },
  session: {
    strategy: "database",
  },
};
