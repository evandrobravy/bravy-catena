# Catena — Dashboard Gerencial

Dashboard gerencial da Catena Planejamento (holdings). Dados 100% do ClickUp via ETL.
Stack Bravy: NestJS (`api/`) + Next.js (`web/`) + PostgreSQL/Prisma + Recharts.

## Arquitetura

```
ClickUp API ──(cron/ETL, NestJS)──▶ Postgres ──▶ /api/metrics/* ──▶ Next.js (React Query + Recharts)
```

- ETL espelha Holdings, etapas (marcos 01–08), leads e deals para o Postgres.
- Métricas são calculadas a partir do Postgres (rápido, sem estourar rate limit do ClickUp).
- Sync incremental a cada 20 min + full nightly (com snapshots — Fase 2).

## Rodar local

```bash
# 1. Postgres
docker compose up -d postgres          # porta 5436

# 2. Backend (api/)
cd api
pnpm install
pnpm prisma migrate dev                # aplica schema
pnpm start:dev                         # http://localhost:3001/api
# dispara o primeiro sync:
curl -X POST "http://localhost:3001/api/sync/run?kind=full" -H "x-sync-token: <SYNC_TOKEN>"

# 3. Frontend (web/)
cd ../web
pnpm install
pnpm dev                               # http://localhost:3000 (ou :3002 em prod build)
```

Credenciais em `api/.env` (token ClickUp, IDs das lists, DATABASE_URL, SYNC_TOKEN).

## Dashboards (Fase 1 — entregues)

| Painel | Fonte | Observação |
|---|---|---|
| Executivo da Operação | Holdings | ativos/concluídos/paralisados, por modelo, tempo médio, progresso médio |
| Jornada do Cliente | Holdings + etapas | clientes por etapa; "sem evolução" é aproximação (Fase 2) |
| Prazo & Envelhecimento | Holdings | faixas de dias desde a entrada, por modelo |
| Progresso | Holdings | faixas de % + por modelo |
| Comercial por Seminário | Leads | funil por seminário |
| Closer | Leads | desempenho por closer |
| Reuniões Comerciais | Leads | volume e aproveitamento |
| Gargalos | — | **Fase 2/3** (placeholder) |
| Responsáveis | — | **Fase 2** (placeholder) |

## Pendências / próximas fases

- **Fase 2 (histórico):** tabela `StatusEvent` (diffing + backfill via activity endpoint) e `ClientSnapshot` nightly → "sem evolução" real, Gargalos, Responsáveis, login JWT.
- **Fase 3 (inputs da Catena):** tabela de **SLA por list/etapa** e **classificação de status** (cliente/interno/órgão-cartório) → "em atraso" preciso e "tempo parado por origem".

## Lacunas de dados no ClickUp (não são bugs)

- `due_date` das holdings preenchido em poucos casos → "em atraso" limitado até haver SLA.
- `Modelo de Holding` vazio em 17/69 holdings.
- Comercial esparso: `Seminário de Origem` e `Produto Vendido` pouco preenchidos → métricas populam conforme o time preenche.
