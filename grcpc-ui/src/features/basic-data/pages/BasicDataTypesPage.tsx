import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bar, Button, FlexBox, Form, FormItem, Label, MessageStrip, ObjectStatus, Table, TableCell, TableHeaderCell, TableHeaderRow, TableRow, TableSelectionSingle, Text, Title } from "@ui5/webcomponents-react";
import { currentProfile, useProfileState } from "@/features/dataset-profile/state/profile.state";
import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { ManagementDetailDialog } from "@/shared/components/ManagementDetailDialog";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import type { BasicDataKind, BasicDataType } from "../domain/basicData.model";
import { basicDataApi } from "../infra/basicData.api.repo";
import BasicDataFormDialog from "../components/BasicDataFormDialog";
import "@/shared/components/management-pages.css";

export default function BasicDataTypesPage({ kind }: { kind: BasicDataKind }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { typeId } = useParams();
  useProfileState((state) => state.profiles);
  const profile = currentProfile();
  const writable = profile?.status === "ACTIVE";
  const [items, setItems] = useState<BasicDataType[]>([]);
  const [editor, setEditor] = useState<BasicDataType | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const base = `/basic-data/${kind}`;
  const activeId = typeId ?? selectedId;
  const selected = items.find((row) => row.id === activeId && row.profileId === profile?.id);
  const query = search.trim().toLocaleLowerCase();
  const visible = items.filter((row) => row.profileId === profile?.id && (!query || `${row.name} ${row.description ?? ""}`.toLocaleLowerCase().includes(query)));
  const refresh = useCallback(async () => {
    const request = ++generation.current; setLoading(true); setError(null);
    try { const rows = await basicDataApi.list(kind); if (request === generation.current) setItems(rows); }
    catch (error) { if (request === generation.current) setError(error instanceof Error ? error.message : t("basicData.loadError")); }
    finally { if (request === generation.current) setLoading(false); }
  }, [kind, t]);
  useEffect(() => { const requests = generation; void refresh(); return () => { requests.current++; }; }, [refresh]);
  const apply = (row: BasicDataType) => setItems((current) => row.status === "DELETED" ? current.filter((item) => item.id !== row.id)
    : current.some((item) => item.id === row.id) ? current.map((item) => item.id === row.id ? row : item) : [...current, row]);
  const perform = async (command: "activate" | "inactivate" | "delete") => {
    if (!selected || !writable || pending.current) return;
    pending.current = true; setBusy(true); setError(null);
    try { const saved = await basicDataApi.lifecycle(kind, selected, command); apply(saved); setDeleteOpen(false);
      if (saved.status === "DELETED") { setSelectedId(null); if (typeId) navigate(base); }
    } catch (error) { setError(error instanceof Error ? error.message : t("basicData.saveError")); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <FlexBox direction="Column" className="managementListPage">
      <Bar startContent={<Title level="H4">{t(`basicData.${kind}.title`)}</Title>} endContent={<>
        <HeaderSearch value={search} onChange={setSearch} disabled={busy || loading} />
        <Button design="Emphasized" disabled={busy || loading || !writable} onClick={() => setEditor(null)}>{t("common.create")}</Button>
        <Button disabled={busy || loading || !selected} onClick={() => selected && navigate(`${base}/${selected.id}`)}>{t("management.view")}</Button>
        <Button disabled={busy || loading || !selected || !writable} onClick={() => void perform(selected?.status === "ACTIVE" ? "inactivate" : "activate")}>{t(selected?.status === "INACTIVE" ? "profile.activate" : "profile.inactivate")}</Button>
        <Button design="Negative" disabled={busy || loading || !selected || !writable} onClick={() => setDeleteOpen(true)}>{t("common.delete")}</Button>
      </>} />
      <Text>{t("basicData.profile")}: {profile?.name ?? "—"}</Text>
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
      <Table loading={loading || busy} noDataText={t("basicData.empty")} accessibleName={t(`basicData.${kind}.title`)} overflowMode="Popin"
        features={<TableSelectionSingle selected={activeId ?? undefined} behavior="RowOnly" onChange={(event) => { if (!busy && !loading) setSelectedId(event.target.selected ?? null); }} />}
        headerRow={<TableHeaderRow>
          <TableHeaderCell>{t("basicData.name")}</TableHeaderCell><TableHeaderCell>{t("basicData.description")}</TableHeaderCell>
          <TableHeaderCell>{t("basicData.profile")}</TableHeaderCell><TableHeaderCell>{t("common.status")}</TableHeaderCell>
        </TableHeaderRow>}>
        {visible.map((row) => <TableRow key={row.id} rowKey={row.id} interactive={!busy} navigated={activeId === row.id}>
          <TableCell><Text>{row.name}</Text></TableCell><TableCell><Text maxLines={2}>{row.description || "—"}</Text></TableCell>
          <TableCell><Text>{row.profileName}</Text></TableCell><TableCell><ObjectStatus state={row.status === "ACTIVE" ? "Positive" : "Negative"}>{t(row.status === "ACTIVE" ? "common.active" : "common.inactive")}</ObjectStatus></TableCell>
        </TableRow>)}
      </Table>
    </FlexBox>
    {typeId && editor === undefined && (selected || !loading) ? <ManagementDetailDialog title={t(`basicData.${kind}.formTitle`)} busy={busy || loading}
      onClose={() => { setSelectedId(typeId); navigate(base); }} onEdit={selected && writable ? () => setEditor(selected) : undefined}>
      {selected ? <Form accessibleMode="Display" layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
        <FormItem labelContent={<Label>{t("basicData.profile")}</Label>}><Text>{selected.profileName}</Text></FormItem>
        <FormItem labelContent={<Label>{t("basicData.name")}</Label>}><Text>{selected.name}</Text></FormItem>
        <FormItem labelContent={<Label>{t("basicData.description")}</Label>}><Text>{selected.description || "—"}</Text></FormItem>
        <FormItem labelContent={<Label>{t("common.status")}</Label>}><ObjectStatus state={selected.status === "ACTIVE" ? "Positive" : "Negative"}>{t(selected.status === "ACTIVE" ? "common.active" : "common.inactive")}</ObjectStatus></FormItem>
      </Form> : <MessageStrip design="Information" hideCloseButton>{t("basicData.notFound")}</MessageStrip>}
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    </ManagementDetailDialog> : null}
    {editor !== undefined ? <BasicDataFormDialog kind={kind} row={editor} onClose={() => setEditor(undefined)} onSaved={(saved) => {
      apply(saved); setEditor(undefined); setSelectedId(saved.id); setSearch(""); navigate(`${base}/${saved.id}`);
    }} /> : null}
    <DeleteConfirmDialog open={deleteOpen} title={t("common.delete")} message={t("basicData.deleteConfirm", { name: selected?.name ?? "" })} loading={busy}
      onClose={() => { if (!pending.current) setDeleteOpen(false); }} onConfirm={() => void perform("delete")} />
  </>;
}
