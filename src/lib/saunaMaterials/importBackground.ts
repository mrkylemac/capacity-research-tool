export type BackgroundKind = 'image' | 'svg';

export interface ImportedBackground {
  kind: BackgroundKind;
  /** For `image`: a data URL. For `svg`: the raw SVG markup. */
  payload: string;
  /** Natural width in pixels (image) or SVG user units. Used as the default initial size. */
  naturalWidth: number;
  /** Natural height in pixels (image) or SVG user units. */
  naturalHeight: number;
}

const MAX_BACKGROUND_BYTES = 4 * 1024 * 1024; // 4 MB after base64 — well inside localStorage budget.

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}

async function importImage(file: File): Promise<ImportedBackground> {
  const dataUrl = await readAsDataUrl(file);
  const { width, height } = await measureImage(dataUrl);
  return { kind: 'image', payload: dataUrl, naturalWidth: width, naturalHeight: height };
}

async function importPdf(file: File): Promise<ImportedBackground> {
  // Lazy-load pdf.js so its ~1MB worker isn't in the initial bundle.
  const pdfjs = await import('pdfjs-dist');
  // Use the CDN worker to avoid bundler worker config — this tool is internal.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL('image/png');
  return {
    kind: 'image',
    payload: dataUrl,
    naturalWidth: viewport.width,
    naturalHeight: viewport.height,
  };
}

async function importDxf(file: File): Promise<ImportedBackground> {
  const text = await readAsText(file);
  const dxfMod: { Helper: new (raw: string) => { toSVG: () => string } } = await import('dxf');
  const helper = new dxfMod.Helper(text);
  const svg = helper.toSVG();
  const { width, height } = readSvgViewBox(svg);
  return { kind: 'svg', payload: svg, naturalWidth: width, naturalHeight: height };
}

function readSvgViewBox(svg: string): { width: number; height: number } {
  const m = /viewBox="([^"]+)"/.exec(svg);
  if (m) {
    const parts = m[1].split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return { width: Math.abs(parts[2]), height: Math.abs(parts[3]) };
    }
  }
  const w = /width="([^"]+)"/.exec(svg);
  const h = /height="([^"]+)"/.exec(svg);
  return {
    width: w ? parseFloat(w[1]) || 1000 : 1000,
    height: h ? parseFloat(h[1]) || 1000 : 1000,
  };
}

export async function importBackground(file: File): Promise<ImportedBackground> {
  if (file.size > MAX_BACKGROUND_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Background imports are capped at 4 MB so they fit in browser storage.`
    );
  }
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(name)) {
    return importImage(file);
  }
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return importPdf(file);
  }
  if (name.endsWith('.dxf')) {
    return importDxf(file);
  }
  if (name.endsWith('.dwg')) {
    throw new Error(
      'DWG is a proprietary format we cannot read directly. Export it to PDF or DXF from your CAD tool and try again.'
    );
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}
