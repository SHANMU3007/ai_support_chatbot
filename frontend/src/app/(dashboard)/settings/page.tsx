import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id as string },
  });

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="grid gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Name</span>
            <span>{user.name || "Not set"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan</span>
            <Badge>{user.plan}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Member since</span>
            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Billing</h2>
        <p className="text-sm text-gray-500">
          You are on the <strong>{user.plan}</strong> plan.
        </p>
        <div className="mt-4 space-y-2">
          {[
            { plan: "FREE", price: "$0/mo", features: "1 chatbot, 500 msg/mo" },
            { plan: "STARTER", price: "$29/mo", features: "5 chatbots, 10K msg/mo" },
            { plan: "PRO", price: "$99/mo", features: "Unlimited, NL2SQL, n8n" },
          ].map((p) => (
            <div
              key={p.plan}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                user.plan === p.plan ? "border-indigo-600 bg-indigo-50" : "border-gray-200"
              }`}
            >
              <div>
                <span className="font-medium text-sm">{p.plan}</span>
                <span className="text-xs text-gray-500 ml-2">{p.features}</span>
              </div>
              <span className="text-sm font-semibold">{p.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
