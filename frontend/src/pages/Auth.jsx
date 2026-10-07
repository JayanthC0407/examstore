import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../store/auth";
import { useMeta } from "../store/meta";
import { errorMessage } from "../lib/api";
import { Button, Field, Input } from "../components/ui";
import { LogoMark } from "../components/Logo";

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line lg:block">
        <div className="bg-ruled absolute inset-0" aria-hidden />
        <div className="absolute left-12 top-1/2 w-80 -translate-y-1/2 -rotate-3 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted">CS201</span>
            <span className="font-display text-2xl font-semibold text-subtle">2024</span>
          </div>
          <p className="mt-2 font-display text-lg font-semibold">Data Structures</p>
          <div className="mt-4 space-y-2">
            {[90, 75, 82, 60].map((w, i) => (
              <div key={i} className="h-2 rounded bg-surface-2" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="absolute bottom-16 right-12 w-72 rotate-2 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-3">
            <LogoMark className="size-9" />
            <div>
              <p className="text-sm font-semibold">Everything in one place</p>
              <p className="text-xs text-muted">Every department, every year.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-fg"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Login() {
  const login = useAuth((s) => s.login);
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to view and download papers."
      footer={<>New here? <Link to="/signup" state={location.state} className="font-medium text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="Password">
          {(id) => <PasswordInput id={id} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={busy}>Sign in</Button>
      </form>
    </AuthShell>
  );
}

export function Signup() {
  const signup = useAuth((s) => s.signup);
  const meta = useMeta((s) => s.meta);
  const location = useLocation();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const domain = meta?.allowedDomains?.[0];

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setBusy(true);
    setError("");
    try {
      const user = await signup(form);
      toast.success(user.role === "admin" ? "Admin account created" : "Account created. Happy studying!");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Use your institute email to get access."
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <Field label="Full name">
          {(id) => <Input id={id} autoComplete="name" required autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />}
        </Field>
        <Field label="Institute email" hint={domain && `Must end with @${domain}`}>
          {(id) => <Input id={id} type="email" autoComplete="email" required placeholder={domain ? `rollno@${domain}` : ""} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="Password" hint="At least 8 characters">
          {(id) => <PasswordInput id={id} autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={busy}>Create account</Button>
      </form>
    </AuthShell>
  );
}
