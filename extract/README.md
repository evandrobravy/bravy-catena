# Extract — ClickUp Catena (estrutura, automações e logs de atividade)

Pipeline de extração via API pública (pk) + **API privada da sessão web** (JWT frontdoor),
descoberta monitorando o network do app. O histórico por task (mudança de status, lista,
responsáveis, datas) NÃO existe na API pública — só aqui.

## Autenticação

- JWT de sessão: `~/.credentials/clients/clickup-jwt-catena.tmp` (expira ~48h).
  Renovar: `node extract/login-capture-jwt.js` (Playwright, login osvaldo@catena.adv.br do vault).
- Endpoints privados (capturados do network):
  - `POST {HOST}/task-v3/experience/{WS}/tasks/history` body `{taskId, includedFields[], reverse, limit}` → ids de eventos
  - `GET {HOST}/tasks/v1/task/{id}/historyItems?hist_ids[]=...` → detalhe (before/after/date/user/automation)
  - `POST {HOST}/automation/filters/{project|category|subcategory}/{id}/workflow` → automações por nível

## Scripts (rodar na ordem)

| Script | Faz | Saída |
|---|---|---|
| `login-capture-jwt.js` | login Playwright + captura JWT do network | `clickup-jwt-catena.tmp` |
| `01-estrutura.js` | spaces/folders/lists (API pública) | `data/estrutura.json` |
| `02-automacoes.js` | automações internas nos 3 níveis | `data/automacoes.json` |
| `03-backfill-logs.js` | holdings → tarefas relacionadas → log completo de cada task (idempotente; `--force` refaz) | `data/history/{id}.json`, `data/events.jsonl`, `data/projetos.json` |
| `04-load-db.sh` | carrega eventos no Postgres (`op_task_events`) + recalcula `statusChangedAt`/`dateDone`/`lastEvolutionAt` reais | banco |
| `05-verify.js` | verificação projeto por projeto, tarefa por tarefa | `data/verificacao.json` |

## Formato de `events.jsonl`

```json
{"taskId":"86acwfy8u","kind":"status","from":"em andamento","to":"finalizado","changedAt":"2026-06-29T...","user":"Ana Julia Amaral","automation":null}
```

`kind`: `status` | `list` | `assignee_add` | `assignee_rem` | `due_date` | `start_date` | `creation` | `name`.
`automation` preenchido quando a mudança foi feita por automação do ClickUp (ClickBot).
O raw em `data/history/` tem TODOS os campos (ids de lista, folder, space, cores de status etc.).

## Recorrência

O sync incremental do dash (diffing) só enxerga mudanças daqui pra frente; este backfill
preenche o passado. Re-rodar 03+04 periodicamente é seguro (idempotente por chave única).
