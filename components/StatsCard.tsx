import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
}

export function StatsCard({ label, value, subValue, icon: Icon, variant = "default" }: StatsCardProps) {
  const colorStyles = {
    default: "bg-zinc-800 text-zinc-400",
    success: "bg-emerald-500/10 text-emerald-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-red-500/10 text-red-500",
  };

  return (
    <Card className="bg-zinc-900 border-zinc-900 shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-400">{label}</p>
            <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
            {subValue && (
              <p className="text-xs font-medium mt-1 text-zinc-500">
                {subValue}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
