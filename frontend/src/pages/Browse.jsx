import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { useMeta, deptName, deptLabel, examName } from "../store/meta";
import PaperCard, { PaperCardSkeleton } from "../components/PaperCard";
import { Button, EmptyState, Pagination, Select } from "../components/ui";
import { ordinal } from "../lib/format";

const FILTER_KEYS = ["department", "semester", "year", "examType"];

export default function Browse() {
  const meta = useMeta((s) => s.meta);
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState(params.get("q") || "");
  const debounce = useRef();

  const page = Number(params.get("page")) || 1;
  const sort = params.get("sort") || (params.get("q") ? "year" : "recent");
  const key = params.toString();

  useEffect(() => {
    let cancelled = false;
    setError("");
    api
      .get("/papers", { params: Object.fromEntries(new URLSearchParams(key)) })
      .then((r) => !cancelled && setResult(r.data))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  // Keep the input in sync when the URL changes from elsewhere (e.g. header search).
  useEffect(() => {
    const urlQ = params.get("q") || "";
    setQ((cur) => (cur.trim() === urlQ ? cur : urlQ));
  }, [params]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === "" || v == null) next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: !("page" in changes) });
  };

  const onSearch = (value) => {
    setQ(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => update({ q: value.trim() }), 300);
  };

  const active = FILTER_KEYS.filter((k) => params.get(k));
  const chipLabel = (k, v) =>
    k === "department" ? deptName(meta, v)
      : k === "semester" ? `${ordinal(Number(v))} semester`
      : k === "examType" ? examName(meta, v)
      : v;

  const filters = meta && (
    <div className="space-y-4">
      <FilterSelect label="Department" value={params.get("department")} display={deptLabel(meta, params.get("department"), "All")} onChange={(v) => update({ department: v })}>
        {meta.departments.map((d) => (
          <option key={d.code} value={d.code}>{d.code} · {d.name}</option>
        ))}
      </FilterSelect>
      <FilterSelect label="Semester" value={params.get("semester")} onChange={(v) => update({ semester: v })}>
        {meta.semesters.map((s) => <option key={s} value={s}>{ordinal(s)} semester</option>)}
      </FilterSelect>
      <FilterSelect label="Year" value={params.get("year")} onChange={(v) => update({ year: v })}>
        {meta.years.map((y) => <option key={y} value={y}>{y}</option>)}
      </FilterSelect>
      <FilterSelect label="Exam" value={params.get("examType")} onChange={(v) => update({ examType: v })}>
        {meta.examTypes.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
      </FilterSelect>
    </div>
  );

  const filterPanel = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {active.length > 0 && (
          <button className="text-xs font-medium text-primary hover:underline" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])))}>
            Reset
          </button>
        )}
      </div>
      {filters}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Question papers</h1>
        <p className="mt-1 text-muted">Search by subject name or code, then narrow down with filters.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[264px_1fr]">
        {/* Filters: sticky sidebar on desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-surface p-4">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                value={q}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search subject, code or year"
                aria-label="Search papers"
                className="h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-10 text-sm placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              {q && (
                <button onClick={() => onSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-fg">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-11 lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
                <SlidersHorizontal className="size-4" /> Filters{active.length ? ` (${active.length})` : ""}
              </Button>
              <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-11 w-auto min-w-40" aria-label="Sort by">
                <option value="recent">Sort: Newest</option>
                <option value="year">Sort: Exam year</option>
                <option value="popular">Sort: Most downloaded</option>
                <option value="subject">Sort: Subject A–Z</option>
              </Select>
            </div>
          </div>

          {/* Filters: collapsible below the search on smaller screens */}
          {showFilters && (
            <div className="animate-fade-up mt-3 rounded-2xl border border-line bg-surface p-4 lg:hidden">{filterPanel}</div>
          )}

          {active.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {active.map((k) => (
                <button
                  key={k}
                  onClick={() => update({ [k]: "" })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft py-1 pl-3 pr-2 text-xs font-medium text-primary hover:border-primary"
                >
                  {chipLabel(k, params.get(k))}
                  <X className="size-3.5" aria-label="Remove filter" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 mb-4 text-sm text-muted" aria-live="polite">
            {result && !error && (
              <>
                <span className="font-medium text-fg tabular-nums">{result.total}</span> paper{result.total === 1 ? "" : "s"}
                {params.get("q") && <> matching “{params.get("q")}”</>}
              </>
            )}
          </div>

          {error ? (
            <EmptyState icon={FileSearch} title="Couldn't load papers" action={<Button variant="secondary" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>}>
              {error}
            </EmptyState>
          ) : !result ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <PaperCardSkeleton key={i} />)}
            </div>
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No papers found"
              action={(active.length > 0 || params.get("q")) && <Button variant="secondary" onClick={() => setParams({})}>Clear search and filters</Button>}
            >
              Try a shorter search, a subject code, or fewer filters.
            </EmptyState>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((p, i) => (
                  <PaperCard key={p._id} paper={p} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} />
                ))}
              </div>
              <Pagination
                page={page}
                pages={result.pages}
                onChange={(p) => {
                  update({ page: p });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, display, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</span>
      <Select value={value || ""} display={display} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {children}
      </Select>
    </label>
  );
}
