import { useEffect, useId, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { api } from "../../lib/api";
import { useMeta, deptLabel } from "../../store/meta";
import { formatBytes, ordinal } from "../../lib/format";
import { Field, Input, Select, Textarea, cx } from "../../components/ui";

export const EMPTY_PAPER = {
  subjectCode: "",
  subjectName: "",
  department: "",
  semester: "",
  year: String(new Date().getFullYear()),
  examType: "end-sem",
  notes: "",
};

export const toFormData = (values, file) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.append(k, v ?? "");
  if (file) fd.append("file", file);
  return fd;
};

let subjectsCache;

// Paper details shared by the admin upload page, the edit dialog, request review and the student request form.
export function PaperFields({ values, onChange, errors = {}, showNotes = true }) {
  const meta = useMeta((s) => s.meta);
  const [subjects, setSubjects] = useState(subjectsCache || []);
  const listId = useId();
  const thisYear = new Date().getFullYear();

  useEffect(() => {
    api.get("/meta/subjects").then((r) => {
      subjectsCache = r.data.items;
      setSubjects(r.data.items);
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => onChange({ [k]: e.target.value });

  const onCode = (e) => {
    const code = e.target.value.toUpperCase();
    const known = subjects.find((s) => s.subjectCode === code);
    onChange(
      known
        ? { subjectCode: code, subjectName: known.subjectName, department: known.department, semester: String(known.semester) }
        : { subjectCode: code }
    );
  };

  if (!meta) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Subject code" error={errors.subjectCode} hint="Known codes fill in the rest">
        {(id, invalid) => (
          <>
            <Input id={id} invalid={invalid} list={listId} value={values.subjectCode} onChange={onCode} placeholder="e.g. CS201" className="font-mono uppercase placeholder:normal-case" autoComplete="off" />
            <datalist id={listId}>
              {subjects.map((s) => <option key={s.subjectCode} value={s.subjectCode}>{s.subjectName}</option>)}
            </datalist>
          </>
        )}
      </Field>
      <Field label="Subject name" error={errors.subjectName}>
        {(id, invalid) => <Input id={id} invalid={invalid} value={values.subjectName} onChange={set("subjectName")} placeholder="e.g. Data Structures" />}
      </Field>
      <Field label="Department" error={errors.department}>
        {(id, invalid) => (
          <Select id={id} invalid={invalid} value={values.department} display={deptLabel(meta, values.department, "Select department")} onChange={set("department")}>
            <option value="" disabled>Select department</option>
            {meta.departments.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Semester" error={errors.semester}>
        {(id, invalid) => (
          <Select id={id} invalid={invalid} value={values.semester} onChange={set("semester")}>
            <option value="" disabled>Select semester</option>
            {meta.semesters.map((s) => <option key={s} value={s}>{ordinal(s)} semester</option>)}
          </Select>
        )}
      </Field>
      <Field label="Exam year" error={errors.year}>
        {(id, invalid) => <Input id={id} invalid={invalid} type="number" inputMode="numeric" min={1990} max={thisYear + 1} value={values.year} onChange={set("year")} />}
      </Field>
      <Field label="Exam type" error={errors.examType}>
        {(id, invalid) => (
          <Select id={id} invalid={invalid} value={values.examType} onChange={set("examType")}>
            {meta.examTypes.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </Select>
        )}
      </Field>
      {showNotes && <Field label="Notes" optional className="sm:col-span-2" error={errors.notes} hint="Shown to students, e.g. “Answer key included” or “Set B”">
        {(id, invalid) => <Textarea id={id} invalid={invalid} rows={2} maxLength={500} value={values.notes} onChange={set("notes")} />}
      </Field>}
    </div>
  );
}

export function FileDrop({ file, onFile, error, compact = false }) {
  const maxMb = useMeta((s) => s.meta?.maxUploadMb) || 10;
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const accept = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      onFile(null, "Only PDF files are allowed");
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      onFile(null, `File is larger than ${maxMb} MB`);
      return;
    }
    onFile(f);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted">{formatBytes(file.size)}</p>
        </div>
        <button type="button" onClick={() => onFile(null)} className="rounded-lg p-1.5 text-subtle hover:bg-surface hover:text-fg" aria-label="Remove file">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files?.[0]); }}
        className={cx(
          "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-6" : "px-6 py-12",
          over ? "border-primary bg-primary-soft" : error ? "border-danger bg-danger-soft/40" : "border-line-strong hover:border-primary/50 hover:bg-surface-2"
        )}
      >
        <UploadCloud className={cx("text-primary", compact ? "size-6" : "size-9")} />
        <span className="mt-3 text-sm font-medium">Drop a PDF here, or <span className="text-primary">browse</span></span>
        <span className="mt-1 text-xs text-subtle">PDF up to {maxMb} MB</span>
      </button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }} />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
