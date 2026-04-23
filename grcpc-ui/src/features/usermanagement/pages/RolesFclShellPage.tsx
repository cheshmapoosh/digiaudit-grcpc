import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, MessageStrip } from "@ui5/webcomponents-react";

import { useUserManagementState } from "@/features/usermanagement";
import RolesListReport from "./RolesListReport";
import RoleObjectPage from "./RoleObjectPage";

export default function RolesFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { roleId } = useParams<{ roleId: string }>();

    const rolesById = useUserManagementState((state) => state.rolesById ?? {});
    const roleOrderedIds = useUserManagementState((state) => state.roleOrderedIds ?? []);
    const selectedRole = useUserManagementState((state) => state.selectedRole);
    const loading = useUserManagementState((state) => state.loading);
    const error = useUserManagementState((state) => state.error);
    const loadRoles = useUserManagementState((state) => state.loadRoles);
    const loadRole = useUserManagementState((state) => state.loadRole);
    const refreshRoles = useUserManagementState((state) => state.refreshRoles);
    const clearError = useUserManagementState((state) => state.clearError);
    const reset = useUserManagementState((state) => state.reset);

    const [searchText, setSearchText] = useState("");

    const items = useMemo(
        () =>
            roleOrderedIds
                .map((id) => rolesById[id])
                .filter(Boolean),
        [roleOrderedIds, rolesById],
    );

    const showDetailPane = Boolean(roleId);

    useEffect(() => {
        void loadRoles();

        return () => {
            reset();
        };
    }, [loadRoles, reset]);

    useEffect(() => {
        if (!roleId) {
            return;
        }

        void loadRole(roleId);
    }, [loadRole, roleId]);

    const handleRefresh = useCallback(() => {
        clearError();
        void refreshRoles();
    }, [clearError, refreshRoles]);

    const handleSelect = useCallback(
        (id: string) => {
            clearError();
            navigate(`/access-control/roles/${id}`);
        },
        [clearError, navigate],
    );

    const handleClose = useCallback(() => {
        clearError();
        navigate("/access-control/roles");
    }, [clearError, navigate]);

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
                    error={error}
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
                            error={error}
                            onCancel={handleClose}
                        />
                    ) : error ? (
                        <MessageStrip design="Negative" hideCloseButton>
                            {error}
                        </MessageStrip>
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