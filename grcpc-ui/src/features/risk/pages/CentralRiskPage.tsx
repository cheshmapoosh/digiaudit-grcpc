import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  toDocumentAggregateDraftError,
  type DocumentAggregateDraftError,
  type DocumentAggregateRequest,
} from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CentralRiskListReport from "../components/CentralRiskListReport";
import CentralRiskSummaryPanel from "../components/CentralRiskSummaryPanel";
import type {
  CentralRiskCategoryDetail,
  CentralRiskCategorySummary,
  CentralRiskCreateKind,
  CentralRiskNodeKind,
  CentralRiskTemplateDetail,
  CentralRiskTemplateSummary,
  CreateCentralRiskCategoryCommand,
  CreateCentralRiskTemplateCommand,
  EditCentralRiskCategoryCommand,
  EditCentralRiskTemplateCommand,
  UpdateCentralRiskCategoryCommand,
  UpdateCentralRiskTemplateCommand,
} from "../domain/centralRisk.model";
import { centralRiskApi } from "../infra/centralRisk.api";
import { riskNodeKey, type CentralRiskTreeNode } from "../utils/centralRisk.tree";
import CentralRiskObjectPage, { type CentralRiskObjectMode, type CentralRiskTabKey } from "./CentralRiskObjectPage";
import "../risk.css";

type RiskDetail = CentralRiskCategoryDetail | CentralRiskTemplateDetail;
type RiskCommand =
  | CreateCentralRiskCategoryCommand
  | EditCentralRiskCategoryCommand
  | CreateCentralRiskTemplateCommand
  | EditCentralRiskTemplateCommand;
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

function hasDocumentChanges(documents: DocumentAggregateRequest): boolean {
  return documents.newDocuments.length > 0
    || documents.newVersions.length > 0
    || documents.metadataUpdates.length > 0;
}

function categoryDefinitionChanged(
  current: CentralRiskCategoryDetail,
  edit: EditCentralRiskCategoryCommand,
): boolean {
  return current.title !== edit.title
    || (current.description ?? null) !== edit.description
    || (current.validFrom ?? null) !== edit.validFrom
    || (current.validTo ?? null) !== edit.validTo
    || hasDocumentChanges(edit.documents);
}

function templateDefinitionChanged(
  current: CentralRiskTemplateDetail,
  edit: EditCentralRiskTemplateCommand,
): boolean {
  return current.title !== edit.title
    || current.riskType !== edit.riskType
    || (current.description ?? null) !== edit.description
    || (current.validFrom ?? null) !== edit.validFrom
    || (current.validTo ?? null) !== edit.validTo
    || hasDocumentChanges(edit.documents);
}

export default function CentralRiskPage() {
  const { t } = useTranslation();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_RISK");
  const [categories, setCategories] = useState<CentralRiskCategorySummary[]>([]);
  const [templates, setTemplates] = useState<CentralRiskTemplateSummary[]>([]);
  const [selectedNode, setSelectedNode] = useState<CentralRiskTreeNode | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<RiskDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [expansionAnchorKey, setExpansionAnchorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<CentralRiskNodeKind>("category");
  const [modalMode, setModalMode] = useState<CentralRiskObjectMode>("view");
  const [modalValue, setModalValue] = useState<RiskDetail | null>(null);
  const [createParentCategoryId, setCreateParentCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CentralRiskTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralRiskTreeNode | null>(null);
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
        return t("risk.errors.duplicateCode");
      case "MASTER_DATA_NOT_FOUND":
      case "NOT_FOUND":
        return t("risk.errors.notFound");
      case "VERSION_CONFLICT":
        return t("risk.errors.versionConflict");
      case "INVALID_PARENT":
      case "INVALID_HIERARCHY_MOVE":
      case "HIERARCHY_SELF_PARENT":
      case "HIERARCHY_CYCLE":
      case "PARENT_NOT_FOUND":
        return t("risk.errors.invalidParent");
      case "DEPENDENCY_EXISTS":
        return t("risk.errors.dependencies");
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

  const loadLists = useCallback(async () => {
    const request = ++listGeneration.current;
    setBusy(true);
    try {
      const [categoryRows, templateRows] = await Promise.all([
        centralRiskApi.listCategories(),
        centralRiskApi.listTemplates(),
      ]);
      if (request !== listGeneration.current) return;
      setCategories(categoryRows);
      setTemplates(templateRows);
      setPageError(null);
    } catch (error) {
      if (request === listGeneration.current) setPageError(mapError(error, "risk.errors.loadList"));
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [mapError]);

  const loadDetail = useCallback(async (kind: CentralRiskNodeKind, id: string) => {
    const request = ++detailGeneration.current;
    setBusy(true);
    try {
      const detail = kind === "category"
        ? await centralRiskApi.category(id)
        : await centralRiskApi.template(id);
      if (request !== detailGeneration.current) return null;
      setPageError(null);
      return detail as RiskDetail;
    } catch (error) {
      if (request === detailGeneration.current) setPageError(mapError(error, "risk.errors.loadDetail"));
      return null;
    } finally {
      if (request === detailGeneration.current) setBusy(false);
    }
  }, [mapError]);

  useEffect(() => {
    void loadLists();
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
    };
  }, [loadLists]);

  const categoryLabel = useCallback((id: string | null | undefined) => {
    if (!id) return "";
    const category = categories.find((item) => item.id === id);
    return category ? `${category.code} — ${category.title}` : id;
  }, [categories]);

  const contextCategoryId = useMemo(() => {
    if (!selectedNode) return null;
    return selectedNode.kind === "category" ? selectedNode.id : selectedNode.parentCategoryId;
  }, [selectedNode]);

  const selectNode = useCallback((node: CentralRiskTreeNode) => {
    requestLeave(() => {
      setSelectedNode(node);
      setExpansionAnchorKey(node.key);
      setObjectError(null);
      setDocumentError(null);
      void (async () => {
        const detail = await loadDetail(node.kind, node.id);
        if (detail) setSelectedDetail(detail);
      })();
    });
  }, [loadDetail, requestLeave]);

  const startCreate = useCallback((kind: CentralRiskCreateKind) => {
    requestLeave(() => {
      const parentCategoryId = selectedNode
        ? selectedNode.kind === "category"
          ? selectedNode.id
          : selectedNode.parentCategoryId
        : null;
      if (kind === "template" && !parentCategoryId) return;
      setModalKind(kind);
      setModalMode("create");
      setModalValue(null);
      setCreateParentCategoryId(parentCategoryId);
      setActiveTab("general");
      setObjectError(null);
      setDocumentError(null);
      setModalOpen(true);
    });
  }, [requestLeave, selectedNode]);

  const showSelected = useCallback(() => {
    if (!selectedNode || !selectedDetail) return;
    requestLeave(() => {
      setModalKind(selectedNode.kind);
      setModalMode("view");
      setModalValue(selectedDetail);
      setCreateParentCategoryId(
        selectedNode.kind === "category"
          ? (selectedDetail as CentralRiskCategoryDetail).parentCategoryId
          : (selectedDetail as CentralRiskTemplateDetail).riskCategoryId,
      );
      setActiveTab("general");
      setObjectError(null);
      setDocumentError(null);
      setModalOpen(true);
    });
  }, [requestLeave, selectedDetail, selectedNode]);

  const editSelected = useCallback(() => {
    if (!selectedNode || !selectedDetail) return;
    setModalKind(selectedNode.kind);
    setModalMode("edit");
    setModalValue(selectedDetail);
    setCreateParentCategoryId(
      selectedNode.kind === "category"
        ? (selectedDetail as CentralRiskCategoryDetail).parentCategoryId
        : (selectedDetail as CentralRiskTemplateDetail).riskCategoryId,
    );
    setObjectError(null);
    setDocumentError(null);
    setModalOpen(true);
  }, [selectedDetail, selectedNode]);

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

  const submit = useCallback(async (payload: RiskCommand) => {
    setBusy(true);
    setObjectError(null);
    setDocumentError(null);
    try {
      let entityId: string;

      if (modalMode === "create") {
        const result = modalKind === "category"
          ? await centralRiskApi.createCategory(payload as CreateCentralRiskCategoryCommand)
          : await centralRiskApi.createTemplate(payload as CreateCentralRiskTemplateCommand);
        entityId = result.entityId;
      } else if (modalKind === "category") {
        const current = modalValue as CentralRiskCategoryDetail;
        const edit = payload as EditCentralRiskCategoryCommand;
        let version = current.version;

        if (categoryDefinitionChanged(current, edit)) {
          const definition: UpdateCentralRiskCategoryCommand = {
            version,
            title: edit.title,
            description: edit.description,
            validFrom: edit.validFrom,
            validTo: edit.validTo,
            documents: edit.documents,
          };
          const result = await centralRiskApi.updateCategory(current.id, definition);
          version = result.version;
        }

        if (current.parentCategoryId !== edit.parentCategoryId) {
          const result = await centralRiskApi.moveCategory(current.id, {
            version,
            parentCategoryId: edit.parentCategoryId,
            sortOrder: edit.sortOrder,
          });
          version = result.version;
        }

        if (current.status !== edit.status) {
          const result = await centralRiskApi.categoryLifecycle(
            current.id,
            edit.status === "ACTIVE" ? "activate" : "inactivate",
            version,
          );
          version = result.version;
        }
        entityId = current.id;
      } else {
        const current = modalValue as CentralRiskTemplateDetail;
        const edit = payload as EditCentralRiskTemplateCommand;
        let version = current.version;

        if (templateDefinitionChanged(current, edit)) {
          const definition: UpdateCentralRiskTemplateCommand = {
            version,
            title: edit.title,
            riskType: edit.riskType,
            description: edit.description,
            validFrom: edit.validFrom,
            validTo: edit.validTo,
            documents: edit.documents,
          };
          const result = await centralRiskApi.updateTemplate(current.id, definition);
          version = result.version;
        }

        if (current.riskCategoryId !== edit.riskCategoryId) {
          const result = await centralRiskApi.moveTemplate(current.id, {
            version,
            riskCategoryId: edit.riskCategoryId,
            sortOrder: edit.sortOrder,
          });
          version = result.version;
        }

        if (current.status !== edit.status) {
          const result = await centralRiskApi.templateLifecycle(
            current.id,
            edit.status === "ACTIVE" ? "activate" : "inactivate",
            version,
          );
          version = result.version;
        }
        entityId = current.id;
      }

      setDirty(false);
      await loadLists();
      const detail = modalKind === "category"
        ? await centralRiskApi.category(entityId)
        : await centralRiskApi.template(entityId);
      const node: CentralRiskTreeNode = modalKind === "category"
        ? {
            key: riskNodeKey("category", detail.id),
            id: detail.id,
            kind: "category",
            code: detail.code,
            title: detail.title,
            status: detail.status,
            sortOrder: detail.sortOrder,
            parentCategoryId: (detail as CentralRiskCategoryDetail).parentCategoryId,
            children: [],
          }
        : {
            key: riskNodeKey("template", detail.id),
            id: detail.id,
            kind: "template",
            code: detail.code,
            title: detail.title,
            status: detail.status,
            sortOrder: detail.sortOrder,
            parentCategoryId: (detail as CentralRiskTemplateDetail).riskCategoryId,
            children: [],
          };
      setSelectedNode(node);
      setSelectedDetail(detail as RiskDetail);
      setExpansionAnchorKey(
        node.kind === "template" && node.parentCategoryId
          ? riskNodeKey("category", node.parentCategoryId)
          : node.parentCategoryId
            ? riskNodeKey("category", node.parentCategoryId)
            : node.key,
      );
      setModalValue(detail as RiskDetail);
      setModalMode("view");
      return true;
    } catch (error) {
      setDocumentError(toDocumentAggregateDraftError(error));
      setObjectError(mapError(error, modalMode === "create" ? "risk.errors.create" : "risk.errors.update"));
      return false;
    } finally {
      setBusy(false);
    }
  }, [loadLists, mapError, modalKind, modalMode, modalValue]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate || !selectedDetail) return;
    setBusy(true);
    try {
      if (deleteCandidate.kind === "category") {
        await centralRiskApi.categoryLifecycle(deleteCandidate.id, "delete", selectedDetail.version);
      } else {
        await centralRiskApi.templateLifecycle(deleteCandidate.id, "delete", selectedDetail.version);
      }
      setDeleteCandidate(null);
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorKey(null);
      await loadLists();
    } catch (error) {
      setDeleteCandidate(null);
      setPageError(mapError(error, "risk.errors.delete"));
    } finally {
      setBusy(false);
    }
  }, [deleteCandidate, loadLists, mapError, selectedDetail]);

  const clearSelection = useCallback(() => {
    requestLeave(() => {
      setSelectedNode(null);
      setSelectedDetail(null);
      setExpansionAnchorKey(null);
    });
  }, [requestLeave]);

  const selectedParentLabel = selectedNode && selectedDetail
    ? selectedNode.kind === "category"
      ? categoryLabel((selectedDetail as CentralRiskCategoryDetail).parentCategoryId)
      : categoryLabel((selectedDetail as CentralRiskTemplateDetail).riskCategoryId)
    : "";
  const modalParentId = modalMode === "create"
    ? createParentCategoryId
    : modalKind === "category"
      ? (modalValue as CentralRiskCategoryDetail | null)?.parentCategoryId ?? null
      : (modalValue as CentralRiskTemplateDetail | null)?.riskCategoryId ?? null;
  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const dialogTitle = t(`risk.${modalKind}.${modalMode}.title`);
  const canEditSelected = permissions.update || permissions.move || permissions.lifecycle;

  const startColumn = createElement(
    "div",
    { slot: "startColumn", dir: appDir, className: "riskFclColumn" },
    <CentralRiskListReport
      categories={categories}
      templates={templates}
      selectedKey={selectedNode?.key ?? null}
      expansionAnchorKey={expansionAnchorKey}
      searchText={searchText}
      contextCategoryId={contextCategoryId}
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

  const midColumn = selectedNode && selectedDetail
    ? createElement(
        "div",
        { slot: "midColumn", dir: appDir, className: "riskFclColumn" },
        <CentralRiskSummaryPanel
          kind={selectedNode.kind}
          value={selectedDetail}
          parentLabel={selectedParentLabel}
          busy={busy}
          canEdit={canEditSelected}
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
          className: "riskFcl",
        },
        startColumn,
        midColumn,
      )}

      <Dialog
        open={modalOpen}
        accessibleName={dialogTitle}
        className="riskObjectDialog"
        onClose={handleDialogClose}
      >
        <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
        <div className="riskDialogContent" dir={appDir}>
          {modalMode === "create" || modalValue ? (
            <CentralRiskObjectPage
              key={`${modalKind}:${modalMode === "create" ? "create" : modalValue?.id}:${modalMode}`}
              kind={modalKind}
              mode={modalMode}
              value={modalMode === "create" ? null : modalValue}
              categories={categories}
              initialParentCategoryId={modalParentId}
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
            <MessageStrip design="Information" hideCloseButton>{t("risk.errors.notFound")}</MessageStrip>
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
        title={t("risk.delete.title")}
        message={t("risk.delete.confirm", { title: deleteCandidate?.title ?? "" })}
        confirmText={t("common.delete", { defaultValue: "حذف" })}
        cancelText={t("common.cancel", { defaultValue: "انصراف" })}
        loading={busy}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
