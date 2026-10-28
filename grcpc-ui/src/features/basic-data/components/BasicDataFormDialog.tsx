import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, FlexBox, Form, FormItem, Input, Label, MessageStrip, Text } from "@ui5/webcomponents-react";
import { useDialogOpenAfterRender } from "@/shared/hooks/useDialogOpenAfterRender";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import { DialogFooterBar } from "@/shared/components/DialogFooter";
import { currentProfile } from "@/features/dataset-profile/state/profile.state";
import { basicDataApi } from "../infra/basicData.api.repo";
import type { BasicDataKind, BasicDataType } from "../domain/basicData.model";
import "@/shared/components/management-pages.css";

export default function BasicDataFormDialog({ kind, row, onClose, onSaved }: {
  kind: BasicDataKind; row: BasicDataType | null; onClose: () => void; onSaved: (row: BasicDataType) => void;
}) {
  const { t } = useTranslation();
  const open = useDialogOpenAfterRender();
  const id = useId();
  const profile = currentProfile();
  const [form, setForm] = useState(() => ({ name: row?.name ?? "", description: row?.description ?? "" }));
  const [baseline] = useState(() => JSON.stringify(form));
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [leave, setLeave] = useState(false);
  const dirty = JSON.stringify(form) !== baseline;
  const valid = Boolean(form.name.trim() && profile?.status === "ACTIVE" && (!row || row.profileId === profile.id));
  const { blocker, runWithNavigationBypass } = useUnsavedChangesGuard(dirty || busy);
  const close = () => { if (!busy) { if (dirty) setLeave(true); else onClose(); } };
  const save = async () => {
    if (!valid || !dirty || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try {
      const saved = await basicDataApi.save(kind, row?.id ?? null, { name: form.name.trim(), description: form.description.trim() || null, version: row?.version });
      runWithNavigationBypass(() => onSaved(saved));
    } catch (error) { setError(error instanceof Error ? error.message : t("basicData.saveError")); }
    finally { saving.current = false; setBusy(false); }
  };
  return <>
    <Dialog open={open} className="managementDetailDialog" headerText={t(`basicData.${kind}.formTitle`)}
      onBeforeClose={(event) => { event.preventDefault(); close(); }}
      footer={<DialogFooterBar>
        <Button design="Emphasized" disabled={busy || !valid || !dirty} onClick={() => void save()}>{t("common.save")}</Button>
        <Button disabled={busy} onClick={close}>{t("common.cancel")}</Button>
      </DialogFooterBar>}>
      <FlexBox direction="Column" className="managementDialogContent">
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        <Form accessibleName={t(`basicData.${kind}.formTitle`)} accessibleMode="Edit" layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
          <FormItem labelContent={<Label>{t("basicData.profile")}</Label>}><Text>{row?.profileName ?? profile?.name ?? "—"}</Text></FormItem>
          <FormItem labelContent={<Label for={`${id}-name`} required>{t("basicData.name")}</Label>}>
            <Input id={`${id}-name`} value={form.name} maxlength={255} disabled={busy} onInput={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </FormItem>
          <FormItem labelContent={<Label for={`${id}-description`}>{t("basicData.description")}</Label>}>
            <Input id={`${id}-description`} value={form.description} maxlength={2000} disabled={busy} onInput={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </FormItem>
        </Form>
      </FlexBox>
    </Dialog>
    <DeleteConfirmDialog open={leave || blocker.state === "blocked"} title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")}
      confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")} loading={busy}
      onClose={() => { setLeave(false); if (blocker.state === "blocked") blocker.reset(); }}
      onConfirm={() => { if (!busy) { onClose(); if (blocker.state === "blocked") blocker.proceed(); } }} />
  </>;
}
