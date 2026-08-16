import type { DashboardData } from "./estoque-types";
import { listSpreadsheets, fetchAllTabs } from "./estoque.server";
import { buildDashboard } from "./estoque-aggregate.server";

const TTL_MS = 5 * 60 * 1000;

let cache: { at: number; data: DashboardData } | null = null;
let inflight: Promise<DashboardData> | null = null;

async function load(): Promise<DashboardData> {
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
}

export async function getDashboard(force = false): Promise<DashboardData> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!force && inflight) return inflight;

  inflight = load()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
