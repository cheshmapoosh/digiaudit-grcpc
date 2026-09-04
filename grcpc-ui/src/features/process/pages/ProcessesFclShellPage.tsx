import {
    createElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "@ui5/webcomponents-fiori/dist/FlexibleColumnLayout.js";

import { Dialog, MessageStrip } from "@ui5/webcomponents-react";

import type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeType,
    ProcessNodeUpdate,
} from "../domain/process.model";
import { ROOT_PARENT, useProcessState } from "../state/process.state";
import { hasChildren, sortProcesses } from "../utils/process.tree";
import ProcessSummaryPanel from "../components/ProcessSummaryPanel";
import ProcessesListReport from "./ProcessesListReport";
import ProcessObjectPage, { type ProcessTabKey } from "./ProcessObjectPage";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { ModalDialogHeader } from "@/shared/components/ModalDialogHeader";
import {
    toDocumentAggregateDraftError,
    type DocumentAggregateDraftError,
} from "@/features/document";

type RouteMode = "list" | "create" | "view" | "edit";
type UiDir = "rtl" | "ltr";
type FclLayout = "OneColumn" | "TwoColumnsStartExpanded";

const DIALOG_WIDTH = "90vw";

function useProcessRouteMode(): RouteMode {
    const { processId } = useParams();
    const location = useLocation();

    if (location.pathname.endsWith("/new")) {
        return "create";
    }

    if (location.pathname.endsWith("/edit")) {
        return "edit";
    }

    if (processId) {
        return "view";
    }

    return "list";
}

function isProcessNodeType(value: string | null): value is ProcessNodeType {
    return value === "PROCESS" || value === "SUBPROCESS";
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
        case "PROCESS_NOT_FOUND":
        case "SUBPROCESS_NOT_FOUND":
        case "NOT_FOUND":
            return t("process.errors.notFound", {
                defaultValue: "آیتم موردنظر یافت نشد",
            });
        case "DUPLICATE_PROCESS_CODE":
        case "DUPLICATE_SUBPROCESS_CODE":
            return t("process.errors.duplicateCode", {
                defaultValue: "کد فرآیندی تکراری است",
            });
        case "PARENT_PROCESS_NOT_FOUND":
        case "PROCESS_FOR_SUBPROCESS_NOT_FOUND":
        case "PARENT_NOT_FOUND":
            return t("process.errors.parentNotFound", {
                defaultValue: "والد انتخاب‌شده یافت نشد",
            });
        case "HIERARCHY_SELF_PARENT":
        case "HIERARCHY_CYCLE":
            return t("process.errors.invalidHierarchy", {
                defaultValue: "ساختار انتخاب‌شده برای فرآیند معتبر نیست",
            });
        case "INVALID_HIERARCHY_MOVE":
            return t("process.errors.invalidHierarchyMove", {
                defaultValue: "The destination must differ from the current parent.",
            });
        case "DEPENDENT_CHILDREN_EXIST":
        case "HAS_CHILDREN":
            return t("process.errors.hasChildren", {
                defaultValue: "امکان حذف آیتمی که زیرمجموعه دارد وجود ندارد",
            });
        case "DEPENDENT_MASTER_DATA_EXISTS":
            return t("process.errors.hasDependencies", {
                defaultValue: "Dependent master data prevents this action.",
            });
        case "INVALID_LIFECYCLE_TRANSITION":
            return t("process.errors.invalidLifecycleTransition", {
                defaultValue: "This lifecycle action is not valid for the current status.",
            });
        case "INVALID_LIFECYCLE_FILTER":
            return t("process.errors.invalidLifecycleFilter", {
                defaultValue: "The selected lifecycle filter is not supported.",
            });
        case "VERSION_CONFLICT":
            return t("process.errors.versionConflict", {
                defaultValue: "رکورد توسط کاربر دیگری تغییر کرده است. صفحه را دوباره بارگذاری کنید.",
            });
        case "DUPLICATE_RELATION":
            return t("controlObjectiveScope.errors.duplicate");
        case "CONTROL_OBJECTIVE_SCOPE_DEPENDENCY_CONFLICT":
            return t("controlObjectiveScope.errors.dependency");
        case "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_ACTIVE":
            return t("controlObjectiveScope.errors.endpointInactive");
        case "CONTROL_OBJECTIVE_SCOPE_VALIDITY_OUTSIDE_ENDPOINTS":
            return t("controlObjectiveScope.errors.validityOutsideEndpoints");
        case "CONTROL_OBJECTIVE_SCOPE_CHANGE_INVALID":
            return t("controlObjectiveScope.errors.invalidChange");
        case "CENTRAL_CONTROL_OBJECTIVE_SCOPE_NOT_FOUND":
        case "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_FOUND":
            return t("controlObjectiveScope.errors.notFound");
        case "FORBIDDEN":
            return t("controlObjectiveScope.errors.forbidden");
        case "INVALID_SORT_ORDER":
            return t("process.validation.sortOrderInvalid", {
                defaultValue: "ترتیب نمایش باید عدد صحیح نامنفی باشد",
            });
        case "INVALID_VALIDITY_RANGE":
            return t("process.validation.invalidValidityRange", {
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
        return t("process.create.title", { defaultValue: "ایجاد آیتم فرآیندی" });
    }

    if (routeMode === "edit") {
        return t("process.edit.title", { defaultValue: "ویرایش آیتم فرآیندی" });
    }

    if (routeMode === "view") {
        return t("process.view.title", { defaultValue: "نمایش آیتم فرآیندی" });
    }

    return "";
}

function resolveCreateParentId(
    nodeType: ProcessNodeType,
    selectedItem: ProcessNode | null,
): string | null | undefined {
    if (nodeType === "PROCESS") {
        return selectedItem?.nodeType === "PROCESS" ? selectedItem.id : null;
    }

    if (nodeType === "SUBPROCESS") {
        return selectedItem?.nodeType === "PROCESS" ? selectedItem.id : undefined;
    }

    return undefined;
}

export default function ProcessesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { processId } = useParams();

    const routeMode = useProcessRouteMode();
    const appDir = useResolvedUiDir();
    const nodesById = useProcessState((state) => state.nodesById);
    const loading = useProcessState((state) => state.loading);
    const loadChildren = useProcessState((state) => state.loadChildren);
    const createNode = useProcessState((state) => state.createNode);
    const updateNode = useProcessState((state) => state.updateNode);
    const removeNode = useProcessState((state) => state.removeNode);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [objectError, setObjectError] = useState<string | null>(null);
    const [documentAggregateError, setDocumentAggregateError] = useState<DocumentAggregateDraftError | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<ProcessNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
    const [treeExpansionAnchorId, setTreeExpansionAnchorId] = useState<string | null>(null);
    const [objectActiveTab, setObjectActiveTab] = useState<ProcessTabKey>("general");
    const [generalInformationDirty, setGeneralInformationDirty] = useState(false);
    const [documentDirty, setDocumentDirty] = useState(false);
    const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
    const pendingLeaveActionRef = useRef<(() => void) | null>(null);
    const objectPageDirty = generalInformationDirty || documentDirty;
    const { blocker, runWithNavigationBypass } = useUnsavedChangesGuard(objectPageDirty);

    const requestObjectPageLeave = useCallback((action: () => void) => {
        if (!objectPageDirty) {
            action();
            return;
        }
        pendingLeaveActionRef.current = action;
        setLeaveConfirmationOpen(true);
    }, [objectPageDirty]);

    const stayOnObjectPage = useCallback(() => {
        if (blocker.state === "blocked") blocker.reset();
        pendingLeaveActionRef.current = null;
        setLeaveConfirmationOpen(false);
    }, [blocker]);

    const confirmObjectPageLeave = useCallback(() => {
        const action = pendingLeaveActionRef.current;
        pendingLeaveActionRef.current = null;
        setLeaveConfirmationOpen(false);
        setGeneralInformationDirty(false);
        setDocumentDirty(false);
        if (blocker.state === "blocked") blocker.proceed();
        else if (action) runWithNavigationBypass(action);
    }, [blocker, runWithNavigationBypass]);

    useEffect(() => () => {
        useProcessState.getState().reset();
    }, []);

    const processItems = useMemo(() => sortProcesses(Object.values(nodesById)), [nodesById]);
    const selectedRouteItem = processId ? nodesById[processId] ?? null : null;
    const selectedTreeItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const queryParentId = queryParams.get("parentId");
    const queryNodeType = queryParams.get("nodeType");
    const selectedParentForCreate = queryParentId ? nodesById[queryParentId] ?? null : null;
    const requestedNodeType = isProcessNodeType(queryNodeType) ? queryNodeType : "PROCESS";
    const objectTabScopeKey =
        routeMode === "create"
            ? `create:${queryParentId ?? "root"}:${requestedNodeType}`
            : `process:${processId ?? "none"}`;

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("process.errors.loadList", {
                        defaultValue: "خطا در بارگذاری ساختار فرآیند",
                    }),
                    t,
                ),
            );
        });
    }, [loadChildren, t]);

    useEffect(() => {
        setObjectActiveTab("general");
        setGeneralInformationDirty(false);
        setDocumentDirty(false);
    }, [objectTabScopeKey]);

    const treeSelectedId = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return processId ?? selectedTreeId;
        }

        return selectedTreeId;
    }, [processId, queryParentId, routeMode, selectedTreeId]);


    const treeExpansionAnchorIdValue = useMemo(() => {
        if (routeMode === "create") {
            return queryParentId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        if (routeMode === "view" || routeMode === "edit") {
            return processId ?? selectedTreeId ?? treeExpansionAnchorId;
        }

        return selectedTreeId ?? treeExpansionAnchorId;
    }, [
        processId,
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
            const show = () => {
                setObjectError(null);
                setDocumentAggregateError(null);
                setSelectedTreeId(id);
                setTreeExpansionAnchorId(id);
                navigate(`/processes/${id}`);
            };
            if (routeMode === "create" || (processId && processId !== id)) {
                requestObjectPageLeave(show);
            } else {
                show();
            }
        },
        [navigate, processId, requestObjectPageLeave, routeMode],
    );

    const handleCreate = useCallback(
        (nodeType: ProcessNodeType) => {
            const selectedItem = selectedTreeId ? nodesById[selectedTreeId] ?? null : null;
            const parentId = resolveCreateParentId(nodeType, selectedItem);

            if (parentId === undefined) {
                setPageError(
                    t("process.errors.selectProcessParent", {
                        defaultValue:
                            "برای ایجاد زیر فرآیند، ابتدا یک فرآیند را انتخاب کنید.",
                    }),
                );
                return;
            }

            requestObjectPageLeave(() => {
                setObjectError(null);
                setDocumentAggregateError(null);
                const params = new URLSearchParams();
                if (parentId) params.set("parentId", parentId);
                params.set("nodeType", nodeType);
                setTreeExpansionAnchorId(parentId);
                navigate(`/processes/new?${params.toString()}`);
            });
        },
        [navigate, nodesById, requestObjectPageLeave, selectedTreeId, t],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? processId ?? selectedTreeId;

            if (!targetId) {
                return;
            }

            const edit = () => {
                setObjectError(null);
                setDocumentAggregateError(null);
                setSelectedTreeId(targetId);
                setTreeExpansionAnchorId(targetId);
                navigate(`/processes/${targetId}/edit`);
            };
            if (routeMode === "create" || (processId && processId !== targetId)) {
                requestObjectPageLeave(edit);
            } else {
                edit();
            }
        },
        [navigate, processId, requestObjectPageLeave, routeMode, selectedTreeId],
    );

    const handleCancel = useCallback(() => {
        requestObjectPageLeave(() => {
            setObjectError(null);
            setDocumentAggregateError(null);
            const currentAnchorId = routeMode === "create"
                ? queryParentId ?? selectedTreeId
                : processId ?? selectedTreeId;
            if (currentAnchorId) {
                setSelectedTreeId(currentAnchorId);
                setTreeExpansionAnchorId(currentAnchorId);
            }
            navigate("/processes");
        });
    }, [navigate, processId, queryParentId, requestObjectPageLeave, routeMode, selectedTreeId]);

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(
                    t("process.errors.notFound", {
                        defaultValue: "آیتم موردنظر یافت نشد",
                    }),
                );
                return;
            }

            if (hasChildren(processItems, id)) {
                setPageError(
                    t("process.errors.hasChildren", {
                        defaultValue: "امکان حذف آیتمی که زیرمجموعه دارد وجود ندارد",
                    }),
                );
                return;
            }

            setDeleteCandidate(target);
        },
        [nodesById, processItems, t],
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteCandidate) {
            return;
        }

        try {
            setSubmitting(true);
            setPageError(null);

            const parentId = deleteCandidate.parentId ?? null;
            await removeNode(deleteCandidate, { version: deleteCandidate.version });
            setDeleteCandidate(null);

            if (parentId) {
                setSelectedTreeId(parentId);
                setTreeExpansionAnchorId(parentId);
                navigate("/processes");
                return;
            }

            setSelectedTreeId(null);
            setTreeExpansionAnchorId(null);
            navigate("/processes");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("process.errors.delete", {
                        defaultValue: "خطا در حذف آیتم فرآیندی",
                    }),
                    t,
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleObjectSubmit = useCallback(
        async (payload: ProcessNodeCreate | ProcessNodeUpdate): Promise<boolean> => {
            try {
                setSubmitting(true);
                setPageError(null);
                setObjectError(null);
                setDocumentAggregateError(null);

                if (routeMode === "create") {
                    const createPayload = payload as ProcessNodeCreate;
                    const created = await createNode(createPayload);
                    setSelectedTreeId(created.entityId);
                    setTreeExpansionAnchorId(createPayload.parentId ?? created.entityId);
                    setGeneralInformationDirty(false);
                    setDocumentDirty(false);
                    runWithNavigationBypass(() => navigate(`/processes/${created.entityId}`, { replace: true }));
                    return true;
                }

                const target = selectedRouteItem;
                if (routeMode === "edit" && target) {
                    const updatePayload = payload as ProcessNodeUpdate;
                    await updateNode(target, updatePayload);
                    setSelectedTreeId(target.id);
                    setTreeExpansionAnchorId(updatePayload.parentId ?? target.id);
                    setGeneralInformationDirty(false);
                    setDocumentDirty(false);
                    runWithNavigationBypass(() => navigate(`/processes/${target.id}`, { replace: true }));
                    return true;
                }
                return false;
            } catch (error) {
                setDocumentAggregateError(toDocumentAggregateDraftError(error));
                setObjectError(
                    mapError(
                        error,
                        t("process.errors.save", {
                            defaultValue: "خطا در ذخیره آیتم فرآیندی",
                        }),
                        t,
                    ),
                );
                return false;
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, navigate, routeMode, runWithNavigationBypass, selectedRouteItem, t, updateNode],
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

    const objectMode = routeMode === "create" ? "create" : routeMode === "edit" ? "edit" : "view";

    const createInitialValue = useMemo<ProcessNode | null>(() => {
        if (routeMode !== "create") {
            return null;
        }

        return {
            id: "",
            code: "",
            title: "",
            nodeType: requestedNodeType,
            parentId: queryParentId,
            description: "",
            sortOrder: 0,
            status: "ACTIVE",
            validFrom: "",
            validTo: "",
            version: 0,
        };
    }, [queryParentId, requestedNodeType, routeMode]);

    const objectValue = routeMode === "create"
        ? createInitialValue
        : selectedRouteItem;
    const fclLayout: FclLayout = selectedTreeItem
        ? "TwoColumnsStartExpanded"
        : "OneColumn";
    const createOptions: ProcessNodeType[] =
        selectedTreeItem?.nodeType === "SUBPROCESS"
            ? ["PROCESS"]
            : ["PROCESS", "SUBPROCESS"];

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
            <ProcessesListReport
                items={processItems}
                selectedId={treeSelectedId}
                expansionAnchorId={treeExpansionAnchorIdValue}
                searchText={searchText}
                busy={loading || submitting}
                error={!showModal ? pageError : null}
                onErrorClose={() => setPageError(null)}
                createOptions={createOptions}
                onSearchTextChange={setSearchText}
                onCreate={handleCreate}
                onShow={handleShow}
                onDelete={requestDelete}
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
                  <ProcessSummaryPanel
                      value={selectedTreeItem}
                      allItems={processItems}
                      busy={loading || submitting}
                      error={!showModal ? pageError : null}
                      onErrorClose={() => setPageError(null)}
                      onEdit={handleEdit}
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
                midColumn,
            )}

            <Dialog
                open={showModal}
                accessibleName={dialogTitle}
                className="processObjectDialog"
                style={dialogStyle}
                onClose={handleObjectDialogClose}
            >
                <ModalDialogHeader title={dialogTitle} onClose={handleObjectDialogClose} />
                <div style={dialogContentStyle}>
                    {objectMode === "create" || objectValue ? (
                        <ProcessObjectPage
                            key={routeMode === "create" ? objectTabScopeKey : `process:${objectValue?.id ?? "none"}:${objectMode}`}
                            mode={objectMode}
                            allItems={processItems}
                            value={objectValue}
                            parent={selectedParentForCreate}
                            requestedNodeType={requestedNodeType}
                            activeTab={objectActiveTab}
                            busy={loading || submitting}
                            error={objectError}
                            documentAggregateError={documentAggregateError}
                            onErrorClose={() => setObjectError(null)}
                            onSubmit={handleObjectSubmit}
                            onCancel={handleCancel}
                            onEdit={() => handleEdit()}
                            onActiveTabChange={setObjectActiveTab}
                            onDirtyChange={setGeneralInformationDirty}
                            onDocumentDirtyChange={setDocumentDirty}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("process.object.notFound", {
                                defaultValue: "آیتم فرآیندی انتخاب‌شده یافت نشد.",
                            })}
                        </MessageStrip>
                    )}
                </div>
            </Dialog>

            <DeleteConfirmDialog
                open={leaveConfirmationOpen || blocker.state === "blocked"}
                title={t("common.unsavedChanges.title", {
                    defaultValue: "Unsaved changes",
                })}
                message={t("common.unsavedChanges.message", {
                    defaultValue: "General Information or Document changes have not been saved. Leave and discard them?",
                })}
                confirmText={t("common.unsavedChanges.leave", { defaultValue: "Leave" })}
                cancelText={t("common.unsavedChanges.stay", { defaultValue: "Stay" })}
                loading={false}
                onClose={stayOnObjectPage}
                onConfirm={confirmObjectPageLeave}
            />

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("process.delete.title", { defaultValue: "حذف آیتم فرآیندی" })}
                message={t("process.delete.confirm", {
                    defaultValue: "آیا از حذف «{{title}}» مطمئن هستید؟",
                    title: deleteCandidate?.title ?? "",
                })}
                confirmText={t("common.delete", { defaultValue: "حذف" })}
                cancelText={t("common.cancel", { defaultValue: "انصراف" })}
                loading={submitting}
                onClose={() => setDeleteCandidate(null)}
                onConfirm={() => {
                    requestObjectPageLeave(() => {
                        void handleConfirmDelete();
                    });
                }}
            />

        </>
    );
}
