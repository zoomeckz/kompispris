import { AdminLayout } from "@/components/AdminLayout";
import { StatsCard } from "@/components/StatsCard";
import { Music, Users, DollarSign, TrendingUp, ArrowLeftRight, Headphones } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 48000 },
  { month: "Mar", revenue: 55000 },
  { month: "Apr", revenue: 51000 },
  { month: "May", revenue: 63000 },
  { month: "Jun", revenue: 72000 },
  { month: "Jul", revenue: 68000 },
];

const streamsData = [
  { day: "Mon", streams: 12400 },
  { day: "Tue", streams: 15200 },
  { day: "Wed", streams: 13800 },
  { day: "Thu", streams: 18900 },
  { day: "Fri", streams: 22100 },
  { day: "Sat", streams: 25600 },
  { day: "Sun", streams: 21300 },
];

const recentWorks = [
  { title: "Midnight Dreams", artist: "Luna Waves", isrc: "USRC12345678", status: "Live" },
  { title: "Electric Soul", artist: "Neon Drift", isrc: "USRC12345679", status: "Processing" },
  { title: "Golden Hour", artist: "Solar Flux", isrc: "USRC12345680", status: "Live" },
  { title: "Deep Blue", artist: "Coral Reef", isrc: "USRC12345681", status: "Review" },
];

export default function Dashboard() {
  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back, Super Admin">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard title="Total Works" value="12,847" change="+284 this month" changeType="up" icon={Music} gradient="primary" />
        <StatsCard title="Active Users" value="3,492" change="+12.5% vs last month" changeType="up" icon={Users} gradient="accent" />
        <StatsCard title="Monthly Revenue" value="$72,340" change="+18.2% vs last month" changeType="up" icon={DollarSign} gradient="success" />
        <StatsCard title="Transfers" value="156" change="23 pending" changeType="neutral" icon={ArrowLeftRight} gradient="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190 80% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(190 80% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
              <XAxis dataKey="month" stroke="hsl(215 12% 50%)" fontSize={12} />
              <YAxis stroke="hsl(215 12% 50%)" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 12%)", border: "1px solid hsl(220 14% 18%)", borderRadius: "8px", color: "hsl(210 20% 92%)" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(190 80% 50%)" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Weekly Streams</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={streamsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
              <XAxis dataKey="day" stroke="hsl(215 12% 50%)" fontSize={12} />
              <YAxis stroke="hsl(215 12% 50%)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 12%)", border: "1px solid hsl(220 14% 18%)", borderRadius: "8px", color: "hsl(210 20% 92%)" }}
              />
              <Bar dataKey="streams" fill="hsl(270 60% 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Works */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Recent Works</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Artist</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">ISRC</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentWorks.map((work) => (
                <tr key={work.isrc} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                      <Headphones className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-medium text-foreground text-sm">{work.title}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{work.artist}</td>
                  <td className="py-3 px-4 text-sm font-mono text-muted-foreground">{work.isrc}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      work.status === "Live"
                        ? "bg-success/15 text-success"
                        : work.status === "Processing"
                        ? "bg-warning/15 text-warning"
                        : "bg-accent/15 text-accent"
                    }`}>
                      {work.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
