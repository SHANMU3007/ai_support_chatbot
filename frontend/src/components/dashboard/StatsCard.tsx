import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, description, trend, className }: Props) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shadow-xs">
          <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{description}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-1.5">
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              trend.positive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
            }`}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-[11px] text-slate-400">vs last week</span>
        </div>
      )}
    </div>
  );
}
