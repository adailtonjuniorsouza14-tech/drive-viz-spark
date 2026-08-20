import type { DashboardPayload } from "./estoque-types";
import { listSpreadsheets, fetchAllTabs, getFile, resolveGoogleAuth } from "./estoque.server";
import { normalizeRows } from "./estoque-aggregate.server";

const TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; data: DashboardPayload }>();
const inflight = new Map<string, Promise<DashboardPayload>>();

async function load(spreadsheetId?: string): Promise<DashboardPayload> {
  const auth = await resolveGoogleAuth();
  const file = spreadsheetId
    ? await getFile(auth, spreadsheetId)
    : (await listSpreadsheets(auth))[0];
  if (!file) {
    throw new Error("Nenhuma planilha Google Sheets encontrada na pasta 06.");
  }
  const tabs = await fetchAllTabs(auth, file.id);
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

export function invalidateDashboardCache() {
  cache.clear();
  inflight.clear();
}

export async function getDashboard(
  force = false,
  spreadsheetId?: string,
): Promise<DashboardPayload> {
  const auth = await resolveGoogleAuth();
  const key = `${auth.id}::${spreadsheetId ?? "__latest__"}`;
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
