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

## O que foi feito (31/07)

Commits `f817e95` e `d0ce85d`, deployados em produção.

| Item do retorno | Status |
|---|---|
| 25× "clicar e abrir quem são" | Feito — drill-down foi pro ar |
| 5× "por cliente e não tarefa" | Feito — já estava correto, faltava deploy |
| 5× conversões do Comercial | Feito — mais uma tabela dedicada de conversões |
| 7× Gargalos "não encontrei" | Feito |
| 5× Responsáveis "não encontrei" | Feito — inclui os 2 que faltavam (em atraso e sem evolução por responsável), com drill próprio e % no prazo |
| 3× Jornada/Progresso/Envelhecimento | Feito |
| 7× ordenação no Closer | Feito — tabelas ordenáveis por qualquer coluna (Closer, Responsáveis, Comercial, Estratégico) |
| 6× seletor de seminários | Feito — seletor isola a página inteira num seminário |
| 1× tela de tempo por lista incompreensível | Feito — renomeada e explicada na própria tela |
| 1× "acima de 360 dias" errado | Explicado na tela — não era erro de cálculo (ver abaixo) |
| 7× Dashboard Estratégico | Estrutura feita; 5 dos 7 ligam sozinhos quando preencherem o ClickUp, 2 precisam de campo novo |
| 3× mover Reuniões Comerciais | Não mexido — é decisão de UX deles, precisa confirmar antes |

Verificação: build da api e do web, 367 checks de paridade card↔drill sem divergência,
sync full local (72 holdings, 1230 tarefas) sem erro.

### O "erro" das faixas acima de 360 dias

Não é erro de cálculo. A idade conta a partir da criação da holding no ClickUp, e a
holding mais antiga lá é de **23/10/2025** (281 dias). Nenhum cliente alcança 360 dias
porque o ClickUp deles é mais novo que a carteira. Para refletir a entrada real seria
preciso um campo "data de entrada" preenchido no ClickUp. O painel agora diz isso na tela
em vez de parecer conta errada.

### Dashboard Estratégico: o que trava

Os campos `Patrimônio DIRPF` e `Patrimônio VLR Mercado` existem na list de Holdings mas
estão **vazios nas 72 holdings** — por isso o painel mostra zero e avisa o motivo. Já
`Quantidade de herdeiros` e `Valor dos imóveis estruturados` não têm campo nenhum no
ClickUp; precisam ser criados antes de virarem indicador.

## Pendente

1. **UnniChat** (substituiu o GHL como CRM de leads deles): o acesso da Eliane exige 2FA
   por e-mail, então não dá pra entrar sem o código. Sem entrar, não dá pra confirmar o
   que a plataforma expõe de API/webhook.
2. **Reuniões Comerciais**: confirmar com eles se querem mesmo fundir no Comercial/Closer.
3. **Campos no ClickUp**: preencher patrimônio nas holdings e criar os campos de herdeiros
   e imóveis, se quiserem os 2 indicadores que faltam.
