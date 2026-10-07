import axios from "axios";

// Same origin in dev (Vite proxy) and prod (backend serves the app).
export const api = axios.create({ baseURL: "/api", withCredentials: true });

export function errorMessage(err, fallback = "Something went wrong") {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK") return "Can't reach the server. Is the backend running?";
  return err?.message || fallback;
}

export const fieldErrors = (err) => {
  const d = err?.response?.data?.details;
  return d && typeof d === "object" && !Array.isArray(d) ? d : {};
};

export const fileUrl = (id, { download = false } = {}) =>
  `/api/papers/${id}/file${download ? "?download=1" : ""}`;
