import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProcessNode } from "@/features/process/domain/process.model";
import { createProcessRepo } from "@/features/process/infra/process.factory";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { HierarchyMultiSelectionDialog } from "@/shared/components/HierarchyMultiSelectionDialog";
import { controlObjectiveScopeErrorMessage } from "../utils/controlObjectiveScopeError";

const processes = createProcessRepo();

export function InitialControlObjectiveSubprocessesTab({ drafts, editable, busy, pickerOpen, onDraftsChange, onPickerOpenChange }: {
  drafts: ProcessNode[];
  editable: boolean;
  busy: boolean;
  pickerOpen: boolean;
  onDraftsChange: (rows: ProcessNode[]) => void;
  onPickerOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ProcessNode[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [selected, setSelected] = useState(new Set<string>());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const selectedIds = useMemo(() => new Set(drafts.map(row => row.id)), [drafts]);

  useEffect(() => {
    if (!pickerOpen || !editable) return;
    const controller = new AbortController();
    const { signal } = controller;
    void processes.list(signal)
      .then(rows => { if (!signal.aborted) setOptions(rows); })
      .catch(cause => {
        if (!signal.aborted && !(cause instanceof Error && cause.name === "AbortError")) {
          setPickerError(controlObjectiveScopeErrorMessage(cause, t));
        }
      })
      .finally(() => { if (!signal.aborted) setPickerLoading(false); });
    return () => controller.abort();
  }, [editable, pickerOpen, t]);

  const eligible = options.filter(row => row.nodeType === "SUBPROCESS" && row.status === "ACTIVE");
  const nodes = [...options.filter(row => row.nodeType === "PROCESS"), ...eligible].map(row => ({
    id: row.id, parentId: row.parentId, code: row.code, name: row.title, selectable: row.nodeType === "SUBPROCESS",
  }));
  const needle = search.trim().toLocaleLowerCase();
  const visible = drafts.filter(row => (filter === "ALL" || row.status === filter)
    && `${row.code} ${row.title}`.toLocaleLowerCase().includes(needle));
  const columns: CatalogRelationColumn<ProcessNode>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.code },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.title },
    { key: "status", header: t("catalogRelation.status"), cell: () => <CatalogRelationStatus status="ACTIVE" draft="new" /> },
  ];
  const title = t("controlObjective.tabs.subprocesses");

  return <section>
    <CatalogRelationToolbar title={title} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} busy={busy}
      selectionAction={editable ? <>
        <CatalogActionButton design="Emphasized" disabled={busy} onClick={() => {
          setPickerError(null);
          setPickerLoading(true);
          onPickerOpenChange(true);
        }}>{t("catalogRelation.select")}</CatalogActionButton>
        <CatalogActionButton design="Negative" disabled={busy || !selected.size} onClick={() => {
          onDraftsChange(drafts.filter(row => !selected.has(row.id)));
          setSelected(new Set());
        }}>{t("catalogRelation.delete")}</CatalogActionButton>
      </> : null} />
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.id} accessibleName={title}
      selectable={editable} selectedKeys={selected} onSelectionChange={setSelected} busy={busy}
      emptyText={t("catalogRelation.empty")} />
    {pickerOpen && editable ? <HierarchyMultiSelectionDialog open title={t("controlObjective.subprocessSelection")}
      searchAccessibleName={t("catalogRelation.search")} nodes={nodes}
      selectedIds={selectedIds} busy={busy} loading={pickerLoading} error={pickerError}
      confirmText={t("catalogRelation.select")} cancelText={t("common.cancel")}
      onConfirm={ids => {
        onDraftsChange(eligible.filter(row => ids.has(row.id)));
        setSelected(new Set());
        onPickerOpenChange(false);
      }} onClose={() => onPickerOpenChange(false)} /> : null}
  </section>;
}
