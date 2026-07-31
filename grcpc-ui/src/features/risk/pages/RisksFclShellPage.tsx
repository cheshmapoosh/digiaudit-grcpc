import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Dialog, MessageStrip } from "@ui5/webcomponents-react";

import type {
  RiskNode,
  RiskNodeCreate,
  RiskNodeType,
  RiskNodeUpdate,
} from "../domain/risk.model";
import { ROOT_PARENT, useRiskState } from "../state/risk.state";
import {
  canCreateChild,
  defaultChildType,
  hasChildren,
  sortRisks,
} from "../utils/risk.tree";

import RiskSummaryPanel from "../components/RiskSummaryPanel";
import RisksListReport from "./RisksListReport";
import RiskObjectPage from "./RiskObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
const DIALOG_WIDTH = "90vw";

function useRiskRouteMode(): RouteMode {
  const { riskId } = useParams();
  const location = useLocation();

  if (location.pathname.endsWith("/new")) {
    return "create";
  }

  if (location.pathname.endsWith("/edit")) {
    return "edit";
  }

  if (riskId) {
    return "view";
  }

  return "list";
}

function isRiskNodeType(value: string | null): value is RiskNodeType {
  return value === "riskCategory" || value === "riskTemplate";
}

function mapError(
  error: unknown,
  fallback: string,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (error instanceof Error && error.message) {
    switch (error.message) {
      case "NOT_FOUND":
        return t("risk.errors.notFound", {
          defaultValue: "Ø¢ÛŒØªÙ… Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯",
        });
      case "PARENT_NOT_FOUND":
        return t("risk.errors.parentNotFound", {
          defaultValue: "ÙˆØ§Ù„Ø¯ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯",
        });
      case "HAS_CHILDREN":
        return t("risk.errors.hasChildren", {
          defaultValue: "Ø§Ù…Ú©Ø§Ù† Ø­Ø°Ù Ø¢ÛŒØªÙ…ÛŒ Ú©Ù‡ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡ Ø¯Ø§Ø±Ø¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯",
        });
      case "INVALID_HIERARCHY":
        return t("risk.errors.invalidHierarchy", {
          defaultValue: "Ø³Ø§Ø®ØªØ§Ø± Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø±ÛŒØ³Ú© Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª",
        });
      default:
        return error.message;
    }
  }

  return fallback;
}

function resolveUiDir(): UiDir {
  if (typeof document === "undefined") {
    return "rtl";
  }

  const htmlDir = document.documentElement.getAttribute("dir");
  if (htmlDir === "rtl" || htmlDir === "ltr") {
    return htmlDir;
  }

  const bodyDir = document.body?.getAttribute("dir") ?? document.body?.dir;
  if (bodyDir === "rtl" || bodyDir === "ltr") {
    return bodyDir;
  }

  return "rtl";
}

function useResolvedUiDir(): UiDir {
  const [dir, setDir] = useState<UiDir>(() => resolveUiDir());

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

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

function isOwnDialogCloseEvent(event: unknown): boolean {
  const closeEvent = event as {
    target?: EventTarget | null;
    currentTarget?: EventTarget | null;
  };

  return Boolean(
    closeEvent.target &&
    closeEvent.currentTarget &&
    closeEvent.target === closeEvent.currentTarget,
  );
}

function resolveDialogTitle(
  routeMode: RouteMode,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (routeMode === "create") {
    return t("risk.create.title", { defaultValue: "Ø§ÛŒØ¬Ø§Ø¯ Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú©" });
  }

  if (routeMode === "edit") {
    return t("risk.edit.title", { defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´ Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú©" });
  }

  if (routeMode === "view") {
    return t("risk.view.title", { defaultValue: "Ù†Ù…Ø§ÛŒØ´ Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú©" });
  }

  return "";
}

const CREATE_NODE_TYPES: RiskNodeType[] = ["riskCategory", "riskTemplate"];

function findNearestCategory(
  start: RiskNode | null,
  nodesById: Record<string, RiskNode>,
): RiskNode | null {
  const visited = new Set<string>();
  let current: RiskNode | null | undefined = start;

  while (current) {
    if (current.nodeType === "riskCategory") {
      return current;
    }

    if (!current.parentId || visited.has(current.parentId)) {
      return null;
    }

    visited.add(current.parentId);
    current = nodesById[current.parentId];
  }

  return null;
}

function resolveCreateParentId(
  nodeType: RiskNodeType,
  selectedItem: RiskNode | null,
  nodesById: Record<string, RiskNode>,
): string | null | undefined {
  if (nodeType === "riskCategory") {
    if (!selectedItem) {
      return null;
    }

    return selectedItem.nodeType === "riskCategory"
      ? selectedItem.id
      : (selectedItem.parentId ?? null);
  }

  const nearestCategory = findNearestCategory(selectedItem, nodesById);
  return nearestCategory?.id;
}

function resolveInvalidCreateMessage(
  nodeType: RiskNodeType,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (nodeType === "riskTemplate") {
    return t("risk.errors.selectCategoryParent", {
      defaultValue: "Ø¨Ø±Ø§ÛŒ Ø§ÛŒØ¬Ø§Ø¯ Ø§Ù„Ú¯ÙˆÛŒ Ø±ÛŒØ³Ú©ØŒ Ø§Ø¨ØªØ¯Ø§ ÛŒÚ© Ø·Ø¨Ù‚Ù‡ Ø±ÛŒØ³Ú© Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯.",
    });
  }

  return t("risk.errors.invalidHierarchy", {
    defaultValue: "Ø³Ø§Ø®ØªØ§Ø± Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø±ÛŒØ³Ú© Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª",
  });
}

function resolveCreateOptions(selectedItem: RiskNode | null): RiskNodeType[] {
  if (!selectedItem) {
    return ["riskCategory"];
  }

  if (selectedItem.nodeType === "riskCategory") {
    return ["riskCategory", "riskTemplate"];
  }

  return ["riskCategory", "riskTemplate"];
}

export default function RisksFclShellPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { riskId } = useParams();

  const routeMode = useRiskRouteMode();
  const appDir = useResolvedUiDir();
  const nodesById = useRiskState((state) => state.nodesById);
  const loading = useRiskState((state) => state.loading);
  const loadChildren = useRiskState((state) => state.loadChildren);
  const createNode = useRiskState((state) => state.createNode);
  const updateNode = useRiskState((state) => state.updateNode);
  const removeNode = useRiskState((state) => state.removeNode);

  const [searchText, setSearchText] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<RiskNode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<
    string | null
  >(null);
  const items = useMemo(() => sortRisks(Object.values(nodesById)), [nodesById]);

  const selectedRouteItem = riskId ? (nodesById[riskId] ?? null) : null;
  const selectedTreeItem = selectedTreeId
    ? (nodesById[selectedTreeId] ?? null)
    : null;

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const queryParentId = queryParams.get("parentId");
  const queryNodeType = queryParams.get("nodeType");

  const selectedParentForCreate = queryParentId
    ? (nodesById[queryParentId] ?? null)
    : null;

  const requestedNodeType = useMemo<RiskNodeType>(() => {
    if (isRiskNodeType(queryNodeType)) {
      return queryNodeType;
    }

    return defaultChildType(selectedParentForCreate?.nodeType ?? null);
  }, [queryNodeType, selectedParentForCreate]);


  useEffect(() => {
    void loadChildren(ROOT_PARENT).catch((error: unknown) => {
      setPageError(
        mapError(
          error,
          t("risk.errors.loadList", {
            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø³Ø§Ø®ØªØ§Ø± Ø±ÛŒØ³Ú©",
          }),
          t,
        ),
      );
    });
  }, [loadChildren, t]);



  const treeSelectedId = useMemo(() => {
    if (routeMode === "create") {
      return queryParentId ?? selectedTreeId;
    }

    if (routeMode === "view" || routeMode === "edit") {
      return riskId ?? selectedTreeId;
    }

    return selectedTreeId;
  }, [riskId, queryParentId, routeMode, selectedTreeId]);

  const treeExpansionAnchorIdValue = useMemo(() => {
    if (routeMode === "create") {
      return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
    }

    if (routeMode === "view" || routeMode === "edit") {
      return riskId ?? selectedTreeId ?? treeExpansionAnchorId;
    }

    return selectedTreeId ?? treeExpansionAnchorId;
  }, [riskId, queryParentId, routeMode, selectedTreeId, treeExpansionAnchorId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedTreeId(id);
    setTreeExpansionAnchorId(id);
    setPageError(null);
    setObjectError(null);
  }, []);

  const handleShow = useCallback(
    (id: string) => {
      setSelectedTreeId(id);
      setTreeExpansionAnchorId(id);
      setPageError(null);
      setObjectError(null);
      navigate(`/risks/${id}`);
    },
    [navigate],
  );

  const handleCreate = useCallback(
    (nodeType: RiskNodeType) => {
      setPageError(null);
      setObjectError(null);
      const selectedId = selectedTreeId ?? riskId ?? null;
      const selectedItem = selectedId ? (nodesById[selectedId] ?? null) : null;
      const parentId = resolveCreateParentId(nodeType, selectedItem, nodesById);
      const parent = parentId ? (nodesById[parentId] ?? null) : null;

      if (
        parentId === undefined ||
        !canCreateChild(parent?.nodeType ?? null, nodeType)
      ) {
        setPageError(resolveInvalidCreateMessage(nodeType, t));
        return;
      }

      const params = new URLSearchParams();

      if (parentId) {
        params.set("parentId", parentId);
      }

      params.set("nodeType", nodeType);
      setTreeExpansionAnchorId(parentId);
      navigate(`/risks/new?${params.toString()}`);
    },
    [navigate, nodesById, riskId, selectedTreeId, t],
  );

  const handleEdit = useCallback(
    (id?: string) => {
      const targetId = id ?? riskId ?? selectedTreeId;

      if (!targetId) {
        return;
      }

      setSelectedTreeId(targetId);
      setTreeExpansionAnchorId(targetId);
      setPageError(null);
      setObjectError(null);
      navigate(`/risks/${targetId}/edit`);
    },
    [navigate, riskId, selectedTreeId],
  );

  const handleCancel = useCallback(() => {
    setObjectError(null);
    setPageError(null);

    const currentAnchorId =
      routeMode === "create"
        ? (queryParentId ?? selectedTreeId)
        : (riskId ?? selectedTreeId);

    if (currentAnchorId) {
      setSelectedTreeId(currentAnchorId);
      setTreeExpansionAnchorId(currentAnchorId);
    }

    navigate("/risks");
  }, [navigate, riskId, queryParentId, routeMode, selectedTreeId]);

  const requestDelete = useCallback(
    (id: string) => {
      const target = nodesById[id];

      if (!target) {
        setPageError(
          t("risk.errors.notFound", { defaultValue: "Ø¢ÛŒØªÙ… Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯" }),
        );
        return;
      }

      if (hasChildren(items, id)) {
        setPageError(
          t("risk.errors.hasChildren", {
            defaultValue: "Ø§Ù…Ú©Ø§Ù† Ø­Ø°Ù Ø¢ÛŒØªÙ…ÛŒ Ú©Ù‡ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡ Ø¯Ø§Ø±Ø¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯",
          }),
        );
        return;
      }

      setDeleteCandidate(target);
    },
    [items, nodesById, t],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      setSubmitting(true);
      setPageError(null);

      const parentId = deleteCandidate.parentId ?? null;
      await removeNode(deleteCandidate.id);
      setDeleteCandidate(null);

      if (parentId) {
        setSelectedTreeId(parentId);
        setTreeExpansionAnchorId(parentId);
        navigate("/risks");
        return;
      }

      setSelectedTreeId(null);
      setTreeExpansionAnchorId(null);
      navigate("/risks");
    } catch (error) {
      setPageError(
        mapError(
          error,
          t("risk.errors.delete", {
            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú©",
          }),
          t,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }, [deleteCandidate, navigate, removeNode, t]);

  const handleObjectSubmit = useCallback(
    async (payload: RiskNodeCreate | RiskNodeUpdate) => {
      try {
        setSubmitting(true);
        setPageError(null);
        setObjectError(null);

        if (routeMode === "create") {
          const createPayload = payload as RiskNodeCreate;
          const created = await createNode(
            createPayload.parentId ?? null,
            createPayload,
          );

          setSelectedTreeId(created.id);
          setTreeExpansionAnchorId(created.id);
          navigate(`/risks/${created.id}`);
          return;
        }

        if (routeMode === "edit" && riskId) {
          await updateNode(riskId, payload as RiskNodeUpdate);
          setSelectedTreeId(riskId);
          setTreeExpansionAnchorId(riskId);
          navigate(`/risks/${riskId}`);
        }
      } catch (error) {
        setObjectError(
          mapError(
            error,
            t("risk.errors.save", {
              defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú©",
            }),
            t,
          ),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      createNode,
      navigate,
      riskId,
      routeMode,
      t,
      updateNode,
    ],
  );

  const showModal =
    routeMode === "create" || routeMode === "view" || routeMode === "edit";

  const handleObjectDialogClose = useCallback(
    (event: unknown) => {
      if (!isOwnDialogCloseEvent(event) || !showModal) {
        return;
      }

      handleCancel();
    },
    [handleCancel, showModal],
  );

  const objectMode =
    routeMode === "create" ? "create" : routeMode === "edit" ? "edit" : "view";

  const objectValue = routeMode === "create" ? null : selectedRouteItem;

  const showInlineSummaryPane = Boolean(selectedTreeItem);
  const createOptions = resolveCreateOptions(selectedTreeItem);

  const slotContainerStyle = useMemo<CSSProperties>(
    () => ({
      height: "100%",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      padding: "1rem",
      overflow: "hidden",
      direction: appDir,
      background: "var(--sapBackgroundColor)",
    }),
    [appDir],
  );

  const frameStyle: CSSProperties = {
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    maxWidth: "100%",
    overflow: "auto",
    border: "1px solid var(--sapGroup_ContentBorderColor)",
    borderRadius: "0",
    background: "var(--sapBackgroundColor)",
    boxSizing: "border-box",
    padding: "1rem",
  };

  const dialogContentStyle = useMemo<CSSProperties>(
    () => ({
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      maxHeight: "calc(92vh - 8rem)",
      overflow: "auto",
      direction: appDir,
      boxSizing: "border-box",
      padding: "0.25rem",
    }),
    [appDir],
  );

  const dialogStyle = useMemo<CSSProperties>(() => {
    const width = DIALOG_WIDTH;

    return {
      width,
      maxWidth: width,
    };
  }, []);

  const pageGridStyle = useMemo<CSSProperties>(
    () => ({
      height: "calc(100vh - 10rem)",
      minHeight: "36rem",
      minWidth: 0,
      maxWidth: "100%",
      display: "grid",
      gridTemplateColumns: showInlineSummaryPane
        ? appDir === "rtl"
          ? "minmax(0, 40%) minmax(0, 60%)"
          : "minmax(0, 60%) minmax(0, 40%)"
        : "minmax(0, 1fr)",
      gap: showInlineSummaryPane ? "1rem" : 0,
      boxSizing: "border-box",
      overflow: "hidden",
      direction: "ltr",
    }),
    [appDir, showInlineSummaryPane],
  );

  const listColumn = (
    <div dir={appDir} style={slotContainerStyle}>
      <div style={frameStyle}>
        <RisksListReport
          items={items}
          selectedId={treeSelectedId}
          expansionAnchorId={treeExpansionAnchorIdValue}
          searchText={searchText}
          busy={loading || submitting}
          error={!showModal ? pageError : null}
          createOptions={
            createOptions.length ? createOptions : CREATE_NODE_TYPES
          }
          onSearchTextChange={setSearchText}
          onCreate={handleCreate}
          onShow={handleShow}
          onDelete={requestDelete}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );

  const inlineSummaryColumn = showInlineSummaryPane ? (
    <div dir={appDir} style={slotContainerStyle}>
      <div style={frameStyle}>
        <RiskSummaryPanel
          value={selectedTreeItem}
          busy={loading || submitting}
          error={!showModal ? pageError : null}
          onEdit={handleEdit}
          onCancel={() => {
            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
          }}
        />
      </div>
    </div>
  ) : null;

  const orderedColumns =
    appDir === "rtl" && inlineSummaryColumn
      ? [inlineSummaryColumn, listColumn]
      : [listColumn, inlineSummaryColumn];

  const dialogTitle = resolveDialogTitle(routeMode, t);

  return (
    <>
      <div style={pageGridStyle}>{orderedColumns}</div>

      <Dialog
        open={showModal}
        accessibleName={dialogTitle}
        className="riskObjectDialog"
        style={dialogStyle}
        onClose={handleObjectDialogClose}
      >
        <ModalDialogHeader title={dialogTitle} onClose={handleCancel} />
        <div style={dialogContentStyle}>
          {objectMode === "create" || objectValue ? (
            <RiskObjectPage
              key={`${objectValue?.id ?? "new"}:${queryParentId ?? "root"}:${requestedNodeType}`}
              mode={objectMode}
              allItems={items}
              value={objectValue}
              parent={selectedParentForCreate}
              requestedNodeType={requestedNodeType}
              busy={loading || submitting}
              error={objectError}
              onErrorClose={() => setObjectError(null)}
              onSubmit={handleObjectSubmit}
              onCancel={handleCancel}
              onEdit={() => handleEdit()}
            />
          ) : (
            <MessageStrip design="Information" hideCloseButton>
              {t("risk.object.notFound", {
                defaultValue: "Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú© Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯.",
              })}
            </MessageStrip>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleteCandidate)}
        title={t("risk.delete.title", { defaultValue: "Ø­Ø°Ù Ø¢ÛŒØªÙ… Ø±ÛŒØ³Ú©" })}
        message={t("risk.delete.confirm", {
          defaultValue: 'Ø¢ÛŒØ§ Ø§Ø² Ø­Ø°Ù "{{title}}" Ù…Ø·Ù…Ø¦Ù† Ù‡Ø³ØªÛŒØ¯ØŸ',
          title: deleteCandidate?.title ?? "",
        })}
        confirmText={t("common.delete", { defaultValue: "Ø­Ø°Ù" })}
        cancelText={t("common.cancel", { defaultValue: "Ø§Ù†ØµØ±Ø§Ù" })}
        loading={submitting}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </>
  );
}
