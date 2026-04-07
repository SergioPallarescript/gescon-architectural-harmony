import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw, Loader2, FileWarning } from "lucide-react";

interface DocumentPreviewProps {
  url: string;
  fileName: string;
  className?: string;
}

const DocumentPreview = ({ url, fileName, className = "" }: DocumentPreviewProps) => {
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState(false);

  const isPdf = fileName?.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(fileName || "");

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleReset = () => setZoom(100);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-[300px] text-muted-foreground ${className}`}>
        <FileWarning className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">No se pudo cargar la previsualización</p>
        <p className="text-[10px] mt-1">Descarga el archivo para visualizarlo</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Zoom controls */}
      <div className="flex items-center gap-1 mb-2">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut} disabled={zoom <= 25}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] font-display uppercase tracking-wider text-muted-foreground w-12 text-center">{zoom}%</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn} disabled={zoom >= 300}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
          <RotateCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Preview container with scroll */}
      <div className="overflow-auto rounded border border-border bg-muted/30" style={{ maxHeight: "500px" }}>
        {isPdf ? (
          <object
            data={`${url}#toolbar=1&navpanes=0`}
            type="application/pdf"
            className="rounded"
            style={{
              width: `${zoom}%`,
              height: zoom === 100 ? "450px" : `${Math.round(450 * zoom / 100)}px`,
              minWidth: "100%",
            }}
            onError={() => setError(true)}
          >
            {/* Fallback: try embed */}
            <embed
              src={url}
              type="application/pdf"
              style={{ width: "100%", height: "450px" }}
            />
          </object>
        ) : isImage ? (
          <img
            src={url}
            alt={fileName}
            className="object-contain mx-auto"
            style={{
              maxWidth: `${zoom}%`,
              transition: "max-width 0.2s ease",
            }}
            onError={() => setError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            Formato no soportado para previsualización
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
