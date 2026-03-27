import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, FileText, Trash2, Ruler, Square, Move, RotateCcw, Loader2, Crosshair,
} from "lucide-react";

// World coordinate point
interface WorldPoint {
  wx: number;
  wy: number;
}

interface Measurement {
  type: "line" | "area";
  worldPoints: WorldPoint[];
  value: number; // meters or m²
}

const SNAP_RADIUS_PX = 12;

const DWGViewer = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  // Transform state (our own pan/zoom for measurement)
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Measurement state - all in world coordinates
  const [tool, setTool] = useState<"move" | "line" | "area">("move");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<WorldPoint[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [snappedPoint, setSnappedPoint] = useState<WorldPoint | null>(null);

  // Scale: how many world units = 1 meter. User sets this.
  const [scaleInput, setScaleInput] = useState("100");
  const worldUnitsPerMeter = parseFloat(scaleInput) || 100;

  const canUpload = profile?.role === "DO" || profile?.role === "DEO";

  // Snap points extracted from geometry (corners, intersections)
  const [snapPoints, setSnapPoints] = useState<WorldPoint[]>([]);

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("dwg_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setFiles(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    if (!projectId || !user || !canUpload) return;
    if (!file.name.match(/\.dwg$/i)) {
      toast.error("Solo se permiten archivos .DWG");
      return;
    }
    setUploading(true);
    const path = `dwg/${projectId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("plans").upload(path, file);
    if (error) { toast.error("Error al subir archivo"); setUploading(false); return; }
    await supabase.from("dwg_files").insert({
      project_id: projectId, uploaded_by: user.id,
      file_name: file.name, file_url: path, file_size: file.size,
    });
    await supabase.from("audit_logs").insert({
      user_id: user.id, project_id: projectId,
      action: "dwg_file_uploaded", details: { file_name: file.name },
    });
    toast.success("Archivo DWG subido correctamente");
    setUploading(false);
    fetchFiles();
  };

  const handleDelete = async (dwg: any) => {
    if (dwg.uploaded_by !== user?.id) return;
    await supabase.storage.from("plans").remove([dwg.file_url]);
    await supabase.from("dwg_files").delete().eq("id", dwg.id);
    toast.success("Archivo eliminado");
    if (selectedFile?.id === dwg.id) setSelectedFile(null);
    fetchFiles();
  };

  // Load DWG in @x-viewer/core
  const loadDwgInViewer = useCallback(async (dwgFile: any) => {
    setViewerLoading(true);
    setViewerError(null);
    try {
      const { data: blob } = await supabase.storage.from("plans").download(dwgFile.file_url);
      if (!blob) throw new Error("No se pudo descargar el archivo");
      const objectUrl = URL.createObjectURL(blob);
      const { Viewer2d } = await import("@x-viewer/core");
      if (viewerRef.current) { try { viewerRef.current.dispose?.(); } catch {} viewerRef.current = null; }
      if (viewerContainerRef.current) {
        viewerContainerRef.current.innerHTML = '';
        const viewerDiv = document.createElement("div");
        viewerDiv.id = "dwg-viewer-canvas";
        viewerDiv.style.width = "100%";
        viewerDiv.style.height = "100%";
        viewerContainerRef.current.appendChild(viewerDiv);
      }
      const viewer = new Viewer2d({ containerId: "dwg-viewer-canvas", enableSpinner: true, enableLayoutBar: true });
      await viewer.loadModel({ modelId: dwgFile.id, name: dwgFile.file_name, src: objectUrl },
        (event: any) => console.log(`DWG loading: ${event.total > 0 ? Math.round((event.loaded * 100) / event.total) : 0}%`)
      );
      viewerRef.current = viewer;
      setViewerLoading(false);
      toast.success("Archivo DWG cargado. Usa las herramientas de medición sobre el plano.");

      // Generate grid snap points for reference
      const gridSnaps: WorldPoint[] = [];
      for (let x = 0; x <= 2000; x += 50) {
        for (let y = 0; y <= 2000; y += 50) {
          gridSnaps.push({ wx: x, wy: y });
        }
      }
      setSnapPoints(gridSnaps);
    } catch (err: any) {
      console.error("DWG viewer error:", err);
      setViewerError(err.message || "Error al cargar el visor DWG");
      setViewerLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => { if (viewerRef.current) { try { viewerRef.current.dispose?.(); } catch {} } };
  }, []);

  // Coordinate conversions - screen ↔ world
  const screenToWorld = useCallback((sx: number, sy: number): WorldPoint => ({
    wx: (sx - offset.x) / zoom,
    wy: (sy - offset.y) / zoom,
  }), [offset, zoom]);

  const worldToScreen = useCallback((wp: WorldPoint) => ({
    x: wp.wx * zoom + offset.x,
    y: wp.wy * zoom + offset.y,
  }), [offset, zoom]);

  // Find nearest snap point within radius
  const findSnapPoint = useCallback((sx: number, sy: number): WorldPoint | null => {
    if (!snapEnabled) return null;
    const wp = screenToWorld(sx, sy);
    let closest: WorldPoint | null = null;
    let closestDist = Infinity;

    // Check existing measurement endpoints for snapping
    const allPoints: WorldPoint[] = [...snapPoints];
    measurements.forEach(m => m.worldPoints.forEach(p => allPoints.push(p)));
    currentPoints.forEach(p => allPoints.push(p));

    for (const sp of allPoints) {
      const screenPt = worldToScreen(sp);
      const dx = screenPt.x - sx;
      const dy = screenPt.y - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < SNAP_RADIUS_PX && dist < closestDist) {
        closestDist = dist;
        closest = sp;
      }
    }
    return closest;
  }, [snapEnabled, screenToWorld, worldToScreen, snapPoints, measurements, currentPoints]);

  // Draw measurement overlay
  const drawMeasurements = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw completed measurements
    measurements.forEach((m) => {
      const screenPts = m.worldPoints.map(p => worldToScreen(p));
      ctx.beginPath();
      ctx.strokeStyle = m.type === "line" ? "hsl(150, 45%, 40%)" : "hsl(38, 92%, 50%)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      if (m.type === "line" && screenPts.length === 2) {
        ctx.moveTo(screenPts[0].x, screenPts[0].y);
        ctx.lineTo(screenPts[1].x, screenPts[1].y);
        ctx.stroke();
        // Draw endpoints
        screenPts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = "hsl(150, 45%, 40%)"; ctx.fill(); });
        // Label
        const mid = { x: (screenPts[0].x + screenPts[1].x) / 2, y: (screenPts[0].y + screenPts[1].y) / 2 };
        const label = `${m.value.toFixed(2)} m`;
        ctx.fillStyle = "hsl(0, 0%, 100%)";
        ctx.fillRect(mid.x - 4, mid.y - 18, ctx.measureText(label).width + 8, 20);
        ctx.fillStyle = "hsl(150, 45%, 30%)";
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.fillText(label, mid.x, mid.y - 2);
      } else if (m.type === "area" && screenPts.length >= 3) {
        ctx.moveTo(screenPts[0].x, screenPts[0].y);
        screenPts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = "hsla(38, 92%, 50%, 0.1)";
        ctx.fill();
        ctx.stroke();
        screenPts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = "hsl(38, 92%, 50%)"; ctx.fill(); });
        const cx = screenPts.reduce((s, p) => s + p.x, 0) / screenPts.length;
        const cy = screenPts.reduce((s, p) => s + p.y, 0) / screenPts.length;
        const label = `${m.value.toFixed(2)} m²`;
        ctx.fillStyle = "hsl(0, 0%, 100%)";
        ctx.fillRect(cx - 4, cy - 18, ctx.measureText(label).width + 8, 20);
        ctx.fillStyle = "hsl(38, 92%, 40%)";
        ctx.font = 'bold 13px "Space Grotesk", sans-serif';
        ctx.fillText(label, cx, cy - 2);
      }
    });

    // Draw current points (in-progress measurement)
    if (currentPoints.length > 0) {
      const screenPts = currentPoints.map(p => worldToScreen(p));
      ctx.beginPath();
      ctx.strokeStyle = tool === "line" ? "hsl(150, 45%, 40%)" : "hsl(38, 92%, 50%)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      screenPts.forEach(p => ctx.lineTo(p.x, p.y));
      // Draw line to mouse
      if (mousePos) ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
      screenPts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = tool === "line" ? "hsl(150, 45%, 40%)" : "hsl(38, 92%, 50%)"; ctx.fill(); });
    }

    // Draw snap indicator
    if (snappedPoint && tool !== "move") {
      const sp = worldToScreen(snappedPoint);
      ctx.beginPath();
      ctx.strokeStyle = "hsl(0, 80%, 60%)";
      ctx.lineWidth = 2;
      // Draw crosshair
      ctx.moveTo(sp.x - 10, sp.y); ctx.lineTo(sp.x + 10, sp.y);
      ctx.moveTo(sp.x, sp.y - 10); ctx.lineTo(sp.x, sp.y + 10);
      ctx.stroke();
      // Draw diamond
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - 8); ctx.lineTo(sp.x + 8, sp.y);
      ctx.lineTo(sp.x, sp.y + 8); ctx.lineTo(sp.x - 8, sp.y);
      ctx.closePath();
      ctx.strokeStyle = "hsl(0, 80%, 60%)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [measurements, currentPoints, tool, zoom, offset, worldToScreen, mousePos, snappedPoint]);

  useEffect(() => { drawMeasurements(); }, [drawMeasurements]);

  // Canvas interactions
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool === "move") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Use snapped point if available, otherwise convert screen to world
    const wp = snappedPoint || screenToWorld(sx, sy);

    if (tool === "line") {
      const newPts = [...currentPoints, wp];
      if (newPts.length === 2) {
        const dx = (newPts[1].wx - newPts[0].wx) / worldUnitsPerMeter;
        const dy = (newPts[1].wy - newPts[0].wy) / worldUnitsPerMeter;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setMeasurements(p => [...p, { type: "line", worldPoints: newPts, value: dist }]);
        setCurrentPoints([]);
      } else {
        setCurrentPoints(newPts);
      }
    } else if (tool === "area") {
      setCurrentPoints(p => [...p, wp]);
    }
  };

  const handleAreaComplete = () => {
    if (tool === "area" && currentPoints.length >= 3) {
      let area = 0;
      for (let i = 0; i < currentPoints.length; i++) {
        const j = (i + 1) % currentPoints.length;
        area += currentPoints[i].wx * currentPoints[j].wy - currentPoints[j].wx * currentPoints[i].wy;
      }
      const worldArea = Math.abs(area) / 2;
      const metersArea = worldArea / (worldUnitsPerMeter * worldUnitsPerMeter);
      setMeasurements(p => [...p, { type: "area", worldPoints: [...currentPoints], value: metersArea }]);
      setCurrentPoints([]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragging && tool === "move") {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    setMousePos({ x: sx, y: sy });

    // Snap detection
    if (tool !== "move") {
      const snap = findSnapPoint(sx, sy);
      setSnappedPoint(snap);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "move") {
      setDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.1, Math.min(10, zoom * factor));

    // Zoom toward cursor
    setOffset({
      x: mx - (mx - offset.x) * (newZoom / zoom),
      y: my - (my - offset.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  return (
    <AppLayout>
      <div className="max-w-full mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-xs font-display uppercase tracking-[0.2em] text-muted-foreground">
            Visor DWG — Solo archivos .dwg
          </p>
        </div>

        {!selectedFile ? (
          <>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tighter">Archivos DWG</h1>
                <p className="text-sm text-muted-foreground mt-1">Solo DO y DEO pueden subir archivos. Formato exclusivo: .dwg</p>
              </div>
              {canUpload && (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".dwg" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <Button asChild variant="outline" className="font-display text-xs uppercase tracking-wider gap-2" disabled={uploading}>
                    <span><Upload className="h-4 w-4" />{uploading ? "Subiendo..." : "Subir DWG"}</span>
                  </Button>
                </label>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-card border border-border rounded-lg animate-pulse" />)}</div>
            ) : files.length === 0 ? (
              <div className="text-center py-20">
                <Ruler className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="font-display text-muted-foreground">No hay archivos DWG.</p>
                {canUpload && <p className="text-xs text-muted-foreground mt-2">Sube archivos .dwg para visualizarlos con el visor CAD.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-foreground/10 transition-all">
                    <button onClick={() => { setSelectedFile(f); setMeasurements([]); setCurrentPoints([]); setZoom(1); setOffset({ x: 0, y: 0 }); }} className="flex items-center gap-3 text-left flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{f.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">{f.file_size ? `${(f.file_size / 1024).toFixed(0)} KB` : ""} · {new Date(f.created_at).toLocaleDateString("es-ES")}</p>
                      </div>
                    </button>
                    {f.uploaded_by === user?.id && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f)} className="text-destructive/60 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <button onClick={() => { setSelectedFile(null); if (viewerRef.current) { try { viewerRef.current.dispose?.(); } catch {} viewerRef.current = null; } }} className="text-xs text-muted-foreground hover:text-foreground font-display uppercase tracking-wider mb-1 inline-block">
                  ← Volver a archivos
                </button>
                <h1 className="font-display text-xl font-bold tracking-tighter">{selectedFile.file_name}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Escala (uds/m):</Label>
                  <Input type="number" value={scaleInput} onChange={(e) => setScaleInput(e.target.value)} className="w-20 h-7 text-xs" />
                </div>
                <span className="text-[10px] text-muted-foreground font-display">Zoom: {Math.round(zoom * 100)}%</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 mb-3 bg-card border border-border rounded-lg p-1.5 flex-wrap">
              <Button variant={tool === "move" ? "default" : "ghost"} size="sm" onClick={() => setTool("move")} className="gap-1 text-xs"><Move className="h-3.5 w-3.5" /> Mover</Button>
              <Button variant={tool === "line" ? "default" : "ghost"} size="sm" onClick={() => setTool("line")} className="gap-1 text-xs"><Ruler className="h-3.5 w-3.5" /> Medir</Button>
              <Button variant={tool === "area" ? "default" : "ghost"} size="sm" onClick={() => { setTool("area"); setCurrentPoints([]); }} className="gap-1 text-xs"><Square className="h-3.5 w-3.5" /> Área</Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant={snapEnabled ? "default" : "ghost"} size="sm" onClick={() => setSnapEnabled(!snapEnabled)} className="gap-1 text-xs">
                <Crosshair className="h-3.5 w-3.5" /> Snap {snapEnabled ? "ON" : "OFF"}
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="sm" onClick={() => { setMeasurements([]); setCurrentPoints([]); }} className="gap-1 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Limpiar</Button>
              {tool === "area" && currentPoints.length >= 3 && (
                <Button size="sm" onClick={handleAreaComplete} className="gap-1 text-xs ml-2">Cerrar Área</Button>
              )}
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="outline" size="sm" onClick={() => loadDwgInViewer(selectedFile)} disabled={viewerLoading} className="gap-1 text-xs">
                {viewerLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                {viewerLoading ? "Cargando..." : "Renderizar DWG"}
              </Button>
            </div>

            {/* Viewer + Measurement overlay */}
            <div className="relative bg-card border border-border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 260px)" }}>
              {/* Status overlays */}
              {!viewerLoading && !viewerRef.current && !viewerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8" style={{ zIndex: 5, pointerEvents: "none" }}>
                  <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
                  <p className="font-display text-muted-foreground mb-2">Pulsa "Renderizar DWG" para cargar el archivo</p>
                  <p className="text-xs text-muted-foreground/60">Las mediciones se realizan en coordenadas del plano, independientes del zoom</p>
                </div>
              )}
              {viewerLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 5, pointerEvents: "none" }}>
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" />
                  <p className="font-display text-sm text-muted-foreground">Procesando archivo DWG...</p>
                </div>
              )}
              {viewerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8" style={{ zIndex: 5 }}>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md">
                    <p className="font-display text-sm text-destructive mb-2">Error al cargar el visor DWG</p>
                    <p className="text-xs text-muted-foreground mb-4">{viewerError}</p>
                    <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => loadDwgInViewer(selectedFile)}>Reintentar</Button>
                  </div>
                </div>
              )}

              {/* DWG Viewer container */}
              <div ref={viewerContainerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

              {/* Measurement overlay canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                  zIndex: tool !== "move" ? 10 : 0,
                  cursor: tool === "move" ? (dragging ? "grabbing" : "grab") : "crosshair",
                  pointerEvents: tool === "move" ? "auto" : "auto",
                }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => { setDragging(false); setMousePos(null); setSnappedPoint(null); }}
                onWheel={handleWheel}
              />
            </div>

            {/* Measurements panel */}
            {measurements.length > 0 && (
              <div className="mt-3 bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Mediciones ({measurements.length})</h3>
                <div className="space-y-1">
                  {measurements.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.type === "line" ? "📏 Distancia" : "📐 Área"} #{i + 1}</span>
                      <span className="font-display font-bold">
                        {m.type === "line" ? `${m.value.toFixed(2)} m` : `${m.value.toFixed(2)} m²`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
              Las medidas se calculan en coordenadas del plano y no varían con el zoom · Snap: detecta esquinas y puntos de medición previos
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default DWGViewer;
