import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, UserX, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OrganizationPosition } from "@/types/organization";

export interface PositionNodeData extends Record<string, unknown> {
  position: OrganizationPosition;
  childrenCount: number;
  collapsed: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onMarkVacant: (id: string) => void;
  onDeactivate: (id: string) => void;
}

export type PositionFlowNode = Node<PositionNodeData, "position">;

export const NODE_WIDTH = 250;
export const NODE_HEIGHT = 118;

export function PositionNode({ data }: NodeProps<PositionFlowNode>) {
  const { position, childrenCount, collapsed, highlighted, dimmed } = data;
  const isVacant = position.status === "vacant";
  const isInactive = position.status === "inactive";
  const person = (position.personName ?? "").trim();

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card px-3.5 py-3 text-left shadow-sm transition-opacity",
        "w-[250px] min-h-[118px]",
        isVacant && "border-dashed border-muted-foreground/50 bg-muted/40",
        isInactive && "opacity-60",
        highlighted && "ring-2 ring-primary border-primary",
        dimmed && "opacity-35",
      )}
      title={position.tooltip || undefined}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold uppercase leading-snug tracking-wide text-foreground">
          {position.positionTitle || "Cargo não definido"}
        </p>
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

      <p
        className={cn(
          "mt-1 truncate text-sm",
          isVacant ? "font-semibold text-warning" : "text-foreground/90",
        )}
      >
        {isVacant ? "CARGO VAGO" : person || "—"}
      </p>

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
