"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Handshake,
  Trophy,
  Users,
} from "lucide-react";
import { BarChartCard, DonutChartCard } from "@/components/charts";
import {
  Card,
  ChartTitle,
  ErrorState,
  InfoNote,
  KpiCard,
  Loading,
  PageHeader,
  SortableTable,
} from "@/components/ui";
import { fetchMetric } from "@/lib/api";
import { ComercialData } from "@/lib/types";
import { useDrill } from "@/components/drill-drawer";
import { SeminarioFilter } from "@/components/seminario-filter";
import { useState } from "react";

export default function ComercialPage() {
  const { openDrill } = useDrill();
  const [seminario, setSeminario] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["comercial"],
    queryFn: () => fetchMetric<ComercialData>("comercial"),
  });

  const seminarios = data?.porSeminario.map((s) => s.seminario) ?? [];
  // quando um seminário está selecionado, a página inteira fala só dele
  const linhas =
    data?.porSeminario.filter((s) => !seminario || s.seminario === seminario) ??
    [];

  const sum = (k: "leads" | "agendamentos" | "reunioes" | "sv" | "projetos" | "holdings") =>
    linhas.reduce((acc, s) => acc + s[k], 0);

  const vendas = sum("sv") + sum("projetos") + sum("holdings");
  /** todo drill herda o seminário selecionado */
  const comSeminario = (extra?: Record<string, string | undefined>) =>
    seminario ? { seminario, ...extra } : extra;
  const sufixo = seminario ? ` — ${seminario}` : "";

  return (
    <div>
      <PageHeader
        title="Comercial por Seminário"
        subtitle="Volume e conversão do funil por origem de seminário"
        actions={
          data && (
            <SeminarioFilter
              seminarios={seminarios}
              value={seminario}
              onChange={setSeminario}
            />
          )
        }
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Leads"
              value={sum("leads")}
              accent="blue"
              icon={Users}
              onClick={() =>
                openDrill({
                  key: "comercial.leads",
                  params: comSeminario(),
                  titulo: `Leads${sufixo}`,
                })
              }
            />
            <KpiCard
              label="Agendamentos"
              value={sum("agendamentos")}
              accent="violet"
              icon={CalendarCheck}
              onClick={() =>
                openDrill({
                  key: "comercial.agendamentos",
                  params: comSeminario(),
                  titulo: `Agendamentos de sessão${sufixo}`,
                })
              }
            />
            <KpiCard
              label="Reuniões"
              value={sum("reunioes")}
              accent="amber"
              icon={Handshake}
              onClick={() =>
                openDrill({
                  key: "comercial.reunioes",
                  params: comSeminario(),
                  titulo: `Reuniões realizadas${sufixo}`,
                })
              }
            />
            <KpiCard
              label="Vendas (SV+Proj+Hold)"
              value={vendas}
              accent="green"
              icon={Trophy}
              onClick={() =>
                openDrill({
                  key: "comercial.vendas",
                  params: comSeminario(),
                  titulo: `Leads com venda (qualquer estágio)${sufixo}`,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Leads por seminário</ChartTitle>
              <BarChartCard
                data={linhas.map((s) => ({
                  label: s.seminario,
                  value: s.leads,
                }))}
                multicolor
                height={240}
                onItemClick={(d) =>
                  openDrill({
                    key: "comercial.leads",
                    params: { seminario: d.label },
                    titulo: `Leads — ${d.label}`,
                  })
                }
              />
            </Card>
            <Card>
              <ChartTitle>Mix de vendas por produto</ChartTitle>
              <DonutChartCard
                data={[
                  { label: "SV", value: sum("sv"), meta: { produto: "SV" } },
                  { label: "Projetos", value: sum("projetos"), meta: { produto: "Projeto" } },
                  { label: "Holdings", value: sum("holdings"), meta: { produto: "Holding" } },
                ]}
                height={240}
                onItemClick={(d) =>
                  openDrill({
                    key: "comercial.produto",
                    params: comSeminario({ produto: String(d.meta?.produto) }),
                    titulo: `Atingiram pelo menos ${d.label}${sufixo}`,
                  })
                }
              />
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-1">
              <ChartTitle>Funil por seminário</ChartTitle>
              <p className="-mt-2 mb-3 text-xs text-[var(--text-muted)]">
                Clique em qualquer coluna para reordenar.
              </p>
            </div>
            <SortableTable
              rows={linhas}
              rowKey={(s) => s.seminario}
              initialSort="leads"
              onRowClick={(s) =>
                openDrill({
                  key: "comercial.leads",
                  params: { seminario: s.seminario },
                  titulo: `Leads — ${s.seminario}`,
                })
              }
              columns={[
                { key: "seminario", label: "Seminário", text: true },
                { key: "leads", label: "Leads" },
                { key: "agendamentos", label: "Agend." },
                { key: "reunioes", label: "Reuniões" },
                { key: "sv", label: "SV" },
                { key: "projetos", label: "Projetos" },
                { key: "holdings", label: "Holdings" },
              ]}
            />
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-1">
              <ChartTitle>Conversões por seminário</ChartTitle>
              <p className="-mt-2 mb-3 text-xs text-[var(--text-muted)]">
                Cada etapa sobre a anterior; a última coluna é o seminário
                inteiro até virar Holding.
              </p>
            </div>
            <SortableTable
              rows={linhas}
              rowKey={(s) => s.seminario}
              initialSort="totalAteHolding"
              columns={[
                { key: "seminario", label: "Seminário", text: true },
                {
                  key: "leadReuniao",
                  label: "Lead → Reunião",
                  sortValue: (s) => s.conversoes.leadReuniao,
                  render: (s) => `${s.conversoes.leadReuniao}%`,
                },
                {
                  key: "reuniaoSV",
                  label: "Reunião → SV",
                  sortValue: (s) => s.conversoes.reuniaoSV,
                  render: (s) => `${s.conversoes.reuniaoSV}%`,
                },
                {
                  key: "svProjeto",
                  label: "SV → Projeto",
                  sortValue: (s) => s.conversoes.svProjeto,
                  render: (s) => `${s.conversoes.svProjeto}%`,
                },
                {
                  key: "projetoHolding",
                  label: "Projeto → Holding",
                  sortValue: (s) => s.conversoes.projetoHolding,
                  render: (s) => `${s.conversoes.projetoHolding}%`,
                },
                {
                  key: "totalAteHolding",
                  label: "Total até Holding",
                  sortValue: (s) => s.conversoes.totalAteHolding,
                  render: (s) => `${s.conversoes.totalAteHolding}%`,
                },
              ]}
            />
          </Card>

          <InfoNote>{data.avisos.dados}</InfoNote>
        </div>
      )}
    </div>
  );
}
