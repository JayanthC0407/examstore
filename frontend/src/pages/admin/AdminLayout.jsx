import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FileStack, Inbox, LayoutDashboard, Upload, Users } from "lucide-react";
import { api } from "../../lib/api";
import { cx } from "../../components/ui";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/upload", label: "Upload", icon: Upload },
  { to: "/admin/requests", label: "Requests", icon: Inbox, badge: true },
  { to: "/admin/papers", label: "Papers", icon: FileStack },
  { to: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout() {
  const [pending, setPending] = useState(0);
  const { pathname } = useLocation();

  // Waiting student requests, shown as a badge on the Requests tab.
  useEffect(() => {
    api.get("/requests", { params: { status: "pending" } }).then((r) => setPending(r.data.counts.pending)).catch(() => {});
  }, [pathname]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Admin console</p>
        <h1 className="font-display text-3xl font-semibold">Manage ExamStore</h1>
      </div>
      <nav className="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Admin">
        {TABS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "border-primary text-fg" : "border-transparent text-muted hover:text-fg"
              )
            }
          >
            <Icon className="size-4" /> {label}
            {badge && pending > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold tabular-nums text-bg" aria-label={`${pending} waiting`}>
                {pending}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ setPending }} />
    </div>
  );
}
