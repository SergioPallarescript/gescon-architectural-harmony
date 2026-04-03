import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HelpChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SYSTEM_CONTEXT = `Eres el asistente de ayuda de TEKTRA, una plataforma de gestión de obras de construcción en España.

Tu función es ayudar a los usuarios a entender cómo usar la plataforma. Conoces estas funcionalidades:
- **Dashboard de Proyectos**: Crear obras, invitar agentes (DO, DEM, CON, PRO, CSS).
- **Documentación de Proyecto**: Subir y gestionar documentos base de la obra.
- **Planos Válidos**: Subir planos con control de versiones. Solo DO y DEM suben; todos validan.
- **Cerebro de Obra**: IA que responde preguntas sobre la memoria y mediciones del proyecto.
- **Metro Digital**: Herramienta para medir distancias y áreas sobre planos PDF.
- **Libro de Órdenes**: Solo DEM registra órdenes de ejecución.
- **Libro de Incidencias**: Solo CSS registra incidencias de seguridad.
- **Validación Económica**: Constructor sube certificaciones; DO y DEM firman técnicamente; Promotor autoriza pago.
- **Docs Finales (CFO)**: Certificado final de obra con 16 puntos de control.
- **Diagrama Gantt**: Cronograma visual de hitos de obra.
- **Firma Digital**: Firma con certificado digital (.p12/.pfx) o firma manual con canvas.
- **Notificaciones**: Campana de alertas con notificaciones push.

Responde siempre en español, de forma concisa y práctica. Si no conoces algo, di que contacten con soporte.`;

const HelpChat = ({ open, onOpenChange }: HelpChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: "¡Hola! Soy el asistente de TEKTRA. ¿En qué puedo ayudarte?" }]);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("brain-chat", {
        body: {
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          projectContext: SYSTEM_CONTEXT,
          projectId: null,
        },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });

      if (error) throw error;
      const reply = data?.reply || data?.message || "No he podido procesar tu consulta.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Error al conectar con el asistente. Inténtalo de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" /> Asistente TEKTRA
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 min-h-0" style={{ maxHeight: "50vh" }}>
          <div className="space-y-4 py-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && <Bot className="h-5 w-5 text-accent mt-1 shrink-0" />}
                <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
                {msg.role === "user" && <User className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <Bot className="h-5 w-5 text-accent mt-1 shrink-0" />
                <div className="bg-secondary rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="px-6 pb-6 pt-2 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpChat;
