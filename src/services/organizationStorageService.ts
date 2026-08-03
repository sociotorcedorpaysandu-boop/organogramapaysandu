import type {
  ChangeLog,
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
