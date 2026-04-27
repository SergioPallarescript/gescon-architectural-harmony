import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STORAGE_KEY = "tektra:push-prompt-dismissed-at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Solicita el permiso de notificaciones tras el primer login con la estética
 * arquitectónica de Tektra. Solo se muestra cuando:
 *  - el navegador soporta push,
 *  - el permiso aún está en "default",
 *  - el usuario aún no se ha suscrito,
 *  - no ha pulsado "Ahora no" en los últimos 7 días.
 */
const PushPermissionModal = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !isSupported) return;
    if (isSubscribed) return;
    if (permission !== "default") return;

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    // Pequeño delay para que aparezca tras la transición del splash
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [user, isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await subscribe();
      if (ok) {
        toast.success("Notificaciones de obra activadas");
        localStorage.removeItem(STORAGE_KEY);
        setOpen(false);
      } else if (Notification.permission === "denied") {
        toast.error("Permiso denegado en el navegador. Actívalo desde los ajustes del sistema.");
        setOpen(false);
      } else {
        toast.error("No se pudieron activar las notificaciones");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setOpen(false);
  };

  if (!isSupported) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleLater(); }}>
      <DialogContent
        className="max-w-md [&>button]:hidden border border-border bg-card"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center border border-border">
              <BellRing className="h-6 w-6 text-foreground" />
            </div>
          </div>
          <DialogTitle className="font-display text-xl tracking-tight text-center">
            Notificaciones de Obra
          </DialogTitle>
        </DialogHeader>

        <p className="font-body text-sm text-muted-foreground leading-relaxed text-center">
          Recibe alertas en tiempo real sobre cambios en la dirección, incidencias
          de seguridad y actualizaciones del constructor. Mantén el control de la
          ejecución sin necesidad de abrir la app.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleEnable}
            disabled={busy}
            className="w-full font-display text-xs uppercase tracking-wider"
          >
            Activar notificaciones
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            disabled={busy}
            className="w-full font-display text-xs uppercase tracking-wider text-muted-foreground"
          >
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushPermissionModal;