import { CatalogSelectionProvider } from "@/shared/components/CatalogSelection";
import { CatalogTreeOrder, CatalogOrderedTreeItem as TreeItemCustom } from "@/shared/components/CatalogTreeOrder";
import { orderKey, useCatalogTreeOrder } from "@/shared/components/catalogOrder.context";
import { CatalogSelectableRow, CatalogDeleteButton } from "@/shared/components/CatalogSelection";
import { CatalogParentHeader } from "@/shared/components/CatalogParentHeader";
import { DialogFooter, DialogFooterBar } from "@/shared/components/DialogFooter";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CatalogActionButton as Button } from "@/shared/components/CatalogActionButton";
import {
  Bar, BusyIndicator, Dialog, Input, Label, Link, MessageStrip, Option, Select, Tab,
  Text, TextArea, Title, Tree,
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
import { GlobalControlRegulationsTab } from "../components/GlobalControlRegulationsTab";
import { MasterDataFormField } from "@/shared/components/MasterDataObjectHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import GlobalControlCreateMenu from "../components/GlobalControlCreateMenu";
import type {
  ControlGroup, ControlGroupCreate, ControlGroupUpdate, GlobalControl,
  GlobalControlCreate, GlobalControlUpdate, GlobalControlRegulation, GlobalControlRegulationChange,
} from "../domain/global-control.model";
import { globalControlApi } from "../infra/global-control.api.repo";
import { useGlobalControlState } from "../state/global-control.state";
import "./global-control.css";

type Selection = { kind: "group" | "control"; id: string } | null;
type Editor = "groupCreate" | "groupEdit" | "controlCreate" | "controlEdit" | null;
type GroupForm = {
  code: string; name: string; description: string; parentId: string;
  validFrom: string; validTo: string;
};
type ControlForm = {
  code: string; name: string; description: string; controlGroupId: string;
  controlType: string; testRequired: "true" | "false"; validFrom: string; validTo: string;
};
type GroupNode = ControlGroup & { children: GroupNode[]; controls: GlobalControl[] };
type TreeEvent = { detail?: { item?: HTMLElement & {
  dataset?: { nodeId?: string; nodeKind?: string };
} }; preventDefault?: () => void };

const emptyGroup: GroupForm = {
  code: "", name: "", description: "", parentId: "", validFrom: "", validTo: "",
};
const emptyControl: ControlForm = {
  code: "", name: "", description: "", controlGroupId: "", controlType: "",
  testRequired: "false", validFrom: "", validTo: "",
};
const cleanDates = (): Record<"validFrom" | "validTo", PersianDateDraftState> => ({
  validFrom: { draftValue: "", valid: true, dirty: false },
  validTo: { draftValue: "", valid: true, dirty: false },
});

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function groupTree(groups: ControlGroup[], controls: GlobalControl[]): GroupNode[] {
  const nodes = new Map(groups.map((group) => [group.id, {
    ...group, children: [] as GroupNode[], controls: [] as GlobalControl[],
  }]));
  const roots: GroupNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : null;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  controls.forEach((control) => nodes.get(control.controlGroupId)?.controls.push(control));
  const sort = (list: GroupNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    list.forEach((node) => {
      node.controls.sort((a, b) => a.name.localeCompare(b.name, "fa"));
      sort(node.children);
    });
  };
  sort(roots);
  return roots;
}

function descendants(groups: ControlGroup[], id: string): Set<string> {
  const found = new Set<string>();
  const visit = (parentId: string) => groups.filter((item) => item.parentId === parentId)
    .forEach((item) => {
      if (!found.has(item.id)) { found.add(item.id); visit(item.id); }
    });
  visit(id);
  return found;
}

function GroupTreeItem({ node, selected, expanded }: {
  node: GroupNode; selected: Selection; expanded: Set<string>;
}) {
  const { t } = useTranslation();
  const order = useCatalogTreeOrder();
  const children = [
    ...node.children.map((group) => ({ kind: "group" as const, group })),
    ...node.controls.map((control) => ({ kind: "control" as const, control })),
  ];
  const ordered = order?.sort(children, (child) => child.kind === "group"
    ? orderKey("CONTROL_GROUP", child.group.id) : orderKey("GLOBAL_CONTROL", child.control.id)) ?? children;
  return <TreeItemCustom orderType="CONTROL_GROUP" orderId={node.id} data-node-kind="group" data-node-id={node.id}
    selected={selected?.kind === "group" && selected.id === node.id}
    expanded={expanded.has(node.id)}
    content={<CatalogSelectableRow itemKey={"group:" + node.id}><div className="globalControlTreeRow"><span>{node.name}</span>
      <span className="globalControlTreeType">{t("globalControl.group.menu")}</span></div></CatalogSelectableRow>}>
    {ordered.map((child) => child.kind === "group" ? <GroupTreeItem key={"group:" + child.group.id} node={child.group}
      selected={selected} expanded={expanded} /> : <TreeItemCustom key={"control:" + child.control.id}
      orderType="GLOBAL_CONTROL" orderId={child.control.id} data-node-kind="control" data-node-id={child.control.id}
      selected={selected?.kind === "control" && selected.id === child.control.id}
      content={<CatalogSelectableRow itemKey={"control:" + child.control.id}><div className="globalControlTreeRow"><span>{child.control.name}</span>
        <span className="globalControlTreeType">{t("globalControl.control.menu")}</span></div></CatalogSelectableRow>} />)}
  </TreeItemCustom>;
}

export default function GlobalControlManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { manage } = useMasterDataAccess("CONTROL");
  const groups = useGlobalControlState((state) => state.groups);
  const controls = useGlobalControlState((state) => state.controls);
  const loading = useGlobalControlState((state) => state.loading);
  const load = useGlobalControlState((state) => state.load);
  const createGroup = useGlobalControlState((state) => state.createGroup);
  const updateGroup = useGlobalControlState((state) => state.updateGroup);
  const deleteGroup = useGlobalControlState((state) => state.deleteGroup);
  const createControl = useGlobalControlState((state) => state.createControl);
  const updateControl = useGlobalControlState((state) => state.updateControl);
  const deleteControl = useGlobalControlState((state) => state.deleteControl);
  const [selected, setSelected] = useState<Selection>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"general" | "regulations" | "documents">("general");
  const [documents, setDocuments] = useState<ParentSaveDocumentDraftState>(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
  const [draftGeneration, setDraftGeneration] = useState(0);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroup);
  const [controlForm, setControlForm] = useState<ControlForm>(emptyControl);
  const [baseline, setBaseline] = useState("");
  const [dateDrafts, setDateDrafts] = useState(cleanDates);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    kind: "group" | "control"; id: string; name: string; version: number;
  } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "regulations" | "documents">("general");
  const [related, setRelated] = useState<GlobalControlRegulation[]>([]);
  const [regulationChanges, setRegulationChanges] = useState<GlobalControlRegulationChange[]>([]);
  const [regulationDirty, setRegulationDirty] = useState(false);
  const [regulationReady, setRegulationReady] = useState(true);
  const [parentPicker, setParentPicker] = useState(false);
  const [relationsLoading, setRelationsLoading] = useState(false);

  const selectedGroup = selected?.kind === "group"
    ? groups.find((item) => item.id === selected.id) ?? null : null;
  const selectedControl = selected?.kind === "control"
    ? controls.find((item) => item.id === selected.id) ?? null : null;
  const selectedControlId = selectedControl?.id;
  const tree = useMemo(() => groupTree(groups, controls), [groups, controls]);
  const blockedParents = useMemo(() => selectedGroup && editor === "groupEdit"
    ? descendants(groups, selectedGroup.id) : new Set<string>(), [groups, selectedGroup, editor]);
  const invalidDateDraft = !dateDrafts.validFrom.valid || !dateDrafts.validTo.valid;
  const currentForm = editor?.startsWith("group") ? groupForm : controlForm;
  const dirty = editor !== null && (JSON.stringify(currentForm) !== baseline
    || invalidDateDraft || parentPicker || (!editor.startsWith("group") && (documents.dirty || regulationDirty)));
  const { blocker } = useUnsavedChangesGuard(dirty);

  useEffect(() => { void load().catch((cause: unknown) => setError(message(cause))); }, [load]);
  useEffect(() => {
    if (!selectedControlId) return;
    let current = true;
    void globalControlApi.relatedRegulations(selectedControlId).then(links => {
      if (current) setRelated(links);
    }).catch((cause: unknown) => { if (current) setError(message(cause)); })
      .finally(() => { if (current) setRelationsLoading(false); });
    return () => { current = false; };
  }, [selectedControlId]);

  const choose = (selection: Selection) => {
    if (selection?.id === selected?.id && selection?.kind === selected?.kind) {
      return;
    }
    if (selection?.kind === "control") { setRelationsLoading(true); setRelated([]); }
    else { setRelationsLoading(false); setRelated([]); }
    setSelected(selection);
    setActiveTab("general");
  };
  const beginGroup = (edit: boolean, preserveTab = false) => {
    setViewOpen(false);
    setEditorTab(preserveTab ? activeTab : "general");
    const next = edit && selectedGroup ? {
      code: selectedGroup.code, name: selectedGroup.name,
      description: selectedGroup.description ?? "", parentId: selectedGroup.parentId ?? "",
      validFrom: selectedGroup.validFrom ?? "", validTo: selectedGroup.validTo ?? "",
    } : {
      ...emptyGroup, parentId: selectedGroup?.id ?? "",
    };
    setGroupForm(next);
    setBaseline(JSON.stringify(next));
    setDateDrafts(cleanDates());
    setEditor(edit ? "groupEdit" : "groupCreate");
    setError(null);
  };
  const beginControl = (edit: boolean, preserveTab = false) => {
    setViewOpen(false);
    setEditorTab(preserveTab ? activeTab : "general");
    setRegulationChanges([]);
    setRegulationDirty(false);
    setRegulationReady(true);
    setDocuments(EMPTY_PARENT_SAVE_DOCUMENT_DRAFT_STATE);
    setDraftGeneration((value) => value + 1);
    const next = edit && selectedControl ? {
      code: selectedControl.code, name: selectedControl.name,
      description: selectedControl.description ?? "",
      controlGroupId: selectedControl.controlGroupId,
      controlType: selectedControl.controlType,
      testRequired: selectedControl.testRequired ? "true" as const : "false" as const,
      validFrom: selectedControl.validFrom ?? "", validTo: selectedControl.validTo ?? "",
    } : {
      ...emptyControl,
      controlGroupId: (selectedGroup?.status === "ACTIVE" ? selectedGroup.id : null)
        ?? selectedControl?.controlGroupId
        ?? groups.find((group) => group.status === "ACTIVE")?.id ?? "",
    };
    setControlForm(next);
    setBaseline(JSON.stringify(next));
    setDateDrafts(cleanDates());
    setRelationsLoading(true);
    if (!edit) { setRelated([]); setRegulationChanges([]); }
    setEditor(edit ? "controlEdit" : "controlCreate");
    setError(null);
  };
  const closeEditor = () => {
    if (dirty) setLeaveOpen(true);
    else setEditor(null);
  };
  const validDates = (form: GroupForm | ControlForm) =>
    !invalidDateDraft && !(form.validFrom && form.validTo && form.validFrom > form.validTo);

  const save = async () => {
    if (!editor || parentPicker || (!editor.startsWith("group") && !regulationReady) || !currentForm.name.trim() || !validDates(currentForm)) {
      setError(t(!validDates(currentForm) ? "globalControl.errors.dates" : "globalControl.errors.required"));
      return;
    }
    setBusy(true);
    try {
      if (editor.startsWith("group")) {
        if (!groupForm.code.trim()) throw new Error(t("globalControl.errors.required"));
        if (editor === "groupEdit" && groupForm.parentId && (groupForm.parentId === selectedGroup?.id
          || blockedParents.has(groupForm.parentId)))
          throw new Error(t("globalControl.errors.parent"));
        const fields = {
          name: groupForm.name.trim(), description: groupForm.description.trim() || null,
          parentId: groupForm.parentId || null,
          validFrom: groupForm.validFrom || null, validTo: groupForm.validTo || null,
        };
        if (editor === "groupCreate") {
          const id = await createGroup({ ...fields, code: groupForm.code.trim() } satisfies ControlGroupCreate);
          choose({ kind: "group", id });
          if (fields.parentId) setExpanded((old) => new Set(old).add(fields.parentId!));
        } else if (selectedGroup) {
          await updateGroup(selectedGroup.id, {
            ...fields, version: selectedGroup.version,
          } satisfies ControlGroupUpdate);
        }
      } else {
        if (!controlForm.code.trim() || !controlForm.controlType.trim())
          throw new Error(t("globalControl.errors.required"));
        if (!groups.some((group) => group.id === controlForm.controlGroupId
          && group.status === "ACTIVE")) throw new Error(t("globalControl.errors.group"));
        if (!documents.ready || documents.invalid || documents.uploading)
          throw new Error(t("globalControl.errors.documents"));
        const fields = {
          name: controlForm.name.trim(), description: controlForm.description.trim() || null,
          controlGroupId: controlForm.controlGroupId,
          controlType: controlForm.controlType.trim(),
          testRequired: controlForm.testRequired === "true",
          validFrom: controlForm.validFrom || null, validTo: controlForm.validTo || null,
          regulationChanges,
          documents: toDocumentAggregateRequest(documents),
        };
        if (editor === "controlCreate") {
          const result = await createControl({
            ...fields, code: controlForm.code.trim(),
          } satisfies GlobalControlCreate);
          choose({ kind: "control", id: result.entityId });
          setRelated(result.regulations);
          setExpanded((old) => new Set(old).add(fields.controlGroupId));
        } else if (selectedControl) {
          const result = await updateControl(selectedControl.id, {
            ...fields, version: selectedControl.version,
          } satisfies GlobalControlUpdate);
          setRelated(result.regulations);
        }
      }
      if (!editor.startsWith("group")) { setRelationsLoading(false); setRegulationChanges([]); setRegulationDirty(false); }
      setActiveTab(editorTab);
      setViewOpen(true);
      setEditor(null);
      setDraftGeneration((value) => value + 1);
      setError(null);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setBusy(true);
    try {
      if (deleteCandidate.kind === "group")
        await deleteGroup(deleteCandidate.id, deleteCandidate.version);
      else await deleteControl(deleteCandidate.id, deleteCandidate.version);
      if (selected?.id === deleteCandidate.id) choose(null);
      setDeleteCandidate(null);
      setError(null);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const onTreeSelect = (event: TreeEvent) => {
    const id = event.detail?.item?.dataset?.nodeId;
    const kind = event.detail?.item?.dataset?.nodeKind;
    if (id && (kind === "group" || kind === "control")) choose({ kind, id });
  };
  const onTreeToggle = (event: TreeEvent) => {
    event.preventDefault?.();
    const id = event.detail?.item?.dataset?.nodeId;
    if (!id) return;
    setExpanded((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const needle = search.trim().toLocaleLowerCase("fa");
  const filtered = needle ? [
    ...groups.map((item) => ({ item, kind: "group" as const })),
    ...controls.map((item) => ({ item, kind: "control" as const })),
  ].filter(({ item }) => (item.code + " " + item.name).toLocaleLowerCase("fa").includes(needle)) : [];
  const groupOptions = groups.filter((group) => group.status === "ACTIVE");
  const startColumn = createElement("div", { slot: "startColumn", className: "globalControlFclColumn" }, <div className="globalControlListReport">
    <Bar startContent={<Title level="H4">{t("globalControl.title")}</Title>}
      endContent={<>
        <HeaderSearch value={search} onChange={(value) => setSearch(value)} accessibleName={t("globalControl.search")} />
        <GlobalControlCreateMenu disabled={!manage || busy}
          groupEnabled={!selected || selectedGroup?.status === "ACTIVE"}
          controlEnabled={selectedGroup?.status === "ACTIVE"}
          onCreate={(kind) => kind === "group" ? beginGroup(false) : beginControl(false)} />

        <Button disabled={!selected || busy} onClick={() => {
          setActiveTab("general"); setViewOpen(true);
        }}>{t("common.view")}</Button>
        <CatalogDeleteButton design="Negative" disabled={!selected || !manage || busy}
          onClick={() => {
            const value = selectedGroup || selectedControl;
            if (value) setDeleteCandidate({ kind: selectedGroup ? "group" : "control",
              id: value.id, name: value.name, version: value.version });
          }}>{t("common.delete")}</CatalogDeleteButton>
      </>} />

    <div className="globalControlTreeFrame">
    {loading || busy ? <BusyIndicator active delay={0} /> : null}
    <div className="globalControlTreeHeader">
      <Label>{t("globalControl.tree.name")}</Label>
      <Label>{t("globalControl.tree.kind")}</Label>
    </div>
    <CatalogTreeOrder catalog="GLOBAL_CONTROL" refreshKey={JSON.stringify([groups, controls])} filtered={Boolean(needle)}>{(order) => needle ? <Tree onItemClick={onTreeSelect}>
      {filtered.map(({ item, kind }) => <TreeItemCustom key={kind + item.id}
        data-node-kind={kind} data-node-id={item.id}
        selected={selected?.kind === kind && selected.id === item.id}
        content={<CatalogSelectableRow itemKey={kind + ":" + item.id}><div className="globalControlTreeRow"><span>{item.name}</span>
          <span className="globalControlTreeType">{t(kind === "group" ? "globalControl.group.menu" : "globalControl.control.menu")}</span></div></CatalogSelectableRow>} />)}
    </Tree>
      : <Tree inert={order.busy} onMove={order.onMove} onMoveOver={order.onMoveOver} onItemClick={onTreeSelect} onItemToggle={onTreeToggle}>
        {order.sort(tree, (node) => orderKey("CONTROL_GROUP", node.id)).map((node) => <GroupTreeItem key={node.id} node={node}
          selected={selected} expanded={expanded} />)}
      </Tree>}</CatalogTreeOrder>
    </div>
  </div>);

  const details = selectedGroup || selectedControl;
  const regulationPanel = <GlobalControlRegulationsTab ownerId={editor === "controlCreate" ? null : selectedControlId ?? null}
    rows={related} changes={regulationChanges} onChangesChange={setRegulationChanges}
    manage={Boolean(editor?.startsWith("control")) && manage} busy={busy} resetKey={draftGeneration}
    onDirtyChange={setRegulationDirty} onReadinessChange={setRegulationReady} onRowsChange={setRelated} />;
  const viewParent = groups.find((item) => item.id === (selectedGroup ? selectedGroup.parentId : selectedControl?.controlGroupId));
  const viewDetails = details ? <div className="globalControlDialogContent" data-catalog-dialog-content>
    <CatalogParentHeader objectTitle={details.name} label={t(selectedGroup ? "globalControl.group.parent" : "globalControl.group.select")}
      parentId={selectedGroup ? selectedGroup.parentId : selectedControl?.controlGroupId} required={Boolean(selectedControl)}
      parent={viewParent ? { code: viewParent.code, title: viewParent.name, type: t("globalControl.group.menu"), status: viewParent.status } : null} />
    <DetailTabContainer onTabSelect={(event) => {
      const key = event.detail.tab.getAttribute("data-tab-key");
      if (key === "general" || key === "regulations" || key === "documents") setActiveTab(key);
    }}>
      <Tab text={t("globalControl.tabs.general")} selected={activeTab === "general"}
        data-tab-key="general" />
      {selectedControl ? <Tab text={t("globalControl.tabs.regulations")} selected={activeTab === "regulations"}
        data-tab-key="regulations" />
      : null}
      {selectedControl ? <Tab text={t("globalControl.tabs.documents")} selected={activeTab === "documents"}
        data-tab-key="documents" /> : null}
    </DetailTabContainer>
    {activeTab === "general" || selectedGroup ?
      <div className="globalControlForm">
      <div className={selectedGroup ? "masterDataFormGrid modalTwoColumnGrid" : "masterDataFormGrid"}>
        <MasterDataFormField label={t("globalControl.code")}><Text className="objectPageValue">{(details.code) || "—"}</Text></MasterDataFormField>
        <MasterDataFormField label={t("globalControl.name")}><Text className="objectPageValue">{(details.name) || "—"}</Text></MasterDataFormField>
        {selectedControl ? <>

          <MasterDataFormField label={t("globalControl.type")}><Text className="objectPageValue">{(selectedControl.controlType) || "—"}</Text></MasterDataFormField>
          <MasterDataFormField label={t("globalControl.testRequired")}><Text className="objectPageValue">{(t(selectedControl.testRequired ? "globalControl.yes" : "globalControl.no")) || "—"}</Text></MasterDataFormField>
        </> : null}
        <div className="globalControlValidityRow">
          <MasterDataFormField label={t("globalControl.validFrom")}>
            <Text className="objectPageValue">{(formatPersianDate(details.validFrom ?? "")) || "—"}</Text>
          </MasterDataFormField>
          <MasterDataFormField label={t("globalControl.validTo")}>
            <Text className="objectPageValue">{(formatPersianDate(details.validTo ?? "")) || "—"}</Text>
          </MasterDataFormField>
        </div>
        <MasterDataFormField label={t("globalControl.description")} wide><Text className="objectPageValue">{(details.description || "") || "—"}</Text></MasterDataFormField>
      </div>
      </div> : null}
    {selectedControl && activeTab === "regulations" ? regulationPanel : null}
    {viewOpen && selectedControl && activeTab === "documents" ? <DocumentManager
      targetType="GLOBAL_CONTROL" targetId={selectedControl.id} readOnly
      title={t("globalControl.tabs.documents")} /> : null}
    <DialogFooter>
      <Button design="Emphasized" disabled={!manage || busy}
        onClick={() => selectedGroup ? beginGroup(true, true) : beginControl(true, true)}>{t("common.edit")}</Button>
      <Button design="Transparent" onClick={() => setViewOpen(false)}>{t("common.close")}</Button>
    </DialogFooter>
  </div> : null;

  const summaryColumn = details ? createElement("div", { slot: "midColumn", className: "globalControlFclColumn" },
    <div className="globalControlSummary">
      <Bar startContent={<Title level="H4">{details.name}</Title>} />
      <div className="globalControlSummaryDetails">
        <Label showColon>{t("globalControl.code")}</Label><Text>{details.code}</Text>
        <Label showColon>{t("globalControl.name")}</Label><Text>{details.name}</Text>
        <Label showColon>{t("globalControl.description")}</Label><Text>{details.description || "—"}</Text>
        {selectedControl ? <><Label showColon>{t("globalControl.tabs.regulations")}</Label>
          <Text>{relationsLoading ? t("common.loading") : related.length
            ? related.map((link) => link.regulationName).join("، ") : "—"}</Text></> : null}
        <Label showColon>{t("globalControl.createdAt")}</Label><Text>{formatPersianDateTime(details.createdAt)}</Text>
      </div>
      <DialogFooterBar>
        <Button design="Emphasized" disabled={!manage || busy}
          onClick={() => selectedGroup ? beginGroup(true) : beginControl(true)}>{t("common.edit")}</Button>
        <Button design="Transparent" onClick={() => choose(null)}>{t("common.close")}</Button>
      </DialogFooterBar>
    </div>) : null;

  const groupEditor = editor?.startsWith("group") ?? false;
  const editorTitle = groupEditor
    ? t(editor === "groupEdit" ? "globalControl.group.edit" : "globalControl.group.create")
    : t(editor === "controlEdit" ? "globalControl.control.edit" : "globalControl.control.create");
  const form = groupEditor ? groupForm : controlForm;
  const editorParent = groups.find((item) => item.id === (groupEditor ? groupForm.parentId : controlForm.controlGroupId));
  const bulkDeleteItems = [
    ...groups.map((row) => ({ key: "group:" + row.id, parentKey: row.parentId ? "group:" + row.parentId : null, label: `${row.code} — ${row.name}`,
      remove: () => deleteGroup(row.id, row.version, false) })),
    ...controls.map((row) => ({ key: "control:" + row.id, parentKey: "group:" + row.controlGroupId, label: `${row.code} — ${row.name}`,
      remove: () => deleteControl(row.id, row.version, false) })),
  ];

  return <CatalogSelectionProvider items={bulkDeleteItems} enabled={manage} busy={busy || loading}
      onBusyChange={setBusy} reload={load} mapError={message}
      onDeleted={(keys) => {
        if (selected && keys.has(selected.kind + ":" + selected.id)) { setSelected(null); setViewOpen(false); }
      }}><section className="globalControlPage">
    <Link onClick={() => navigate("/master-data")}>{t("masterData.title")}</Link>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
    {createElement("ui5-flexible-column-layout", {
      layout: details ? "TwoColumnsStartExpanded" : "OneColumn",
      dir: document.documentElement.dir === "ltr" ? "ltr" : "rtl",
      "disable-resizing": true, className: "globalControlFcl",
    }, startColumn, summaryColumn)}
    <Dialog open={viewOpen || editor !== null} className="globalControlDialog"
      accessibleName={editor ? editorTitle : details?.name || t("globalControl.title")}
      onClose={editor ? closeEditor : () => setViewOpen(false)}>
      <ModalDialogHeader title={editor ? editorTitle : details?.name || t("globalControl.title")}
        onClose={editor ? closeEditor : () => setViewOpen(false)} />
      {editor ? <div className="globalControlDialogContent" data-catalog-dialog-content>
      <CatalogParentHeader objectTitle={form.name || editorTitle} label={t(groupEditor ? "globalControl.group.parent" : "globalControl.group.select")}
        parentId={groupEditor ? groupForm.parentId : controlForm.controlGroupId} required={!groupEditor}
        busy={busy} onClearParent={groupEditor && manage ? () => setGroupForm((old) => ({ ...old, parentId: "" })) : undefined}
        parent={editorParent ? { code: editorParent.code, title: editorParent.name, type: t("globalControl.group.menu"), status: editorParent.status } : null}
        selection={<Button design="Emphasized" disabled={busy} onClick={() => setParentPicker(true)}>{t("catalogRelation.select")}</Button>} />
      <DetailTabContainer onTabSelect={(event) => {
        const key = event.detail.tab.getAttribute("data-tab-key");
        if (key === "general" || key === "regulations" || key === "documents") setEditorTab(key);
      }}>
        <Tab text={t("globalControl.tabs.general")} selected={editorTab === "general"}
          data-tab-key="general" />
        {!groupEditor ? <Tab text={t("globalControl.tabs.regulations")}
          selected={editorTab === "regulations"} data-tab-key="regulations" /> : null}
        {!groupEditor ? <Tab text={t("globalControl.tabs.documents")}
          selected={editorTab === "documents"} data-tab-key="documents" /> : null}
      </DetailTabContainer>
      <div className={editorTab === "general" || groupEditor
        ? "globalControlForm" : "globalControlForm globalControlHidden"}>
        <div className={groupEditor ? "masterDataFormGrid modalTwoColumnGrid" : "masterDataFormGrid"}>
        <MasterDataFormField label={t("globalControl.code")} required><Input value={form.code} readonly={editor === "groupEdit" || editor === "controlEdit"}
          disabled={busy} onInput={(event) => groupEditor
            ? setGroupForm((old) => ({ ...old, code: event.target.value }))
            : setControlForm((old) => ({ ...old, code: event.target.value }))} /></MasterDataFormField>
        <MasterDataFormField label={t("globalControl.name")} required><Input value={form.name} disabled={busy} onInput={(event) => groupEditor
          ? setGroupForm((old) => ({ ...old, name: event.target.value }))
          : setControlForm((old) => ({ ...old, name: event.target.value }))} /></MasterDataFormField>
        {!groupEditor ? <>

          <MasterDataFormField label={t("globalControl.type")} required><Input value={controlForm.controlType} disabled={busy}
            onInput={(event) => setControlForm((old) => ({
              ...old, controlType: event.target.value,
            }))} /></MasterDataFormField>
          <MasterDataFormField label={t("globalControl.testRequired")} required><Select value={controlForm.testRequired} disabled={busy}
            accessibleName={t("globalControl.testRequired")}
            onChange={(event) => setControlForm((old) => ({
              ...old, testRequired: event.target.value === "true" ? "true" : "false",
            }))}>
            <Option value="false">{t("globalControl.no")}</Option>
            <Option value="true">{t("globalControl.yes")}</Option>
          </Select></MasterDataFormField>
        </> : null}
        <div className="globalControlValidityRow">
        <MasterDataFormField label={t("globalControl.validFrom")}><PersianDatePicker value={form.validFrom} disabled={busy}
          accessibleName={t("globalControl.validFrom")}
          invalidValueMessage={t("globalControl.errors.dates")}
          onChange={(value) => groupEditor
            ? setGroupForm((old) => ({ ...old, validFrom: value }))
            : setControlForm((old) => ({ ...old, validFrom: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validFrom.valid === state.valid && old.validFrom.draftValue === state.draftValue
              && old.validFrom.dirty === state.dirty ? old : { ...old, validFrom: state })} /></MasterDataFormField>
        <MasterDataFormField label={t("globalControl.validTo")}><PersianDatePicker value={form.validTo} disabled={busy}
          accessibleName={t("globalControl.validTo")}
          invalidValueMessage={t("globalControl.errors.dates")}
          onChange={(value) => groupEditor
            ? setGroupForm((old) => ({ ...old, validTo: value }))
            : setControlForm((old) => ({ ...old, validTo: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validTo.valid === state.valid && old.validTo.draftValue === state.draftValue
              && old.validTo.dirty === state.dirty ? old : { ...old, validTo: state })} /></MasterDataFormField>
        </div>
        <MasterDataFormField label={t("globalControl.description")} wide><TextArea value={form.description} disabled={busy} rows={3}
          onInput={(event) => groupEditor
            ? setGroupForm((old) => ({ ...old, description: event.target.value }))
            : setControlForm((old) => ({ ...old, description: event.target.value }))} /></MasterDataFormField>
        </div>
      </div>
      {!groupEditor ? <div className={editorTab === "regulations" ? "globalControlRelationTab" : "globalControlRelationTab globalControlHidden"}>{regulationPanel}</div> : null}
      {!groupEditor && editor ? <div className={editorTab === "documents"
        ? "globalControlDocumentTab" : "globalControlDocumentTab globalControlHidden"}>
        <DocumentManager targetType="GLOBAL_CONTROL"
          targetId={editor === "controlEdit" ? selectedControlId ?? null : null}
          persistenceMode="PARENT_SAVE" busy={busy}
          title={t("globalControl.tabs.documents")}
          draftResetKey={draftGeneration} onDraftStateChange={setDocuments} />
      </div> : null}
      <DialogFooter>
        <Button design="Emphasized" disabled={busy || parentPicker || (!groupEditor && !regulationReady) || !dirty || invalidDateDraft
          || (!groupEditor && (!documents.ready || documents.invalid || documents.uploading))}
          onClick={() => void save()}>{t("common.save")}</Button>
        <Button design="Transparent" onClick={closeEditor}>{t("common.cancel")}</Button>
      </DialogFooter>
      </div> : viewDetails}
    </Dialog>
    <Dialog open={parentPicker} className="globalControlDialog" accessibleName={t(groupEditor ? "globalControl.group.parent" : "globalControl.group.select")} onClose={() => setParentPicker(false)}>
      <ModalDialogHeader title={t(groupEditor ? "globalControl.group.parent" : "globalControl.group.select")} onClose={() => setParentPicker(false)} />
      {groupEditor ? <Select value={groupForm.parentId} disabled={busy}
            accessibleName={t("globalControl.group.parent")}
            onChange={(event) => setGroupForm((old) => ({
              ...old, parentId: event.target.value,
            }))}>
            {!groupForm.parentId ? <Option value="">{t("globalControl.group.none")}</Option> : null}
            {groupOptions.filter((item) => (editor !== "groupEdit" || item.id !== selectedGroup?.id)
              && !blockedParents.has(item.id)).map((item) =>
              <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}
          </Select> : <Select value={controlForm.controlGroupId} disabled={busy}
            accessibleName={t("globalControl.group.select")}
            onChange={(event) => setControlForm((old) => ({
              ...old, controlGroupId: event.target.value,
            }))}>
            {!controlForm.controlGroupId ? <Option value="">{t("globalControl.group.select")}</Option> : null}
            {groupOptions.map((item) =>
              <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}
          </Select>}
      <DialogFooter>
        {groupEditor && groupForm.parentId ? <Button design="Negative" disabled={busy} onClick={() => setGroupForm(old => ({ ...old, parentId: "" }))}>{t("catalog.parentHeader.clear")}</Button> : null}
        <Button design="Emphasized" disabled={busy || (!groupEditor && !controlForm.controlGroupId)} onClick={() => setParentPicker(false)}>{t("catalogRelation.select")}</Button>
      </DialogFooter>
    </Dialog>
    <DeleteConfirmDialog open={Boolean(deleteCandidate)}
      title={t(deleteCandidate?.kind === "group"
        ? "globalControl.group.delete" : "globalControl.control.delete")}
      message={t(deleteCandidate?.kind === "group"
        ? "globalControl.group.deleteConfirm" : "globalControl.control.deleteConfirm",
        { name: deleteCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setDeleteCandidate(null)} onConfirm={() => void confirmDelete()} />
    <DeleteConfirmDialog open={leaveOpen || blocker.state === "blocked"}
      title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")}
      confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")}
      loading={false}
      onClose={() => {
        setLeaveOpen(false);
        if (blocker.state === "blocked") blocker.reset();
      }}
      onConfirm={() => {
        setLeaveOpen(false);
        setParentPicker(false);
        setEditor(null);
        if (blocker.state === "blocked") blocker.proceed();
      }} />
  </section></CatalogSelectionProvider>;
}
