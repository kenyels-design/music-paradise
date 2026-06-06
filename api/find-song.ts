// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação ausente" });
  }
  const token = authHeader.split(" ")[1];

  const supabase = getAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

  const { verseText, songs, soloFilter } = req.body || {};

  if (!verseText?.trim()) {
    return res.status(400).json({ error: "verseText é obrigatório" });
  }
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: "songs é obrigatório e não pode estar vazio" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada" });

  const songList = songs.map((s: { title: string }) => `"${s.title}"`).join(", ");
  const soloContext = soloFilter
    ? `\nContexto adicional: estas músicas são especificamente as que ${soloFilter} canta como solista.`
    : "";

  const prompt = `Tenho o seguinte repertório de músicas gospel: ${songList}.${soloContext}

Com base no versículo ou passagem bíblica a seguir, quais músicas do meu repertório têm conexão temática forte?

Versículo: "${verseText.trim()}"

Responda APENAS com JSON válido (sem markdown, sem texto adicional), neste formato:
[
  { "title": "título exato da música do repertório", "reason": "justificativa em 1-2 frases" }
]

Retorne no máximo 5 sugestões. Use apenas títulos que existam exatamente na lista fornecida. Se não houver conexão forte, retorne [].`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "Você é um assistente de música gospel. Responda sempre em JSON válido.",
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return res.status(502).json({ error: "Erro ao chamar API Anthropic", detail });
  }

  const data = await anthropicRes.json();
  const textBlock = data.content?.find((c: { type: string }) => c.type === "text");
  const rawText: string = textBlock?.text ?? "";

  let suggestions: { title: string; reason: string }[];
  try {
    suggestions = JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch {
    return res.status(502).json({ error: "Resposta inválida da API Anthropic", raw: rawText });
  }

  return res.status(200).json({ suggestions });
}
