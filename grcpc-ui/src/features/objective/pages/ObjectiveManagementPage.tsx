import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bar, BusyIndicator, Button, Dialog, Input, Label, Link, MessageStrip, ObjectStatus, Option, Select, Tab,
  Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, Text, TextArea, Title, Tree,
  TreeItemCustom,
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
import { MasterDataFormField, MasterDataObjectHeader } from "@/shared/components/MasterDataObjectHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type { Objective, ObjectiveCreate, ObjectiveOrganizationLink, ObjectiveOrganizationOption, ObjectiveUpdate } from "../domain/objective.model";
import { objectiveApi } from "../infra/objective.api.repo";
import { useObjectiveState } from "../state/objective.state";
import "./objective.css";

type Form = {
  code: string; name: string; description: string; objectiveType: string;
  parentObjectiveId: string; validFrom: string; validTo: string;
};
type TreeNode = Objective & { children: TreeNode[] };
type TreeEvent = { detail?: { item?: HTMLElement & { dataset?: { objectiveId?: string } } }; preventDefault?: () => void };

const emptyForm: Form = {
  code: "", name: "", description: "", objectiveType: "", parentObjectiveId: "",
  validFrom: "", validTo: "",
};

function toForm(value: Objective | null): Form {
  return value ? {
    code: value.code, name: value.name, description: value.description ?? "",
    objectiveType: value.objectiveType ?? "", parentObjectiveId: value.parentObjectiveId ?? "",
    validFrom: value.validFrom ?? "", validTo: value.validTo ?? "",
  } : { ...emptyForm };
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
  return <TreeItemCustom
    data-objective-id={node.id} selected={node.id === selectedId}
    expanded={expandedIds.has(node.id)}
    content={<span className="objectiveTreeLabel">{node.name}</span>}
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
  const tree = useMemo(() => buildTree(items), [items]);
  const blockedParents = useMemo(() => selected && mode === "edit"
    ? descendantIds(items, selected.id) : new Set<string>(), [items, mode, selected]);
  const invalidDateDraft = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const organizationDraftDirty = [...selectedOrganizationIds].sort().join("|")
    !== organizations.map((link) => link.organizationId).sort().join("|");
  const dirty = (mode === "create" || mode === "edit")
    && (JSON.stringify(form) !== baseline || documents.dirty || invalidDateDraft || organizationDraftDirty);
  const { blocker } = useUnsavedChangesGuard(dirty);

  useEffect(() => { void load().catch((cause: unknown) => setError(errorText(cause))); }, [load]);
  useEffect(() => {
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
  }, [selectedId, mode]);

  const begin = (nextMode: "create" | "view" | "edit", preserveTab = false) => {
    setOrganizationsLoading(true);
    setOrganizationLoadFailed(false);
    if (!preserveTab) { setOrganizationSearch(""); setOrganizationStatusFilter("ALL"); }
    if (nextMode === "create") { setOrganizations([]); setSelectedOrganizationIds(new Set()); }
    const next = nextMode === "create"
      ? { ...emptyForm, parentObjectiveId: selected?.id ?? "" }
      : toForm(selected);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    setDraftGeneration((value) => value + 1);
    setDateDrafts({
      validFrom: { draftValue: "", valid: true, dirty: false },
      validTo: { draftValue: "", valid: true, dirty: false },
    });
    setError(null);
    if (!preserveTab) setActiveTab("general");
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
    if (mode === "edit" && form.parentObjectiveId
      && (form.parentObjectiveId === selectedId || blockedParents.has(form.parentObjectiveId))) {
      setError(t("objective.errors.parent"));
      return;
    }
    const common = {
      name: form.name.trim(), description: form.description.trim() || null,
      objectiveType: form.objectiveType.trim() || null,
      parentObjectiveId: form.parentObjectiveId || null,
      validFrom: form.validFrom || null, validTo: form.validTo || null,
      organizationIds: [...selectedOrganizationIds],
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
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = search.trim()
    ? items.filter((item) => (item.code + " " + item.name).toLocaleLowerCase("fa")
        .includes(search.trim().toLocaleLowerCase("fa")))
    : [];
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
  const dialogTitle = t(mode === "create" ? "objective.create"
    : mode === "edit" ? "objective.edit" : "objective.view");
  const readOnly = mode === "view";

  const listColumn = createElement("div", { slot: "startColumn", className: "objectiveFclColumn" },
    <div className="objectiveListReport">
      <Bar startContent={<Title level="H4">{t("objective.title")}</Title>}
        endContent={<div className="objectiveActions">
          <Button design="Emphasized" disabled={!manage || busy} onClick={() => begin("create")}>{t("common.create")}</Button>
          <Button disabled={!selected || busy} onClick={() => begin("view")}>{t("common.view")}</Button>
          <Button design="Negative" disabled={!selected || !manage || busy}
            onClick={() => setDeleteCandidate(selected)}>{t("common.delete")}</Button>
        </div>} />
      <Input value={search} placeholder={t("objective.search")}
        onInput={(event) => setSearch(event.target.value)} />
      <div className="objectiveTreeFrame">
        {loading || busy ? <BusyIndicator active delay={0} /> : null}
        {search.trim() ? filtered.map((item) => <Button key={item.id} design="Transparent"
          onClick={() => {
            if (item.id !== selectedId) { setOrganizationsLoading(true); setOrganizations([]); setSelectedId(item.id); }
          }}>{item.name}</Button>)
          : <Tree onItemClick={onTreeSelect} onItemToggle={onTreeToggle}>
            {tree.map((node) => <ObjectiveTreeItem key={node.id} node={node}
              selectedId={selectedId} expandedIds={expandedIds} />)}
          </Tree>}
      </div>
    </div>);
  const summaryColumn = selected ? createElement("div", { slot: "midColumn", className: "objectiveFclColumn" },
    <div className="objectiveSummary">
      <Bar startContent={<Title level="H4">{selected.name}</Title>} />
      <div className="objectiveSummaryDetails">
        <Label showColon>{t("objective.code")}</Label><Text>{selected.code}</Text>
        <Label showColon>{t("objective.name")}</Label><Text>{selected.name}</Text>
        <Label showColon>{t("objective.type")}</Label><Text>{selected.objectiveType || "—"}</Text>
        <Label showColon>{t("objective.parent")}</Label><Text>{items.find((item) => item.id === selected.parentObjectiveId)?.name || t("objective.noParent")}</Text>
        <Label showColon>{t("objective.description")}</Label><Text>{selected.description || "—"}</Text>
        <Label showColon>{t("objective.tabs.organizations")}</Label>
        <Text>{organizationsLoading ? t("common.loading") : organizations.length
          ? organizations.map((link) => link.organizationName).join("، ") : "—"}</Text>
        <Label showColon>{t("objective.createdAt")}</Label><Text>{formatPersianDateTime(selected.createdAt)}</Text>
      </div>
      <Bar endContent={<>
        <Button design="Emphasized" disabled={!manage || busy} onClick={() => begin("edit")}>{t("common.edit")}</Button>
        <Button design="Transparent" onClick={() => setSelectedId(null)}>{t("common.close")}</Button>
      </>} />
    </div>) : null;

  return <section className="objectivePage">
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
      <MasterDataObjectHeader title={form.name || dialogTitle} fields={[
        { label: t("objective.code"), value: form.code },
        { label: t("objective.name"), value: form.name },
        { label: t("objective.type"), value: form.objectiveType },
        { label: t("objective.parent"), value: items.find((item) => item.id === form.parentObjectiveId)?.name || t("objective.noParent") },
        { label: t("objective.validFrom"), value: formatPersianDate(form.validFrom) },
        { label: t("objective.validTo"), value: formatPersianDate(form.validTo) },
        { label: t("objective.createdAt"), value: selected && mode !== "create" ? formatPersianDateTime(selected.createdAt) : "" },
        { label: t("objective.updatedAt"), value: selected && mode !== "create" ? formatPersianDateTime(selected.updatedAt) : "" },
      ]} />
      <DetailTabContainer onTabSelect={(event) => {
        const key = event.detail.tab.getAttribute("data-tab-key");
        if (key === "general" || key === "organizations" || key === "documents") setActiveTab(key);
      }}>
        <Tab text={t("objective.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        <Tab text={t("objective.tabs.organizations")} selected={activeTab === "organizations"} data-tab-key="organizations" />
        <Tab text={t("objective.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
      </DetailTabContainer>
      <div className={activeTab === "general" ? "objectiveForm" : "objectiveForm objectiveTabHidden"}>
        <div className="masterDataFormGrid">
          <MasterDataFormField label={t("objective.code")} required><Input value={form.code} readonly={mode !== "create"} disabled={busy}
            onInput={(event) => setForm((old) => ({ ...old, code: event.target.value }))} /></MasterDataFormField>
          <MasterDataFormField label={t("objective.name")} required><Input value={form.name} readonly={readOnly} disabled={busy}
            onInput={(event) => setForm((old) => ({ ...old, name: event.target.value }))} /></MasterDataFormField>
          <MasterDataFormField label={t("objective.type")}><Input value={form.objectiveType} readonly={readOnly} disabled={busy}
            onInput={(event) => setForm((old) => ({ ...old, objectiveType: event.target.value }))} /></MasterDataFormField>
          <MasterDataFormField label={t("objective.parent")}><Select value={form.parentObjectiveId} disabled={busy || readOnly} accessibleName={t("objective.parent")}
            onChange={(event) => setForm((old) => ({ ...old, parentObjectiveId: event.target.value }))}>
            <Option value="">{t("objective.noParent")}</Option>
            {items.filter((item) => (mode !== "edit" || item.id !== selectedId) && !blockedParents.has(item.id))
              .map((item) => <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}
          </Select></MasterDataFormField>
          <MasterDataFormField label={t("objective.validFrom")}><PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("objective.validFrom")}
            invalidValueMessage={t("objective.errors.dates")}
            onChange={(value) => setForm((old) => ({ ...old, validFrom: value }))}
            onDraftStateChange={(state) => setDateDrafts((old) =>
              old.validFrom.valid === state.valid && old.validFrom.draftValue === state.draftValue
                && old.validFrom.dirty === state.dirty ? old : { ...old, validFrom: state })} /></MasterDataFormField>
          <MasterDataFormField label={t("objective.validTo")}><PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("objective.validTo")}
            invalidValueMessage={t("objective.errors.dates")}
            onChange={(value) => setForm((old) => ({ ...old, validTo: value }))}
            onDraftStateChange={(state) => setDateDrafts((old) =>
              old.validTo.valid === state.valid && old.validTo.draftValue === state.draftValue
                && old.validTo.dirty === state.dirty ? old : { ...old, validTo: state })} /></MasterDataFormField>
          <MasterDataFormField label={t("objective.description")} wide><TextArea value={form.description} readonly={readOnly} disabled={busy} rows={3}
            onInput={(event) => setForm((old) => ({ ...old, description: event.target.value }))} /></MasterDataFormField>
        </div>
      </div>
      <div className={activeTab === "organizations" ? "objectiveOrganizationTab" : "objectiveOrganizationTab objectiveTabHidden"}>
        <div className="objectiveOrganizationToolbar">
          <div className="objectiveOrganizationSearch">
            <Label showColon>{t("objective.organizations.unit")}</Label>
            <Input value={organizationSearch} placeholder={t("objective.organizations.search")}
              accessibleName={t("objective.organizations.search")}
              onInput={(event) => setOrganizationSearch(event.target.value)} />
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
          {!readOnly ? <Button design="Emphasized" disabled={!manage || busy || organizationsLoading || organizationLoadFailed}
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
      </div>
      <div className={activeTab === "documents" ? "objectiveDocumentTab" : "objectiveDocumentTab objectiveTabHidden"}>
        {mode === "view" ? <DocumentManager targetType="OBJECTIVE" targetId={selectedId}
          readOnly title={t("objective.documents")} />
          : mode ? <DocumentManager targetType="OBJECTIVE" targetId={mode === "edit" ? selectedId : null}
            persistenceMode="PARENT_SAVE" busy={busy} title={t("objective.documents")}
            draftResetKey={draftGeneration} onDraftStateChange={setDocuments} /> : null}
      </div>
      <div className="objectiveActions objectiveDialogActions">
        {readOnly ? <Button design="Emphasized" disabled={!manage || busy}
          onClick={() => begin("edit", true)}>{t("common.edit")}</Button>
          : <Button design="Emphasized" disabled={busy || organizationsLoading || organizationLoadFailed || !dirty || invalidDateDraft || !documents.ready || documents.invalid || documents.uploading}
            onClick={() => void save()}>{t("common.save")}</Button>}
        <Button design="Transparent" onClick={close}>{t(readOnly ? "common.close" : "common.cancel")}</Button>
      </div>
      </div>
    </Dialog>
    <DeleteConfirmDialog open={Boolean(deleteCandidate)} title={t("objective.delete")}
      message={t("objective.deleteConfirm", { name: deleteCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setDeleteCandidate(null)} onConfirm={() => void confirmDelete()} />
    <HierarchyMultiSelectionDialog open={organizationPickerOpen}
      title={t("objective.organizations.select")} searchPlaceholder={t("objective.organizations.search")}
      nodes={organizationNodes} selectedIds={selectedOrganizationIds} busy={busy}
      confirmText={t("common.confirm")} cancelText={t("common.cancel")}
      onConfirm={(ids) => { setSelectedOrganizationIds(ids); setOrganizationPickerOpen(false); }}
      onClose={() => setOrganizationPickerOpen(false)} />
    <DeleteConfirmDialog open={leaveOpen || blocker.state === "blocked"}
      title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")}
      confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")}
      loading={false} onClose={() => { setLeaveOpen(false); if (blocker.state === "blocked") blocker.reset(); }}
      onConfirm={() => { setLeaveOpen(false); setMode(null); if (blocker.state === "blocked") blocker.proceed(); }} />
  </section>;
}
