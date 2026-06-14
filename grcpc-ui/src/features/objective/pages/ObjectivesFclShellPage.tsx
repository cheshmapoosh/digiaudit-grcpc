import {
    createElement,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { Dialog, MessageStrip } from "@ui5/webcomponents-react";

import type {
    ObjectiveNode,
    ObjectiveNodeCreate,
    ObjectiveNodeType,
    ObjectiveNodeUpdate,
} from "../domain/objective.model";
import { ROOT_PARENT, useObjectiveState } from "../state/objective.state";
import {
    canCreateChild,
    defaultChildType,
    hasChildren,
    sortObjectives,
} from "../utils/objective.tree";

import ObjectiveSummaryPanel from "../components/ObjectiveSummaryPanel";
import ObjectivesListReport from "./ObjectivesListReport";
import ObjectiveObjectPage from "./ObjectiveObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import { useDocumentAttachmentState } from "@/features/document";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_LARGE_VIEWPORT_QUERY = "(min-width: 1600px)";
const DIALOG_NORMAL_WIDTH = "90vw";
const DIALOG_LARGE_WIDTH = "60vw";
const OBJECTIVE_DOCUMENT_TARGET_TYPE = "OBJECTIVE_NODE";
const CREATE_NODE_TYPES: ObjectiveNodeType[] = ["objective"];

function useObjectiveRouteMode(): RouteMode {
    const { objectiveId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (objectiveId) {
        return "view";
    }

    return "list";
}

function isObjectiveNodeType(value: string | null): value is ObjectiveNodeType {
    return value === "objective";
}

function createDocumentTempSessionId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return t("objective.errors.notFound", { defaultValue: "هدف موردنظر یافت نشد" });
            case "PARENT_NOT_FOUND":
                return t("objective.errors.parentNotFound", {
                    defaultValue: "هدف والد انتخاب‌شده یافت نشد",
                });
            case "HAS_CHILDREN":
                return t("objective.errors.hasChildren", {
                    defaultValue: "امکان حذف هدفی که زیرمجموعه دارد وجود ندارد",
                });
            case "INVALID_HIERARCHY":
                return t("objective.errors.invalidHierarchy", {
                    defaultValue: "ساختار انتخاب‌شده برای اهداف معتبر نیست",
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

function resolveMediaQuery(query: string): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia(query).matches;
}

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => resolveMediaQuery(query));

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const mediaQueryList = window.matchMedia(query);
        const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

        mediaQueryList.addEventListener("change", handleChange);

        return () => mediaQueryList.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
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
        return t("objective.create.title", { defaultValue: "ایجاد هدف" });
    }

    if (routeMode === "edit") {
        return t("objective.edit.title", { defaultValue: "ویرایش هدف" });
    }

    if (routeMode === "view") {
        return t("objective.view.title", { defaultValue: "نمایش هدف" });
    }

    return "";
}

function resolveCreateParentId(selectedItem: ObjectiveNode | null): string | null {
    return selectedItem?.id ?? null;
}

export default function ObjectivesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { objectiveId } = useParams();

    const routeMode = useObjectiveRouteMode();
    const appDir = useResolvedUiDir();
    const isLargeDialogViewport = useMediaQuery(DIALOG_LARGE_VIEWPORT_QUERY);

    const nodesById = useObjectiveState((state) => state.nodesById);
    const loading = useObjectiveState((state) => state.loading);
    const loadChildren = useObjectiveState((state) => state.loadChildren);
    const createNode = useObjectiveState((state) => state.createNode);
    const updateNode = useObjectiveState((state) => state.updateNode);
    const removeNode = useObjectiveState((state) => state.removeNode);
    const tempDocumentsBySession = useDocumentAttachmentState(
        (state) => state.tempDocumentsBySession,
    );
    const commitTempDocuments = useDocumentAttachmentState((state) => state.commitTemp);
    const loadDocumentsForTarget = useDocumentAttachmentState((state) => state.loadForTarget);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<ObjectiveNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);
    const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(() => new Set());
    const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(() => new Set());
    const [objectiveDocumentTempSessionId, setObjectiveDocumentTempSessionId] = useState(
        createDocumentTempSessionId,
    );

    const items = useMemo(() => sortObjectives(Object.values(nodesById)), [nodesById]);

    const selectedRouteItem = objectiveId ? nodesById[objectiveId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const queryParentId = queryParams.get("parentId");
    const queryNodeType = queryParams.get("nodeType");

    const selectedParentForCreate = queryParentId ? nodesById[queryParentId] ?? null : null;

    const requestedNodeType = useMemo<ObjectiveNodeType>(() => {
        if (isObjectiveNodeType(queryNodeType)) {
            return queryNodeType;
        }

        return defaultChildType(selectedParentForCreate?.nodeType ?? null);
    }, [queryNodeType, selectedParentForCreate]);

    const documentScopeKey = useMemo(() => {
        if (routeMode === "create") {
            return `create:${queryParentId ?? "root"}:${requestedNodeType}`;
        }

        if ((routeMode === "view" || routeMode === "edit") && objectiveId) {
            return `objective:${objectiveId}`;
        }

        return "none";
    }, [objectiveId, queryParentId, requestedNodeType, routeMode]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("objective.errors.loadList", {
                        defaultValue: "خطا در بارگذاری ساختار اهداف",
                    }),
                    t,
                ),
            );
        });
    }, [loadChildren, t]);

    useEffect(() => {
        setObjectiveDocumentTempSessionId(createDocumentTempSessionId());
    }, [documentScopeKey]);

    useEffect(() => {
        if (!objectiveId) {
            return;
        }

        void loadDocumentsForTarget(OBJECTIVE_DOCUMENT_TARGET_TYPE, objectiveId).catch(
            (error: unknown) => {
                setObjectError(
                    mapError(
                        error,
                        t("document.errors.load", {
                            defaultValue: "خطا در بارگذاری مستندات",
                        }),
                        t,
                    ),
                );
            },
        );
    }, [loadDocumentsForTarget, objectiveId, t]);

    const treeSelectedId = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return objectiveId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [objectiveId, queryParentId, routeMode, selectedTreeId]);

    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return objectiveId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [objectiveId, queryParentId, routeMode, selectedTreeId, treeExpansionAnchorId]);

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
            navigate(`/objectives/${id}`);
        },
        [navigate],
    );

    const handleCreate = useCallback(
        (nodeType: ObjectiveNodeType) => {
            setPageError(null);
            setObjectError(null);
            const selectedId = selectedTreeId ?? objectiveId ?? null;
            const selectedItem = selectedId ? nodesById[selectedId] ?? null : null;
            const parentId = resolveCreateParentId(selectedItem);
            const parent = parentId ? nodesById[parentId] ?? null : null;

            if (!canCreateChild(parent?.nodeType ?? null, nodeType)) {
                setPageError(
                    t("objective.errors.invalidHierarchy", {
                        defaultValue: "ساختار انتخاب‌شده برای اهداف معتبر نیست",
                    }),
                );
                return;
            }

            const params = new URLSearchParams();

            if (parentId) {
                params.set("parentId", parentId);
            }

            params.set("nodeType", nodeType);
            setTreeExpansionAnchorId(parentId);
            navigate(`/objectives/new?${params.toString()}`);
        },
        [navigate, nodesById, objectiveId, selectedTreeId, t],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? objectiveId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            setPageError(null);
            setObjectError(null);
            navigate(`/objectives/${targetId}/edit`);
        },
        [navigate, objectiveId, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        setObjectError(null);
        const currentAnchorId =
            routeMode === "create" ? queryParentId ?? selectedTreeId : objectiveId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/objectives");
    }, [navigate, objectiveId, queryParentId, routeMode, selectedTreeId]);

    const commitObjectiveTempDocuments = useCallback(
        async (targetId: string) => {
            const tempDocuments =
                tempDocumentsBySession[objectiveDocumentTempSessionId] ?? [];

            if (tempDocuments.length === 0) {
                return;
            }

            await commitTempDocuments({
                tempSessionId: objectiveDocumentTempSessionId,
                targetType: OBJECTIVE_DOCUMENT_TARGET_TYPE,
                targetId,
                documentIds: tempDocuments.map((documentItem) => documentItem.id),
                documentTitles: Object.fromEntries(
                    tempDocuments.map((documentItem) => [
                        documentItem.id,
                        documentItem.title || documentItem.originalFileName,
                    ]),
                ),
            });
            await loadDocumentsForTarget(OBJECTIVE_DOCUMENT_TARGET_TYPE, targetId);
        },
        [
            commitTempDocuments,
            loadDocumentsForTarget,
            objectiveDocumentTempSessionId,
            tempDocumentsBySession,
        ],
    );

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("objective.errors.notFound", { defaultValue: "هدف موردنظر یافت نشد" }),
                );
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("objective.errors.hasChildren", {
                        defaultValue: "امکان حذف هدفی که زیرمجموعه دارد وجود ندارد",
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
                navigate("/objectives");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/objectives");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("objective.errors.delete", {
                        defaultValue: "خطا در حذف هدف",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleObjectSubmit = useCallback(
        async (payload: ObjectiveNodeCreate | ObjectiveNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);
                setObjectError(null);

                if (routeMode === "create") {
                    const createPayload = payload as ObjectiveNodeCreate;
                    const created = await createNode(createPayload.parentId ?? null, createPayload);
                    await commitObjectiveTempDocuments(created.id);

                    setSelectedTreeId(created.id);
                    setTreeExpansionAnchorId(created.id);
                    navigate(`/objectives/${created.id}`);
                    return;
                }

                if (routeMode === "edit" && objectiveId) {
                    await updateNode(objectiveId, payload as ObjectiveNodeUpdate);
                    await commitObjectiveTempDocuments(objectiveId);
                    setSelectedTreeId(objectiveId);
                    setTreeExpansionAnchorId(objectiveId);
                    navigate(`/objectives/${objectiveId}`);
                }
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("objective.errors.save", {
                            defaultValue: "خطا در ذخیره هدف",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [
            commitObjectiveTempDocuments,
            createNode,
            navigate,
            objectiveId,
            routeMode,
            t,
            updateNode,
        ],
    );

    const showModal = routeMode === "create" || routeMode === "view" || routeMode === "edit";

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
    const fclLayout: FclLayout = showInlineSummaryPane ? "TwoColumnsStartExpanded" : "OneColumn";
    const createOptions = CREATE_NODE_TYPES;

    const slotContainerStyle = useMemo<CSSProperties>(
        () => ({
            height: "100%",
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
            maxHeight: "calc(92vh - 8rem)",
            overflow: "auto",
            direction: appDir,
            boxSizing: "border-box",
            padding: "0.25rem",
        }),
        [appDir],
    );

    const dialogStyle = useMemo<CSSProperties>(() => {
        const width = isLargeDialogViewport ? DIALOG_LARGE_WIDTH : DIALOG_NORMAL_WIDTH;

        return {
            width,
            maxWidth: width,
        };
    }, [isLargeDialogViewport]);

    const listColumn = createElement(
        "div",
        {
            slot: "startColumn",
            dir: appDir,
            style: slotContainerStyle,
        },
        <div style={frameStyle}>
            <ObjectivesListReport
                items={items}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || submitting}
                error={!showModal ? pageError : null}
                createOptions={createOptions}
                manualExpandedIds={manualExpandedIds}
                manualCollapsedIds={manualCollapsedIds}
                onManualExpandedIdsChange={setManualExpandedIds}
                onManualCollapsedIdsChange={setManualCollapsedIds}
                onSearchTextChange={setSearchText}
                onCreate={handleCreate}
                onShow={handleShow}
                onDelete={requestDelete}
                onSelect={handleSelect}
            />
        </div>,
    );

    const inlineSummaryColumn = showInlineSummaryPane
        ? createElement(
            "div",
            {
                slot: "midColumn",
                  dir: appDir,
                  style: slotContainerStyle,
              },
              <div style={frameStyle}>
                  <ObjectiveSummaryPanel
                      value={selectedTreeItem}
                      busy={loading || submitting}
                      error={!showModal ? pageError : null}
                      onEdit={handleEdit}
                      onCancel={() => {
                          setSelectedTreeId(null);
                          setTreeExpansionAnchorId(null);
                      }}
                  />
              </div>,
          )
        : null;

    const dialogTitle = resolveDialogTitle(routeMode, t);

    return (
        <>
            {createElement(
                "ui5-flexible-column-layout",
                {
                    layout: fclLayout,
                    dir: appDir,
                    "disable-resizing": true,
                    style: {
                        height: "calc(100vh - 10rem)",
                        minHeight: "36rem",
                        display: "block",
                    },
                },
                listColumn,
                inlineSummaryColumn,
            )}

            <Dialog
                open={showModal}
                accessibleName={dialogTitle}
                className="objectiveObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <ObjectiveObjectPage
                            key={`${objectValue?.id ?? "new"}:${queryParentId ?? "root"}:${requestedNodeType}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            parent={selectedParentForCreate}
                            requestedNodeType={requestedNodeType}
                            busy={loading || submitting}
                            error={objectError}
                            documentTempSessionId={objectiveDocumentTempSessionId}
                            onErrorClose={() => setObjectError(null)}
                            onSubmit={handleObjectSubmit}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("objective.object.notFound", {
                                defaultValue: "هدف انتخاب‌شده یافت نشد.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("objective.delete.title", { defaultValue: "حذف هدف" })}
                message={t("objective.delete.confirm", {
                    defaultValue: "آیا از حذف \"{{title}}\" مطمئن هستید؟",
                    title: deleteCandidate?.title ?? "",
                })}
                confirmText={t("common.delete", { defaultValue: "حذف" })}
                cancelText={t("common.cancel", { defaultValue: "انصراف" })}
                loading={submitting}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={() => {
                    void handleConfirmDelete();
                }}
            />
        </>
    );
}
