import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BusyIndicator, Button, FlexBox, MessageStrip } from "@ui5/webcomponents-react";
import { ManagementDetailDialog } from "@/shared/components/ManagementDetailDialog";
import { useUserManagementState } from "@/features/usermanagement";
import { useAuthState } from "@/features/auth/state/auth.state";
import type { UserDetail, UserSummary } from "../domain/usermanagement.model";
import UserSecurityDialog from "../components/UserSecurityDialog";
import UserFormDialog from "../components/UserFormDialog";
import UsersListReport from "./UsersListReport";
import UserObjectPage from "./UserObjectPage";

export default function UsersFclShellPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { usersById, userOrderedIds, selectedUser, loading, loadUsers, loadUser, refreshUsers, reset } = useUserManagementState();
  const isRoot = useAuthState((state) => Boolean(state.me?.rootUser));
  const canManage = useAuthState((state) => Boolean(state.me?.rootUser || state.me?.authorities.includes("ROLE_PROFILE_ADMIN")));
  const [securityAction, setSecurityAction] = useState<{ user: UserSummary; mode: "password" | "status" } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = userId ?? selectedId;
  const [searchText, setSearchText] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const items = useMemo(() => userOrderedIds.map((id) => usersById[id]).filter(Boolean), [userOrderedIds, usersById]);
  const visibleUser = selectedUser?.id === userId ? selectedUser : null;
  const actionUser = activeId ? usersById[activeId] ?? (selectedUser?.id === activeId ? selectedUser : null) : null;
  const canEdit = canManage && Boolean(actionUser && (isRoot || (!actionUser.rootUser && !actionUser.profileAdmin)));
  const canChangeStatus = canEdit && !actionUser?.rootUser;

  useEffect(() => {
    void loadUsers().catch((error: unknown) => setPageError(error instanceof Error ? error.message : t("usermanagement.errors.loadList")));
    return () => reset();
  }, [loadUsers, reset, t]);
  useEffect(() => {
    if (userId) void loadUser(userId).catch((error: unknown) => setPageError(error instanceof Error ? error.message : t("usermanagement.errors.loadDetail")));
  }, [userId, loadUser, t]);

  function refreshDetail() {
    void Promise.all([refreshUsers(), ...(userId ? [loadUser(userId)] : [])]).catch(() => setPageError(t("usermanagement.errors.refresh")));
  }

  return <>
    <FlexBox direction="Column" className="managementListPage">
      <UsersListReport items={items} selectedId={activeId} searchText={searchText} busy={loading} error={pageError}
        onSearchTextChange={setSearchText} onCreate={canManage ? () => setCreateOpen(true) : undefined}
        actions={canManage ? <>
          <Button disabled={loading || !canChangeStatus} tooltip={actionUser?.rootUser ? t("usermanagement.security.rootStatusProtected") : undefined}
            onClick={() => actionUser && canChangeStatus && setSecurityAction({ user: actionUser, mode: "status" })}>{t(actionUser?.enabled !== false ? "usermanagement.security.disable" : "usermanagement.security.enable")}</Button>
          <Button disabled={loading || !canEdit} onClick={() => actionUser && canEdit && setSecurityAction({ user: actionUser, mode: "password" })}>{t("usermanagement.security.resetPassword")}</Button>
        </> : undefined}
        onSelect={(id) => { setSelectedId(id); setPageError(null); }}
        onShow={(id) => navigate(`/access-control/users/${id}`)} />
    </FlexBox>
    {userId && !editing && !securityAction && !createOpen ? <ManagementDetailDialog title={t("usermanagement.users.detailTitle")} busy={loading}
      onClose={() => { setSelectedId(userId); navigate("/access-control/users"); }} onEdit={visibleUser && canEdit ? () => setEditing(visibleUser) : undefined}>
      {visibleUser ? <UserObjectPage value={visibleUser} error={pageError} /> : loading ? <BusyIndicator active /> :
        <MessageStrip design={pageError ? "Negative" : "Information"} hideCloseButton>{pageError ?? t("usermanagement.users.notFound")}</MessageStrip>}
    </ManagementDetailDialog> : null}
    {securityAction && canManage ? <UserSecurityDialog user={securityAction.user} mode={securityAction.mode} onClose={() => setSecurityAction(null)}
      onSaved={() => { setSecurityAction(null); refreshDetail(); }} /> : null}
    {createOpen && canManage ? <UserFormDialog onClose={() => setCreateOpen(false)} onCreated={(id) => {
      setCreateOpen(false); setSelectedId(id); navigate(`/access-control/users/${id}`);
      void refreshUsers().catch(() => setPageError(t("usermanagement.errors.refresh")));
    }} /> : null}
    {editing && canManage ? <UserFormDialog user={editing} onClose={() => setEditing(null)} onCreated={(id) => {
      setEditing(null); void Promise.all([refreshUsers(), loadUser(id)]).catch(() => setPageError(t("usermanagement.errors.refresh")));
    }} /> : null}
  </>;
}
