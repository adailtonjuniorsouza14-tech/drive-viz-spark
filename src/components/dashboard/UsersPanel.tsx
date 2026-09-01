import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

import { criarVisualizador, excluirUsuario, listarUsuarios } from "@/lib/usuarios.functions";
import { statusConexaoGoogle } from "@/lib/googleConexao.functions";

export function UsersPanel() {
  const queryClient = useQueryClient();
  const fetchUsuarios = useServerFn(listarUsuarios);
  const fetchStatus = useServerFn(statusConexaoGoogle);
  const criar = useServerFn(criarVisualizador);
  const excluir = useServerFn(excluirUsuario);

  const status = useQuery({
    queryKey: ["status-conexao-google"],
    queryFn: () => fetchStatus(),
    staleTime: 60 * 1000,
  });
  const admin = !!status.data?.admin;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const usuarios = useQuery({
    queryKey: ["usuarios-painel"],
    queryFn: () => fetchUsuarios(),
    staleTime: 60 * 1000,
    enabled: admin,
  });

  const novo = useMutation({
    mutationFn: () => criar({ data: { email, senha, nome } }),
    onSuccess: async (res) => {
      setErro(null);
      setOk(`Usuário ${res.email} criado como visualizador.`);
      setNome("");
      setEmail("");
      setSenha("");
      await queryClient.invalidateQueries({ queryKey: ["usuarios-painel"] });
    },
    onError: (e) => {
      setOk(null);
      setErro((e as Error).message);
    },
  });

  const remover = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: async () => {
      setErro(null);
      setOk("Usuário removido.");
      await queryClient.invalidateQueries({ queryKey: ["usuarios-painel"] });
    },
    onError: (e) => {
      setOk(null);
      setErro((e as Error).message);
    },
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-primary" />
        <div>
          <h2 className="font-display text-xl tracking-wide text-foreground">Usuários do painel</h2>
          <p className="text-xs text-muted-foreground">
            Crie contas de visualização (somente leitura) para a sua equipe.
          </p>
        </div>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          novo.mutate();
        }}
      >
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome (opcional)"
          className="min-w-[10rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="email@empresa.com"
          className="min-w-[12rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <input
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          type="password"
          required
          minLength={8}
          placeholder="Senha (mín. 8 caracteres)"
          className="min-w-[12rem] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={novo.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {novo.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Criar visualizador
        </button>
      </form>

      {erro ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
      {ok ? <p className="mt-2 text-xs text-accent">{ok}</p> : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        {usuarios.isLoading ? (
          <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando usuários…
          </p>
        ) : usuarios.isError ? (
          <p className="px-3 py-4 text-sm text-destructive">{(usuarios.error as Error)?.message}</p>
        ) : (
          (usuarios.data ?? []).map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{u.nome || u.email}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                  u.papel === "admin"
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {u.papel === "admin" ? <ShieldCheck className="size-3" /> : null}
                {u.papel === "admin" ? "administrador" : "visualizador"}
              </span>
              <button
                type="button"
                onClick={() => remover.mutate(u.id)}
                disabled={u.eu || remover.isPending}
                title={u.eu ? "Você não pode excluir a própria conta" : "Excluir usuário"}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
