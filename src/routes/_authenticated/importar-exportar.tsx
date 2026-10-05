import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, FileText, RotateCcw, Upload, DatabaseBackup } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageError } from "@/components/PageError";
import { PageSkeleton } from "@/components/PageStates";
import { useOrganization } from "@/components/organization/OrganizationProvider";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  exportToCsv,
  exportToExcel,
  exportToJson,
  parseOrganizationFile,
  type ParsedImport,
} from "@/lib/importParser";
import { formatDateTime, normalizeTypeName, safePositions } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/importar-exportar")({
  head: () => ({
    meta: [
      { title: "Importar e exportar — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Importação e exportação da base do organograma institucional do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Importar e exportar — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Importação e exportação da base do organograma institucional do Paysandu Sport Club.",
      },
    ],
  }),
  component: ImportExportPage,
  errorComponent: PageError,
});

function ImportExportPage() {
  const {
    positions,
    collaboratorTypes,
    isLoading,
    replacePositions,
    backupCreatedAt,
    restoreBackup,
    resetToInitialData,
    ensureTypesByName,
  } = useOrganization();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [createMissingTypes, setCreateMissingTypes] = useState(true);

  const list = safePositions(positions);

  async function handleFile(file: File) {
    setIsParsing(true);
    setParsed(null);
    try {
      const result = await parseOrganizationFile(file, collaboratorTypes);
      setParsed(result);
      setCreateMissingTypes(true);
      if (result.positions.length === 0) {
        toast.error("Nenhum registro válido encontrado no arquivo.");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível ler o arquivo. Verifique o formato e tente novamente.",
      );
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function confirmImport() {
    if (!parsed) return;
    // Relaciona tipos existentes pelo nome; cria os inexistentes somente após confirmação.
    const allNames = Array.from(new Set(Array.from(parsed.typeNamesByPositionId.values()).flat()));
    const nameToId = ensureTypesByName(allNames, createMissingTypes);
    const nextPositions = parsed.positions.map((position) => {
      const names = parsed.typeNamesByPositionId.get(position.id);
      if (!names || names.length === 0) return position;
      const extraIds = names
        .map((name) => nameToId[normalizeTypeName(name)])
        .filter((id): id is string => Boolean(id));
      if (extraIds.length === 0) return position;
      return {
        ...position,
        collaboratorTypeIds: Array.from(
          new Set([...(position.collaboratorTypeIds ?? []), ...extraIds]),
        ),
      };
    });
    replacePositions(
      nextPositions,
      `Importação do arquivo "${parsed.fileName}" (aba ${parsed.sheetName}, ${parsed.report.validRows} registros).`,
    );
    setParsed(null);
  }

  if (isLoading) return <PageSkeleton />;

  const reportItems = parsed
    ? [
        { label: "Registros encontrados", value: parsed.report.totalRows },
        { label: "Registros válidos", value: parsed.report.validRows },
        { label: "Sem superior definido", value: parsed.report.missingSuperior },
        { label: "IDs duplicados", value: parsed.report.duplicateIds },
        { label: "Campos obrigatórios vazios", value: parsed.report.missingRequired },
        { label: "Superior inexistente", value: parsed.report.orphanSuperior },
        { label: "Ciclos hierárquicos", value: parsed.report.cycleCount },
        { label: "Tipos sem cadastro", value: parsed.report.unknownTypes },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Importar e exportar dados
        </h2>
        <p className="text-sm text-muted-foreground">
          Base atual com {list.length} registro(s). A importação substitui a base após validação e
          cria um backup automático.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-primary" />
              Importação
            </CardTitle>
            <CardDescription>
              Arquivos .xlsx, .xls ou .csv. A aba “BASE (2)” é usada como padrão quando existir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isParsing ? "Lendo arquivo…" : "Selecionar arquivo"}
            </Button>

            {parsed ? (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {parsed.fileName}{" "}
                    <span className="font-normal text-muted-foreground">
                      (aba “{parsed.sheetName}”)
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Revise a validação antes de substituir a base atual.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {reportItems.map((item) => (
                    <div key={item.label} className="rounded-md border bg-card px-3 py-2">
                      <p className="text-lg font-bold tabular-nums text-foreground">{item.value}</p>
                      <p className="text-[11px] leading-tight text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                {parsed.unknownTypeNames.length > 0 ? (
                  <label className="flex cursor-pointer items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-foreground">
                    <Checkbox
                      checked={createMissingTypes}
                      onCheckedChange={(checked) => setCreateMissingTypes(checked === true)}
                      aria-label="Criar tipos inexistentes"
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">
                        Tipos sem cadastro: {parsed.unknownTypeNames.join(", ")}.
                      </span>{" "}
                      Marque para criar automaticamente na importação; desmarque para importar sem
                      essas associações.
                    </span>
                  </label>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={confirmImport} disabled={parsed.positions.length === 0}>
                    Substituir a base
                  </Button>
                  <Button variant="outline" onClick={() => setParsed(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4 text-primary" />
                Exportação
              </CardTitle>
              <CardDescription>Baixe a base atual nos formatos disponíveis.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => exportToExcel(list, collaboratorTypes)}
                disabled={list.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToCsv(list, collaboratorTypes)}
                disabled={list.length === 0}
              >
                <FileText className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={() => exportToJson(list)} disabled={list.length === 0}>
                <DatabaseBackup className="h-4 w-4" />
                Backup JSON
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCcw className="h-4 w-4 text-primary" />
                Backup e restauração
              </CardTitle>
              <CardDescription>
                {backupCreatedAt
                  ? `Backup automático criado em ${formatDateTime(backupCreatedAt)}.`
                  : "Nenhum backup automático disponível. Um backup é criado antes de cada importação."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!backupCreatedAt}
                onClick={() => setConfirmRestore(true)}
              >
                Restaurar backup automático
              </Button>
              <Button variant="outline" onClick={() => setConfirmReset(true)}>
                Redefinir dados originais
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
            <AlertDialogDescription>
              A base atual será substituída pelo backup automático criado em{" "}
              {formatDateTime(backupCreatedAt)}. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreBackup()}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir dados originais</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as alterações locais e o histórico serão removidos, e a base voltará aos dados
              originais da planilha. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetToInitialData()}>Redefinir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
