import { getActiveConnection, getConnectionKeyForUser } from "@/server/appUserConnections.server";

export const GATEWAY = "https://connector-gateway.lovable.dev";

export type GoogleAuth = {
  /** Identificador para chave de cache. */
  id: string;
  mode: "workspace" | "appuser";
  /** Credencial por conector do usuário do app; ausente = usa o conector do workspace. */
  keys: Partial<Record<"google_drive" | "google_sheets", string>>;
};

/**
 * Resolve qual credencial Google usar: a conta conectada dentro do app
 * (definida por um administrador) ou, na ausência dela, o conector do workspace.
 */
export async function resolveGoogleAuth(): Promise<GoogleAuth> {
  try {
    const active = await getActiveConnection();
    if (active) {
      const [driveKey, sheetsKey] = await Promise.all([
        getConnectionKeyForUser(active.user_id, "google_drive"),
        getConnectionKeyForUser(active.user_id, "google_sheets"),
      ]);
      if (driveKey || sheetsKey) {
        return {
          id: `app:${active.user_id}`,
          mode: "appuser",
          keys: {
            ...(driveKey ? { google_drive: driveKey } : {}),
            ...(sheetsKey ? { google_sheets: sheetsKey } : {}),
          },
        };
      }
    }
  } catch (error) {
    console.error("Falha ao resolver a conta Google ativa do app:", error);
  }
  return { id: "workspace", mode: "workspace", keys: {} };
}
