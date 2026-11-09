import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link, MessageStrip } from "@ui5/webcomponents-react";
import { CatalogActionButton } from "@/shared/components/CatalogActionButton";
import { CatalogRelationTable, type CatalogRelationColumn } from "@/shared/components/CatalogRelationTable";
import { CatalogRelationToolbar, type CatalogRelationFilter } from "@/shared/components/CatalogRelationToolbar";
import { CatalogRelationStatus } from "@/shared/components/CatalogRelationStatus";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import { formatPersianDate } from "@/shared/utils/date.utils";

type LifecycleOperation = "ACTIVATE" | "INACTIVATE" | "DELETE";

export interface CatalogRelationLifecycleDraft {
  targetId: string;
  relationId: string;
  version: number;
  operation: LifecycleOperation;
}

type LifecycleStatus = "ACTIVE" | "INACTIVE" | "DELETED";
const lifecycleStatus = { ACTIVATE: "ACTIVE", INACTIVATE: "INACTIVE", DELETE: "DELETED" } as const;
const lifecycleDraft = { ACTIVATE: "active", INACTIVATE: "inactive", DELETE: "delete" } as const;

export interface CatalogRelationDraftOption {
  id: string;
  code: string;
  title: string;
  status: LifecycleStatus;
  version: number;
  parentId?: string | null;
}

export interface CatalogRelationDraftRow {
  id: string;
  code: string;
  title: string;
  status: LifecycleStatus;
  targetStatus?: LifecycleStatus;
  validFrom: string | null;
  validTo: string | null;
  relationId: string;
  version: number;
}

type DisplayRow = Omit<CatalogRelationDraftRow, "relationId" | "version"> & {
  draft?: "new" | "active" | "inactive" | "delete";
};

interface ClassificationSource {
  titleKey: string;
  pickerTitleKey: string;
  inactiveKey: string;
  loadRows: (ownerId: string, signal: AbortSignal) => Promise<CatalogRelationDraftRow[]>;
  loadOptions: (signal: AbortSignal) => Promise<{
    options: CatalogRelationDraftOption[];
    groups: HierarchySelectionNode[];
  }>;
  errorMessage: (error: unknown, t: TFunction) => string;
}

export interface CatalogRelationDraftTabProps {
  source: ClassificationSource;
  ownerId: string | null;
  canonicalRows?: CatalogRelationDraftRow[];
  busy: boolean;
  editable: boolean;
  active: boolean;
  drafts: CatalogRelationDraftOption[];
  onDraftsChange: (drafts: CatalogRelationDraftOption[]) => void;
  lifecycleChanges: CatalogRelationLifecycleDraft[];
  onLifecycleChangesChange: (changes: CatalogRelationLifecycleDraft[]) => void;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
}

function ClassificationPicker({ source, ownerId, active, drafts, pendingDeleteIds, busy, onClose, onConfirm }: {
  source: ClassificationSource;
  ownerId: string | null;
  active: boolean;
  drafts: CatalogRelationDraftOption[];
  pendingDeleteIds: Set<string>;
  busy: boolean;
  onClose: () => void;
  onConfirm: (options: CatalogRelationDraftOption[], assigned: CatalogRelationDraftRow[]) => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<{
    options: CatalogRelationDraftOption[];
    groups: HierarchySelectionNode[];
    assigned: CatalogRelationDraftRow[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void Promise.all([
      source.loadOptions(signal),
      ownerId ? source.loadRows(ownerId, signal) : Promise.resolve([]),
    ])
      .then(([options, assigned]) => {
        if (!signal.aborted) { setData({ ...options, assigned }); setError(null); }
      })
      .catch(cause => { if (!signal.aborted) setError(source.errorMessage(cause, t)); });
    return () => controller.abort();
  }, [ownerId, source, t]);

  const assignedIds = new Set(data?.assigned.map(row => row.id));
  const selectedIds = useMemo(() => new Set(drafts.map(item => item.id)), [drafts]);
  const eligible = (data?.options ?? []).filter(item => {
    if (assignedIds.has(item.id)) return pendingDeleteIds.has(item.id);
    return item.status === "ACTIVE" && (active || selectedIds.has(item.id));
  });
  const nodes: HierarchySelectionNode[] = [
    ...(data?.groups ?? []),
    ...eligible.map(item => ({
      id: item.id, parentId: item.parentId ?? null, code: item.code, name: item.title, selectable: true,
    })),
  ];
  return <HierarchyMultiSelectionDialog open title={t(source.pickerTitleKey)}
    searchAccessibleName={t("catalogRelation.search")} nodes={nodes} selectedIds={selectedIds}
    busy={busy} loading={!data && !error} error={error} confirmText={t("catalogRelation.select")}
    cancelText={t("common.cancel")} onClose={onClose}
    onConfirm={ids => { if (data) onConfirm(eligible.filter(item => ids.has(item.id)), data.assigned); }} />;
}

export default function CatalogRelationDraftTab({ source, ownerId, canonicalRows, busy, editable, active,
  drafts, onDraftsChange, lifecycleChanges, onLifecycleChangesChange, pickerOpen, onPickerOpenChange }: CatalogRelationDraftTabProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CatalogRelationDraftRow[]>(canonicalRows ?? []);
  const [loading, setLoading] = useState(Boolean(ownerId && !canonicalRows));
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CatalogRelationFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    const { signal } = controller;
    void source.loadRows(ownerId, signal)
      .then(next => { if (!signal.aborted) { setRows(next); setError(null); } })
      .catch(cause => { if (!signal.aborted) setError(source.errorMessage(cause, t)); })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ownerId, retry, source, t]);
  const changesById = new Map(lifecycleChanges.map(change => [change.targetId, change]));
  const pendingDeleteIds = new Set(lifecycleChanges.filter(change => change.operation === "DELETE").map(change => change.targetId));
  const currentStatus = (row: CatalogRelationDraftRow) => {
    const change = changesById.get(row.id);
    return change ? lifecycleStatus[change.operation] : row.status;
  };
  const affected = (operation: LifecycleOperation) => rows.filter(row => {
    const status = currentStatus(row);
    return selected.has(row.id) && status !== "DELETED" && status !== lifecycleStatus[operation]
      && (operation !== "ACTIVATE" || row.status === "ACTIVE"
        || (active && (row.targetStatus === undefined || row.targetStatus === "ACTIVE")));
  });
  const stageLifecycle = (operation: LifecycleOperation) => {
    const next = new Map(changesById);
    for (const row of affected(operation)) {
      if (row.status === lifecycleStatus[operation]) next.delete(row.id);
      else next.set(row.id, { targetId: row.id, relationId: row.relationId, version: row.version, operation });
    }
    if (operation === "DELETE") {
      onDraftsChange(drafts.filter(item => !selected.has(item.id)));
      setSelected(new Set());
    }
    onLifecycleChangesChange([...next.values()]);
  };
  const pendingRows: DisplayRow[] = drafts.map(item => ({
    id: item.id, code: item.code, title: item.title,
    status: "ACTIVE", validFrom: null, validTo: null, draft: "new",
  }));
  const persistedRows: DisplayRow[] = rows.filter(row => row.status !== "DELETED").map(row => {
    const change = changesById.get(row.id);
    return { ...row, status: currentStatus(row), draft: change ? lifecycleDraft[change.operation] : undefined };
  });
  const needle = search.trim().toLocaleLowerCase();
  const visible = [...pendingRows, ...persistedRows].filter(row => (row.draft || filter === "ALL" || row.status === filter)
    && `${row.code} ${row.title}`.toLocaleLowerCase().includes(needle));
  const columns: CatalogRelationColumn<DisplayRow>[] = [
    { key: "code", header: t("catalogRelation.code"), cell: row => row.code },
    { key: "name", header: t("catalogRelation.name"), cell: row => row.title },
    { key: "status", header: t("catalogRelation.status"), cell: row => <CatalogRelationStatus status={row.status} draft={row.draft} /> },
    { key: "validFrom", header: t("catalogRelation.validFrom"), cell: row => formatPersianDate(row.validFrom) },
    { key: "validTo", header: t("catalogRelation.validTo"), cell: row => formatPersianDate(row.validTo) },
  ];
  const title = t(source.titleKey);
  return <section>
    <CatalogRelationToolbar title={title} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter}
      editable={editable} busy={busy || loading} selectionAction={editable ? <CatalogActionButton design="Emphasized"
        disabled={busy || loading || Boolean(error) || (!active && !drafts.length && !pendingDeleteIds.size)}
        onClick={() => onPickerOpenChange(true)}>{t("catalogRelation.select")}</CatalogActionButton> : null}
      canActivate={!error && affected("ACTIVATE").length > 0} onActivate={() => stageLifecycle("ACTIVATE")}
      canInactivate={!error && affected("INACTIVATE").length > 0} onInactivate={() => stageLifecycle("INACTIVATE")}
      canDelete={!error && (affected("DELETE").length > 0 || drafts.some(item => selected.has(item.id)))}
      onDelete={() => stageLifecycle("DELETE")} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}{" "}
      <Link onClick={() => { setError(null); setLoading(true); setRetry(value => value + 1); }}>{t("catalogRelation.retry")}</Link>
    </MessageStrip> : null}
    {!active && (drafts.length > 0 || lifecycleChanges.some(change => change.operation === "ACTIVATE")) ? <MessageStrip design="Negative" hideCloseButton>
      {t(source.inactiveKey)}
    </MessageStrip> : null}
    <CatalogRelationTable rows={visible} columns={columns} rowKey={row => row.id}
      accessibleName={title} loading={loading} busy={busy} emptyText={t("catalogRelation.empty")}
      selectable={editable} selectedKeys={selected} onSelectionChange={setSelected} />
    {pickerOpen && editable ? <ClassificationPicker source={source} ownerId={ownerId} active={active} drafts={drafts} busy={busy}
      pendingDeleteIds={pendingDeleteIds}
      onClose={() => onPickerOpenChange(false)}
      onConfirm={(options, assigned) => {
        const assignedIds = new Set(assigned.map(row => row.id));
        const reselected = new Set(options.map(item => item.id));
        setRows(assigned);
        onDraftsChange(options.filter(item => !assignedIds.has(item.id)));
        onLifecycleChangesChange(lifecycleChanges.filter(change => !reselected.has(change.targetId)));
        onPickerOpenChange(false);
      }} /> : null}
  </section>;
}
