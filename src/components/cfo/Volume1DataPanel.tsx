import { useEffect, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  fetchVolume1Data,
  upsertVolume1Field,
  validateVolume1Field,
  type Volume1Data,
} from "@/lib/cfoAi";

type Field = {
  key: keyof Volume1Data;
  label: string;
  type?: "text" | "number" | "date";
  placeholder?: string;
};

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Identificación",
    fields: [
      { key: "municipio", label: "Municipio" },
      { key: "emplazamiento", label: "Emplazamiento" },
      { key: "codigo_postal", label: "Código postal" },
      { key: "nrc", label: "NRC (Ref. catastral)", placeholder: "20 caracteres" },
    ],
  },
  {
    title: "Registro de la Propiedad",
    fields: [
      { key: "registro_numero", label: "Registro nº" },
      { key: "tomo", label: "Tomo" },
      { key: "libro", label: "Libro" },
      { key: "folio", label: "Folio" },
      { key: "finca", label: "Finca" },
    ],
  },
  {
    title: "Seguros",
    fields: [
      { key: "poliza_decenal_compania", label: "Póliza decenal — Compañía" },
      { key: "poliza_decenal_numero", label: "Póliza decenal — Nº" },
    ],
  },
  {
    title: "Superficies y unidades",
    fields: [
      { key: "superficie_parcela", label: "Sup. parcela (m²)", type: "number" },
      { key: "superficie_construida", label: "Sup. construida (m²)", type: "number" },
      { key: "superficie_util", label: "Sup. útil (m²)", type: "number" },
      { key: "numero_viviendas", label: "Nº viviendas", type: "number" },
      { key: "numero_plantas", label: "Nº plantas", type: "number" },
    ],
  },
  {
    title: "Cronología",
    fields: [
      { key: "numero_licencia_obra", label: "Nº licencia de obra" },
      { key: "fecha_licencia_obra", label: "Fecha licencia", type: "date" },
      { key: "fecha_inicio_obra", label: "Inicio de obra", type: "date" },
      { key: "fecha_fin_obra", label: "Fin de obra", type: "date" },
    ],
  },
];

interface Volume1DataPanelProps {
  projectId: string;
  canEdit: boolean;
  refreshKey?: number;
}

export const Volume1DataPanel = ({ projectId, canEdit, refreshKey = 0 }: Volume1DataPanelProps) => {
  const [data, setData] = useState<Volume1Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchVolume1Data(projectId);
      setData(res);
      const init: Record<string, string> = {};
      SECTIONS.flatMap((s) => s.fields).forEach((f) => {
        const v = res?.[f.key];
        init[String(f.key)] = v === null || v === undefined ? "" : String(v);
      });
      setLocalValues(init);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshKey]);

  const handleSave = async (field: Field) => {
    if (!canEdit) return;
    const fieldKey = String(field.key);
    const raw = localValues[fieldKey] ?? "";
    let value: string | number | null = raw === "" ? null : raw;
    if (field.type === "number" && value !== null) {
      const n = Number(value);
      if (Number.isNaN(n)) {
        toast.error("Valor numérico inválido");
        return;
      }
      value = n;
    }
    setSavingField(fieldKey);
    try {
      await upsertVolume1Field(projectId, fieldKey, value);
      toast.success("Guardado");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSavingField(null);
    }
  };

  const handleValidate = async (field: Field) => {
    const fieldKey = String(field.key);
    setSavingField(fieldKey);
    try {
      await validateVolume1Field(projectId, fieldKey);
      toast.success("Sugerencia validada");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSavingField(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando datos del Volumen 1…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <Card key={section.title} className="p-4">
          <h4 className="font-semibold text-sm uppercase tracking-wide mb-3 text-muted-foreground">
            {section.title}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.fields.map((field) => {
              const fieldKey = String(field.key);
              const aiKey = `${fieldKey}_ai` as keyof Volume1Data;
              const isAi = Boolean(data?.[aiKey]);
              const isSaving = savingField === fieldKey;
              return (
                <div key={fieldKey} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={fieldKey} className="text-xs">{field.label}</Label>
                    {isAi && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        <Sparkles className="w-2.5 h-2.5" /> IA
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      id={fieldKey}
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      disabled={!canEdit || isSaving}
                      value={localValues[fieldKey] ?? ""}
                      onChange={(e) => setLocalValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                      onBlur={() => {
                        const orig = data?.[field.key];
                        const current = localValues[fieldKey] ?? "";
                        const origStr = orig === null || orig === undefined ? "" : String(orig);
                        if (current !== origStr) handleSave(field);
                      }}
                      className={isAi ? "bg-primary/5 border-primary/30" : ""}
                    />
                    {isAi && canEdit && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleValidate(field)}
                        disabled={isSaving}
                        title="Validar sugerencia IA"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      {data?.last_ai_scan_at && (
        <p className="text-xs text-muted-foreground text-right">
          Último análisis IA: {new Date(data.last_ai_scan_at).toLocaleString("es-ES")}
        </p>
      )}
    </div>
  );
};
