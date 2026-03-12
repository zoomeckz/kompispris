import { AdminLayout } from "@/components/AdminLayout";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

const mockPayouts = [
  { id: "1", artist: "Luna Waves", amount: "$4,320.50", method: "Bank Transfer", status: "Completed", date: "2026-03-01" },
  { id: "2", artist: "Neon Drift", amount: "$2,180.00", method: "PayPal", status: "Processing", date: "2026-03-05" },
  { id: "3", artist: "Solar Flux", amount: "$1,890.75", method: "Bank Transfer", status: "Completed", date: "2026-02-28" },
  { id: "4", artist: "Coral Reef", amount: "$3,450.00", method: "Wire Transfer", status: "Failed", date: "2026-03-03" },
  { id: "5", artist: "DJ Shadow", amount: "$5,720.25", method: "Bank Transfer", status: "Completed", date: "2026-03-01" },
  { id: "6", artist: "Circuit Break", amount: "$980.00", method: "PayPal", status: "Processing", date: "2026-03-10" },
];

const statusConfig = {
  Completed: { icon: CheckCircle2, className: "bg-success/15 text-success" },
  Processing: { icon: Clock, className: "bg-warning/15 text-warning" },
  Failed: { icon: AlertCircle, className: "bg-destructive/15 text-destructive" },
};

export default function PayoutsPage() {
  return (
    <AdminLayout title="Payouts" subtitle="Artist payout management">
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Artist</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockPayouts.map((payout) => {
              const config = statusConfig[payout.status as keyof typeof statusConfig];
              const StatusIcon = config.icon;
              return (
                <tr key={payout.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {payout.artist.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-sm font-medium text-foreground">{payout.artist}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm font-medium text-foreground">{payout.amount}</td>
                  <td className="py-3 px-5 text-sm text-muted-foreground">{payout.method}</td>
                  <td className="py-3 px-5 text-sm text-muted-foreground">{payout.date}</td>
                  <td className="py-3 px-5">
                    <span className={`flex items-center gap-1.5 w-fit text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {payout.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
