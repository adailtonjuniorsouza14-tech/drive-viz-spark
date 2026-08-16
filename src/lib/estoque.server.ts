const GATEWAY = "https://connector-gateway.lovable.dev";

const ROOT_FOLDER_ID = "1oXe5JOz5Li9t0VklCA_hKu-BBhVhbZP8"; // "06 - F-ARM-BRA-007 - CONTROLE GERAL DE ESTOQUE"

function headers(connectorKey: string) {
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!lovable) throw new Error("LOVABLE_API_KEY ausente no ambiente do servidor.");
  if (!connectorKey) throw new Error("Chave do conector Google ausente. Reconecte o conector.");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": connectorKey,
  };
}

async function gatewayGet(connector: "google_drive" | "google_sheets", path: string, params: Record<string, string | string[]>) {
  const key =
    connector === "google_drive"
      ? process.env["GOOGLE_DRIVE_API_KEY"]!
      : process.env["GOOGLE_SHEETS_API_KEY"]!;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, item));
    else qs.append(k, v);
  }
  const res = await fetch(`${GATEWAY}/${connector}${path}?${qs.toString()}`, {
    headers: headers(key),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Gateway ${connector} ${path} falhou [${res.status}]: ${body}`);
    throw new Error(`Falha na chamada Google (${res.status}): ${body.slice(0, 400)}`);
  }
  return res.json() as Promise<any>;
}

export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string };

/** Percorre recursivamente a pasta 06 e devolve as planilhas nativas do Google Sheets. */
export async function listSpreadsheets(): Promise<DriveFile[]> {
  const found: DriveFile[] = [];
  let queue = [ROOT_FOLDER_ID];
  let depth = 0;
  while (queue.length && depth < 6) {
    const q =
      queue.map((id) => `'${id}' in parents`).join(" or ") + " and trashed=false";
    const data = await gatewayGet("google_drive", "/drive/v3/files", {
      q: `(${queue.map((id) => `'${id}' in parents`).join(" or ")}) and trashed=false`.replace(
        /^\(\) and /,
        q,
      ),
      fields: "files(id,name,mimeType,modifiedTime)",
      pageSize: "500",
      orderBy: "modifiedTime desc",
    });
    const files: DriveFile[] = data.files ?? [];
    queue = files
      .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
      .map((f) => f.id);
    found.push(...files.filter((f) => f.mimeType === "application/vnd.google-apps.spreadsheet"));
    depth++;
  }
  return found.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
}

export type SheetRow = Record<string, string | number | null>;
export type SheetTab = { title: string; headers: string[]; rows: SheetRow[] };

const SERIAL_EPOCH = Date.UTC(1899, 11, 30);

/** Converte o número de série de data do Google Sheets em ISO (yyyy-mm-dd). */
export function serialToISO(value: unknown): string | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return null;
  return new Date(SERIAL_EPOCH + Math.round(n) * 86400000).toISOString().slice(0, 10);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const HEADER_MARKERS = ["espécie", "especie"];

function findHeaderIndex(values: any[][]): number {
  for (let i = 0; i < Math.min(values.length, 30); i++) {
    const first = String(values[i]?.[0] ?? "").trim().toLowerCase();
    if (HEADER_MARKERS.includes(first)) return i;
  }
  return -1;
}

export async function fetchAllTabs(spreadsheetId: string): Promise<SheetTab[]> {
  const meta = await gatewayGet("google_sheets", `/v4/spreadsheets/${spreadsheetId}`, {
    fields: "sheets.properties(title,gridProperties(rowCount))",
  });
  const titles: string[] = (meta.sheets ?? [])
    .map((s: any) => s.properties.title as string)
    .filter((t: string) => !t.startsWith("_"));

  const ranges = titles.map((t) => `${t}!A1:AH4000`);
  const batch = await gatewayGet("google_sheets", `/v4/spreadsheets/${spreadsheetId}/values:batchGet`, {
    ranges,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const tabs: SheetTab[] = [];
  (batch.valueRanges ?? []).forEach((vr: any, idx: number) => {
    const values: any[][] = vr.values ?? [];
    const hi = findHeaderIndex(values);
    if (hi < 0) return;
    const rawHeaders = (values[hi] ?? []).map((h: any) => String(h ?? "").trim());
    const headers = rawHeaders.filter(Boolean);
    const rows: SheetRow[] = [];
    for (let r = hi + 1; r < values.length; r++) {
      const row = values[r] ?? [];
      if (!row.some((c) => c !== "" && c !== null && c !== undefined)) continue;
      const obj: SheetRow = {};
      rawHeaders.forEach((h, c) => {
        if (!h) return;
        const v = row[c];
        obj[h] = v === undefined || v === "" ? null : (v as string | number);
      });
      if (!obj["Espécie"] && !obj["Lote"] && !obj["Cliente"]) continue;
      rows.push(obj);
    }
    tabs.push({ title: titles[idx], headers, rows });
  });
  return tabs;
}
