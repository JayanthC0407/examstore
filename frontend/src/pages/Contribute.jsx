import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileUp, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import { api, errorMessage, fieldErrors } from "../lib/api";
import { useMeta, examName } from "../store/meta";
import { formatDate, ordinal } from "../lib/format";
import { Button, Card, EmptyState, Field, Modal, Skeleton, Textarea } from "../components/ui";
import RequestStatus from "../components/RequestStatus";
import { EMPTY_PAPER, FileDrop, PaperFields, toFormData } from "./admin/PaperForm";

// Students describe the paper and may leave a message; the published "notes" are written by admins.
const EMPTY_REQUEST = { ...EMPTY_PAPER, message: "" };
delete EMPTY_REQUEST.notes;

export default function Contribute() {
  const [values, setValues] = useState(EMPTY_REQUEST);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [mine, setMine] = useState(null);

  const loadMine = useCallback(() => {
    api.get("/requests/mine").then((r) => setMine(r.data.items)).catch(() => setMine([]));
  }, []);
  useEffect(loadMine, [loadMine]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErrors((er) => ({ ...er, file: "Choose a PDF to send" }));
    setErrors({});
    setProgress(0);
    try {
      const { data } = await api.post("/requests", toFormData(values, file), {
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      setSubmitted(data.request);
      setValues(EMPTY_REQUEST);
      setFile(null);
      loadMine();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Share a paper</h1>
        <p className="mt-2 text-muted">
          Have a question paper that isn&apos;t on ExamStore yet? Send it in. An admin checks every submission and
          publishes it for everyone, or lets you know why it wasn&apos;t accepted.
        </p>
      </div>

      {/* min-w-0 lets the columns shrink below long, truncated titles */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {submitted ? (
            <Card className="animate-fade-up p-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-success" />
              <h2 className="mt-4 font-display text-2xl font-semibold">Thanks, it&apos;s on its way</h2>
              <p className="mx-auto mt-1 max-w-md text-muted">
                <span className="font-medium text-fg">{submitted.subjectName} {submitted.year}</span> is waiting for an
                admin to review it. You can follow its status under Your submissions.
              </p>
              <Button className="mt-6" onClick={() => setSubmitted(null)}>
                <FileUp className="size-4" /> Share another paper
              </Button>
            </Card>
          ) : (
            <form onSubmit={submit} className="space-y-6" noValidate>
              <div className="space-y-3">
                <h2 className="font-semibold">1. Choose the PDF</h2>
                <FileDrop file={file} onFile={(f, err) => { setFile(f); setErrors((e) => ({ ...e, file: err })); }} error={errors.file} />
              </div>
              <Card className="p-5 sm:p-6">
                <h2 className="mb-4 font-semibold">2. Tell us what it is</h2>
                <PaperFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} errors={errors} showNotes={false} />
                <Field label="Message for the admins" optional className="mt-4" hint="Anything that helps them check it, e.g. “Set B, from the 2024 re-exam”">
                  {(id) => <Textarea id={id} rows={2} maxLength={500} value={values.message} onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))} />}
                </Field>
                <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
                  {busy && (
                    <div className="flex flex-1 items-center gap-3" aria-live="polite">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-muted">{progress}%</span>
                    </div>
                  )}
                  <Button type="submit" size="lg" loading={busy}>Send for review</Button>
                </div>
              </Card>
            </form>
          )}
        </div>

        <aside className="min-w-0">
          <h2 className="mb-3 font-semibold">Your submissions</h2>
          <MySubmissions items={mine} onChange={loadMine} />
        </aside>
      </div>
    </div>
  );
}

function MySubmissions({ items, onChange }) {
  const meta = useMeta((s) => s.meta);
  const [withdrawing, setWithdrawing] = useState(null);
  const [busy, setBusy] = useState(false);

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.delete(`/requests/${withdrawing._id}`);
      toast.success("Request withdrawn");
      setWithdrawing(null);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!items) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={Inbox} title="Nothing yet">Papers you send will show up here with their status.</EmptyState>
      </Card>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r._id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.subjectName} <span className="text-subtle">{r.year}</span></p>
                  <p className="truncate text-xs text-muted">
                    {r.subjectCode} · {r.department} · {ordinal(r.semester)} sem · {examName(meta, r.examType)}
                  </p>
                </div>
                <RequestStatus status={r.status} />
              </div>
              {r.status === "rejected" && r.rejectionReason && (
                <p className="mt-3 rounded-lg bg-danger-soft/60 px-3 py-2 text-xs text-fg">
                  <span className="font-medium">Reason:</span> {r.rejectionReason}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-subtle">
                <span>Sent {formatDate(r.createdAt)}</span>
                {r.status === "approved" && r.paper && (
                  <Link to={`/papers/${r.paper}`} className="font-medium text-primary hover:underline">View paper</Link>
                )}
                {r.status === "pending" && (
                  <button onClick={() => setWithdrawing(r)} className="font-medium text-danger hover:underline">Withdraw</button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Modal
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        title="Withdraw this request?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawing(null)}>Keep it</Button>
            <Button variant="danger" onClick={withdraw} loading={busy}>Withdraw</Button>
          </>
        }
      >
        {withdrawing && (
          <p className="text-sm text-muted">
            <span className="font-medium text-fg">{withdrawing.subjectName} {withdrawing.year}</span> will be removed
            before an admin reviews it. You can send it again later.
          </p>
        )}
      </Modal>
    </>
  );
}
