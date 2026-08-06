import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { initialPositions } from "@/data/initialPositions";
import { childrenLayoutLabel } from "@/lib/chartLayout";
import {
  collaboratorTypeIdsOf,
  getDescendantIds,
  hasCycle,
  newChangeId,
  newCollaboratorTypeId,
  newPositionId,
  positionDisplayName,
  safePositions,
} from "@/lib/organization";
import * as storage from "@/services/organizationStorageService";
import type {
  ChangeAction,
  ChangeLog,
  ChildrenLayout,
  CollaboratorType,
  OrganizationPosition,
} from "@/types/organization";

export interface PositionInput {
  personName: string;
  photoUrl: string;
  positionTitle: string;
  superiorId: string | null;
  connectionType: OrganizationPosition["connectionType"];
  area: string;
  tooltip: string;
  notes: string;
  status: OrganizationPosition["status"];
  positionColor: string;
  childrenLayout: ChildrenLayout;
  collaboratorTypeIds: string[];
}

export interface CollaboratorTypeInput {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface OrganizationContextValue {
  positions: OrganizationPosition[];
  history: ChangeLog[];
  collaboratorTypes: CollaboratorType[];
  isLoading: boolean;
  lastUpdated: string | null;
  backupCreatedAt: string | null;
  addPosition: (input: PositionInput) => OrganizationPosition | null;
  updatePosition: (id: string, input: PositionInput) => boolean;
  deletePosition: (id: string) => void;
  markAsVacant: (id: string) => void;
  deactivatePosition: (id: string) => void;
  replacePositions: (positions: OrganizationPosition[], description: string) => void;
  restoreBackup: () => boolean;
  resetToInitialData: () => void;
  addCollaboratorType: (input: CollaboratorTypeInput) => CollaboratorType | null;
  updateCollaboratorType: (id: string, input: CollaboratorTypeInput) => boolean;
  setCollaboratorTypeActive: (id: string, isActive: boolean) => void;
  deleteCollaboratorType: (id: string) => boolean;
  countCollaboratorTypeUsage: (id: string) => number;
  /**
   * Resolve nomes de tipos para IDs. Quando `createMissing` é true, cria em
   * lote os tipos inexistentes (usado pela importação após confirmação).
   * Retorna um mapa nome (minúsculas) → id.
   */
  ensureTypesByName: (names: string[], createMissing: boolean) => Record<string, string>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function currentUserName(): string {
  return storage.getSession()?.email ?? "sistema";
}

function describe(position: OrganizationPosition): string {
  return positionDisplayName(position);
}

function occupantName(position: OrganizationPosition): string {
  return (position.personName ?? "").trim() || position.positionTitle || "O colaborador";
}

/**
 * Normaliza nomes de tipos para comparação: ignora maiúsculas/minúsculas,
 * acentos e espaços duplicados.
 */
function normalizeTypeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/** Cores atribuídas em ciclo aos tipos criados automaticamente na importação. */
const IMPORT_TYPE_COLORS = ["#38bdf8", "#16a34a", "#d97706", "#7c3aed", "#f97316", "#64748b"];

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<OrganizationPosition[]>([]);
  const [history, setHistory] = useState<ChangeLog[]>([]);
  const [collaboratorTypes, setCollaboratorTypes] = useState<CollaboratorType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [backupCreatedAt, setBackupCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    // Importação inicial somente quando não houver dados persistidos.
    let stored = storage.getPositions();
    if (stored === null) {
      stored = initialPositions;
      storage.savePositions(stored);
    }
    // Migração segura: adiciona campos novos a registros antigos sem apagar dados.
    const migration = storage.migratePositions(safePositions(stored));
    if (migration.migrated) storage.savePositions(migration.positions);
    setPositions(migration.positions);
    // Tipos de colaboradores: cria a lista inicial somente se ainda não existir.
    setCollaboratorTypes(storage.ensureCollaboratorTypes());
    setHistory(storage.getHistory());
    setLastUpdated(storage.getLastUpdated());
    setBackupCreatedAt(storage.getBackup()?.createdAt ?? null);
    setIsLoading(false);
  }, []);

  const logChange = useCallback(
    (
      action: ChangeAction,
      description: string,
      positionId?: string,
      previousData?: unknown,
      newData?: unknown,
    ) => {
      const entry: ChangeLog = {
        id: newChangeId(),
        action,
        positionId,
        description,
        previousData,
        newData,
        createdAt: new Date().toISOString(),
        userName: currentUserName(),
      };
      setHistory(storage.appendHistory(entry));
    },
    [],
  );

  const persist = useCallback((next: OrganizationPosition[]) => {
    setPositions(next);
    storage.savePositions(next);
    setLastUpdated(storage.getLastUpdated());
  }, []);

  const persistTypes = useCallback((next: CollaboratorType[]) => {
    setCollaboratorTypes(next);
    storage.saveCollaboratorTypes(next);
  }, []);

  const addPosition = useCallback(
    (input: PositionInput): OrganizationPosition | null => {
      const list = safePositions(positions);
      const now = new Date().toISOString();
      const maxLegacy = list.reduce((max, p) => Math.max(max, p.legacyId || 0), 0);
      const maxOrder = list.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0);
      const position: OrganizationPosition = {
        id: newPositionId(),
        legacyId: maxLegacy + 1,
        personName: input.personName.trim(),
        photoUrl: input.photoUrl,
        positionTitle: input.positionTitle.trim(),
        superiorId: input.superiorId,
        connectionType: input.connectionType,
        area: input.area.trim(),
        tooltip: input.tooltip.trim(),
        notes: input.notes.trim(),
        status: input.status,
        positionColor: input.positionColor,
        childrenLayout: input.childrenLayout,
        collaboratorTypeIds: input.collaboratorTypeIds,
        displayOrder: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };
      persist([...list, position]);
      logChange("create", `Cargo criado: ${describe(position)}`, position.id, undefined, position);
      toast.success("Cargo criado com sucesso.");
      return position;
    },
    [positions, persist, logChange],
  );

  const updatePosition = useCallback(
    (id: string, input: PositionInput): boolean => {
      const list = safePositions(positions);
      const current = list.find((p) => p.id === id);
      if (!current) return false;

      if (hasCycle(id, input.superiorId, list)) {
        toast.error(
          "Não é possível realizar esta alteração porque ela criaria um ciclo na hierarquia.",
        );
        return false;
      }

      const updated: OrganizationPosition = {
        ...current,
        personName: input.personName.trim(),
        photoUrl: input.photoUrl,
        positionTitle: input.positionTitle.trim(),
        superiorId: input.superiorId,
        connectionType: input.connectionType,
        area: input.area.trim(),
        tooltip: input.tooltip.trim(),
        notes: input.notes.trim(),
        status: input.status,
        positionColor: input.positionColor,
        childrenLayout: input.childrenLayout,
        collaboratorTypeIds: input.collaboratorTypeIds,
        updatedAt: new Date().toISOString(),
      };
      persist(list.map((p) => (p.id === id ? updated : p)));

      // Histórico detalhado das alterações relevantes.
      const details: string[] = [];
      const previousPerson = (current.personName ?? "").trim();
      const nextPerson = input.personName.trim();
      if (previousPerson !== nextPerson) {
        details.push(
          nextPerson
            ? `ocupante alterado de "${previousPerson || "cargo vago"}" para "${nextPerson}"`
            : `ocupante "${previousPerson}" removido (cargo vago)`,
        );
      }
      const hadPhoto = Boolean((current.photoUrl ?? "").trim());
      const hasPhoto = Boolean(input.photoUrl.trim());
      if (hadPhoto && !hasPhoto) details.push("foto removida");
      else if (!hadPhoto && hasPhoto) details.push("foto adicionada");
      const previousColor = (current.positionColor ?? "").trim();
      if (previousColor !== input.positionColor.trim()) {
        details.push(
          input.positionColor.trim()
            ? `cor de identificação alterada para ${input.positionColor.trim()}`
            : "cor de identificação removida (cartão branco)",
        );
      }
      const previousLayout = current.childrenLayout ?? "automatic";
      if (previousLayout !== input.childrenLayout) {
        details.push(
          `a exibição dos subordinados foi alterada para ${childrenLayoutLabel(input.childrenLayout)}`,
        );
      }
      const previousTypes = new Set(collaboratorTypeIdsOf(current));
      const nextTypes = new Set(input.collaboratorTypeIds);
      const typeName = (typeId: string) =>
        collaboratorTypes.find((type) => type.id === typeId)?.name ?? typeId;
      for (const typeId of nextTypes) {
        if (!previousTypes.has(typeId)) {
          details.push(`${occupantName(updated)} recebeu o tipo ${typeName(typeId)}`);
        }
      }
      for (const typeId of previousTypes) {
        if (!nextTypes.has(typeId)) {
          details.push(`${occupantName(updated)} deixou de ter o tipo ${typeName(typeId)}`);
        }
      }

      const description =
        details.length > 0
          ? `Cargo atualizado: ${describe(updated)} (${details.join("; ")})`
          : `Cargo atualizado: ${describe(updated)}`;
      logChange("update", description, id, current, updated);
      toast.success("Alterações salvas com sucesso.");
      return true;
    },
    [positions, collaboratorTypes, persist, logChange],
  );

  const deletePosition = useCallback(
    (id: string) => {
      const list = safePositions(positions);
      const current = list.find((p) => p.id === id);
      if (!current) return;
      const descendants = getDescendantIds(id, list);
      // Subordinados diretos passam a ficar sem superior definido, sem quebrar a árvore.
      const next = list
        .filter((p) => p.id !== id)
        .map((p) =>
          p.superiorId === id
            ? { ...p, superiorId: null, updatedAt: new Date().toISOString() }
            : p,
        );
      persist(next);
      logChange(
        "delete",
        `Cargo excluído: ${describe(current)}${descendants.size > 0 ? ` (${descendants.size} subordinado(s) mantidos sem superior)` : ""}`,
        id,
        current,
        undefined,
      );
      toast.success("Cargo excluído.");
    },
    [positions, persist, logChange],
  );

  const markAsVacant = useCallback(
    (id: string) => {
      const list = safePositions(positions);
      const current = list.find((p) => p.id === id);
      if (!current) return;
      const updated: OrganizationPosition = {
        ...current,
        personName: "",
        photoUrl: "",
        collaboratorTypeIds: [],
        status: "vacant",
        updatedAt: new Date().toISOString(),
      };
      persist(list.map((p) => (p.id === id ? updated : p)));
      logChange("update", `Cargo marcado como vago: ${describe(updated)}`, id, current, updated);
      toast.success("Cargo marcado como vago.");
    },
    [positions, persist, logChange],
  );

  const deactivatePosition = useCallback(
    (id: string) => {
      const list = safePositions(positions);
      const current = list.find((p) => p.id === id);
      if (!current) return;
      const updated: OrganizationPosition = {
        ...current,
        status: "inactive",
        updatedAt: new Date().toISOString(),
      };
      persist(list.map((p) => (p.id === id ? updated : p)));
      logChange("update", `Cargo desativado: ${describe(updated)}`, id, current, updated);
      toast.success("Cargo desativado.");
    },
    [positions, persist, logChange],
  );

  const replacePositions = useCallback(
    (next: OrganizationPosition[], description: string) => {
      const list = storage.migratePositions(safePositions(next)).positions;
      storage.importPositions(list);
      setPositions(list);
      setLastUpdated(storage.getLastUpdated());
      setBackupCreatedAt(storage.getBackup()?.createdAt ?? null);
      logChange("import", description, undefined, undefined, { total: list.length });
      toast.success("Base de dados substituída com sucesso.");
    },
    [logChange],
  );

  const restoreBackup = useCallback((): boolean => {
    const restored = storage.restoreBackup();
    if (!restored) {
      toast.error("Nenhum backup disponível para restaurar.");
      return false;
    }
    setPositions(safePositions(restored));
    setLastUpdated(storage.getLastUpdated());
    logChange("import", "Backup automático restaurado.", undefined, undefined, {
      total: restored.length,
    });
    toast.success("Backup restaurado com sucesso.");
    return true;
  }, [logChange]);

  const resetToInitialData = useCallback(() => {
    storage.clearData();
    storage.savePositions(initialPositions);
    setPositions(safePositions(initialPositions));
    setHistory([]);
    setLastUpdated(storage.getLastUpdated());
    setBackupCreatedAt(null);
    logChange("import", "Base redefinida para os dados originais da planilha.", undefined, undefined, {
      total: initialPositions.length,
    });
    toast.success("Base redefinida para os dados originais.");
  }, [logChange]);

  /* Tipos de colaboradores */

  const countCollaboratorTypeUsage = useCallback(
    (id: string): number => {
      return safePositions(positions).filter((p) => collaboratorTypeIdsOf(p).includes(id)).length;
    },
    [positions],
  );

  const addCollaboratorType = useCallback(
    (input: CollaboratorTypeInput): CollaboratorType | null => {
      const name = input.name.trim();
      if (!name) {
        toast.error("Informe o nome do tipo de colaborador.");
        return null;
      }
      const duplicated = collaboratorTypes.some(
        (type) => type.name.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
      );
      if (duplicated) {
        toast.error("Já existe um tipo de colaborador com este nome.");
        return null;
      }
      const now = new Date().toISOString();
      const type: CollaboratorType = {
        id: newCollaboratorTypeId(),
        name,
        description: input.description.trim(),
        color: input.color,
        icon: input.icon,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      persistTypes([...collaboratorTypes, type]);
      logChange("create", `Tipo de colaborador criado: ${type.name}`, undefined, undefined, type);
      toast.success("Tipo de colaborador criado.");
      return type;
    },
    [collaboratorTypes, persistTypes, logChange],
  );

  const updateCollaboratorType = useCallback(
    (id: string, input: CollaboratorTypeInput): boolean => {
      const current = collaboratorTypes.find((type) => type.id === id);
      if (!current) return false;
      const name = input.name.trim();
      if (!name) {
        toast.error("Informe o nome do tipo de colaborador.");
        return false;
      }
      const duplicated = collaboratorTypes.some(
        (type) => type.id !== id && normalizeTypeName(type.name) === normalizeTypeName(name),
      );
      if (duplicated) {
        toast.error("Já existe outro tipo de colaborador com este nome.");
        return false;
      }
      const updated: CollaboratorType = {
        ...current,
        name,
        description: input.description.trim(),
        color: input.color,
        icon: input.icon,
        updatedAt: new Date().toISOString(),
      };
      persistTypes(collaboratorTypes.map((type) => (type.id === id ? updated : type)));
      logChange("update", `Tipo de colaborador atualizado: ${updated.name}`, undefined, current, updated);
      toast.success("Tipo de colaborador atualizado.");
      return true;
    },
    [collaboratorTypes, persistTypes, logChange],
  );

  const setCollaboratorTypeActive = useCallback(
    (id: string, isActive: boolean) => {
      const current = collaboratorTypes.find((type) => type.id === id);
      if (!current) return;
      const updated: CollaboratorType = { ...current, isActive, updatedAt: new Date().toISOString() };
      persistTypes(collaboratorTypes.map((type) => (type.id === id ? updated : type)));
      logChange(
        "update",
        `Tipo de colaborador ${isActive ? "reativado" : "desativado"}: ${current.name}`,
        undefined,
        current,
        updated,
      );
      toast.success(isActive ? "Tipo reativado." : "Tipo desativado.");
    },
    [collaboratorTypes, persistTypes, logChange],
  );

  const deleteCollaboratorType = useCallback(
    (id: string): boolean => {
      const current = collaboratorTypes.find((type) => type.id === id);
      if (!current) return false;
      const usage = countCollaboratorTypeUsage(id);
      if (usage > 0) {
        toast.error(
          `Este tipo está associado a ${usage} colaborador(es). Desative-o em vez de excluir.`,
        );
        return false;
      }
      persistTypes(collaboratorTypes.filter((type) => type.id !== id));
      logChange("delete", `Tipo de colaborador excluído: ${current.name}`, undefined, current, undefined);
      toast.success("Tipo de colaborador excluído.");
      return true;
    },
    [collaboratorTypes, countCollaboratorTypeUsage, persistTypes, logChange],
  );

  const ensureTypesByName = useCallback(
    (names: string[], createMissing: boolean): Record<string, string> => {
      const map: Record<string, string> = {};
      const missing: string[] = [];
      const seen = new Set<string>();
      for (const raw of names) {
        const name = raw.trim();
        if (!name) continue;
        const key = name.toLocaleLowerCase("pt-BR");
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = collaboratorTypes.find(
          (type) => type.name.trim().toLocaleLowerCase("pt-BR") === key,
        );
        if (existing) map[key] = existing.id;
        else missing.push(name);
      }
      if (createMissing && missing.length > 0) {
        const now = new Date().toISOString();
        const created: CollaboratorType[] = missing.map((name, index) => ({
          id: newCollaboratorTypeId(),
          name,
          description: "Criado automaticamente na importação.",
          color: IMPORT_TYPE_COLORS[index % IMPORT_TYPE_COLORS.length],
          icon: "tag",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));
        persistTypes([...collaboratorTypes, ...created]);
        for (const type of created) {
          map[type.name.trim().toLocaleLowerCase("pt-BR")] = type.id;
          logChange(
            "create",
            `Tipo de colaborador criado pela importação: ${type.name}`,
            undefined,
            undefined,
            type,
          );
        }
      }
      return map;
    },
    [collaboratorTypes, persistTypes, logChange],
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      positions,
      history,
      collaboratorTypes,
      isLoading,
      lastUpdated,
      backupCreatedAt,
      addPosition,
      updatePosition,
      deletePosition,
      markAsVacant,
      deactivatePosition,
      replacePositions,
      restoreBackup,
      resetToInitialData,
      addCollaboratorType,
      updateCollaboratorType,
      setCollaboratorTypeActive,
      deleteCollaboratorType,
      countCollaboratorTypeUsage,
      ensureTypesByName,
    }),
    [
      positions,
      history,
      collaboratorTypes,
      isLoading,
      lastUpdated,
      backupCreatedAt,
      addPosition,
      updatePosition,
      deletePosition,
      markAsVacant,
      deactivatePosition,
      replacePositions,
      restoreBackup,
      resetToInitialData,
      addCollaboratorType,
      updateCollaboratorType,
      setCollaboratorTypeActive,
      deleteCollaboratorType,
      countCollaboratorTypeUsage,
      ensureTypesByName,
    ],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization deve ser usado dentro de OrganizationProvider");
  }
  return context;
}
