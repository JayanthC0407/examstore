import { NavLink, Outlet } from "react-router-dom";
import { FileStack, LayoutDashboard, Upload, Users } from "lucide-react";
import { cx } from "../../components/ui";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/upload", label: "Upload", icon: Upload },
  { to: "/admin/papers", label: "Papers", icon: FileStack },
  { to: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Admin console</p>
        <h1 className="font-display text-3xl font-semibold">Manage ExamStore</h1>
      </div>
      <nav className="-mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Admin">
        {TABS.map(({ to, label, icon: Icon, end }) => (
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
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
