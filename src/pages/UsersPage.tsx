import { AdminLayout } from "@/components/AdminLayout";
import { Search, MoreHorizontal, Shield, User, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const mockUsers = [
  { id: "1", name: "Luna Waves", email: "luna@example.com", role: "Artist", status: "Active", joined: "2025-06-12", works: 24 },
  { id: "2", name: "Neon Drift", email: "neon@example.com", role: "Artist", status: "Active", joined: "2025-07-03", works: 18 },
  { id: "3", name: "Marcus Chen", email: "marcus@example.com", role: "Label Manager", status: "Active", joined: "2025-03-15", works: 0 },
  { id: "4", name: "Solar Flux", email: "solar@example.com", role: "Artist", status: "Suspended", joined: "2025-08-22", works: 9 },
  { id: "5", name: "DJ Shadow", email: "shadow@example.com", role: "Artist", status: "Active", joined: "2025-09-10", works: 31 },
  { id: "6", name: "Admin User", email: "admin@example.com", role: "Super Admin", status: "Active", joined: "2025-01-01", works: 0 },
];

const roleIcons: Record<string, typeof User> = {
  "Artist": User,
  "Label Manager": Shield,
  "Super Admin": Crown,
};

export default function UsersPage() {
  const [search, setSearch] = useState("");

  const filtered = mockUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Users" subtitle="Manage platform users">
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9 bg-secondary border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["All", "Artist", "Label Manager", "Super Admin"].map((role) => (
            <button key={role} className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Works</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const RoleIcon = roleIcons[user.role] || User;
              return (
                <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1.5">
                      <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{user.role}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      user.status === "Active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-sm text-muted-foreground">{user.works}</td>
                  <td className="py-3 px-5 text-sm text-muted-foreground">{user.joined}</td>
                  <td className="py-3 px-5">
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
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
