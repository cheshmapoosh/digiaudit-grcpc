import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button, Dialog, Input, Label, Link, MessageStrip, Option, Select, Tab, Table,
  TableCell, TableHeaderCell, TableHeaderRow, TableRow, TextArea, Title, Tree,
  TreeItemCustom,
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { DetailTabContainer } from "@/shared/components/DetailTabContainer";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatPersianDate, formatPersianDateTime } from "@/shared/utils/date.utils";
import type {
  ControlGroup, ControlGroupCreate, ControlGroupUpdate, GlobalControl,
  GlobalControlCreate, GlobalControlUpdate, GlobalControlRegulation, RegulationOption,
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
  return <TreeItemCustom data-node-kind="group" data-node-id={node.id}
    selected={selected?.kind === "group" && selected.id === node.id}
    expanded={expanded.has(node.id)}
    content={<span>{node.code} · {node.name}</span>}>
    {node.children.map((child) => <GroupTreeItem key={child.id} node={child}
      selected={selected} expanded={expanded} />)}
    {node.controls.map((control) => <TreeItemCustom key={control.id}
      data-node-kind="control" data-node-id={control.id}
      selected={selected?.kind === "control" && selected.id === control.id}
      content={<span>{control.code} · {control.name}</span>} />)}
  </TreeItemCustom>;
}

export default function GlobalControlManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const appDir = typeof document !== "undefined" && document.documentElement.dir === "ltr" ? "ltr" : "rtl";
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
  const [activeTab, setActiveTab] = useState<"general" | "regulations">("general");
  const [related, setRelated] = useState<GlobalControlRegulation[]>([]);
  const [regulationOptions, setRegulationOptions] = useState<RegulationOption[]>([]);
  const [regulationId, setRegulationId] = useState("");
  const [relationCandidate, setRelationCandidate] = useState<GlobalControlRegulation | null>(null);

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
  const dirty = editor !== null && (JSON.stringify(currentForm) !== baseline || invalidDateDraft);
  const { blocker } = useUnsavedChangesGuard(dirty);
  const availableRegulations = useMemo(() => regulationOptions.filter((option) =>
    !related.some((link) => link.regulationId === option.id)), [regulationOptions, related]);

  useEffect(() => { void load().catch((cause: unknown) => setError(message(cause))); }, [load]);
  useEffect(() => {
    if (!selectedControlId) return;
    let current = true;
    void Promise.all([
      globalControlApi.relatedRegulations(selectedControlId),
      globalControlApi.regulationOptions(),
    ]).then(([links, options]) => {
      if (current) { setRelated(links); setRegulationOptions(options); setRegulationId(""); }
    }).catch((cause: unknown) => { if (current) setError(message(cause)); });
    return () => { current = false; };
  }, [selectedControlId]);

  const choose = (selection: Selection) => {
    setSelected(selection);
    setActiveTab("general");
  };
  const beginGroup = (edit: boolean) => {
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
  const beginControl = (edit: boolean) => {
    const next = edit && selectedControl ? {
      code: selectedControl.code, name: selectedControl.name,
      description: selectedControl.description ?? "",
      controlGroupId: selectedControl.controlGroupId,
      controlType: selectedControl.controlType,
      testRequired: selectedControl.testRequired ? "true" as const : "false" as const,
      validFrom: selectedControl.validFrom ?? "", validTo: selectedControl.validTo ?? "",
    } : {
      ...emptyControl,
      controlGroupId: selectedGroup?.id ?? selectedControl?.controlGroupId
        ?? groups.find((group) => group.status === "ACTIVE")?.id ?? "",
    };
    setControlForm(next);
    setBaseline(JSON.stringify(next));
    setDateDrafts(cleanDates());
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
    if (!editor || !currentForm.name.trim() || !validDates(currentForm)) {
      setError(t(!validDates(currentForm) ? "globalControl.errors.dates" : "globalControl.errors.required"));
      return;
    }
    setBusy(true);
    try {
      if (editor.startsWith("group")) {
        if (!groupForm.code.trim()) throw new Error(t("globalControl.errors.required"));
        if (groupForm.parentId && (groupForm.parentId === selectedGroup?.id
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
        const fields = {
          name: controlForm.name.trim(), description: controlForm.description.trim() || null,
          controlGroupId: controlForm.controlGroupId,
          controlType: controlForm.controlType.trim(),
          testRequired: controlForm.testRequired === "true",
          validFrom: controlForm.validFrom || null, validTo: controlForm.validTo || null,
        };
        if (editor === "controlCreate") {
          const id = await createControl({
            ...fields, code: controlForm.code.trim(),
          } satisfies GlobalControlCreate);
          choose({ kind: "control", id });
          setExpanded((old) => new Set(old).add(fields.controlGroupId));
        } else if (selectedControl) {
          await updateControl(selectedControl.id, {
            ...fields, version: selectedControl.version,
          } satisfies GlobalControlUpdate);
        }
      }
      setEditor(null);
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
  const reloadRelations = async (id: string) => {
    setRelated(await globalControlApi.relatedRegulations(id));
    setRegulationOptions(await globalControlApi.regulationOptions());
    setRegulationId("");
  };
  const attachRegulation = async () => {
    if (!selectedControl || !regulationId) return;
    setBusy(true);
    try {
      await globalControlApi.attachRegulation(selectedControl.id, regulationId);
      await reloadRelations(selectedControl.id);
      setError(null);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  };
  const removeRegulation = async () => {
    if (!selectedControl || !relationCandidate) return;
    setBusy(true);
    try {
      await globalControlApi.removeRegulation(selectedControl.id,
        relationCandidate.regulationId, relationCandidate.version);
      await reloadRelations(selectedControl.id);
      setRelationCandidate(null);
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

  const startColumn = <div slot="startColumn" className="globalControlColumn">
    <div className="globalControlToolbar">
      <Title level="H4">{t("globalControl.title")}</Title>
      <Button disabled={!manage || busy} onClick={() => beginGroup(false)}>
        {t("globalControl.group.create")}</Button>
      <Button disabled={!manage || busy || groupOptions.length === 0}
        onClick={() => beginControl(false)}>{t("globalControl.control.create")}</Button>
    </div>
    <Input value={search} placeholder={t("globalControl.search")}
      onInput={(event) => setSearch(event.target.value)} />
    {needle ? filtered.map(({ item, kind }) => <Button key={kind + item.id}
      design="Transparent" onClick={() => choose({ kind, id: item.id })}>
      {item.code} · {item.name}</Button>)
      : <Tree onItemClick={onTreeSelect} onItemToggle={onTreeToggle}>
        {tree.map((node) => <GroupTreeItem key={node.id} node={node}
          selected={selected} expanded={expanded} />)}
      </Tree>}
  </div>;

  const details = selectedGroup || selectedControl;
  const midColumn = details ? <div slot="midColumn" className="globalControlColumn">
    <Title level="H4">{details.name}</Title>
    {selectedControl ? <DetailTabContainer onTabSelect={(event) => {
      const key = event.detail.tab.getAttribute("data-tab-key");
      if (key === "general" || key === "regulations") setActiveTab(key);
    }}>
      <Tab text={t("globalControl.tabs.general")} selected={activeTab === "general"}
        data-tab-key="general" />
      <Tab text={t("globalControl.tabs.regulations")} selected={activeTab === "regulations"}
        data-tab-key="regulations" />
    </DetailTabContainer> : null}
    {activeTab === "general" || selectedGroup ? <>
      <div className="globalControlDetails">
        <Label>{t("globalControl.code")}: {details.code}</Label>
        <Label>{t("globalControl.createdAt")}: {formatPersianDateTime(details.createdAt)}</Label>
        <Label>{t("globalControl.validFrom")}: {formatPersianDate(details.validFrom)}</Label>
        <Label>{t("globalControl.validTo")}: {formatPersianDate(details.validTo)}</Label>
        {selectedGroup ? <Label>{t("globalControl.group.parent")}: {
          groups.find((item) => item.id === selectedGroup.parentId)?.name
          || t("globalControl.group.none")}</Label> : null}
        {selectedControl ? <>
          <Label>{t("globalControl.group.select")}: {
            groups.find((item) => item.id === selectedControl.controlGroupId)?.name || "—"}</Label>
          <Label>{t("globalControl.type")}: {selectedControl.controlType}</Label>
          <Label>{t("globalControl.testRequired")}: {
            t(selectedControl.testRequired ? "globalControl.yes" : "globalControl.no")}</Label>
        </> : null}
        <Label>{t("globalControl.description")}: {details.description || "—"}</Label>
      </div>
      <div className="globalControlActions">
        <Button disabled={!manage || busy}
          onClick={() => selectedGroup ? beginGroup(true) : beginControl(true)}>
          {t("common.edit")}</Button>
        <Button design="Negative" disabled={!manage || busy}
          onClick={() => setDeleteCandidate({
            kind: selectedGroup ? "group" : "control", id: details.id,
            name: details.name, version: details.version,
          })}>{t("common.delete")}</Button>
      </div>
    </> : null}
    {selectedControl && activeTab === "regulations" ? <>
      <div className="globalControlToolbar">
        <Select value={regulationId} disabled={!manage || busy}
          accessibleName={t("globalControl.regulations.select")}
          onChange={(event) => setRegulationId(event.target.value)}>
          <Option value="">{t("globalControl.regulations.select")}</Option>
          {availableRegulations.map((option) => <Option key={option.id} value={option.id}>
            {option.code} · {option.name}</Option>)}
        </Select>
        <Button disabled={!manage || busy || !regulationId}
          onClick={() => void attachRegulation()}>{t("globalControl.regulations.add")}</Button>
      </div>
      <Table headerRow={<TableHeaderRow>
        <TableHeaderCell>{t("globalControl.code")}</TableHeaderCell>
        <TableHeaderCell>{t("globalControl.name")}</TableHeaderCell>
        <TableHeaderCell>{t("globalControl.actions")}</TableHeaderCell>
      </TableHeaderRow>}>
        {related.map((link) => <TableRow key={link.id}>
          <TableCell>{link.regulationCode}</TableCell>
          <TableCell>{link.regulationName}</TableCell>
          <TableCell><Button design="Negative" disabled={!manage || busy}
            onClick={() => setRelationCandidate(link)}>
            {t("globalControl.regulations.remove")}</Button></TableCell>
        </TableRow>)}
      </Table>
      {related.length === 0 ? <MessageStrip design="Information" hideCloseButton>
        {t("globalControl.regulations.empty")}</MessageStrip> : null}
    </> : null}
  </div> : null;

  const groupEditor = editor?.startsWith("group") ?? false;
  const editorTitle = groupEditor
    ? t(editor === "groupEdit" ? "globalControl.group.edit" : "globalControl.group.create")
    : t(editor === "controlEdit" ? "globalControl.control.edit" : "globalControl.control.create");
  const form = groupEditor ? groupForm : controlForm;
  return <section className="globalControlPage">
    <Link onClick={() => navigate("/master-data")}>{t("masterData.title")}</Link>
    {error ? <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip> : null}
    {loading ? <MessageStrip design="Information" hideCloseButton>
      {t("globalControl.loading")}</MessageStrip> : null}
    {createElement("ui5-flexible-column-layout", {
      layout: details ? "TwoColumnsStartExpanded" : "OneColumn",
      dir: appDir,
      style: { height: "calc(100vh - 11rem)", minHeight: "32rem", display: "block" },
    }, startColumn, midColumn)}
    <Dialog open={editor !== null} className="globalControlDialog" onClose={closeEditor}
      accessibleName={editorTitle}>
      <ModalDialogHeader title={editorTitle} onClose={closeEditor} />
      <div className="globalControlForm">
        <Label required>{t("globalControl.code")}</Label>
        <Input value={form.code} readonly={editor === "groupEdit" || editor === "controlEdit"}
          disabled={busy} onInput={(event) => groupEditor
            ? setGroupForm((old) => ({ ...old, code: event.target.value }))
            : setControlForm((old) => ({ ...old, code: event.target.value }))} />
        <Label required>{t("globalControl.name")}</Label>
        <Input value={form.name} disabled={busy} onInput={(event) => groupEditor
          ? setGroupForm((old) => ({ ...old, name: event.target.value }))
          : setControlForm((old) => ({ ...old, name: event.target.value }))} />
        {groupEditor ? <>
          <Label>{t("globalControl.group.parent")}</Label>
          <Select value={groupForm.parentId} disabled={busy}
            accessibleName={t("globalControl.group.parent")}
            onChange={(event) => setGroupForm((old) => ({
              ...old, parentId: event.target.value,
            }))}>
            <Option value="">{t("globalControl.group.none")}</Option>
            {groupOptions.filter((item) => (editor !== "groupEdit" || item.id !== selectedGroup?.id)
              && !blockedParents.has(item.id)).map((item) =>
              <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}
          </Select>
        </> : <>
          <Label required>{t("globalControl.group.select")}</Label>
          <Select value={controlForm.controlGroupId} disabled={busy}
            accessibleName={t("globalControl.group.select")}
            onChange={(event) => setControlForm((old) => ({
              ...old, controlGroupId: event.target.value,
            }))}>
            <Option value="">{t("globalControl.group.select")}</Option>
            {groupOptions.map((item) =>
              <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}
          </Select>
          <Label required>{t("globalControl.type")}</Label>
          <Input value={controlForm.controlType} disabled={busy}
            onInput={(event) => setControlForm((old) => ({
              ...old, controlType: event.target.value,
            }))} />
          <Label required>{t("globalControl.testRequired")}</Label>
          <Select value={controlForm.testRequired} disabled={busy}
            accessibleName={t("globalControl.testRequired")}
            onChange={(event) => setControlForm((old) => ({
              ...old, testRequired: event.target.value === "true" ? "true" : "false",
            }))}>
            <Option value="false">{t("globalControl.no")}</Option>
            <Option value="true">{t("globalControl.yes")}</Option>
          </Select>
        </>}
        <Label>{t("globalControl.validFrom")}</Label>
        <PersianDatePicker value={form.validFrom} disabled={busy}
          accessibleName={t("globalControl.validFrom")}
          invalidValueMessage={t("globalControl.errors.dates")}
          onChange={(value) => groupEditor
            ? setGroupForm((old) => ({ ...old, validFrom: value }))
            : setControlForm((old) => ({ ...old, validFrom: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validFrom.valid === state.valid && old.validFrom.draftValue === state.draftValue
              && old.validFrom.dirty === state.dirty ? old : { ...old, validFrom: state })} />
        <Label>{t("globalControl.validTo")}</Label>
        <PersianDatePicker value={form.validTo} disabled={busy}
          accessibleName={t("globalControl.validTo")}
          invalidValueMessage={t("globalControl.errors.dates")}
          onChange={(value) => groupEditor
            ? setGroupForm((old) => ({ ...old, validTo: value }))
            : setControlForm((old) => ({ ...old, validTo: value }))}
          onDraftStateChange={(state) => setDateDrafts((old) =>
            old.validTo.valid === state.valid && old.validTo.draftValue === state.draftValue
              && old.validTo.dirty === state.dirty ? old : { ...old, validTo: state })} />
        <Label>{t("globalControl.description")}</Label>
        <TextArea value={form.description} disabled={busy} rows={3}
          onInput={(event) => groupEditor
            ? setGroupForm((old) => ({ ...old, description: event.target.value }))
            : setControlForm((old) => ({ ...old, description: event.target.value }))} />
        <div className="globalControlActions">
          <Button design="Emphasized" disabled={busy || !dirty || invalidDateDraft}
            onClick={() => void save()}>{t("common.save")}</Button>
          <Button design="Transparent" onClick={closeEditor}>{t("common.cancel")}</Button>
        </div>
      </div>
    </Dialog>
    <DeleteConfirmDialog open={Boolean(deleteCandidate)}
      title={t(deleteCandidate?.kind === "group"
        ? "globalControl.group.delete" : "globalControl.control.delete")}
      message={t(deleteCandidate?.kind === "group"
        ? "globalControl.group.deleteConfirm" : "globalControl.control.deleteConfirm",
        { name: deleteCandidate?.name ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setDeleteCandidate(null)} onConfirm={() => void confirmDelete()} />
    <DeleteConfirmDialog open={Boolean(relationCandidate)}
      title={t("globalControl.regulations.remove")}
      message={t("globalControl.regulations.removeConfirm",
        { name: relationCandidate?.regulationName ?? "" })}
      confirmText={t("common.delete")} cancelText={t("common.cancel")} loading={busy}
      onClose={() => setRelationCandidate(null)} onConfirm={() => void removeRegulation()} />
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
        setEditor(null);
        if (blocker.state === "blocked") blocker.proceed();
      }} />
  </section>;
}
