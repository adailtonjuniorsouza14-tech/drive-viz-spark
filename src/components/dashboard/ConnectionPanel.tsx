import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Loader2,
  LogOut,
  Search,
  UserCircle2,
} from "lucide-react";

import { buscarPlanilhas, getContaGoogle } from "@/lib/estoque.functions";
import {
  ativarContaGoogle,
  concluirConexaoGoogle,
  desconectarContaGoogle,
  iniciarConexaoGoogle,
  statusConexaoGoogle,
  type ConectorGoogle,
} from "@/lib/googleConexao.functions";

type Props = {
  planilhaAtual: string | null;
  onSelecionar: (id: string | null) => void;
};

function esperarConclusao(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const limpar = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      limpar();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("A autorização do Google falhou."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      limpar();
      reject(new Error("A janela de autorização foi fechada antes de concluir."));
    }, 500);
  });
}

export function ConnectionPanel({ planilhaAtual, onSelecionar }: Props) {
  const queryClient = useQueryClient();
  const fetchConta = useServerFn(getContaGoogle);
  const fetchPlanilhas = useServerFn(buscarPlanilhas);
  const fetchStatus = useServerFn(statusConexaoGoogle);
  const iniciar = useServerFn(iniciarConexaoGoogle);
  const concluir = useServerFn(concluirConexaoGoogle);
  const ativar = useServerFn(ativarContaGoogle);
  const desconectar = useServerFn(desconectarContaGoogle);

  const [termo, setTermo] = useState("");
  const [query, setQuery] = useState("");
  const [etapa, setEtapa] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const conta = useQuery({
    queryKey: ["conta-google"],
    queryFn: () => fetchConta(),
    staleTime: 30 * 60 * 1000,
  });

  const status = useQuery({
    queryKey: ["status-conexao-google"],
    queryFn: () => fetchStatus(),
    staleTime: 60 * 1000,
  });

  const planilhas = useQuery({
    queryKey: ["planilhas", query],
    queryFn: () => fetchPlanilhas({ data: { query } }),
    staleTime: 5 * 60 * 1000,
  });

  const conectar = useMutation({
    mutationFn: async () => {
      setErro(null);
      const conectores = (status.data?.conectores ?? []) as ConectorGoogle[];
      if (conectores.length === 0) {
        throw new Error(
          "O cliente OAuth do Google ainda não foi configurado neste projeto. Configure o App User Connector do Google nas configurações do Lovable.",
        );
      }
      for (const conector of conectores) {
        setEtapa(conector === "google_drive" ? "Autorizando Google Drive…" : "Autorizando Google Sheets…");
        const popup = window.open("", "satus-google-oauth", "width=600,height=720");
        if (!popup) throw new Error("Pop-up bloqueado. Libere pop-ups e tente de novo.");
        let code: string | null;
        try {
          const { authorizationUrl } = await iniciar({ data: { conector } });
          const conclusao = esperarConclusao(popup);
          popup.location.href = authorizationUrl;
          code = await conclusao;
        } catch (error) {
          popup.close();
          throw error;
        }
        if (code) await concluir({ data: { code } });
      }
      setEtapa("Ativando conta no painel…");
      return ativar();
    },
    onSuccess: async () => {
      setEtapa(null);
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      setEtapa(null);
      setErro((error as Error).message);
    },
  });

  const remover = useMutation({
    mutationFn: () => desconectar(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
    onError: (error) => setErro((error as Error).message),
  });

  const admin = status.data?.admin;
  const contaApp = status.data?.contaApp ?? null;
  const ocupado = conectar.isPending || remover.isPending;

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
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {conta.data?.origem === "appuser"
                    ? "conectada no aplicativo"
                    : "conector do workspace"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {contaApp ? (
              <p>
                Conta oficial do painel:{" "}
                <span className="font-semibold text-foreground">
                  {contaApp.nome || contaApp.email}
                </span>
              </p>
            ) : (
              <p>Nenhuma conta conectada dentro do app — usando o conector padrão do workspace.</p>
            )}
            {!admin ? (
              <p className="mt-1">Só administradores podem trocar a conta Google.</p>
            ) : status.data && !status.data.clienteConfigurado ? (
              <p className="mt-1 text-destructive">
                O cliente OAuth do Google ainda não foi configurado neste projeto.
              </p>
            ) : null}
          </div>
          {admin ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => conectar.mutate()}
                disabled={ocupado}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {conectar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
                {contaApp ? "Trocar conta Google" : "Conectar conta Google"}
              </button>
              {contaApp ? (
                <button
                  type="button"
                  onClick={() => remover.mutate()}
                  disabled={ocupado}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  <LogOut className="size-4" />
                  Desconectar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {etapa ? <p className="mt-2 text-xs text-accent">{etapa}</p> : null}
        {erro ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
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
