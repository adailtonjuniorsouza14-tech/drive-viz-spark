import type {
  DashboardView,
  Filtros,
  NamedValue,
  Registro,
  TabSummary,
  TimelinePoint,
} from "./estoque-types";

export function aplicarFiltros(registros: Registro[], f: Filtros): Registro[] {
  const has = (arr: string[], v: string) => arr.length === 0 || arr.includes(v);
  return registros.filter((r) => {
    if (!has(f.clientes, r.cliente)) return false;
    if (!has(f.observacoes, r.observacao)) return false;
    if (!has(f.especies, r.especie)) return false;
    if (!has(f.armazens, r.armazem)) return false;
    if (!has(f.abas, r.aba)) return false;
    if (f.de && (!r.data || r.data < f.de)) return false;
    if (f.ate && (!r.data || r.data > f.ate)) return false;
    return true;
  });
}

export function opcoes(registros: Registro[], campo: keyof Registro): string[] {
  const set = new Set<string>();
  for (const r of registros) {
    const v = String(r[campo] ?? "").trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function top(map: Map<string, number>, n: number): NamedValue[] {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export function construirView(registros: Registro[]): DashboardView {
  const armazem = new Map<string, number>();
  const cliente = new Map<string, number>();
  const especie = new Map<string, number>();
  const observacao = new Map<string, number>();
  const dias = new Map<string, { entradas: number; saidas: number }>();
  const porAba = new Map<string, TabSummary>();

  let totalSacos = 0;
  let totalBigBags = 0;
  let entradas = 0;
  let saidas = 0;
  let lotesAtivos = 0;

  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  for (const r of registros) {
    if (r.unidade === "big bags") totalBigBags += r.estoque;
    else totalSacos += r.estoque;
    entradas += r.entradas;
    saidas += r.saidas;

    const aba = porAba.get(r.aba) ?? {
      title: r.aba,
      unidade: r.unidade,
      linhas: 0,
      estoque: 0,
      entradas: 0,
      saidas: 0,
    };
    aba.linhas += 1;
    aba.estoque += r.estoque;
    aba.entradas += r.entradas;
    aba.saidas += r.saidas;
    porAba.set(r.aba, aba);

    if (r.data) {
      const d = dias.get(r.data) ?? { entradas: 0, saidas: 0 };
      d.entradas += r.entradas;
      d.saidas += r.saidas;
      dias.set(r.data, d);
    }

    if (r.estoque > 0) {
      lotesAtivos++;
      add(armazem, r.armazem, r.estoque);
      add(cliente, r.cliente, r.estoque);
      add(especie, r.especie, r.estoque);
      add(observacao, r.observacao, r.estoque);
    }
  }

  const linhaDoTempo: TimelinePoint[] = [...dias.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, v]) => ({
      date,
      label: date.slice(8) + "/" + date.slice(5, 7),
      entradas: Math.round(v.entradas),
      saidas: Math.round(v.saidas),
    }));

  const recentes = [...registros]
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .slice(0, 100);

  return {
    kpis: {
      totalSacos: Math.round(totalSacos),
      totalBigBags: Math.round(totalBigBags),
      entradas: Math.round(entradas),
      saidas: Math.round(saidas),
      lotesAtivos,
      totalLinhas: registros.length,
      abas: porAba.size,
    },
    abas: [...porAba.values()].sort((a, b) => b.estoque - a.estoque),
    porArmazem: top(armazem, 10).sort((a, b) => a.name.localeCompare(b.name)),
    porCliente: top(cliente, 10),
    porEspecie: top(especie, 6),
    porObservacao: top(observacao, 8),
    linhaDoTempo,
    recentes,
  };
}
