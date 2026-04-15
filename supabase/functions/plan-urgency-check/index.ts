import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find plan versions created >24h ago
    const { data: versions } = await supabase
      .from("plan_versions")
      .select("id, plan_id, version_number, created_at, plans!inner(id, name, project_id)")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (!versions || versions.length === 0) {
      return new Response(JSON.stringify({ checked: 0, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notified = 0;

    for (const v of versions) {
      const plan = (v as any).plans;
      if (!plan) continue;

      // Get project members
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", plan.project_id)
        .eq("status", "accepted");

      if (!members) continue;

      // Get existing conformities for this version
      const { data: conformities } = await supabase
        .from("plan_conformities")
        .select("user_id")
        .eq("plan_version_id", v.id);

      const signedUserIds = new Set((conformities || []).map((c: any) => c.user_id));
      const pendingMembers = members.filter((m: any) => m.user_id && !signedUserIds.has(m.user_id));

      if (pendingMembers.length === 0) continue;

      // Check if we already sent an urgency notification for this version (avoid spam)
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "plan_urgency")
        .like("message", `%${v.id}%`)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      // Send urgency notifications
      const notifications = pendingMembers.map((m: any) => ({
        user_id: m.user_id,
        project_id: plan.project_id,
        title: `⚠️ URGENTE: Plano "${plan.name}" pendiente`,
        message: `El plano "${plan.name}" (v${v.version_number}) lleva más de 24h sin tu conformidad. Confirma para evitar paralización de obra. [ref:${v.id}]`,
        type: "plan_urgency",
      }));

      await supabase.from("notifications").insert(notifications);

      // Send push notifications
      const userIds = pendingMembers.map((m: any) => m.user_id);
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            user_ids: userIds,
            title: `⚠️ URGENTE: Plano "${plan.name}" pendiente`,
            message: `Confirma tu conformidad para evitar paralización de obra.`,
            url: `/project/${plan.project_id}/plans?item=${plan.id}`,
          },
        });
      } catch (e) {
        console.error("Push urgency failed:", e);
      }

      notified += pendingMembers.length;
    }

    return new Response(JSON.stringify({ checked: versions.length, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plan-urgency-check error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
