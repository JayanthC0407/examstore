import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import { api, errorMessage } from "../../lib/api";
import { useMeta } from "../../store/meta";
import { formatDate } from "../../lib/format";
import { Badge, Card, Spinner, cx } from "../../components/ui";

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-line-strong"
      )}
    >
      <span className={cx("inline-block size-5 rounded-full bg-surface shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

const MAIL_NOTE = {
  brevo: { tone: "success", text: "Codes are emailed through Brevo." },
  console: { tone: "accent", text: "Development: codes are printed in the server terminal, not emailed." },
  off: { tone: "danger", text: "Email isn't set up, so codes can't be sent. Add BREVO_API_KEY and MAIL_FROM to the server to use this." },
};

export default function Settings() {
  const reloadMeta = useMeta((s) => s.load);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((r) => setSettings(r.data)).catch((e) => toast.error(errorMessage(e)));
  }, []);

  const toggle = async (value) => {
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", { emailVerification: value });
      setSettings(data);
      reloadMeta({ force: true });
      toast.success(value ? "Email verification switched on" : "Email verification switched off");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Spinner className="py-16" label="Loading settings" />;

  const note = MAIL_NOTE[settings.mail.mode];
  const active = settings.emailVerification && settings.mail.canSendCodes && !settings.mail.problem;

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <MailCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Email verification at sign-up</h2>
                <p className="mt-1 text-sm text-muted">
                  New accounts must enter a 6-digit code sent to their email before the account is created. Switch it off
                  while testing to sign up instantly.
                </p>
              </div>
              <Switch
                checked={settings.emailVerification}
                onChange={toggle}
                disabled={saving || !settings.mail.canSendCodes}
                label="Email verification at sign-up"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={active ? "success" : "neutral"}>{active ? "Active: sign-ups need a code" : "Inactive: sign-ups don't need a code"}</Badge>
              <Badge tone={note.tone}>{note.text}</Badge>
            </div>
            {settings.mail.problem && (
              <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                <span className="font-semibold">Emails can&apos;t be sent:</span> {settings.mail.problem}. Until it&apos;s fixed, sign-up works without a code. Fix the setting on the server, then restart it.
              </p>
            )}
            {settings.updatedAt && <p className="mt-3 text-xs text-subtle">Last changed {formatDate(settings.updatedAt)}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
