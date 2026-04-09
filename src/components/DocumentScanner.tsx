import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ScanLine, Check, RotateCw, Crop } from "lucide-react";
import { toast } from "sonner";

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onScanComplete: (file: File) => void;
}

type Corner = { x: number; y: number };
type Phase = "capture" | "corners" | "processing" | "preview";

/* ─── adaptive threshold ─── */
function adaptiveThreshold(ctx: CanvasRenderingContext2D, w: number, h: number, blockSize = 15, C = 10) {
  const src = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = src.data[i * 4], g = src.data[i * 4 + 1], b = src.data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
    }
  }
  const out = ctx.createImageData(w, h);
  const half = Math.floor(blockSize / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - half), y1 = Math.max(0, y - half);
      const x2 = Math.min(w - 1, x + half), y2 = Math.min(h - 1, y + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      let sum = integral[y2 * w + x2];
      if (x1 > 0) sum -= integral[y2 * w + (x1 - 1)];
      if (y1 > 0) sum -= integral[(y1 - 1) * w + x2];
      if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * w + (x1 - 1)];
      const mean = sum / count;
      const val = gray[y * w + x] > mean - C ? 255 : 0;
      const idx = (y * w + x) * 4;
      out.data[idx] = out.data[idx + 1] = out.data[idx + 2] = val;
      out.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

/* ─── perspective warp ─── */
function warpPerspective(srcCanvas: HTMLCanvasElement, corners: Corner[], outW: number, outH: number): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = outW; dst.height = outH;
  const dCtx = dst.getContext("2d")!;
  const sCtx = srcCanvas.getContext("2d")!;
  const srcData = sCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const dstData = dCtx.createImageData(outW, outH);
  const [tl, tr, br, bl] = corners;
  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const u = dx / outW, v = dy / outH;
      const sx = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x;
      const sy = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y;
      const ix = Math.round(sx), iy = Math.round(sy);
      if (ix >= 0 && ix < srcCanvas.width && iy >= 0 && iy < srcCanvas.height) {
        const si = (iy * srcCanvas.width + ix) * 4;
        const di = (dy * outW + dx) * 4;
        dstData.data[di] = srcData.data[si];
        dstData.data[di + 1] = srcData.data[si + 1];
        dstData.data[di + 2] = srcData.data[si + 2];
        dstData.data[di + 3] = 255;
      }
    }
  }
  dCtx.putImageData(dstData, 0, 0);
  return dst;
}

/* ─── auto detect corners via edge contrast ─── */
function autoDetectCorners(canvas: HTMLCanvasElement): Corner[] {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d")!;
  const src = ctx.getImageData(0, 0, w, h);
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = Math.round(0.299 * src.data[i * 4] + 0.587 * src.data[i * 4 + 1] + 0.114 * src.data[i * 4 + 2]);
  }

  // Sobel edge magnitude
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
        - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      edge[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Threshold edges
  let maxE = 0;
  for (let i = 0; i < edge.length; i++) if (edge[i] > maxE) maxE = edge[i];
  const thresh = maxE * 0.15;

  // Find bounding box of strong edges
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let found = false;
  const margin = Math.round(w * 0.02);
  for (let y = margin; y < h - margin; y++) {
    for (let x = margin; x < w - margin; x++) {
      if (edge[y * w + x] > thresh) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found || (maxX - minX) < w * 0.2 || (maxY - minY) < h * 0.2) {
    const m = 0.05;
    return [
      { x: w * m, y: h * m },
      { x: w * (1 - m), y: h * m },
      { x: w * (1 - m), y: h * (1 - m) },
      { x: w * m, y: h * (1 - m) },
    ];
  }

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/* ─── Magnifier component ─── */
function MagnifierOverlay({ canvas, point, displayScale }: { canvas: HTMLCanvasElement; point: Corner; displayScale: { sx: number; sy: number }; }) {
  const magRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 120;
  const ZOOM = 3;
  const RADIUS = SIZE / 2;

  useEffect(() => {
    const mc = magRef.current;
    if (!mc) return;
    mc.width = SIZE; mc.height = SIZE;
    const ctx = mc.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS - 2, 0, Math.PI * 2);
    ctx.clip();

    const srcSize = SIZE / ZOOM;
    ctx.drawImage(
      canvas,
      point.x - srcSize / 2, point.y - srcSize / 2, srcSize, srcSize,
      0, 0, SIZE, SIZE
    );
    ctx.restore();

    // Crosshair
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RADIUS, RADIUS - 12); ctx.lineTo(RADIUS, RADIUS + 12);
    ctx.moveTo(RADIUS - 12, RADIUS); ctx.lineTo(RADIUS + 12, RADIUS);
    ctx.stroke();

    // Border
    ctx.beginPath();
    ctx.arc(RADIUS, RADIUS, RADIUS - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [canvas, point]);

  const displayX = point.x / displayScale.sx;
  const displayY = point.y / displayScale.sy;

  return (
    <canvas
      ref={magRef}
      className="absolute pointer-events-none z-50"
      style={{
        width: SIZE, height: SIZE,
        left: displayX - RADIUS,
        top: displayY - RADIUS - SIZE - 10,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
      }}
    />
  );
}

const DocumentScanner = ({ open, onClose, onScanComplete }: DocumentScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(null);
  const [applyFilter, setApplyFilter] = useState(true);

  useEffect(() => {
    if (!open) return;
    setPhase("capture");
    setCapturedCanvas(null);
    setCorners([]);
    setResultCanvas(null);

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch { toast.error("No se pudo acceder a la cámara"); }
    };
    start();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  }, [open]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d")!.drawImage(video, 0, 0);
    stopCamera();
    setCapturedCanvas(c);
    setCorners(autoDetectCorners(c));
    setPhase("corners");
  }, [stopCamera]);

  /* ── draw overlay ── */
  useEffect(() => {
    if (phase !== "corners" || !capturedCanvas || !overlayRef.current) return;
    const oc = overlayRef.current;
    const displayW = oc.parentElement?.clientWidth || 300;
    const ratio = capturedCanvas.height / capturedCanvas.width;
    const displayH = displayW * ratio;
    oc.width = displayW; oc.height = displayH;
    const ctx = oc.getContext("2d")!;
    const sx = displayW / capturedCanvas.width;
    const sy = displayH / capturedCanvas.height;

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(capturedCanvas, 0, 0, displayW, displayH);

    const sc = corners.map(p => ({ x: p.x * sx, y: p.y * sy }));
    ctx.beginPath();
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2;
    ctx.moveTo(sc[0].x, sc[0].y);
    sc.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x, p.y); });
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "rgba(34,197,94,0.12)"; ctx.fill();

    sc.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    });
  }, [phase, capturedCanvas, corners]);

  const getCanvasCoords = (e: React.TouchEvent | React.MouseEvent) => {
    const oc = overlayRef.current;
    if (!oc || !capturedCanvas) return null;
    const rect = oc.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const sx = capturedCanvas.width / oc.width;
    const sy = capturedCanvas.height / oc.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  };

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    const pt = getCanvasCoords(e);
    if (!pt) return;
    const threshold = capturedCanvas ? capturedCanvas.width * 0.04 : 40;
    const idx = corners.findIndex(c => Math.hypot(c.x - pt.x, c.y - pt.y) < threshold);
    if (idx >= 0) setDragging(idx);
  };

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragging === null) return;
    const pt = getCanvasCoords(e);
    if (!pt) return;
    setCorners(prev => prev.map((c, i) => (i === dragging ? pt : c)));
  };

  const handlePointerUp = () => setDragging(null);

  const processImage = useCallback(async () => {
    if (!capturedCanvas || corners.length !== 4) return;
    setPhase("processing");
    await new Promise(r => setTimeout(r, 50));

    const widthTop = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
    const widthBot = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
    const heightLeft = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
    const heightRight = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
    const outW = Math.round(Math.max(widthTop, widthBot));
    const outH = Math.round(Math.max(heightLeft, heightRight));

    const warped = warpPerspective(capturedCanvas, corners, outW, outH);
    if (applyFilter) {
      const ctx = warped.getContext("2d")!;
      adaptiveThreshold(ctx, outW, outH, 25, 12);
    }
    setResultCanvas(warped);
    setPhase("preview");
  }, [capturedCanvas, corners, applyFilter]);

  const handleAccept = useCallback(() => {
    if (!resultCanvas) return;
    resultCanvas.toBlob(blob => {
      if (!blob) { toast.error("Error al generar imagen"); return; }
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
      onScanComplete(file);
      onClose();
    }, "image/jpeg", 0.88);
  }, [resultCanvas, onScanComplete, onClose]);

  const handleRetake = () => {
    setPhase("capture"); setCapturedCanvas(null); setCorners([]); setResultCanvas(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 3840 }, height: { ideal: 2160 } } })
      .then(stream => { streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } })
      .catch(() => toast.error("No se pudo acceder a la cámara"));
  };

  const displayScale = capturedCanvas && overlayRef.current
    ? { sx: capturedCanvas.width / (overlayRef.current.parentElement?.clientWidth || 300), sy: capturedCanvas.height / ((overlayRef.current.parentElement?.clientWidth || 300) * capturedCanvas.height / capturedCanvas.width) }
    : { sx: 1, sy: 1 };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { stopCamera(); onClose(); } }}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-sm uppercase tracking-wider">
            <ScanLine className="h-4 w-4" /> Escáner de Documento
          </DialogTitle>
        </DialogHeader>

        {phase === "capture" && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[3/4]">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-4 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none" />
              <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/70 font-display uppercase tracking-wider">
                Encuadra el documento
              </div>
            </div>
            <Button className="w-full gap-2 font-display text-xs uppercase tracking-wider" onClick={handleCapture}>
              <ScanLine className="h-4 w-4" /> Capturar
            </Button>
          </div>
        )}

        {phase === "corners" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">Arrastra las esquinas para ajustar el área de recorte</p>
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <canvas
                ref={overlayRef}
                className="w-full touch-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
              {/* Magnifier on drag */}
              {dragging !== null && capturedCanvas && (
                <MagnifierOverlay
                  canvas={capturedCanvas}
                  point={corners[dragging]}
                  displayScale={displayScale}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={applyFilter} onChange={e => setApplyFilter(e.target.checked)} className="rounded" />
                Filtro escáner (B/N nítido)
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1 text-xs" onClick={handleRetake}>
                <RotateCw className="h-3.5 w-3.5" /> Repetir
              </Button>
              <Button className="flex-1 gap-1 font-display text-xs uppercase tracking-wider" onClick={processImage}>
                <Crop className="h-3.5 w-3.5" /> Confirmar y Procesar
              </Button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-display uppercase tracking-wider">Procesando imagen…</p>
          </div>
        )}

        {phase === "preview" && resultCanvas && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">Resultado del escaneo</p>
            <div className="rounded-lg overflow-hidden border border-border bg-white max-h-[50vh] overflow-y-auto">
              <img src={resultCanvas.toDataURL("image/jpeg", 0.9)} alt="Scan result" className="w-full h-auto" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1 text-xs" onClick={handleRetake}>
                <RotateCw className="h-3.5 w-3.5" /> Repetir
              </Button>
              <Button className="flex-1 gap-1 font-display text-xs uppercase tracking-wider" onClick={handleAccept}>
                <Check className="h-3.5 w-3.5" /> Usar documento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentScanner;
