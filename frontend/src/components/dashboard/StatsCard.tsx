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
    <div className={cn("bg-white rounded-xl border p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-indigo-600" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      {trend && (
        <p className={`text-xs mt-1 ${trend.positive ? "text-green-600" : "text-red-500"}`}>
          {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs last week
        </p>
      )}
    </div>
  );
}
