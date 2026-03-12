import { AdminLayout } from "@/components/AdminLayout";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, TrendingUp, CreditCard, PiggyBank } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyRevenue = [
  { month: "Aug", revenue: 38000, expenses: 12000 },
  { month: "Sep", revenue: 42000, expenses: 14000 },
  { month: "Oct", revenue: 48000, expenses: 13000 },
  { month: "Nov", revenue: 55000, expenses: 15000 },
  { month: "Dec", revenue: 63000, expenses: 16000 },
  { month: "Jan", revenue: 58000, expenses: 14500 },
  { month: "Feb", revenue: 72000, expenses: 17000 },
];

export default function RevenuePage() {
  return (
    <AdminLayout title="Revenue" subtitle="Financial overview and analytics">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard title="Total Revenue" value="$376,000" change="+24.1% YoY" changeType="up" icon={DollarSign} gradient="success" />
        <StatsCard title="Net Profit" value="$275,500" change="+18.7% YoY" changeType="up" icon={TrendingUp} gradient="primary" />
        <StatsCard title="Avg Per Work" value="$29.27" change="+5.3%" changeType="up" icon={CreditCard} gradient="accent" />
        <StatsCard title="Pending" value="$18,420" change="32 invoices" changeType="neutral" icon={PiggyBank} gradient="primary" />
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Revenue vs Expenses</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={monthlyRevenue}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(155 70% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(155 70% 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 72% 55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(0 72% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
            <XAxis dataKey="month" stroke="hsl(215 12% 50%)" fontSize={12} />
            <YAxis stroke="hsl(215 12% 50%)" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip contentStyle={{ background: "hsl(220 18% 12%)", border: "1px solid hsl(220 14% 18%)", borderRadius: "8px", color: "hsl(210 20% 92%)" }} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(155 70% 45%)" fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" stroke="hsl(0 72% 55%)" fill="url(#expGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AdminLayout>
  );
}
