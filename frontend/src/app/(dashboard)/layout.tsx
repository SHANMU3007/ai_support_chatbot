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
  if (!session) {
    redirect("/login");
  }

  // Failsafe DB role resolution
  const adminEmails = (process.env.ADMIN_EMAILS || "shanmugapatelkani@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, plan: true },
  });

  const isConfiguredAdmin =
    session.user.email && adminEmails.includes(session.user.email.toLowerCase());

  const effectiveRole: "ADMIN" | "WORKSPACE" =
    isConfiguredAdmin || dbUser?.role === "ADMIN" ? "ADMIN" : "WORKSPACE";
  const effectivePlan = dbUser?.plan || session.user.plan || (effectiveRole === "ADMIN" ? "ENTERPRISE" : "FREE");

  const effectiveUser = {
    ...session.user,
    role: effectiveRole,
    plan: effectivePlan,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role={effectiveRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={effectiveUser} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
