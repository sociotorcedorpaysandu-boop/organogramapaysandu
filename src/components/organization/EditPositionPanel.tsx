import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PositionQRCode, profileUrl } from "@/components/organization/PositionQRCode";
import { Checkbox } from "@/components/ui/checkbox";
import { childrenLayoutLabel, resolveChildrenLayout } from "@/lib/chartLayout";
import { POSITION_COLOR_PALETTE, normalizeHexColor } from "@/lib/positionColor";
import {
  connectionTypeLabel,
  formatDateTime,
  getDescendantIds,
  hasCycle,
  positionDisplayName,
  safePositions,
  statusLabel,
} from "@/lib/organization";
import { fileToPhotoDataUrl, personInitials } from "@/lib/photo";
import { cn } from "@/lib/utils";
import { useOrganization, type PositionInput } from "@/components/organization/OrganizationProvider";
import type {
  ChildrenLayout,
  ConnectionType,
  OrganizationPosition,
  PositionStatus,
} from "@/types/organization";

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
  const {
    positions,
    history,
    collaboratorTypes,
    addPosition,
    updatePosition,
    markAsVacant,
    deactivatePosition,
  } = useOrganization();

  const isCreate = position === null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personName, setPersonName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [area, setArea] = useState("");
  const [superiorId, setSuperiorId] = useState<string>(NONE_SUPERIOR);
  const [connectionType, setConnectionType] = useState<ConnectionType>("undefined");
  const [tooltip, setTooltip] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PositionStatus>("occupied");
  const [positionColor, setPositionColor] = useState("");
  const [childrenLayout, setChildrenLayout] = useState<ChildrenLayout>("automatic");
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [occupantChanged, setOccupantChanged] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPhotoLoading(false);
    setOccupantChanged(false);
    if (position) {
      setPersonName(position.personName);
      setPhotoUrl(position.photoUrl ?? "");
      setPositionTitle(position.positionTitle);
      setArea(position.area);
      setSuperiorId(position.superiorId ?? NONE_SUPERIOR);
      setConnectionType(position.connectionType);
      setTooltip(position.tooltip);
      setNotes(position.notes);
      setStatus(position.status);
      setPositionColor(position.positionColor ?? "");
      setChildrenLayout(position.childrenLayout ?? "automatic");
      setSelectedTypeIds(
        Array.isArray(position.collaboratorTypeIds) ? position.collaboratorTypeIds : [],
      );
    } else {
      setPersonName("");
      setPhotoUrl("");
      setPositionTitle("");
      setArea("");
      setSuperiorId(defaultSuperiorId ?? NONE_SUPERIOR);
      setConnectionType("direct");
      setTooltip("");
      setNotes("");
      setStatus("occupied");
      setPositionColor("");
      setChildrenLayout("automatic");
      setSelectedTypeIds([]);
    }
  }, [open, position, defaultSuperiorId]);

  const list = safePositions(positions);

  const superiorOptions = useMemo(() => {
    if (isCreate || !position) {
      return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    const excluded = getDescendantIds(position.id, list);
    excluded.add(position.id);
    return list
      .filter((p) => !excluded.has(p.id))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [list, position, isCreate]);

  const directReports = useMemo(() => {
    if (!position) return [];
    return list
      .filter((p) => p.superiorId === position.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [list, position]);

  const positionHistory = useMemo(() => {
    if (!position) return [];
    return history.filter((entry) => entry.positionId === position.id);
  }, [history, position]);

  async function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    setFormError(null);
    setPhotoLoading(true);
    try {
      const dataUrl = await fileToPhotoDataUrl(file);
      setPhotoUrl(dataUrl);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível carregar a foto.");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function buildInput(): PositionInput {
    return {
      personName,
      photoUrl,
      positionTitle,
      superiorId: superiorId === NONE_SUPERIOR ? null : superiorId,
      connectionType,
      area,
      tooltip,
      notes,
      status,
      positionColor: normalizeHexColor(positionColor) ?? "",
      childrenLayout,
      collaboratorTypeIds: selectedTypeIds,
    };
  }

  function toggleType(typeId: string) {
    setSelectedTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId],
    );
  }

  /**
   * Troca de ocupante: ao substituir a pessoa, os tipos e a foto do ocupante
   * anterior não são herdados — limpa por padrão e o administrador confirma
   * os tipos do novo ocupante. Alterações de cargo, área ou superior mantêm
   * os tipos intactos.
   */
  function handlePersonNameChange(value: string) {
    setPersonName(value);
    if (isCreate || !position) return;
    const original = (position.personName ?? "").trim();
    if (original && value.trim() !== original && !occupantChanged) {
      setOccupantChanged(true);
      setSelectedTypeIds([]);
      setPhotoUrl("");
    }
  }

  function handleSave() {
    setFormError(null);
    if (!positionTitle.trim()) {
      setFormError("Informe o cargo. Este campo é obrigatório.");
      return;
    }
    if (positionColor.trim() && normalizeHexColor(positionColor) === null) {
      setFormError("A cor deve estar no formato hexadecimal #RRGGBB (ex.: #38bdf8) ou ficar vazia.");
      return;
    }
    const input = buildInput();
    if (isCreate) {
      const created = addPosition(input);
      if (created) onOpenChange(false);
      return;
    }
    if (!position) return;
    if (hasCycle(position.id, input.superiorId, list)) {
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

  const hasOccupant = !isCreate && status === "occupied" && personName.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isCreate ? "Novo cargo" : "Editar cargo"}</SheetTitle>
          <SheetDescription>
            {isCreate
              ? "Preencha os dados para incluir um novo cargo no organograma."
              : `Dados de ${position ? positionDisplayName(position) : ""}.`}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="info" className="flex-1 px-4">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
            <TabsTrigger value="hierarchy" className="flex-1">Hierarquia</TabsTrigger>
            <TabsTrigger value="qrcode" className="flex-1" disabled={isCreate}>QR Code</TabsTrigger>
            <TabsTrigger value="history" className="flex-1" disabled={isCreate}>Histórico</TabsTrigger>
          </TabsList>

          {/* Informações */}
          <TabsContent value="info" className="space-y-4 pb-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-border">
                {photoUrl ? <AvatarImage src={photoUrl} alt="Foto do colaborador" /> : null}
                <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
                  {personInitials(personName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <Label>Foto do colaborador</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={photoLoading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {photoLoading ? "Processando…" : photoUrl ? "Substituir" : "Selecionar foto"}
                  </Button>
                  {photoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrl("")}
                      aria-label="Remover foto"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Remover
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">JPG, PNG ou WebP até 8 MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void handlePhotoFile(event.target.files?.[0])}
                />
              </div>
            </div>

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
                onChange={(e) => handlePersonNameChange(e.target.value)}
                placeholder="Deixe vazio para cargo vago"
              />
            </div>

            {occupantChanged &&
            position &&
            personName.trim() !== (position.personName ?? "").trim() ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                Troca de ocupante: a foto e os tipos do ocupante anterior foram removidos. Confirme
                os tipos do novo ocupante antes de salvar.
              </p>
            ) : null}

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
              <Label>Cor de identificação do cargo (opcional)</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {POSITION_COLOR_PALETTE.map((option) => (
                  <button
                    key={option.value || "none"}
                    type="button"
                    onClick={() => setPositionColor(option.value)}
                    title={option.label}
                    aria-label={`Cor ${option.label}`}
                    className={cn(
                      "h-7 w-7 rounded-full border transition-transform hover:scale-110",
                      positionColor.trim().toLowerCase() === option.value.toLowerCase()
                        ? "ring-2 ring-primary ring-offset-1"
                        : "border-border",
                    )}
                    style={
                      option.value
                        ? { backgroundColor: option.value }
                        : {
                            background:
                              "linear-gradient(135deg, transparent 44%, var(--color-muted-foreground) 46%, var(--color-muted-foreground) 54%, transparent 56%)",
                          }
                    }
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={positionColor}
                  onChange={(e) => setPositionColor(e.target.value)}
                  placeholder="#RRGGBB ou vazio"
                  className="w-40"
                  aria-label="Cor hexadecimal do cargo"
                />
                {/* Pré-visualização da faixa superior do cartão */}
                <div className="relative h-9 flex-1 overflow-hidden rounded-md border bg-card">
                  {positionColor.trim() && normalizeHexColor(positionColor) !== null ? (
                    <span
                      className="absolute inset-x-0 top-0 h-[5px]"
                      style={{ backgroundColor: positionColor.trim() }}
                    />
                  ) : null}
                  <span className="absolute inset-x-2 top-3 truncate text-[10px] font-bold uppercase text-muted-foreground">
                    {positionTitle || "Prévia do cartão"}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sem cor = cartão branco padrão. A cor aparece como faixa superior discreta.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Tipos de colaborador</Label>
              {collaboratorTypes.filter((type) => type.isActive).length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  Nenhum tipo ativo cadastrado. Gerencie em “Tipos de colaboradores”.
                </p>
              ) : (
                <div className="space-y-1.5 rounded-md border p-3">
                  {collaboratorTypes
                    .filter((type) => type.isActive)
                    .map((type) => (
                      <label
                        key={type.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                      >
                        <Checkbox
                          checked={selectedTypeIds.includes(type.id)}
                          onCheckedChange={() => toggleType(type.id)}
                          aria-label={`Tipo ${type.name}`}
                        />
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: type.color || "var(--color-muted-foreground)" }}
                        />
                        {type.name}
                      </label>
                    ))}
                </div>
              )}
              {selectedTypeIds.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedTypeIds.map((typeId) => {
                    const type = collaboratorTypes.find((t) => t.id === typeId);
                    if (!type) return null;
                    return (
                      <span
                        key={typeId}
                        className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: type.color || "var(--color-muted-foreground)" }}
                        />
                        {type.name}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                Os tipos pertencem à pessoa que ocupa o cargo, não ao cargo.
              </p>
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
          </TabsContent>

          {/* Hierarquia */}
          <TabsContent value="hierarchy" className="space-y-4 pb-2">
            <div className="space-y-1.5">
              <Label>Superior imediato</Label>
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
                  <SelectItem value="direct">Direta</SelectItem>
                  <SelectItem value="functional">Funcional (badge no cartão)</SelectItem>
                  <SelectItem value="undefined">Indefinida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Exibição dos subordinados</Label>
              <Select
                value={childrenLayout}
                onValueChange={(value) => setChildrenLayout(value as ChildrenLayout)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automático</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Apenas organização visual — a hierarquia real não muda. No modo automático, 5 ou
                mais subordinados diretos usam lista vertical.
                {!isCreate && position
                  ? ` Com ${directReports.length} subordinado(s), a exibição atual é ${resolveChildrenLayout(childrenLayout, directReports.length) === "vertical" ? "Vertical" : "Horizontal"} (${childrenLayoutLabel(childrenLayout)}).`
                  : ""}
              </p>
            </div>

            {!isCreate && position ? (
              <>
                <div className="space-y-1.5">
                  <Label>Ordem visual</Label>
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {position.displayOrder}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Subordinados diretos ({directReports.length})</Label>
                  {directReports.length === 0 ? (
                    <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                      Nenhum subordinado direto.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {directReports.map((report) => (
                        <li
                          key={report.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="truncate font-medium text-foreground">
                            {report.positionTitle || "Cargo não definido"}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {statusLabel(report.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* QR Code */}
          <TabsContent value="qrcode" className="space-y-4 pb-2">
            {position && hasOccupant ? (
              <>
                <PositionQRCode position={{ ...position, photoUrl, personName }} />
                <div className="space-y-1.5">
                  <Label>Link do perfil</Label>
                  <p className="break-all rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {profileUrl(position.id)}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={profileUrl(position.id)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir perfil
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                Este cargo não possui ocupante cadastrado. O QR Code é gerado apenas para cargos
                ocupados.
              </p>
            )}
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history" className="space-y-3 pb-2">
            {positionHistory.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Nenhuma alteração registrada para este cargo.
              </p>
            ) : (
              positionHistory.map((entry) => (
                <div key={entry.id} className="rounded-md border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        entry.action === "create" && "border-success/40 bg-success/10 text-success",
                        entry.action === "update" && "border-primary/40 bg-primary/10 text-primary",
                        entry.action === "delete" &&
                          "border-destructive/40 bg-destructive/10 text-destructive",
                        entry.action === "import" && "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.action === "create"
                        ? "Criação"
                        : entry.action === "update"
                          ? "Alteração"
                          : entry.action === "delete"
                            ? "Exclusão"
                            : "Importação"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{entry.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">por {entry.userName}</p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {formError ? (
          <p className="mx-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

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
