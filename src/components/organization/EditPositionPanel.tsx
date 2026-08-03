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
  const { positions, history, addPosition, updatePosition, markAsVacant, deactivatePosition } =
    useOrganization();

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
  const [formError, setFormError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPhotoLoading(false);
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
                  <SelectItem value="direct">Direta (linha contínua)</SelectItem>
                  <SelectItem value="functional">Funcional (linha tracejada)</SelectItem>
                  <SelectItem value="undefined">Indefinida</SelectItem>
                </SelectContent>
              </Select>
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
