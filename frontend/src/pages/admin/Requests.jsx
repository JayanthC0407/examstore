import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, Eye, Inbox, MessageSquareText, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, errorMessage, fieldErrors } from "../../lib/api";
import { useMeta, examName } from "../../store/meta";
import { formatBytes, ordinal, timeAgo } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Modal, Pagination, Skeleton, Spinner, Textarea, cx } from "../../components/ui";
import RequestStatus from "../../components/RequestStatus";
import { PaperFields } from "./PaperForm";

const PdfViewer = lazy(() => import("../../components/PdfViewer"));

const TABS = [
  { status: "pending", label: "Waiting" },
  { status: "approved", label: "Published" },
  { status: "rejected", label: "Rejected" },
];

export default function Requests() {
  const { setPending } = useOutletContext() || {};
  const meta = useMeta((s) => s.meta);
  const reloadMeta = useMeta((s) => s.load);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(() => {
    api
      .get("/requests", { params: { status, page } })
      .then((r) => {
        setResult(r.data);
        setPending?.(r.data.counts.pending);
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [status, page, setPending]);

  useEffect(load, [load]);

  const afterReview = (published) => {
    setReviewing(null);
    load();
    if (published) reloadMeta({ force: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Request status">
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            aria-selected={status === t.status}
            onClick={() => { setStatus(t.status); setPage(1); setResult(null); }}
            className={cx(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              status === t.status ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:text-fg"
            )}
          >
            {t.label}
            {result?.counts && <span className="tabular-nums text-xs opacity-80">{result.counts[t.status]}</span>}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {!result ? (
          <Spinner className="py-16" label="Loading requests" />
        ) : result.items.length === 0 ? (
          <EmptyState icon={Inbox} title={status === "pending" ? "No requests waiting" : `No ${TABS.find((t) => t.status === status).label.toLowerCase()} requests`}>
            {status === "pending" ? "When students share a paper, it shows up here for review." : "Reviewed requests are listed here."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {result.items.map((r) => (
              <li key={r._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.subjectName} <span className="text-subtle">{r.year}</span></p>
                    {status !== "pending" && <RequestStatus status={r.status} />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="font-mono">{r.subjectCode}</span> · {r.department} · {ordinal(r.semester)} sem · {examName(meta, r.examType)}
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    From {r.submittedBy?.fullName || "a deleted account"}
                    {r.submittedBy?.email && <> ({r.submittedBy.email})</>} · {timeAgo(r.createdAt)}
                    {r.reviewedBy && <> · reviewed by {r.reviewedBy.fullName}</>}
                  </p>
                  {r.message && (
                    <p className="mt-2 flex gap-1.5 text-sm text-muted">
                      <MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden /> <span className="line-clamp-2">{r.message}</span>
                    </p>
                  )}
                  {r.status === "rejected" && r.rejectionReason && <p className="mt-2 text-sm text-muted">Reason: {r.rejectionReason}</p>}
                </div>
                {r.status === "pending" && (
                  <Button onClick={() => setReviewing(r)} className="shrink-0"><Eye className="size-4" /> Review</Button>
                )}
                {r.status === "approved" && r.paper && (
                  <Button variant="secondary" to={`/papers/${r.paper}`} className="shrink-0">View paper</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {result && <Pagination page={page} pages={result.pages} onChange={setPage} />}

      <ReviewDialog request={reviewing} onClose={() => setReviewing(null)} onDone={afterReview} />
    </div>
  );
}

const pick = (r) => ({
  subjectCode: r.subjectCode,
  subjectName: r.subjectName,
  department: r.department,
  semester: String(r.semester),
  year: String(r.year),
  examType: r.examType,
  notes: "",
});

function ReviewDialog({ request, onClose, onDone }) {
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (request) {
      setValues(pick(request));
      setErrors({});
      setRejecting(false);
      setReason("");
    }
  }, [request]);

  const approve = async () => {
    setBusy("approve");
    try {
      await api.post(`/requests/${request._id}/approve`, values);
      toast.success("Published. It's now live for students.");
      onDone(true);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy("reject");
    try {
      await api.post(`/requests/${request._id}/reject`, { reason });
      toast.success("Request rejected");
      onDone(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={!!request}
      onClose={onClose}
      size="xl"
      title="Review request"
      description={request && `From ${request.submittedBy?.fullName || "a deleted account"} · ${timeAgo(request.createdAt)}`}
      footer={
        rejecting ? (
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>Back</Button>
            <Button variant="danger" onClick={reject} loading={busy === "reject"}><X className="size-4" /> Reject request</Button>
          </>
        ) : (
          <>
            <Button variant="danger-ghost" onClick={() => setRejecting(true)} disabled={!!busy}><X className="size-4" /> Reject</Button>
            <Button onClick={approve} loading={busy === "approve"}><Check className="size-4" /> Accept and publish</Button>
          </>
        )
      }
    >
      {request && values && (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0">
            <Suspense fallback={<Skeleton className="h-[60vh] w-full rounded-2xl" />}>
              <PdfViewer url={`/api/requests/${request._id}/file`} title="Submitted paper" height="h-[60vh]" />
            </Suspense>
            {request.file && (
              <p className="mt-2 text-xs text-subtle">
                {request.file.originalName} · {formatBytes(request.file.size)}
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {request.message && (
              <div className="rounded-xl bg-surface-2 p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
                  <MessageSquareText className="size-3.5" aria-hidden /> Message from the student
                </p>
                {request.message}
              </div>
            )}
            {rejecting ? (
              <Field label="Reason for rejecting" optional hint="The student sees this. E.g. “Blurry scan”, “Already on ExamStore”, “Not an exam paper”.">
                {(id) => <Textarea id={id} rows={3} maxLength={300} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />}
              </Field>
            ) : (
              <>
                <p className="text-sm text-muted">Check the details against the PDF and correct anything before publishing.</p>
                <PaperFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} errors={errors} />
              </>
            )}
            <Badge>The student is credited as the uploader</Badge>
          </div>
        </div>
      )}
    </Modal>
  );
}
