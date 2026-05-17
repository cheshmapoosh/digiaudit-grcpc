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
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeType,
    RegulationNodeUpdate,
} from "../domain/regulation.model";
import { ROOT_PARENT, useRegulationState } from "../state/regulation.state";
import {
    canCreateChild,
    defaultChildType,
    hasChildren,
    sortRegulations,
} from "../utils/regulation.tree";

import RegulationSummaryPanel from "../components/RegulationSummaryPanel";
import RegulationsListReport from "./RegulationsListReport";
import RegulationObjectPage from "./RegulationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_LARGE_VIEWPORT_QUERY = "(min-width: 1600px)";
const DIALOG_NORMAL_WIDTH = "90vw";
const DIALOG_LARGE_WIDTH = "60vw";

function useRegulationRouteMode(): RouteMode {
    const { regulationId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (regulationId) {
        return "view";
    }

    return "list";
}

function isRegulationNodeType(value: string | null): value is RegulationNodeType {
    return value === "lawGroup" || value === "law" || value === "lawRequirement";
}

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return t("regulation.errors.notFound", {
                    defaultValue: "آیتم موردنظر یافت نشد",
                });
            case "PARENT_NOT_FOUND":
                return t("regulation.errors.parentNotFound", {
                    defaultValue: "والد انتخاب‌شده یافت نشد",
                });
            case "HAS_CHILDREN":
                return t("regulation.errors.hasChildren", {
                    defaultValue: "امکان حذف آیتمی که زیرمجموعه دارد وجود ندارد",
                });
            case "INVALID_HIERARCHY":
                return t("regulation.errors.invalidHierarchy", {
                    defaultValue: "ساختار انتخاب‌شده برای قوانین معتبر نیست",
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
        return t("regulation.create.title", { defaultValue: "ایجاد آیتم قانون" });
    }

    if (routeMode === "edit") {
        return t("regulation.edit.title", { defaultValue: "ویرایش آیتم قانون" });
    }

    if (routeMode === "view") {
        return t("regulation.view.title", { defaultValue: "نمایش آیتم قانون" });
    }

    return "";
}

const CREATE_NODE_TYPES: RegulationNodeType[] = ["lawGroup", "law", "lawRequirement"];

function findNearestAncestorOfType(
    start: RegulationNode | null,
    nodeType: RegulationNodeType,
    nodesById: Record<string, RegulationNode>,
): RegulationNode | null {
    const visited = new Set<string>();
    let current: RegulationNode | null | undefined = start;

    while (current) {
        if (current.nodeType === nodeType) {
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
    nodeType: RegulationNodeType,
    selectedItem: RegulationNode | null,
    nodesById: Record<string, RegulationNode>,
): string | null | undefined {
    if (nodeType === "lawGroup") {
        const nearestLawGroup = findNearestAncestorOfType(selectedItem, "lawGroup", nodesById);
        return nearestLawGroup?.id ?? null;
    }

    if (nodeType === "law") {
        const nearestLawGroup = findNearestAncestorOfType(selectedItem, "lawGroup", nodesById);
        return nearestLawGroup?.id;
    }

    const nearestLaw = findNearestAncestorOfType(selectedItem, "law", nodesById);
    return nearestLaw?.id;
}

function resolveInvalidCreateMessage(
    nodeType: RegulationNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (nodeType === "law") {
        return t("regulation.errors.selectLawGroupParent", {
            defaultValue: "برای ایجاد قانون، ابتدا یک گروه قانون یا قانون همان والد را انتخاب کنید.",
        });
    }

    if (nodeType === "lawRequirement") {
        return t("regulation.errors.selectLawParent", {
            defaultValue: "برای ایجاد الزام قانون، ابتدا یک قانون یا الزام همان قانون را انتخاب کنید.",
        });
    }

    return t("regulation.errors.invalidHierarchy", {
        defaultValue: "ساختار انتخاب‌شده برای قوانین معتبر نیست",
    });
}

export default function RegulationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { regulationId } = useParams();

    const routeMode = useRegulationRouteMode();
    const appDir = useResolvedUiDir();
    const isLargeDialogViewport = useMediaQuery(DIALOG_LARGE_VIEWPORT_QUERY);

    const nodesById = useRegulationState((state) => state.nodesById);
    const loading = useRegulationState((state) => state.loading);
    const loadChildren = useRegulationState((state) => state.loadChildren);
    const createNode = useRegulationState((state) => state.createNode);
    const updateNode = useRegulationState((state) => state.updateNode);
    const removeNode = useRegulationState((state) => state.removeNode);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<RegulationNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);

    const items = useMemo(() => sortRegulations(Object.values(nodesById)), [nodesById]);

    const selectedRouteItem = regulationId ? nodesById[regulationId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const queryParentId = queryParams.get("parentId");
    const queryNodeType = queryParams.get("nodeType");

    const selectedParentForCreate = queryParentId ? nodesById[queryParentId] ?? null : null;

    const requestedNodeType = useMemo<RegulationNodeType>(() => {
        if (isRegulationNodeType(queryNodeType)) {
            return queryNodeType;
        }

        return defaultChildType(selectedParentForCreate?.nodeType ?? null);
    }, [queryNodeType, selectedParentForCreate]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("regulation.errors.loadList", {
                        defaultValue: "خطا در بارگذاری ساختار قانون",
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
            return regulationId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [regulationId, queryParentId, routeMode, selectedTreeId]);

    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return regulationId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [regulationId, queryParentId, routeMode, selectedTreeId, treeExpansionAnchorId]);

    const handleSelect = useCallback((id: string) => {
        setSelectedTreeId(id);
        setTreeExpansionAnchorId(id);
        setPageError(null);
    }, []);

    const handleShow = useCallback(
        (id: string) => {
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);
            navigate(`/regulations/${id}`);
        },
        [navigate],
    );

    const handleCreate = useCallback(
        (nodeType: RegulationNodeType) => {
            const selectedId = selectedTreeId ?? regulationId ?? null;
            const selectedItem = selectedId ? nodesById[selectedId] ?? null : null;
            const parentId = resolveCreateParentId(nodeType, selectedItem, nodesById);
            const parent = parentId ? nodesById[parentId] ?? null : null;

            if (parentId === undefined || !canCreateChild(parent?.nodeType ?? null, nodeType)) {
                setPageError(resolveInvalidCreateMessage(nodeType, t));
                return;
            }

            const params = new URLSearchParams();

            if (parentId) {
                params.set("parentId", parentId);
            }

            params.set("nodeType", nodeType);
            setTreeExpansionAnchorId(parentId);
            navigate(`/regulations/new?${params.toString()}`);
        },
        [navigate, nodesById, regulationId, selectedTreeId, t],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? regulationId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/regulations/${targetId}/edit`);
        },
        [navigate, regulationId, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        const currentAnchorId =
            routeMode === "create"
                ? queryParentId ?? selectedTreeId
                : regulationId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/regulations");
    }, [navigate, regulationId, queryParentId, routeMode, selectedTreeId]);

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("regulation.errors.notFound", { defaultValue: "آیتم موردنظر یافت نشد" }),
                );
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("regulation.errors.hasChildren", {
                        defaultValue: "امکان حذف آیتمی که زیرمجموعه دارد وجود ندارد",
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
                navigate("/regulations");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/regulations");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("regulation.errors.delete", {
                        defaultValue: "خطا در حذف آیتم قانون",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleObjectSubmit = useCallback(
        async (payload: RegulationNodeCreate | RegulationNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                if (routeMode === "create") {
                    const createPayload = payload as RegulationNodeCreate;
                    const created = await createNode(createPayload.parentId ?? null, createPayload);

                    setSelectedTreeId(created.id);
                    setTreeExpansionAnchorId(created.id);
                    navigate("/regulations");
                    return;
                }

                if (routeMode === "edit" && regulationId) {
                    await updateNode(regulationId, payload as RegulationNodeUpdate);
                    setSelectedTreeId(regulationId);
                    setTreeExpansionAnchorId(regulationId);
                    navigate("/regulations");
                }
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("regulation.errors.save", {
                            defaultValue: "خطا در ذخیره آیتم قانون",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, navigate, regulationId, routeMode, t, updateNode],
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
            <RegulationsListReport
                items={items}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || submitting}
                error={!showModal ? pageError : null}
                createOptions={createOptions}
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
                  <RegulationSummaryPanel
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
                className="regulationObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <RegulationObjectPage
                            key={`${objectMode}:${objectValue?.id ?? "new"}:${queryParentId ?? "root"}:${requestedNodeType}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            parent={selectedParentForCreate}
                            requestedNodeType={requestedNodeType}
                            busy={loading || submitting}
                            error={pageError}
                            onSubmit={handleObjectSubmit}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("regulation.object.notFound", {
                                defaultValue: "آیتم قانون انتخاب‌شده یافت نشد.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("regulation.delete.title", { defaultValue: "حذف آیتم قانون" })}
                message={t("regulation.delete.confirm", {
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
