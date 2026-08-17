import { serialToISO, toNumber, type SheetRow, type SheetTab } from "./estoque.server";
import type { Registro } from "./estoque-types";

function pick(row: SheetRow, matcher: (h: string) => boolean): unknown {
  for (const key of Object.keys(row)) if (matcher(key.toLowerCase())) return row[key];
  return null;
}

const isEstoqueCol = (h: string) =>
  (h.includes("qtd. sacos") || h.includes("quant. estoque") || h.includes("quantidade estoque")) &&
  !h.includes("entrada") &&
  !h.includes("saída") &&
  !h.includes("saida");
const isEntradaCol = (h: string) => h.includes("entrada") && (h.includes("qtd") || h.includes("quant"));
const isSaidaCol = (h: string) =>
  (h.includes("saída") || h.includes("saida")) && (h.includes("qtd") || h.includes("quant"));
const isObsCol = (h: string) => h.includes("observa") || h.includes("obs.");

const str = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && s !== "-" && s !== "#N/D" ? s : "";
};

/** Converte todas as abas em uma lista plana de registros normalizados. */
export function normalizeRows(tabs: SheetTab[]): Registro[] {
  const registros: Registro[] = [];

  for (const tab of tabs) {
    const isBag = /big bag/i.test(tab.title) || tab.headers.some((h) => /bb|bags/i.test(h));
    const unidade: Registro["unidade"] = isBag ? "big bags" : "sacos";

    for (const row of tab.rows) {
      const dataMov =
        serialToISO(pick(row, (h) => h.includes("data movimenta"))) ??
        serialToISO(pick(row, (h) => h.includes("data de entrada")));

      registros.push({
        data: dataMov,
        aba: tab.title,
        unidade,
        especie: str(row["Espécie"]) || "Outros",
        cliente: str(row["Cliente"]) || "Sem cliente",
        hibrido: str(row["Híbrido"]),
        lote: str(row["Lote"]) || str(row["Lote Satus"]) || str(row[" Lote cliente"]),
        armazem: str(pick(row, (h) => h === "armazém" || h === "armazem")) || "Sem armazém",
        observacao: str(pick(row, isObsCol)) || "Sem observação",
        estoque: toNumber(pick(row, isEstoqueCol)),
        entradas: toNumber(pick(row, isEntradaCol)),
        saidas: toNumber(pick(row, isSaidaCol)),
      });
    }
  }

  return registros;
}
