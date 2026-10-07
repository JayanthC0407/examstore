import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileStack, Pencil, Search, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { api, errorMessage, fieldErrors } from "../../lib/api";
import { useMeta } from "../../store/meta";
import { formatDate, formatNumber } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Modal, Pagination, Select, Spinner } from "../../components/ui";
import { FileDrop, PaperFields, toFormData } from "./PaperForm";

export default function ManagePapers() {
  const meta = useMeta((s) => s.meta);
  const reloadMeta = useMeta((s) => s.load);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    api
      .get("/papers", { params: { q, department, page, limit: 20, sort: "recent" } })
      .then((r) => setResult(r.data))
      .catch((e) => toast.error(errorMessage(e)));
  }, [q, department, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Support deep links like /admin/papers?edit=<id> from the paper page.
  const editId = params.get("edit");
  useEffect(() => {
    if (!editId) return;
    api.get(`/papers/${editId}`).then((r) => setEditing(r.data.paper)).catch(() => {});
  }, [editId]);

  const closeEdit = () => {
    setEditing(null);
    if (editId) setParams({}, { replace: true });
  };

  const afterChange = () => {
    load();
    reloadMeta({ force: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by subject, code or year"
            aria-label="Search papers"
            className="h-10 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3 text-sm placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="sm:w-56" aria-label="Department">
          <option value="">All departments</option>
          {meta?.departments.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
        </Select>
        <Button to="/admin/upload"><Upload className="size-4" /> Upload</Button>
      </div>

      <Card className="overflow-hidden">
        {!result ? (
          <Spinner className="py-16" label="Loading papers" />
        ) : result.items.length === 0 ? (
          <EmptyState icon={FileStack} title={q || department ? "No matching papers" : "No papers yet"}>
            {q || department ? "Try a different search." : "Uploaded papers will be listed here."}
          </EmptyState>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Dept</th>
                    <th className="px-4 py-3 font-medium">Sem</th>
                    <th className="px-4 py-3 font-medium">Exam</th>
                    <th className="px-4 py-3 text-right font-medium">Downloads</th>
                    <th className="px-4 py-3 font-medium">Added</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.items.map((p) => (
                    <tr key={p._id} className="hover:bg-surface-2/60">
                      <td className="max-w-xs px-4 py-3">
                        <Link to={`/papers/${p._id}`} className="block truncate font-medium hover:text-primary">{p.subjectName}</Link>
                        <span className="font-mono text-xs text-muted">{p.subjectCode}</span>
                      </td>
                      <td className="px-4 py-3"><Badge tone="primary">{p.department}</Badge></td>
                      <td className="px-4 py-3 tabular-nums">{p.semester}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="tabular-nums">{p.year}</span>{" "}
                        <span className="text-muted">{p.examType}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(p.downloads)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label={`Edit ${p.subjectName} ${p.year}`}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="danger-ghost" size="icon" onClick={() => setDeleting(p)} aria-label={`Delete ${p.subjectName} ${p.year}`}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {result.items.map((p) => (
                <li key={p._id} className="flex items-center gap-3 p-4">
                  <Link to={`/papers/${p._id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.subjectName} <span className="text-subtle">{p.year}</span></p>
                    <p className="text-xs text-muted">{p.subjectCode} · {p.department} · Sem {p.semester} · {p.examType}</p>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label="Edit"><Pencil className="size-4" /></Button>
                  <Button variant="danger-ghost" size="icon" onClick={() => setDeleting(p)} aria-label="Delete"><Trash2 className="size-4" /></Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {result && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{result.total} paper{result.total === 1 ? "" : "s"}</span>
          <Pagination page={page} pages={result.pages} onChange={setPage} />
        </div>
      )}

      <EditPaperDialog paper={editing} onClose={closeEdit} onSaved={afterChange} />
      <DeletePaperDialog paper={deleting} onClose={() => setDeleting(null)} onDeleted={afterChange} />
    </div>
  );
}

const pick = (p) => ({
  subjectCode: p.subjectCode,
  subjectName: p.subjectName,
  department: p.department,
  semester: String(p.semester),
  year: String(p.year),
  examType: p.examType,
  notes: p.notes || "",
});

function EditPaperDialog({ paper, onClose, onSaved }) {
  const [values, setValues] = useState(null);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (paper) {
      setValues(pick(paper));
      setFile(null);
      setErrors({});
    }
  }, [paper]);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/papers/${paper._id}`, toFormData(values, file));
      toast.success("Paper updated");
      onSaved();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!paper}
      onClose={onClose}
      size="lg"
      title="Edit paper"
      description={paper && `${paper.subjectCode} · ${paper.year}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>Save changes</Button>
        </>
      }
    >
      {values && (
        <div className="space-y-5">
          <PaperFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} errors={errors} />
          <div className="space-y-2">
            <p className="text-sm font-medium">Replace PDF <span className="font-normal text-subtle">(optional)</span></p>
            <FileDrop compact file={file} onFile={(f, err) => { setFile(f); setErrors((e) => ({ ...e, file: err })); }} error={errors.file} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function DeletePaperDialog({ paper, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/papers/${paper._id}`);
      toast.success("Paper deleted");
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!paper}
      onClose={onClose}
      title="Delete this paper?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={remove} loading={busy}>Delete permanently</Button>
        </>
      }
    >
      {paper && (
        <p className="text-sm text-muted">
          <span className="font-medium text-fg">{paper.subjectName} ({paper.subjectCode}) {paper.year}</span> and its PDF
          will be removed for everyone. This can&apos;t be undone.
        </p>
      )}
    </Modal>
  );
}
