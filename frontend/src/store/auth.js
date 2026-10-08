import { create } from "zustand";
import { api } from "../lib/api";

export const useAuth = create((set) => ({
  user: null,
  ready: false,

  async init() {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  async login(credentials) {
    const { data } = await api.post("/auth/login", credentials);
    set({ user: data.user });
    return data.user;
  },

  // Returns { user } when the account is created straight away, or
  // { verification } when a code was emailed and must be confirmed first.
  async signup(details) {
    const { data } = await api.post("/auth/signup", details);
    if (data.user) set({ user: data.user });
    return data;
  },

  async verifySignup(email, code) {
    const { data } = await api.post("/auth/signup/verify", { email, code });
    set({ user: data.user });
    return data.user;
  },

  async resendSignupCode(email) {
    const { data } = await api.post("/auth/signup/resend", { email });
    return data.verification;
  },

  async logout() {
    await api.post("/auth/logout").catch(() => {});
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));

export const useIsAdmin = () => useAuth((s) => s.user?.role === "admin");
