import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, FlexBox, Form, FormItem, Input, Label, MessageStrip } from "@ui5/webcomponents-react";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { useDialogOpenAfterRender } from "@/shared/hooks/useDialogOpenAfterRender";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import type { DatasetProfile } from "../domain/profile.model";
import { profileColor, profileIcon } from "../domain/profileIdentity";
import { profileApi } from "../infra/profile.api.repo";
import { DialogFooterBar } from "@/shared/components/DialogFooter";
import "@/shared/components/management-pages.css";
import ProfileIdentityPicker from "./ProfileIdentityPicker";

type Props = { profile: DatasetProfile | null; onClose: () => void; onSaved: (profile: DatasetProfile) => void };

export default function ProfileFormDialog({ profile, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const open = useDialogOpenAfterRender();
  const id = useId();
  const [form, setForm] = useState(() => ({ name: profile?.name ?? "", description: profile?.description ?? "",
    colorName: profileColor(profile?.colorName).name as string, iconName: profileIcon(profile?.iconName) as string }));
  const [baseline] = useState(() => JSON.stringify(form));
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [closePending, setClosePending] = useState(false);
  const dirty = JSON.stringify(form) !== baseline;
  const valid = Boolean(form.name.trim());
  const { blocker, runWithNavigationBypass } = useUnsavedChangesGuard(dirty || busy);

  function requestClose() {
    if (busy) return;
    if (dirty) setClosePending(true); else onClose();
  }

  async function save() {
    if (!valid || !dirty || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try {
      const saved = await profileApi.save(profile?.id ?? null, { ...form, description: form.description || null, version: profile?.version });
      runWithNavigationBypass(() => onSaved(saved));
    } catch (error) { setError(error instanceof Error ? error.message : t("profile.saveError")); }
    finally { saving.current = false; setBusy(false); }
  }

  return <>
    <Dialog open={open} data-ui5-compact-size="" className="managementDetailDialog" headerText={t(profile ? "profile.editTitle" : "profile.createTitle")}
      onBeforeClose={(event) => { event.preventDefault(); if (!saving.current) requestClose(); }}
      footer={<DialogFooterBar>
        <Button design="Emphasized" disabled={busy || !valid || !dirty} onClick={() => void save()}>{t("common.save")}</Button>
        <Button disabled={busy} onClick={requestClose}>{t("common.cancel")}</Button>
      </DialogFooterBar>}>
      <FlexBox direction="Column" className="profileManagementForm">
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        <Form accessibleMode="Edit" accessibleName={t(profile ? "profile.editTitle" : "profile.createTitle")} layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
          <FormItem labelContent={<Label for={`${id}-name`} required>{t("profile.name")}</Label>}>
            <Input id={`${id}-name`} value={form.name} maxlength={255} disabled={busy} onInput={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </FormItem>
          <FormItem labelContent={<Label for={`${id}-description`}>{t("profile.description")}</Label>}>
            <Input id={`${id}-description`} value={form.description} maxlength={2000} disabled={busy} onInput={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </FormItem>
          <ProfileIdentityPicker value={form} disabled={busy} onColor={(colorName) => setForm((current) => ({ ...current, colorName }))}
            onIcon={(iconName) => setForm((current) => ({ ...current, iconName }))} />
        </Form>
      </FlexBox>
    </Dialog>
    <DeleteConfirmDialog open={closePending || blocker.state === "blocked"} title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")} confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")} loading={busy}
      onClose={() => { setClosePending(false); if (blocker.state === "blocked") blocker.reset(); }}
      onConfirm={() => { if (busy) return; onClose(); if (blocker.state === "blocked") blocker.proceed(); }} />
  </>;
}
