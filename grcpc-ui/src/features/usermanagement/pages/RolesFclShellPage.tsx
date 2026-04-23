import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, MessageStrip } from "@ui5/webcomponents-react";

import { useUserManagementState } from "@/features/usermanagement";
import RolesListReport from "./RolesListReport";
import RoleObjectPage from "./RoleObjectPage";

function mapError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

export default function RolesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { roleId } = useParams<{ roleId: string }>();

    const rolesById = useUserManagementState((state) => state.rolesById ?? {});
    const roleOrderedIds = useUserManagementState((state) => state.roleOrderedIds ?? []);
    const selectedRole = useUserManagementState((state) => state.selectedRole);
    const loading = useUserManagementState((state) => state.loading);
    const loadRoles = useUserManagementState((state) => state.loadRoles);
    const loadRole = useUserManagementState((state) => state.loadRole);
    const refreshRoles = useUserManagementState((state) => state.refreshRoles);
    const reset = useUserManagementState((state) => state.reset);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);

    const items = useMemo(
        () =>
            roleOrderedIds
                .map((id) => rolesById[id])
                .filter(Boolean),
        [roleOrderedIds, rolesById],
    );

    const showDetailPane = Boolean(roleId);

    useEffect(() => {
        void loadRoles().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("usermanagement.errors.loadRoles", {
                        defaultValue: "خطا در بارگذاری نقش‌ها",
                    }),
                ),
            );
        });

        return () => {
            reset();
        };
    }, [loadRoles, reset, t]);

    useEffect(() => {
        if (!roleId) {
            return;
        }

        void loadRole(roleId).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("usermanagement.errors.loadRoleDetail", {
                        defaultValue: "خطا در بارگذاری اطلاعات نقش",
                    }),
                ),
            );
        });
    }, [loadRole, roleId, t]);

    const handleRefresh = useCallback(() => {
        setPageError(null);

        void refreshRoles().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("usermanagement.errors.refreshRoles", {
                        defaultValue: "خطا در بروزرسانی نقش‌ها",
                    }),
                ),
            );
        });
    }, [refreshRoles, t]);

    const handleSelect = useCallback(
        (id: string) => {
            navigate(`/access-control/roles/${id}`);
        },
        [navigate],
    );

    const handleClose = useCallback(() => {
        navigate("/access-control/roles");
    }, [navigate]);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: showDetailPane
                    ? "28rem minmax(0, 1fr)"
                    : "minmax(0, 1fr)",
                gap: "1rem",
                height: "calc(100vh - 10rem)",
                alignItems: "stretch",
            }}
        >
            <section
                style={{
                    minWidth: 0,
                    overflow: "hidden",
                    border: "1px solid var(--sapGroup_ContentBorderColor)",
                    borderRadius: "1rem",
                    padding: "1rem",
                    boxSizing: "border-box",
                    background: "var(--sapGroup_ContentBackground)",
                }}
            >
                <RolesListReport
                    items={items}
                    selectedId={roleId ?? null}
                    searchText={searchText}
                    busy={loading}
                    error={pageError}
                    onSearchTextChange={setSearchText}
                    onRefresh={handleRefresh}
                    onSelect={handleSelect}
                />
            </section>

            {showDetailPane ? (
                <section
                    style={{
                        minWidth: 0,
                        overflow: "auto",
                        border: "1px solid var(--sapGroup_ContentBorderColor)",
                        borderRadius: "1rem",
                        padding: "1rem",
                        boxSizing: "border-box",
                        background: "var(--sapGroup_ContentBackground)",
                    }}
                >
                    {loading && !selectedRole ? (
                        <BusyIndicator active />
                    ) : selectedRole ? (
                        <RoleObjectPage
                            key={selectedRole.id}
                            value={selectedRole}
                            busy={loading}
                            error={pageError}
                            onCancel={handleClose}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("usermanagement.roles.notFound", {
                                defaultValue: "نقش انتخاب‌شده یافت نشد",
                            })}
                        </MessageStrip>
                    )}
                </section>
            ) : null}
        </div>
    );
}