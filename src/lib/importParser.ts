import * as XLSX from "xlsx";

import { categorizePositions } from "@/lib/organization";
import { normalizeHexColor } from "@/lib/positionColor";
import type {
  ChildrenLayout,
  CollaboratorType,
  ConnectionType,
  ImportReport,
  OrganizationPosition,
  PositionStatus,
} from "@/types/organization";

export interface ParsedImport {
  fileName: string;
  sheetName: string;
  positions: OrganizationPosition[];
  report: ImportReport;
  /** Nomes de tipos ainda sem cadastro, por posição (resolvidos na confirmação). */
  typeNamesByPositionId: Map<string, string[]>;
  /** Nomes de tipos encontrados na planilha que não existem no cadastro. */
  unknownTypeNames: string[];
}

const VACANT_PATTERN = /^(EM\s+ABERTO|ABERTO|VAGO|CARGO\s+VAGO)$/i;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Resolve valores de SuperiorID que podem vir como número, texto ou fórmula
 * do Excel (ex.: 2, "2", =A93, ='BASE (2)'!A2).
 */
function resolveSuperiorValue(raw: unknown, worksheet: XLSX.WorkSheet): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  const text = String(raw).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  if (text.startsWith("=")) {
    const match = text.match(/([A-Z]{1,3}\d+)\s*$/i);
    if (match) {
      const cell = worksheet[match[1].toUpperCase()];
      const value = cell?.v;
      if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
      if (typeof value === "string" && /^\d+$/.test(value.trim())) {
        return Number.parseInt(value.trim(), 10);
      }
    }
    return null;
  }
  return null;
}

function mapConnection(value: unknown): ConnectionType {
  const text = asText(value).toUpperCase();
  if (text === "DIRETA") return "direct";
  if (text === "FUNCIONAL") return "functional";
  return "undefined";
}

function mapLayout(value: unknown): ChildrenLayout {
  const text = asText(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  if (text === "HORIZONTAL") return "horizontal";
  if (text === "VERTICAL") return "vertical";
  return "automatic";
}

/** Tipos múltiplos separados por ponto e vírgula: "PCD; Voluntário". */
function splitTypeNames(value: unknown): string[] {
  return asText(value)
    .split(";")
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function parseOrganizationFile(
  file: File,
  collaboratorTypes: CollaboratorType[] = [],
): Promise<ParsedImport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellFormula: true });
  const sheetName = workbook.SheetNames.includes("BASE (2)")
    ? "BASE (2)"
    : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("Planilha vazia ou inválida.");
  }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  const headerIndex = aoa.findIndex((row) => {
    const cells = row.map(normalizeHeader);
    return cells.includes("id") && cells.includes("nome") && cells.includes("cargo");
  });
  if (headerIndex === -1) {
    throw new Error(
      "Cabeçalho não encontrado. A planilha deve conter as colunas ID, Nome, Cargo e SuperiorID.",
    );
  }

  const header = aoa[headerIndex].map(normalizeHeader);
  const columnOf = (...names: string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index !== -1) return index;
    }
    return -1;
  };
  const col = {
    id: columnOf("id"),
    nome: columnOf("nome"),
    cargo: columnOf("cargo"),
    superior: columnOf("superiorid"),
    tipo: columnOf("tipoligacao"),
    tooltip: columnOf("tooltip"),
    area: columnOf("area"),
    obs: columnOf("obs"),
    cor: columnOf("corcargo"),
    layout: columnOf("layoutsubordinados"),
    tipos: columnOf("tiposcolaborador"),
  };

  const now = new Date().toISOString();
  const positions: OrganizationPosition[] = [];
  const usedLegacyIds = new Set<number>();
  let totalRows = 0;
  let duplicateIds = 0;
  let orphanSuperior = 0;
  const pendingSuperior = new Map<string, number>();
  const typeIdByName = new Map<string, string>();
  for (const type of collaboratorTypes) {
    typeIdByName.set(type.name.trim().toLocaleLowerCase("pt-BR"), type.id);
  }
  const typeNamesByPositionId = new Map<string, string[]>();
  const unknownTypeNames = new Set<string>();

  for (let rowIndex = headerIndex + 1; rowIndex < aoa.length; rowIndex += 1) {
    const row = aoa[rowIndex];
    if (!Array.isArray(row)) continue;
    const isEmpty = row.every((cell) => asText(cell) === "");
    if (isEmpty) continue;
    totalRows += 1;

    const legacyId = resolveSuperiorValue(row[col.id], worksheet);
    if (legacyId === null) continue; // linha sem ID válido
    if (usedLegacyIds.has(legacyId)) {
      duplicateIds += 1;
      continue;
    }
    usedLegacyIds.add(legacyId);

    const personName = asText(row[col.nome]);
    const positionTitle = asText(row[col.cargo]);
    const area = col.area >= 0 ? asText(row[col.area]) : "";
    const isVacant = !personName || VACANT_PATTERN.test(personName);
    const status: PositionStatus = isVacant ? "vacant" : "occupied";

    const id = `pos-${legacyId}`;
    const superiorLegacy = col.superior >= 0 ? resolveSuperiorValue(row[col.superior], worksheet) : null;
    if (superiorLegacy !== null) pendingSuperior.set(id, superiorLegacy);

    const positionColor = col.cor >= 0 ? (normalizeHexColor(asText(row[col.cor])) ?? "") : "";
    const childrenLayout = col.layout >= 0 ? mapLayout(row[col.layout]) : "automatic";
    const typeIds: string[] = [];
    if (col.tipos >= 0 && !isVacant) {
      const unknownForRow: string[] = [];
      for (const name of splitTypeNames(row[col.tipos])) {
        const typeId = typeIdByName.get(name.toLocaleLowerCase("pt-BR"));
        if (typeId) {
          if (!typeIds.includes(typeId)) typeIds.push(typeId);
        } else {
          unknownTypeNames.add(name);
          unknownForRow.push(name);
        }
      }
      if (unknownForRow.length > 0) typeNamesByPositionId.set(id, unknownForRow);
    }

    positions.push({
      id,
      legacyId,
      personName: isVacant ? "" : personName,
      positionTitle,
      superiorId: null, // resolvido abaixo
      connectionType: col.tipo >= 0 ? mapConnection(row[col.tipo]) : "undefined",
      area,
      tooltip: col.tooltip >= 0 ? asText(row[col.tooltip]) : "",
      notes: col.obs >= 0 ? asText(row[col.obs]) : "",
      status,
      positionColor,
      childrenLayout,
      collaboratorTypeIds: typeIds,
      displayOrder: legacyId,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Resolve superiorId somente quando o ID existe na base importada.
  const idByLegacy = new Map(positions.map((p) => [p.legacyId, p.id]));
  let missingSuperior = 0;
  let missingRequired = 0;
  for (const position of positions) {
    const superiorLegacy = pendingSuperior.get(position.id);
    if (superiorLegacy === undefined) {
      missingSuperior += 1;
      continue;
    }
    const resolved = idByLegacy.get(superiorLegacy);
    if (resolved && resolved !== position.id) {
      position.superiorId = resolved;
    } else {
      if (!resolved) orphanSuperior += 1;
      position.superiorId = null;
      missingSuperior += 1;
    }
    if (!position.positionTitle || !position.area) missingRequired += 1;
  }
  // missingRequired precisa contar também registros sem superior já contados acima
  missingRequired = positions.filter((p) => !p.positionTitle || !p.area).length;

  const { orphans } = categorizePositions(positions);

  const report: ImportReport = {
    sheetName,
    totalRows,
    validRows: positions.length,
    missingSuperior,
    duplicateIds,
    missingRequired,
    orphanSuperior,
    cycleCount: orphans.length,
  };

  return { fileName: file.name, sheetName, positions, report };
}

/* Exportação */

const EXPORT_HEADERS = ["ID", "Nome", "Cargo", "SuperiorID", "TipoLigação", "Tooltip", "Área", "Obs"];

function toExportRows(positions: OrganizationPosition[]): unknown[][] {
  const legacyById = new Map(positions.map((p) => [p.id, p.legacyId]));
  return positions.map((p) => [
    p.legacyId,
    p.status === "vacant" ? "EM ABERTO" : p.personName,
    p.positionTitle,
    p.superiorId ? (legacyById.get(p.superiorId) ?? "") : "",
    p.connectionType === "direct" ? "DIRETA" : p.connectionType === "functional" ? "FUNCIONAL" : "",
    p.tooltip,
    p.area,
    p.notes,
  ]);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

export function exportToExcel(positions: OrganizationPosition[]): void {
  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...toExportRows(positions)]);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 34 },
    { wch: 11 },
    { wch: 12 },
    { wch: 28 },
    { wch: 24 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BASE (2)");
  XLSX.writeFile(workbook, `organograma-paysandu-${todayStamp()}.xlsx`);
}

export function exportToCsv(positions: OrganizationPosition[]): void {
  const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...toExportRows(positions)]);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadTextFile(`organograma-paysandu-${todayStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

export function exportToJson(positions: OrganizationPosition[]): void {
  const payload = JSON.stringify(
    { createdAt: new Date().toISOString(), positions },
    null,
    2,
  );
  downloadTextFile(
    `organograma-paysandu-backup-${todayStamp()}.json`,
    payload,
    "application/json;charset=utf-8",
  );
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
