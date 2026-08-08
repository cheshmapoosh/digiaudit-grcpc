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
import CentralControlListReport from "../components/CentralControlListReport";
import CentralControlSummaryPanel from "../components/CentralControlSummaryPanel";
import type {
  CentralControlDetail,
  CentralControlSummary,
  CreateCentralControlCommand,
  UpdateCentralControlCommand,
} from "../domain/centralControl.model";
import { centralControlApi } from "../infra/centralControl.api.repo";
import CentralControlObjectPage, { type CentralControlTabKey } from "./CentralControlObjectPage";
import "../control.css";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

function useRouteMode(): RouteMode {
  const { controlId } = useParams();
  const location = useLocation();
  if (location.pathname.endsWith("/new")) return "create";
  if (location.pathname.endsWith("/edit")) return "edit";
  if (controlId) return "view";
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
      return t("control.errors.duplicateCode");
    case "MASTER_DATA_NOT_FOUND":
    case "NOT_FOUND":
      return t("control.errors.notFound");
    case "VERSION_CONFLICT":
      return t("control.errors.versionConflict");
    case "INVALID_VALIDITY_RANGE":
    case "DATE_RANGE_INVALID":
      return t("control.validation.invalidValidityRange");
    case "INVALID_LIFECYCLE_TRANSITION":
      return t("control.errors.invalidStatus");
    case "DEPENDENCY_EXISTS":
      return t("control.errors.dependencies");
    default:
      return fallback;
  }
}

function isOwnDialogCloseEvent(event: unknown): boolean {
  const closeEvent = event as { target?: EventTarget | null; currentTarget?: EventTarget | null };
  return Boolean(closeEvent.target && closeEvent.currentTarget && closeEvent.target === closeEvent.currentTarget);
}

export default function CentralControlsFclShellPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { controlId } = useParams();
  const routeMode = useRouteMode();
  const appDir = useResolvedUiDir();
  const permissions = useCatalogActionPermissions("CENTRAL_CONTROL");

  const [items, setItems] = useState<CentralControlSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CentralControlDetail | null>(null);
  const [routeDetail, setRouteDetail] = useState<CentralControlDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<DocumentAggregateDraftError | null>(null);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<CentralControlTabKey>("general");
  const [deleteCandidate, setDeleteCandidate] = useState<CentralControlSummary | null>(null);
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
      const rows = await centralControlApi.list();
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
        setPageError(mapError(error, t("control.errors.loadList"), t));
      }
    } finally {
      if (request === listGeneration.current) setBusy(false);
    }
  }, [t]);

  const loadDetail = useCallback(async (id: string, destination: "summary" | "route") => {
    const request = ++detailGeneration.current;
    setBusy(true);
    try {
      const detail = await centralControlApi.detail(id);
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
        const message = mapError(error, t("control.errors.loadDetail"), t);
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
    if (!controlId || routeMode === "create") return;
    void loadDetail(controlId, "route");
  }, [controlId, loadDetail, routeMode]);

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
      navigate("/controls/new");
    });
  }, [navigate, requestLeave]);

  const handleShow = useCallback((id: string) => {
    requestLeave(() => {
      detailGeneration.current += 1;
      setRouteDetail(null);
      setObjectError(null);
      setDocumentError(null);
      setActiveTab("general");
      navigate(`/controls/${id}`);
    });
  }, [navigate, requestLeave]);

  const handleEdit = useCallback((id?: string) => {
    const targetId = id ?? controlId ?? selectedId;
    if (!targetId) return;
    requestLeave(() => {
      if (routeDetail?.id !== targetId) {
        detailGeneration.current += 1;
        setRouteDetail(null);
      }
      setObjectError(null);
      setDocumentError(null);
      navigate(`/controls/${targetId}/edit`);
    });
  }, [controlId, navigate, requestLeave, routeDetail?.id, selectedId]);

  const closeObject = useCallback(() => {
    requestLeave(() => {
      detailGeneration.current += 1;
      setObjectError(null);
      setDocumentError(null);
      setDirty(false);
      setRouteDetail(null);
      setActiveTab("general");
      navigate("/controls");
    });
  }, [navigate, requestLeave]);

  const submit = useCallback(async (payload: CreateCentralControlCommand | UpdateCentralControlCommand) => {
    setBusy(true);
    setObjectError(null);
    setDocumentError(null);
    detailGeneration.current += 1;
    try {
      const result = routeMode === "create"
        ? await centralControlApi.create(payload as CreateCentralControlCommand)
        : await centralControlApi.update(controlId!, payload as UpdateCentralControlCommand);
      setDirty(false);
      await loadList(result.entityId);
      const detail = await centralControlApi.detail(result.entityId);
      setSelectedId(result.entityId);
      setSelectedDetail(detail);
      setRouteDetail(detail);
      runWithNavigationBypass(() => navigate(`/controls/${result.entityId}`, { replace: true }));
      return true;
    } catch (error) {
      setDocumentError(toDocumentAggregateDraftError(error));
      setObjectError(mapError(error, t(routeMode === "create" ? "control.errors.create" : "control.errors.update"), t));
      return false;
    } finally {
      setBusy(false);
    }
  }, [controlId, loadList, navigate, routeMode, runWithNavigationBypass, t]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;
    setBusy(true);
    try {
      await centralControlApi.delete(deleteCandidate.id, deleteCandidate.version);
      setDeleteCandidate(null);
      if (selectedId === deleteCandidate.id) {
        setSelectedId(null);
        setSelectedDetail(null);
      }
      await loadList();
    } catch (error) {
      setPageError(mapError(error, t("control.errors.delete"), t));
    } finally {
      setBusy(false);
    }
  }, [deleteCandidate, loadList, selectedId, t]);

  const showModal = routeMode !== "list";
  const dialogTitle = routeMode === "create"
    ? t("control.create.title")
    : routeMode === "edit"
      ? t("control.edit.title")
      : t("control.view.title");
  const fclLayout: FclLayout = selectedDetail ? "TwoColumnsStartExpanded" : "OneColumn";
  const routeDetailReady = Boolean(controlId && routeDetail?.id === controlId);

  const listColumn = createElement(
    "div",
    { slot: "startColumn", dir: appDir, className: "controlFclColumn" },
    <CentralControlListReport
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
        { slot: "midColumn", dir: appDir, className: "controlFclColumn" },
        <CentralControlSummaryPanel
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
          className: "controlFcl",
        },
        listColumn,
        midColumn,
      )}

      <Dialog
        open={showModal}
        accessibleName={dialogTitle}
        className="controlObjectDialog"
        onClose={handleDialogClose}
      >
        <ModalDialogHeader title={dialogTitle} onClose={closeObject} />
        <div className="controlDialogContent" dir={appDir}>
          {routeMode === "create" || routeDetailReady ? (
            <CentralControlObjectPage
              key={routeMode === "create" ? "control:create" : `control:${controlId}:${routeMode}`}
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
              {t("control.object.notFound")}
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
        title={t("control.delete.title")}
        message={t("control.delete.confirm", { title: deleteCandidate?.title ?? "" })}
        confirmText={t("common.delete", { defaultValue: "حذف" })}
        cancelText={t("common.cancel", { defaultValue: "انصراف" })}
        loading={busy}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
