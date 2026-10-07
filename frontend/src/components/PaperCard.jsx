import { Link } from "react-router-dom";
import { ArrowDownToLine, FileText } from "lucide-react";
import { Badge, cx } from "./ui";
import { useMeta, examName } from "../store/meta";
import { formatNumber, ordinal } from "../lib/format";

export function PaperMeta({ paper, className }) {
  const meta = useMeta((s) => s.meta);
  return (
    <div className={cx("flex flex-wrap items-center gap-1.5", className)}>
      <Badge tone="primary">{paper.department}</Badge>
      <Badge>{ordinal(paper.semester)} sem</Badge>
      <Badge tone={paper.examType === "end-sem" ? "accent" : "neutral"}>{examName(meta, paper.examType)}</Badge>
    </div>
  );
}

export default function PaperCard({ paper, style }) {
  return (
    <Link
      to={`/papers/${paper._id}`}
      style={style}
      className="group animate-fade-up relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs font-medium tracking-wide text-muted">{paper.subjectCode}</span>
        <span className="font-display text-2xl font-semibold leading-none text-subtle tabular-nums group-hover:text-primary">
          {paper.year}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold leading-snug text-fg">
        {paper.subjectName}
      </h3>
      <PaperMeta paper={paper} className="mt-3" />
      <div className="mt-auto flex items-center justify-between pt-5 text-xs text-subtle">
        <span className="flex items-center gap-1.5">
          <FileText className="size-3.5" aria-hidden /> PDF
        </span>
        <span className="flex items-center gap-1.5 tabular-nums" title="Downloads">
          <ArrowDownToLine className="size-3.5" aria-hidden /> {formatNumber(paper.downloads)}
        </span>
      </div>
    </Link>
  );
}

export function PaperCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex justify-between">
        <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
        <div className="h-6 w-12 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 flex gap-1.5">
        <div className="h-5 w-12 animate-pulse rounded bg-surface-2" />
        <div className="h-5 w-14 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="mt-6 h-3 w-full animate-pulse rounded bg-surface-2" />
    </div>
  );
}
