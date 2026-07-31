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
import {
    ROOT_PARENT as ORGANIZATION_ROOT_PARENT,
    useOrganizationState,
} from "@/features/organization";
import { sortOrganizations } from "@/features/organization/utils/organization.tree";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_WIDTH = "90vw";
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

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return t("objective.errors.notFound", { defaultValue: "Ù‡Ø¯Ù Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯" });
            case "PARENT_NOT_FOUND":
                return t("objective.errors.parentNotFound", {
                    defaultValue: "Ù‡Ø¯Ù ÙˆØ§Ù„Ø¯ Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯",
                });
            case "HAS_CHILDREN":
                return t("objective.errors.hasChildren", {
                    defaultValue: "Ø§Ù…Ú©Ø§Ù† Ø­Ø°Ù Ù‡Ø¯ÙÛŒ Ú©Ù‡ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡ Ø¯Ø§Ø±Ø¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯",
                });
            case "INVALID_HIERARCHY":
                return t("objective.errors.invalidHierarchy", {
                    defaultValue: "Ø³Ø§Ø®ØªØ§Ø± Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø§Ù‡Ø¯Ø§Ù Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª",
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
        return t("objective.create.title", { defaultValue: "Ø§ÛŒØ¬Ø§Ø¯ Ù‡Ø¯Ù" });
    }

    if (routeMode === "edit") {
        return t("objective.edit.title", { defaultValue: "ÙˆÛŒØ±Ø§ÛŒØ´ Ù‡Ø¯Ù" });
    }

    if (routeMode === "view") {
        return t("objective.view.title", { defaultValue: "Ù†Ù…Ø§ÛŒØ´ Ù‡Ø¯Ù" });
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
    const nodesById = useObjectiveState((state) => state.nodesById);
    const loading = useObjectiveState((state) => state.loading);
    const loadChildren = useObjectiveState((state) => state.loadChildren);
    const createNode = useObjectiveState((state) => state.createNode);
    const updateNode = useObjectiveState((state) => state.updateNode);
    const removeNode = useObjectiveState((state) => state.removeNode);
    const organizationNodesById = useOrganizationState((state) => state.nodesById);
    const organizationLoading = useOrganizationState((state) => state.loading);
    const loadOrganizationChildren = useOrganizationState((state) => state.loadChildren);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<ObjectiveNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);
    const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(() => new Set());
    const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(() => new Set());
    const items = useMemo(() => sortObjectives(Object.values(nodesById)), [nodesById]);
    const organizationItems = useMemo(
        () => sortOrganizations(Object.values(organizationNodesById)),
        [organizationNodesById],
    );

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


    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("objective.errors.loadList", {
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø³Ø§Ø®ØªØ§Ø± Ø§Ù‡Ø¯Ø§Ù",
                    }),
                    t,
                ),
            );
        });
    }, [loadChildren, t]);

    useEffect(() => {
        void loadOrganizationChildren(ORGANIZATION_ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("objective.errors.loadOrganizations"),
                    t,
                ),
            );
        });
    }, [loadOrganizationChildren, t]);



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
                        defaultValue: "Ø³Ø§Ø®ØªØ§Ø± Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø§Ù‡Ø¯Ø§Ù Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª",
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

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("objective.errors.notFound", { defaultValue: "Ù‡Ø¯Ù Ù…ÙˆØ±Ø¯Ù†Ø¸Ø± ÛŒØ§ÙØª Ù†Ø´Ø¯" }),
                );
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("objective.errors.hasChildren", {
                        defaultValue: "Ø§Ù…Ú©Ø§Ù† Ø­Ø°Ù Ù‡Ø¯ÙÛŒ Ú©Ù‡ Ø²ÛŒØ±Ù…Ø¬Ù…ÙˆØ¹Ù‡ Ø¯Ø§Ø±Ø¯ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯",
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
                        defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù Ù‡Ø¯Ù",
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

                    setSelectedTreeId(created.id);
                    setTreeExpansionAnchorId(created.id);
                    navigate(`/objectives/${created.id}`);
                    return;
                }

                if (routeMode === "edit" && objectiveId) {
                    await updateNode(objectiveId, payload as ObjectiveNodeUpdate);
                    setSelectedTreeId(objectiveId);
                    setTreeExpansionAnchorId(objectiveId);
                    navigate(`/objectives/${objectiveId}`);
                }
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("objective.errors.save", {
                            defaultValue: "Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ù‡Ø¯Ù",
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
                      onClose={() => {
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
                            availableOrganizations={organizationItems}
                            organizationsBusy={organizationLoading}
                            busy={loading || submitting}
                            error={objectError}
                            onErrorClose={() => setObjectError(null)}
                            onSubmit={handleObjectSubmit}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("objective.object.notFound", {
                                defaultValue: "Ù‡Ø¯Ù Ø§Ù†ØªØ®Ø§Ø¨â€ŒØ´Ø¯Ù‡ ÛŒØ§ÙØª Ù†Ø´Ø¯.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("objective.delete.title", { defaultValue: "Ø­Ø°Ù Ù‡Ø¯Ù" })}
                message={t("objective.delete.confirm", {
                    defaultValue: "Ø¢ÛŒØ§ Ø§Ø² Ø­Ø°Ù \"{{title}}\" Ù…Ø·Ù…Ø¦Ù† Ù‡Ø³ØªÛŒØ¯ØŸ",
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
