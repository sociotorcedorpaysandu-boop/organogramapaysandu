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
import {
  getDescendantIds,
  hasCycle,
  newChangeId,
  newPositionId,
  positionDisplayName,
  safePositions,
} from "@/lib/organization";
import * as storage from "@/services/organizationStorageService";
import type { ChangeAction, ChangeLog, OrganizationPosition } from "@/types/organization";

export interface PositionInput {
  personName: string;
  positionTitle: string;
  superiorId: string | null;
  connectionType: OrganizationPosition["connectionType"];
  area: string;
  tooltip: string;
  notes: string;
  status: OrganizationPosition["status"];
}

interface OrganizationContextValue {
  positions: OrganizationPosition[];
  history: ChangeLog[];
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
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function currentUserName(): string {
  return storage.getSession()?.email ?? "sistema";
}

function describe(position: OrganizationPosition): string {
  return positionDisplayName(position);
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<OrganizationPosition[]>([]);
  const [history, setHistory] = useState<ChangeLog[]>([]);
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
    setPositions(safePositions(stored));
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

  const addPosition = useCallback(
    (input: PositionInput): OrganizationPosition | null => {
      const list = safePositions(positions);
      if (input.superiorId && hasCycle("pos-pending", input.superiorId, list)) {
        // nunca ocorre para registros novos, mas mantido por segurança
      }
      const now = new Date().toISOString();
      const maxLegacy = list.reduce((max, p) => Math.max(max, p.legacyId || 0), 0);
      const maxOrder = list.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0);
      const position: OrganizationPosition = {
        id: newPositionId(),
        legacyId: maxLegacy + 1,
        personName: input.personName.trim(),
        positionTitle: input.positionTitle.trim(),
        superiorId: input.superiorId,
        connectionType: input.connectionType,
        area: input.area.trim(),
        tooltip: input.tooltip.trim(),
        notes: input.notes.trim(),
        status: input.status,
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
        positionTitle: input.positionTitle.trim(),
        superiorId: input.superiorId,
        connectionType: input.connectionType,
        area: input.area.trim(),
        tooltip: input.tooltip.trim(),
        notes: input.notes.trim(),
        status: input.status,
        updatedAt: new Date().toISOString(),
      };
      persist(list.map((p) => (p.id === id ? updated : p)));
      logChange("update", `Cargo atualizado: ${describe(updated)}`, id, current, updated);
      toast.success("Alterações salvas com sucesso.");
      return true;
    },
    [positions, persist, logChange],
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
      const list = safePositions(next);
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

  const value = useMemo<OrganizationContextValue>(
    () => ({
      positions,
      history,
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
    }),
    [
      positions,
      history,
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
