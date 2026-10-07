import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../../store/auth";
import { formatDate, timeAgo } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Modal, Pagination, Select, Spinner } from "../../components/ui";

export default function ManageUsers() {
  const me = useAuth((s) => s.user);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [changing, setChanging] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get("/admin/users", { params: { q, role, page } })
      .then((r) => setResult(r.data))
      .catch((e) => toast.error(errorMessage(e)));
  }, [q, role, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const nextRole = changing?.role === "admin" ? "student" : "admin";

  const confirmRole = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/users/${changing._id}/role`, { role: nextRole });
      toast.success(nextRole === "admin" ? `${changing.fullName} is now an admin` : `Removed admin access for ${changing.fullName}`);
      setChanging(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name or email"
            aria-label="Search users"
            className="h-10 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3 text-sm placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:w-44" aria-label="Role">
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="student">Students</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {!result ? (
          <Spinner className="py-16" label="Loading users" />
        ) : result.items.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <ul className="divide-y divide-line">
            {result.items.map((u) => (
              <li key={u._id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
                    {u.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {u.fullName}
                      {u.role === "admin" && <Badge tone="accent">admin</Badge>}
                      {u._id === me._id && <Badge>you</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-xs text-subtle" title={`Joined ${formatDate(u.createdAt)}`}>
                    {u.lastLoginAt ? `Active ${timeAgo(u.lastLoginAt)}` : `Joined ${formatDate(u.createdAt)}`}
                  </span>
                  {u._id !== me._id && (
                    <Button size="sm" variant={u.role === "admin" ? "danger-ghost" : "secondary"} onClick={() => setChanging(u)}>
                      {u.role === "admin" ? "Remove admin" : "Make admin"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {result && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{result.total} user{result.total === 1 ? "" : "s"}</span>
          <Pagination page={page} pages={result.pages} onChange={setPage} />
        </div>
      )}

      <Modal
        open={!!changing}
        onClose={() => setChanging(null)}
        title={nextRole === "admin" ? "Grant admin access?" : "Remove admin access?"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setChanging(null)}>Cancel</Button>
            <Button variant={nextRole === "admin" ? "primary" : "danger"} onClick={confirmRole} loading={busy}>
              {nextRole === "admin" ? "Make admin" : "Remove admin"}
            </Button>
          </>
        }
      >
        {changing && (
          <p className="text-sm text-muted">
            {nextRole === "admin" ? (
              <><span className="font-medium text-fg">{changing.fullName}</span> will be able to upload, edit and delete papers, and manage users.</>
            ) : (
              <><span className="font-medium text-fg">{changing.fullName}</span> will go back to a regular student account.</>
            )}
          </p>
        )}
      </Modal>
    </div>
  );
}
