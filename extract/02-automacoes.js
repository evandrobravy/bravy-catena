// Passo 2 — extrai automações internas do ClickUp em todos os níveis
// (space=project, folder=category, list=subcategory) via API privada (JWT).
// Uso: node extract/02-automacoes.js
const fs = require('fs');
const os = require('os');
const path = require('path');

const jwtFile = fs.readFileSync(
  path.join(os.homedir(), '.credentials/clients/clickup-jwt-catena.tmp'),
  'utf8',
);
const jget = (k) => (jwtFile.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const HOST = jget('HOST');
const JWT = jget('JWT');
const WS = '9013729897';

const estrutura = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/estrutura.json'), 'utf8'),
);

async function listWorkflows(levelPath, id) {
  const r = await fetch(`${HOST}/automation/filters/${levelPath}/${id}/workflow`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
      'x-workspace-id': WS,
      'x-csrf': '1',
    },
    body: JSON.stringify({
      filters: { actionTypes: [], conditionTypes: [], triggerTypes: [], lastUpdatedBy: [], active: 'ALL' },
    }),
  });
  if (!r.ok) return { error: `${r.status} ${(await r.text()).slice(0, 150)}` };
  const j = await r.json();
  return { automations: j.automations || [] };
}

const slim = (a) => ({
  id: a.id,
  name: a.name,
  active: a.active,
  dateCreated: a.date_created ? new Date(Number(a.date_created)).toISOString() : null,
  lastUpdated: a.last_updated ? new Date(Number(a.last_updated)).toISOString() : null,
  errors: a.errors,
  trigger: {
    type: a.trigger?.type,
    conditions: a.trigger?.conditions,
    input: a.trigger?.input,
  },
  actions: (a.actions || []).map((ac) => ({ type: ac.type, input: ac.input })),
});

(async () => {
  const targets = [];
  for (const s of estrutura.spaces) {
    targets.push({ level: 'space', levelPath: 'project', id: s.id, name: s.name, contexto: s.name });
    for (const f of s.folders) {
      targets.push({ level: 'folder', levelPath: 'category', id: f.id, name: f.name, contexto: `${s.name} > ${f.name}` });
      for (const l of f.lists) {
        targets.push({ level: 'list', levelPath: 'subcategory', id: l.id, name: l.name, contexto: `${s.name} > ${f.name} > ${l.name}` });
      }
    }
    for (const l of s.folderlessLists) {
      targets.push({ level: 'list', levelPath: 'subcategory', id: l.id, name: l.name, contexto: `${s.name} > ${l.name}` });
    }
  }
  console.log('alvos:', targets.length);

  const out = { workspaceId: WS, extractedAt: new Date().toISOString(), niveis: [] };
  let total = 0;
  for (const t of targets) {
    const res = await listWorkflows(t.levelPath, t.id);
    if (res.error) {
      out.niveis.push({ ...t, error: res.error });
      console.log(`ERRO ${t.level} ${t.contexto}: ${res.error}`);
    } else if (res.automations.length) {
      out.niveis.push({ ...t, automations: res.automations.map(slim), raw: res.automations });
      total += res.automations.length;
      console.log(`${t.level.padEnd(6)} ${t.contexto}: ${res.automations.length}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  fs.writeFileSync(path.join(__dirname, 'data/automacoes.json'), JSON.stringify(out, null, 2));
  console.log(`OK: ${total} automações em ${out.niveis.length} níveis com automação -> extract/data/automacoes.json`);
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
