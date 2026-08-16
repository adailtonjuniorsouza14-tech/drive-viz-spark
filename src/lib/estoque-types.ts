export type TabSummary = {
  title: string;
  unidade: "sacos" | "big bags";
  linhas: number;
  estoque: number;
  entradas: number;
  saidas: number;
};

export type NamedValue = { name: string; value: number };
export type TimelinePoint = { date: string; label: string; entradas: number; saidas: number };
export type RecentRow = {
  data: string | null;
  aba: string;
  especie: string;
  cliente: string;
  hibrido: string;
  lote: string;
  armazem: string;
  estoque: number;
  unidade: string;
};

export type DashboardData = {
  arquivo: { id: string; nome: string; modificadoEm: string; url: string };
  atualizadoEm: string;
  kpis: {
    totalSacos: number;
    totalBigBags: number;
    entradas: number;
    saidas: number;
    lotesAtivos: number;
    totalLinhas: number;
    abas: number;
  };
  abas: TabSummary[];
  porArmazem: NamedValue[];
  porCliente: NamedValue[];
  porEspecie: NamedValue[];
  linhaDoTempo: TimelinePoint[];
  recentes: RecentRow[];
};
