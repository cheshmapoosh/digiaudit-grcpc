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

import {
    Dialog,
    MessageStrip,
} from "@ui5/webcomponents-react";

import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "../domain/organization.model";

import { useOrganizationState, ROOT_PARENT } from "../state/organization.state";
import { hasChildren, sortOrganizations } from "../utils/organization.tree";

import OrganizationSummaryPanel from "../components/OrganizationSummaryPanel";
import OrganizationsListReport from "./OrganizationsListReport";
import OrganizationObjectPage from "./OrganizationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_LARGE_VIEWPORT_QUERY = "(min-width: 1600px)";
const DIALOG_NORMAL_WIDTH = "90vw";
const DIALOG_LARGE_WIDTH = "60vw";

function useOrganizationRouteMode(): RouteMode {
    const { organizationId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (organizationId) {
        return "view";
    }

    return "list";
}

function mapError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return "آیتم موردنظر یافت نشد";
            case "HAS_CHILDREN":
                return "امکان حذف واحدی که زیرمجموعه دارد وجود ندارد";
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
        return t("organization.create.title", {
            defaultValue: "ایجاد سازمان",
        });
    }

    if (routeMode === "edit") {
        return t("organization.edit.title", {
            defaultValue: "ویرایش سازمان",
        });
    }

    if (routeMode === "view") {
        return t("organization.view.title", {
            defaultValue: "نمایش سازمان",
        });
    }

    return "";
}

export default function OrganizationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { organizationId } = useParams();

    const routeMode = useOrganizationRouteMode();
    const appDir = useResolvedUiDir();
    const isLargeDialogViewport = useMediaQuery(DIALOG_LARGE_VIEWPORT_QUERY);

    const nodesById = useOrganizationState((state) => state.nodesById);
    const loading = useOrganizationState((state) => state.loading);
    const loadChildren = useOrganizationState((state) => state.loadChildren);
    const createNode = useOrganizationState((state) => state.createNode);
    const updateNode = useOrganizationState((state) => state.updateNode);
    const removeNode = useOrganizationState((state) => state.removeNode);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<OrganizationNode | null>(null);
    const [submitting, setSubmitting] = useState(false);

    /**
     * selectedTreeId:
     * نودی که در درخت انتخاب شده و پنل جزئیات کناری را کنترل می‌کند.
     *
     * route organizationId:
     * نودی که داخل modal نمایش/ویرایش می‌شود.
     */
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);

    const items = useMemo(() => sortOrganizations(Object.values(nodesById)), [nodesById]);

    const selectedRouteItem = organizationId ? nodesById[organizationId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParentId = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get("parentId");
    }, [location.search]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.loadList", {
                        defaultValue: "خطا در بارگذاری واحدهای سازمانی",
                    }),
                ),
            );
        });
    }, [loadChildren, t]);

    /**
     * در حالت create child، درخت باید parent را انتخاب/باز کند.
     * در حالت view/edit modal، درخت روی همان organizationId فوکوس می‌کند.
     * در حالت list، روی selectedTreeId می‌ماند.
     */
    const treeSelectedId = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return organizationId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [organizationId, queryParentId, routeMode, selectedTreeId]);

    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return organizationId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [
        organizationId,
        queryParentId,
        routeMode,
        selectedTreeId,
        treeExpansionAnchorId,
    ]);

    /**
     * کلیک روی نود درخت:
     * فقط انتخاب و نمایش جزئیات کناری.
     * هیچ modal باز نمی‌شود.
     */
    const handleSelect = useCallback((id: string) => {
        setSelectedTreeId(id);
        setTreeExpansionAnchorId(id);
    }, []);

    /**
     * دکمه نمایش:
     * modal نمایش سازمان را باز می‌کند.
     */
    const handleShow = useCallback(
        (id: string) => {
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);
            navigate(`/organizations/${id}`);
        },
        [navigate],
    );

    /**
     * دکمه ایجاد سازمان:
     * اگر نودی انتخاب شده باشد، زیر همان نود ایجاد می‌کند.
     * اگر نودی انتخاب نشده باشد، root ایجاد می‌کند.
     */
    const handleCreate = useCallback(() => {
        if (selectedTreeId) {
            setTreeExpansionAnchorId(selectedTreeId);
            navigate(`/organizations/new?parentId=${encodeURIComponent(selectedTreeId)}`);
            return;
        }

        navigate("/organizations/new");
    }, [navigate, selectedTreeId]);

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? organizationId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/organizations/${targetId}/edit`);
        },
        [navigate, organizationId, selectedTreeId],
    );

    /**
     * بستن modal.
     * پنل جزئیات کناری روی آخرین انتخاب باقی می‌ماند.
     */
    const handleCancel = useCallback(() => {
        const currentAnchorId =
            routeMode === "create"
                ? queryParentId ?? selectedTreeId
                : organizationId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/organizations");
    }, [navigate, organizationId, queryParentId, routeMode, selectedTreeId]);

    const handleSubmitCreate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                const created = await createNode(queryParentId, {
                    code: String(payload.code ?? "").trim(),
                    name: String(payload.name ?? "").trim(),
                    type: payload.type ?? "unit",
                    description:
                        typeof payload.description === "string"
                            ? payload.description.trim() || undefined
                            : undefined,
                    parentId: queryParentId,
                    status: payload.status === "inactive" ? "inactive" : "active",
                    validFrom:
                        typeof payload.validFrom === "string"
                            ? payload.validFrom || undefined
                            : undefined,
                    validTo:
                        typeof payload.validTo === "string"
                            ? payload.validTo || undefined
                            : undefined,
                });

                /**
                 * بعد از create:
                 * - نود جدید در درخت انتخاب می‌شود.
                 * - parent باز می‌ماند.
                 * - modal نمایش همان سازمان باز می‌شود.
                 */
                setSelectedTreeId(created.id);
                setTreeExpansionAnchorId(created.parentId ?? created.id);
                navigate(`/organizations/${created.id}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("organization.errors.create", {
                            defaultValue: "خطا در ایجاد واحد سازمانی",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, navigate, queryParentId, t],
    );

    const handleSubmitUpdate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            if (!organizationId) {
                return;
            }

            try {
                setSubmitting(true);
                setPageError(null);

                const updatePayload: OrganizationNodeUpdate = {
                    code: typeof payload.code === "string" ? payload.code.trim() : payload.code,
                    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
                    type: payload.type,
                    description:
                        typeof payload.description === "string"
                            ? payload.description.trim() || undefined
                            : payload.description,
                    parentId: payload.parentId ?? null,
                    status: payload.status,
                    validFrom:
                        typeof payload.validFrom === "string"
                            ? payload.validFrom || undefined
                            : payload.validFrom,
                    validTo:
                        typeof payload.validTo === "string"
                            ? payload.validTo || undefined
                            : payload.validTo,
                };

                await updateNode(organizationId, updatePayload);

                setSelectedTreeId(organizationId);
                setTreeExpansionAnchorId(updatePayload.parentId ?? organizationId);

                navigate(`/organizations/${organizationId}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("organization.errors.update", {
                            defaultValue: "خطا در بروزرسانی واحد سازمانی",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [navigate, organizationId, t, updateNode],
    );

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(t("organization.errors.notFound", { defaultValue: "آیتم یافت نشد" }));
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("organization.errors.hasChildren", {
                        defaultValue: "امکان حذف واحدی که زیرمجموعه دارد وجود ندارد",
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

            /**
             * بعد از حذف:
             * - modal بسته می‌شود.
             * - انتخاب به parent منتقل می‌شود.
             * - اگر parent وجود نداشت، selection خالی می‌شود.
             */
            if (parentId) {
                setSelectedTreeId(parentId);
                setTreeExpansionAnchorId(parentId);
                navigate("/organizations");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/organizations");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.delete", {
                        defaultValue: "خطا در حذف واحد سازمانی",
                    }),
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const createInitialValue = useMemo<OrganizationNode | null>(() => {
        if (routeMode !== "create") {
            return null;
        }

        return {
            id: "",
            code: "",
            name: "",
            type: "unit",
            description: "",
            parentId: queryParentId,
            status: "active",
            validFrom: "",
            validTo: "",
        } as OrganizationNode;
    }, [queryParentId, routeMode]);

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
        routeMode === "create"
            ? "create"
            : routeMode === "edit"
                ? "edit"
                : "view";

    const objectValue = routeMode === "create" ? createInitialValue : selectedRouteItem;

    const showInlineSummaryPane = Boolean(selectedTreeItem);
    const fclLayout: FclLayout = showInlineSummaryPane ? "TwoColumnsStartExpanded" : "OneColumn";

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
            <OrganizationsListReport
                items={items}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || submitting}
                error={!showModal ? pageError : null}
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
                <OrganizationSummaryPanel
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
                headerText={resolveDialogTitle(routeMode, t)}
                className="organizationObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <div style={dialogContentStyle}>
                    {objectValue ? (
                        <OrganizationObjectPage
                            key={`${objectMode}:${objectValue.id || "new"}:${queryParentId ?? objectValue.parentId ?? "root"}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            busy={loading || submitting}
                            error={pageError}
                            onSubmit={routeMode === "create" ? handleSubmitCreate : handleSubmitUpdate}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("organization.object.notFound", {
                                defaultValue: "واحد سازمانی انتخاب‌شده یافت نشد",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("organization.delete.title", { defaultValue: "حذف واحد سازمانی" })}
                message={t("organization.delete.confirm", {
                    defaultValue: 'آیا از حذف "{{title}}" مطمئن هستید؟',
                    title: deleteCandidate?.name ?? "",
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