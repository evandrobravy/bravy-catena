export interface NavItem {
  href: string;
  label: string;
  group: "Operação" | "Comercial";
  phase?: 2 | 3;
}

export const NAV: NavItem[] = [
  { href: "/executivo", label: "Executivo da Operação", group: "Operação" },
  { href: "/jornada", label: "Jornada do Cliente", group: "Operação" },
  { href: "/envelhecimento", label: "Prazo & Envelhecimento", group: "Operação" },
  { href: "/progresso", label: "Progresso", group: "Operação" },
  { href: "/gargalos", label: "Gargalos", group: "Operação" },
  { href: "/responsaveis", label: "Responsáveis", group: "Operação" },
  { href: "/comercial", label: "Comercial por Seminário", group: "Comercial" },
  { href: "/closer", label: "Closer", group: "Comercial" },
  { href: "/reunioes", label: "Reuniões Comerciais", group: "Comercial" },
];
