import {
  getActiveConnection,
  getConnectionKeyForUser,
} from "@/server/appUserConnections.server";

export const GATEWAY = "https://connector-gateway.lovable.dev";

export type GoogleAuth =
  | { mode: "workspace"; id: string }
  | { mode: "appuser"; id: string; driveKey: string; sheetsKey: string };

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
      if (driveKey && sheetsKey) {
        return { mode: "appuser", id: `app:${active.user_id}`, driveKey, sheetsKey };
      }
    }
  } catch (error) {
    console.error("Falha ao resolver a conta Google ativa do app:", error);
  }
  return { mode: "workspace", id: "workspace" };
}
