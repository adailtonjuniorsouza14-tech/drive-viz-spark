import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

import satusLogo from "@/assets/satus-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Painel de Estoque Satus" },
      {
        name: "description",
        content:
          "Acesse o painel interno de estoque da Satus com sua conta autorizada, por e-mail e senha ou conta Google.",
      },
      { property: "og:title", content: "Entrar | Painel de Estoque Satus" },
      {
        property: "og:description",
        content: "Login do painel de controle geral de estoque F-ARM-BRA-007 da Satus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: nome || email },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setAviso("Cadastro criado. Confirme o e-mail que enviamos para ativar o acesso.");
      }
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  const entrarComGoogle = async () => {
    setErro(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErro(result.error.message ?? "Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ backgroundImage: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <img
          src={satusLogo.url}
          alt="Satus — qualidade & confiança"
          className="mx-auto h-14 w-auto rounded-lg bg-card p-1"
        />
        <h1 className="mt-6 text-center font-display text-3xl tracking-wide text-foreground">
          {modo === "entrar" ? "Entrar no painel" : "Criar acesso"}
        </h1>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Área restrita — Controle geral de estoque F-ARM-BRA-007.
        </p>

        <button
          type="button"
          onClick={entrarComGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70"
        >
          Entrar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submeter} className="space-y-3">
          {modo === "criar" ? (
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          ) : null}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Mail className="size-4 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e-mail corporativo"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3">
            <LockKeyhole className="size-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="senha"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          {aviso ? <p className="text-sm text-accent">{aviso}</p> : null}

          <button
            type="submit"
            disabled={carregando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "criar" : "entrar");
            setErro(null);
            setAviso(null);
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {modo === "entrar"
            ? "Não tem acesso ainda? Criar conta"
            : "Já tem conta? Voltar para o login"}
        </button>
      </div>
    </main>
  );
}
