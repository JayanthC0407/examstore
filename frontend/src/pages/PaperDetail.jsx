import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowLeft, ExternalLink, FileX, Lock, Pencil } from "lucide-react";
import { api, errorMessage, fileUrl } from "../lib/api";
import { useAuth } from "../store/auth";
import { useMeta, deptName, examName } from "../store/meta";
import { formatBytes, formatDate, formatNumber, ordinal } from "../lib/format";
import { PaperMeta } from "../components/PaperCard";
import { Button, Card, EmptyState, Skeleton } from "../components/ui";

const PdfViewer = lazy(() => import("../components/PdfViewer"));

export default function PaperDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const meta = useMeta((s) => s.meta);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    api.get(`/papers/${id}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(() => {
    if (data) document.title = `${data.paper.subjectName} ${data.paper.year} · ExamStore`;
    return () => {
      document.title = "ExamStore";
    };
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <EmptyState icon={FileX} title="Paper not found" action={<Button to="/papers">Browse all papers</Button>}>
          {error}
        </EmptyState>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-60" />
        <Skeleton className="mt-6 h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  const { paper, related } = data;
  const details = [
    ["Department", deptName(meta, paper.department)],
    ["Semester", `${ordinal(paper.semester)} semester`],
    ["Exam", `${examName(meta, paper.examType)} ${paper.year}`],
    ["File size", formatBytes(paper.file?.size)],
    ["Added", formatDate(paper.createdAt)],
    ["Downloads", formatNumber(paper.downloads)],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/papers"))}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-muted">{paper.subjectCode}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {paper.subjectName} <span className="text-subtle">{paper.year}</span>
          </h1>
          <PaperMeta paper={paper} className="mt-3" />
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === "admin" && (
            <Button variant="secondary" to={`/admin/papers?edit=${paper._id}`}>
              <Pencil className="size-4" /> Edit
            </Button>
          )}
          {user && (
            <>
              <Button variant="secondary" as="a" href={fileUrl(paper._id)} target="_blank" rel="noopener">
                <ExternalLink className="size-4" /> Open
              </Button>
              <Button as="a" href={fileUrl(paper._id, { download: true })} download>
                <ArrowDownToLine className="size-4" /> Download PDF
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {user ? (
            <Suspense fallback={<Skeleton className="h-[60vh] w-full rounded-2xl" />}>
              <PdfViewer url={fileUrl(paper._id)} title={`${paper.subjectName} ${paper.year} question paper`} />
            </Suspense>
          ) : (
            <Card className="relative overflow-hidden">
              <div className="bg-ruled h-72 opacity-70" aria-hidden />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-surface via-surface/90 to-surface/40 px-6 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Lock className="size-5" />
                </div>
                <h2 className="mt-4 font-display text-xl font-semibold">Sign in to view this paper</h2>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Papers are available to students with an institute email. It takes 30 seconds.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button to="/login" state={{ from: location }}>Sign in</Button>
                  <Button variant="secondary" to="/signup" state={{ from: location }}>Create account</Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="mt-3 divide-y divide-line text-sm">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {paper.notes && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-muted">{paper.notes}</p>}
          </Card>

          {related.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">More {paper.subjectCode} papers</h2>
              <ul className="mt-2 -mx-2">
                {related.map((r) => (
                  <li key={r._id}>
                    <Link to={`/papers/${r._id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
                      <span className="font-display text-base font-semibold tabular-nums">{r.year}</span>
                      <span className="text-muted">{examName(meta, r.examType)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
