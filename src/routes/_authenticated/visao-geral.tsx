import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  Building2,
  GitBranch,
  HandHeart,
  Network,
  Tags,
  Unlink,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import { PageError } from "@/components/PageError";
import { PageSkeleton } from "@/components/PageStates";
import { CollaboratorTypeBadges } from "@/components/organization/CollaboratorTypeBadges";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeStats, computeTypeCounts, formatDateTime, safePositions } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/visao-geral")({
  head: () => ({
    meta: [
      { title: "Visão geral — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Indicadores e situação geral do organograma institucional do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Visão geral — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Indicadores e situação geral do organograma institucional do Paysandu Sport Club.",
      },
    ],
  }),
  component: DashboardPage,
  errorComponent: PageError,
});

function DashboardPage() {
  const { positions, history, collaboratorTypes, isLoading, lastUpdated } = useOrganization();

  if (isLoading) return <PageSkeleton />;

  const list = safePositions(positions);
  const stats = computeStats(list);
  const recentChanges = (Array.isArray(history) ? history : []).slice(0, 6);

  const collaborators = list.filter(
    (p) => p.status === "occupied" && (p.personName ?? "").trim(),
  ).length;
  const activeTypes = collaboratorTypes.filter((type) => type.isActive).length;
  const typeCounts = computeTypeCounts(list);
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const countByName = (match: (name: string) => boolean) =>
    collaboratorTypes
      .filter((type) => match(normalize(type.name)))
      .reduce((sum, type) => sum + (typeCounts.get(type.id) ?? 0), 0);
  const pcdTotal = countByName((name) => name.includes("pcd"));
  const volunteerTotal = countByName((name) => name.startsWith("volunt"));

  const distribution = collaboratorTypes
    .map((type) => ({ type, count: typeCounts.get(type.id) ?? 0 }))
    .filter((row) => row.type.isActive || row.count > 0)
    .sort((a, b) => b.count - a.count || a.type.name.localeCompare(b.type.name, "pt-BR"))
    .slice(0, 6);

  const indicators = [
    { label: "Total de posições", value: stats.total, icon: Network, tone: "text-primary" },
    { label: "Cargos ocupados", value: stats.occupied, icon: Users, tone: "text-success" },
    { label: "Colaboradores", value: collaborators, icon: UserCheck, tone: "text-success" },
    { label: "Áreas", value: stats.areas, icon: Building2, tone: "text-primary" },
    { label: "Cargos vagos", value: stats.vacant, icon: UserX, tone: "text-warning" },
    { label: "Tipos ativos", value: activeTypes, icon: Tags, tone: "text-primary" },
    { label: "Colaboradores PCD", value: pcdTotal, icon: Accessibility, tone: "text-chart-2" },
    { label: "Voluntários", value: volunteerTotal, icon: HandHeart, tone: "text-success" },
    { label: "Sem superior definido", value: stats.withoutSuperior, icon: Unlink, tone: "text-muted-foreground" },
    { label: "Ligações funcionais", value: stats.functional, icon: GitBranch, tone: "text-chart-2" },
  ];

  const situation = [
    { label: "Cargos vagos", value: stats.vacant, description: "Posições sem pessoa designada" },
    { label: "Superiores não definidos", value: stats.withoutSuperior, description: "Registros sem vínculo hierárquico" },
    { label: "Ligações funcionais", value: stats.functional, description: "Vínculos não diretos na hierarquia" },
    { label: "Possíveis inconsistências", value: stats.inconsistencies + stats.orphans, description: "Sem cargo/área ou com superior inexistente" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Visão geral</h2>
          <p className="text-sm text-muted-foreground">
            Indicadores calculados a partir da base atual. Última atualização:{" "}
            {formatDateTime(lastUpdated)}.
          </p>
        </div>
        <Button asChild>
          <Link to="/organograma">
            Abrir organograma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {indicators.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                <item.icon className={`h-5 w-5 ${item.tone}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold tabular-nums text-foreground">{item.value}</p>
                <p className="truncate text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Distribuição por tipo de colaborador</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/quantitativos">Ver quantitativos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {distribution.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum tipo de colaborador cadastrado.
              </p>
            ) : (
              <ul className="divide-y">
                {distribution.map((row) => (
                  <li key={row.type.id} className="flex items-center justify-between gap-3 py-2.5">
                    <CollaboratorTypeBadges types={collaboratorTypes} typeIds={[row.type.id]} />
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Situação do organograma</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="space-y-3">
            {situation.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <span className="text-xl font-bold tabular-nums text-foreground">{item.value}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" asChild className="mt-1">
              <Link to="/pessoas-cargos">Revisar em Pessoas e cargos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Alterações recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/historico">Ver histórico completo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentChanges.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma alteração registrada até o momento.
              </p>
            ) : (
              <ul className="divide-y">
                {recentChanges.map((change) => (
                  <li key={change.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{change.description}</p>
                      <p className="text-xs text-muted-foreground">{change.userName}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(change.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
