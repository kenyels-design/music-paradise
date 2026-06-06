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

async function sendPushAndSave(
  supabase: any,
  targetUserIds: string[],
  title: string,
  body: string,
  type: string,
  notifUrl: string,
  referenceId?: string | null
): Promise<{ sent: number; failed: number }> {
  if (targetUserIds.length === 0) return { sent: 0, failed: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", targetUserIds);

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
        if (err.statusCode === 410) staleIds.push(sub.id);
      }
    })
  );

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

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

  return { sent, failed };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-webhook-secret");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const webhookSecret = req.headers["x-webhook-secret"];
  const authHeader = req.headers.authorization;

  const isWebhook = !!webhookSecret && webhookSecret === process.env.PUSH_WEBHOOK_SECRET;
  const isFrontend = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isWebhook && !isFrontend) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const supabase = getAdmin();

  // ── Supabase Webhook flow ───────────────────────────────────────────────────
  if (isWebhook) {
    const { table, record } = req.body || {};

    if (table === "service_assignments") {
      const { data: memberData } = await supabase
        .from("members")
        .select("email")
        .eq("id", record.member_id)
        .single();

      if (!memberData?.email) return res.status(200).json({ sent: 0, failed: 0 });

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", memberData.email)
        .single();

      if (!profileData?.id) return res.status(200).json({ sent: 0, failed: 0 });

      const { data: serviceData } = await supabase
        .from("services")
        .select("title")
        .eq("id", record.service_id)
        .single();

      const result = await sendPushAndSave(
        supabase,
        [profileData.id],
        "Você foi escalado! 🎵",
        `Você está na equipe do culto: ${serviceData?.title ?? ""}`,
        "escala",
        `/services/${record.service_id}`,
        record.service_id
      );

      return res.status(200).json(result);
    }

    if (table === "announcements") {
      const { data: subsData } = await supabase
        .from("push_subscriptions")
        .select("user_id");

      const allUserIds = [...new Set((subsData ?? []).map((r: any) => r.user_id))];

      const result = await sendPushAndSave(
        supabase,
        allUserIds,
        record.title,
        (record.body ?? "").slice(0, 100),
        "aviso",
        "/announcements",
        record.id
      );

      return res.status(200).json(result);
    }

    return res.status(200).json({ sent: 0, failed: 0 });
  }

  // ── Direct frontend flow ────────────────────────────────────────────────────
  const { userIds, memberIds, sendToAll, title, body, type, referenceId, url: notifUrl } =
    req.body || {};

  if (!title || !body) return res.status(400).json({ error: "title e body são obrigatórios" });

  let targetUserIds: string[] = [];

  if (sendToAll) {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("user_id");
    targetUserIds = [...new Set((data ?? []).map((r: any) => r.user_id))];
  } else if (memberIds?.length) {
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

  const result = await sendPushAndSave(supabase, targetUserIds, title, body, type, notifUrl, referenceId);
  return res.status(200).json(result);
}
