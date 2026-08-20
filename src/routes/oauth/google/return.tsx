import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google/return")({
  head: () => ({
    meta: [
      { title: "Conectando conta Google | Satus" },
      {
        name: "description",
        content: "Página de retorno da autorização Google para o painel de estoque da Satus.",
      },
      { property: "og:title", content: "Conectando conta Google | Satus" },
      {
        property: "og:description",
        content: "Finalizando a autorização da conta Google usada pelo painel de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [mensagem, setMensagem] = useState("Finalizando conexão…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const avisar = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        {
          type,
          connectorId: params.get("connector_id") ?? "",
          code: code ?? null,
        },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMensagem(params.get("error") ?? "A autorização não foi concluída.");
      avisar("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        avisar("appUserConnectorOAuthComplete");
        return;
      }
      setMensagem("A autorização terminou sem código de troca.");
      avisar("appUserConnectorOAuthFailed");
      return;
    }
    avisar("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">{mensagem}</p>
    </main>
  );
}
