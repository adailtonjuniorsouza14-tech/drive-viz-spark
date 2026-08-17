export type Registro = {
  data: string | null;
  aba: string;
  unidade: "sacos" | "big bags";
  especie: string;
  cliente: string;
  hibrido: string;
  lote: string;
  armazem: string;
  observacao: string;
  estoque: number;
  entradas: number;
  saidas: number;
};

export type ArquivoInfo = {
  id: string;
  nome: string;
  modificadoEm: string;
  url: string;
};

export type DashboardPayload = {
  arquivo: ArquivoInfo;
  atualizadoEm: string;
  registros: Registro[];
};

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

export type DashboardView = {
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
  porObservacao: NamedValue[];
  linhaDoTempo: TimelinePoint[];
  recentes: Registro[];
};

export type Filtros = {
  clientes: string[];
  observacoes: string[];
  especies: string[];
  armazens: string[];
  abas: string[];
  de: string | null;
  ate: string | null;
};

export const FILTROS_VAZIOS: Filtros = {
  clientes: [],
  observacoes: [],
  especies: [],
  armazens: [],
  abas: [],
  de: null,
  ate: null,
};
