import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";

import satusLogo from "@/assets/satus-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Satus | Painel de Estoque F-ARM-BRA-007" },
      {
        name: "description",
        content:
          "Acesso restrito ao painel de controle geral de estoque da Satus: KPIs, gráficos e planilhas do Google Drive em tempo real.",
      },
      { property: "og:title", content: "Satus | Painel de Estoque F-ARM-BRA-007" },
      {
        property: "og:description",
        content:
          "Painel interno de estoque de sementes da Satus, com dados sincronizados do Google Drive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checando, setChecando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecando(false);
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundImage: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card/90 p-10 text-center shadow-[var(--shadow-card)]">
        <img
          src={satusLogo.url}
          alt="Satus — qualidade & confiança"
          className="mx-auto h-20 w-auto rounded-lg bg-card p-2"
        />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Satus · Controle geral de estoque
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-wide text-foreground md:text-5xl">
          Painel F-ARM-BRA-007
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Área interna. Entre com sua conta autorizada para ver os KPIs, gráficos e as planilhas de
          estoque sincronizadas com o Google Drive.
        </p>

        <div className="mt-8">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <LockKeyhole className="size-4" />
            {checando ? "Verificando sessão…" : "Entrar no painel"}
          </Link>
        </div>

        <div className="mt-8 grid gap-3 text-left text-xs text-muted-foreground sm:grid-cols-2">
          <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3">
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-accent" />
            KPIs, gráficos interativos e filtros por cliente, origem, espécie e período.
          </p>
          <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            Acesso liberado apenas para usuários autorizados pela administração.
          </p>
        </div>
      </div>
    </main>
  );
}
