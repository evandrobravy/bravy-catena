"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Landmark, PiggyBank, Users } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { EstrategicoData } from "@/lib/types";
import { useDrill } from "@/components/drill-drawer";

export default function EstrategicoPage() {
  const { openDrill } = useDrill();
  const { data, isLoading, error } = useQuery({
    queryKey: ["estrategico"],
    queryFn: () => fetchMetric<EstrategicoData>("estrategico"),
  });

  return (
    <div>
      <PageHeader
        title="Estratégico Catena"
        subtitle="Impacto patrimonial da carteira: patrimônio protegido, famílias atendidas e composição por modelo"
      />
      {isLoading && <Loading />}
      {error && <ErrorState />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Patrimônio protegido"
              value={formatCurrency(data.patrimonioProtegido)}
              accent="emerald"
              icon={Landmark}
              hint="Holdings concluídas"
            />
            <KpiCard
              label="Patrimônio organizado"
              value={formatCurrency(data.patrimonioOrganizado)}
              accent="blue"
              icon={Building2}
              hint="Carteira inteira"
            />
            <KpiCard
              label="Famílias atendidas"
              value={data.familiasAtendidas}
              accent="green"
              icon={Users}
              hint={`${data.familiasNaCarteira} na carteira`}
              onClick={() =>
                openDrill({
                  key: "estrategico.familias",
                  titulo: "Famílias atendidas (holdings concluídas)",
                })
              }
            />
            <KpiCard
              label="Patrimônio médio"
              value={formatCurrency(data.patrimonioMedioPorFamilia)}
              accent="violet"
              icon={PiggyBank}
              hint="Por família atendida"
            />
          </div>

          {data.cobertura.comValorInformado === 0 && (
            <InfoNote>
              Nenhuma das {data.cobertura.holdings} holdings tem valor
              patrimonial informado no ClickUp ainda, então os valores acima
              aparecem zerados. O painel liga sozinho conforme o time preencher
              &ldquo;Patrimônio VLR Mercado&rdquo; (ou &ldquo;Patrimônio
              DIRPF&rdquo;) nas holdings.
            </InfoNote>
          )}

          <Card>
            <ChartTitle>Patrimônio protegido por modelo de holding</ChartTitle>
            <BarChartCard
              data={data.porModelo.map((m) => ({
                label: m.modelo,
                value: m.patrimonioProtegido,
              }))}
              horizontal
              multicolor
              height={200}
            />
          </Card>

          <Card className="overflow-x-auto p-0">
            <div className="p-5 pb-1">
              <ChartTitle>Composição por modelo</ChartTitle>
              <p className="-mt-2 mb-3 text-xs text-[var(--text-muted)]">
                Clique em qualquer coluna para reordenar.
              </p>
            </div>
            <SortableTable
              rows={data.porModelo}
              rowKey={(m) => m.modelo}
              initialSort="patrimonio"
              columns={[
                { key: "modelo", label: "Modelo", text: true },
                { key: "familias", label: "Famílias" },
                {
                  key: "patrimonio",
                  label: "Patrimônio",
                  render: (m) => formatCurrency(m.patrimonio),
                },
                {
                  key: "patrimonioProtegido",
                  label: "Protegido",
                  render: (m) => formatCurrency(m.patrimonioProtegido),
                },
                {
                  key: "comValor",
                  label: "Com valor informado",
                  render: (m) => `${m.comValor}/${m.familias}`,
                },
              ]}
            />
          </Card>

          <Card>
            <ChartTitle>Indicadores ainda sem campo no ClickUp</ChartTitle>
            <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
              {data.indisponiveis.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)]" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>

          <InfoNote>{data.avisos.dados}</InfoNote>
          <InfoNote>{data.avisos.indisponiveis}</InfoNote>
        </div>
      )}
    </div>
  );
}
