import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <AdminLayout title="Settings" subtitle="Platform configuration">
      <div className="max-w-2xl space-y-8">
        <div className="glass-card rounded-xl p-6 space-y-5">
          <h3 className="font-display font-semibold text-foreground">Company Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Company Name</Label>
              <Input className="bg-secondary border-border mt-1" defaultValue="SoundAdmin Inc." />
            </div>
            <div>
              <Label className="text-foreground">Contact Email</Label>
              <Input className="bg-secondary border-border mt-1" defaultValue="admin@soundadmin.com" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-5">
          <h3 className="font-display font-semibold text-foreground">Notifications</h3>
          <div className="space-y-4">
            {["New user registrations", "Transfer requests", "Payout completions", "Support tickets"].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{item}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-5">
          <h3 className="font-display font-semibold text-foreground">API Configuration</h3>
          <div>
            <Label className="text-foreground">Spotify API Key</Label>
            <Input className="bg-secondary border-border mt-1" type="password" defaultValue="sk_live_xxxxx" />
          </div>
          <Button className="gradient-primary text-primary-foreground">Save Changes</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
