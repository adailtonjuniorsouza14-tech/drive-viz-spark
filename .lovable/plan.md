# Conectar a conta Google certa no app publicado

Objetivo: no app publicado, o painel usa **uma conta Google única** (a conta oficial da empresa), e um **administrador pode trocar essa conta dentro do próprio app**, sem passar pelo editor Lovable. Além disso, o painel só abre para usuários autorizados.

## Método escolhido

Hoje o app usa a conexão Google do workspace do Lovable (App connector). Ela funciona, mas só pode ser trocada nas configurações do Lovable — não dentro do app publicado.

A solução é usar o **conector Google por usuário do app (App User Connector)** para Google Drive e Google Sheets, mas apenas o administrador conecta. A conexão que ele autorizar vira a **conta ativa da aplicação**: todos os usuários autorizados veem os dados dessa conta. Trocar de conta = o admin clicar em "Trocar conta Google" e autorizar outra.

## O que será construído

1. **Login e permissões (Lovable Cloud)**
   - Tela de login em `/auth` (e-mail + senha e/ou "Entrar com Google").
   - Painel movido para rota protegida (`/dashboard`); quem não estiver logado é enviado para `/auth`.
   - Tabela de perfis + tabela separada de papéis (`admin` / `viewer`). Só quem for cadastrado consegue ver os dados; novos cadastros entram como pendentes até um admin liberar.
   - Botão de sair no cabeçalho.

2. **Painel "Conexão Google" (só admin)**
   - Botão **Conectar conta Google** / **Trocar conta Google** — abre a janela de consentimento do Google, o admin escolhe a conta e autoriza Drive + Sheets (somente leitura).
   - Mostra a conta ativa (nome, e-mail) e quem/quando conectou.
   - Botão **Desconectar**.
   - Usuários não-admin veem só a conta ativa, sem poder trocar.

3. **Leitura dos dados pela conta ativa**
   - As funções de servidor que hoje leem Drive/Sheets passam a usar a credencial da conta ativa em vez da conexão do workspace.
   - Busca de planilha, escolha da planilha e cache continuam iguais; o cache é limpo quando a conta muda.
   - Se ainda não houver conta conectada, o painel mostra um aviso pedindo ao admin para conectar.

4. **Fallback**: enquanto nenhuma conta for conectada no app, mantemos a conexão atual do workspace funcionando, para o painel não ficar vazio.

## Detalhes técnicos

- Lovable Cloud (auth + banco). Rotas protegidas sob `src/routes/_authenticated/`.
- Papéis em tabela `user_roles` + função `has_role` (security definer), com RLS e GRANTs.
- App User Connectors `google_drive` e `google_sheets` (clientes registrados via `connector_app_user--connect_client`); escopos de leitura de Drive/Sheets.
- Fluxo OAuth em popup com rota de retorno `/oauth/google/return`; o código de uso único é trocado no servidor por `connectionAPIKey` (`lovack_*`).
- Chaves guardadas cifradas (AES-256-GCM com `APP_USER_CONNECTION_KEY_SECRET`) em `app_user_connections`, por usuário/conector, com acesso apenas via service role.
- Uma tabela `active_google_connection` aponta qual usuário admin é a conta ativa da aplicação; as leituras resolvem a chave por ali.
- `src/lib/estoque.server.ts` recebe a chave da conexão como parâmetro (em vez de ler `GOOGLE_DRIVE_API_KEY`/`GOOGLE_SHEETS_API_KEY` diretamente); cache em `estoque-cache.server.ts` passa a considerar a conta ativa na chave.
- Todas as chamadas ao Google continuam no servidor; nenhuma credencial vai para o navegador.

## O que você precisa fazer

- Aprovar os cards de configuração dos conectores Google (Drive e Sheets) quando aparecerem no chat.
- Depois de publicado: entrar no app, abrir "Conexão", clicar em "Conectar conta Google" e escolher a conta certa.
