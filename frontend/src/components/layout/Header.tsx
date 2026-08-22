"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Bell, Shield, User, Sparkles } from "lucide-react";
import Link from "next/link";

interface Props {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: "ADMIN" | "WORKSPACE";
    plan?: string;
  };
}

export function Header({ user }: Props) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "U";

  const isDarkAdmin = user?.role === "ADMIN";

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-3">
        {/* Role Badge Indicator */}
        {isDarkAdmin ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-xs">
            <Shield className="h-3.5 w-3.5" /> Platform Admin Center
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Workspace Dashboard
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 gap-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 transition-all"
            >
              <Avatar className="h-8 w-8 rounded-xl shadow-xs">
                <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                <AvatarFallback
                  className={`rounded-xl text-white text-xs font-bold ${
                    isDarkAdmin
                      ? "bg-purple-700"
                      : "bg-gradient-to-tr from-indigo-600 to-purple-600"
                  }`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                  {user?.name || "Workspace Member"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-none mt-1">
                  {user?.plan || "Free"} Tier • {user?.role || "WORKSPACE"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-2xl p-1.5 border-slate-200 dark:border-slate-800 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg"
          >
            <div className="px-3 py-2.5">
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                {user?.name || "Workspace"}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

            {isDarkAdmin && (
              <>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-purple-50 text-purple-700 font-semibold text-xs">
                  <Link href="/admin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Platform Admin Center
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              </>
            )}

            <DropdownMenuItem asChild className="rounded-xl cursor-pointer hover:bg-slate-100 text-xs font-medium">
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-500" />
                Workspace Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl text-rose-600 focus:text-rose-700 focus:bg-rose-50 text-xs font-medium cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
