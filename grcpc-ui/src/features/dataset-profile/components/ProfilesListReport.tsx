import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar, Button, FlexBox, MessageStrip, Table,
  TableCell, TableHeaderCell, TableHeaderRow, TableRow, TableSelectionSingle, Text, Title,
} from "@ui5/webcomponents-react";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import type { DatasetProfile } from "../domain/profile.model";
import ProfileAvatar from "./ProfileAvatar";
import ProfileStatus from "./ProfileStatus";

type Props = {
  items: DatasetProfile[];
  selectedId?: string;
  searchText: string;
  loading: boolean;
  busy: boolean;
  error: string | null;
  onSearch: (value: string) => void;
  onCreate: () => void;
  actions?: ReactNode;
  onSelect: (id: string | null) => void;
  onShow: (id: string) => void;
};

export default function ProfilesListReport({
  items, selectedId, searchText, loading, busy, error,
  onSearch, onCreate, actions, onSelect, onShow,
}: Props) {
  const { t } = useTranslation();
  const query = searchText.trim().toLocaleLowerCase();
  const visibleItems = items.filter((profile) => profile.status !== "DELETED"
    && (!query || `${profile.name} ${profile.description ?? ""}`.toLocaleLowerCase().includes(query)));

  return <FlexBox direction="Column" className="profileManagementContent">
    <Bar startContent={<Title level="H4">{t("profile.listTitle")}</Title>} endContent={<>
      <HeaderSearch value={searchText} onChange={onSearch} />
      <Button design="Emphasized" disabled={busy || loading} onClick={onCreate}>{t("common.create")}</Button>
      <Button design="Emphasized" disabled={busy || loading || !selectedId} onClick={() => selectedId && onShow(selectedId)}>{t("management.view")}</Button>
      {actions}
    </>} />
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    <Table features={<TableSelectionSingle selected={selectedId} behavior="RowOnly" onChange={(event) => { if (!busy && !loading) onSelect(event.target.selected ?? null); }} />} accessibleName={t("profile.listTitle")} noDataText={t("profile.empty")} loading={loading || busy} overflowMode="Popin"
      headerRow={<TableHeaderRow>
        <TableHeaderCell importance={2} minWidth="12rem">{t("profile.name")}</TableHeaderCell>
        <TableHeaderCell importance={0} minWidth="16rem" popinText={t("profile.description")}>{t("profile.description")}</TableHeaderCell>
        <TableHeaderCell importance={1} minWidth="10rem" popinText={t("profile.statusLabel")}>{t("profile.statusLabel")}</TableHeaderCell>
      </TableHeaderRow>}>
      {visibleItems.map((profile) => <TableRow key={profile.id} rowKey={profile.id} interactive={!busy} navigated={selectedId === profile.id}>
        <TableCell><FlexBox alignItems="Center" className="profileManagementIdentity"><ProfileAvatar profile={profile} /><Text>{profile.name}</Text></FlexBox></TableCell>
        <TableCell><Text maxLines={2}>{profile.description || "-"}</Text></TableCell>
        <TableCell><ProfileStatus status={profile.status} /></TableCell>
      </TableRow>)}
    </Table>
  </FlexBox>;
}
