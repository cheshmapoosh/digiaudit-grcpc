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

import type { PolicyNode, PolicyNodeCreate, PolicyNodeType, PolicyNodeUpdate } from "../domain/policy.model";
import { ROOT_PARENT, usePolicyState } from "../state/policy.state";
import {
    canCreateChild,
    defaultChildType,
    hasChildren,
    sortPolicies,
} from "../utils/policy.tree";

import PolicySummaryPanel from "../components/PolicySummaryPanel";
import PoliciesListReport from "./PoliciesListReport";
import PolicyObjectPage from "./PolicyObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_LARGE_VIEWPORT_QUERY = "(min-width: 1600px)";
const DIALOG_NORMAL_WIDTH = "90vw";
const DIALOG_LARGE_WIDTH = "60vw";

function usePolicyRouteMode(): RouteMode {
    const { policyId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (policyId) {
        return "view";
    }

    return "list";
}

function isPolicyNodeType(value: string | null): value is PolicyNodeType {
    return value === "policyGroup" || value === "policy";
}

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return t("policy.errors.notFound", { defaultValue: "آیتم موردنظر یافت نشد" });
            case "PARENT_NOT_FOUND":
                return t("policy.errors.parentNotFound", { defaultValue: "والد انتخاب‌شده یافت نشد" });
            case "HAS_CHILDREN":
                return t("policy.errors.hasChildren", {
                    defaultValue: "امکان حذف آیتمی که زیرمجموعه دارد وجود ندارد",
                });
            case "INVALID_HIERARCHY":
                return t("policy.errors.invalidHierarchy", {
                    defaultValue: "ساختار انتخاب‌شده برای سیاست معتبر نیست",
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
        return t("policy.create.title", { defaultValue: "ایجاد آیتم سیاست" });
    }

    if (routeMode === "edit") {
        return t("policy.edit.title", { defaultValue: "ویرایش آیتم سیاست" });
    }

    if (routeMode === "view") {
        return t("policy.view.title", { defaultValue: "نمایش آیتم سیاست" });
    }

    return "";
}

const CREATE_NODE_TYPES: PolicyNodeType[] = ["policyGroup", "policy"];

function findNearestAncestorOfType(
    start: PolicyNode | null,
    nodeType: PolicyNodeType,
    nodesById: Record<string, PolicyNode>,
): PolicyNode | null {
    const visited = new Set<string>();
    let current: PolicyNode | null | undefined = start;

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
    nodeType: PolicyNodeType,
    selectedItem: PolicyNode | null,
    nodesById: Record<string, PolicyNode>,
): string | null | undefined {
    const nearestPolicyGroup = findNearestAncestorOfType(selectedItem, "policyGroup", nodesById);

    if (nodeType === "policyGroup") {
        return selectedItem?.nodeType === "policyGroup" ? selectedItem.id : nearestPolicyGroup?.id ?? null;
    }

    return nearestPolicyGroup?.id;
}

function resolveInvalidCreateMessage(
    nodeType: PolicyNodeType,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (nodeType === "policy") {
        return t("policy.errors.selectPolicyGroupParent", {
            defaultValue: "برای ایجاد سیاست، ابتدا یک گروه سیاست را انتخاب کنید.",
        });
    }

    return t("policy.errors.invalidHierarchy", {
        defaultValue: "ساختار انتخاب‌شده برای سیاست معتبر نیست",
    });
}

export default function PoliciesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { policyId } = useParams();

    const routeMode = usePolicyRouteMode();
    const appDir = useResolvedUiDir();
    const isLargeDialogViewport = useMediaQuery(DIALOG_LARGE_VIEWPORT_QUERY);

    const nodesById = usePolicyState((state) => state.nodesById);
    const loading = usePolicyState((state) => state.loading);
    const loadChildren = usePolicyState((state) => state.loadChildren);
    const createNode = usePolicyState((state) => state.createNode);
    const updateNode = usePolicyState((state) => state.updateNode);
    const removeNode = usePolicyState((state) => state.removeNode);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<PolicyNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);

    const items = useMemo(() => sortPolicies(Object.values(nodesById)), [nodesById]);

    const selectedRouteItem = policyId ? nodesById[policyId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const queryParentId = queryParams.get("parentId");
    const queryNodeType = queryParams.get("nodeType");

    const selectedParentForCreate = queryParentId ? nodesById[queryParentId] ?? null : null;

    const requestedNodeType = useMemo<PolicyNodeType>(() => {
        if (isPolicyNodeType(queryNodeType)) {
            return queryNodeType;
        }

        return defaultChildType(selectedParentForCreate?.nodeType ?? null);
    }, [queryNodeType, selectedParentForCreate]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("policy.errors.loadList", {
                        defaultValue: "خطا در بارگذاری ساختار سیاست",
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
            return policyId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [policyId, queryParentId, routeMode, selectedTreeId]);

    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return policyId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [policyId, queryParentId, routeMode, selectedTreeId, treeExpansionAnchorId]);

    const handleSelect = useCallback((id: string) => {
        setSelectedTreeId(id);
        setTreeExpansionAnchorId(id);
        setPageError(null);
    }, []);

    const handleShow = useCallback(
        (id: string) => {
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);
            navigate(`/policies/${id}`);
        },
        [navigate],
    );

    const handleCreate = useCallback(
        (nodeType: PolicyNodeType) => {
            const selectedId = selectedTreeId ?? policyId ?? null;
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
            navigate(`/policies/new?${params.toString()}`);
        },
        [navigate, nodesById, policyId, selectedTreeId, t],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? policyId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/policies/${targetId}/edit`);
        },
        [navigate, policyId, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        const currentAnchorId =
            routeMode === "create" ? queryParentId ?? selectedTreeId : policyId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/policies");
    }, [navigate, policyId, queryParentId, routeMode, selectedTreeId]);

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("policy.errors.notFound", { defaultValue: "آیتم موردنظر یافت نشد" }),
                );
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("policy.errors.hasChildren", {
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
                navigate("/policies");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/policies");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("policy.errors.delete", {
                        defaultValue: "خطا در حذف آیتم سیاست",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleObjectSubmit = useCallback(
        async (payload: PolicyNodeCreate | PolicyNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                if (routeMode === "create") {
                    const createPayload = payload as PolicyNodeCreate;
                    const created = await createNode(createPayload.parentId ?? null, createPayload);

                    setSelectedTreeId(created.id);
                    setTreeExpansionAnchorId(created.id);
                    navigate("/policies");
                    return;
                }

                if (routeMode === "edit" && policyId) {
                    await updateNode(policyId, payload as PolicyNodeUpdate);
                    setSelectedTreeId(policyId);
                    setTreeExpansionAnchorId(policyId);
                    navigate("/policies");
                }
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("policy.errors.save", {
                            defaultValue: "خطا در ذخیره آیتم سیاست",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, navigate, policyId, routeMode, t, updateNode],
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
            <PoliciesListReport
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
                <PolicySummaryPanel
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
                className="policyObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <PolicyObjectPage
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
                            {t("policy.object.notFound", {
                                defaultValue: "آیتم سیاست انتخاب‌شده یافت نشد.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("policy.delete.title", { defaultValue: "حذف آیتم سیاست" })}
                message={t("policy.delete.confirm", {
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
