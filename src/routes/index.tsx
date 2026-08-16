import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";

import { getDashboardData } from "@/lib/estoque.functions";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartCard } from "@/components/dashboard/ChartCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Estoque F-ARM-BRA-007 | Controle Geral" },
      {
        name: "description",
        content:
          "Dashboard interno de estoque de sementes: sacos, big bags, entradas e saídas em tempo real a partir do Google Drive.",
      },
      { property: "og:title", content: "Painel de Estoque F-ARM-BRA-007" },
      {
        property: "og:description",
        content:
          "KPIs e gráficos de estoque de produto acabado e big bags, sincronizados com a planilha no Google Drive.",
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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Dashboard() {
  const fetchData = useServerFn(getDashboardData);
  const queryClient = useQueryClient();
  const [forcing, setForcing] = useState(false);
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["estoque-dashboard"],
    queryFn: () => fetchData({ data: { force: false } }),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const refetch = async () => {
    setForcing(true);
    try {
      const fresh = await fetchData({ data: { force: true } });
      queryClient.setQueryData(["estoque-dashboard"], fresh);
    } finally {
      setForcing(false);
    }
  };
  const busy = isFetching || forcing;

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
              Produto acabado e big bags — dados lidos direto da planilha mais recente da pasta 06
              no Google Drive.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <button
              onClick={() => refetch()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Atualizando..." : "Atualizar dados"}
            </button>
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
            <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Sacos em estoque"
                value={nf.format(data.kpis.totalSacos)}
                hint="Produto acabado — abas de sacos"
                icon={Boxes}
              />
              <KpiCard
                label="Big bags em estoque"
                value={nf.format(data.kpis.totalBigBags)}
                hint="PA + WIP"
                icon={Layers}
                tone="chart3"
              />
              <KpiCard
                label="Entradas acumuladas"
                value={nf.format(data.kpis.entradas)}
                hint="Somatório de todas as abas"
                icon={ArrowUpRight}
                tone="accent"
              />
              <KpiCard
                label="Saídas acumuladas"
                value={nf.format(data.kpis.saidas)}
                hint="Somatório de todas as abas"
                icon={ArrowDownRight}
                tone="destructive"
              />
              <KpiCard
                label="Lotes com saldo"
                value={nf.format(data.kpis.lotesAtivos)}
                hint={`${nf.format(data.kpis.totalLinhas)} linhas lidas`}
                icon={PackageSearch}
              />
              {data.abas.slice(0, 3).map((aba) => (
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
                subtitle="Entradas e saídas nas datas mais recentes"
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.linhaDoTempo}>
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

              <ChartCard title="Estoque por espécie" subtitle="Participação no saldo total">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.porEspecie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {data.porEspecie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Saldo por armazém" subtitle="Soma de sacos e bags por armazém">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.porArmazem}>
                    <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
                    <Bar dataKey="value" name="Saldo" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Top clientes"
                subtitle="Maiores saldos em estoque"
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.porCliente} layout="vertical" margin={{ left: 40 }}>
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
                    <Bar dataKey="value" name="Saldo" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <ChartCard
              title="Movimentações mais recentes"
              subtitle="Ordenadas pela data de movimentação"
              className="mt-6"
            >
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Data</th>
                      <th className="py-2 pr-4">Aba</th>
                      <th className="py-2 pr-4">Cliente</th>
                      <th className="py-2 pr-4">Híbrido</th>
                      <th className="py-2 pr-4">Lote</th>
                      <th className="py-2 pr-4">Armazém</th>
                      <th className="py-2 pr-4 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentes.map((row, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {row.data ? row.data.split("-").reverse().join("/") : "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{row.aba}</td>
                        <td className="py-2 pr-4">{row.cliente || "—"}</td>
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
