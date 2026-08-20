import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { force?: boolean; spreadsheetId?: string | undefined } | undefined) => ({
    force: !!data?.force,
    spreadsheetId: (data?.spreadsheetId || undefined) as string | undefined,
  }))
  .handler(async ({ data }) => {
    const { getDashboard } = await import("./estoque-cache.server");
    return getDashboard(data.force, data.spreadsheetId);
  });

export const buscarPlanilhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { query?: string } | undefined) => ({ query: (data?.query ?? "").trim() }))
  .handler(async ({ data }) => {
    const { searchSpreadsheets, listSpreadsheets, resolveGoogleAuth } = await import(
      "./estoque.server"
    );
    const auth = await resolveGoogleAuth();
    const files = data.query
      ? await searchSpreadsheets(auth, data.query)
      : await listSpreadsheets(auth);
    return files.slice(0, 30);
  });

export const getContaGoogle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getGoogleAccount, resolveGoogleAuth } = await import("./estoque.server");
    const auth = await resolveGoogleAuth();
    const conta = await getGoogleAccount(auth);
    return { ...conta, origem: auth.mode as "workspace" | "appuser" };
  });
