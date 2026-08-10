import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Dialog, MessageStrip } from "@ui5/webcomponents-react";
import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { useCatalogActionPermissions } from "@/features/central-catalog/security/catalogPermissions";
import {
  toDocumentAggregateDraftError,
  type DocumentAggregateDraftError,
} from "@/features/document";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CentralControlObjectiveListReport from "../components/CentralControlObjectiveListReport";
import CentralControlObjectiveSummaryPanel from "../components/CentralControlObjectiveSummaryPanel";
import type {
  CentralControlObjectiveDetail,
  CentralControlObjectiveSummary,
  CreateCentralControlObjectiveCommand,
  UpdateCentralControlObjectiveCommand,
} from "../domain/centralControlObjective.model";
import { centralControlObjectiveApi } from "../infra/centralControlObjective.api";
import CentralControlObjectiveObjectPage, { type CentralControlObjectiveTabKey } from "./CentralControlObjectiveObjectPage";
import "../controlObjective.css";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

function useRouteMode(): RouteMode {
  const { controlObjectiveId } = useParams();
  const location = useLocation();
  if (location.pathname.endsWith("/new")) return "create";
  if (location.pathname.endsWith("/edit")) return "edit";
  if (controlObjectiveId) return "view";
  return "list";
}

function resolveUiDir(): UiDir {
  if (typeof document === "undefined") return "rtl";
  const htmlDir = document.documentElement.getAttribute("dir");
  if (htmlDir === "rtl" || htmlDir === "ltr") return htmlDir;
  const bodyDir = document.body?.getAttribute("dir") ?? document.body?.dir;
  if (bodyDir === "rtl" || bodyDir === "ltr") return bodyDir;
  return "rtl";
}

function useResolvedUiDir(): UiDir {
  const [dir, setDir] = useState<UiDir>(() => resolveUiDir());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setDir(resolveUiDir());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["dir"],
      });
    }
    return () => observer.disconnect();
  }, []);

  return dir;
}

function mapError(error: unknown, fallback: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const candidate = error as { code?: string; message?: string } | null;
  const code = candidate?.code ?? candidate?.message;
  switch (code) {
    case "DUPLICATE_BUSINESS_KEY":
      return t("controlObjective.errors.duplicateCode");
    case "MASTER_DATA_NOT_FOUND":
    case "NOT_FOUND":
      return t("controlObjective.errors.notFound");
    case "VERSION_CONFLICT":
      return t("controlObjective.errors.versionConflict");
    case "INVALID_VALIDITY_RANGE":
    case "DATE_RANGE_INVALID":
      return t("controlObjective.validation.invalidValidityRange");
    case "INVALID_LIFECYCLE_TRANSITION":
      return t("controlObjective.errors.invalidStatus");
    case "INVALID_OBJECTIVE_CLASS":
      return t("controlObjective.validation.objectiveClassTooLong");
    case "DEPENDENCY_EXISTS":
      return t("controlObjective.errors.dependencies");
    default:
      return fallback;
  }
}

function isOwnDialogCloseEvent(event: unknown): boolean {
  const closeEvent = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(closeEvent.target && closeEvent.currentTarget && closeEvent.target === closeEvent.currentTarget);
}

export default function CentralControlObjectivesFclShellPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { controlObjectiveId } = useParams();
  const routeMode = useRouteMode();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_CONTROL_OBJECTIVE");

  const [items, setItems] = useState<CentralControlObjectiveSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CentralControlObjectiveDetail | null>(null);
  const [routeDetail, setRouteDetail] = useState<CentralControlObjectiveDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<CentralControlObjectiveTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralControlObjectiveSummary | null>(null);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const { blocker, runWithNavigationBypass } = useUnsavedChangesGuard(dirty);

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
    else if (action) runWithNavigationBypass(action);
  }, [blocker, runWithNavigationBypass]);

  const loadList = useCallback(async (keepId?: string | null) => {
    const request = ++listGeneration.current;
    setBusy(true);
    try {
      const rows = await centralControlObjectiveApi.list();
      if (request !== listGeneration.current) return;
      setItems(rows);
      if (keepId && rows.some((row) => row.id === keepId)) setSelectedId(keepId);
      else if (keepId) {
        setSelectedId(null);
        setSelectedDetail(null);
      }
      setPageError(null);
    } catch (error) {
      if (request === listGeneration.current) {
        setPageError(mapError(error, t("controlObjective.errors.loadList"), t));
      }
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [t]);

  const loadDetail = useCallback(async (id: string, destination: "summary" | "route") => {
    const request = ++detailGeneration.current;
    setBusy(true);
    try {
      const detail = await centralControlObjectiveApi.detail(id);
      if (request !== detailGeneration.current) return null;
      if (destination === "summary") {
        setSelectedId(id);
        setSelectedDetail(detail);
      } else {
        setRouteDetail(detail);
      }
      return detail;
    } catch (error) {
      if (request === detailGeneration.current) {
        const message = mapError(error, t("controlObjective.errors.loadDetail"), t);
        if (destination === "summary") setPageError(message);
        else setObjectError(message);
      }
      return null;
    } finally {
      if (request === detailGeneration.current) setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void loadList();
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
    };
  }, [loadList]);

  useEffect(() => {
    if (!controlObjectiveId || routeMode === "create") return;
    void loadDetail(controlObjectiveId, "route");
  }, [controlObjectiveId, loadDetail, routeMode]);

  const handleSelect = useCallback((id: string) => {
    requestLeave(() => {
      setObjectError(null);
      setDocumentError(null);
      void loadDetail(id, "summary");
    });
  }, [loadDetail, requestLeave]);

  const handleCreate = useCallback(() => {
    requestLeave(() => {
      detailGeneration.current += 1;
      setObjectError(null);
      setDocumentError(null);
      setRouteDetail(null);
      setActiveTab("general");
      navigate("/control-objectives/new");
    });
  }, [navigate, requestLeave]);

  const handleShow = useCallback((id: string) => {
    requestLeave(() => {
      detailGeneration.current += 1;
      setRouteDetail(null);
      setObjectError(null);
      setDocumentError(null);
      setActiveTab("general");
      navigate(`/control-objectives/${id}`);
    });
  }, [navigate, requestLeave]);

  const handleEdit = useCallback((id?: string) => {
    const targetId = id ?? controlObjectiveId ?? selectedId;
    if (!targetId) return;
    requestLeave(() => {
      if (routeDetail?.id !== targetId) {
        detailGeneration.current += 1;
        setRouteDetail(null);
      }
      setObjectError(null);
      setDocumentError(null);
      navigate(`/control-objectives/${targetId}/edit`);
    });
  }, [controlObjectiveId, navigate, requestLeave, routeDetail?.id, selectedId]);

  const closeObject = useCallback(() => {
    requestLeave(() => {
      detailGeneration.current += 1;
      setObjectError(null);
      setDocumentError(null);
      setDirty(false);
      setRouteDetail(null);
      setActiveTab("general");
      navigate("/control-objectives");
    });
  }, [navigate, requestLeave]);

  const submit = useCallback(async (payload: CreateCentralControlObjectiveCommand | UpdateCentralControlObjectiveCommand) => {
    setBusy(true);
    setObjectError(null);
    setDocumentError(null);
    detailGeneration.current += 1;
    try {
      const result = routeMode === "create"
        ? await centralControlObjectiveApi.create(payload as CreateCentralControlObjectiveCommand)
        : await centralControlObjectiveApi.update(controlObjectiveId!, payload as UpdateCentralControlObjectiveCommand);
      setDirty(false);
      await loadList(result.entityId);
      const detail = await centralControlObjectiveApi.detail(result.entityId);
      setSelectedId(result.entityId);
      setSelectedDetail(detail);
      setRouteDetail(detail);
      runWithNavigationBypass(() => navigate(`/control-objectives/${result.entityId}`, { replace: true }));
      return true;
    } catch (error) {
      setDocumentError(toDocumentAggregateDraftError(error));
      setObjectError(mapError(error, t(routeMode === "create" ? "controlObjective.errors.create" : "controlObjective.errors.update"), t));
      return false;
    } finally {
      setBusy(false);
    }
  }, [controlObjectiveId, loadList, navigate, routeMode, runWithNavigationBypass, t]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;
    setBusy(true);
    try {
      await centralControlObjectiveApi.delete(deleteCandidate.id, deleteCandidate.version);
      setDeleteCandidate(null);
      if (selectedId === deleteCandidate.id) {
        setSelectedId(null);
        setSelectedDetail(null);
      }
      await loadList();
    } catch (error) {
      setPageError(mapError(error, t("controlObjective.errors.delete"), t));
    } finally {
      setBusy(false);
    }
  }, [deleteCandidate, loadList, selectedId, t]);

  const showModal = routeMode !== "list";
  const dialogTitle = routeMode === "create"
    ? t("controlObjective.create.title")
    : routeMode === "edit"
      ? t("controlObjective.edit.title")
      : t("controlObjective.view.title");
  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const routeDetailReady = Boolean(controlObjectiveId && routeDetail?.id === controlObjectiveId);

  const listColumn = createElement(
    "div",
    { slot: "startColumn", dir: appDir, className: "controlObjectiveFclColumn" },
    <CentralControlObjectiveListReport
      items={items}
      selectedId={selectedId}
      searchText={searchText}
      busy={busy}
      error={!showModal ? pageError : null}
      canCreate={permissions.create}
      canDelete={permissions.delete}
      onErrorClose={() => setPageError(null)}
      onSearchTextChange={setSearchText}
      onCreate={handleCreate}
      onShow={handleShow}
      onDelete={(id) => setDeleteCandidate(items.find((item) => item.id === id) ?? null)}
      onSelect={handleSelect}
    />,
  );

  const midColumn = selectedDetail
    ? createElement(
        "div",
        { slot: "midColumn", dir: appDir, className: "controlObjectiveFclColumn" },
        <CentralControlObjectiveSummaryPanel
          value={selectedDetail}
          busy={busy}
          canEdit={permissions.update}
          onEdit={handleEdit}
          onCancel={() => {
            setSelectedId(null);
            setSelectedDetail(null);
          }}
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
          className: "controlObjectiveFcl",
        },
        listColumn,
        midColumn,
      )}

      <Dialog
        open={showModal}
        accessibleName={dialogTitle}
        className="controlObjectiveObjectDialog"
        onClose={handleDialogClose}
      >
        <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
        <div className="controlObjectiveDialogContent" dir={appDir}>
          {routeMode === "create" || routeDetailReady ? (
            <CentralControlObjectiveObjectPage
              key={routeMode === "create" ? "controlObjective:create" : `controlObjective:${controlObjectiveId}:${routeMode}`}
              mode={routeMode === "create" ? "create" : routeMode === "edit" ? "edit" : "view"}
              value={routeMode === "create" ? null : routeDetail}
              activeTab={activeTab}
              busy={busy}
              permissions={permissions}
              error={objectError}
              documentError={documentError}
              onErrorClose={() => setObjectError(null)}
              onSubmit={submit}
              onCancel={closeObject}
              onEdit={() => handleEdit(routeDetail?.id)}
              onActiveTabChange={setActiveTab}
              onDirtyChange={setDirty}
            />
          ) : busy ? (
            <BusyIndicator active delay={0} />
          ) : (
            <MessageStrip design="Information" hideCloseButton>
              {t("controlObjective.object.notFound")}
            </MessageStrip>
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
        title={t("controlObjective.delete.title")}
        message={t("controlObjective.delete.confirm", { title: deleteCandidate?.title ?? "" })}
        confirmText={t("common.delete", { defaultValue: "حذف" })}
        cancelText={t("common.cancel", { defaultValue: "انصراف" })}
        loading={busy}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
