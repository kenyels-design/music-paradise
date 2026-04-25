import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["VITE_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no servidor.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type UserStatus = "pendente" | "aprovado" | "rejeitado";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  is_admin: boolean;
  role: string | null;
  created_at: string;
}
