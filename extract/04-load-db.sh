#!/bin/bash
# Passo (carga) — carrega events.jsonl em op_task_events (upsert idempotente)
# e recalcula campos derivados a partir do histórico REAL:
#   op_tasks.statusChangedAt, op_tasks.dateDone, clients.lastEvolutionAt
set -euo pipefail
cd "$(dirname "$0")"
DB="postgresql://catena:catena@localhost:5436/catena"

echo "== Convertendo events.jsonl para TSV =="
python3 - <<'EOF'
import json, uuid
rows = 0
with open('data/events.jsonl') as f, open('data/events.tsv', 'w') as out:
    for line in f:
        if not line.strip():
            continue
        e = json.loads(line)
        vals = [
            'evt_' + uuid.uuid5(uuid.NAMESPACE_URL,
                f"{e['taskId']}|{e['kind']}|{e['changedAt']}|{e.get('to') or ''}").hex,
            e['taskId'], e['kind'],
            (e.get('from') or '')[:500], (e.get('to') or '')[:500],
            e['changedAt'],
        ]
        out.write('\t'.join(v.replace('\t', ' ').replace('\n', ' ') for v in vals) + '\n')
        rows += 1
print('linhas:', rows)
EOF

echo "== Carga (upsert) =="
psql "$DB" <<'SQL'
CREATE TEMP TABLE _stg (
  id text, "opTaskClickupId" text, kind text,
  "fromValue" text, "toValue" text, "changedAt" timestamptz
);
\copy _stg FROM 'data/events.tsv' WITH (FORMAT text)

INSERT INTO op_task_events (id, "opTaskClickupId", kind, "fromValue", "toValue", "changedAt")
SELECT id, "opTaskClickupId", kind, NULLIF("fromValue",''), "toValue", "changedAt"
FROM _stg
ON CONFLICT ("opTaskClickupId", kind, "changedAt", "toValue") DO NOTHING;

SELECT kind, count(*) FROM op_task_events GROUP BY kind ORDER BY 2 DESC;
SQL

echo "== Derivados: statusChangedAt / dateDone / lastEvolutionAt =="
psql "$DB" <<'SQL'
-- última mudança de status real por task
UPDATE op_tasks t SET "statusChangedAt" = s.last_status
FROM (
  SELECT "opTaskClickupId", max("changedAt") AS last_status
  FROM op_task_events WHERE kind = 'status' GROUP BY 1
) s
WHERE t."clickupId" = s."opTaskClickupId";

-- data real de conclusão (transição para status done)
UPDATE op_tasks t SET "dateDone" = d.done_at
FROM (
  SELECT "opTaskClickupId", max("changedAt") AS done_at
  FROM op_task_events
  WHERE kind = 'status' AND lower("toValue") IN ('finalizado','finalizada','entregue')
  GROUP BY 1
) d
WHERE t."clickupId" = d."opTaskClickupId" AND t.done;

-- última evolução real por cliente
UPDATE clients c SET "lastEvolutionAt" = e.last_ev
FROM (
  SELECT t."clientId", max(ev."changedAt") AS last_ev
  FROM op_task_events ev
  JOIN op_tasks t ON t."clickupId" = ev."opTaskClickupId"
  WHERE ev.kind = 'status' AND t."clientId" IS NOT NULL
  GROUP BY 1
) e
WHERE c.id = e."clientId";

SELECT 'op_tasks c/ statusChangedAt real' AS m, count(*) FROM op_tasks
  WHERE "clickupId" IN (SELECT DISTINCT "opTaskClickupId" FROM op_task_events WHERE kind='status')
UNION ALL
SELECT 'op_tasks c/ dateDone', count(*) FROM op_tasks WHERE "dateDone" IS NOT NULL
UNION ALL
SELECT 'clients c/ lastEvolutionAt', count(*) FROM clients WHERE "lastEvolutionAt" IS NOT NULL;
SQL
echo "OK"
