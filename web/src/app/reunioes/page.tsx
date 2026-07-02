"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Percent, Video } from "lucide-react";
import { DonutChartCard } from "@/components/charts";
import {
  Card,
  ChartTitle,
  ErrorState,
  KpiCard,
  Loading,
  PageHeader,
} from "@/components/ui";
import { fetchMetric } from "@/lib/api";
import { ReunioesData } from "@/lib/types";

export default function ReunioesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["reunioes"],
    queryFn: () => fetchMetric<ReunioesData>("reunioes"),
  });

  const semFechamento = data ? data.realizadas - data.comFechamento : 0;

  return (
    <div>
      <PageHeader
        title="Reuniões Comerciais"
        subtitle="Volume e aproveitamento das reuniões realizadas"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard label="Reuniões realizadas" value={data.realizadas} accent="blue" icon={Video} />
            <KpiCard
              label="Com fechamento"
              value={data.comFechamento}
              accent="green"
              icon={CheckCircle2}
            />
            <KpiCard
              label="% com fechamento"
              value={data.percentualFechamento}
              suffix="%"
              accent="amber"
              icon={Percent}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <ChartTitle>Aproveitamento das reuniões</ChartTitle>
              <DonutChartCard
                data={[
                  { label: "Com fechamento", value: data.comFechamento },
                  { label: "Sem fechamento", value: semFechamento },
                ]}
                height={230}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
