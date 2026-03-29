import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { projectId } = await req.json();
    if (!projectId) throw new Error("projectId required");

    // Fetch project info
    const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (!project) throw new Error("Project not found");

    // Fetch all orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    // Fetch profiles for creators
    const creatorIds = [...new Set((orders || []).map((o: any) => o.created_by))];
    const { data: profiles } = creatorIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name, role").in("user_id", creatorIds)
      : { data: [] };
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    // Fetch project members
    const { data: members } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "accepted");
    const memberIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
    const { data: memberProfiles } = memberIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name, role").in("user_id", memberIds)
      : { data: [] };
    const memberProfileMap: Record<string, any> = {};
    (memberProfiles || []).forEach((p: any) => { memberProfileMap[p.user_id] = p; });

    // Fetch TECTRA logo
    let logoBase64 = "";
    try {
      const { data: logoData } = await supabase.storage.from("plans").download("tectra-logo.png");
      if (logoData) {
        const buf = await logoData.arrayBuffer();
        logoBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      }
    } catch {}

    // Build HTML document for export
    const today = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

    const teamHtml = (members || []).map((m: any) => {
      const mp = memberProfileMap[m.user_id];
      return `<tr><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${m.role}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${mp?.full_name || m.invited_email || "—"}</td></tr>`;
    }).join("");

    const ordersHtml = (orders || []).map((order: any) => {
      const author = profileMap[order.created_by];
      const date = new Date(order.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const contentHtml = order.content
        .replace(/\*\*ESTADO DE LA OBRA:\*\*/g, '<strong style="color:#059669;">ESTADO DE LA OBRA:</strong>')
        .replace(/\*\*INSTRUCCIONES Y ÓRDENES:\*\*/g, '<strong style="color:#2563eb;">INSTRUCCIONES Y ÓRDENES:</strong>')
        .replace(/\*\*PENDIENTES:\*\*/g, '<strong style="color:#d97706;">PENDIENTES:</strong>')
        .replace(/\n/g, "<br>");

      return `
        <div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #e5e7eb;border-radius:6px;padding:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <strong style="font-size:12px;color:#374151;">Orden #${order.order_number}</strong>
            <span style="font-size:10px;color:#6b7280;">${date}</span>
          </div>
          <div style="font-size:11px;line-height:1.6;">${contentHtml}</div>
          <div style="margin-top:8px;font-size:10px;color:#9ca3af;">
            Registrada por: ${author?.full_name || "—"} (${author?.role || "—"})
            ${order.requires_validation ? ' · <span style="color:#f59e0b;">Requiere validación</span>' : ""}
          </div>
        </div>
      `;
    }).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Libro de Órdenes — ${project.name}</title></head>
<body style="font-family:'Montserrat',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;color:#1f2937;">
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px;">
    <div>
      <h1 style="margin:0;font-size:22px;letter-spacing:-0.02em;">LIBRO DE ÓRDENES</h1>
      <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Certificado Final de Obra</p>
    </div>
    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="height:36px;" />` : '<span style="font-size:18px;font-weight:bold;">TECTRA</span>'}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr><td style="padding:4px 8px;font-size:11px;color:#6b7280;width:120px;">Proyecto:</td><td style="padding:4px 8px;font-size:11px;font-weight:600;">${project.name}</td></tr>
    <tr><td style="padding:4px 8px;font-size:11px;color:#6b7280;">Dirección:</td><td style="padding:4px 8px;font-size:11px;">${project.address || "—"}</td></tr>
    <tr><td style="padding:4px 8px;font-size:11px;color:#6b7280;">Fecha emisión:</td><td style="padding:4px 8px;font-size:11px;">${today}</td></tr>
    <tr><td style="padding:4px 8px;font-size:11px;color:#6b7280;">Total órdenes:</td><td style="padding:4px 8px;font-size:11px;">${(orders || []).length}</td></tr>
  </table>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin:24px 0 8px;">Equipo del Proyecto</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr><th style="padding:4px 8px;border:1px solid #ddd;font-size:10px;text-align:left;background:#f9fafb;">Rol</th><th style="padding:4px 8px;border:1px solid #ddd;font-size:10px;text-align:left;background:#f9fafb;">Nombre</th></tr>
    ${teamHtml}
  </table>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin:24px 0 12px;">Registro Cronológico de Órdenes</h2>
  ${ordersHtml}

  <div style="margin-top:48px;border-top:1px solid #e5e7eb;padding-top:16px;">
    <p style="font-size:9px;color:#9ca3af;text-align:center;">
      Documento generado automáticamente por TECTRA — ${today}. Este documento forma parte del Certificado Final de Obra.
    </p>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, fileName: `Libro_Ordenes_${project.name.replace(/\s+/g, "_")}.html` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
