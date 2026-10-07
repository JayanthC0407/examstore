import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { api } from "../lib/api";
import { useMeta } from "../store/meta";
import { useAuth } from "../store/auth";
import { formatNumber } from "../lib/format";
import PaperCard, { PaperCardSkeleton } from "../components/PaperCard";
import { Button } from "../components/ui";

function Stat({ value, label }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const meta = useMeta((s) => s.meta);
  const user = useAuth((s) => s.user);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState(null);
  const [popular, setPopular] = useState(null);

  useEffect(() => {
    api.get("/papers", { params: { sort: "recent", limit: 6 } }).then((r) => setRecent(r.data.items)).catch(() => setRecent([]));
    api.get("/papers", { params: { sort: "popular", limit: 6 } }).then((r) => setPopular(r.data.items)).catch(() => setPopular([]));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/papers?q=${encodeURIComponent(q.trim())}` : "/papers");
  };

  const departments = (meta?.departments || []).filter((d) => d.count > 0);
  const empty = meta && meta.stats.papers === 0;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-ruled absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-success" /> Free for every student
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] sm:text-6xl">
            Every past paper, <span className="italic text-primary">one search</span> away.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
            Mid-sems, end-sems and supplementaries from every department, organised by subject, semester and year.
          </p>

          <form onSubmit={submit} role="search" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Try “Data Structures” or “CS201”"
                aria-label="Search papers"
                className="h-13 w-full rounded-2xl border border-line-strong bg-surface pl-12 pr-4 text-base shadow-card placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
            <Button size="lg" type="submit" className="h-13 rounded-2xl px-7">
              Search
            </Button>
          </form>

          {meta && !empty && (
            <div className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
              <Stat value={formatNumber(meta.stats.papers)} label="question papers" />
              <Stat value={formatNumber(meta.stats.subjects)} label="subjects" />
              {meta.stats.downloads > 0 && <Stat value={formatNumber(meta.stats.downloads)} label="downloads" />}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6">
        {empty ? (
          <section className="rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
            <h2 className="font-display text-2xl font-semibold">The shelves are empty, for now</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">
              No papers have been uploaded yet.{" "}
              {user?.role === "admin" ? "Head to the admin console to add the first one." : "Check back soon."}
            </p>
            {user?.role === "admin" && (
              <Button to="/admin/upload" className="mt-6">Upload the first paper</Button>
            )}
          </section>
        ) : (
          <>
            {/* Departments */}
            {departments.length > 0 && (
              <section>
                <SectionHeader title="Browse by department" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {departments.map((d) => (
                    <Link
                      key={d.code}
                      to={`/papers?department=${d.code}`}
                      className="group flex flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/40 hover:shadow-card"
                    >
                      <span className="font-mono text-xs font-medium text-primary">{d.code}</span>
                      <span className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{d.name}</span>
                      <span className="mt-3 text-xs text-subtle">
                        {d.count} paper{d.count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <PaperShelf title="Recently added" to="/papers?sort=recent" papers={recent} />
            <PaperShelf title="Most downloaded" to="/papers?sort=popular" papers={popular} />
          </>
        )}
      </div>
    </>
  );
}

function SectionHeader({ title, to }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          View all <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function PaperShelf({ title, to, papers }) {
  if (papers && papers.length === 0) return null;
  return (
    <section>
      <SectionHeader title={title} to={to} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {papers
          ? papers.map((p, i) => <PaperCard key={p._id} paper={p} style={{ animationDelay: `${i * 40}ms` }} />)
          : Array.from({ length: 3 }, (_, i) => <PaperCardSkeleton key={i} />)}
      </div>
    </section>
  );
}
