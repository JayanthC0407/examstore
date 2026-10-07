import { useEffect, useRef, useState } from "react";
import { FileWarning, Minus, Plus } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button, Spinner } from "./ui";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ZOOMS = [0.75, 1, 1.25, 1.5, 2];
const MAX_PAGE_WIDTH = 900;

// Renders just the paper's pages (no browser PDF chrome). Pages are drawn
// lazily as they scroll into view so long papers stay light.
export default function PdfViewer({ url, title }) {
  const scrollRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [ratio, setRatio] = useState(1.414); // A4 portrait until the real size is known
  const [error, setError] = useState("");
  const [width, setWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(1);

  useEffect(() => {
    setDoc(null);
    setError("");
    // Results from a load that was already cleaned up (e.g. React StrictMode's
    // double mount in development) must be ignored, including its abort error.
    let active = true;
    const task = pdfjs.getDocument({ url, withCredentials: true });
    task.promise
      .then(async (d) => {
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        if (!active) return;
        setRatio(vp.height / vp.width);
        setDoc(d);
      })
      .catch((e) => {
        if (!active) return;
        console.error("[pdf] load failed", e);
        setError("This paper couldn't be displayed. Try downloading it instead.");
      });
    return () => {
      active = false;
      task.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoom = ZOOMS[zoomIndex];
  const pageWidth = Math.floor(Math.min(width, MAX_PAGE_WIDTH) * zoom);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
        <span className="text-sm text-muted">
          {doc ? `${doc.numPages} page${doc.numPages === 1 ? "" : "s"}` : "Loading…"}
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <Button variant="ghost" size="icon" onClick={() => setZoomIndex((i) => i - 1)} disabled={zoomIndex === 0} aria-label="Zoom out">
            <Minus className="size-4" />
          </Button>
          <button
            onClick={() => setZoomIndex(1)}
            className="w-14 rounded-md py-1 text-center text-sm tabular-nums text-muted hover:bg-surface-2 hover:text-fg"
            title="Fit to width"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="ghost" size="icon" onClick={() => setZoomIndex((i) => i + 1)} disabled={zoomIndex === ZOOMS.length - 1} aria-label="Zoom in">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[80vh] overflow-auto p-3 sm:p-6" aria-label={title}>
        {error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted">
            <FileWarning className="size-8 text-danger" />
            {error}
          </div>
        ) : !doc || !pageWidth ? (
          <Spinner className="py-24" label="Loading paper" />
        ) : (
          <div className="w-max min-w-full space-y-4">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={doc} pageNumber={i + 1} width={pageWidth} ratio={ratio} root={scrollRef} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({ doc, pageNumber, width, ratio: defaultRatio, root }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(pageNumber === 1);
  const [ratio, setRatio] = useState(defaultRatio);

  // Start rendering shortly before the page scrolls into view.
  useEffect(() => {
    if (visible) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { root: root.current, rootMargin: "800px 0px" }
    );
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, [visible, root]);

  useEffect(() => {
    if (!visible) return;
    let task;
    let cancelled = false;
    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
      task.promise.catch((e) => {
        if (e?.name !== "RenderingCancelledException") console.error(e);
      });
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, pageNumber, width]);

  return (
    <div
      ref={wrapRef}
      className="mx-auto bg-white shadow-card ring-1 ring-black/5"
      style={{ width, height: Math.round(width * ratio) }}
    >
      <canvas ref={canvasRef} className="block size-full" aria-label={`Page ${pageNumber}`} />
    </div>
  );
}
