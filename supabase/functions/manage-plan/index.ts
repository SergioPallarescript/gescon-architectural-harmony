import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const isProjectAdmin = async (supabase: any, userId: string, projectId: string) => {
  const { data: project } = await supabase.from("projects").select("created_by").eq("id", projectId).single();
  if (project?.created_by === userId) return true;

  const { data: member } = await supabase
    .from("project_members")
    .select("role, secondary_role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  return member?.role === "DO" || member?.role === "DEM" || member?.secondary_role === "DO" || member?.secondary_role === "DEM";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) throw new Error("Backend no configurado correctamente");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const planId = typeof body.planId === "string" ? body.planId : "";

    if (!action || !projectId || !planId) {
      return new Response(JSON.stringify({ error: "action, projectId y planId son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasAccess = await isProjectAdmin(supabase, authData.user.id, projectId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Acceso denegado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const payload = {
        name: typeof body.name === "string" ? body.name.trim() : "",
        category: typeof body.category === "string" && body.category.trim() ? body.category.trim() : null,
        description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
      };

      if (!payload.name) {
        return new Response(JSON.stringify({ error: "El nombre del plano es obligatorio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("plans").update(payload).eq("id", planId).eq("project_id", projectId);
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        user_id: authData.user.id,
        project_id: projectId,
        action: "plan_updated",
        details: { plan_id: planId, ...payload },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { data: versions } = await supabase
        .from("plan_versions")
        .select("id, file_url")
        .eq("plan_id", planId);

      const versionIds = (versions || []).map((version: any) => version.id);
      const storagePaths = (versions || []).map((version: any) => version.file_url).filter(Boolean);

      if (storagePaths.length > 0) {
        await supabase.storage.from("plans").remove(storagePaths);
      }

      if (versionIds.length > 0) {
        await supabase.from("plan_conformities").delete().in("plan_version_id", versionIds);
        await supabase.from("plan_versions").delete().in("id", versionIds);
      }

      const { error } = await supabase.from("plans").delete().eq("id", planId).eq("project_id", projectId);
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        user_id: authData.user.id,
        project_id: projectId,
        action: "plan_deleted",
        details: { plan_id: planId },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no soportada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("manage-plan error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});