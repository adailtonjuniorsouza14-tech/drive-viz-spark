import { encryptConnectionKey, decryptConnectionKey } from "./connectionKeyCrypto";

export type GoogleConnectorId = "google_drive" | "google_sheets";

export async function saveConnectionKeyForUser(
  userId: string,
  connectorId: string,
  connectionAPIKey: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("app_user_connections").upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      connection_key_ciphertext: encryptConnectionKey(connectionAPIKey),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );
  if (error) throw error;
}

export async function getConnectionKeyForUser(
  userId: string,
  connectorId: string,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw error;
  return data ? decryptConnectionKey(data.connection_key_ciphertext) : null;
}

export async function deleteConnectionKeyForUser(userId: string, connectorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
  if (error) throw error;
}

/** Conta Google ativa da empresa (singleton) — usada por todos os usuários do painel. */
export async function getActiveConnection(): Promise<{
  user_id: string;
  conta_email: string | null;
  conta_nome: string | null;
} | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("active_google_connection")
    .select("user_id, conta_email, conta_nome")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function setActiveConnection(
  userId: string,
  conta: { email: string | null; nome: string | null },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("active_google_connection").upsert(
    {
      id: true,
      user_id: userId,
      conta_email: conta.email,
      conta_nome: conta.nome,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function clearActiveConnection() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("active_google_connection").delete().eq("id", true);
  if (error) throw error;
}
