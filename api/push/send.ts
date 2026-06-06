// @ts-nocheck
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  process.env.VITE_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

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

  // Verify caller is an authenticated admin
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação ausente" });
  }
  const token = authHeader.split(" ")[1];

  const supabase = getAdmin();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Token inválido" });

  const { data: callerProfile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!callerProfile?.is_admin) return res.status(403).json({ error: "Acesso negado" });

  const { userIds, memberIds, sendToAll, title, body, type, referenceId, url: notifUrl } =
    req.body || {};

  if (!title || !body) return res.status(400).json({ error: "title e body são obrigatórios" });

  // ── Resolve target user IDs ─────────────────────────────────────────────────
  let targetUserIds: string[] = [];

  if (sendToAll) {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("user_id");
    targetUserIds = [...new Set((data ?? []).map((r: any) => r.user_id))];
  } else if (memberIds?.length) {
    // Join members → user_profiles by email
    const { data: membersData } = await supabase
      .from("members")
      .select("email")
      .in("id", memberIds);
    const emails = (membersData ?? []).map((m: any) => m.email).filter(Boolean);
    if (emails.length > 0) {
      const { data: profilesData } = await supabase
        .from("user_profiles")
        .select("id")
        .in("email", emails);
      targetUserIds = (profilesData ?? []).map((p: any) => p.id);
    }
  } else if (userIds?.length) {
    targetUserIds = userIds;
  }

  if (targetUserIds.length === 0) {
    return res.status(200).json({ sent: 0, failed: 0 });
  }

  // ── Fetch subscriptions ─────────────────────────────────────────────────────
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", targetUserIds);

  // ── Send web push ───────────────────────────────────────────────────────────
  const payload = JSON.stringify({ title, body, url: notifUrl || "/" });
  let sent = 0;
  let failed = 0;
  const staleIds: number[] = [];

  await Promise.allSettled(
    (subscriptions ?? []).map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410) {
          // Subscription expired — remove it
          staleIds.push(sub.id);
        }
      }
    })
  );

  // Delete expired subscriptions
  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  // ── Persist notifications in DB ─────────────────────────────────────────────
  if (targetUserIds.length > 0) {
    await supabase.from("notifications").insert(
      targetUserIds.map((userId: string) => ({
        user_id: userId,
        title,
        body,
        type: type ?? "geral",
        reference_id: referenceId ?? null,
        read: false,
      }))
    );
  }

  return res.status(200).json({ sent, failed });
}
