import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Network, UserRound, UserX } from "lucide-react";
import { useMemo } from "react";

import escudoAsset from "@/assets/escudo-paysandu.png.asset.json";
import { PositionQRCode } from "@/components/organization/PositionQRCode";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initialPositions } from "@/data/initialPositions";
import { CollaboratorTypeBadges } from "@/components/organization/CollaboratorTypeBadges";
import {
  collaboratorTypeIdsOf,
  connectionTypeLabel,
  positionDisplayName,
  safePositions,
  statusLabel,
} from "@/lib/organization";
import { personInitials } from "@/lib/photo";
import { getCollaboratorTypes, getPositions } from "@/services/organizationStorageService";
import type { OrganizationPosition } from "@/types/organization";

export const Route = createFileRoute("/colaborador/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Perfil do colaborador — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Ficha institucional do colaborador no organograma do Paysandu Sport Club.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Perfil do colaborador — Paysandu Sport Club" },
      {
        property: "og:description",
        content: "Ficha institucional do colaborador no organograma do Paysandu Sport Club.",
      },
    ],
  }),
  component: ColaboradorPage,
});

function statusBadgeVariant(status: OrganizationPosition["status"]) {
  if (status === "occupied") return "border-success/40 bg-success/10 text-success";
  if (status === "vacant") return "border-warning/40 bg-warning/10 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground sm:text-right">{value}</span>
    </div>
  );
}

function ColaboradorPage() {
  const { id } = Route.useParams();

  const positions = useMemo(() => safePositions(getPositions() ?? initialPositions), []);
  const collaboratorTypes = useMemo(() => getCollaboratorTypes(), []);
  const position = useMemo(() => positions.find((p) => p.id === id) ?? null, [positions, id]);
  const superior = position?.superiorId
    ? (positions.find((p) => p.id === position.superiorId) ?? null)
    : null;
  const typeIds = position ? collaboratorTypeIdsOf(position) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <img
            src={escudoAsset.url}
            alt="Escudo do Paysandu Sport Club"
            className="h-10 w-10 object-contain"
          />
          <div>
            <p className="text-sm font-bold tracking-wide text-foreground">
              Organograma Institucional
            </p>
            <p className="text-xs text-muted-foreground">Paysandu Sport Club</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!position ? (
          <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <UserX className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Colaborador não encontrado</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              O registro solicitado não existe ou foi removido do organograma. Verifique o link ou
              o QR Code utilizado.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/login">Acessar o sistema</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <Avatar className="h-28 w-28 shrink-0 border-2 border-accent shadow-sm">
                  {position.photoUrl ? (
                    <AvatarImage
                      src={position.photoUrl}
                      alt={`Foto de ${position.personName || "colaborador"}`}
                    />
                  ) : null}
                  <AvatarFallback className="bg-accent text-2xl font-bold text-accent-foreground">
                    {position.status === "vacant" ? (
                      <UserRound className="h-10 w-10" />
                    ) : (
                      personInitials(position.personName)
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        {position.status === "vacant"
                          ? "Cargo vago"
                          : position.personName || "Sem ocupante"}
                      </h1>
                      <p className="mt-1 text-base font-semibold text-primary">
                        {position.positionTitle || "Cargo não definido"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${statusBadgeVariant(position.status)}`}
                    >
                      {statusLabel(position.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                    <Building2 className="h-4 w-4" />
                    {position.area?.trim() || "Sem área definida"}
                  </p>
                  {position.status === "occupied" && typeIds.length > 0 ? (
                    <div className="mt-3 flex justify-center sm:justify-start">
                      <CollaboratorTypeBadges types={collaboratorTypes} typeIds={typeIds} />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6">
                <InfoRow label="Cargo" value={position.positionTitle || "—"} />
                <InfoRow label="Área" value={position.area?.trim() || "—"} />
                <InfoRow
                  label="Superior imediato"
                  value={superior ? positionDisplayName(superior) : "—"}
                />
                <InfoRow label="Tipo de ligação" value={connectionTypeLabel(position.connectionType)} />
                {position.tooltip ? <InfoRow label="Referência" value={position.tooltip} /> : null}
                {position.notes ? <InfoRow label="Observações" value={position.notes} /> : null}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Network className="h-4 w-4 text-primary" />
                QR Code desta ficha
              </h2>
              {position.status === "occupied" && position.personName.trim() ? (
                <div className="mt-4">
                  <PositionQRCode position={position} />
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-dashed bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  Este cargo não possui ocupante cadastrado.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
