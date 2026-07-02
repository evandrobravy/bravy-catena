// Verificação projeto por projeto, tarefa por tarefa:
// cada holding e cada tarefa relacionada tem histórico extraído e parseável?
// Uso: node extract/05-verify.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const HIST = path.join(DATA, 'history');
const projetos = JSON.parse(fs.readFileSync(path.join(DATA, 'projetos.json'), 'utf8'));

// index de eventos por task
const evCount = {};
if (fs.existsSync(path.join(DATA, 'events.jsonl'))) {
  for (const line of fs.readFileSync(path.join(DATA, 'events.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    evCount[e.taskId] = (evCount[e.taskId] || 0) + 1;
  }
}

function checkTask(id) {
  const p = path.join(HIST, `${id}.json`);
  if (!fs.existsSync(p)) return { ok: false, motivo: 'sem arquivo' };
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { ok: true, itens: j.items.length, eventos: evCount[id] || 0 };
  } catch {
    return { ok: false, motivo: 'json inválido' };
  }
}

const relatorio = [];
const faltantes = [];
let totTasks = 0;
let totOk = 0;
let totEventos = 0;

for (const p of projetos) {
  const tasks = [{ id: p.holdingId, campo: '(holding)', nome: p.holding }, ...p.relacionadas];
  const linhas = tasks.map((t) => ({ ...t, ...checkTask(t.id) }));
  const ok = linhas.filter((l) => l.ok);
  const bad = linhas.filter((l) => !l.ok);
  totTasks += linhas.length;
  totOk += ok.length;
  const eventos = ok.reduce((a, l) => a + (l.eventos || 0), 0);
  totEventos += eventos;
  relatorio.push({
    holding: p.holding,
    status: p.status,
    tasks: linhas.length,
    comHistorico: ok.length,
    eventos,
    faltantes: bad.map((b) => ({ id: b.id, campo: b.campo, nome: b.nome, motivo: b.motivo })),
  });
  for (const b of bad) faltantes.push({ holding: p.holding, ...b });
}

fs.writeFileSync(path.join(DATA, 'verificacao.json'), JSON.stringify(relatorio, null, 2));

console.log(`Projetos: ${projetos.length}`);
console.log(`Tasks: ${totTasks} | com histórico: ${totOk} | faltantes: ${totTasks - totOk}`);
console.log(`Eventos parseados: ${totEventos}`);
const incompletos = relatorio.filter((r) => r.faltantes.length);
if (incompletos.length) {
  console.log('\nProjetos incompletos:');
  for (const r of incompletos) {
    console.log(`- ${r.holding}: faltam ${r.faltantes.length}/${r.tasks}`);
    for (const f of r.faltantes) console.log(`    ${f.id} [${f.campo}] ${f.nome ?? ''} (${f.motivo})`);
  }
  fs.writeFileSync(
    path.join(DATA, 'retry-ids.json'),
    JSON.stringify(faltantes.map((f) => f.id), null, 2),
  );
  console.log('\nIDs pra retry em data/retry-ids.json (rode 03 de novo — ele pula os que já existem)');
  process.exit(2);
}
console.log('\nTODOS os projetos 100% cobertos, tarefa por tarefa.');
