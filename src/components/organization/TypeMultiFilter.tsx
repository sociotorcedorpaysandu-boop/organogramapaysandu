import { Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CollaboratorType } from "@/types/organization";

interface TypeMultiFilterProps {
  types: CollaboratorType[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Filtro multi-seleção de tipos de colaborador (lógica OU entre selecionados).
 * Tipos desativados só aparecem enquanto estiverem selecionados.
 */
export function TypeMultiFilter({ types, selected, onChange }: TypeMultiFilterProps) {
  const options = types.filter((type) => type.isActive || selected.includes(type.id));

  function toggle(typeId: string) {
    onChange(
      selected.includes(typeId)
        ? selected.filter((id) => id !== typeId)
        : [...selected, typeId],
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label="Filtrar por tipo de colaborador">
          <Tags className="h-4 w-4" />
          Tipos
          {selected.length > 0 ? (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
              {selected.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Tipo de colaborador</p>
          <p className="text-[11px] text-muted-foreground">
            Exibe registros com qualquer um dos tipos marcados.
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {options.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              Nenhum tipo cadastrado.
            </p>
          ) : (
            options.map((type) => (
              <label
                key={type.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(type.id)}
                  onCheckedChange={() => toggle(type.id)}
                  aria-label={`Filtrar pelo tipo ${type.name}`}
                />
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: type.color || "#64748b" }}
                />
                <span className="truncate">{type.name}</span>
                {!type.isActive ? (
                  <span className="ml-auto text-[10px] text-muted-foreground">inativo</span>
                ) : null}
              </label>
            ))
          )}
        </div>
        {selected.length > 0 ? (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
              Limpar seleção
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
