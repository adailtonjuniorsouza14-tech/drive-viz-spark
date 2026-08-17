import { createServerFn } from "@tanstack/react-start";

export const getDashboardData = createServerFn({ method: "GET" })
  .inputValidator((data: { force?: boolean; spreadsheetId?: string | undefined } | undefined) => ({
    force: !!data?.force,
    spreadsheetId: (data?.spreadsheetId || undefined) as string | undefined,
  }))
  .handler(async ({ data }) => {
    const { getDashboard } = await import("./estoque-cache.server");
    return getDashboard(data.force, data.spreadsheetId);
  });

export const buscarPlanilhas = createServerFn({ method: "GET" })
  .inputValidator((data: { query?: string } | undefined) => ({ query: (data?.query ?? "").trim() }))
  .handler(async ({ data }) => {
    const { searchSpreadsheets, listSpreadsheets } = await import("./estoque.server");
    const files = data.query ? await searchSpreadsheets(data.query) : await listSpreadsheets();
    return files.slice(0, 30);
  });

export const getContaGoogle = createServerFn({ method: "GET" }).handler(async () => {
  const { getGoogleAccount } = await import("./estoque.server");
  return getGoogleAccount();
});
