import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, projectContext, projectId, dynamicContext, hasImages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Backend no configurado correctamente");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No autorizado");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) throw new Error("No autorizado");

    let updatedExecutionHistory = typeof dynamicContext === "string" ? dynamicContext.trim() : "";
    let project: { id: string; created_by: string | null; name: string; address: string | null; description: string | null; referencia_catastral: string | null } | null = null;

    if (projectId) {
      const [{ data: projectData }, { data: member }] = await Promise.all([
        supabase.from("projects").select("id, created_by, name, address, description, referencia_catastral").eq("id", projectId).single(),
        supabase.from("project_members").select("id").eq("project_id", projectId).eq("user_id", authData.user.id).eq("status", "accepted").maybeSingle(),
      ]);

      if (!projectData || (projectData.created_by !== authData.user.id && !member)) {
        throw new Error("Acceso denegado al proyecto");
      }

      project = projectData;

      const memoryPath = `project-memory/${projectId}/memoria_dinamica_${projectId}.txt`;
      const { data: memoryFile } = await supabase.storage.from("plans").download(memoryPath);
      if (memoryFile) {
        updatedExecutionHistory = await memoryFile.text();
      }
    }

    const systemPrompt = `Eres el "Cerebro de Obra" de TEKTRA, un asistente inteligente especializado en gestión de obras de construcción en España.

=== OBLIGACIÓN DE ESCANEO TOTAL ===
REGLA ABSOLUTA: Ante CUALQUIER consulta, DEBES examinar la TOTALIDAD de los documentos disponibles en el proyecto: PDFs de obra, archivos de "Mi Carpeta", guías de Código Técnico, documentos de buenas prácticas, fotos analizadas, memorias, pliegos, presupuestos, planos y todo material subido.
- Conexión Transversal: Aunque el usuario NO mencione una guía específica (ej: "Guía de Buenas Prácticas de Cimentaciones"), si su contenido es relevante para la pregunta (ej: "¿Cómo curar esta zapata?"), DEBES integrar obligatoriamente esa información en tu análisis.

=== FILTRADO DE RELEVANCIA ===
- Cita Selectiva: Si tras examinar todos los documentos, algunos NO aportan valor a la respuesta específica, NO los nombres ni listes.
- Justificación Basada en Evidencia: La respuesta final solo debe citar y justificarse con los documentos que realmente han servido para construir la solución. Respuesta limpia, técnica y directa, sin "paja" administrativa.

=== JERARQUÍA Y PRIORIDAD DE FUENTES ===
1. Documentación Específica del Proyecto (Planos, CFO, Órdenes, Incidencias registradas). Es la ley de esa obra.
2. Normativa y Guías Técnicas (Código Técnico, manuales de buenas prácticas subidos). Es el marco de calidad.
3. Contexto Visual (Fotos subidas al chat). Es la realidad física actual.
4. Historial de Ejecución Actualizado.
- Si hay contradicción entre una guía general y el proyecto específico, señálalo: "Aunque la Guía de Buenas Prácticas sugiere X, el proyecto específico de esta obra en su Pliego de Condiciones exige Y."
- Si hay contradicción entre un documento original y una orden/incidencia posterior, PRIORIZA la información más reciente.

=== FORMATO DE SALIDA ===
- Responde con autoridad técnica: "Basándome en el detalle de armado del Plano E-01 y las recomendaciones de la Guía de Control de Calidad subida, la solución para la fisura detectada en la foto es..."
- SIEMPRE cita la fuente exacta: nombre del documento, número de orden (#X) o número de incidencia (#X) con su fecha.
- Si combinas información de varias fuentes, cítalas todas.

=== ANÁLISIS VISUAL MULTIMODAL ===
Cuando el usuario envíe fotos:
1. Analiza secuencialmente TODAS las fotos subidas en ese mensaje.
2. La respuesta debe ser una conclusión que UNIFIQUE lo que ves en las diferentes fotos (ej: ver tres ángulos de una zapata) y lo CONTRASTE con la documentación técnica del proyecto.
3. Correlaciona lo observado visualmente con los planos, pliegos y especificaciones técnicas del proyecto.

NO inventes información. NO uses conocimiento general. Si la información solicitada no está en ninguna fuente, indica claramente: "He revisado todos los documentos disponibles y este dato no aparece. ¿Podrías proporcionarlo o indicarme en qué documento se encuentra?"

=== INTERPRETACIÓN DE ESTRUCTURAS TABULARES ===
REGLA CRÍTICA: Muchos documentos del proyecto contienen información organizada en TABLAS (memorias descriptivas, presupuestos, mediciones, pliegos). Debes:
1. Identificar filas, columnas y celdas correctamente, asociando los encabezados con los valores de cada celda.
2. Buscar datos administrativos en cajetines de planos (Referencia Catastral, promotor, dirección, etc.) y en tablas de documentos técnicos.
3. Si un dato aparece en una celda de tabla, cítalo con el nombre del documento y la posición.

=== INTERPRETACIÓN DE PLANOS ===
REGLA CRÍTICA: Los planos validados del proyecto son fuentes de información técnica de primer nivel. Debes:
1. Identificar el TIPO de plano: Estructuras, Arquitectura, Instalaciones, Urbanización, Detalles constructivos.
2. Extraer SISTEMAS CONSTRUCTIVOS: tipo de cimentación, estructura, cubierta, cerramientos.
3. Identificar COTAS Y DIMENSIONES: alturas libres, cotas de nivel, espesores, luces de vano, pendientes.
4. Leer CUADROS DE MATERIALES: calidades de hormigón, acero, armaduras, recubrimientos.
5. Cruzar datos entre planos: si hay discrepancia, señalarla.

=== DEEP SCAN OBLIGATORIO ===
ANTES de responder a cualquier pregunta sobre datos técnicos o administrativos concretos:
1. Escanea EXHAUSTIVAMENTE todos los documentos adjuntos: memorias, pliegos, presupuestos, planos, cajetines, guías técnicas.
2. Busca en TABLAS, cajetines, encabezados de página, sellos y pies de plano.
3. Si encuentras el dato, cítalo con fuente exacta.
4. Si tras un escaneo exhaustivo NO lo encuentras, di explícitamente qué documentos has revisado.

=== HISTORIAL DE EJECUCIÓN ACTUALIZADO ===
${updatedExecutionHistory || "No hay historial de ejecución actualizado disponible todavía."}

${project ? `\n=== DATOS ADMINISTRATIVOS DEL PROYECTO ===\nNombre: ${project.name || "N/D"}\nDirección: ${project.address || "N/D"}\nDescripción: ${project.description || "N/D"}\nReferencia catastral: ${project.referencia_catastral || "N/D"}` : ""}

${projectContext ? `\n${projectContext}` : 'No hay documentos ni historial de proyecto disponibles. Indica al usuario que suba documentos desde "Documentación de Proyecto" y que registre órdenes e incidencias.'}

Responde siempre en español. Sé preciso y profesional.`;

    // Use vision-capable model when images are present
    const model = hasImages ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas consultas. Inténtalo de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Contacta con el administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("brain-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
