import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlexBox } from "@ui5/webcomponents-react";
import { useUserManagementState } from "@/features/usermanagement";
import RolesListReport from "./RolesListReport";

export default function RolesFclShellPage() {
  const { t } = useTranslation();
  const { rolesById, roleOrderedIds, loading, error, loadRoles, reset } = useUserManagementState();
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useMemo(() => roleOrderedIds.map((id) => rolesById[id]).filter(Boolean), [roleOrderedIds, rolesById]);
  useEffect(() => { void loadRoles(); return () => reset(); }, [loadRoles, reset, t]);
  return <FlexBox direction="Column" className="managementListPage">
    <RolesListReport items={items} selectedId={selectedId} searchText={searchText} busy={loading} error={error}
      onSearchTextChange={setSearchText} onSelect={setSelectedId} />
  </FlexBox>;
}
