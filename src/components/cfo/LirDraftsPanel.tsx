import { useEffect, useState } from "react";
import { Sparkles, Check, Loader2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLirDrafts,
  updateLirDraft,
  validateLirDraft,
  deleteLirDraft,
  type LirDraft,
} from "@/lib/cfoAi";

interface LirDraftsPanelProps {
  projectId: string;
  canEdit: boolean;
  refreshKey?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  carpinteria: "Carpintería",
  estructura: "Estructura",
  cubierta: "Cubierta",
  fachada: "Fachada",
  instalaciones: "Instalaciones",
  acabados: "Acabados",
  otros: "Otros",
};

export const LirDraftsPanel = ({ projectId, canEdit, refreshKey = 0 }: LirDraftsPanelProps) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<LirDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<LirDraft>>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchLirDrafts(projectId);
      setDrafts(res);
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

  const handleFieldChange = (id: string, field: keyof LirDraft, value: string) => {
    setLocalEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (draft: LirDraft) => {
    const patch = localEdits[draft.id];
    if (!patch || Object.keys(patch).length === 0) return;
    setSavingId(draft.id);
    try {
      await updateLirDraft(draft.id, patch);
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[draft.id];
        return next;
      });
      toast.success("Ficha actualizada");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSavingId(null);
    }
  };

  const handleValidate = async (draft: LirDraft) => {
    if (!user) return;
    setSavingId(draft.id);
    try {
      // Save pending edits first
      const patch = localEdits[draft.id];
      if (patch && Object.keys(patch).length > 0) {
        await updateLirDraft(draft.id, patch);
      }
      await validateLirDraft(draft.id, user.id);
      toast.success("Ficha validada");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (draft: LirDraft) => {
    if (!confirm(`¿Eliminar la ficha "${draft.material_label}"?`)) return;
    setSavingId(draft.id);
    try {
      await deleteLirDraft(draft.id);
      toast.success("Ficha eliminada");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando fichas L/I/N/R…
      </Card>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No hay fichas de mantenimiento generadas todavía. Pulsa "Analizar con IA" para que el sistema detecte materiales en la memoria del proyecto y proponga las fichas L/I/N/R automáticamente.
      </Card>
    );
  }

  // Group by category
  const grouped: Record<string, LirDraft[]> = {};
  drafts.forEach((d) => {
    const cat = d.category || "otros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(d);
  });

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[cat] || cat}
          </h4>
          {items.map((draft) => {
            const isOpen = openId === draft.id;
            const edits = localEdits[draft.id] || {};
            const current = { ...draft, ...edits };
            const isSaving = savingId === draft.id;
            const hasUnsaved = Object.keys(edits).length > 0;

            return (
              <Card key={draft.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : draft.id)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <span className="font-medium text-sm truncate">{draft.material_label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!draft.is_validated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        <Sparkles className="w-2.5 h-2.5" /> Borrador IA
                      </span>
                    )}
                    {draft.is_validated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                        <Check className="w-2.5 h-2.5" /> Validada
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className={`p-4 border-t space-y-3 ${!draft.is_validated ? "bg-primary/5" : ""}`}>
                    {(["limpieza", "inspeccion", "normas_uso", "reparacion"] as const).map((f) => (
                      <div key={f} className="space-y-1">
                        <Label className="text-xs capitalize">
                          {f === "normas_uso" ? "Normas de uso" : f}
                        </Label>
                        <Textarea
                          rows={3}
                          value={(current[f] as string) || ""}
                          disabled={!canEdit || isSaving}
                          onChange={(e) => handleFieldChange(draft.id, f, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                    {canEdit && (
                      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(draft)}
                          disabled={isSaving}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                        </Button>
                        {hasUnsaved && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(draft)}
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                            Guardar cambios
                          </Button>
                        )}
                        {!draft.is_validated && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleValidate(draft)}
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                            Validar ficha
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
};
