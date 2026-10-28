import { CatalogSelectionProvider } from "@/shared/components/CatalogSelection";
import { CatalogTreeOrder, CatalogOrderedTreeItem as TreeItemCustom } from "@/shared/components/CatalogTreeOrder";
import { orderKey } from "@/shared/components/catalogOrder.context";
import { CatalogSelectableRow, CatalogDeleteButton } from "@/shared/components/CatalogSelection";
import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter, DialogFooterBar } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import {
  Bar, BusyIndicator, Dialog, FlexBox, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Tab,
  Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Text, TextArea, Title, Tree,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";
import {
  DocumentManager, EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE, toDocumentAggregateRequest,
  type ParentSaveDocumentDraftState,
} from "@/features/document";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { HierarchyMultiSelectionDialog, type HierarchySelectionNode } from "@/shared/components/HierarchyMultiSelectionDialog";
import { MasterDataFormField } from "@/shared/components/MasterDataObjectHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { Objective, ObjectiveCreate, ObjectiveKind, ObjectiveOrganizationLink, ObjectiveOrganizationOption, ObjectiveUpdate } from "../domain/objective.model";
import ObjectiveCreateMenu from "../components/ObjectiveCreateMenu";
import { objectiveApi } from "../infra/objective.api.repo";
import { useObjectiveState } from "../state/objective.state";
import "./objective.css";

type Form = {
  kind: ObjectiveKind;
  code: string; name: string; description: string; objectiveType: string;
  parentObjectiveId: string; validFrom: string; validTo: string;
};
type TreeNode = Objective & { children: TreeNode[] };
type TreeEvent = { detail?: { item?: HTMLElement & { dataset?: { objectiveId?: string } } }; preventDefault?: () => void };

const emptyForm: Form = {
  kind: "OBJECTIVE",
  code: "", name: "", description: "", objectiveType: "", parentObjectiveId: "",
  validFrom: "", validTo: "",
};

function toForm(value: Objective | null): Form {
  return value ? {
    kind: value.kind,
    code: value.code, name: value.name, description: value.description ?? "",
    objectiveType: value.objectiveType ?? "", parentObjectiveId: value.parentObjectiveId ?? "",
    validFrom: value.validFrom ?? "", validTo: value.validTo ?? "",
  } : { ...emptyForm };
}

function normalizeStrategyForm(value: Form): Form {
  return value.kind === "STRATEGY" ? { ...value, objectiveType: "", parentObjectiveId: "",
    validFrom: "", validTo: "" } : value;
}

function buildTree(items: Objective[]): TreeNode[] {
  const nodes = new Map(items.map((item) => [item.id, { ...item, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentObjectiveId ? nodes.get(node.parentObjectiveId) : null;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (itemsToSort: TreeNode[]) => {
    itemsToSort.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    itemsToSort.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

function descendantIds(items: Objective[], currentId: string): Set<string> {
  const ids = new Set<string>();
  const visit = (id: string) => items.filter((item) => item.parentObjectiveId === id).forEach((item) => {
    if (!ids.has(item.id)) { ids.add(item.id); visit(item.id); }
  });
  visit(currentId);
  return ids;
}

function ObjectiveTreeItem({ node, selectedId, expandedIds }: {
  node: TreeNode; selectedId: string | null; expandedIds: Set<string>;
}) {
  const { t } = useTranslation();
  return <TreeItemCustom orderType="OBJECTIVE" orderId={node.id}
    data-objective-id={node.id} selected={node.id === selectedId}
    expanded={expandedIds.has(node.id)}
    content={<CatalogSelectableRow itemKey={node.id}><FlexBox alignItems="Center" justifyContent="SpaceBetween" className="objectiveTreeLabel" title={node.name}>
      <Text className="objectiveTreeTitle" maxLines={1}>{node.name}</Text>
      <Text className="objectiveTreeType" maxLines={1}>{t(`objective.kind.${node.kind}`)}</Text>
    </FlexBox></CatalogSelectableRow>}
  >
    {node.children.map((child) => <ObjectiveTreeItem key={child.id} node={child}
      selectedId={selectedId} expandedIds={expandedIds} />)}
  </TreeItemCustom>;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function ObjectiveManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { manage } = useMasterDataAccess("REFERENCE");
  const items = useObjectiveState((state) => state.items);
  const loading = useObjectiveState((state) => state.loading);
  const load = useObjectiveState((state) => state.load);
  const create = useObjectiveState((state) => state.create);
  const update = useObjectiveState((state) => state.update);
  const remove = useObjectiveState((state) => state.remove);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterCollapsedIds, setFilterCollapsedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"create" | "view" | "edit" | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "organizations" | "documents">("general");
  const [organizations, setOrganizations] = useState<ObjectiveOrganizationLink[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<ObjectiveOrganizationOption[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<Set<string>>(new Set());
  const [organizationPickerOpen, setOrganizationPickerOpen] = useState(false);
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [organizationStatusFilter, setOrganizationStatusFilter] = useState("ALL");
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationLoadFailed, setOrganizationLoadFailed] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [baseline, setBaseline] = useState("");
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [draftGeneration, setDraftGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Objective | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<Record<"validFrom" | "validTo", PersianDateDraftState>>({
    validFrom: { draftValue: "", valid: true, dirty: false },
    validTo: { draftValue: "", valid: true, dirty: false },
  });
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const isStrategy = form.kind === "STRATEGY";
  const displayedKind = mode ? form.kind : selected?.kind;
  const strategies = useMemo(() => items.filter((item) => item.kind === "STRATEGY"), [items]);
  const rootStrategies = useMemo(() => strategies.filter((item) => !item.parentObjectiveId), [strategies]);
  const creationStrategy = selected?.kind === "STRATEGY" && !selected.parentObjectiveId ? selected : null;
  const strategyLabels = useMemo(() => new Map(strategies.map((strategy) => {
    const parts = [strategy.name];
    const visited = new Set([strategy.id]);
    let parentId = strategy.parentObjectiveId;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = strategies.find((item) => item.id === parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      parentId = parent.parentObjectiveId;
    }
    return [strategy.id, parts.join(" / ")];
  })), [strategies]);
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");
    if (!query) return items;
    const matches = items.filter((item) => `${item.code} ${item.name}`.toLocaleLowerCase("fa").includes(query));
    const included = new Set(matches.map((item) => item.id));
    for (const match of matches) {
      let parentId = match.parentObjectiveId;
      while (parentId && !included.has(parentId)) {
        included.add(parentId);
        parentId = items.find((item) => item.id === parentId)?.parentObjectiveId ?? null;
      }
    }
    return items.filter((item) => included.has(item.id));
  }, [items, search]);
  const tree = useMemo(() => buildTree(visibleItems), [visibleItems]);
  const visibleExpandedIds = useMemo(() => search.trim()
    ? new Set([...expandedIds, ...visibleItems.filter((item) => item.kind === "STRATEGY").map((item) => item.id)]
      .filter((id) => !filterCollapsedIds.has(id)))
    : expandedIds, [expandedIds, filterCollapsedIds, search, visibleItems]);
  const blockedParents = useMemo(() => selected && mode === "edit"
    ? descendantIds(items, selected.id) : new Set<string>(), [items, mode, selected]);
  const invalidDateDraft = !isStrategy && (!dateDrafts.validFrom.valid || !dateDrafts.validTo.valid);
  const chosenStrategy = rootStrategies.find((item) => item.id === form.parentObjectiveId);
  const structureError = form.kind === "OBJECTIVE" && !chosenStrategy
    ? "objective.errors.strategyRequired"
    : form.parentObjectiveId && (!chosenStrategy || (mode === "edit"
      && (form.parentObjectiveId === selectedId || blockedParents.has(form.parentObjectiveId))))
      ? "objective.errors.parent"
      : form.kind === "OBJECTIVE" && mode === "edit"
        && items.some((item) => item.parentObjectiveId === selectedId)
        ? "objective.errors.hasChildren"
        : isStrategy && mode === "edit" && items.some((item) => item.kind === "STRATEGY"
          && item.parentObjectiveId === selectedId) ? "objective.errors.strategyChildren" : null;
  const organizationDraftDirty = !isStrategy && [...selectedOrganizationIds].sort().join("|")
    !== organizations.map((link) => link.organizationId).sort().join("|");
  const dirty = (mode === "create" || mode === "edit")
    && (JSON.stringify(form) !== baseline || documents.dirty || invalidDateDraft || organizationDraftDirty);
  const { blocker } = useUnsavedChangesGuard(dirty);

  useEffect(() => { void load().catch((cause: unknown) => setError(errorText(cause))); }, [load]);
  useEffect(() => {
    if (displayedKind === "STRATEGY") return;
    if (mode === "create") {
      let current = true;
      void objectiveApi.organizationOptions().then((options) => {
        if (current) { setOrganizationOptions(options); setOrganizationLoadFailed(false); }
      }).catch((cause: unknown) => {
        if (current) { setError(errorText(cause)); setOrganizationLoadFailed(true); }
      })
        .finally(() => { if (current) setOrganizationsLoading(false); });
      return () => { current = false; };
    }
    if (!selectedId) return;
    let current = true;
    void Promise.all([objectiveApi.organizations(selectedId), mode
      ? objectiveApi.organizationOptions() : Promise.resolve([] as ObjectiveOrganizationOption[])])
      .then(([links, options]) => {
      if (current) {
        setOrganizations(links);
        setOrganizationLoadFailed(false);
        if (mode) { setOrganizationOptions(options); setSelectedOrganizationIds(new Set(links.map((link) => link.organizationId))); }
      }
    }).catch((cause: unknown) => {
      if (current) { setError(errorText(cause)); setOrganizationLoadFailed(true); }
    })
      .finally(() => { if (current) setOrganizationsLoading(false); });
    return () => { current = false; };
  }, [selectedId, mode, displayedKind]);

  const begin = (nextMode: "create" | "view" | "edit", preserveTab = false,
    kind: ObjectiveKind = "OBJECTIVE") => {
    if (nextMode === "create" && kind === "OBJECTIVE" && !creationStrategy) {
      setError(t("objective.createSelectStrategy"));
      return;
    }
    setOrganizationLoadFailed(false);
    if (!preserveTab) { setOrganizationSearch(""); setOrganizationStatusFilter("ALL"); }
    if (nextMode === "create") { setOrganizations([]); setSelectedOrganizationIds(new Set()); }
    const initial = nextMode === "create"
      ? { ...emptyForm, kind, parentObjectiveId: kind === "OBJECTIVE" ? creationStrategy!.id : "" }
      : toForm(selected);
    const next = normalizeStrategyForm(initial);
    setOrganizationsLoading(next.kind === "OBJECTIVE");
    if (next.kind === "STRATEGY") { setOrganizations([]); setSelectedOrganizationIds(new Set()); }
    setForm(next);
    setBaseline(JSON.stringify(initial));
    setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    setDraftGeneration((value) => value + 1);
    setDateDrafts({
      validFrom: { draftValue: "", valid: true, dirty: false },
      validTo: { draftValue: "", valid: true, dirty: false },
    });
    setError(null);
    if (!preserveTab || (next.kind === "STRATEGY" && activeTab === "organizations")) setActiveTab("general");
    setMode(nextMode);
  };

  const close = () => {
    if (dirty) setLeaveOpen(true);
    else setMode(null);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !documents.ready || documents.invalid || documents.uploading) {
      setError(t("objective.errors.required"));
      return;
    }
    if (invalidDateDraft || (form.validFrom && form.validTo && form.validFrom > form.validTo)) {
      setError(t("objective.errors.dates"));
      return;
    }
    if (structureError) {
      setError(t(structureError));
      return;
    }
    const common = {
      kind: form.kind,
      name: form.name.trim(), description: form.description.trim() || null,
      objectiveType: isStrategy ? null : form.objectiveType.trim() || null,
      parentObjectiveId: isStrategy ? null : form.parentObjectiveId || null,
      validFrom: isStrategy ? null : form.validFrom || null,
      validTo: isStrategy ? null : form.validTo || null,
      organizationIds: isStrategy ? undefined : [...selectedOrganizationIds],
      documents: toDocumentAggregateRequest(documents),
    };
    setBusy(true);
    try {
      if (mode === "create") {
        const id = await create({ ...common, code: form.code.trim() } satisfies ObjectiveCreate);
        setSelectedId(id);
        if (common.parentObjectiveId) setExpandedIds((previous) => new Set(previous).add(common.parentObjectiveId!));
      } else if (selected) {
        await update(selected.id, { ...common, version: selected.version } satisfies ObjectiveUpdate);
      }
      setDraftGeneration((value) => value + 1);
      setOrganizationsLoading(true);
      setMode("view");
      setError(null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setBusy(true);
    try {
      await remove(deleteCandidate.id, deleteCandidate.version);
      if (selectedId === deleteCandidate.id) setSelectedId(null);
      setDeleteCandidate(null);
      setError(null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const toggleOrganization = (id: string) => setSelectedOrganizationIds((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const onTreeSelect = (event: TreeEvent) => {
    const id = event.detail?.item?.dataset?.objectiveId;
    if (id && id !== selectedId) { setOrganizationsLoading(true); setOrganizations([]); setSelectedId(id); }
  };
  const onTreeToggle = (event: TreeEvent) => {
    event.preventDefault?.();
    const id = event.detail?.item?.dataset?.objectiveId;
    if (!id) return;
    const expanding = !visibleExpandedIds.has(id);
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (expanding) next.add(id);
      else next.delete(id);
      return next;
    });
    if (search.trim()) setFilterCollapsedIds((previous) => {
      const next = new Set(previous);
      if (expanding) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const organizationRows = [
    ...organizations.map((link) => ({
      id: link.organizationId, code: link.organizationCode, organizationName: link.organizationName,
      assignmentName: link.name, owner: link.owner,
      status: selectedOrganizationIds.has(link.organizationId) ? "FINAL" as const : "DRAFT_PENDING_DELETE" as const,
    })),
    ...[...selectedOrganizationIds].filter((id) => !organizations.some((link) => link.organizationId === id))
      .map((id) => {
        const option = organizationOptions.find((item) => item.id === id);
        return { id, code: option?.code ?? "", organizationName: option?.name ?? "",
          assignmentName: form.name, owner: null, status: "DRAFT_NEW" as const };
      }),
  ];
  const organizationQuery = organizationSearch.trim().toLocaleLowerCase("fa");
  const visibleOrganizationRows = organizationRows.filter((row) =>
    (organizationStatusFilter === "ALL" || row.status === organizationStatusFilter)
    && (!organizationQuery || `${row.code} ${row.organizationName} ${row.assignmentName} ${row.owner ?? ""}`
      .toLocaleLowerCase("fa").includes(organizationQuery)));
  const organizationNodes: HierarchySelectionNode[] = organizationOptions
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({ id: item.id, parentId: item.parentOrganizationId,
      code: item.code, name: item.name, selectable: true }));
  const dialogTitle = t(form.kind === "STRATEGY"
    ? mode === "create" ? "objective.strategy.create" : mode === "edit" ? "objective.strategy.edit" : "objective.strategy.view"
    : mode === "create" ? "objective.create" : mode === "edit" ? "objective.edit" : "objective.view");
  const readOnly = mode === "view";

  const listColumn = createElement("div", { slot: "startColumn", className: "objectiveFclColumn" },
    <div className="objectiveListReport">
      <Bar startContent={<Title level="H4">{t("objective.title")}</Title>}
        endContent={<>
          <HeaderSearch value={search} onChange={(value) => { setSearch(value); setFilterCollapsedIds(new Set()); }} accessibleName={t("objective.search")} />
          <ObjectiveCreateMenu disabled={!manage || busy} canCreateObjective={Boolean(creationStrategy)}
            onCreate={(kind) => begin("create", false, kind)} />

          <Button disabled={!selected || busy} onClick={() => begin("view")}>{t("common.view")}</Button>
          <CatalogDeleteButton design="Negative" disabled={!selected || !manage || busy}
            onClick={() => setDeleteCandidate(selected)}>{t("common.delete")}</CatalogDeleteButton>
        </>} />
      <div className="objectiveTreeFrame">
        {loading || busy ? <BusyIndicator active delay={0} /> : null}
        {!loading && !visibleItems.length ? <MessageStrip design="Information" hideCloseButton>
          {t("common.noData")}
        </MessageStrip> : <CatalogTreeOrder catalog="OBJECTIVE" refreshKey={JSON.stringify(items)} filtered={Boolean(search.trim())}>{(order) => <Tree inert={order.busy} onMove={order.onMove} onMoveOver={order.onMoveOver} onItemClick={onTreeSelect} onItemToggle={onTreeToggle}>
            {order.sortTree(tree, (node) => orderKey("OBJECTIVE", node.id)).map((node) => <ObjectiveTreeItem key={node.id} node={node}
              selectedId={selectedId} expandedIds={visibleExpandedIds} />)}
          </Tree>}</CatalogTreeOrder>}
      </div>
    </div>);
  const summaryColumn = selected ? createElement("div", { slot: "midColumn", className: "objectiveFclColumn" },
    <div className="objectiveSummary">
      <Bar startContent={<Title level="H4">{selected.name}</Title>} />
      <div className="objectiveSummaryDetails">
        <Label showColon>{t("objective.code")}</Label><Text>{selected.code}</Text>
        <Label showColon>{t("objective.name")}</Label><Text>{selected.name}</Text>
        {selected.kind === "OBJECTIVE" ? <>
        <Label showColon>{t("objective.kind.label")}</Label><Text>{t(`objective.kind.${selected.kind}`)}</Text>
        <Label showColon>{t("objective.type")}</Label><Text>{selected.objectiveType || "—"}</Text>
        <Label showColon>{t("objective.strategy.label")}</Label>
        <Text>{strategyLabels.get(selected.parentObjectiveId ?? "")
          || t("objective.strategy.missing")}</Text>
        </> : null}
        <Label showColon>{t("objective.description")}</Label><Text>{selected.description || "—"}</Text>
        {selected.kind === "OBJECTIVE" ? <>
        <Label showColon>{t("objective.tabs.organizations")}</Label>
        <Text>{organizationsLoading ? t("common.loading") : organizations.length
          ? organizations.map((link) => link.organizationName).join("، ") : "—"}</Text>
        <Label showColon>{t("objective.createdAt")}</Label><Text>{formatPersianDateTime(selected.createdAt)}</Text>
        </> : null}
      </div>
      <DialogFooterBar>
        <Button design="Emphasized" disabled={!manage || busy} onClick={() => begin("edit")}>{t("common.edit")}</Button>
        <Button design="Transparent" onClick={() => setSelectedId(null)}>{t("common.close")}</Button>
      </DialogFooterBar>
    </div>) : null;

  const bulkDeleteItems = items.map((row) => ({ key: row.id, parentKey: row.parentObjectiveId, label: `${row.code} — ${row.name}`,
      remove: () => remove(row.id, row.version, false) }));

  return <CatalogSelectionProvider items={bulkDeleteItems} enabled={manage} busy={busy || loading}
      onBusyChange={setBusy} reload={load} mapError={errorText}
      onDeleted={(keys) => {
        if (selectedId && keys.has(selectedId)) setSelectedId(null);
      }}><section className="objectivePage">
    <Link onClick={() => navigate("/master-data")}>{t("masterData.title")}</Link>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
    {createElement("ui5-flexible-column-layout", {
      layout: selected ? "TwoColumnsStartExpanded" : "OneColumn",
      dir: document.documentElement.dir === "ltr" ? "ltr" : "rtl",
      "disable-resizing": true, className: "objectiveFcl",
    }, listColumn, summaryColumn)}
    <Dialog open={mode !== null} className="objectiveDialog" onClose={close}
      accessibleName={dialogTitle}>
      <ModalDialogHeader title={dialogTitle} onClose={close} />
      <div className="objectiveDialogContent">
      <CatalogParentHeader objectTitle={form.name || dialogTitle} label={t("objective.strategy.label")} parentId={form.parentObjectiveId} required={!isStrategy}
        parent={chosenStrategy ? { code: chosenStrategy.code, title: chosenStrategy.name, type: t("objective.kind.STRATEGY"), status: chosenStrategy.status } : null}
        selection={!isStrategy && !readOnly && manage ? <Select value={chosenStrategy ? form.parentObjectiveId : ""} disabled={busy || readOnly}
              accessibleName={t("objective.strategy.label")}
            onChange={(event) => setForm((old) => ({ ...old, parentObjectiveId: event.target.value }))}>
            <Option value="">{t("objective.strategy.choose")}</Option>
            {rootStrategies.filter((item) => (mode !== "edit" || item.id !== selectedId) && !blockedParents.has(item.id))
              .map((item) => <Option key={item.id} value={item.id}>{item.code} · {strategyLabels.get(item.id)}</Option>)}
          </Select> : null} />
      <DetailTabContainer onTabSelect={(event) => {
        const key = event.detail.tab.getAttribute("data-tab-key");
        if (key === "general" || key === "organizations" || key === "documents") setActiveTab(key);
      }}>
        <Tab text={t("objective.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        {!isStrategy ? <Tab text={t("objective.tabs.organizations")} selected={activeTab === "organizations"} data-tab-key="organizations" /> : null}
        <Tab text={t("objective.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
      </DetailTabContainer>
      <div className={activeTab === "general" ? "objectiveForm" : "objectiveForm objectiveTabHidden"}>
        {structureError ? <MessageStrip design="Information" hideCloseButton>{t(structureError)}</MessageStrip> : null}
        <div className="masterDataFormGrid modalTwoColumnGrid">
          <MasterDataFormField label={t("objective.code")} required>{readOnly ? <Text className="objectPageValue">{(form.code) || "—"}</Text> : <Input value={form.code} readonly={mode !== "create"} disabled={busy}
            onInput={(event) => setForm((old) => ({ ...old, code: event.target.value }))} />}</MasterDataFormField>
          <MasterDataFormField label={t("objective.name")} required>{readOnly ? <Text className="objectPageValue">{(form.name) || "—"}</Text> : <Input value={form.name} readonly={readOnly} disabled={busy}
            onInput={(event) => setForm((old) => ({ ...old, name: event.target.value }))} />}</MasterDataFormField>
          {!isStrategy ? <>
          <MasterDataFormField label={t("objective.type")}>{readOnly ? <Text className="objectPageValue">{(form.objectiveType) || "—"}</Text> : <Input value={form.objectiveType} readonly={readOnly} disabled={busy}
            onInput={(event) => setForm((old) => ({ ...old, objectiveType: event.target.value }))} />}</MasterDataFormField>
          <div className="modalDateRange"><MasterDataFormField label={t("objective.validFrom")}>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validFrom)) || "—"}</Text> : <PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("objective.validFrom")}
            invalidValueMessage={t("objective.errors.dates")}
            onChange={(value) => setForm((old) => ({ ...old, validFrom: value }))}
            onDraftStateChange={(state) => setDateDrafts((old) =>
              old.validFrom.valid === state.valid && old.validFrom.draftValue === state.draftValue
                && old.validFrom.dirty === state.dirty ? old : { ...old, validFrom: state })} />}</MasterDataFormField>
          <MasterDataFormField label={t("objective.validTo")}>{readOnly ? <Text className="objectPageValue">{(formatPersianDate(form.validTo)) || "—"}</Text> : <PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("objective.validTo")}
            invalidValueMessage={t("objective.errors.dates")}
            onChange={(value) => setForm((old) => ({ ...old, validTo: value }))}
            onDraftStateChange={(state) => setDateDrafts((old) =>
              old.validTo.valid === state.valid && old.validTo.draftValue === state.draftValue
                && old.validTo.dirty === state.dirty ? old : { ...old, validTo: state })} />}</MasterDataFormField></div>
          </> : null}
          <MasterDataFormField label={t("objective.description")} wide>{readOnly ? <Text className="objectPageValue">{(form.description) || "—"}</Text> : <TextArea value={form.description} readonly={readOnly} disabled={busy} rows={3}
            onInput={(event) => setForm((old) => ({ ...old, description: event.target.value }))} />}</MasterDataFormField>
        </div>
      </div>
      {!isStrategy ? <div className={activeTab === "organizations" ? "objectiveOrganizationTab" : "objectiveOrganizationTab objectiveTabHidden"}>
        <div className="objectiveOrganizationToolbar">
          <div className="objectiveOrganizationSearch">
            <Label showColon>{t("objective.organizations.unit")}</Label>

          </div>
          <div className="objectiveOrganizationStatus">
            <Label showColon>{t("common.status")}</Label>
            <Select value={organizationStatusFilter} accessibleName={t("common.status")}
              onChange={(event) => setOrganizationStatusFilter(event.target.value)}>
              <Option value="ALL">{t("common.all")}</Option>
              <Option value="FINAL">{t("common.relationStatus.FINAL")}</Option>
              <Option value="DRAFT_NEW">{t("common.relationStatus.DRAFT_NEW")}</Option>
              <Option value="DRAFT_PENDING_DELETE">{t("common.relationStatus.DRAFT_PENDING_DELETE")}</Option>
            </Select>
          </div>
          <HeaderSearch value={organizationSearch} onChange={(value) => setOrganizationSearch(value)} accessibleName={t("objective.organizations.search")} />
          {!readOnly && form.kind === "OBJECTIVE" ? <Button design="Emphasized" disabled={!manage || busy || organizationsLoading || organizationLoadFailed}
            onClick={() => setOrganizationPickerOpen(true)}>{t("common.select")}</Button> : null}

        </div>
        {organizationsLoading ? <BusyIndicator active delay={0} /> : <>
              {visibleOrganizationRows.length ? <Table headerRow={<TableHeaderRow>
              <TableHeaderCell>{t("objective.organizations.unit")}</TableHeaderCell>
              <TableHeaderCell>{t("objective.organizations.assignment")}</TableHeaderCell>
              <TableHeaderCell>{t("objective.owner")}</TableHeaderCell>
              <TableHeaderCell>{t("common.status")}</TableHeaderCell>
              {!readOnly ? <TableHeaderCell>{t("objective.actions")}</TableHeaderCell> : null}
            </TableHeaderRow>}>
              {visibleOrganizationRows.map((row) => <TableRow key={row.id}>
                <TableCell>{row.code} · {row.organizationName}</TableCell>
                <TableCell>{row.assignmentName}</TableCell>
                <TableCell>{row.owner || "—"}</TableCell>
                <TableCell><ObjectStatus state={row.status === "FINAL" ? "Positive" : "Information"}>
                  {t(`common.relationStatus.${row.status}`)}</ObjectStatus></TableCell>
                {!readOnly ? <TableCell><Button design="Transparent" disabled={!manage || busy}
                  onClick={() => toggleOrganization(row.id)}>{t(row.status === "DRAFT_PENDING_DELETE" ? "common.undo" : "common.remove")}</Button></TableCell> : null}
              </TableRow>)}
            </Table> : <MessageStrip design="Information" hideCloseButton>{t(organizationRows.length
              ? "common.noData" : "objective.organizations.empty")}</MessageStrip>}
            </>}
      </div> : null}
      <div className={activeTab === "documents" ? "objectiveDocumentTab" : "objectiveDocumentTab objectiveTabHidden"}>
        {mode === "view" ? <DocumentManager targetType="OBJECTIVE" targetId={selectedId}
          readOnly title={t("objective.documents")} />
          : mode ? <DocumentManager targetType="OBJECTIVE" targetId={mode === "edit" ? selectedId : null}
            persistenceMode="PARENT_SAVE" busy={busy} title={t("objective.documents")}
            draftResetKey={draftGeneration} onDraftStateChange={setDocuments} /> : null}
      </div>
      <DialogFooter>
        {readOnly ? <Button design="Emphasized" disabled={!manage || busy}
          onClick={() => begin("edit", true)}>{t("common.edit")}</Button>
          : <Button design="Emphasized" disabled={busy || (!isStrategy && (organizationsLoading || organizationLoadFailed)) || !dirty || Boolean(structureError) || invalidDateDraft || !documents.ready || documents.invalid || documents.uploading}
            onClick={() => void save()}>{t("common.save")}</Button>}
        <Button design="Transparent" onClick={close}>{t(readOnly ? "common.close" : "common.cancel")}</Button>
      </DialogFooter>
      </div>
    </Dialog>
    <DeleteConfirmDialog open={Boolean(deleteCandidate)}
      title={t(deleteCandidate?.kind === "STRATEGY" ? "objective.strategy.delete" : "objective.delete")}
      message={t(deleteCandidate?.kind === "STRATEGY" ? "objective.strategy.deleteConfirm" : "objective.deleteConfirm",
        { name: deleteCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setDeleteCandidate(null)} onConfirm={() => void confirmDelete()} />
    {!isStrategy ? <HierarchyMultiSelectionDialog open={organizationPickerOpen}
      title={t("objective.organizations.select")} searchAccessibleName={t("objective.organizations.search")}
      nodes={organizationNodes} selectedIds={selectedOrganizationIds} busy={busy}
      confirmText={t("common.confirm")} cancelText={t("common.cancel")}
      onConfirm={(ids) => { setSelectedOrganizationIds(ids); setOrganizationPickerOpen(false); }}
      onClose={() => setOrganizationPickerOpen(false)} /> : null}
    <DeleteConfirmDialog open={leaveOpen || blocker.state === "blocked"}
      title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")}
      confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")}
      loading={false} onClose={() => { setLeaveOpen(false); if (blocker.state === "blocked") blocker.reset(); }}
      onConfirm={() => { setLeaveOpen(false); setMode(null); if (blocker.state === "blocked") blocker.proceed(); }} />
  </section></CatalogSelectionProvider>;
}
