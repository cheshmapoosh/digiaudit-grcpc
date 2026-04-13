import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, MessageStrip } from "@ui5/webcomponents-react";

import type {
    ProcessNode,
    ProcessNodeCreate,
    ProcessNodeUpdate,
} from "@/features/process";
import { useProcessStore, ROOT_PARENT } from "@/features/process";
import { hasChildren, sortProcesses } from "../utils/process.tree";
import ProcessesListReport from "./ProcessesListReport";
import ProcessObjectPage from "./ProcessObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";

type RouteMode = "list" | "create" | "view" | "edit";

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

function mapError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return "آیتم موردنظر یافت نشد";
            default:
                return error.message;
        }
    }

    return fallback;
}

export default function ProcessesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { processId } = useParams();

    const routeMode = useProcessRouteMode();

    const nodesById = useProcessStore((state) => state.nodesById);
    const loading = useProcessStore((state) => state.loading);
    const loadChildren = useProcessStore((state) => state.loadChildren);
    const createNode = useProcessStore((state) => state.createNode);
    const updateNode = useProcessStore((state) => state.updateNode);
    const removeNode = useProcessStore((state) => state.removeNode);
    const toggleStatus = useProcessStore((state) => state.toggleStatus);
    const refresh = useProcessStore((state) => state.refresh);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<ProcessNode | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const items = useMemo(() => sortProcesses(Object.values(nodesById)), [nodesById]);
    const selectedItem = processId ? nodesById[processId] ?? null : null;

    const queryParentId = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get("parentId");
    }, [location.search]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("process.errors.loadList", { defaultValue: "خطا در بارگذاری فرآیندها" }),
                ),
            );
        });
    }, [loadChildren, t]);

    const handleRefresh = useCallback(() => {
        setPageError(null);

        void refresh().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("process.errors.refresh", { defaultValue: "خطا در بروزرسانی اطلاعات" }),
                ),
            );
        });
    }, [refresh, t]);

    const handleSelect = useCallback(
        (id: string) => {
            navigate(`/processes/${id}`);
        },
        [navigate],
    );

    const handleCreateRoot = useCallback(() => {
        navigate("/processes/new");
    }, [navigate]);

    const handleCreateChild = useCallback(
        (parentId: string) => {
            navigate(`/processes/new?parentId=${encodeURIComponent(parentId)}`);
        },
        [navigate],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? processId;

            if (!targetId) {
                return;
            }

            navigate(`/processes/${targetId}/edit`);
        },
        [navigate, processId],
    );

    const handleCancel = useCallback(() => {
        navigate("/processes");
    }, [navigate]);

    const handleSubmitCreate = useCallback(
        async (payload: ProcessNodeCreate | ProcessNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                const created = await createNode(queryParentId, {
                    code: String(payload.code ?? "").trim(),
                    title: String(payload.title ?? "").trim(),
                    description:
                        typeof payload.description === "string"
                            ? payload.description.trim() || undefined
                            : undefined,
                    parentId: queryParentId,
                    ownerId: payload.ownerId === undefined ? null : (payload.ownerId ?? null),
                    sortOrder: typeof payload.sortOrder === "number" ? payload.sortOrder : 0,
                    status: payload.status === "inactive" ? "inactive" : "active",
                });

                navigate(`/processes/${created.id}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("process.errors.create", { defaultValue: "خطا در ایجاد فرآیند" }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [createNode, navigate, queryParentId, t],
    );

    const handleSubmitUpdate = useCallback(
        async (payload: ProcessNodeCreate | ProcessNodeUpdate) => {
            if (!processId) {
                return;
            }

            try {
                setSubmitting(true);
                setPageError(null);

                const updatePayload: ProcessNodeUpdate = {
                    code: typeof payload.code === "string" ? payload.code.trim() : payload.code,
                    title: typeof payload.title === "string" ? payload.title.trim() : payload.title,
                    description:
                        typeof payload.description === "string"
                            ? (payload.description.trim() || undefined)
                            : payload.description,
                    parentId: payload.parentId ?? null,
                    ownerId: payload.ownerId ?? null,
                    sortOrder: payload.sortOrder,
                    status: payload.status,
                };

                await updateNode(processId, updatePayload);
                navigate(`/processes/${processId}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("process.errors.update", { defaultValue: "خطا در بروزرسانی فرآیند" }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [navigate, processId, t, updateNode],
    );

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(t("process.errors.notFound", { defaultValue: "آیتم یافت نشد" }));
                return;
            }

            if (hasChildren(items, id)) {
                setPageError(
                    t("process.errors.hasChildren", {
                        defaultValue: "امکان حذف فرآیندی که زیرمجموعه دارد وجود ندارد",
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
                navigate(`/processes/${parentId}`);
                return;
            }

            navigate("/processes");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("process.errors.delete", { defaultValue: "خطا در حذف فرآیند" }),
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }, [deleteCandidate, navigate, removeNode, t]);

    const handleToggleStatus = useCallback(
        async (id: string) => {
            try {
                setPageError(null);
                await toggleStatus(id);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("process.errors.toggleStatus", {
                            defaultValue: "خطا در تغییر وضعیت فرآیند",
                        }),
                    ),
                );
            }
        },
        [t, toggleStatus],
    );

    const createInitialValue = useMemo<ProcessNode | null>(() => {
        if (routeMode !== "create") {
            return null;
        }

        return {
            id: "",
            code: "",
            title: "",
            description: "",
            parentId: queryParentId,
            ownerId: null,
            sortOrder: 0,
            status: "active",
        } as ProcessNode;
    }, [queryParentId, routeMode]);

    const objectMode = routeMode === "create" ? "create" : routeMode === "edit" ? "edit" : "view";
    const objectValue = routeMode === "create" ? createInitialValue : selectedItem;
    const showObjectPane = routeMode !== "list";

    return (
        <>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: showObjectPane
                        ? "minmax(24rem, 34rem) minmax(0, 1fr)"
                        : "1fr",
                    gap: "1rem",
                    minHeight: "calc(100vh - 10rem)",
                }}
            >
                <section
                    style={{
                        minWidth: 0,
                        overflow: "hidden",
                        border: "1px solid var(--sapGroup_ContentBorderColor)",
                        borderRadius: "1rem",
                        padding: "1rem",
                    }}
                >
                    <ProcessesListReport
                        items={items}
                        selectedId={processId ?? null}
                        searchText={searchText}
                        busy={loading || submitting}
                        error={pageError}
                        onSearchTextChange={setSearchText}
                        onRefresh={handleRefresh}
                        onCreateRoot={handleCreateRoot}
                        onSelect={handleSelect}
                        onCreateChild={handleCreateChild}
                        onEdit={handleEdit}
                        onDelete={requestDelete}
                        onToggleStatus={(id) => {
                            void handleToggleStatus(id);
                        }}
                    />
                </section>

                {showObjectPane ? (
                    <section
                        style={{
                            minWidth: 0,
                            overflow: "auto",
                            border: "1px solid var(--sapGroup_ContentBorderColor)",
                            borderRadius: "1rem",
                            padding: "1rem",
                        }}
                    >
                        {loading && !objectValue && routeMode !== "create" ? (
                            <BusyIndicator active />
                        ) : objectValue ? (
                            <ProcessObjectPage
                                key={`${objectMode}:${objectValue.id || "new"}:${objectValue.parentId ?? "root"}`}
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
                                {t("process.object.notFound", {
                                    defaultValue: "فرآیند انتخاب‌شده یافت نشد",
                                })}
                            </MessageStrip>
                        )}
                    </section>
                ) : null}
            </div>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("process.delete.title", { defaultValue: "حذف فرآیند" })}
                message={t("process.delete.confirm", {
                    defaultValue: 'آیا از حذف "{{title}}" مطمئن هستید؟',
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