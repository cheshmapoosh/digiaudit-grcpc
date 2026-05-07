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
    AccountGroupNode,
    AccountGroupNodeCreate,
    AccountGroupNodeUpdate,
} from "../domain/accountGroup.model";
import { ROOT_PARENT, useAccountGroupState } from "../state/accountGroup.state";
import { hasChildren, sortAccountGroups } from "../utils/accountGroup.tree";

import AccountGroupSummaryPanel from "../components/AccountGroupSummaryPanel";
import AccountGroupsListReport from "./AccountGroupsListReport";
import AccountGroupObjectPage from "./AccountGroupObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_LARGE_VIEWPORT_QUERY = "(min-width: 1600px)";
const DIALOG_NORMAL_WIDTH = "90vw";
const DIALOG_LARGE_WIDTH = "60vw";

function useAccountGroupRouteMode(): RouteMode {
    const { accountGroupId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (accountGroupId) {
        return "view";
    }

    return "list";
}

function mapError(
    error: unknown,
    fallback: string,
    t: ReturnType<typeof useTranslation>["t"],
): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return t("accountGroup.errors.notFound", {
                    defaultValue: "گروه حساب موردنظر یافت نشد",
                });
            case "PARENT_NOT_FOUND":
                return t("accountGroup.errors.parentNotFound", {
                    defaultValue: "والد انتخاب‌شده یافت نشد",
                });
            case "HAS_CHILDREN":
                return t("accountGroup.errors.hasChildren", {
                    defaultValue: "امکان حذف گروه حسابی که زیرمجموعه دارد وجود ندارد",
                });
            case "INVALID_HIERARCHY":
                return t("accountGroup.errors.invalidHierarchy", {
                    defaultValue: "ساختار انتخاب‌شده برای گروه حساب معتبر نیست",
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
        return t("accountGroup.create.title", { defaultValue: "ایجاد گروه حساب" });
    }

    if (routeMode === "edit") {
        return t("accountGroup.edit.title", { defaultValue: "ویرایش گروه حساب" });
    }

    if (routeMode === "view") {
        return t("accountGroup.view.title", { defaultValue: "نمایش گروه حساب" });
    }

    return "";
}

export default function AccountGroupsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { accountGroupId } = useParams();

    const routeMode = useAccountGroupRouteMode();
    const appDir = useResolvedUiDir();
    const isLargeDialogViewport = useMediaQuery(DIALOG_LARGE_VIEWPORT_QUERY);

    const nodesById = useAccountGroupState((state) => state.nodesById);
    const loading = useAccountGroupState((state) => state.loading);
    const loadChildren = useAccountGroupState((state) => state.loadChildren);
    const createNode = useAccountGroupState((state) => state.createNode);
    const updateNode = useAccountGroupState((state) => state.updateNode);
    const removeNode = useAccountGroupState((state) => state.removeNode);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<AccountGroupNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);

    const items = useMemo(() => sortAccountGroups(Object.values(nodesById)), [nodesById]);

    const selectedRouteItem = accountGroupId ? nodesById[accountGroupId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const queryParentId = queryParams.get("parentId");
    const selectedParentForCreate = queryParentId ? nodesById[queryParentId] ?? null : null;

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("accountGroup.errors.loadList", {
                        defaultValue: "خطا در بارگذاری ساختار گروه حساب‌ها",
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

        if (accountGroupId) {
            return accountGroupId;
        }

        return selectedTreeId;
    }, [accountGroupId, queryParentId, routeMode, selectedTreeId]);

    const treeExpansionAnchorIdValue = treeExpansionAnchorId ?? treeSelectedId;

    const handleSelect = useCallback(
        (id: string) => {
            setSelectedTreeId(id);
            setTreeExpansionAnchorId(id);

            if (routeMode !== "list") {
                return;
            }
        },
        [routeMode],
    );

    const handleCreate = useCallback(() => {
        const parentId = selectedTreeId ?? null;
        const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";

        setPageError(null);
        navigate(`/account-groups/new${query}`);
    }, [navigate, selectedTreeId]);

    const handleShow = useCallback(
        (id?: string) => {
            const targetId = id ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/account-groups/${targetId}`);
        },
        [navigate, selectedTreeId],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? accountGroupId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            setSelectedTreeId(targetId);
            setTreeExpansionAnchorId(targetId);
            navigate(`/account-groups/${targetId}/edit`);
        },
        [accountGroupId, navigate, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        const currentAnchorId =
            routeMode === "create"
                ? queryParentId ?? selectedTreeId
                : accountGroupId ?? selectedTreeId;

        if (currentAnchorId) {
            setSelectedTreeId(currentAnchorId);
            setTreeExpansionAnchorId(currentAnchorId);
        }

        navigate("/account-groups");
    }, [accountGroupId, navigate, queryParentId, routeMode, selectedTreeId]);

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("accountGroup.errors.notFound", {
                        defaultValue: "گروه حساب موردنظر یافت نشد",
                    }),
                );
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("accountGroup.errors.hasChildren", {
                        defaultValue: "امکان حذف گروه حسابی که زیرمجموعه دارد وجود ندارد",
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
                navigate("/account-groups");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/account-groups");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("accountGroup.errors.delete", {
                        defaultValue: "خطا در حذف گروه حساب",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleObjectSubmit = useCallback(
        async (payload: AccountGroupNodeCreate | AccountGroupNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                if (routeMode === "create") {
                    const createPayload = payload as AccountGroupNodeCreate;
                    const created = await createNode(createPayload.parentId ?? null, createPayload);

                    setSelectedTreeId(created.id);
                    setTreeExpansionAnchorId(created.id);
                    navigate("/account-groups");
                    return;
                }

                if (routeMode === "edit" && accountGroupId) {
                    await updateNode(accountGroupId, payload as AccountGroupNodeUpdate);
                    setSelectedTreeId(accountGroupId);
                    setTreeExpansionAnchorId(accountGroupId);
                    navigate("/account-groups");
                }
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("accountGroup.errors.save", {
                            defaultValue: "خطا در ذخیره گروه حساب",
                        }),
                        t,
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [accountGroupId, createNode, navigate, routeMode, t, updateNode],
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
            <AccountGroupsListReport
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
                  <AccountGroupSummaryPanel
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
                className="accountGroupObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <AccountGroupObjectPage
                            key={`${objectMode}:${objectValue?.id ?? "new"}:${queryParentId ?? "root"}`}
                            mode={objectMode}
                            allItems={items}
                            value={objectValue}
                            parent={selectedParentForCreate}
                            busy={loading || submitting}
                            error={pageError}
                            onSubmit={handleObjectSubmit}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("accountGroup.object.notFound", {
                                defaultValue: "گروه حساب انتخاب‌شده یافت نشد.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("accountGroup.delete.title", { defaultValue: "حذف گروه حساب" })}
                message={t("accountGroup.delete.confirm", {
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
