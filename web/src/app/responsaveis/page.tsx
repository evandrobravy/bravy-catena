"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ListTodo, UserRound, Users } from "lucide-react";
import { BarChartCard } from "@/components/charts";
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
import { SERIES } from "@/lib/palette";
import { ResponsaveisData } from "@/lib/types";
import { useDrill } from "@/components/drill-drawer";

export default function ResponsaveisPage() {
  const { openDrill } = useDrill();
  const { data, isLoading, error } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: () => fetchMetric<ResponsaveisData>("responsaveis"),
  });

  const totalResp = data?.porResponsavel.length ?? 0;
  const totalAbertas = data?.porResponsavel.reduce((a, r) => a + r.abertas, 0) ?? 0;
  const totalConcluidas =
    data?.porResponsavel.reduce((a, r) => a + r.concluidas, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Responsáveis"
        subtitle="Distribuição e eficiência da carteira por responsável (tarefas operacionais)"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Responsáveis" value={totalResp} accent="blue" icon={Users} />
            <KpiCard
              label="Tarefas abertas"
              value={totalAbertas}
              accent="amber"
              icon={ListTodo}
              onClick={() =>
                openDrill({
                  key: "responsaveis.abertas",
                  titulo: "Tarefas abertas (com responsável)",
                  diasLabel: "Dias parado",
                })
              }
            />
            <KpiCard
              label="Concluídas"
              value={totalConcluidas}
              accent="green"
              icon={CheckCircle2}
              onClick={() =>
                openDrill({
                  key: "responsaveis.concluidas",
                  titulo: "Tarefas concluídas (com responsável)",
                })
              }
            />
            <KpiCard
              label="Sem responsável"
              value={data.semResponsavel}
              accent="red"
              icon={UserRound}
              onClick={() =>
                openDrill({
                  key: "responsaveis.sem-responsavel",
                  titulo: "Tarefas abertas sem responsável",
                  diasLabel: "Dias parado",
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Tarefas abertas por responsável</ChartTitle>
              <BarChartCard
                data={data.porResponsavel.map((r) => ({
                  label: r.responsavel,
                  value: r.abertas,
                }))}
                horizontal
                multicolor
                height={260}
                onItemClick={(d) =>
                  openDrill({
                    key: "responsaveis.abertas",
                    params: { responsavel: d.label },
                    titulo: `Abertas — ${d.label}`,
                    diasLabel: "Dias parado",
                  })
                }
              />
            </Card>
            <Card>
              <ChartTitle>Tempo médio parado por responsável (dias)</ChartTitle>
              <BarChartCard
                data={data.porResponsavel.map((r) => ({
                  label: r.responsavel,
                  value: r.tempoMedioParadoDias,
                }))}
                horizontal
                color={SERIES[5]}
                height={260}
                onItemClick={(d) =>
                  openDrill({
                    key: "responsaveis.abertas",
                    params: { responsavel: d.label },
                    titulo: `Abertas — ${d.label}`,
                    diasLabel: "Dias parado",
                  })
                }
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Clientes em atraso por responsável</ChartTitle>
              <BarChartCard
                data={data.porResponsavel.map((r) => ({
                  label: r.responsavel,
                  value: r.clientesEmAtraso,
                }))}
                horizontal
                color={SERIES[5]}
                height={260}
                onItemClick={(d) =>
                  openDrill({
                    key: "responsaveis.clientes-em-atraso",
                    params: { responsavel: d.label },
                    titulo: `Clientes em atraso — ${d.label}`,
                  })
                }
              />
            </Card>
            <Card>
              <ChartTitle>
                Clientes sem evolução há mais de {data.semEvolucaoDias} dias
              </ChartTitle>
              <BarChartCard
                data={data.porResponsavel.map((r) => ({
                  label: r.responsavel,
                  value: r.clientesSemEvolucao,
                }))}
                horizontal
                color={SERIES[2]}
                height={260}
                onItemClick={(d) =>
                  openDrill({
                    key: "responsaveis.sem-evolucao",
                    params: { responsavel: d.label },
                    titulo: `Sem evolução — ${d.label}`,
                    diasLabel: "Dias sem evolução",
                  })
                }
              />
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-1">
              <ChartTitle>Desempenho por responsável</ChartTitle>
              <p className="-mt-2 mb-3 text-xs text-[var(--text-muted)]">
                Clique em qualquer coluna para reordenar.
              </p>
            </div>
            <SortableTable
              rows={data.porResponsavel}
              rowKey={(r) => r.responsavel}
              initialSort="total"
              onRowClick={(r) =>
                openDrill({
                  key: "responsaveis.tarefas",
                  params: { responsavel: r.responsavel },
                  titulo: `Todas as tarefas — ${r.responsavel}`,
                  diasLabel: "Dias parado",
                })
              }
              columns={[
                { key: "responsavel", label: "Responsável", text: true },
                { key: "total", label: "Total" },
                { key: "abertas", label: "Abertas" },
                { key: "concluidas", label: "Concluídas" },
                {
                  key: "pctConcluidas",
                  label: "% Concluídas",
                  render: (r) => `${r.pctConcluidas}%`,
                },
                { key: "clientes", label: "Clientes" },
                { key: "clientesEmAtraso", label: "Em atraso" },
                { key: "clientesSemEvolucao", label: "Sem evolução" },
                {
                  key: "pctNoPrazo",
                  label: "% No prazo",
                  render: (r) => `${r.pctNoPrazo}%`,
                },
                {
                  key: "tempoMedioParadoDias",
                  label: "Tempo médio parado",
                  render: (r) => `${r.tempoMedioParadoDias}d`,
                },
              ]}
            />
          </Card>

          <InfoNote>{data.avisos.dados}</InfoNote>
          <InfoNote>{data.avisos.atraso}</InfoNote>
        </div>
      )}
    </div>
  );
}
