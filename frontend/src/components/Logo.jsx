import { Link } from "react-router-dom";

export function LogoMark({ className = "size-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M10 8h9l5 5v11a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" className="fill-surface" />
      <path d="M19 8v5h5" fill="none" className="stroke-line-strong" strokeWidth="1.5" />
      <path d="M11.5 16h9M11.5 19.5h9M11.5 23h5" className="stroke-primary" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="ExamStore home">
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight">
        Exam<span className="text-primary">Store</span>
      </span>
    </Link>
  );
}
