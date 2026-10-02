import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronDown, ChevronUp, IdCard, MoreHorizontal, Pencil, UserX, Ban } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { personInitials } from "@/lib/photo";
import { collaboratorTypeIcon } from "@/lib/typeIcons";
import { cn } from "@/lib/utils";
import { cardAccentColor } from "@/lib/hierarchyLevel";
import type { DisplayMode, OrganizationPosition } from "@/types/organization";

/** Indicador visual de um tipo de colaborador exibido no cartão. */
export interface TypeBadge {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface PositionNodeData extends Record<string, unknown> {
  position: OrganizationPosition;
  childrenCount: number;
  collapsed: boolean;
  highlighted: boolean;
  dimmed: boolean;
  displayMode: DisplayMode;
  typeBadges: TypeBadge[];
  showTypeBadges: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onMarkVacant: (id: string) => void;
  onDeactivate: (id: string) => void;
}

export type PositionFlowNode = Node<PositionNodeData, "position">;

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 156;

function PersonAvatar({ position, size }: { position: OrganizationPosition; size: string }) {
  const photo = (position.photoUrl ?? "").trim();
  return (
    <Avatar className={cn("shrink-0 border border-border", size)}>
      {photo ? <AvatarImage src={photo} alt={position.personName || "Foto do colaborador"} /> : null}
      <AvatarFallback className="bg-accent text-[10px] font-bold text-accent-foreground">
        {personInitials(position.personName)}
      </AvatarFallback>
    </Avatar>
  );
}

export function PositionNode({ data }: NodeProps<PositionFlowNode>) {
  const { position, childrenCount, collapsed, highlighted, dimmed, displayMode } = data;
  const isVacant = position.status === "vacant";
  const isInactive = position.status === "inactive";
  const person = (position.personName ?? "").trim();
  const showTitle = displayMode !== "name";
  const showPerson = displayMode !== "title";
  const positionColor = cardAccentColor(
    position.positionTitle ?? "",
    isVacant ? [] : data.typeBadges.map((b) => b.name),
    position.positionColor ?? "",
  );
  const badges = data.showTypeBadges ? data.typeBadges : [];

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card px-4 py-3.5 text-left shadow-sm transition-opacity",
        "w-[280px] min-h-[130px]",
        displayMode !== "title-name" && "flex flex-col justify-center",
        isVacant && "border-dashed border-muted-foreground/50 bg-muted/40",
        isInactive && "opacity-60",
        highlighted && "ring-2 ring-primary border-primary",
        dimmed && "opacity-35",
      )}
      style={positionColor ? { borderLeft: `4px solid ${positionColor}` } : undefined}
      title={position.tooltip || undefined}
    >
      {/* Faixa superior de identificação (automática ou configurada) */}
      {positionColor ? (
        <span
          aria-hidden
          className="print-exact absolute inset-x-0 top-0 h-[7px] rounded-t-lg"
          style={{ backgroundColor: positionColor }}
        />
      ) : null}

      <Handle type="target" position={Position.Top} className="!bg-border" />

      <div className="flex items-start justify-between gap-2">
        {showTitle ? (
          <p className="text-[15px] font-extrabold uppercase leading-snug tracking-wide text-foreground">
            {position.positionTitle || "Cargo não definido"}
          </p>
        ) : (
          <span />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label="Ações do cargo"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => data.onEdit(position.id)}>
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => data.onOpenProfile(position.id)}>
              <IdCard className="h-4 w-4" />
              Abrir perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => data.onMarkVacant(position.id)}>
              <UserX className="h-4 w-4" />
              Marcar como cargo vago
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => data.onDeactivate(position.id)}>
              <Ban className="h-4 w-4" />
              Desativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showPerson ? (
        <div className="mt-1 flex items-center gap-2">
          <PersonAvatar position={position} size={displayMode === "name" ? "h-9 w-9" : "h-7 w-7"} />
          <p
            className={cn(
              "truncate",
              displayMode === "name" ? "text-sm font-semibold" : "text-sm",
              isVacant ? "font-semibold text-warning" : "text-foreground/90",
            )}
          >
            {isVacant ? "CARGO VAGO" : person || "—"}
          </p>
        </div>
      ) : null}

      {/* Indicadores discretos dos tipos do colaborador */}
      {badges.length > 0 && !isVacant ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {badges.map((badge) => {
            const Icon = collaboratorTypeIcon(badge.icon);
            return (
              <span
                key={badge.id}
                title={badge.description ? `${badge.name} — ${badge.description}` : badge.name}
                className="print-exact inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-1.5 py-px text-[10px] font-medium text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: badge.color || "var(--color-muted-foreground)" }}
                />
                <Icon className="h-2.5 w-2.5" aria-hidden />
                <span className="max-w-20 truncate">{badge.name}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{position.area?.trim() || "Sem área"}</span>
        {position.connectionType === "functional" ? (
          <span className="shrink-0 rounded border border-dashed border-muted-foreground/50 px-1 py-px">
            Funcional
          </span>
        ) : null}
        {position.connectionType === "undefined" ? (
          <span className="shrink-0 rounded border border-border px-1 py-px">Indefinida</span>
        ) : null}
      </div>

      {childrenCount > 0 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            data.onToggle(position.id);
          }}
          className="absolute -bottom-3 left-1/2 flex h-6 -translate-x-1/2 items-center gap-1 rounded-full border bg-card px-2 text-[11px] font-medium text-muted-foreground shadow-sm hover:bg-accent"
          aria-label={collapsed ? "Expandir subordinados" : "Recolher subordinados"}
        >
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          {childrenCount}
        </button>
      ) : null}

      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
