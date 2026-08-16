import { serialToISO, toNumber, type SheetRow, type SheetTab } from "./estoque.server";
import type {
  DashboardData,
  NamedValue,
  RecentRow,
  TabSummary,
  TimelinePoint,
} from "./estoque-types";



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

const str = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && s !== "-" && s !== "#N/D" ? s : "";
};

export function buildDashboard(
  tabs: SheetTab[],
  arquivo: DashboardData["arquivo"],
): DashboardData {
  const abas: TabSummary[] = [];
  const armazem = new Map<string, number>();
  const cliente = new Map<string, number>();
  const especie = new Map<string, number>();
  const dias = new Map<string, { entradas: number; saidas: number }>();
  const recentes: RecentRow[] = [];

  let totalSacos = 0;
  let totalBigBags = 0;
  let entradasTotal = 0;
  let saidasTotal = 0;
  let lotesAtivos = 0;
  let totalLinhas = 0;

  for (const tab of tabs) {
    const isBag = /big bag/i.test(tab.title) || tab.headers.some((h) => /bb|bags/i.test(h));
    const unidade: TabSummary["unidade"] = isBag ? "big bags" : "sacos";
    let tEstoque = 0;
    let tEntrada = 0;
    let tSaida = 0;

    for (const row of tab.rows) {
      const estoque = toNumber(pick(row, isEstoqueCol));
      const entrada = toNumber(pick(row, isEntradaCol));
      const saida = toNumber(pick(row, isSaidaCol));
      tEstoque += estoque;
      tEntrada += entrada;
      tSaida += saida;

      const dataMov =
        serialToISO(pick(row, (h) => h.includes("data movimenta"))) ??
        serialToISO(pick(row, (h) => h.includes("data de entrada")));

      if (dataMov) {
        const d = dias.get(dataMov) ?? { entradas: 0, saidas: 0 };
        d.entradas += entrada;
        d.saidas += saida;
        dias.set(dataMov, d);
      }

      if (estoque > 0) {
        lotesAtivos++;
        const arm = str(pick(row, (h) => h === "armazém" || h === "armazem")) || "Sem armazém";
        armazem.set(arm, (armazem.get(arm) ?? 0) + estoque);
        const cli = str(row["Cliente"]) || "Sem cliente";
        cliente.set(cli, (cliente.get(cli) ?? 0) + estoque);
        const esp = str(row["Espécie"]) || "Outros";
        especie.set(esp, (especie.get(esp) ?? 0) + estoque);
      }

      recentes.push({
        data: dataMov,
        aba: tab.title,
        especie: str(row["Espécie"]),
        cliente: str(row["Cliente"]),
        hibrido: str(row["Híbrido"]),
        lote: str(row["Lote"]) || str(row["Lote Satus"]) || str(row[" Lote cliente"]),
        armazem: str(pick(row, (h) => h === "armazém" || h === "armazem")),
        estoque,
        unidade,
      });
    }

    totalLinhas += tab.rows.length;
    if (isBag) totalBigBags += tEstoque;
    else totalSacos += tEstoque;
    entradasTotal += tEntrada;
    saidasTotal += tSaida;

    abas.push({
      title: tab.title,
      unidade,
      linhas: tab.rows.length,
      estoque: tEstoque,
      entradas: tEntrada,
      saidas: tSaida,
    });
  }

  const top = (m: Map<string, number>, n: number): NamedValue[] =>
    [...m.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);

  const linhaDoTempo: TimelinePoint[] = [...dias.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, v]) => ({
      date,
      label: date.slice(8) + "/" + date.slice(5, 7),
      entradas: Math.round(v.entradas),
      saidas: Math.round(v.saidas),
    }));

  recentes.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  return {
    arquivo,
    atualizadoEm: new Date().toISOString(),
    kpis: {
      totalSacos: Math.round(totalSacos),
      totalBigBags: Math.round(totalBigBags),
      entradas: Math.round(entradasTotal),
      saidas: Math.round(saidasTotal),
      lotesAtivos,
      totalLinhas,
      abas: abas.length,
    },
    abas: abas.sort((a, b) => b.estoque - a.estoque),
    porArmazem: top(armazem, 8).sort((a, b) => a.name.localeCompare(b.name)),
    porCliente: top(cliente, 8),
    porEspecie: top(especie, 6),
    linhaDoTempo,
    recentes: recentes.slice(0, 60),
  };
}
