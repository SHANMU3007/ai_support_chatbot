import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  if (!userId) {
    redirect("/login");
  }

  // Failsafe DB role resolution
  const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = session.user.email?.toLowerCase();
  let dbUser = null;
  try {
    dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
      select: { role: true, plan: true },
    });
  } catch (err) {
    console.error("Failed to load user in DashboardLayout:", err);
  }

  const isConfiguredAdmin =
    Boolean(session.user.email && adminEmails.includes(session.user.email.toLowerCase()));

  const effectiveRole: "ADMIN" | "WORKSPACE" =
    isConfiguredAdmin || dbUser?.role === "ADMIN" ? "ADMIN" : "WORKSPACE";
  const effectivePlan = dbUser?.plan || (session.user as any).plan || (effectiveRole === "ADMIN" ? "ENTERPRISE" : "FREE");

  const effectiveUser = {
    ...session.user,
    role: effectiveRole,
    plan: effectivePlan,
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar role={effectiveRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={effectiveUser} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
