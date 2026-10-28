import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, FlexBox, MessageStrip } from "@ui5/webcomponents-react";
import { ManagementDetailDialog } from "@/shared/components/ManagementDetailDialog";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { profileApi } from "../infra/profile.api.repo";
import { useProfileState } from "../state/profile.state";
import type { DatasetProfile } from "../domain/profile.model";
import ProfilesListReport from "../components/ProfilesListReport";
import ProfileObjectPage from "../components/ProfileObjectPage";
import ProfileFormDialog from "../components/ProfileFormDialog";
import "../profile.css";

type LifecycleCommand = "activate" | "inactivate" | "delete" | "restore";

export default function ProfilesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();
  const [items, setItems] = useState<DatasetProfile[]>([]);
  const [editor, setEditor] = useState<DatasetProfile | null | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mutationPending = useRef(false);
  const loadGeneration = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const activeId = profileId ?? selectedId;
  const selected = items.find((profile) => profile.id === activeId && profile.status !== "DELETED");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const generation = ++loadGeneration.current;
    setLoading(true); setError(null);
    try {
      const rows = await profileApi.management();
      if (!signal?.aborted && generation === loadGeneration.current) setItems(rows);
    } catch (error) {
      if (!signal?.aborted && generation === loadGeneration.current) setError(error instanceof Error ? error.message : t("profile.loadError"));
    } finally { if (!signal?.aborted && generation === loadGeneration.current) setLoading(false); }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  function applySaved(profile: DatasetProfile) {
    setItems((current) => current.some((item) => item.id === profile.id)
      ? current.map((item) => item.id === profile.id ? profile : item) : [...current, profile]);
    void useProfileState.getState().load();
  }

  async function perform(command: LifecycleCommand) {
    if (!selected || mutationPending.current) return;
    mutationPending.current = true; setBusy(true); setError(null);
    try {
      const saved = await profileApi.lifecycle(selected, command);
      applySaved(saved); setDeleteOpen(false);
      if (saved.status === "DELETED") { setSelectedId(null); if (profileId) navigate("/profiles"); }
    } catch (error) { setError(error instanceof Error ? error.message : t("profile.saveError")); }
    finally { mutationPending.current = false; setBusy(false); }
  }

  return <>
    <FlexBox direction="Column" className="managementListPage">
      <ProfilesListReport items={items} selectedId={activeId ?? undefined} searchText={searchText} loading={loading} busy={busy} error={error}
        onSearch={setSearchText} onCreate={() => setEditor(null)} onSelect={setSelectedId}
        actions={<><Button disabled={busy || loading || !selected} onClick={() => selected && void perform(selected.status === "ACTIVE" ? "inactivate" : "activate")}>{t(selected?.status === "INACTIVE" ? "profile.activate" : "profile.inactivate")}</Button>
          <Button design="Negative" disabled={busy || loading || !selected} onClick={() => setDeleteOpen(true)}>{t("common.delete")}</Button></>}
        onShow={(id) => navigate(`/profiles/${id}`)} />
    </FlexBox>
    {profileId && editor === undefined && (selected || !loading) ? <ManagementDetailDialog title={t("profile.detailTitle")} busy={busy || loading}
      onClose={() => { setSelectedId(profileId); navigate("/profiles"); }} onEdit={selected ? () => setEditor(selected) : undefined}>
      {selected ? <ProfileObjectPage profile={selected} /> :
        <MessageStrip design={error ? "Negative" : "Information"} hideCloseButton>{error ?? t("profile.notFound")}</MessageStrip>}
      {error && selected ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    </ManagementDetailDialog> : null}
    {editor !== undefined ? <ProfileFormDialog profile={editor} onClose={() => setEditor(undefined)} onSaved={(profile) => {
      applySaved(profile); setEditor(undefined); setSearchText(""); setSelectedId(profile.id);
      navigate(`/profiles/${profile.id}`);
    }} /> : null}
    <DeleteConfirmDialog open={deleteOpen} title={t("common.delete")} message={t("profile.deleteConfirm")} loading={busy}
      onClose={() => { if (!mutationPending.current) setDeleteOpen(false); }} onConfirm={() => void perform("delete")} />
  </>;
}
