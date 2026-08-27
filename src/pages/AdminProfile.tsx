import { FormEvent, useEffect, useState } from "react";
import { Loader2, Pencil, Save, ShieldCheck, User } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminProfile, updateAdminProfile } from "@/lib/adminApi";
import type { SessionUser } from "@/lib/Auth";

export default function AdminProfile() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "" });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Admin Profile | DEX.ai";
    getAdminProfile()
      .then((next) => {
        setProfile(next);
        setDraft({ name: next.name, email: next.email, phone: next.phone });
      })
      .catch(() => setError("Could not load admin profile."))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!draft.name.trim() || !draft.email.trim() || !draft.phone.trim()) {
      setError("Name, email and phone number are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAdminProfile(draft);
      setProfile(updated);
      setDraft({ name: updated.name, email: updated.email, phone: updated.phone });
      setEditing(false);
      setMessage("Profile updated in the backend database.");
    } catch {
      setError("Could not update admin profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the admin account information stored in the database</p>
        </div>

        <form onSubmit={submit} className="glass rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{profile?.name ?? "Admin"}</h2>
                <p className="text-sm text-muted-foreground">{profile?.role ?? "Super Admin"}</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="glass h-9" onClick={() => setEditing((value) => !value)} disabled={loading}>
              <Pencil className="h-4 w-4 mr-2" />
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {loading ? (
            <div className="h-48 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Login ID" value={profile?.loginId ?? "admin"} readOnly />
              <Field label="Role" value={profile?.role ?? "Super Admin"} readOnly />
              <EditableField label="Name" value={draft.name} onChange={(value) => setDraft((d) => ({ ...d, name: value }))} disabled={!editing} />
              <EditableField label="Email" type="email" value={draft.email} onChange={(value) => setDraft((d) => ({ ...d, email: value }))} disabled={!editing} />
              <EditableField label="Phone Number" value={draft.phone} onChange={(value) => setDraft((d) => ({ ...d, phone: value }))} disabled={!editing} />
              <Field label="Last Updated" value={profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "Not updated"} readOnly />
            </div>
          )}

          {message && <div className="rounded-lg border border-buy/30 bg-buy/10 px-3 py-2 text-sm text-buy">{message}</div>}
          {error && <div className="rounded-lg border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">{error}</div>}

          {editing && (
            <div className="flex justify-end">
              <Button type="submit" className="bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          )}

          <div className="border-t border-border/40 pt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Profile edits are persisted through the backend API.
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} readOnly={readOnly} className="font-medium" />
    </div>
  );
}

function EditableField({ label, value, onChange, disabled, type = "text" }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}
