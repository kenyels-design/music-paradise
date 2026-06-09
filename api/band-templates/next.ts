// @ts-nocheck
// GET /api/band-templates/next?type=weekend
// Returns { suggestedTemplate: { id, name } | null, lastUsed: { id, name, date } | null }
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: "louvorpro" } });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const supabase = getAdmin();
  const templateType = (req.query.type as string) || "weekend";

  // Fetch active templates of requested type, ordered by sort_order
  const { data: templates, error: templatesError } = await supabase
    .from("band_templates")
    .select("id, name, sort_order")
    .eq("type", templateType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (templatesError) return res.status(500).json({ error: templatesError.message });

  if (!templates || templates.length === 0) {
    return res.status(200).json({ suggestedTemplate: null, lastUsed: null });
  }

  // Find the last service that used a template of this type
  const { data: recentServices, error: servicesError } = await supabase
    .from("services")
    .select("template_id, date, band_templates ( id, name, type )")
    .not("template_id", "is", null)
    .order("date", { ascending: false })
    .limit(50);

  if (servicesError) return res.status(500).json({ error: servicesError.message });

  const matchingService = (recentServices ?? []).find(
    s => s.band_templates?.type === templateType
  );

  if (!matchingService) {
    return res.status(200).json({
      suggestedTemplate: { id: templates[0].id, name: templates[0].name },
      lastUsed: null,
    });
  }

  const lastUsedTemplateId = matchingService.template_id;
  const lastUsedIdx = templates.findIndex(t => t.id === lastUsedTemplateId);
  const nextIdx = lastUsedIdx === -1 ? 0 : (lastUsedIdx + 1) % templates.length;
  const suggested = templates[nextIdx];

  return res.status(200).json({
    suggestedTemplate: { id: suggested.id, name: suggested.name },
    lastUsed: {
      id: matchingService.band_templates.id,
      name: matchingService.band_templates.name,
      date: matchingService.date,
    },
  });
}
