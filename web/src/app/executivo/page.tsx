"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  PauseCircle,
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
} from "@/components/ui";
import { fetchMetric } from "@/lib/api";
import { ExecutivoData } from "@/lib/types";
import { ModeloFilter } from "@/components/modelo-filter";
import { useState } from "react";

export default function ExecutivoPage() {
  const [modelo, setModelo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["executivo", modelo],
    queryFn: () =>
      fetchMetric<ExecutivoData>("executivo", modelo ? { modelo } : undefined),
  });

  return (
    <div>
      <PageHeader
        title="Executivo da Operação"
        subtitle="Tamanho e saúde da carteira em execução"
        actions={<ModeloFilter value={modelo} onChange={setModelo} />}
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Clientes ativos" value={data.totais.ativos} accent="green" icon={Users} />
            <KpiCard label="Concluídos" value={data.totais.concluidos} accent="blue" icon={CheckCircle2} />
            <KpiCard label="Paralisados" value={data.totais.paralisados} accent="red" icon={PauseCircle} />
            <KpiCard
              label="Em atraso"
              value={data.emAtraso}
              hint={`${data.emAtrasoDetalhe.comDueDateVencido} c/ due date vencido · ${data.emAtrasoDetalhe.semDueDateAcimaMeta} acima da meta de ${data.metaTotalDias}d`}
              accent="orange"
              icon={AlertTriangle}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Tempo médio na carteira"
              value={data.tempoMedioDias}
              suffix="dias"
              hint="Clientes ativos, desde a entrada"
              accent="violet"
              icon={Clock}
            />
            <KpiCard
              label="Tempo médio até concluir"
              value={data.tempoMedioConcluidosDias}
              suffix="dias"
              hint="Holdings concluídas (margem operacional)"
              accent="blue"
              icon={Clock}
            />
            <KpiCard
              label="Progresso médio"
              value={data.progressoMedio}
              suffix="%"
              hint="Média do progresso dos ativos"
              accent="amber"
              icon={Gauge}
            />
            <KpiCard label="Total na carteira" value={data.totais.total} accent="emerald" icon={Layers} />
          </div>
          <Card>
            <ChartTitle>Tempo médio na carteira por modelo (dias)</ChartTitle>
            <BarChartCard
              data={data.tempoMedioPorModelo.map((m) => ({
                label: m.modelo,
                value: m.tempoMedioDias,
              }))}
              horizontal
              multicolor
              height={200}
            />
          </Card>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Composição por modelo</ChartTitle>
              <DonutChartCard data={data.porModelo} height={230} />
            </Card>
            <Card>
              <ChartTitle>Clientes por modelo</ChartTitle>
              <BarChartCard data={data.porModelo} horizontal multicolor height={230} />
            </Card>
          </div>
          <InfoNote>{data.avisos.dueDate}</InfoNote>
        </div>
      )}
    </div>
  );
}
