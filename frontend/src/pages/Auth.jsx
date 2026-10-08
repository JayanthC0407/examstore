import { useEffect, useState } from "react";
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
          {(id) => <Input id={id} type="email" autoComplete="email" required autoFocus value={form.email} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, email: v })); }} />}
        </Field>
        <Field label="Password">
          {(id) => <PasswordInput id={id} autoComplete="current-password" required value={form.password} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, password: v })); }} />}
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
  const [verification, setVerification] = useState(null);
  const domain = meta?.allowedDomains?.[0];

  const welcome = (user) =>
    toast.success(user.role === "admin" ? "Admin account created" : "Account created. Happy studying!");

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    setBusy(true);
    setError("");
    try {
      const data = await signup(form);
      if (data.user) return welcome(data.user);
      setVerification(data.verification);
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  };

  if (verification) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={<>We sent a 6-digit code to <span className="font-medium text-fg">{verification.email}</span>. Enter it to finish creating your account.</>}
        footer={<>Wrong email? <button onClick={() => setVerification(null)} className="font-medium text-primary hover:underline">Go back</button></>}
      >
        <VerifyCode verification={verification} onRestart={() => setVerification(null)} onVerified={welcome} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={meta?.emailVerification ? "Use your institute email. We'll send a code to confirm it." : "Use your institute email to get access."}
      footer={<>Already have an account? <Link to="/login" state={location.state} className="font-medium text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <Field label="Full name">
          {(id) => <Input id={id} autoComplete="name" required autoFocus value={form.fullName} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, fullName: v })); }} />}
        </Field>
        <Field label="Institute email" hint={domain && `Must end with @${domain}`}>
          {(id) => <Input id={id} type="email" autoComplete="email" required placeholder={domain ? `rollno@${domain}` : ""} value={form.email} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, email: v })); }} />}
        </Field>
        <Field label="Password" hint="At least 8 characters">
          {(id) => <PasswordInput id={id} autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, password: v })); }} />}
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {meta?.emailVerification ? "Continue" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}

// Second step of sign-up: enter the emailed code; resend after a short wait.
function VerifyCode({ verification, onVerified, onRestart }) {
  const verifySignup = useAuth((s) => s.verifySignup);
  const resendSignupCode = useAuth((s) => s.resendSignupCode);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(verification.resendInSeconds);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return setError("Enter the 6-digit code from the email");
    setBusy(true);
    setError("");
    try {
      onVerified(await verifySignup(verification.email, value));
    } catch (err) {
      setError(errorMessage(err));
      const status = err?.response?.status;
      if (status === 410 || status === 429) setExpired(status === 410 || /sign up again/i.test(errorMessage(err)));
      setCode("");
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setExpired(false);
    try {
      const v = await resendSignupCode(verification.email);
      setWait(v.resendInSeconds);
      toast.success("A new code is on its way");
    } catch (err) {
      setError(errorMessage(err));
      const status = err?.response?.status;
      if (status === 410) setExpired(true);
      if (err?.response?.data?.details?.retryAfter) setWait(err.response.data.details.retryAfter);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-4" noValidate>
      {error && <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
      {expired ? (
        <Button type="button" className="w-full" size="lg" onClick={onRestart}>Start again</Button>
      ) : (
        <>
          <Field label="Verification code" hint="Check your spam folder if it hasn't arrived in a minute.">
            {(id) => (
              <Input
                id={id}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length === 6 && !busy) verify(v);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="123456"
                className="h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em] placeholder:text-line-strong"
              />
            )}
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>Verify and create account</Button>
          <p className="text-center text-sm text-muted">
            Didn&apos;t get it?{" "}
            {wait > 0 ? (
              <span className="tabular-nums">Resend in {wait}s</span>
            ) : (
              <button type="button" onClick={resend} className="font-medium text-primary hover:underline">Resend code</button>
            )}
          </p>
        </>
      )}
    </form>
  );
}
