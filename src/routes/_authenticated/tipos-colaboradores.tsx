import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PageError } from "@/components/PageError";
import { PageSkeleton } from "@/components/PageStates";
import { useOrganization, type CollaboratorTypeInput } from "@/components/organization/OrganizationProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { POSITION_COLOR_PALETTE, normalizeHexColor } from "@/lib/positionColor";
import { COLLABORATOR_TYPE_ICONS, collaboratorTypeIcon } from "@/lib/typeIcons";
import { cn } from "@/lib/utils";
import type { CollaboratorType } from "@/types/organization";

const DEFAULT_TYPE_COLOR = "#64748b";

export const Route = createFileRoute("/_authenticated/tipos-colaboradores")({
  head: () => ({
    meta: [
      { title: "Tipos de colaboradores — Organograma Institucional Paysandu" },
      {
        name: "description",
        content:
          "Cadastro e gestão dos tipos de colaboradores (PCD, voluntários, estagiários etc.) do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Tipos de colaboradores — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content:
          "Cadastro e gestão dos tipos de colaboradores (PCD, voluntários, estagiários etc.) do Paysandu Sport Club.",
      },
    ],
  }),
  component: CollaboratorTypesPage,
  errorComponent: PageError,
});

function CollaboratorTypesPage() {
  const {
    collaboratorTypes,
    isLoading,
    addCollaboratorType,
    updateCollaboratorType,
    setCollaboratorTypeActive,
    deleteCollaboratorType,
    countCollaboratorTypeUsage,
  } = useOrganization();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CollaboratorType | null>(null);
  const [deleting, setDeleting] = useState<CollaboratorType | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_TYPE_COLOR);
  const [icon, setIcon] = useState("tag");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    setFormError(null);
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setColor(editing.color || DEFAULT_TYPE_COLOR);
      setIcon(editing.icon || "tag");
    } else {
      setName("");
      setDescription("");
      setColor(DEFAULT_TYPE_COLOR);
      setIcon("tag");
    }
  }, [formOpen, editing]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(type: CollaboratorType) {
    setEditing(type);
    setFormOpen(true);
  }

  function handleSave() {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Informe o nome do tipo de colaborador.");
      return;
    }
    const normalized = normalizeHexColor(color);
    if (normalized === null || normalized === "") {
      setFormError("Escolha uma cor válida no formato #RRGGBB.");
      return;
    }
    const input: CollaboratorTypeInput = { name, description, color: normalized, icon };
    if (editing) {
      if (updateCollaboratorType(editing.id, input)) setFormOpen(false);
    } else {
      if (addCollaboratorType(input)) setFormOpen(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  const deletingUsage = deleting ? countCollaboratorTypeUsage(deleting.id) : 0;
  const palette = POSITION_COLOR_PALETTE.filter((option) => option.value !== "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Tipos de colaboradores
          </h2>
          <p className="text-sm text-muted-foreground">
            {collaboratorTypes.length} tipo(s) cadastrado(s). Os tipos pertencem à pessoa, não ao
            cargo, e são preservados na troca de cargo.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo tipo
        </Button>
      </div>

      {collaboratorTypes.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <Tags className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhum tipo cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie tipos como PCD, Voluntário ou Estagiário para classificar os colaboradores.
          </p>
          <Button className="mt-4" onClick={openCreate}>
            Criar primeiro tipo
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32">Colaboradores</TableHead>
                <TableHead className="w-28">Ativo</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaboratorTypes.map((type) => {
                const Icon = collaboratorTypeIcon(type.icon);
                const usage = countCollaboratorTypeUsage(type.id);
                const color = type.color || DEFAULT_TYPE_COLOR;
                return (
                  <TableRow key={type.id} className={cn(!type.isActive && "opacity-60")}>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: `${color}59`,
                          backgroundColor: `${color}14`,
                          color,
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {type.name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-sm text-muted-foreground">
                      {type.description?.trim() || "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{usage}</TableCell>
                    <TableCell>
                      <Switch
                        checked={type.isActive}
                        onCheckedChange={(checked) => setCollaboratorTypeActive(type.id, checked)}
                        aria-label={`${type.isActive ? "Desativar" : "Ativar"} tipo ${type.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(type)}
                          aria-label={`Editar tipo ${type.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(type)}
                          aria-label={`Excluir tipo ${type.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Formulário de criação/edição */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tipo" : "Novo tipo de colaborador"}</DialogTitle>
            <DialogDescription>
              Defina nome, descrição, cor e ícone. Tipos desativados não aparecem para novas
              associações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">Nome *</Label>
              <Input
                id="type-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: PCD, Voluntário, Estagiário"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type-description">Descrição</Label>
              <Textarea
                id="type-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Exibida como referência nos cadastros e tooltips"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {palette.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    title={option.label}
                    aria-label={`Cor ${option.label}`}
                    className={cn(
                      "h-7 w-7 rounded-full border transition-transform hover:scale-110",
                      color.trim().toLowerCase() === option.value.toLowerCase()
                        ? "ring-2 ring-primary ring-offset-1"
                        : "border-border",
                    )}
                    style={{ backgroundColor: option.value }}
                  />
                ))}
                <Input
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="#RRGGBB"
                  className="ml-1 w-32"
                  aria-label="Cor hexadecimal do tipo"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLLABORATOR_TYPE_ICONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setIcon(option.value)}
                    title={option.label}
                    aria-label={`Ícone ${option.label}`}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                      icon === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {formError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar tipo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão / bloqueio quando em uso */}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingUsage > 0 ? "Exclusão não permitida" : "Excluir tipo"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUsage > 0 ? (
                <>
                  Este tipo está associado a {deletingUsage} colaboradores. Desative-o em vez de
                  excluir.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir o tipo <strong>{deleting?.name}</strong>? Esta ação
                  não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{deletingUsage > 0 ? "Entendi" : "Cancelar"}</AlertDialogCancel>
            {deletingUsage > 0 ? (
              <AlertDialogAction
                onClick={() => {
                  if (deleting) setCollaboratorTypeActive(deleting.id, false);
                  setDeleting(null);
                }}
              >
                Desativar tipo
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => {
                  if (deleting) deleteCollaboratorType(deleting.id);
                  setDeleting(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
