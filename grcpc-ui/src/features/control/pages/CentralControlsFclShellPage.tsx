import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import { toDocumentAggregateDraftError, type DocumentAggregateDraftError } from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CentralControlListReport from "../components/CentralControlListReport";
import CentralControlSummaryPanel from "../components/CentralControlSummaryPanel";
import type {
  CentralControlDetail,
  CentralControlGroupDetail,
  CentralControlGroupSummary,
  CentralControlNodeType,
  CentralControlSummary,
  CreateCentralControlCommand,
  CreateCentralControlGroupCommand,
  UpdateCentralControlCommand,
  UpdateCentralControlGroupCommand,
} from "../domain/centralControl.model";
import { centralControlApi } from "../infra/centralControl.api.repo";
import type { CentralControlTreeNode } from "../utils/centralControl.tree";
import CentralControlGroupObjectPage, { type ControlGroupObjectMode } from "./CentralControlGroupObjectPage";
import CentralControlObjectPage, { type CentralControlObjectMode, type CentralControlTabKey } from "./CentralControlObjectPage";
import "../control.css";

type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";
type AnyDetail = CentralControlDetail | CentralControlGroupDetail;

function resolveUiDir(): UiDir {
  if (typeof document === "undefined") return "rtl";
  const htmlDir = document.documentElement.getAttribute("dir");
  if (htmlDir === "rtl" || htmlDir === "ltr") return htmlDir;
  return document.body?.getAttribute("dir") === "ltr" ? "ltr" : "rtl";
}

function useResolvedUiDir(): UiDir {
  const [dir, setDir] = useState<UiDir>(() => resolveUiDir());
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setDir(resolveUiDir());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);
  return dir;
}

function isOwnDialogCloseEvent(event: unknown) {
  const candidate = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(candidate.target && candidate.currentTarget && candidate.target === candidate.currentTarget);
}

export default function CentralControlsFclShellPage() {
  const { t } = useTranslation();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_CONTROL");
  const location = useLocation();
  const { controlId } = useParams();
  const [groups, setGroups] = useState<CentralControlGroupSummary[]>([]);
  const [controls, setControls] = useState<CentralControlSummary[]>([]);
  const [selectedNode, setSelectedNode] = useState<CentralControlTreeNode | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AnyDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expansionAnchorId, setExpansionAnchorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CentralControlObjectMode | ControlGroupObjectMode>("view");
  const [modalType, setModalType] = useState<CentralControlNodeType>("CONTROL");
  const [modalValue, setModalValue] = useState<AnyDetail | null>(null);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CentralControlTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralControlTreeNode | null>(null);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const legacyRouteHandled = useRef(false);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const { blocker } = useUnsavedChangesGuard(dirty);

  const mapError = useCallback((error: unknown, fallback: string) => {
    const candidate = error as { code?: string; message?: string } | null;
    const code = candidate?.code ?? candidate?.message;
    switch (code) {
      case "DUPLICATE_BUSINESS_KEY": return t("control.errors.duplicateCode");
      case "MASTER_DATA_NOT_FOUND":
      case "NOT_FOUND": return t("control.errors.notFound");
      case "VERSION_CONFLICT": return t("control.errors.versionConflict");
      case "INVALID_PARENT":
      case "INVALID_HIERARCHY_MOVE":
      case "HIERARCHY_CYCLE":
      case "HIERARCHY_SELF_PARENT": return t("control.errors.invalidParent");
      case "INVALID_CONTROL_FREQUENCY": return t("control.errors.invalidFrequency");
      case "INVALID_CONTROL_EVENT_DESCRIPTION": return t("control.errors.invalidEventDescription");
      case "DEPENDENCY_EXISTS": return t("control.errors.dependencies");
      default: return fallback;
    }
  }, [t]);

  const requestLeave = useCallback((action: () => void) => {
    if (!dirty) return action();
    pendingLeaveActionRef.current = action;
    setLeaveConfirmationOpen(true);
  }, [dirty]);

  const stay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
    pendingLeaveActionRef.current = null;
    setLeaveConfirmationOpen(false);
  }, [blocker]);

  const confirmLeave = useCallback(() => {
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    setLeaveConfirmationOpen(false);
    setDirty(false);
    if (blocker.state === "blocked") blocker.proceed();
    else action?.();
  }, [blocker]);

  const loadRows = useCallback(async () => {
    const request = ++listGeneration.current;
    setBusy(true);
    try {
      const [nextGroups, nextControls] = await Promise.all([centralControlApi.listGroups(), centralControlApi.list()]);
      if (request !== listGeneration.current) return false;
      setGroups(nextGroups);
      setControls(nextControls);
      setPageError(null);
      return true;
    } catch (error) {
      if (request === listGeneration.current) setPageError(mapError(error, t("control.errors.loadList")));
      return false;
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [mapError, t]);

  const fetchDetail = useCallback((type: CentralControlNodeType, id: string) =>
    type === "GROUP" ? centralControlApi.group(id) : centralControlApi.detail(id), []);

  const loadDetail = useCallback(async (node: CentralControlTreeNode) => {
    const request = ++detailGeneration.current;
    setBusy(true);
    try {
      const detail = await fetchDetail(node.type, node.id);
      if (request !== detailGeneration.current) return null;
      setPageError(null);
      return detail;
    } catch (error) {
      if (request === detailGeneration.current) setPageError(mapError(error, t("control.errors.loadDetail")));
      return null;
    } finally {
      if (request === detailGeneration.current) setBusy(false);
    }
  }, [fetchDetail, mapError, t]);

  useEffect(() => {
    void loadRows();
    return () => { listGeneration.current += 1; detailGeneration.current += 1; };
  }, [loadRows]);

  useEffect(() => {
    if (legacyRouteHandled.current) return;
    if (location.pathname.endsWith("/new")) {
      legacyRouteHandled.current = true;
      setModalType("CONTROL"); setModalParentId(null); setModalValue(null); setModalMode("create"); setActiveTab("general"); setModalOpen(true);
      return;
    }
    if (!controlId) return;
    legacyRouteHandled.current = true;
    void (async () => {
      const summary = controls.find((row) => row.id === controlId);
      const node: CentralControlTreeNode = { id: controlId, code: summary?.code ?? "", title: summary?.title ?? "", type: "CONTROL", status: summary?.status ?? "ACTIVE", parentId: summary?.controlGroupId ?? null, sortOrder: Number.MAX_SAFE_INTEGER, children: [] };
      const detail = await loadDetail(node);
      if (!detail) return;
      setSelectedNode(node); setSelectedDetail(detail); setModalType("CONTROL"); setModalParentId(node.parentId); setModalValue(detail); setModalMode(location.pathname.endsWith("/edit") ? "edit" : "view"); setModalOpen(true);
    })();
  }, [controlId, controls, loadDetail, location.pathname]);

  const selectNode = useCallback((node: CentralControlTreeNode) => {
    if (selectedNode?.id === node.id && selectedDetail?.id === node.id) return;
    requestLeave(() => {
      setSelectedNode(node); setExpansionAnchorId(node.id); setSelectedDetail(null); setObjectError(null); setDocumentError(null);
      void (async () => { const detail = await loadDetail(node); if (detail) setSelectedDetail(detail); })();
    });
  }, [loadDetail, requestLeave, selectedDetail?.id, selectedNode?.id]);

  const allowedCreateTypes = useMemo<CentralControlNodeType[]>(() => {
    if (!selectedNode) return ["GROUP"];
    if (selectedNode.type === "GROUP") return ["GROUP", "CONTROL"];
    return selectedNode.parentId ? ["GROUP", "CONTROL"] : ["GROUP"];
  }, [selectedNode]);

  const startCreate = useCallback((type: CentralControlNodeType) => {
    requestLeave(() => {
      let parentId: string | null = null;
      if (!selectedNode) {
        if (type !== "GROUP") return;
      } else if (selectedNode.type === "GROUP") parentId = selectedNode.id;
      else parentId = selectedNode.parentId;
      if (type === "CONTROL" && !parentId) return;
      setDirty(false);
      setModalType(type); setModalParentId(parentId); setModalValue(null); setModalMode("create"); setActiveTab("general"); setObjectError(null); setDocumentError(null); setModalOpen(true);
    });
  }, [requestLeave, selectedNode]);

  const showSelected = useCallback(() => {
    if (!selectedNode || !selectedDetail) return;
    requestLeave(() => {
      setDirty(false);
      setModalType(selectedNode.type); setModalParentId(selectedNode.parentId); setModalValue(selectedDetail); setModalMode("view"); setActiveTab("general"); setObjectError(null); setDocumentError(null); setModalOpen(true);
    });
  }, [requestLeave, selectedDetail, selectedNode]);

  const editSelected = useCallback(() => {
    if (!selectedNode || !selectedDetail) return;
    setDirty(false);
    setModalType(selectedNode.type); setModalParentId(selectedNode.parentId); setModalValue(selectedDetail); setModalMode("edit"); setActiveTab("general"); setObjectError(null); setDocumentError(null); setModalOpen(true);
  }, [selectedDetail, selectedNode]);

  const closeObject = useCallback(() => requestLeave(() => {
    setDirty(false); setModalOpen(false); setModalValue(null); setObjectError(null); setDocumentError(null); setActiveTab("general");
  }), [requestLeave]);

  const refreshSelection = useCallback(async (type: CentralControlNodeType, id: string) => {
    await loadRows();
    const detail = await fetchDetail(type, id);
    const node: CentralControlTreeNode = type === "GROUP"
      ? (() => { const d = detail as CentralControlGroupDetail; return { id, code: d.code, title: d.title, type, status: d.status, parentId: d.parentGroupId, sortOrder: d.sortOrder, children: [] }; })()
      : (() => { const d = detail as CentralControlDetail; return { id, code: d.code, title: d.title, type, status: d.status, parentId: d.controlGroupId, sortOrder: Number.MAX_SAFE_INTEGER, children: [] }; })();
    setSelectedNode(node); setSelectedDetail(detail); setExpansionAnchorId(node.parentId ?? node.id); setModalValue(detail); setModalParentId(node.parentId);
  }, [fetchDetail, loadRows]);

  const submitControl = useCallback(async (payload: CreateCentralControlCommand | UpdateCentralControlCommand) => {
    setBusy(true); setObjectError(null); setDocumentError(null);
    try {
      const result = modalMode === "create" ? await centralControlApi.create(payload as CreateCentralControlCommand) : await centralControlApi.update((modalValue as CentralControlDetail).id, payload as UpdateCentralControlCommand);
      setDirty(false); await refreshSelection("CONTROL", result.entityId); setModalMode("view"); return true;
    } catch (error) {
      setDocumentError(toDocumentAggregateDraftError(error)); setObjectError(mapError(error, t(modalMode === "create" ? "control.errors.create" : "control.errors.update"))); return false;
    } finally { setBusy(false); }
  }, [mapError, modalMode, modalValue, refreshSelection, t]);

  const submitGroup = useCallback(async (payload: CreateCentralControlGroupCommand | UpdateCentralControlGroupCommand) => {
    setBusy(true); setObjectError(null);
    try {
      const result = modalMode === "create" ? await centralControlApi.createGroup(payload as CreateCentralControlGroupCommand) : await centralControlApi.updateGroup((modalValue as CentralControlGroupDetail).id, payload as UpdateCentralControlGroupCommand);
      setDirty(false); await refreshSelection("GROUP", result.entityId); setModalMode("view"); return true;
    } catch (error) { setObjectError(mapError(error, t(modalMode === "create" ? "control.errors.createGroup" : "control.errors.updateGroup"))); return false; }
    finally { setBusy(false); }
  }, [mapError, modalMode, modalValue, refreshSelection, t]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;
    setBusy(true);
    try {
      if (deleteCandidate.type === "GROUP") await centralControlApi.deleteGroup(deleteCandidate.id, Number((selectedDetail as CentralControlGroupDetail | null)?.version ?? 0));
      else await centralControlApi.delete(deleteCandidate.id, Number((selectedDetail as CentralControlDetail | null)?.version ?? 0));
      setDeleteCandidate(null); setSelectedNode(null); setSelectedDetail(null); await loadRows();
    } catch (error) { setPageError(mapError(error, t("control.errors.delete"))); }
    finally { setBusy(false); }
  }, [deleteCandidate, loadRows, mapError, selectedDetail, t]);

  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const listColumn = createElement("div", { slot: "startColumn", dir: appDir, className: "controlFclColumn" }, <CentralControlListReport groups={groups} controls={controls} selectedId={selectedNode?.id ?? null} expansionAnchorId={expansionAnchorId} searchText={searchText} busy={busy} error={!modalOpen ? pageError : null} canCreate={permissions.create} canDelete={permissions.delete} allowedCreateTypes={allowedCreateTypes} onErrorClose={() => setPageError(null)} onSearchTextChange={setSearchText} onCreate={startCreate} onShow={showSelected} onDelete={() => selectedNode && setDeleteCandidate(selectedNode)} onSelect={selectNode} />);
  const midColumn = selectedDetail && selectedNode ? createElement("div", { slot: "midColumn", dir: appDir, className: "controlFclColumn" }, <CentralControlSummaryPanel type={selectedNode.type} value={selectedDetail} busy={busy} canEdit={permissions.update} onEdit={editSelected} onCancel={() => { setSelectedNode(null); setSelectedDetail(null); }} />) : null;
  const dialogTitle = modalMode === "create" ? t(modalType === "GROUP" ? "control.group.createTitle" : "control.create.title") : modalMode === "edit" ? t(modalType === "GROUP" ? "control.group.editTitle" : "control.edit.title") : t(modalType === "GROUP" ? "control.group.viewTitle" : "control.view.title");
  const modalContentReady = modalMode === "create" || Boolean(modalValue);

  return <>
    {createElement("ui5-flexible-column-layout", { layout: fclLayout, dir: appDir, "disable-resizing": true, className: "controlFcl" }, listColumn, midColumn)}
    <Dialog open={modalOpen} accessibleName={dialogTitle} className="controlObjectDialog" onClose={(event) => { if (isOwnDialogCloseEvent(event)) closeObject(); }}>
      <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
      <div className="controlDialogContent" dir={appDir}>
        {modalOpen && modalContentReady ? (
          modalType === "GROUP" ? (
            <CentralControlGroupObjectPage
              key={`${modalMode === "create" ? "create" : modalValue?.id}:GROUP:${modalMode}`}
              mode={modalMode}
              value={modalMode === "create" ? null : modalValue as CentralControlGroupDetail}
              initialParentId={modalParentId}
              groups={groups}
              busy={busy}
              error={objectError}
              onErrorClose={() => setObjectError(null)}
              onSubmit={submitGroup}
              onCancel={closeObject}
              onEdit={() => setModalMode("edit")}
              onDirtyChange={setDirty}
            />
          ) : (
            <CentralControlObjectPage
              key={`${modalMode === "create" ? "create" : modalValue?.id}:CONTROL:${modalMode}`}
              mode={modalMode}
              value={modalMode === "create" ? null : modalValue as CentralControlDetail}
              initialControlGroupId={modalParentId}
              groups={groups}
              activeTab={activeTab}
              busy={busy}
              permissions={permissions}
              error={objectError}
              documentError={documentError}
              onErrorClose={() => setObjectError(null)}
              onSubmit={submitControl}
              onCancel={closeObject}
              onEdit={() => setModalMode("edit")}
              onActiveTabChange={setActiveTab}
              onDirtyChange={setDirty}
            />
          )
        ) : modalOpen && busy ? (
          <BusyIndicator active delay={0} />
        ) : modalOpen ? (
          <MessageStrip design="Information" hideCloseButton>{t("control.errors.notFound")}</MessageStrip>
        ) : null}
      </div>
    </Dialog>
    <DeleteConfirmDialog open={leaveConfirmationOpen || blocker.state === "blocked"} title={t("common.unsavedChanges.title", { defaultValue: "تغییرات ذخیره‌نشده" })} message={t("common.unsavedChanges.message", { defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟" })} confirmText={t("common.unsavedChanges.leave", { defaultValue: "خروج" })} cancelText={t("common.unsavedChanges.stay", { defaultValue: "ماندن" })} loading={false} onClose={stay} onConfirm={confirmLeave} />
    <DeleteConfirmDialog open={Boolean(deleteCandidate)} title={t("control.delete.title")} message={t("control.delete.confirm", { title: deleteCandidate?.title ?? "" })} confirmText={t("common.delete", { defaultValue: "حذف" })} cancelText={t("common.cancel", { defaultValue: "انصراف" })} loading={busy} onClose={() => setDeleteCandidate(null)} onConfirm={confirmDelete} />
  </>;
}
