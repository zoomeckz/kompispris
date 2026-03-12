import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Music,
  ArrowLeftRight,
  DollarSign,
  Wallet,
  HeadphonesIcon,
  Settings,
  LogOut,
  ChevronLeft,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Users", icon: Users, path: "/users" },
  { title: "Works", icon: Music, path: "/works" },
  { title: "Transfers", icon: ArrowLeftRight, path: "/transfers" },
  { title: "Revenue", icon: DollarSign, path: "/revenue" },
  { title: "Payouts", icon: Wallet, path: "/payouts" },
  { title: "Support", icon: HeadphonesIcon, path: "/support" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="gradient-primary rounded-lg p-2 flex-shrink-0">
          <Disc3 className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            SoundAdmin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-secondary text-primary animate-glow"
                  : "text-sidebar-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full">
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
