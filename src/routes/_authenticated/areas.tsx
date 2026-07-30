import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { useMemo } from "react";

import { PageError } from "@/components/PageError";
import { EmptyState, PageSkeleton } from "@/components/PageStates";
import { EMPTY_AREA_TOKEN } from "@/components/organization/OrganizationChart";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPositionIndex, safePositions } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/areas")({
  head: () => ({
    meta: [
      { title: "Áreas — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Áreas e setores do organograma institucional do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Áreas — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Áreas e setores do organograma institucional do Paysandu Sport Club.",
      },
    ],
  }),
  component: AreasPage,
  errorComponent: PageError,
});

interface AreaSummary {
  name: string;
  total: number;
  occupied: number;
  vacant: number;
  responsible: string | null;
  param: string;
}

function AreasPage() {
  const { positions, isLoading } = useOrganization();
  const list = safePositions(positions);
  const index = useMemo(() => buildPositionIndex(list), [list]);

  const summaries = useMemo<AreaSummary[]>(() => {
    const map = new Map<string, AreaSummary>();
    for (const p of list) {
      const name = (p.area ?? "").trim();
      const key = name || "Sem área definida";
      const entry =
        map.get(key) ??
        ({
          name: key,
          total: 0,
          occupied: 0,
          vacant: 0,
          responsible: null,
          param: name || EMPTY_AREA_TOKEN,
        } satisfies AreaSummary);
      entry.total += 1;
      if (p.status === "occupied") entry.occupied += 1;
      if (p.status === "vacant") entry.vacant += 1;
      map.set(key, entry);
    }
    // Responsável principal: pessoa ocupada cujo superior está fora da área (ou não existe).
    for (const entry of map.values()) {
      const candidates = list
        .filter((p) => {
          const area = (p.area ?? "").trim() || "Sem área definida";
          if (area !== entry.name || p.status !== "occupied") return false;
          if (!p.superiorId) return true;
          const superior = index.get(p.superiorId);
          const superiorArea = (superior?.area ?? "").trim() || "Sem área definida";
          return superiorArea !== entry.name;
        })
        .sort((a, b) => a.displayOrder - b.displayOrder);
      entry.responsible = candidates[0]?.personName || null;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [list, index]);

  if (isLoading) return <PageSkeleton />;

  if (summaries.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Nenhuma área identificada"
        description="A base está vazia. Importe a planilha para visualizar as áreas do clube."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Áreas</h2>
        <p className="text-sm text-muted-foreground">
          {summaries.length} área(s) identificadas na base. Clique para abrir o organograma filtrado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaries.map((area) => (
          <Card key={area.name} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{area.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 px-2 py-2">
                  <p className="text-lg font-bold tabular-nums text-foreground">{area.total}</p>
                  <p className="text-[11px] text-muted-foreground">Posições</p>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-2">
                  <p className="text-lg font-bold tabular-nums text-success">{area.occupied}</p>
                  <p className="text-[11px] text-muted-foreground">Ocupadas</p>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-2">
                  <p className="text-lg font-bold tabular-nums text-warning">{area.vacant}</p>
                  <p className="text-[11px] text-muted-foreground">Vagas</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Responsável principal:{" "}
                <span className="font-medium text-foreground">{area.responsible ?? "—"}</span>
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/organograma" search={{ area: area.param }}>
                  Ver no organograma
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
