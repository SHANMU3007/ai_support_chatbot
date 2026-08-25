import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userEmail = session.user.email?.toLowerCase().trim();
  const userId = (session.user as any).id;

  let dbUser = null;
  if (userEmail || userId) {
    try {
      dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userId ? [{ id: userId }] : []),
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        select: { role: true },
      });
    } catch (err) {
      console.error("Failed to query DB user in AdminLayout:", err);
    }
  }

  const role = dbUser?.role || (session.user as any).role;
  const isAdmin = isUserAdmin(userEmail, role);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
