import { AdminLayout } from "@/components/AdminLayout";
import { ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";

const mockTransfers = [
  { id: "1", work: "Midnight Dreams", from: "Luna Waves", to: "Neon Records", status: "Pending", date: "2026-03-10" },
  { id: "2", work: "Electric Soul", from: "Neon Drift", to: "Pulse Music", status: "Approved", date: "2026-03-08" },
  { id: "3", work: "Golden Hour", from: "Solar Flux", to: "Shine Entertainment", status: "Rejected", date: "2026-03-05" },
  { id: "4", work: "Velvet Sky", from: "Aurora Borealis", to: "Night Sky Records", status: "Pending", date: "2026-03-11" },
  { id: "5", work: "Deep Blue", from: "Coral Reef", to: "Ocean Sounds", status: "Approved", date: "2026-03-01" },
];

const statusConfig = {
  Pending: { icon: Clock, className: "bg-warning/15 text-warning" },
  Approved: { icon: CheckCircle2, className: "bg-success/15 text-success" },
  Rejected: { icon: XCircle, className: "bg-destructive/15 text-destructive" },
};

export default function TransfersPage() {
  return (
    <AdminLayout title="Transfer Requests" subtitle="Manage ownership transfers">
      <div className="space-y-4">
        {mockTransfers.map((transfer) => {
          const config = statusConfig[transfer.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;
          return (
            <div key={transfer.id} className="glass-card rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="font-medium text-foreground text-sm">{transfer.work}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{transfer.date}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{transfer.from}</span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="text-foreground font-medium">{transfer.to}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${config.className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {transfer.status}
                </span>
                {transfer.status === "Pending" && (
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors">Approve</button>
                    <button className="px-3 py-1.5 text-xs rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors">Reject</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
