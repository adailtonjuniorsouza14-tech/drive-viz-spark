import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileSpreadsheet, Loader2, Search, UserCircle2 } from "lucide-react";

import { buscarPlanilhas, getContaGoogle } from "@/lib/estoque.functions";

type Props = {
  planilhaAtual: string | null;
  onSelecionar: (id: string | null) => void;
};

export function ConnectionPanel({ planilhaAtual, onSelecionar }: Props) {
  const fetchConta = useServerFn(getContaGoogle);
  const fetchPlanilhas = useServerFn(buscarPlanilhas);
  const [termo, setTermo] = useState("");
  const [query, setQuery] = useState("");

  const conta = useQuery({
    queryKey: ["conta-google"],
    queryFn: () => fetchConta(),
    staleTime: 30 * 60 * 1000,
  });

  const planilhas = useQuery({
    queryKey: ["planilhas", query],
    queryFn: () => fetchPlanilhas({ data: { query } }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-wide text-foreground">Conexão Google</h2>
          <p className="text-xs text-muted-foreground">
            Conta usada para ler o Drive e o Google Sheets, e escolha da planilha ativa.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/60 px-3 py-2">
          <UserCircle2 className="size-6 text-primary" />
          <div className="text-xs">
            {conta.isLoading ? (
              <span className="text-muted-foreground">Verificando conta…</span>
            ) : conta.isError ? (
              <span className="text-destructive">Conta não conectada</span>
            ) : (
              <>
                <p className="font-semibold text-foreground">{conta.data?.nome || "Conta Google"}</p>
                <p className="text-muted-foreground">{conta.data?.email}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(termo.trim());
        }}
      >
        <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar planilha pelo nome (ex.: F-ARM-BRA-007)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Search className="size-4" />
          Buscar planilha
        </button>
        <button
          type="button"
          onClick={() => onSelecionar(null)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Usar a mais recente da pasta 06
        </button>
      </form>

      <div className="mt-4 max-h-60 overflow-auto rounded-lg border border-border">
        {planilhas.isFetching ? (
          <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Procurando planilhas no Drive…
          </p>
        ) : planilhas.isError ? (
          <p className="px-3 py-4 text-sm text-destructive">
            {(planilhas.error as Error)?.message}
          </p>
        ) : (planilhas.data ?? []).length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Nenhuma planilha encontrada.</p>
        ) : (
          (planilhas.data ?? []).map((f) => {
            const ativa = f.id === planilhaAtual;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelecionar(f.id)}
                className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-secondary ${
                  ativa ? "bg-primary/10" : ""
                }`}
              >
                <FileSpreadsheet className="size-4 shrink-0 text-accent" />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(f.modifiedTime).toLocaleDateString("pt-BR")}
                </span>
                {ativa ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
