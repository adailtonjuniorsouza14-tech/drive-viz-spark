import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

const CONECTORES = ["google_drive", "google_sheets"] as const;
export type ConectorGoogle = (typeof CONECTORES)[number];

const SCOPES: Record<ConectorGoogle, string[]> = {
  google_drive: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
  google_sheets: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
};

const CLIENT_ENV: Record<ConectorGoogle, string> = {
  google_drive: "GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY",
  google_sheets: "GOOGLE_SHEETS_APP_USER_CONNECTOR_CLIENT_API_KEY",
};

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem alterar a conta Google do painel.");
}

/** Situação da conta Google usada pelo painel. */
export const statusConexaoGoogle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveConnection } = await import("@/server/appUserConnections.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const ativa = await getActiveConnection();
    const conectores = CONECTORES.filter((c) => !!process.env[CLIENT_ENV[c]]);
    return {
      admin: !!isAdmin,
      clienteConfigurado: conectores.length > 0,
      conectores,
      contaApp: ativa
        ? { email: ativa.conta_email, nome: ativa.conta_nome, minha: ativa.user_id === context.userId }
        : null,
    };
  });

/** Inicia o consentimento Google para o conector informado (somente admin). */
export const iniciarConexaoGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conector: ConectorGoogle }) => {
    if (!CONECTORES.includes(data?.conector)) throw new Error("Conector inválido.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");

    const clientAPIKey = process.env[CLIENT_ENV[data.conector]];
    if (!clientAPIKey) {
      throw new Error(
        "O cliente OAuth Google ainda não foi configurado para este projeto. Configure o App User Connector do Google nas configurações do Lovable.",
      );
    }

    const request = getRequest();
    if (!request) throw new Error("O OAuth precisa partir de uma requisição do app.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const connectionAPIKey = await getConnectionKeyForUser(context.userId, data.conector);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: data.conector,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      connectionAPIKey: connectionAPIKey ?? undefined,
      credentialsConfiguration: { scopes: SCOPES[data.conector] },
    });
    return { authorizationUrl };
  });

/** Conclui o consentimento: troca o código e guarda a credencial do usuário. */
export const concluirConexaoGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (!CONECTORES.includes(connectorId as ConectorGoogle)) {
      throw new Error("A autorização retornou um conector inesperado.");
    }
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true, connectorId };
  });

/** Define a conta recém-conectada como a conta oficial do painel. */
export const ativarContaGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { getConnectionKeyForUser, setActiveConnection } = await import(
      "@/server/appUserConnections.server"
    );
    const { getGoogleAccount } = await import("./estoque.server");
    const { invalidateDashboardCache } = await import("./estoque-cache.server");

    const [driveKey, sheetsKey] = await Promise.all([
      getConnectionKeyForUser(context.userId, "google_drive"),
      getConnectionKeyForUser(context.userId, "google_sheets"),
    ]);
    if (!driveKey && !sheetsKey) {
      throw new Error("Conecte a conta Google antes de ativá-la no painel.");
    }
    const conta = await getGoogleAccount({
      id: "novo",
      mode: "appuser",
      keys: {
        ...(driveKey ? { google_drive: driveKey } : {}),
        ...(sheetsKey ? { google_sheets: sheetsKey } : {}),
      },
    });
    await setActiveConnection(context.userId, { email: conta.email, nome: conta.nome });
    invalidateDashboardCache();
    return conta;
  });

/** Remove a conta conectada no app e volta para o conector do workspace. */
export const desconectarContaGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser, deleteConnectionKeyForUser, clearActiveConnection } =
      await import("@/server/appUserConnections.server");
    const { invalidateDashboardCache } = await import("./estoque-cache.server");

    for (const conector of CONECTORES) {
      const key = await getConnectionKeyForUser(context.userId, conector);
      if (!key) continue;
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: conector,
        });
      } catch (error) {
        console.error(`Falha ao desconectar ${conector}:`, error);
      }
      await deleteConnectionKeyForUser(context.userId, conector);
    }
    await clearActiveConnection();
    invalidateDashboardCache();
    return { ok: true };
  });
