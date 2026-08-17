import type { DashboardPayload } from "./estoque-types";
import { listSpreadsheets, fetchAllTabs, getFile } from "./estoque.server";
import { normalizeRows } from "./estoque-aggregate.server";

const TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; data: DashboardPayload }>();
const inflight = new Map<string, Promise<DashboardPayload>>();

async function load(spreadsheetId?: string): Promise<DashboardPayload> {
  let file = spreadsheetId ? await getFile(spreadsheetId) : (await listSpreadsheets())[0];
  if (!file) {
    throw new Error("Nenhuma planilha Google Sheets encontrada na pasta 06.");
  }
  const tabs = await fetchAllTabs(file.id);
  return {
    arquivo: {
      id: file.id,
      nome: file.name,
      modificadoEm: file.modifiedTime,
      url: `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    },
    atualizadoEm: new Date().toISOString(),
    registros: normalizeRows(tabs),
  };
}

export async function getDashboard(force = false, spreadsheetId?: string): Promise<DashboardPayload> {
  const key = spreadsheetId ?? "__latest__";
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const pending = inflight.get(key);
  if (!force && pending) return pending;

  const promise = load(spreadsheetId)
    .then((data) => {
      cache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
