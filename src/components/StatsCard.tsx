import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  gradient?: "primary" | "accent" | "success";
}

export function StatsCard({ title, value, change, changeType = "neutral", icon: Icon, gradient = "primary" }: StatsCardProps) {
  const gradientClass = {
    primary: "gradient-primary",
    accent: "gradient-accent",
    success: "gradient-success",
  }[gradient];

  return (
    <div className="glass-card rounded-xl p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{value}</p>
          {change && (
            <p className={cn(
              "text-xs mt-2 font-medium",
              changeType === "up" && "text-success",
              changeType === "down" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", gradientClass)}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}
