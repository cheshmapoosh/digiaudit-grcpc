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
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "../domain/organization.model";
import { useOrganizationState, ROOT_PARENT } from "../state/organization.state";
import { hasChildren, sortOrganizations } from "../utils/organization.tree";
import OrganizationSummaryPanel from "../components/OrganizationSummaryPanel";
import DeletedOrganizationsDialog from "../components/DeletedOrganizationsDialog";
import OrganizationsListReport from "./OrganizationsListReport";
import OrganizationObjectPage, { type OrganizationTabKey } from "./OrganizationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_WIDTH = "90vw";

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

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    const code = error instanceof Error ? error.message : undefined;
    const knownError = error as { code?: string } | null;
    const errorCode = knownError?.code ?? code;

    switch (errorCode) {
        case "ORGANIZATION_NOT_FOUND":
        case "NOT_FOUND":
            return t("organization.errors.notFound", {
                defaultValue: "آیتم موردنظر یافت نشد",
            });
        case "DUPLICATE_ORGANIZATION_CODE":
            return t("organization.errors.duplicateCode", {
                defaultValue: "کد سازمانی تکراری است",
            });
        case "PARENT_ORGANIZATION_NOT_FOUND":
        case "PARENT_NOT_FOUND":
            return t("organization.errors.parentNotFound", {
                defaultValue: "والد انتخاب‌شده یافت نشد",
            });
        case "HIERARCHY_SELF_PARENT":
        case "HIERARCHY_CYCLE":
            return t("organization.errors.invalidHierarchy", {
                defaultValue: "ساختار سلسله‌مراتبی سازمان معتبر نیست",
            });
        case "DEPENDENT_CHILDREN_EXIST":
        case "HAS_CHILDREN":
            return t("organization.errors.hasChildren", {
                defaultValue: "امکان حذف واحدی که زیرمجموعه دارد وجود ندارد",
            });
        case "DEPENDENT_MASTER_DATA_EXISTS":
            return t("organization.errors.hasDependencies", {
                defaultValue: "Dependent master data prevents this action.",
            });
        case "INVALID_LIFECYCLE_TRANSITION":
            return t("organization.errors.invalidLifecycleTransition", {
                defaultValue: "This lifecycle action is not valid for the current status.",
            });
        case "VERSION_CONFLICT":
            return t("organization.errors.versionConflict", {
                defaultValue: "رکورد توسط کاربر دیگری تغییر کرده است. صفحه را دوباره بارگذاری کنید.",
            });
        case "INVALID_VALIDITY_RANGE":
            return t("organization.validation.invalidValidityRange", {
                defaultValue: "بازه اعتبار معتبر نیست",
            });
        default:
            return fallback;
    }
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
        return t("organization.create.title", { defaultValue: "ایجاد سازمان" });
    }

    if (routeMode === "edit") {
        return t("organization.edit.title", { defaultValue: "ویرایش سازمان" });
    }

    if (routeMode === "view") {
        return t("organization.view.title", { defaultValue: "نمایش سازمان" });
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
    const nodesById = useOrganizationState((state) => state.nodesById);
    const loading = useOrganizationState((state) => state.loading);
    const loadChildren = useOrganizationState((state) => state.loadChildren);
    const createNode = useOrganizationState((state) => state.createNode);
    const updateNode = useOrganizationState((state) => state.updateNode);
    const moveNode = useOrganizationState((state) => state.moveNode);
    const removeNode = useOrganizationState((state) => state.removeNode);
    const activateNode = useOrganizationState((state) => state.activateNode);
    const inactivateNode = useOrganizationState((state) => state.inactivateNode);
    const restoreNode = useOrganizationState((state) => state.restoreNode);
    const loadDeleted = useOrganizationState((state) => state.loadDeleted);
    const deletedNodesById = useOrganizationState((state) => state.deletedNodesById);
    const deletedLoading = useOrganizationState((state) => state.deletedLoading);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<OrganizationNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [objectActiveTab, setObjectActiveTab] =
        useState<OrganizationTabKey>("general");
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);
    const [deletedDialogOpen, setDeletedDialogOpen] = useState(false);
    const [savedCreateNode, setSavedCreateNode] = useState<OrganizationNode | null>(null);

    const items = useMemo(() => sortOrganizations(Object.values(nodesById)), [nodesById]);
    const selectedRouteItem = organizationId ? nodesById[organizationId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParentId = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get("parentId");
    }, [location.search]);

    const objectTabScopeKey = useMemo(() => {
        if (routeMode === "create") {
            return `create:${queryParentId ?? "root"}`;
        }

        return `org:${organizationId ?? "none"}`;
    }, [organizationId, queryParentId, routeMode]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.loadList", {
                        defaultValue: "خطا در بارگذاری واحدهای سازمانی",
                    }),
                    t,
                ),
            );
        });
    }, [loadChildren, t]);

    useEffect(() => {
        setObjectActiveTab("general");
        setSavedCreateNode(null);
    }, [objectTabScopeKey]);

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

    const handleSelect = useCallback((id: string) => {
        setPageError(null);
        setSelectedTreeId(id);
        setTreeExpansionAnchorId(id);
    }, []);

    const handleShow = useCallback(
        (id: string) => {
            setObjectError(null);
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);
            navigate(`/organizations/${id}`);
        },
        [navigate],
    );

    const handleCreate = useCallback(() => {
        setObjectError(null);

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

            setObjectError(null);
            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/organizations/${targetId}/edit`);
        },
        [navigate, organizationId, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        setObjectError(null);

        if (savedCreateNode) {
            navigate(`/organizations/${savedCreateNode.id}`);
            return;
        }

        const currentAnchorId =
            routeMode === "create"
                ? queryParentId ?? selectedTreeId
                : organizationId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/organizations");
    }, [navigate, organizationId, queryParentId, routeMode, savedCreateNode, selectedTreeId]);

    const handleSubmitCreate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            try {
                setSubmitting(true);
                setObjectError(null);

                const createPayload = payload as OrganizationNodeCreate;
                const result = await createNode(createPayload);
                const confirmed = useOrganizationState.getState().nodesById[result.entityId];
                if (confirmed) {
                    setSavedCreateNode(confirmed);
                }
                setSelectedTreeId(result.entityId);
                setTreeExpansionAnchorId(createPayload.parentOrganizationId ?? result.entityId);
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.errors.create", {
                            defaultValue: "خطا در ایجاد واحد سازمانی",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, t],
    );

    const handleSubmitUpdate = useCallback(
        async (payload: OrganizationNodeCreate | OrganizationNodeUpdate) => {
            const target = selectedRouteItem ?? savedCreateNode;
            if (!target) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                const updatePayload = payload as OrganizationNodeUpdate;
                await updateNode(target.id, updatePayload);
                const confirmed = useOrganizationState.getState().nodesById[target.id];
                if (savedCreateNode && confirmed) {
                    setSavedCreateNode(confirmed);
                }
                setSelectedTreeId(target.id);
                setTreeExpansionAnchorId(target.parentOrganizationId ?? target.id);
                if (!savedCreateNode) {
                    navigate(`/organizations/${target.id}`);
                }
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.errors.update", {
                            defaultValue: "خطا در بروزرسانی واحد سازمانی",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [navigate, savedCreateNode, selectedRouteItem, t, updateNode],
    );

    const handleMove = useCallback(
        async (payload: Parameters<typeof moveNode>[1]) => {
            const target = selectedRouteItem ?? savedCreateNode;
            if (!target) {
                return;
            }

            try {
                setSubmitting(true);
                setObjectError(null);

                await moveNode(target.id, payload);
                const confirmed = useOrganizationState.getState().nodesById[target.id];
                if (savedCreateNode && confirmed) {
                    setSavedCreateNode(confirmed);
                }

                setSelectedTreeId(target.id);
                setTreeExpansionAnchorId(payload.parentOrganizationId ?? target.id);
                if (!savedCreateNode) {
                    navigate(`/organizations/${target.id}`);
                }
            } catch (error) {
                setObjectError(
                    mapError(
                        error,
                        t("organization.errors.move", {
                            defaultValue: "خطا در انتقال واحد سازمانی",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [moveNode, navigate, savedCreateNode, selectedRouteItem, t],
    );

    const handleActivate = useCallback(async (node: OrganizationNode) => {
        try {
            setSubmitting(true);
            setPageError(null);
            await activateNode(node.id, { version: node.version });
        } catch (error) {
            setPageError(mapError(error, t("organization.errors.lifecycle"), t));
        } finally {
            setSubmitting(false);
        }
    }, [activateNode, t]);

    const handleInactivate = useCallback(async (node: OrganizationNode) => {
        try {
            setSubmitting(true);
            setPageError(null);
            await inactivateNode(node.id, { version: node.version });
        } catch (error) {
            setPageError(mapError(error, t("organization.errors.lifecycle"), t));
        } finally {
            setSubmitting(false);
        }
    }, [inactivateNode, t]);

    const handleShowDeleted = useCallback(async () => {
        setDeletedDialogOpen(true);
        try {
            setPageError(null);
            await loadDeleted();
        } catch (error) {
            setPageError(mapError(error, t("organization.errors.loadDeleted"), t));
        }
    }, [loadDeleted, t]);

    const handleRestore = useCallback(async (node: OrganizationNode) => {
        try {
            setSubmitting(true);
            setPageError(null);
            await restoreNode(node, { version: node.version });
            setSelectedTreeId(node.id);
            setTreeExpansionAnchorId(node.parentOrganizationId ?? node.id);
        } catch (error) {
            setPageError(mapError(error, t("organization.errors.restore"), t));
        } finally {
            setSubmitting(false);
        }
    }, [restoreNode, t]);

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("organization.errors.notFound", {
                        defaultValue: "آیتم یافت نشد",
                    }),
                );
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

            const parentId = deleteCandidate.parentOrganizationId ?? null;

            await removeNode(deleteCandidate.id, { version: deleteCandidate.version });
            setDeleteCandidate(null);

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
                    t,
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
            parentOrganizationId: queryParentId,
            displayLabel: "",
            status: "ACTIVE",
            validFrom: "",
            validTo: "",
            version: 0,
        };
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
        routeMode === "create" && !savedCreateNode
            ? "create"
            : routeMode === "edit" || savedCreateNode
              ? "edit"
              : "view";

    const objectValue = routeMode === "create"
        ? savedCreateNode ?? createInitialValue
        : selectedRouteItem;

    const fclLayout: FclLayout = selectedTreeItem
        ? "TwoColumnsStartExpanded"
        : "OneColumn";

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

    const dialogStyle = useMemo<CSSProperties>(
        () => ({
            width: DIALOG_WIDTH,
            maxWidth: DIALOG_WIDTH,
        }),
        [],
    );

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
                selectedItem={selectedTreeItem}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || submitting}
                error={!showModal ? pageError : null}
                onErrorClose={() => setPageError(null)}
                onSearchTextChange={setSearchText}
                onCreate={handleCreate}
                onShow={handleShow}
                onDelete={requestDelete}
                onActivate={(node) => { void handleActivate(node); }}
                onInactivate={(node) => { void handleInactivate(node); }}
                onShowDeleted={() => { void handleShowDeleted(); }}
                onSelect={handleSelect}
            />
        </div>,
    );

    const midColumn = selectedTreeItem
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
                      onErrorClose={() => setPageError(null)}
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
                midColumn,
            )}

            <Dialog
                open={showModal}
                accessibleName={dialogTitle}
                className="organizationObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <OrganizationObjectPage
                            key={routeMode === "create" ? objectTabScopeKey : `org:${objectValue?.id ?? "none"}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            activeTab={objectActiveTab}
                            busy={loading || submitting}
                            error={objectError}
                            onErrorClose={() => setObjectError(null)}
                            onSubmit={
                                objectMode === "create"
                                    ? handleSubmitCreate
                                    : handleSubmitUpdate
                            }
                            onMove={handleMove}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                            onActiveTabChange={setObjectActiveTab}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("organization.object.notFound", {
                                defaultValue: "سازمان انتخاب‌شده یافت نشد.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("organization.delete.title", {
                    defaultValue: "حذف واحد سازمانی",
                })}
                message={t("organization.delete.confirm", {
                    defaultValue: "آیا از حذف «{{title}}» مطمئن هستید؟",
                    title: deleteCandidate?.displayLabel ?? deleteCandidate?.code ?? "",
                })}
                confirmText={t("common.delete", { defaultValue: "حذف" })}
                cancelText={t("common.cancel", { defaultValue: "انصراف" })}
                loading={submitting}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={() => {
                    void handleConfirmDelete();
                }}
            />

            <DeletedOrganizationsDialog
                open={deletedDialogOpen}
                items={sortOrganizations(Object.values(deletedNodesById))}
                busy={deletedLoading || submitting}
                onClose={() => setDeletedDialogOpen(false)}
                onRestore={(node) => { void handleRestore(node); }}
            />
        </>
    );
}
