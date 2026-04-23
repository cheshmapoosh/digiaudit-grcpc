import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, MessageStrip } from "@ui5/webcomponents-react";

import { useUserManagementState } from "@/features/usermanagement";
import UsersListReport from "./UsersListReport";
import UserObjectPage from "./UserObjectPage";

function mapError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

export default function UsersFclShellPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { userId } = useParams<{ userId: string }>();

    const usersById = useUserManagementState((state) => state.usersById ?? {});
    const userOrderedIds = useUserManagementState((state) => state.userOrderedIds ?? []);
    const selectedUser = useUserManagementState((state) => state.selectedUser);
    const loading = useUserManagementState((state) => state.loading);
    const loadUsers = useUserManagementState((state) => state.loadUsers);
    const loadUser = useUserManagementState((state) => state.loadUser);
    const refreshUsers = useUserManagementState((state) => state.refreshUsers);
    const reset = useUserManagementState((state) => state.reset);

    const [searchText, setSearchText] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);

    const items = useMemo(
        () =>
            userOrderedIds
                .map((id) => usersById[id])
                .filter(Boolean),
        [userOrderedIds, usersById],
    );

    const showDetailPane = Boolean(userId);

    useEffect(() => {
        void loadUsers().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("usermanagement.errors.loadList", {
                        defaultValue: "خطا در بارگذاری کاربران",
                    }),
                ),
            );
        });

        return () => {
            reset();
        };
    }, [loadUsers, reset, t]);

    useEffect(() => {
        if (!userId) {
            return;
        }

        void loadUser(userId).catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("usermanagement.errors.loadDetail", {
                        defaultValue: "خطا در بارگذاری اطلاعات کاربر",
                    }),
                ),
            );
        });
    }, [loadUser, t, userId]);

    const handleRefresh = useCallback(() => {
        setPageError(null);

        void refreshUsers().catch((error: unknown) => {
            setPageError(
                mapError(
                    error,
                    t("usermanagement.errors.refresh", {
                        defaultValue: "خطا در بروزرسانی اطلاعات",
                    }),
                ),
            );
        });
    }, [refreshUsers, t]);

    const handleSelect = useCallback(
        (id: string) => {
            navigate(`/access-control/users/${id}`);
        },
        [navigate],
    );

    const handleClose = useCallback(() => {
        navigate("/access-control/users");
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
                <UsersListReport
                    items={items}
                    selectedId={userId ?? null}
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
                    {loading && !selectedUser ? (
                        <BusyIndicator active />
                    ) : selectedUser ? (
                        <UserObjectPage
                            key={selectedUser.id}
                            value={selectedUser}
                            busy={loading}
                            error={pageError}
                            onCancel={handleClose}
                        />
                    ) : (
                        <MessageStrip design="Information" hideCloseButton>
                            {t("usermanagement.users.notFound", {
                                defaultValue: "کاربر انتخاب‌شده یافت نشد",
                            })}
                        </MessageStrip>
                    )}
                </section>
            ) : null}
        </div>
    );
}