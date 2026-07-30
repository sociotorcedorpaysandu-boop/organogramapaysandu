import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  getDescendantIds,
  hasCycle,
  positionDisplayName,
  safePositions,
} from "@/lib/organization";
import { useOrganization, type PositionInput } from "@/components/organization/OrganizationProvider";
import type { ConnectionType, OrganizationPosition, PositionStatus } from "@/types/organization";

const NONE_SUPERIOR = "__none__";

interface EditPositionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = modo de criação de novo cargo. */
  position: OrganizationPosition | null;
  /** Superior pré-selecionado ao criar um novo cargo. */
  defaultSuperiorId?: string | null;
}

export function EditPositionPanel({
  open,
  onOpenChange,
  position,
  defaultSuperiorId = null,
}: EditPositionPanelProps) {
  const { positions, addPosition, updatePosition, markAsVacant, deactivatePosition } =
    useOrganization();

  const isCreate = position === null;

  const [personName, setPersonName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [area, setArea] = useState("");
  const [superiorId, setSuperiorId] = useState<string>(NONE_SUPERIOR);
  const [connectionType, setConnectionType] = useState<ConnectionType>("undefined");
  const [tooltip, setTooltip] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PositionStatus>("occupied");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (position) {
      setPersonName(position.personName);
      setPositionTitle(position.positionTitle);
      setArea(position.area);
      setSuperiorId(position.superiorId ?? NONE_SUPERIOR);
      setConnectionType(position.connectionType);
      setTooltip(position.tooltip);
      setNotes(position.notes);
      setStatus(position.status);
    } else {
      setPersonName("");
      setPositionTitle("");
      setArea("");
      setSuperiorId(defaultSuperiorId ?? NONE_SUPERIOR);
      setConnectionType("direct");
      setTooltip("");
      setNotes("");
      setStatus("occupied");
    }
  }, [open, position, defaultSuperiorId]);

  const superiorOptions = useMemo(() => {
    const list = safePositions(positions);
    if (isCreate || !position) {
      return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    const excluded = getDescendantIds(position.id, list);
    excluded.add(position.id);
    return list
      .filter((p) => !excluded.has(p.id))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [positions, position, isCreate]);

  function buildInput(): PositionInput {
    return {
      personName,
      positionTitle,
      superiorId: superiorId === NONE_SUPERIOR ? null : superiorId,
      connectionType,
      area,
      tooltip,
      notes,
      status,
    };
  }

  function handleSave() {
    setFormError(null);
    if (!positionTitle.trim()) {
      setFormError("Informe o cargo. Este campo é obrigatório.");
      return;
    }
    const input = buildInput();
    if (isCreate) {
      const created = addPosition(input);
      if (created) onOpenChange(false);
      return;
    }
    if (!position) return;
    if (hasCycle(position.id, input.superiorId, safePositions(positions))) {
      setFormError(
        "Não é possível realizar esta alteração porque ela criaria um ciclo na hierarquia.",
      );
      return;
    }
    const ok = updatePosition(position.id, input);
    if (ok) onOpenChange(false);
  }

  function handleMarkVacant() {
    if (!position) return;
    markAsVacant(position.id);
    onOpenChange(false);
  }

  function handleDeactivate() {
    if (!position) return;
    deactivatePosition(position.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>{isCreate ? "Novo cargo" : "Editar cargo"}</SheetTitle>
          <SheetDescription>
            {isCreate
              ? "Preencha os dados para incluir um novo cargo no organograma."
              : `Altere os dados de ${position ? positionDisplayName(position) : ""}.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 px-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-position-title">Cargo *</Label>
            <Input
              id="edit-position-title"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="Ex.: Gerente Executivo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-person-name">Nome da pessoa</Label>
            <Input
              id="edit-person-name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Deixe vazio para cargo vago"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-area">Área</Label>
            <Input
              id="edit-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ex.: Administrativo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Superior hierárquico</Label>
            <Select value={superiorId} onValueChange={setSuperiorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem superior definido" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE_SUPERIOR}>Sem superior definido</SelectItem>
                {superiorOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {positionDisplayName(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de ligação</Label>
            <Select
              value={connectionType}
              onValueChange={(value) => setConnectionType(value as ConnectionType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direta (linha contínua)</SelectItem>
                <SelectItem value="functional">Funcional (linha tracejada)</SelectItem>
                <SelectItem value="undefined">Indefinida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as PositionStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="occupied">Ocupado</SelectItem>
                <SelectItem value="vacant">Vago</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-tooltip">Tooltip (descrição curta)</Label>
            <Input
              id="edit-tooltip"
              value={tooltip}
              onChange={(e) => setTooltip(e.target.value)}
              placeholder="Texto exibido como referência do cargo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações internas sobre o cargo"
              rows={3}
            />
          </div>

          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
        </div>

        <SheetFooter className="gap-2 border-t pt-4">
          <div className="flex w-full flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
            {!isCreate ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleMarkVacant} className="flex-1">
                  Marcar como cargo vago
                </Button>
                <Button variant="secondary" onClick={handleDeactivate} className="flex-1">
                  Desativar
                </Button>
              </div>
            ) : null}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
