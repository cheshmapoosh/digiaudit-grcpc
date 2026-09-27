import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bar, BusyIndicator, Button, Dialog, Input, Label, Link, MessageStrip, Option, Select, Tab,
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
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatPersianDateTime } from "@/shared/utils/date.utils";
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
    content={<span className="objectiveTreeLabel">{node.code} · {node.name}</span>}
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
  const [organizationId, setOrganizationId] = useState("");
  const [organizationDeleteCandidate, setOrganizationDeleteCandidate] = useState<ObjectiveOrganizationLink | null>(null);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
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
  const dirty = (mode === "create" || mode === "edit")
    && (JSON.stringify(form) !== baseline || documents.dirty || invalidDateDraft);
  const { blocker } = useUnsavedChangesGuard(dirty);

  useEffect(() => { void load().catch((cause: unknown) => setError(errorText(cause))); }, [load]);
  useEffect(() => {
    if (!selectedId || mode === "create" || mode === null) return;
    let current = true;
    void Promise.all([objectiveApi.organizations(selectedId), objectiveApi.organizationOptions()]).then(([links, options]) => {
      if (current) { setOrganizations(links); setOrganizationOptions(options); setOrganizationId(""); }
    }).catch((cause: unknown) => { if (current) setError(errorText(cause)); })
      .finally(() => { if (current) setOrganizationsLoading(false); });
    return () => { current = false; };
  }, [selectedId, mode]);

  const begin = (nextMode: "create" | "view" | "edit") => {
    if (nextMode !== "create") setOrganizationsLoading(true);
    else setOrganizations([]);
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
    setActiveTab("general");
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

  const assignOrganization = async () => {
    if (!selectedId || !organizationId) return;
    setBusy(true);
    try {
      await objectiveApi.assign(organizationId, {
        objectiveId: selectedId, name: null, description: null, owner: null,
        validFrom: null, validTo: null,
      });
      setOrganizations(await objectiveApi.organizations(selectedId));
      setOrganizationId("");
      setError(null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const removeOrganization = async () => {
    if (!selectedId || !organizationDeleteCandidate) return;
    setBusy(true);
    try {
      await objectiveApi.removeAssignment(organizationDeleteCandidate.organizationId,
        selectedId, organizationDeleteCandidate.version);
      setOrganizations(await objectiveApi.organizations(selectedId));
      setOrganizationDeleteCandidate(null);
      setError(null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const onTreeSelect = (event: TreeEvent) => {
    const id = event.detail?.item?.dataset?.objectiveId;
    if (id) setSelectedId(id);
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
          onClick={() => setSelectedId(item.id)}>{item.code} · {item.name}</Button>)
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
      <DetailTabContainer onTabSelect={(event) => {
        const key = event.detail.tab.getAttribute("data-tab-key");
        if (key === "general" || key === "organizations" || key === "documents") setActiveTab(key);
      }}>
        <Tab text={t("objective.tabs.general")} selected={activeTab === "general"} data-tab-key="general" />
        <Tab text={t("objective.tabs.organizations")} selected={activeTab === "organizations"} data-tab-key="organizations" />
        <Tab text={t("objective.documents")} selected={activeTab === "documents"} data-tab-key="documents" />
      </DetailTabContainer>
      <div className={activeTab === "general" ? "objectiveForm" : "objectiveForm objectiveTabHidden"}>
        <Label required>{t("objective.code")}</Label>
        <Input value={form.code} readonly={mode !== "create"} disabled={busy}
          onInput={(event) => setForm((old) => ({ ...old, code: event.target.value }))} />
        <Label required>{t("objective.name")}</Label>
        <Input value={form.name} readonly={readOnly} disabled={busy}
          onInput={(event) => setForm((old) => ({ ...old, name: event.target.value }))} />
        <Label>{t("objective.type")}</Label>
        <Input value={form.objectiveType} readonly={readOnly} disabled={busy}
          onInput={(event) => setForm((old) => ({ ...old, objectiveType: event.target.value }))} />
        <Label>{t("objective.parent")}</Label>
        <Select value={form.parentObjectiveId} disabled={busy || readOnly} accessibleName={t("objective.parent")}
          onChange={(event) => setForm((old) => ({ ...old, parentObjectiveId: event.target.value }))}>
          <Option value="">{t("objective.noParent")}</Option>
          {items.filter((item) => (mode !== "edit" || item.id !== selectedId) && !blockedParents.has(item.id))
            .map((item) => <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}
        </Select>
        <Label>{t("objective.validFrom")}</Label>
        <PersianDatePicker value={form.validFrom} readonly={readOnly} disabled={busy} accessibleName={t("objective.validFrom")}
          invalidValueMessage={t("objective.errors.dates")}
          onChange={(value) => setForm((old) => ({ ...old, validFrom: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validFrom.valid === state.valid && old.validFrom.draftValue === state.draftValue
              && old.validFrom.dirty === state.dirty ? old : { ...old, validFrom: state })} />
        <Label>{t("objective.validTo")}</Label>
        <PersianDatePicker value={form.validTo} readonly={readOnly} disabled={busy} accessibleName={t("objective.validTo")}
          invalidValueMessage={t("objective.errors.dates")}
          onChange={(value) => setForm((old) => ({ ...old, validTo: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validTo.valid === state.valid && old.validTo.draftValue === state.draftValue
              && old.validTo.dirty === state.dirty ? old : { ...old, validTo: state })} />
        <Label>{t("objective.description")}</Label>
        <TextArea value={form.description} readonly={readOnly} disabled={busy} rows={3}
          onInput={(event) => setForm((old) => ({ ...old, description: event.target.value }))} />
        {selected && mode !== "create" ? <Label>{t("objective.createdAt")}: {formatPersianDateTime(selected.createdAt)}</Label> : null}
      </div>
      <div className={activeTab === "organizations" ? "objectiveOrganizationTab" : "objectiveOrganizationTab objectiveTabHidden"}>
        {mode === "create" ? <MessageStrip design="Information" hideCloseButton>{t("objective.organizations.saveFirst")}</MessageStrip>
          : organizationsLoading ? <BusyIndicator active delay={0} />
            : <>
              <div className="objectiveActions">
                <Select value={organizationId} disabled={!manage || busy}
                  accessibleName={t("objective.organizations.select")}
                  onChange={(event) => setOrganizationId(event.target.value)}>
                  <Option value="">{t("objective.organizations.select")}</Option>
                  {organizationOptions.filter((option) => option.status === "ACTIVE"
                    && !organizations.some((link) => link.organizationId === option.id))
                    .map((option) => <Option key={option.id} value={option.id}>
                      {option.code} · {option.name}</Option>)}
                </Select>
                <Button disabled={!manage || busy || !organizationId}
                  onClick={() => void assignOrganization()}>{t("objective.organizations.assign")}</Button>
              </div>
              {organizations.length ? <Table headerRow={<TableHeaderRow>
              <TableHeaderCell>{t("objective.organizations.unit")}</TableHeaderCell>
              <TableHeaderCell>{t("objective.organizations.assignment")}</TableHeaderCell>
              <TableHeaderCell>{t("objective.owner")}</TableHeaderCell>
              <TableHeaderCell>{t("objective.actions")}</TableHeaderCell>
            </TableHeaderRow>}>
              {organizations.map((link) => <TableRow key={link.organizationId}>
                <TableCell>{link.organizationCode} · {link.organizationName}</TableCell>
                <TableCell>{link.name}</TableCell>
                <TableCell>{link.owner || "—"}</TableCell>
                <TableCell><Button design="Negative" disabled={!manage || busy}
                  onClick={() => setOrganizationDeleteCandidate(link)}>{t("objective.organizations.remove")}</Button></TableCell>
              </TableRow>)}
            </Table> : <MessageStrip design="Information" hideCloseButton>{t("objective.organizations.empty")}</MessageStrip>}
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
          onClick={() => begin("edit")}>{t("common.edit")}</Button>
          : <Button design="Emphasized" disabled={busy || !dirty || invalidDateDraft || !documents.ready || documents.invalid || documents.uploading}
            onClick={() => void save()}>{t("common.save")}</Button>}
        <Button design="Transparent" onClick={close}>{t(readOnly ? "common.close" : "common.cancel")}</Button>
      </div>
    </Dialog>
    <DeleteConfirmDialog open={Boolean(deleteCandidate)} title={t("objective.delete")}
      message={t("objective.deleteConfirm", { name: deleteCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setDeleteCandidate(null)} onConfirm={() => void confirmDelete()} />
    <DeleteConfirmDialog open={Boolean(organizationDeleteCandidate)}
      title={t("objective.organizations.remove")}
      message={t("objective.organization.removeConfirm", { name: organizationDeleteCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setOrganizationDeleteCandidate(null)} onConfirm={() => void removeOrganization()} />
    <DeleteConfirmDialog open={leaveOpen || blocker.state === "blocked"}
      title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")}
      confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")}
      loading={false} onClose={() => { setLeaveOpen(false); if (blocker.state === "blocked") blocker.reset(); }}
      onConfirm={() => { setLeaveOpen(false); setMode(null); if (blocker.state === "blocked") blocker.proceed(); }} />
  </section>;
}
