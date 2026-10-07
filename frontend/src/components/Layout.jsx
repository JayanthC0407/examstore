import { Link, Outlet } from "react-router-dom";
import Header from "./Header";
import { LogoMark } from "./Logo";

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark className="size-5" />
            <span>ExamStore. Previous-year papers, by students, for students.</span>
          </div>
          <nav className="flex gap-5">
            <Link to="/papers" className="hover:text-fg">Browse</Link>
            <Link to="/account" className="hover:text-fg">Account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
