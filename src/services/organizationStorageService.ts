import type {
  ChangeLog,
  CollaboratorType,
  DisplayMode,
  OrganizationBackup,
  OrganizationPosition,
  Session,
} from "@/types/organization";

const POSITIONS_KEY = "paysandu_organogram_positions_v1";
const HISTORY_KEY = "paysandu_organogram_history_v1";
const SESSION_KEY = "paysandu_organogram_session_v1";
const BACKUP_KEY = "paysandu_organogram_backup_v1";
const META_KEY = "paysandu_organogram_meta_v1";
const DISPLAY_MODE_KEY = "paysandu_organogram_display_mode_v1";
const COLLABORATOR_TYPES_KEY = "paysandu_collaborator_types_v1";

const DISPLAY_MODES: DisplayMode[] = ["title-name", "title", "name"];

const HISTORY_LIMIT = 500;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento cheio ou indisponível — falha silenciosa controlada
  }
}

/* Posições */

/**
 * Migração segura: garante que registros antigos recebam os campos novos
 * (`photoUrl`, `positionColor`, `childrenLayout`, `collaboratorTypeIds`)
 * sem apagar nenhum dado existente.
 */
export function migratePositions(positions: OrganizationPosition[]): {
  positions: OrganizationPosition[];
  migrated: boolean;
} {
  let migrated = false;
  const next = positions.map((position) => {
    const needsMigration =
      typeof position.photoUrl !== "string" ||
      typeof position.positionColor !== "string" ||
      typeof position.childrenLayout !== "string" ||
      !Array.isArray(position.collaboratorTypeIds);
    if (!needsMigration) return position;
    migrated = true;
    return {
      ...position,
      photoUrl: position.photoUrl ?? "",
      positionColor: position.positionColor ?? "",
      childrenLayout: position.childrenLayout ?? "automatic",
      collaboratorTypeIds: Array.isArray(position.collaboratorTypeIds)
        ? position.collaboratorTypeIds
        : [],
    };
  });
  return { positions: next, migrated };
}

export function getPositions(): OrganizationPosition[] | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(POSITIONS_KEY);
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as OrganizationPosition[]) : null;
  } catch {
    return null;
  }
}

export function savePositions(positions: OrganizationPosition[]): void {
  writeJson(POSITIONS_KEY, Array.isArray(positions) ? positions : []);
  writeJson(META_KEY, { updatedAt: new Date().toISOString() });
}

export function getLastUpdated(): string | null {
  const meta = readJson<{ updatedAt?: string }>(META_KEY, {});
  return typeof meta.updatedAt === "string" ? meta.updatedAt : null;
}

/* Histórico */

export function getHistory(): ChangeLog[] {
  const history = readJson<ChangeLog[]>(HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

export function saveHistory(history: ChangeLog[]): void {
  writeJson(HISTORY_KEY, Array.isArray(history) ? history.slice(0, HISTORY_LIMIT) : []);
}

export function appendHistory(entry: ChangeLog): ChangeLog[] {
  const next = [entry, ...getHistory()].slice(0, HISTORY_LIMIT);
  saveHistory(next);
  return next;
}

/* Importação / backup */

export function importPositions(positions: OrganizationPosition[]): void {
  createBackup();
  savePositions(positions);
}

export function createBackup(): OrganizationBackup | null {
  const current = getPositions();
  if (!current) return null;
  const backup: OrganizationBackup = {
    createdAt: new Date().toISOString(),
    positions: current,
  };
  writeJson(BACKUP_KEY, backup);
  return backup;
}

export function getBackup(): OrganizationBackup | null {
  const backup = readJson<OrganizationBackup | null>(BACKUP_KEY, null);
  if (!backup || !Array.isArray(backup.positions)) return null;
  return backup;
}

export function restoreBackup(): OrganizationPosition[] | null {
  const backup = getBackup();
  if (!backup) return null;
  savePositions(backup.positions);
  return backup.positions;
}

export function exportBackup(): string {
  const payload: OrganizationBackup = {
    createdAt: new Date().toISOString(),
    positions: getPositions() ?? [],
  };
  return JSON.stringify(payload, null, 2);
}

export function clearData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(POSITIONS_KEY);
  window.localStorage.removeItem(HISTORY_KEY);
  window.localStorage.removeItem(META_KEY);
  window.localStorage.removeItem(BACKUP_KEY);
}

/* Tipos de colaboradores */

/** Tipos iniciais sugeridos — criados somente se a chave ainda não existir. */
const DEFAULT_COLLABORATOR_TYPES: Array<{
  name: string;
  description: string;
  color: string;
  icon: string;
}> = [
  { name: "PCD", description: "Pessoa com deficiência", color: "#f97316", icon: "accessibility" },
  { name: "Voluntário", description: "Atuação voluntária no clube", color: "#16a34a", icon: "heart-handshake" },
  { name: "Estagiário", description: "Vínculo de estágio", color: "#d97706", icon: "graduation-cap" },
  { name: "Terceirizado", description: "Empresa terceirizada", color: "#64748b", icon: "briefcase" },
];

export function getCollaboratorTypes(): CollaboratorType[] {
  const types = readJson<CollaboratorType[]>(COLLABORATOR_TYPES_KEY, []);
  return Array.isArray(types) ? types : [];
}

export function saveCollaboratorTypes(types: CollaboratorType[]): void {
  writeJson(COLLABORATOR_TYPES_KEY, Array.isArray(types) ? types : []);
}

/**
 * Garante a lista de tipos: cria a lista inicial somente se a chave ainda
 * não existir. Nunca sobrescreve tipos já cadastrados pelo administrador.
 */
export function ensureCollaboratorTypes(): CollaboratorType[] {
  if (!isBrowser()) return [];
  if (window.localStorage.getItem(COLLABORATOR_TYPES_KEY) !== null) {
    return getCollaboratorTypes();
  }
  const now = new Date().toISOString();
  const initial: CollaboratorType[] = DEFAULT_COLLABORATOR_TYPES.map((type, index) => ({
    id: `ctype-${index + 1}-${type.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: type.name,
    description: type.description,
    color: type.color,
    icon: type.icon,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  saveCollaboratorTypes(initial);
  return initial;
}

/* Preferência de exibição do organograma */

export function getDisplayMode(): DisplayMode {
  const value = readJson<string>(DISPLAY_MODE_KEY, "title-name");
  return DISPLAY_MODES.includes(value as DisplayMode) ? (value as DisplayMode) : "title-name";
}

export function saveDisplayMode(mode: DisplayMode): void {
  writeJson(DISPLAY_MODE_KEY, mode);
}

/* Sessão (simulada) */

export function getSession(): Session | null {
  const session = readJson<Session | null>(SESSION_KEY, null);
  if (!session || typeof session.email !== "string") return null;
  return session;
}

export function saveSession(session: Session): void {
  writeJson(SESSION_KEY, session);
}

export function clearSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}
