import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../store/auth";
import { Button, EmptyState } from "./ui";

export function RequireAuth() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <EmptyState icon={ShieldAlert} title="Admins only" action={<Button to="/papers">Browse papers</Button>}>
          Your account doesn&apos;t have access to the admin console. Ask an existing admin to grant it.
        </EmptyState>
      </div>
    );
  }
  return <Outlet />;
}

export function GuestOnly() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const from = location.state?.from;
  if (user) return <Navigate to={from ? `${from.pathname}${from.search || ""}` : "/papers"} replace />;
  return <Outlet />;
}
