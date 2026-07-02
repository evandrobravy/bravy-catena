// Passos 3–6 — para TODOS os projetos (holdings): coleta as tarefas relacionadas
// (campos 01–08) e extrai o log completo de cada tarefa (status, lista,
// responsáveis, datas...) via API privada (network do app: tasks/history + historyItems).
//
// Uso: node extract/03-backfill-logs.js [--force]
//  - raw:     extract/data/history/{taskId}.json
//  - eventos: extract/data/events.jsonl (1 evento por linha)
//  - mapa:    extract/data/projetos.json (holding -> tarefas relacionadas)
const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const HIST_DIR = path.join(DATA, 'history');
fs.mkdirSync(HIST_DIR, { recursive: true });

const apiEnv = fs.readFileSync(path.join(__dirname, '../api/.env'), 'utf8');
const eget = (k) => (apiEnv.match(new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm')) || [])[1];
const PK = eget('CLICKUP_API_KEY');
const WS = eget('CLICKUP_WORKSPACE_ID');
const LIST_HOLDINGS = eget('CLICKUP_LIST_HOLDINGS');

const jwtFile = fs.readFileSync(
  path.join(os.homedir(), '.credentials/clients/clickup-jwt-catena.tmp'),
  'utf8',
);
const jget = (k) => (jwtFile.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const HOST = jget('HOST');
const JWT = jget('JWT');

const FORCE = process.argv.includes('--force');

const INCLUDED_FIELDS = [
  'status', 'assignee', 'group_assignee', 'due_date', 'start_date',
  'section_moved', 'added_to_subcategory', 'removed_from_subcategory',
  'task_creation', 'name', 'priority', 'custom_type', 'archived', 'duplicate',
];

async function retry(fn, label, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const wait = 1500 * (i + 1) * (String(e.message).includes('429') ? 4 : 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`${label}: ${last.message}`);
}

async function pub(pathname) {
  return retry(async () => {
    const r = await fetch(`https://api.clickup.com/api/v2${pathname}`, {
      headers: { Authorization: PK },
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    return r.json();
  }, `pub ${pathname}`);
}

async function priv(method, pathname, body) {
  return retry(async () => {
    const r = await fetch(`${HOST}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${JWT}`,
        'Content-Type': 'application/json',
        'x-workspace-id': WS,
        'x-csrf': '1',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    return r.json();
  }, `priv ${pathname}`);
}

// ── passo 3/4: projetos (holdings) e tarefas relacionadas ──
async function getProjetos() {
  const tasks = [];
  for (let page = 0; ; page++) {
    const j = await pub(
      `/list/${LIST_HOLDINGS}/task?page=${page}&include_closed=true&subtasks=false`,
    );
    tasks.push(...(j.tasks || []));
    if (j.last_page !== false || !(j.tasks || []).length) break;
  }
  return tasks.map((t) => {
    const relacionadas = [];
    for (const cf of t.custom_fields || []) {
      if ((cf.type === 'tasks' || cf.type === 'list_relationship') && Array.isArray(cf.value)) {
        for (const v of cf.value) {
          if (v && v.id) relacionadas.push({ id: v.id, campo: cf.name, nome: v.name ?? null });
        }
      }
    }
    return { holdingId: t.id, holding: t.name, status: t.status?.status, relacionadas };
  });
}

// ── passo 5: log completo de uma task ──
async function fetchHistory(taskId) {
  const ids = [];
  let cursor = null;
  for (let page = 0; page < 10; page++) {
    const j = await priv('POST', `/task-v3/experience/${WS}/tasks/history`, {
      cursor,
      includeCommentsContent: false,
      minimumCommentCount: 0,
      includedFields: INCLUDED_FIELDS,
      taskId,
      reverse: true,
      limit: 500,
    });
    ids.push(...(j.ids || []));
    cursor = j.cursor ?? j.nextCursor ?? null;
    if (!cursor || !(j.ids || []).length) break;
  }
  const items = [];
  for (let i = 0; i < ids.length; i += 40) {
    const qs = ids.slice(i, i + 40).map((h) => `hist_ids%5B%5D=${h}`).join('&');
    const j = await priv('GET', `/tasks/v1/task/${taskId}/historyItems?${qs}`);
    items.push(...(j.history || []));
  }
  items.sort((a, b) => Number(a.date) - Number(b.date));
  return { ids: ids.length, items };
}

// ── parse: item de histórico -> evento tabular ──
function parseEvents(taskId, items) {
  const events = [];
  const push = (kind, from, to, item) =>
    events.push({
      taskId,
      kind,
      from: from ?? null,
      to: to ?? null,
      changedAt: new Date(Number(item.date)).toISOString(),
      user: item.user?.username ?? null,
      automation: item.data?.automation?.name ?? null,
    });

  for (const it of items) {
    switch (it.field) {
      case 'status':
        push('status', it.before?.status, it.after?.status, it);
        break;
      case 'section_moved':
        push('list', it.before?.name, it.after?.name, it);
        break;
      case 'assignee_add':
        push('assignee_add', null, it.after?.username ?? it.after?.email, it);
        break;
      case 'assignee_rem':
        push('assignee_rem', it.before?.username ?? it.before?.email, null, it);
        break;
      case 'due_date':
        push(
          'due_date',
          it.before ? new Date(Number(it.before)).toISOString() : null,
          it.after ? new Date(Number(it.after)).toISOString() : null,
          it,
        );
        break;
      case 'start_date':
        push(
          'start_date',
          it.before ? new Date(Number(it.before)).toISOString() : null,
          it.after ? new Date(Number(it.after)).toISOString() : null,
          it,
        );
        break;
      case 'task_creation':
        push('creation', null, it.source ?? it.data?.via ?? null, it);
        break;
      case 'name':
        push('name', typeof it.before === 'string' ? it.before : null, typeof it.after === 'string' ? it.after : null, it);
        break;
      default:
        break;
    }
  }
  return events;
}

(async () => {
  console.log('Coletando projetos (holdings)...');
  const projetos = await getProjetos();
  fs.writeFileSync(path.join(DATA, 'projetos.json'), JSON.stringify(projetos, null, 2));
  const taskIds = new Set();
  for (const p of projetos) {
    taskIds.add(p.holdingId);
    for (const r of p.relacionadas) taskIds.add(r.id);
  }
  console.log(`${projetos.length} projetos, ${taskIds.size} tasks (holdings + relacionadas)`);

  const all = [...taskIds];
  const eventsPath = path.join(DATA, 'events.jsonl');
  if (FORCE && fs.existsSync(eventsPath)) fs.unlinkSync(eventsPath);
  const failed = [];
  let done = 0;
  let skipped = 0;

  const CONCURRENCY = 4;
  let idx = 0;
  async function worker() {
    while (idx < all.length) {
      const taskId = all[idx++];
      const rawPath = path.join(HIST_DIR, `${taskId}.json`);
      if (!FORCE && fs.existsSync(rawPath)) { skipped++; continue; }
      try {
        const { ids, items } = await fetchHistory(taskId);
        fs.writeFileSync(
          rawPath,
          JSON.stringify({ taskId, fetchedAt: new Date().toISOString(), idsCount: ids, items }),
        );
        const evs = parseEvents(taskId, items);
        if (evs.length) {
          fs.appendFileSync(eventsPath, evs.map((e) => JSON.stringify(e)).join('\n') + '\n');
        }
        done++;
        if (done % 25 === 0) console.log(`${done + skipped}/${all.length} (${failed.length} falhas)`);
      } catch (e) {
        failed.push({ taskId, error: e.message.slice(0, 200) });
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.writeFileSync(path.join(DATA, 'failed.json'), JSON.stringify(failed, null, 2));
  console.log(`FIM: ${done} extraídas, ${skipped} já existiam, ${failed.length} falhas -> data/failed.json`);
  process.exit(failed.length ? 2 : 0);
})().catch((e) => { console.error('ERRO FATAL:', e.message); process.exit(1); });
