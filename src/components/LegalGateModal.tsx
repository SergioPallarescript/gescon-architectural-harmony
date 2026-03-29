import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalGateModalProps {
  open: boolean;
  onAccept: () => void;
}

const LegalGateModal = ({ open, onAccept }: LegalGateModalProps) => {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!user || !accepted) return;
    setSubmitting(true);
    try {
      await supabase
        .from("profiles")
        .update({ terms_accepted_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
      onAccept();
    } catch {
      // silently retry next time
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            Términos de Uso y Confidencialidad
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">
              TEKTRA — Plataforma de Gestión Integral de Obras
            </p>

            <p>
              Al acceder a TEKTRA, usted reconoce y acepta que esta plataforma constituye una
              herramienta profesional de gestión documental, comunicación técnica y trazabilidad
              legal para proyectos de construcción, sujeta a las siguientes condiciones:
            </p>

            <p className="font-semibold text-foreground">1. Propiedad Intelectual</p>
            <p>
              La metodología de gestión de TEKTRA, incluyendo su sistema de cinco roles profesionales
              (Director de Obra, Director de Ejecución Material, Contratista, Promotor y Coordinador
              de Seguridad y Salud), el flujo de firmas digitales con hash de validación, y los
              algoritmos de procesamiento de lenguaje natural para libros de obra, son propiedad
              exclusiva de TEKTRA y están protegidos por la legislación vigente en materia de
              propiedad intelectual e industrial.
            </p>

            <p className="font-semibold text-foreground">2. Confidencialidad</p>
            <p>
              Toda la información introducida, generada o almacenada en la plataforma —incluyendo
              documentación técnica, órdenes, incidencias, planos, certificados y comunicaciones—
              tiene carácter estrictamente confidencial. El usuario se compromete a no divulgar,
              reproducir ni distribuir dicha información fuera del ámbito profesional del proyecto
              al que está asignado.
            </p>

            <p className="font-semibold text-foreground">3. Trazabilidad Legal</p>
            <p>
              Todas las acciones realizadas en la plataforma —creación, modificación, eliminación
              de registros, firmas, validaciones y consultas— quedan registradas de forma inmutable
              con identificación de usuario, sello temporal (timestamp) y geolocalización. Estos
              registros podrán ser utilizados como evidencia en procedimientos legales, arbitrajes
              o auditorías técnicas.
            </p>

            <p className="font-semibold text-foreground">4. Responsabilidad del Usuario</p>
            <p>
              El usuario es responsable de la veracidad y precisión de la información que introduce
              en la plataforma. Las anotaciones en los Libros de Órdenes e Incidencias tienen
              carácter de documento oficial de obra y pueden tener implicaciones legales conforme
              a la Ley 38/1999 de Ordenación de la Edificación (LOE).
            </p>

            <p className="font-semibold text-foreground">5. Protección de Datos</p>
            <p>
              TEKTRA cumple con el Reglamento General de Protección de Datos (RGPD) y la Ley
              Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos
              digitales (LOPDGDD). Los datos personales serán tratados exclusivamente para la
              prestación del servicio contratado.
            </p>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-snug">
              He leído y acepto los términos de uso y confidencialidad de TEKTRA.
            </span>
          </label>

          <Button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="w-full font-display text-xs uppercase tracking-wider"
          >
            {submitting ? "Registrando aceptación…" : "Aceptar y Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LegalGateModal;
