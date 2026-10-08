import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./store/auth";
import { useMeta } from "./store/meta";
import Layout from "./components/Layout";
import { GuestOnly, RequireAdmin, RequireAuth } from "./components/Guards";
import { LogoMark } from "./components/Logo";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import PaperDetail from "./pages/PaperDetail";
import { Login, Signup } from "./pages/Auth";
import Account from "./pages/Account";
import Contribute from "./pages/Contribute";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import Upload from "./pages/admin/Upload";
import ManagePapers from "./pages/admin/ManagePapers";
import ManageUsers from "./pages/admin/ManageUsers";
import Requests from "./pages/admin/Requests";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const ready = useAuth((s) => s.ready);
  const init = useAuth((s) => s.init);
  const loadMeta = useMeta((s) => s.load);

  useEffect(() => {
    init();
    loadMeta().catch(() => {});
  }, [init, loadMeta]);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="papers" element={<Browse />} />
          <Route path="papers/:id" element={<PaperDetail />} />

          <Route element={<GuestOnly />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="account" element={<Account />} />
            <Route path="contribute" element={<Contribute />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="upload" element={<Upload />} />
              <Route path="requests" element={<Requests />} />
              <Route path="papers" element={<ManagePapers />} />
              <Route path="users" element={<ManageUsers />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "!bg-surface !text-fg !border !border-line !shadow-card !rounded-xl !text-sm",
          success: { iconTheme: { primary: "var(--success)", secondary: "var(--surface)" } },
          error: { iconTheme: { primary: "var(--danger)", secondary: "var(--surface)" } },
        }}
      />
    </>
  );
}
