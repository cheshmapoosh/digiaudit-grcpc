import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import { toDocumentAggregateDraftError, type DocumentAggregateDraftError } from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CentralAccountGroupListReport from "../components/CentralAccountGroupListReport";
import CentralAccountGroupSummaryPanel from "../components/CentralAccountGroupSummaryPanel";
import type {
  CentralAccountGroupDetail,
  CentralAccountGroupSummary,
  CreateCentralAccountGroupCommand,
  EditCentralAccountGroupCommand,
  UpdateCentralAccountGroupCommand,
} from "../domain/centralAccountGroup.model";
import { centralAccountGroupApi } from "../infra/centralAccountGroup.api";
import type { CentralAccountGroupTreeNode } from "../utils/centralAccountGroup.tree";
import CentralAccountGroupObjectPage, {
  type CentralAccountGroupObjectMode,
  type CentralAccountGroupTabKey,
} from "./CentralAccountGroupObjectPage";
import "../accountGroup.css";

type AccountGroupCommand = CreateCentralAccountGroupCommand | EditCentralAccountGroupCommand;
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

function resolveUiDir(): UiDir {
  if (typeof document === "undefined") return "rtl";
  const htmlDir = document.documentElement.getAttribute("dir");
  if (htmlDir === "rtl" || htmlDir === "ltr") return htmlDir;
  const bodyDir = document.body?.getAttribute("dir") ?? document.body?.dir;
  return bodyDir === "ltr" ? "ltr" : "rtl";
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

function isOwnDialogCloseEvent(event: unknown): boolean {
  const closeEvent = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(closeEvent.target && closeEvent.currentTarget && closeEvent.target === closeEvent.currentTarget);
}

function hasDocumentChanges(command: UpdateCentralAccountGroupCommand) {
  return command.documents.newDocuments.length > 0
    || command.documents.newVersions.length > 0
    || command.documents.metadataUpdates.length > 0;
}

export default function CentralAccountGroupsPage() {
  const { t } = useTranslation();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_ACCOUNT_GROUP");
  const [rows, setRows] = useState<CentralAccountGroupSummary[]>([]);
  const [selectedNode, setSelectedNode] = useState<CentralAccountGroupTreeNode | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CentralAccountGroupDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expansionAnchorId, setExpansionAnchorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CentralAccountGroupObjectMode>("view");
  const [modalValue, setModalValue] = useState<CentralAccountGroupDetail | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CentralAccountGroupTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralAccountGroupTreeNode | null>(null);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const { blocker } = useUnsavedChangesGuard(dirty);

  const mapError = useCallback((error: unknown, fallbackKey: string) => {
    const candidate = error as { code?: string; message?: string } | null;
    const code = candidate?.code ?? candidate?.message;
    switch (code) {
      case "DUPLICATE_BUSINESS_KEY":
        return t("accountGroup.errors.duplicateCode");
      case "MASTER_DATA_NOT_FOUND":
      case "NOT_FOUND":
        return t("accountGroup.errors.notFound");
      case "VERSION_CONFLICT":
        return t("accountGroup.errors.versionConflict");
      case "INVALID_PARENT":
      case "INVALID_HIERARCHY_MOVE":
      case "HIERARCHY_CYCLE":
      case "HIERARCHY_SELF_PARENT":
        return t("accountGroup.errors.invalidParent");
      case "DEPENDENCY_EXISTS":
        return t("accountGroup.errors.dependencies");
      default:
        return t(fallbackKey);
    }
  }, [t]);

  const requestLeave = useCallback((action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
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
      const next = await centralAccountGroupApi.list();
      if (request !== listGeneration.current) return;
      setRows(next);
      setPageError(null);
    } catch (error) {
      if (request === listGeneration.current) setPageError(mapError(error, "accountGroup.errors.loadList"));
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [mapError]);

  const loadDetail = useCallback(async (id: string) => {
    const request = ++detailGeneration.current;
    setBusy(true);
    try {
      const detail = await centralAccountGroupApi.detail(id);
      if (request !== detailGeneration.current) return null;
      setPageError(null);
      return detail;
    } catch (error) {
      if (request === detailGeneration.current) setPageError(mapError(error, "accountGroup.errors.loadDetail"));
      return null;
    } finally {
      if (request === detailGeneration.current) setBusy(false);
    }
  }, [mapError]);

  useEffect(() => {
    void loadRows();
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
    };
  }, [loadRows]);

  const parentLabel = useCallback((id: string | null | undefined) => {
    if (!id) return "";
    const parent = rows.find((row) => row.id === id);
    return parent ? `${parent.code} — ${parent.title}` : id;
  }, [rows]);

  const selectNode = useCallback((node: CentralAccountGroupTreeNode) => {
    requestLeave(() => {
      setSelectedNode(node);
      setExpansionAnchorId(node.id);
      setObjectError(null);
      setDocumentError(null);
      void (async () => {
        const detail = await loadDetail(node.id);
        if (detail) setSelectedDetail(detail);
      })();
    });
  }, [loadDetail, requestLeave]);

  const startCreate = useCallback(() => {
    requestLeave(() => {
      setCreateParentId(selectedNode?.id ?? null);
      setModalMode("create");
      setModalValue(null);
      setActiveTab("general");
      setObjectError(null);
      setDocumentError(null);
      setModalOpen(true);
    });
  }, [requestLeave, selectedNode?.id]);

  const showSelected = useCallback(() => {
    if (!selectedDetail) return;
    requestLeave(() => {
      setModalMode("view");
      setModalValue(selectedDetail);
      setCreateParentId(selectedDetail.parentAccountGroupId);
      setActiveTab("general");
      setObjectError(null);
      setDocumentError(null);
      setModalOpen(true);
    });
  }, [requestLeave, selectedDetail]);

  const editSelected = useCallback(() => {
    if (!selectedDetail) return;
    setModalMode("edit");
    setModalValue(selectedDetail);
    setCreateParentId(selectedDetail.parentAccountGroupId);
    setObjectError(null);
    setDocumentError(null);
    setModalOpen(true);
  }, [selectedDetail]);

  const closeObject = useCallback(() => {
    requestLeave(() => {
      setDirty(false);
      setModalOpen(false);
      setModalValue(null);
      setObjectError(null);
      setDocumentError(null);
      setActiveTab("general");
    });
  }, [requestLeave]);

  const submit = useCallback(async (payload: AccountGroupCommand) => {
    setBusy(true);
    setObjectError(null);
    setDocumentError(null);
    try {
      let entityId: string;
      if (modalMode === "create") {
        const result = await centralAccountGroupApi.create(payload as CreateCentralAccountGroupCommand);
        entityId = result.entityId;
      } else {
        const current = modalValue!;
        const command = payload as EditCentralAccountGroupCommand;
        let version = current.version;
        const definitionChanged =
          current.title !== command.title
          || (current.description ?? null) !== command.description
          || current.importance !== command.importance
          || current.reasonableAssurance !== command.reasonableAssurance
          || (current.validFrom ?? null) !== command.validFrom
          || (current.validTo ?? null) !== command.validTo
          || hasDocumentChanges(command);
        if (definitionChanged) {
          const updateResult = await centralAccountGroupApi.update(current.id, {
            version,
            title: command.title,
            importance: command.importance,
            reasonableAssurance: command.reasonableAssurance,
            description: command.description,
            validFrom: command.validFrom,
            validTo: command.validTo,
            documents: command.documents,
          });
          version = updateResult.version;
        }
        if (
          current.parentAccountGroupId !== command.parentAccountGroupId
          || current.sortOrder !== command.sortOrder
        ) {
          const moveResult = await centralAccountGroupApi.move(current.id, {
            version,
            parentAccountGroupId: command.parentAccountGroupId,
            sortOrder: command.sortOrder,
          });
          version = moveResult.version;
        }
        if (current.status !== command.status) {
          const lifecycleResult = await centralAccountGroupApi.lifecycle(
            current.id,
            command.status === "ACTIVE" ? "activate" : "inactivate",
            version,
          );
          version = lifecycleResult.version;
        }
        entityId = current.id;
      }

      setDirty(false);
      await loadRows();
      const detail = await centralAccountGroupApi.detail(entityId);
      const node: CentralAccountGroupTreeNode = { ...detail, children: [] };
      setSelectedNode(node);
      setSelectedDetail(detail);
      setExpansionAnchorId(detail.parentAccountGroupId ?? detail.id);
      setModalValue(detail);
      setModalMode("view");
      return true;
    } catch (error) {
      setDocumentError(toDocumentAggregateDraftError(error));
      setObjectError(mapError(error, modalMode === "create" ? "accountGroup.errors.create" : "accountGroup.errors.update"));
      return false;
    } finally {
      setBusy(false);
    }
  }, [loadRows, mapError, modalMode, modalValue]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate || !selectedDetail) return;
    setBusy(true);
    try {
      await centralAccountGroupApi.lifecycle(deleteCandidate.id, "delete", selectedDetail.version);
      setDeleteCandidate(null);
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorId(null);
      await loadRows();
    } catch (error) {
      setDeleteCandidate(null);
      setPageError(mapError(error, "accountGroup.errors.delete"));
    } finally {
      setBusy(false);
    }
  }, [deleteCandidate, loadRows, mapError, selectedDetail]);

  const clearSelection = useCallback(() => {
    requestLeave(() => {
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorId(null);
    });
  }, [requestLeave]);

  const selectedParentLabel = selectedDetail ? parentLabel(selectedDetail.parentAccountGroupId) : "";
  const initialModalParentId = modalMode === "create"
    ? createParentId
    : modalValue?.parentAccountGroupId ?? null;
  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const dialogTitle = t(`accountGroup.${modalMode}.title`);

  const startColumn = createElement(
    "div",
    { slot: "startColumn", dir: appDir, className: "accountGroupFclColumn" },
    <CentralAccountGroupListReport
      rows={rows}
      selectedId={selectedNode?.id ?? null}
      expansionAnchorId={expansionAnchorId}
      searchText={searchText}
      busy={busy}
      error={!modalOpen ? pageError : null}
      canCreate={permissions.create}
      canDelete={permissions.delete}
      onErrorClose={() => setPageError(null)}
      onSearchTextChange={setSearchText}
      onCreate={startCreate}
      onShow={showSelected}
      onDelete={() => selectedNode && setDeleteCandidate(selectedNode)}
      onSelect={selectNode}
    />,
  );

  const midColumn = selectedDetail
    ? createElement(
        "div",
        { slot: "midColumn", dir: appDir, className: "accountGroupFclColumn" },
        <CentralAccountGroupSummaryPanel
          value={selectedDetail}
          parentLabel={selectedParentLabel}
          busy={busy}
          canEdit={permissions.update}
          onEdit={editSelected}
          onCancel={clearSelection}
        />,
      )
    : null;

  const handleDialogClose = useCallback((event: unknown) => {
    if (isOwnDialogCloseEvent(event)) closeObject();
  }, [closeObject]);

  return (
    <>
      {createElement(
        "ui5-flexible-column-layout",
        {
          layout: fclLayout,
          dir: appDir,
          "disable-resizing": true,
          className: "accountGroupFcl",
        },
        startColumn,
        midColumn,
      )}

      <Dialog
        open={modalOpen}
        accessibleName={dialogTitle}
        className="accountGroupObjectDialog"
        onClose={handleDialogClose}
      >
        <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
        <div className="accountGroupDialogContent" dir={appDir}>
          {modalMode === "create" || modalValue ? (
            <CentralAccountGroupObjectPage
              key={`${modalMode === "create" ? "create" : modalValue?.id}:${modalMode}`}
              mode={modalMode}
              value={modalMode === "create" ? null : modalValue}
              rows={rows}
              initialParentId={initialModalParentId}
              activeTab={activeTab}
              busy={busy}
              permissions={permissions}
              error={objectError}
              documentError={documentError}
              onErrorClose={() => setObjectError(null)}
              onSubmit={submit}
              onCancel={closeObject}
              onEdit={() => setModalMode("edit")}
              onActiveTabChange={setActiveTab}
              onDirtyChange={setDirty}
            />
          ) : busy ? (
            <BusyIndicator active delay={0} />
          ) : (
            <MessageStrip design="Information" hideCloseButton>{t("accountGroup.errors.notFound")}</MessageStrip>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={leaveConfirmationOpen || blocker.state === "blocked"}
        title={t("common.unsavedChanges.title", { defaultValue: "تغییرات ذخیره‌نشده" })}
        message={t("common.unsavedChanges.message", { defaultValue: "تغییرات ذخیره‌نشده نادیده گرفته شود؟" })}
        confirmText={t("common.unsavedChanges.leave", { defaultValue: "خروج" })}
        cancelText={t("common.unsavedChanges.stay", { defaultValue: "ماندن" })}
        loading={false}
        onClose={stay}
        onConfirm={confirmLeave}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteCandidate)}
        title={t("accountGroup.delete.title")}
        message={t("accountGroup.delete.confirm", { title: deleteCandidate?.title ?? "" })}
        confirmText={t("common.delete", { defaultValue: "حذف" })}
        cancelText={t("common.cancel", { defaultValue: "انصراف" })}
        loading={busy}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
