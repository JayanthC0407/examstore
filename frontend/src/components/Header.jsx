import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Search, Shield, Sun, User, X } from "lucide-react";
import Logo from "./Logo";
import { Button, cx } from "./ui";
import { useAuth } from "../store/auth";
import { useTheme } from "../lib/theme";

const navClass = ({ isActive }) =>
  cx(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "text-fg bg-surface-2" : "text-muted hover:text-fg"
  );

function HeaderSearch({ className, onDone }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={cx("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        navigate(q.trim() ? `/papers?q=${encodeURIComponent(q.trim())}` : "/papers");
        setQ("");
        onDone?.();
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search subject or code"
        aria-label="Search papers"
        className="h-9 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-sm placeholder:text-subtle focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25"
      />
    </form>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const initials = user.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary ring-offset-2 ring-offset-bg hover:ring-2 hover:ring-primary/30"
      >
        {initials}
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-card"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="p-1.5">
            <Link role="menuitem" to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2">
              <User className="size-4 text-muted" /> Account
            </Link>
            {user.role === "admin" && (
              <Link role="menuitem" to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2">
                <Shield className="size-4 text-muted" /> Admin console
              </Link>
            )}
            <button role="menuitem" onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger-soft">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink to="/papers" className={navClass}>Browse papers</NavLink>
          {user?.role === "admin" && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!isHome && <HeaderSearch className="hidden w-64 lg:block" />}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            <ThemeIcon className="size-[18px]" />
          </Button>
          {user ? (
            <div className="hidden md:block">
              <UserMenu user={user} onLogout={handleLogout} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" to="/login" state={{ from: location }}>Sign in</Button>
              <Button to="/signup">Create account</Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-up border-t border-line bg-surface px-4 pb-4 pt-3 md:hidden">
          <HeaderSearch className="mb-3" onDone={() => setMobileOpen(false)} />
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <NavLink to="/papers" className={navClass}>Browse papers</NavLink>
            {user?.role === "admin" && <NavLink to="/admin" className={navClass}>Admin console</NavLink>}
            {user && <NavLink to="/account" className={navClass}>Account</NavLink>}
          </nav>
          <div className="mt-3 border-t border-line pt-3">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.fullName}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <Button variant="danger-ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" to="/login">Sign in</Button>
                <Button to="/signup">Create account</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
