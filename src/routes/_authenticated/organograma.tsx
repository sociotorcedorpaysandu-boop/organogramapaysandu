import { createFileRoute } from "@tanstack/react-router";
import { Network, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import { PageError } from "@/components/PageError";
import { EmptyState, PageSkeleton } from "@/components/PageStates";
import { EditPositionPanel } from "@/components/organization/EditPositionPanel";
import {
  EMPTY_AREA_TOKEN,
  OrganizationChart,
} from "@/components/organization/OrganizationChart";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import { Button } from "@/components/ui/button";
import { categorizePositions, safePositions } from "@/lib/organization";
import type { OrganizationPosition } from "@/types/organization";

interface OrganogramaSearch {
  area?: string;
}

export const Route = createFileRoute("/_authenticated/organograma")({
  validateSearch: (search: Record<string, unknown>): OrganogramaSearch => ({
    area: typeof search.area === "string" && search.area ? search.area : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Organograma — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Estrutura hierárquica visual do Paysandu Sport Club com cargos, pessoas e vínculos.",
      },
      { property: "og:title", content: "Organograma — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Estrutura hierárquica visual do Paysandu Sport Club com cargos, pessoas e vínculos.",
      },
    ],
  }),
  component: OrganizationChartPage,
  errorComponent: PageError,
});

function OrganizationChartPage() {
  const { positions, isLoading, markAsVacant, deactivatePosition } = useOrganization();
  const { area } = Route.useSearch();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationPosition | null>(null);

  const list = safePositions(positions);
  const { orphans } = useMemo(() => categorizePositions(list), [list]);

  function openEdit(id: string) {
    const found = list.find((p) => p.id === id) ?? null;
    if (!found) return;
    setEditing(found);
    setPanelOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setPanelOpen(true);
  }

  if (isLoading) return <PageSkeleton />;

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="Nenhum cargo cadastrado"
        description="A base do organograma está vazia. Importe a planilha ou crie o primeiro cargo."
        action={
          <Button onClick={openCreate}>
            Criar primeiro cargo
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <OrganizationChart
        positions={list}
        initialArea={area}
        onEdit={openEdit}
        onCreate={openCreate}
        onMarkVacant={markAsVacant}
        onDeactivate={deactivatePosition}
      />

      {orphans.length > 0 ? (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">
            Sem vínculo hierárquico definido
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {orphans.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estes registros apontam para um superior inexistente ou formam ciclo. Edite-os para
            definir um superior válido.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {orphans.map((orphan) => (
              <div
                key={orphan.id}
                className="flex items-center justify-between gap-3 rounded-md border border-dashed px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {orphan.positionTitle || "Cargo não definido"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {orphan.personName || "CARGO VAGO"} • {orphan.area?.trim() || "Sem área"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(orphan.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <EditPositionPanel open={panelOpen} onOpenChange={setPanelOpen} position={editing} />
    </div>
  );
}
