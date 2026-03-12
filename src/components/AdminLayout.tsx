import { AdminSidebar } from "./AdminSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="pl-[260px] transition-all duration-300">
        {/* Top Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
          <div>
            <h1 className="font-display font-bold text-lg text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 w-64 bg-secondary border-border text-sm"
              />
            </div>
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full gradient-primary" />
            </button>
            <div className="h-9 w-9 rounded-full gradient-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
              SA
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
