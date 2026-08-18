Adicionar gráfico "Estoque por cliente" ao dashboard

Objetivo
Incluir uma visualização de estoque agrupado por cliente, ao lado do gráfico existente "Estoque por espécie", com interação de clique para filtrar.

Alterações previstas

1. src/routes/index.tsx
   - Adicionar um novo <ChartCard> "Estoque por cliente" na mesma seção de gráficos.
   - Usar o campo view.porCliente (já calculado) e renderizar como gráfico de barras horizontais (semelhante ao "Origem / observação").
   - Tornar as barras clicáveis: ao clicar, adicionar/remover o cliente do filtro filtros.clientes.
   - Aplicar o mesmo efeito de esmaecimento quando um cliente estiver fora do filtro ativo.
   - Reorganizar a grade de gráficos para acomodar o novo card sem quebrar o layout responsivo (lg:grid-cols-3, mantendo a linha do tempo com col-span-2).

2. src/lib/estoque-view.ts
   - Nenhuma alteração necessária: porCliente já é calculado e retornado.

3. src/lib/estoque-types.ts
   - Nenhuma alteração necessária: porCliente já existe no tipo DashboardView.

Comportamento esperado
- O usuário vê um novo gráfico listando os principais clientes por saldo em estoque.
- Clicar em uma barra filtra o dashboard inteiro por aquele cliente.
- O gráfico respeita os filtros já aplicados, pois view é recalculada a partir de filtrados.
