import { useState } from "react";
import toast from "react-hot-toast";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../store/auth";
import { formatDate } from "../lib/format";
import { Badge, Button, Card, Field, Input } from "../components/ui";

export default function Account() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.fullName);
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const { data } = await api.patch("/auth/me", { fullName: name });
      setUser(data.user);
      toast.success("Name updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pw.newPassword.length < 8) return setPwError("New password must be at least 8 characters");
    setSavingPw(true);
    try {
      await api.post("/auth/me/password", pw);
      setPw({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Account</h1>
        <p className="mt-1 text-muted">
          {user.email} · <Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role}</Badge> · joined {formatDate(user.createdAt)}
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Profile</h2>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Full name" className="flex-1">
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required />}
          </Field>
          <Button type="submit" loading={savingName} disabled={!name.trim() || name.trim() === user.fullName}>
            Save
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={savePw} className="mt-4 space-y-4">
          {pwError && <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{pwError}</div>}
          <Field label="Current password">
            {(id) => <Input id={id} type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => { const v = e.target.value; setPw((p) => ({ ...p, currentPassword: v })); }} required />}
          </Field>
          <Field label="New password" hint="At least 8 characters">
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => { const v = e.target.value; setPw((p) => ({ ...p, newPassword: v })); }} required />}
          </Field>
          <Button type="submit" loading={savingPw} disabled={!pw.currentPassword || !pw.newPassword}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
