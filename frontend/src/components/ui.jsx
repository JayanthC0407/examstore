import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { Loader2, X } from "lucide-react";

export const cx = (...c) => c.filter(Boolean).join(" ");

const BUTTON_VARIANTS = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface text-fg border border-line-strong hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
  "danger-ghost": "text-danger hover:bg-danger-soft",
};
const BUTTON_SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg justify-center",
};

export function Button({ as, to, variant = "primary", size = "md", loading, className, children, ...props }) {
  const classes = cx(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors",
    "disabled:opacity-50 disabled:pointer-events-none",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );
  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={classes} {...props}>{content}</Link>;
  const Comp = as || "button";
  return (
    <Comp className={classes} disabled={loading || props.disabled} {...props}>
      {content}
    </Comp>
  );
}

const control =
  "w-full rounded-xl border bg-surface px-3.5 text-sm text-fg placeholder:text-subtle transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60";

export function Field({ label, hint, error, children, className, optional }) {
  const id = useId();
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-fg">
          {label}
          {optional && <span className="text-xs font-normal text-subtle">Optional</span>}
        </label>
      )}
      {children(id, !!error)}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-subtle">{hint}</p>
      )}
    </div>
  );
}

export function Input({ invalid, className, ...props }) {
  return (
    <input
      className={cx(control, "h-10", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({ invalid, className, ...props }) {
  return (
    <textarea
      className={cx(control, "py-2.5 min-h-20", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

// `display` (optional) is the text shown while the select is closed, with a proper
// ellipsis. Native selects clip long option labels mid-word, so use it when the
// options are longer than the control. The open list still shows the full labels.
export function Select({ invalid, className, children, display, ...props }) {
  const select = (
    <select
      className={cx(
        control,
        "h-10 appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px]",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a8e99' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        invalid ? "border-danger" : "border-line-strong",
        display === undefined ? className : "text-transparent [&_option]:text-fg"
      )}
      aria-invalid={invalid || undefined}
      title={display}
      {...props}
    >
      {children}
    </select>
  );
  if (display === undefined) return select;
  return (
    <div className={cx("relative", className)}>
      {select}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 right-9 truncate text-sm leading-10 text-fg">
        {display}
      </span>
    </div>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className, label = "Loading" }) {
  return (
    <div role="status" className={cx("flex items-center justify-center gap-2 text-muted", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-lg bg-surface-2", className)} />;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      {Icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
      )}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Native <dialog>: focus trapping, Esc to close and backdrop for free.
export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl",
        "backdrop:bg-black/40 backdrop:backdrop-blur-[2px]",
        size === "xl" ? "max-w-6xl" : size === "lg" ? "max-w-2xl" : "max-w-md"
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-muted tabular-nums">
        Page {page} of {pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
