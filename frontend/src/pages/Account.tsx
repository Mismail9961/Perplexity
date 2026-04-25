import { Settings, User, Bell, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function Account() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8 animate-fade-up">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">Account</h1>
      </div>

      <section className="surface-card p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-2xl font-serif">
            A
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium">Anonymous</h2>
            <p className="text-sm text-muted-foreground">Free plan</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Upgrade to Pro</Button>
        </div>
      </section>

      <section className="surface-card p-6 mb-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><User className="h-4 w-4 text-primary" /> Profile</h3>
        <Row label="Display name" value="Anonymous" />
        <Separator className="bg-border" />
        <Row label="Email" value="not signed in" />
        <Separator className="bg-border" />
        <Row label="Language" value="English (US)" />
      </section>

      <section className="surface-card p-6 mb-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><Bell className="h-4 w-4 text-primary" /> Preferences</h3>
        <ToggleRow label="Auto-suggest follow-ups" defaultChecked />
        <Separator className="bg-border" />
        <ToggleRow label="Save search history" defaultChecked={false} />
        <Separator className="bg-border" />
        <ToggleRow label="Show source previews" defaultChecked />
      </section>

      <section className="surface-card p-6 mb-5 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><Shield className="h-4 w-4 text-primary" /> Privacy</h3>
        <ToggleRow label="Allow anonymous analytics" defaultChecked />
        <Separator className="bg-border" />
        <Row label="Data export" value="Download" />
      </section>

      <section className="surface-card p-6 space-y-5">
        <h3 className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4 text-primary" /> Billing</h3>
        <Row label="Plan" value="Free" />
        <Separator className="bg-border" />
        <Row label="Payment method" value="None" />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}