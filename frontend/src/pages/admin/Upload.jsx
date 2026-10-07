import { useState } from "react";
import { CheckCircle2, ExternalLink, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { api, errorMessage, fieldErrors } from "../../lib/api";
import { useMeta } from "../../store/meta";
import { Button, Card } from "../../components/ui";
import { EMPTY_PAPER, FileDrop, PaperFields, toFormData } from "./PaperForm";

export default function Upload() {
  const reloadMeta = useMeta((s) => s.load);
  const [values, setValues] = useState(EMPTY_PAPER);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(null);

  const onFile = (f, err) => {
    setFile(f);
    setErrors((e) => ({ ...e, file: err }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErrors((er) => ({ ...er, file: "Choose a PDF to upload" }));
    setErrors({});
    setProgress(0);
    try {
      const { data } = await api.post("/papers", toFormData(values, file), {
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      setDone(data.paper);
      reloadMeta({ force: true });
      toast.success("Paper published");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  // Keep the batch context (department, semester, year, exam) for quick successive uploads.
  const uploadAnother = () => {
    setValues((v) => ({ ...EMPTY_PAPER, department: v.department, semester: v.semester, year: v.year, examType: v.examType }));
    setFile(null);
    setDone(null);
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-lg animate-fade-up p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-4 font-display text-2xl font-semibold">Published</h2>
        <p className="mt-1 text-muted">
          <span className="font-medium text-fg">{done.subjectName} {done.year}</span> is now live for students.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={uploadAnother}><Plus className="size-4" /> Upload another</Button>
          <Button variant="secondary" to={`/papers/${done._id}`}><ExternalLink className="size-4" /> View paper</Button>
        </div>
        <p className="mt-4 text-xs text-subtle">“Upload another” keeps the department, semester, year and exam type.</p>
      </Card>
    );
  }

  const busy = progress !== null;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_1.4fr]" noValidate>
      <div className="space-y-3">
        <h2 className="font-semibold">1. Choose the PDF</h2>
        <FileDrop file={file} onFile={onFile} error={errors.file} />
        <p className="text-xs text-subtle">Scanned papers are fine. Exact duplicates are detected automatically.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">2. Describe it</h2>
        <PaperFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} errors={errors} />
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
          {busy && (
            <div className="flex flex-1 items-center gap-3" aria-live="polite">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted">{progress}%</span>
            </div>
          )}
          <Button type="submit" size="lg" loading={busy}>Publish paper</Button>
        </div>
      </Card>
    </form>
  );
}
