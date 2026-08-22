"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  BarChart3,
  Zap,
  Settings,
  Shield,
  Activity,
  AlertCircle,
  Users,
  Sparkles,
  LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";

const workspaceNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chatbot", label: "Chatbots", icon: Bot },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/feedback", label: "Resolution Center", icon: LifeBuoy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNavItems = [
  { href: "/admin", label: "Admin Overview", icon: Shield },
  { href: "/feedback", label: "Resolution Center", icon: LifeBuoy },
  { href: "/admin/workspaces", label: "Workspaces", icon: Users },
  { href: "/admin/followup", label: "Sentiment Queue", icon: AlertCircle },
  { href: "/admin/health", label: "System Health", icon: Activity },
];

export function Sidebar({ role }: { role?: "ADMIN" | "WORKSPACE" }) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-slate-950 flex flex-col border-r border-slate-800/80 shadow-xl select-none">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-base tracking-tight">Conciergo</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Support Concierge</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
        {/* Admin Navigation Section */}
        {role === "ADMIN" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                Platform Admin
              </p>
              <Sparkles className="h-3 w-3 text-purple-400" />
            </div>
            {adminNavItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                    active
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-600/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-purple-400" : "text-slate-500")} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Workspace Tools Section */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
            Workspace Tools
          </p>
          {workspaceNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-white" : "text-slate-500"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer System Status Card */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white font-semibold">Engine Status</p>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Groq + Qdrant • Operational</p>
        </div>
      </div>
    </div>
  );
}
