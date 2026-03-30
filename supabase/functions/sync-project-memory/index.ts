import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MEMORY_BUCKET = "plans";

const memoryPathForProject = (projectId: string) => `project-memory/${projectId}/memoria_dinamica_${projectId}.txt`;

const buildDynamicMemoryText = ({
  project,
  orders,
  incidents,
  profileMap,
}: {
  project: any;
  orders: any[];
  incidents: any[];
  profileMap: Record<string, { full_name?: string | null; role?: string | null }>;
}) => {
  const generatedAt = new Date().toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const ordersText = orders.length
    ? orders.map((order) => {
        const author = profileMap[order.created_by] || {};
        return [
          `[Orden #${order.order_number}]`,
          `Fecha: ${new Date(order.created_at).toLocaleString("es-ES")}`,
          `Autor: ${author.full_name || "Desconocido"}`,
          `Rol: ${author.role || "No disponible"}`,
          "Contenido literal:",
          order.content,
        ].join("\n");
      }).join("\n\n---\n\n")
    : "No existen órdenes registradas en este proyecto.";

  const incidentsText = incidents.length
    ? incidents.map((incident) => {
        const author = profileMap[incident.created_by] || {};
        return [
          `[Incidencia #${incident.incident_number}]`,
          `Fecha: ${new Date(incident.created_at).toLocaleString("es-ES")}`,
          `Autor: ${author.full_name || "Desconocido"}`,
          `Rol: ${author.role || "No disponible"}`,
          `Severidad: ${incident.severity}`,
          `Estado: ${incident.status}`,
          "Contenido literal:",
          incident.content,
          incident.remedial_actions ? `Acciones correctoras:\n${incident.remedial_actions}` : "",
        ].filter(Boolean).join("\n");
      }).join("\n\n---\n\n")
    : "No existen incidencias registradas en este proyecto.";

  return [
    "HISTORIAL DE EJECUCIÓN ACTUALIZADO",
    `Proyecto: ${project.name}`,
    `Proyecto ID: ${project.id}`,
    `Generado: ${generatedAt}`,
    "",
    "=== LIBRO DE ÓRDENES ===",
    ordersText,
    "",
    "=== LIBRO DE INCIDENCIAS ===",
    incidentsText,
  ].join("\n");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Backend no configurado correctamente");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const projectId = typeof body.projectId === "string" ? body.projectId : "";

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId es obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, name, created_by")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Proyecto no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", authData.user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (project.created_by !== authData.user.id && !member) {
      return new Response(JSON.stringify({ error: "Acceso denegado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: orders }, { data: incidents }] = await Promise.all([
      supabase
        .from("orders")
        .select("order_number, content, created_at, created_by")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("incidents")
        .select("incident_number, content, severity, status, remedial_actions, created_at, created_by")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
    ]);

    const userIds = [...new Set([...(orders || []).map((item: any) => item.created_by), ...(incidents || []).map((item: any) => item.created_by)].filter(Boolean))];

    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name, role").in("user_id", userIds)
      : { data: [] as any[] };

    const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.user_id, profile]));
    const memoryText = buildDynamicMemoryText({
      project,
      orders: orders || [],
      incidents: incidents || [],
      profileMap,
    });

    const path = memoryPathForProject(projectId);
    const upload = await supabase.storage.from(MEMORY_BUCKET).upload(path, new TextEncoder().encode(memoryText), {
      upsert: true,
      contentType: "text/plain; charset=utf-8",
      cacheControl: "0",
    });

    if (upload.error) {
      return new Response(JSON.stringify({ error: upload.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      path,
      content: memoryText,
      ordersCount: (orders || []).length,
      incidentsCount: (incidents || []).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-project-memory error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});