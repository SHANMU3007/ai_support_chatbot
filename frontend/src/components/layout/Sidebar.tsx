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
  Sparkles,
  Blocks
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chatbot", label: "Chatbots", icon: Bot },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/integrations", label: "Integrations", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-60 bg-black flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center mr-3 shadow-sm">
          <Blocks className="h-4 w-4 text-black" />
        </div>
        <div>
          <span className="font-bold text-white text-sm">SupportIQ</span>
          <p className="text-[10px] text-gray-400 leading-none mt-0.5">Enterprise Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                active
                  ? "bg-white text-black font-medium shadow-sm"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-black" : "text-gray-500"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="bg-gray-900 rounded-xl px-3 py-3 border border-gray-800">
          <p className="text-xs text-white font-medium">SupportIQ Core</p>
          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System Healthy
          </p>
        </div>
      </div>
    </div>
  );
}
