import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, MessageStrip } from "@ui5/webcomponents-react";

import type {
    OrganizationNode,
    OrganizationNodeCreate,
    OrganizationNodeUpdate,
} from "@/features/organization";
import { useOrganizationState, ROOT_PARENT } from "@/features/organization";
import { hasChildren, sortOrganizations } from "../utils/organization.tree";
import OrganizationsListReport from "./OrganizationsListReport";
import OrganizationObjectPage from "./OrganizationObjectPage";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";

type RouteMode = "list" | "create" | "view" | "edit";

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

export default function OrganizationsFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { organizationId } = useParams();

    const routeMode = useOrganizationRouteMode();

    const nodesById = useOrganizationState((state) => state.nodesById);
    const loading = useOrganizationState((state) => state.loading);
    const loadChildren = useOrganizationState((state) => state.loadChildren);
    const createNode = useOrganizationState((state) => state.createNode);
    const updateNode = useOrganizationState((state) => state.updateNode);
    const removeNode = useOrganizationState((state) => state.removeNode);
    const toggleStatus = useOrganizationState((state) => state.toggleStatus);
    const refresh = useOrganizationState((state) => state.refresh);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<OrganizationNode | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const items = useMemo(() => sortOrganizations(Object.values(nodesById)), [nodesById]);
    const selectedItem = organizationId ? nodesById[organizationId] ?? null : null;

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

    const handleRefresh = useCallback(() => {
        setPageError(null);

        void refresh().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.refresh", {
                        defaultValue: "خطا در بروزرسانی اطلاعات",
                    }),
                ),
            );
        });
    }, [refresh, t]);

    const handleSelect = useCallback(
        (id: string) => {
            navigate(`/organizations/${id}`);
        },
        [navigate],
    );

    const handleCreateRoot = useCallback(() => {
        navigate("/organizations/new");
    }, [navigate]);

    const handleCreateChild = useCallback(
        (parentId: string) => {
            navigate(`/organizations/new?parentId=${encodeURIComponent(parentId)}`);
        },
        [navigate],
    );

    const handleEdit = useCallback(
        (id?: string) => {
            const targetId = id ?? organizationId;

            if (!targetId) {
                return;
            }

            navigate(`/organizations/${targetId}/edit`);
        },
        [navigate, organizationId],
    );

    const handleCancel = useCallback(() => {
        navigate("/organizations");
    }, [navigate]);

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
                        typeof payload.validFrom === "string" ? payload.validFrom || undefined : undefined,
                    validTo:
                        typeof payload.validTo === "string" ? payload.validTo || undefined : undefined,
                });

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
                        typeof payload.validFrom === "string" ? payload.validFrom || undefined : payload.validFrom,
                    validTo:
                        typeof payload.validTo === "string" ? payload.validTo || undefined : payload.validTo,
                };

                await updateNode(organizationId, updatePayload);
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

            if (parentId) {
                navigate(`/organizations/${parentId}`);
                return;
            }

            navigate("/organizations");
        } catch (error) {
            setPageError(
                mapError(
                    error,
                    t("organization.errors.delete", { defaultValue: "خطا در حذف واحد سازمانی" }),
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
                        t("organization.errors.toggleStatus", {
                            defaultValue: "خطا در تغییر وضعیت واحد سازمانی",
                        }),
                    ),
                );
            }
        },
        [t, toggleStatus],
    );

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
                    <OrganizationsListReport
                        items={items}
                        selectedId={organizationId ?? null}
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
                            <OrganizationObjectPage
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
                                {t("organization.object.notFound", {
                                    defaultValue: "واحد سازمانی انتخاب‌شده یافت نشد",
                                })}
                            </MessageStrip>
                        )}
                    </section>
                ) : null}
            </div>

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