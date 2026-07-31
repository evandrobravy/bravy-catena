// Paridade card ↔ drill: para cada card drillável, o número do painel tem que
// bater com total/agregado do endpoint de drill. Roda sem e com filtro de modelo.
// Uso: node scripts/verify-drill-parity.mjs [base-url]
const BASE = process.argv[2] ?? 'http://localhost:3001/api/metrics';

const get = async (path, params = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const url = `${BASE}/${path}${qs.size ? `?${qs}` : ''}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

const marcoId = (label) => Number((label.match(/^(\d{2})\./) || [])[1]);

/** Cada entry: painel → lista de checks {card, valor, key, params, campo} */
const MANIFEST = [
  {
    painel: 'executivo',
    extrai: (p) => [
      { card: 'ativos', valor: p.totais.ativos, key: 'executivo.ativos' },
      { card: 'concluidos', valor: p.totais.concluidos, key: 'executivo.concluidos' },
      { card: 'paralisados', valor: p.totais.paralisados, key: 'executivo.paralisados' },
      { card: 'total', valor: p.totais.total, key: 'executivo.total' },
      { card: 'emAtraso', valor: p.emAtraso, key: 'executivo.em-atraso' },
      { card: 'tempoMedioDias', valor: p.tempoMedioDias, key: 'executivo.tempo-medio', campo: 'media' },
      { card: 'tempoMedioConcluidos', valor: p.tempoMedioConcluidosDias, key: 'executivo.tempo-medio-concluidos', campo: 'media' },
      { card: 'progressoMedio', valor: p.progressoMedio, key: 'executivo.progresso-medio', campo: 'media' },
      ...p.porModelo.map((m) => ({
        card: `porModelo[${m.label}]`, valor: m.value,
        key: 'executivo.por-modelo', params: { modelo: m.label },
      })),
      ...p.tempoMedioPorModelo.map((m) => ({
        card: `tempoMedioPorModelo[${m.modelo}]`, valor: m.tempoMedioDias,
        key: 'executivo.tempo-medio', params: { modelo: m.modelo }, campo: 'media',
      })),
    ],
  },
  {
    painel: 'jornada',
    extrai: (p) => [
      { card: 'finalizados', valor: p.finalizados, key: 'jornada.finalizados' },
      { card: 'semTarefas', valor: p.semTarefasVinculadas, key: 'jornada.sem-tarefas' },
      ...p.semEvolucao.map((s) => ({
        card: `semEvolucao[${s.dias}]`, valor: s.clientes,
        key: 'jornada.sem-evolucao', params: { bucketDias: s.dias },
      })),
      ...p.porMarco.map((m) => ({
        card: `porMarco[${m.marco}]`, valor: m.clientes,
        key: 'jornada.marco', params: { marcoId: m.marcoId },
      })),
      ...p.porEtapa.map((e) => ({
        card: `porEtapa[${e.etapa}|${e.marco}]`, valor: e.clientes,
        key: 'jornada.etapa',
        params: { etapa: e.etapa, marcoId: e.marco ? marcoId(e.marco) : 0 },
        campo: 'clientes',
      })),
    ],
  },
  {
    painel: 'envelhecimento',
    extrai: (p) => [
      { card: 'tempoMedio', valor: p.tempoMedioDias, key: 'envelhecimento.tempo-medio', campo: 'media' },
      ...p.faixas.map((f) => ({
        card: `faixa[${f.faixa}]`, valor: f.clientes,
        key: 'envelhecimento.faixa', params: { faixa: f.faixa },
      })),
      ...p.porModelo.flatMap((m) =>
        m.faixas.map((f) => ({
          card: `porModelo[${m.modelo}].faixa[${f.faixa}]`, valor: f.clientes,
          key: 'envelhecimento.faixa', params: { faixa: f.faixa, modelo: m.modelo },
        })),
      ),
    ],
  },
  {
    painel: 'progresso',
    extrai: (p) => [
      ...p.faixas.map((f) => ({
        card: `faixa[${f.faixa}]`, valor: f.clientes,
        key: 'progresso.faixa', params: { faixa: f.faixa },
      })),
      ...p.progressoMedioPorModelo.map((m) => ({
        card: `progressoMedio[${m.modelo}]`, valor: m.progressoMedio,
        key: 'progresso.modelo', params: { modelo: m.modelo }, campo: 'media',
      })),
    ],
  },
  {
    painel: 'comercial',
    semModelo: true,
    extrai: (p) => p.porSeminario.flatMap((s) => [
      { card: `leads[${s.seminario}]`, valor: s.leads, key: 'comercial.leads', params: { seminario: s.seminario } },
      { card: `agend[${s.seminario}]`, valor: s.agendamentos, key: 'comercial.agendamentos', params: { seminario: s.seminario } },
      { card: `reunioes[${s.seminario}]`, valor: s.reunioes, key: 'comercial.reunioes', params: { seminario: s.seminario } },
      { card: `sv[${s.seminario}]`, valor: s.sv, key: 'comercial.produto', params: { seminario: s.seminario, produto: 'SV' } },
      { card: `projetos[${s.seminario}]`, valor: s.projetos, key: 'comercial.produto', params: { seminario: s.seminario, produto: 'Projeto' } },
      { card: `holdings[${s.seminario}]`, valor: s.holdings, key: 'comercial.produto', params: { seminario: s.seminario, produto: 'Holding' } },
    ]),
  },
  {
    painel: 'closer',
    semModelo: true,
    extrai: (p) => p.porCloser.flatMap((c) => [
      { card: `reunioes[${c.closer}]`, valor: c.reunioes, key: 'closer.reunioes', params: { closer: c.closer } },
      { card: `fechamentos[${c.closer}]`, valor: c.fechamentos, key: 'closer.fechamentos', params: { closer: c.closer } },
      { card: `faturamento[${c.closer}]`, valor: c.faturamento, key: 'closer.faturamento', params: { closer: c.closer }, campo: 'soma' },
    ]),
  },
  {
    painel: 'reunioes',
    semModelo: true,
    extrai: (p) => [
      { card: 'realizadas', valor: p.realizadas, key: 'reunioes.realizadas' },
      { card: 'comFechamento', valor: p.comFechamento, key: 'reunioes.com-fechamento' },
    ],
  },
  {
    painel: 'gargalos',
    extrai: (p) => [
      { card: 'onb>15', valor: p.onboarding.acima15, key: 'gargalos.onboarding-acima', params: { bucketDias: 15 } },
      { card: 'onb>30', valor: p.onboarding.acima30, key: 'gargalos.onboarding-acima', params: { bucketDias: 30 } },
      { card: 'onbNaoConcluido', valor: p.onboarding.naoConcluido, key: 'gargalos.onboarding-nao-concluido' },
      ...p.porMarco.map((m) => ({
        card: `porMarco[${m.marco}]`, valor: m.tarefasAbertas,
        key: 'gargalos.marco', params: { marcoId: marcoId(m.marco) },
      })),
      ...p.porMarco.map((m) => ({
        card: `porMarco[${m.marco}].tempoParado`, valor: m.tempoMedioParadoDias,
        key: 'gargalos.marco', params: { marcoId: marcoId(m.marco) }, campo: 'media',
      })),
      ...p.etapaQueMaisTrava.map((e) => ({
        card: `trava[${e.etapa}].n`, valor: e.concluidas,
        key: 'gargalos.etapa-trava', params: { etapa: e.etapa },
      })),
      ...p.etapaQueMaisTrava.map((e) => ({
        card: `trava[${e.etapa}].media`, valor: e.tempoMedioDias,
        key: 'gargalos.etapa-trava', params: { etapa: e.etapa }, campo: 'media',
      })),
      ...p.etapaClientesEmAtraso.map((e) => ({
        card: `atrasoClientes[${e.etapa}]`, valor: e.clientes,
        key: 'gargalos.etapa-atraso', params: { etapa: e.etapa }, campo: 'clientes',
      })),
      ...p.etapaMaiorAtraso.map((e) => ({
        card: `atrasoTarefas[${e.etapa}]`, valor: e.tarefas,
        key: 'gargalos.etapa-atraso', params: { etapa: e.etapa },
      })),
      ...p.tempoPorLista.map((l) => ({
        card: `lista[${l.lista}].n`, valor: l.passagens,
        key: 'gargalos.lista', params: { lista: l.lista },
      })),
      ...p.tempoPorLista.map((l) => ({
        card: `lista[${l.lista}].media`, valor: l.tempoMedioDias,
        key: 'gargalos.lista', params: { lista: l.lista }, campo: 'media',
      })),
      ...p.clientesParadosPorMarco.map((m) => ({
        card: `parados[${m.marco}]`, valor: m.clientes,
        key: 'gargalos.parados-marco', params: { marcoId: marcoId(m.marco) },
      })),
      ...p.tempoParadoPorOrigem.map((o) => ({
        card: `origem[${o.origem}].n`, valor: o.tarefas,
        key: 'gargalos.origem', params: { origem: o.origem },
      })),
    ],
  },
  {
    painel: 'responsaveis',
    semModelo: true,
    extrai: (p) => [
      { card: 'semResponsavel', valor: p.semResponsavel, key: 'responsaveis.sem-responsavel' },
      ...p.porResponsavel.flatMap((r) => [
        { card: `total[${r.responsavel}]`, valor: r.total, key: 'responsaveis.tarefas', params: { responsavel: r.responsavel } },
        { card: `abertas[${r.responsavel}]`, valor: r.abertas, key: 'responsaveis.abertas', params: { responsavel: r.responsavel } },
        { card: `concluidas[${r.responsavel}]`, valor: r.concluidas, key: 'responsaveis.concluidas', params: { responsavel: r.responsavel } },
        { card: `tempoParado[${r.responsavel}]`, valor: r.tempoMedioParadoDias, key: 'responsaveis.abertas', params: { responsavel: r.responsavel }, campo: 'media' },
      ]),
    ],
  },
];

let checks = 0;
let falhas = [];

async function runPainel(m, filtro) {
  const payload = await get(m.painel, filtro);
  for (const c of m.extrai(payload)) {
    checks += 1;
    const drill = await get(`drill/${c.key}`, { ...filtro, ...c.params, take: 1 });
    const obtido =
      c.campo === 'media' ? drill.agregado?.media
      : c.campo === 'soma' ? drill.agregado?.soma
      : c.campo === 'clientes' ? drill.agregado?.clientes
      : drill.total;
    if (obtido !== c.valor) {
      falhas.push({
        painel: m.painel, filtro, card: c.card, key: c.key,
        params: c.params ?? {}, card_valor: c.valor, drill_valor: obtido,
      });
    }
  }
}

for (const m of MANIFEST) {
  await runPainel(m, {});
  if (!m.semModelo) await runPainel(m, { modelo: '1 Célula' });
}

console.log(`checks: ${checks} | divergências: ${falhas.length}`);
if (falhas.length) {
  for (const f of falhas) {
    console.log(
      `DIVERGE [${f.painel}${f.filtro.modelo ? ' modelo=' + f.filtro.modelo : ''}] ${f.card} -> ${f.key} ${JSON.stringify(f.params)}: card=${f.card_valor} drill=${f.drill_valor}`,
    );
  }
  process.exit(1);
}
console.log('PARIDADE OK — todos os cards batem com o drill.');
