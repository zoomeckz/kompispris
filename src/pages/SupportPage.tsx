import { AdminLayout } from "@/components/AdminLayout";
import { MessageSquare, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const mockTickets = [
  { id: "T-1001", subject: "Cannot upload cover art", user: "Luna Waves", priority: "High", status: "Open", date: "2026-03-11" },
  { id: "T-1002", subject: "ISRC not found for my track", user: "Neon Drift", priority: "Medium", status: "Open", date: "2026-03-10" },
  { id: "T-1003", subject: "Payout delayed", user: "Solar Flux", priority: "High", status: "In Progress", date: "2026-03-09" },
  { id: "T-1004", subject: "Wrong royalty calculation", user: "Coral Reef", priority: "Critical", status: "Open", date: "2026-03-08" },
  { id: "T-1005", subject: "Account access issue", user: "DJ Shadow", priority: "Low", status: "Resolved", date: "2026-03-05" },
];

const priorityColors = {
  Critical: "bg-destructive/15 text-destructive",
  High: "bg-warning/15 text-warning",
  Medium: "bg-primary/15 text-primary",
  Low: "bg-muted text-muted-foreground",
};

const statusIcons = {
  Open: Clock,
  "In Progress": MessageSquare,
  Resolved: CheckCircle2,
};

export default function SupportPage() {
  return (
    <AdminLayout title="Support" subtitle="Manage support tickets">
      <div className="space-y-3">
        {mockTickets.map((ticket) => {
          const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || Clock;
          return (
            <div key={ticket.id} className="glass-card rounded-xl p-5 flex items-center justify-between hover:bg-secondary/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-5">
                <span className="text-xs font-mono text-muted-foreground w-16">{ticket.id}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ticket.user} · {ticket.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}>
                  {ticket.priority}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <StatusIcon className="h-3.5 w-3.5" />
                  {ticket.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
