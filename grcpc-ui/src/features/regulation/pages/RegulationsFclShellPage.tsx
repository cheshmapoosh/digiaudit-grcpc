import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, MessageStrip } from "@ui5/webcomponents-react";

import type {
    RegulationNode,
    RegulationNodeCreate,
    RegulationNodeUpdate,
} from "@/features/regulation";
import { useRegulationState, ROOT_PARENT } from "@/features/regulation";
import { hasChildren, sortRegulations } from "../utils/regulation.tree";
import RegulationsListReport from "./RegulationsListReport";
import RegulationObjectPage from "./RegulationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";

type RouteMode = "list" | "create" | "view" | "edit";

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

function mapError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        switch (error.message) {
            case "NOT_FOUND":
                return "آیتم موردنظر یافت نشد";
            case "HAS_CHILDREN":
                return "امکان حذف آیتمی که زیرمجموعه دارد وجود ندارد";
            default:
                return error.message;
        }
    }

    return fallback;
}

export default function RegulationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { regulationId } = useParams();

    const routeMode = useRegulationRouteMode();

    const nodesById = useRegulationState((state) => state.nodesById);
    const loading = useRegulationState((state) => state.loading);
    const loadChildren = useRegulationState((state) => state.loadChildren);
    const createNode = useRegulationState((state) => state.createNode);
    const updateNode = useRegulationState((state) => state.updateNode);
    const removeNode = useRegulationState((state) => state.removeNode);
    const toggleStatus = useRegulationState((state) => state.toggleStatus);
    const refresh = useRegulationState((state) => state.refresh);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<RegulationNode | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const items = useMemo(() => sortRegulations(Object.values(nodesById)), [nodesById]);
    const selectedItem = regulationId ? nodesById[regulationId] ?? null : null;

    const queryParentId = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get("parentId");
    }, [location.search]);

    useEffect(() => {
        void loadChildren(ROOT_PARENT).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("regulation.errors.loadList", {
                        defaultValue: "خطا در بارگذاری قوانین و مقررات",
                    }),
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
                    t("regulation.errors.refresh", {
                        defaultValue: "خطا در بروزرسانی اطلاعات",
                    }),
                ),
            );
        });
    }, [refresh, t]);

    const handleSelect = useCallback(
        (id: string) => {
            navigate(`/regulations/${id}`);
        },
        [navigate],
    );

    const handleCreateRoot = useCallback(() => {
        navigate("/regulations/new");
    }, [navigate]);

    const handleCreateChild = useCallback(
        (parentId: string) => {
            navigate(`/regulations/new?parentId=${encodeURIComponent(parentId)}`);
        },
        [navigate],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? regulationId;

            if (!targetId) {
                return;
            }

            navigate(`/regulations/${targetId}/edit`);
        },
        [navigate, regulationId],
    );

    const handleCancel = useCallback(() => {
        navigate("/regulations");
    }, [navigate]);

    const handleSubmitCreate = useCallback(
        async (payload: RegulationNodeCreate | RegulationNodeUpdate) => {
            try {
                setSubmitting(true);
                setPageError(null);

                const created = await createNode(queryParentId, {
                    code: String(payload.code ?? "").trim(),
                    name: String(payload.name ?? "").trim(),
                    type: payload.type ?? "regulation",
                    description:
                        typeof payload.description === "string"
                            ? payload.description.trim() || undefined
                            : undefined,
                    parentId: queryParentId,
                    status: payload.status === "inactive" ? "inactive" : "active",
                    validFrom:
                        typeof payload.validFrom === "string" ? payload.validFrom || undefined : undefined,
                    validTo:
                        typeof payload.validTo === "string" ? payload.validTo || undefined : undefined,
                });

                navigate(`/regulations/${created.id}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("regulation.errors.create", {
                            defaultValue: "خطا در ایجاد قانون / مقرره",
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
        async (payload: RegulationNodeCreate | RegulationNodeUpdate) => {
            if (!regulationId) {
                return;
            }

            try {
                setSubmitting(true);
                setPageError(null);

                const updatePayload: RegulationNodeUpdate = {
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
                        typeof payload.validFrom === "string" ? payload.validFrom || undefined : payload.validFrom,
                    validTo:
                        typeof payload.validTo === "string" ? payload.validTo || undefined : payload.validTo,
                };

                await updateNode(regulationId, updatePayload);
                navigate(`/regulations/${regulationId}`);
            } catch (error) {
                setPageError(
                    mapError(
                        error,
                        t("regulation.errors.update", {
                            defaultValue: "خطا در بروزرسانی قانون / مقرره",
                        }),
                    ),
                );
            } finally {
                setSubmitting(false);
            }
        },
        [navigate, regulationId, t, updateNode],
    );

    const requestDelete = useCallback(
        (id: string) => {
            const target = nodesById[id];

            if (!target) {
                setPageError(t("regulation.errors.notFound", { defaultValue: "آیتم یافت نشد" }));
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
                navigate(`/regulations/${parentId}`);
                return;
            }

            navigate("/regulations");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("regulation.errors.delete", { defaultValue: "خطا در حذف قانون / مقرره" }),
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
                        t("regulation.errors.toggleStatus", {
                            defaultValue: "خطا در تغییر وضعیت قانون / مقرره",
                        }),
                    ),
                );
            }
        },
        [t, toggleStatus],
    );

    const createInitialValue = useMemo<RegulationNode | null>(() => {
        if (routeMode !== "create") {
            return null;
        }

        return {
            id: "",
            code: "",
            name: "",
            type: "regulation",
            description: "",
            parentId: queryParentId,
            status: "active",
            validFrom: "",
            validTo: "",
        } as RegulationNode;
    }, [queryParentId, routeMode]);

    const objectMode =
        routeMode === "create"
            ? "create"
            : routeMode === "edit"
                ? "edit"
                : "view";

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
                    <RegulationsListReport
                        items={items}
                        selectedId={regulationId ?? null}
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
                            <RegulationObjectPage
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
                                {t("regulation.object.notFound", {
                                    defaultValue: "قانون / مقرره انتخاب‌شده یافت نشد",
                                })}
                            </MessageStrip>
                        )}
                    </section>
                ) : null}
            </div>

            <DeleteConfirmDialog
                open={Boolean(deleteCandidate)}
                title={t("regulation.delete.title", { defaultValue: "حذف قانون / مقرره" })}
                message={t("regulation.delete.confirm", {
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