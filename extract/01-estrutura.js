// Passo 1 — mapeia spaces, folders e lists do workspace Catena via API pública.
// Uso: node extract/01-estrutura.js
const fs = require('fs');
const os = require('os');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../api/.env'), 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm')) || [])[1];
const PK = get('CLICKUP_API_KEY');
const WS = get('CLICKUP_WORKSPACE_ID');
const API = 'https://api.clickup.com/api/v2';

async function cu(pathname) {
  const r = await fetch(`${API}${pathname}`, { headers: { Authorization: PK } });
  if (!r.ok) throw new Error(`${r.status} ${pathname}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

(async () => {
  const out = { workspaceId: WS, extractedAt: new Date().toISOString(), spaces: [] };
  const { spaces } = await cu(`/team/${WS}/space?archived=false`);
  for (const s of spaces) {
    const space = { id: s.id, name: s.name, archived: s.archived, folders: [], folderlessLists: [] };
    const { folders } = await cu(`/space/${s.id}/folder?archived=false`);
    for (const f of folders) {
      space.folders.push({
        id: f.id,
        name: f.name,
        lists: (f.lists || []).map((l) => ({
          id: l.id,
          name: l.name,
          taskCount: l.task_count ?? null,
          statuses: (l.statuses || []).map((st) => ({ status: st.status, type: st.type })),
        })),
      });
    }
    const { lists } = await cu(`/space/${s.id}/list?archived=false`);
    space.folderlessLists = (lists || []).map((l) => ({
      id: l.id,
      name: l.name,
      taskCount: l.task_count ?? null,
      statuses: (l.statuses || []).map((st) => ({ status: st.status, type: st.type })),
    }));
    out.spaces.push(space);
    console.log(`space ${s.name}: ${space.folders.length} folders, ${space.folderlessLists.length} lists soltas`);
  }
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data/estrutura.json'), JSON.stringify(out, null, 2));
  const nLists = out.spaces.reduce(
    (a, s) => a + s.folderlessLists.length + s.folders.reduce((b, f) => b + f.lists.length, 0),
    0,
  );
  console.log(`OK: ${out.spaces.length} spaces, ${nLists} lists -> extract/data/estrutura.json`);
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
