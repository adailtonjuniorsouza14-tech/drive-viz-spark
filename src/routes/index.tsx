import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ExternalLink,
  Layers,
  PackageSearch,
  RefreshCw,
  Settings2,
  Tag,
  X,
} from "lucide-react";

import { getDashboardData } from "@/lib/estoque.functions";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { MultiFilter } from "@/components/dashboard/MultiFilter";
import { ConnectionPanel } from "@/components/dashboard/ConnectionPanel";
import { aplicarFiltros, construirView, opcoes } from "@/lib/estoque-view";
import { FILTROS_VAZIOS, type Filtros } from "@/lib/estoque-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Estoque F-ARM-BRA-007 | Controle Geral" },
      {
        name: "description",
        content:
          "Dashboard interativo de estoque de sementes: filtros por cliente, origem, espécie e período, com dados do Google Drive.",
      },
      { property: "og:title", content: "Painel de Estoque F-ARM-BRA-007" },
      {
        property: "og:description",
        content:
          "KPIs e gráficos interativos de estoque de produto acabado e big bags, sincronizados com o Google Drive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const nf = new Intl.NumberFormat("pt-BR");
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: "12px",
} as const;

const STORAGE_KEY = "estoque:planilha";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Dashboard() {
  const fetchData = useServerFn(getDashboardData);
  const queryClient = useQueryClient();
  const [forcing, setForcing] = useState(false);
  const [painel, setPainel] = useState(false);
  const [planilhaId, setPlanilhaId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setPlanilhaId(saved);
  }, []);

  const selecionarPlanilha = (id: string | null) => {
    setPlanilhaId(id);
    setFiltros(FILTROS_VAZIOS);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  };

  const queryKey = ["estoque-dashboard", planilhaId ?? "latest"] as const;
  const { data, isFetching, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchData({ data: { force: false, spreadsheetId: planilhaId ?? undefined } }),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const refetch = async () => {
    setForcing(true);
    try {
      const fresh = await fetchData({
        data: { force: true, spreadsheetId: planilhaId ?? undefined },
      });
      queryClient.setQueryData(queryKey, fresh);
    } finally {
      setForcing(false);
    }
  };
  const busy = isFetching || forcing;

  const registros = data?.registros ?? [];
  const filtrados = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const view = useMemo(() => construirView(filtrados), [filtrados]);

  const listas = useMemo(
    () => ({
      clientes: opcoes(registros, "cliente"),
      observacoes: opcoes(registros, "observacao"),
      especies: opcoes(registros, "especie"),
      armazens: opcoes(registros, "armazem"),
      abas: opcoes(registros, "aba"),
    }),
    [registros],
  );

  const toggleValor = (campo: keyof Omit<Filtros, "de" | "ate">, valor: string) =>
    setFiltros((f) => {
      const atual = f[campo];
      return {
        ...f,
        [campo]: atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor],
      };
    });

  const chips: { campo: keyof Omit<Filtros, "de" | "ate">; valor: string }[] = (
    ["clientes", "observacoes", "especies", "armazens", "abas"] as const
  ).flatMap((campo) => filtros[campo].map((valor) => ({ campo, valor })));
  const temFiltro = chips.length > 0 || !!filtros.de || !!filtros.ate;

  return (
    <main className="min-h-screen bg-background pb-16">
      <header
        className="border-b border-border px-6 py-8"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Controle geral de estoque
            </p>
            <h1 className="mt-1 font-display text-4xl tracking-wide text-foreground md:text-5xl">
              Painel F-ARM-BRA-007
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Produto acabado e big bags — clique nos gráficos para filtrar e use o painel de
              conexão para trocar a planilha ou a conta Google.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex gap-2">
              <button
                onClick={() => setPainel((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Settings2 className="size-4" />
                Conexão
              </button>
              <button
                onClick={() => refetch()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
                {busy ? "Atualizando..." : "Atualizar dados"}
              </button>
            </div>
            {data ? (
              <div className="text-right text-xs text-muted-foreground">
                <p>Atualizado em {fmtDateTime(data.atualizadoEm)}</p>
                <a
                  href={data.arquivo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {data.arquivo.nome} <ExternalLink className="size-3" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6">
        {painel ? (
          <div className="mt-6">
            <ConnectionPanel planilhaAtual={data?.arquivo.id ?? planilhaId} onSelecionar={selecionarPlanilha} />
          </div>
        ) : null}

        {isError ? (
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
            <AlertTriangle className="mt-0.5 size-5 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Não foi possível carregar a planilha</p>
              <p className="mt-1 text-muted-foreground">{(error as Error)?.message}</p>
            </div>
          </div>
        ) : null}

        {!data && !isError ? (
          <>
            <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin text-primary" />
              Lendo todas as abas da planilha no Google Drive… isso pode levar até 30 segundos na
              primeira carga.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          </>
        ) : null}

        {data ? (
          <>
            <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center gap-2">
                <MultiFilter
                  label="Cliente"
                  options={listas.clientes}
                  selected={filtros.clientes}
                  onChange={(v) => setFiltros((f) => ({ ...f, clientes: v }))}
                />
                <MultiFilter
                  label="Observação / origem"
                  options={listas.observacoes}
                  selected={filtros.observacoes}
                  onChange={(v) => setFiltros((f) => ({ ...f, observacoes: v }))}
                />
                <MultiFilter
                  label="Espécie"
                  options={listas.especies}
                  selected={filtros.especies}
                  onChange={(v) => setFiltros((f) => ({ ...f, especies: v }))}
                />
                <MultiFilter
                  label="Armazém"
                  options={listas.armazens}
                  selected={filtros.armazens}
                  onChange={(v) => setFiltros((f) => ({ ...f, armazens: v }))}
                />
                <MultiFilter
                  label="Aba"
                  options={listas.abas}
                  selected={filtros.abas}
                  onChange={(v) => setFiltros((f) => ({ ...f, abas: v }))}
                />
                <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  De
                  <input
                    type="date"
                    value={filtros.de ?? ""}
                    onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value || null }))}
                    className="bg-transparent text-foreground outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  Até
                  <input
                    type="date"
                    value={filtros.ate ?? ""}
                    onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value || null }))}
                    className="bg-transparent text-foreground outline-none"
                  />
                </label>
                {temFiltro ? (
                  <button
                    onClick={() => setFiltros(FILTROS_VAZIOS)}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <X className="size-4" /> Limpar filtros
                  </button>
                ) : null}
              </div>
              {chips.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {chips.map(({ campo, valor }) => (
                    <button
                      key={`${campo}-${valor}`}
                      onClick={() => toggleValor(campo, valor)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs text-foreground hover:bg-primary/25"
                    >
                      <Tag className="size-3 text-primary" />
                      {valor}
                      <X className="size-3" />
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {nf.format(filtrados.length)} de {nf.format(registros.length)} linhas no filtro
                atual.
              </p>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Sacos em estoque"
                value={nf.format(view.kpis.totalSacos)}
                hint="Produto acabado — abas de sacos"
                icon={Boxes}
              />
              <KpiCard
                label="Big bags em estoque"
                value={nf.format(view.kpis.totalBigBags)}
                hint="PA + WIP"
                icon={Layers}
                tone="chart3"
              />
              <KpiCard
                label="Entradas acumuladas"
                value={nf.format(view.kpis.entradas)}
                hint="Somatório do filtro atual"
                icon={ArrowUpRight}
                tone="accent"
              />
              <KpiCard
                label="Saídas acumuladas"
                value={nf.format(view.kpis.saidas)}
                hint="Somatório do filtro atual"
                icon={ArrowDownRight}
                tone="destructive"
              />
              <KpiCard
                label="Lotes com saldo"
                value={nf.format(view.kpis.lotesAtivos)}
                hint={`${nf.format(view.kpis.totalLinhas)} linhas • ${view.kpis.abas} abas`}
                icon={PackageSearch}
              />
              {view.abas.slice(0, 3).map((aba) => (
                <KpiCard
                  key={aba.title}
                  label={aba.title}
                  value={nf.format(aba.estoque)}
                  hint={`${aba.unidade} • ${nf.format(aba.linhas)} linhas`}
                  icon={Boxes}
                  tone="chart3"
                />
              ))}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-3">
              <ChartCard
                title="Movimentação por data"
                subtitle="Clique em um ponto para filtrar aquele dia"
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={view.linhaDoTempo}
                    onClick={(e: any) => {
                      const date = e?.activePayload?.[0]?.payload?.date;
                      if (date) setFiltros((f) => ({ ...f, de: date, ate: date }));
                    }}
                  >
                    <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="entradas"
                      name="Entradas"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="saidas"
                      name="Saídas"
                      stroke="var(--chart-4)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Estoque por espécie" subtitle="Clique em uma fatia para filtrar">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={view.porEspecie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      onClick={(d: any) => d?.name && toggleValor("especies", d.name)}
                      className="cursor-pointer"
                    >
                      {view.porEspecie.map((d, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          opacity={
                            filtros.especies.length && !filtros.especies.includes(d.name) ? 0.35 : 1
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Saldo por armazém" subtitle="Clique em uma barra para filtrar">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={view.porArmazem}>
                    <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
                    <Bar
                      dataKey="value"
                      name="Saldo"
                      radius={[6, 6, 0, 0]}
                      className="cursor-pointer"
                      onClick={(d: any) => d?.name && toggleValor("armazens", d.name)}
                    >
                      {view.porArmazem.map((d, i) => (
                        <Cell
                          key={i}
                          fill="var(--chart-1)"
                          opacity={
                            filtros.armazens.length && !filtros.armazens.includes(d.name) ? 0.35 : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Origem / observação"
                subtitle="Ex.: devolução, Paracatu, Cravinhos — clique para filtrar"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={view.porObservacao} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      width={130}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
                    <Bar
                      dataKey="value"
                      name="Saldo"
                      radius={[0, 6, 6, 0]}
                      className="cursor-pointer"
                      onClick={(d: any) => d?.name && toggleValor("observacoes", d.name)}
                    >
                      {view.porObservacao.map((d, i) => (
                        <Cell
                          key={i}
                          fill="var(--chart-3)"
                          opacity={
                            filtros.observacoes.length && !filtros.observacoes.includes(d.name)
                              ? 0.35
                              : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top clientes" subtitle="Clique em uma barra para filtrar">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={view.porCliente} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      width={150}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
                    <Bar
                      dataKey="value"
                      name="Saldo"
                      radius={[0, 6, 6, 0]}
                      className="cursor-pointer"
                      onClick={(d: any) => d?.name && toggleValor("clientes", d.name)}
                    >
                      {view.porCliente.map((d, i) => (
                        <Cell
                          key={i}
                          fill="var(--chart-2)"
                          opacity={
                            filtros.clientes.length && !filtros.clientes.includes(d.name) ? 0.35 : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <ChartCard
              title="Movimentações mais recentes"
              subtitle="Clique em cliente ou observação para filtrar"
              className="mt-6"
            >
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Data</th>
                      <th className="py-2 pr-4">Aba</th>
                      <th className="py-2 pr-4">Cliente</th>
                      <th className="py-2 pr-4">Observação / origem</th>
                      <th className="py-2 pr-4">Híbrido</th>
                      <th className="py-2 pr-4">Lote</th>
                      <th className="py-2 pr-4">Armazém</th>
                      <th className="py-2 pr-4 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.recentes.map((row, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {row.data ? row.data.split("-").reverse().join("/") : "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.aba}</td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => toggleValor("clientes", row.cliente)}
                            className="hover:text-primary hover:underline"
                          >
                            {row.cliente || "—"}
                          </button>
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => toggleValor("observacoes", row.observacao)}
                            className="hover:text-primary hover:underline"
                          >
                            {row.observacao || "—"}
                          </button>
                        </td>
                        <td className="py-2 pr-4">{row.hibrido || "—"}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{row.lote || "—"}</td>
                        <td className="py-2 pr-4">{row.armazem || "—"}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {nf.format(row.estoque)}{" "}
                          <span className="text-xs text-muted-foreground">{row.unidade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </>
        ) : null}
      </div>
    </main>
  );
}
