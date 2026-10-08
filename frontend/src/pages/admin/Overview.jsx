import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, FileStack, Inbox, Upload, UserPlus, Users } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { formatNumber, timeAgo } from "../../lib/format";
import { Button, Card, EmptyState, Skeleton } from "../../components/ui";

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-subtle">{sub}</div>}
    </Card>
  );
}

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <EmptyState title="Couldn't load stats">{error}</EmptyState>;
  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stats.pendingRequests > 0 && (
        <Link to="/admin/requests" className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4 transition hover:border-accent">
          <Inbox className="size-5 shrink-0 text-accent" />
          <span className="flex-1 text-sm">
            <span className="font-semibold">{stats.pendingRequests} paper request{stats.pendingRequests === 1 ? "" : "s"}</span> from students{" "}
            {stats.pendingRequests === 1 ? "is" : "are"} waiting for review
          </span>
          <ArrowRight className="size-4 text-accent" />
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileStack} label="Papers" value={formatNumber(stats.papers)} />
        <StatCard icon={ArrowDownToLine} label="Downloads" value={formatNumber(stats.downloads)} />
        <StatCard icon={Users} label="Users" value={formatNumber(stats.users)} sub={`${stats.admins} admin${stats.admins === 1 ? "" : "s"}`} />
        <StatCard icon={UserPlus} label="New users" value={formatNumber(stats.newUsers)} sub="last 30 days" />
      </div>

      {stats.papers === 0 ? (
        <Card>
          <EmptyState icon={Upload} title="No papers yet" action={<Button to="/admin/upload"><Upload className="size-4" /> Upload a paper</Button>}>
            Upload your first question paper and it will appear for students right away.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-semibold">Recent uploads</h2>
              <Button size="sm" to="/admin/upload"><Upload className="size-3.5" /> Upload</Button>
            </div>
            <ul className="divide-y divide-line">
              {stats.recent.map((p) => (
                <li key={p._id}>
                  <Link to={`/papers/${p._id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.subjectName} <span className="text-subtle">{p.year}</span></p>
                      <p className="truncate text-xs text-muted">
                        {p.subjectCode} · {p.department} · by {p.uploadedBy?.fullName || "unknown"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-subtle">{timeAgo(p.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="font-semibold">Most downloaded</h2>
            </div>
            <ol className="divide-y divide-line">
              {stats.top.map((p, i) => (
                <li key={p._id}>
                  <Link to={`/papers/${p._id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2">
                    <span className="w-5 font-display text-lg font-semibold text-subtle">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.subjectName} <span className="text-subtle">{p.year}</span></p>
                      <p className="text-xs text-muted">{p.subjectCode}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm tabular-nums text-muted">
                      <ArrowDownToLine className="size-3.5" /> {formatNumber(p.downloads)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}
