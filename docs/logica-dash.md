# Lógica do Dashboard — definições acordadas (reunião 30/06/2026, Tiago Rosa)

Fonte de verdade das definições de métrica. Qualquer divergência entre código e este
documento é bug ou pendência declarada.

## Conceitos

| Termo | Definição acordada |
|---|---|
| **Etapa** | Cada **tarefa vinculada** no relacionamento da holding (ex.: Solicitação de Documentos, Minuta de Abertura, 1ª Alteração da Célula Cofre, ITCMD, Pedido de Imunidade, Registro de Imóveis). **Célula NÃO é etapa.** |
| **Marco** | Os campos de relacionamento 01–08 da holding (Onboarding, Célula Destino, Célula Cofre, ITBI & Registro, Célula Veículo, Acordo de Sócios, Entrega, Extras). Visão macro; agrupa etapas. |
| **Sub-nível da etapa** | O tempo que a tarefa passa **em cada list** (Elaboração das Minutas, Abertura de Conta, ...). Não é subtarefa do ClickUp. Depende de histórico de list + tabela de SLA (input da Catena) — Fase 3. |
| **Evolução** | Mudança de **status** de alguma tarefa do cliente. Comentário NÃO conta como evolução. |
| **Progresso** | Vem do checklist do relacionamento (campo Progresso / automatic_progress). O checklist **continua existindo**, mas deve ser preenchido por **automação** quando a tarefa do relacionamento avança — o time não clica manualmente. (Automação é ajuste no ClickUp, fora do dash.) |
| **Em atraso (cliente)** | Due date principal do projeto (holding) vencida. |
| **Closer** | Quem vende SV, Projeto ou Holding. Hoje: só Osvaldo. SDR: Luíza (+1 em contratação). |
| **Agendamento (comercial)** | Agendamento da **sessão de viabilidade (SV)** — não da reunião de venda. |
| **Reunião (comercial)** | Reunião de **diagnóstico** (resgate do lead que não comprou no seminário). |

## Por que cada métrica existe (contexto do Rosa)

- **Tempo médio total na carteira** → margem operacional: custo de uma holding e CAC → margem.
- **Atraso 7/15/30/60/90** → forçar eficiência da margem operacional.
- **Tempo médio por modelo** (1/2/3 células) → meta de entrega e argumento de venda ("te entrego a hold em X dias").
- **Etapa com maior atraso** (tempo) ≠ **etapa com mais clientes em atraso** (volume). Ex.: uma etapa com 35 dias de atraso em 1 cliente vs. 15 clientes atrasados no fluxograma — olhares diferentes, ambos necessários.
- **Etapa que mais trava** → tempo médio de conclusão por etapa, mesmo sem atraso formal. Onde melhorar o processo por modelo.
- **Origem do seminário** → mesmo venda tardia (carrinho abandonado) atribui ao seminário de origem, para saber qual pitch/seminário traz mais negócio no ano.

## Métricas por painel

### Executivo
- Ativos / concluídos / paralisados; por modelo.
- Tempo médio total na carteira (início → hoje p/ ativos; início → conclusão p/ concluídos).
- % médio de progresso da carteira (ativos), geral e por modelo.
- Clientes em atraso (due date do projeto).

### Jornada
- Clientes por **marco** (visão macro) e por **etapa** (tarefa vinculada) — com drill por modelo.
- Etapa com maior concentração.
- Sem evolução ≥ 7/15/30/60/90 dias = nenhuma tarefa com mudança de status no período.

### Gargalos
- Etapa com **mais clientes em atraso** (due date da tarefa vencida).
- Etapa com **maior atraso** (dias além do due date).
- Etapa que **mais trava**: maior tempo médio de conclusão (criação → done).
- Tempo parado por origem do bloqueio: **cliente / interno / órgão-cartório** (classificação de status; a provisória no código precisa ser validada pela Catena).
- Onboarding: clientes em onboarding > 15 dias, > 30 dias, não concluído; **documento que mais atrasa** = entre as tarefas de solicitação (Pessoais / Bens Imóveis / Bens Diversos) — não por documento individual dentro do checklist ("aí é muita loucura").
- Tempo por list com SLA tabelado → **Fase 3** (input da Catena: quanto tempo cada tarefa pode ficar em cada list).

### Progresso & Envelhecimento
- Faixas de progresso <25 / 26–50 / 51–75 / >75; progresso médio por modelo.
- Faixas de idade da carteira; tempo médio por modelo (conversam entre si).

### Comercial (funil por seminário)
Leads → Agendamentos de sessão (SV) → Reuniões realizadas → SV vendidas → Projetos → Holdings.
- Conversões: lead→reunião, reunião→SV, SV→projeto, projeto→holding, e **total seminário→holding**.
- 2º estágio (carrinho abandonado): lead resgatado → reunião de diagnóstico → SV → projeto → holding, sempre atribuído ao seminário de origem.

### Closer
- Reuniões realizadas, fechamentos (SV/Projeto/Holding), taxa, faturamento, ticket médio — por closer.

## Fora do escopo do dash (registrado na reunião)

- Automação do checklist de relacionamento (ClickUp).
- E-mail semanal automático ao cliente com o estágio da holding (pedido da Jordana) → programa de manutenção contínua.
- AVJ na 1ª alteração da Célula Cofre (modelos 3 células) → ajuste de setup ClickUp.
- Metas de indicação (cliente/colaborador) → ferramenta de gestão no ClickUp, outra frente.

## Pendências de input da Catena

1. **Tabela de SLA por etapa/list** — sem ela, "atraso" depende dos due dates preenchidos no ClickUp (esparsos).
2. **Validação da classificação de status** por origem (cliente / interno / órgão-cartório).
3. Preenchimento no ClickUp: `Modelo de Holding` (17/69 vazios), due dates, campos do comercial (Seminário de Origem, Produto Vendido).
