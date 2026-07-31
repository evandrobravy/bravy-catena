# Retorno da Catena (planilha 21/07) — posicionamento ponto a ponto

Fonte: `Dashboard's Catena.xlsx`, enviado por Tiago Ramos no grupo em 21/07.
80 indicadores avaliados por eles: **5 OK, 74 pendências, 1 sem status**.

## Achado principal

**A produção está na versão de 02/07.** O último commit do repo é `80d001e` (02/07 08:03) e
`GET /api/metrics/drill/*` responde **404** em `catena-api.bravy.com.br`.

Todo o trabalho posterior está **local, sem commit e sem deploy**: 28 arquivos modificados,
+925 linhas, incluindo as 41 rotas de drill-down, a reconstrução do painel de Gargalos,
o painel de Responsáveis, as taxas de conversão do Comercial e a Fase A do GHL.

Ou seja: a planilha foi preenchida olhando uma versão defasada do dashboard. A maior parte
do que eles marcaram como pendência **já está construída**.

## Pendências por categoria

| # | Categoria | Situação |
|---|---|---|
| 25 | "Precisa clicar e abrir quem são" | **Pronto local.** 41 drill keys + painel lateral com busca, ordenação, CSV e link pro ClickUp. Resolve com deploy. |
| 5 | "Precisa ser por cliente e não tarefa" (sem evolução 7/15/30/60/90 dias) | **Pronto local.** `jornada.service.ts` agrega por `Set<clientId>`, drill `jornada.sem-evolucao`. |
| 5 | Conversões do Comercial (lead→reunião→SV→Projeto→Holding) | **Pronto local.** `comercial.service.ts:41-45` (`leadReuniao`, `reuniaoSV`, `svProjeto`, `projetoHolding`, `totalAteHolding`). |
| 7 | Gargalos "não encontrei" | **Pronto local.** `etapaClientesEmAtraso`, `etapaQueMaisTrava`, `onboarding.acima30`, `documentoQueMaisAtrasa`, `tempoPorLista`, `porMarco`. |
| 5 | Responsáveis "não encontrei" | **Pronto local** (3 de 5): clientes por responsável, tempo médio, % concluídas. **Faltam 2**: clientes em atraso por responsável e casos sem evolução por responsável. |
| 3 | Jornada/Progresso/Envelhecimento "não encontrei" | **Pronto local**: % por etapa, etapa com maior atraso (`etapaMaiorAtraso`), tempo médio por modelo, progresso médio por modelo (drill `progresso.modelo`). |
| 7 | Ordenação configurável no Closer | **Não feito.** Ajuste de UI: tornar as colunas clicáveis pra reordenar (volume, conversão, ticket). |
| 6 | Filtro/seletor de seminários | **Parcial.** A tabela lista todos os seminários com drill, mas não há o seletor que eles pediram. |
| 3 | Reuniões Comerciais → levar pro Comercial/Closer | **Decisão de UX**, não é bug. Vale confirmar antes de mexer. |
| 7 | Dashboard Estratégico Catena | **Escopo novo**, não estava no PDF original. Ver abaixo. |
| 1 | "Acima de 360 dias" com número errado | **Único bug real a investigar.** As faixas (`BUCKETS`) não mudaram desde 02/07. |

## Dashboard Estratégico Catena (7 indicadores) — escopo adicional

Patrimônio protegido, valor dos imóveis estruturados, patrimônio organizado, famílias
atendidas, herdeiros impactados, patrimônio por modelo, patrimônio médio por família.

Eles mesmos anotaram "não encontrei pois é novo". Nenhum desses campos existe hoje no
ClickUp deles — não dá pra calcular sem que o time passe a preencher valor patrimonial,
imóveis e quantidade de herdeiros nas Holdings. É conversa de escopo, não de ajuste.

## A tela que ele não entendeu

É a **"Tempo médio por lista (movimentação real)"**, do painel de Gargalos: colunas
Lista / Passagens / Tempo médio (dias). Doação de Cotas 24 passagens e 119,2 dias,
Elaboração das Minutas 242 e 83,2, Solicitação de Documentos 90 e 78, e por aí.

"Passagens" é jargão nosso: é quantas vezes uma tarefa passou por aquela lista, não
quantos clientes estão nela. Vale renomear pra algo como "Vezes que passou" e trocar
o título por "Quanto tempo cada etapa demora, na prática".

## Sequência sugerida

1. Revisar e commitar as 28 modificações locais, rodar `verify-drill-parity.mjs`, deployar.
2. Conferir contra a planilha o que caiu de pé sozinho com o deploy.
3. Investigar o bug do "acima de 360 dias".
4. Fechar os 4 itens pequenos: ordenação do Closer, seletor de seminários, os 2 de
   Responsáveis, e renomear a tela de tempo por lista.
5. Tratar o Estratégico Catena como escopo à parte, junto com o GHL.
