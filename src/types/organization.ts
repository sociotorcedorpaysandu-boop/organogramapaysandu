export type ConnectionType = "direct" | "functional" | "undefined";

export type PositionStatus = "occupied" | "vacant" | "inactive";

/** Modos de exibição dos cartões do organograma. */
export type DisplayMode = "title-name" | "title" | "name";

/** Disposição visual dos subordinados diretos de um responsável. */
export type ChildrenLayout = "automatic" | "horizontal" | "vertical";

export interface OrganizationPosition {
  id: string;
  legacyId: number;
  personName: string;
  /** Foto do colaborador (data URL comprimida ou URL futura do backend). */
  photoUrl?: string;
  positionTitle: string;
  superiorId: string | null;
  connectionType: ConnectionType;
  area: string;
  tooltip: string;
  notes: string;
  status: PositionStatus;
  /** Cor opcional de identificação do cargo (hex). Vazio = cartão branco padrão. */
  positionColor?: string;
  /** Disposição visual dos subordinados diretos. Nunca altera a hierarquia real. */
  childrenLayout?: ChildrenLayout;
  /** Tipos do colaborador que ocupa o cargo (pertencem à pessoa, não ao cargo). */
  collaboratorTypeIds?: string[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ChangeAction = "create" | "update" | "delete" | "import";

export interface ChangeLog {
  id: string;
  action: ChangeAction;
  positionId?: string;
  description: string;
  previousData?: unknown;
  newData?: unknown;
  createdAt: string;
  userName: string;
}

export interface Session {
  email: string;
  name: string;
  loggedAt: string;
}

/** Tipo de colaborador (PCD, Voluntário, Estagiário etc.), gerenciável pelo administrador. */
export interface CollaboratorType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationBackup {
  createdAt: string;
  positions: OrganizationPosition[];
}

export interface ImportReport {
  sheetName: string;
  totalRows: number;
  validRows: number;
  missingSuperior: number;
  duplicateIds: number;
  missingRequired: number;
  orphanSuperior: number;
  cycleCount: number;
}
