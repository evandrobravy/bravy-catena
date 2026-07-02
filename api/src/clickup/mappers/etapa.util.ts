// Normaliza o nome de uma tarefa operacional para o nome canônico da ETAPA.
// Etapa (definição da Catena, reunião 30/06): cada tarefa vinculada no
// relacionamento da holding — o nome vem com sufixo do cliente e variações
// de digitação ("Solciitação", "1 Alteração", "célula VEÍCULO", locais etc.).

const BASES_COM_SUFIXO = [
  'Registro de Imóveis',
  'Pedido de Imunidade',
  'Acordo de Sócios',
  'Minuta de Abertura',
];

export function normalizeEtapa(raw: string): string {
  let s = raw
    .replace(/\s*[-–—]?\s*HF\b.*$/i, '') // "… - HF - FULANO"
    .replace(/\s*[-–—]?\s*teste.*$/i, '') // "… - TESTE 3 CELULAS"
    .replace(/solciitação/gi, 'Solicitação')
    .replace(/\s+/g, ' ')
    .trim();

  // ordinal: "1 Alteração" -> "1ª Alteração"
  s = s.replace(/^(\d)\s*ª?\s*altera[çc][ãa]o/i, (_m, n: string) => `${n}ª Alteração`);
  // "Alteração Célula X" -> "Alteração da Célula X"
  s = s.replace(/alteração (da )?c[ée]lula/i, 'Alteração da Célula');
  s = s.replace(/^rerratificação (da )?/i, 'Rerratificação da ');

  if (/^aditamento\s+(de\s+|do\s+)?acordo de sócios/i.test(s)) {
    return 'Aditamento do Acordo de Sócios';
  }

  // "Abertura de Conta [e Certificado] [da] Célula X" e variações
  const conta = s.match(
    /^abertura de conta(?<cert>\s+e certificado)?(?:\s*[-–]\s*|\s+)?(?:d[ae]\s+)?(?:c[ée]lula\s+)?(?<cel>destino e cofre|destino|cofre|ve[íi]culo)?/i,
  );
  if (conta) {
    const cert = conta.groups?.cert ? ' e Certificado' : '';
    const cel = conta.groups?.cel ? ` Célula ${titleCase(conta.groups.cel)}` : '';
    return `Abertura de Conta${cert}${cel}`.trim();
  }

  // bases que ganham sufixo de local/empresa ("Registro de Imóveis - Itapema")
  for (const base of BASES_COM_SUFIXO) {
    if (s.toLowerCase().startsWith(base.toLowerCase())) return base;
  }

  // capitalização canônica de "Célula X"
  s = s.replace(
    /c[ée]lula\s+(\p{L}+)/giu,
    (_m, w: string) => `Célula ${w[0].toUpperCase()}${w.slice(1).toLowerCase()}`,
  );

  return s;
}

function titleCase(v: string): string {
  return v
    .toLowerCase()
    .replace(/veiculo/, 'veículo')
    .split(' ')
    .map((w) => (w === 'e' ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
