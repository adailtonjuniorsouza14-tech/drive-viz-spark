import { createServerFn } from "@tanstack/react-start";

export const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { listSpreadsheets, fetchAllTabs } = await import("./estoque.server");
  const { buildDashboard } = await import("./estoque-aggregate.server");

  const files = await listSpreadsheets();
  const latest = files[0];
  if (!latest) {
    throw new Error("Nenhuma planilha Google Sheets encontrada na pasta 06.");
  }
  const tabs = await fetchAllTabs(latest.id);
  return buildDashboard(tabs, {
    id: latest.id,
    nome: latest.name,
    modificadoEm: latest.modifiedTime,
    url: `https://docs.google.com/spreadsheets/d/${latest.id}/edit`,
  });
});
