import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Dialog, FlexBox, Form, FormGroup, FormItem, Input, Label, MessageStrip, MultiComboBox, MultiComboBoxItem, Option, Select, Text } from "@ui5/webcomponents-react";
import { userManagementService } from "../service/usermanagement.service";
import type { UserDetail } from "../domain/usermanagement.model";
import { useAuthState } from "@/features/auth";
import { useProfileState } from "@/features/dataset-profile/state/profile.state";
import { selectedProfileId } from "@/shared/infra/profileSelection";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { DeleteConfirmDialog } from "@/shared/components/DeleteConfirmDialog";
import "./user-management-forms.css";
import "@/shared/components/management-pages.css";
import { DialogFooterBar } from "@/shared/components/DialogFooter";
import { isValidUsername } from "@/features/auth/domain/usernamePolicy";
import { isValidPassword } from "@/features/auth/domain/passwordPolicy";
import { PersianDatePicker, type PersianDateDraftState } from "@/shared/components/PersianDatePicker";

export default function UserFormDialog({ user, onClose, onCreated }: { user?: UserDetail; onClose: () => void; onCreated: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const root = useAuthState((state) => Boolean(state.me?.rootUser));
  const profiles = useProfileState((state) => state.profiles);
  const [form, setForm] = useState(() => ({
    username: user?.username ?? "", firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", password: "", confirmPassword: "",
    email: user?.email ?? "", mobile: user?.mobile ?? "",
    profileId: user?.profileId ?? (user?.profileAdmin || user?.rootUser ? "" : selectedProfileId() ?? ""),
    profileAdmin: user?.profileAdmin ?? false, profileAccessIds: user?.profileAccessIds ?? [],
    roleIds: [...new Set(user?.assignments.filter((a) => a.active && a.scopeType === "GLOBAL" && !a.scopeOrgUnitId).map((a) => a.roleId) ?? [])],
    rolePeriods: Object.fromEntries((user?.assignments ?? []).filter((a) => a.active && a.scopeType === "GLOBAL" && !a.scopeOrgUnitId)
      .reverse().map((a) => [a.roleId, { validFrom: a.validFrom, validTo: a.validTo }])) as Record<string, { validFrom: string | null; validTo: string | null }>,
  }));
  const [baseline] = useState(() => JSON.stringify(form));
  const [choices, setChoices] = useState<{ id: string; code: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [closePending, setClosePending] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<Record<string, PersianDateDraftState>>({});
  const selectedDateDrafts = Object.entries(dateDrafts).filter(([key]) => form.roleIds.includes(key.split(":")[0])).map(([, draft]) => draft);
  const datesInvalid = selectedDateDrafts.some((draft) => !draft.valid);
  const dirty = JSON.stringify(form) !== baseline || selectedDateDrafts.some((draft) => draft.dirty || !draft.valid);
  const { blocker, runWithNavigationBypass } = useUnsavedChangesGuard(dirty);
  const validUsername = isValidUsername(form.username);
  const datesOrdered = form.roleIds.every((id) => {
    const period = form.rolePeriods[id];
    return !period?.validFrom || !period.validTo || period.validFrom <= period.validTo;
  });
  const valid = (user || validUsername) && form.firstName.trim() && form.lastName.trim()
    && (user || (isValidPassword(form.password) && form.password === form.confirmPassword)) && (user?.rootUser || form.profileAdmin || form.profileId)
    && (form.profileAdmin || (!datesInvalid && datesOrdered));
  const roleChoices = [...choices, ...(user?.assignments ?? []).filter((a) => a.active && a.scopeType === "GLOBAL"
    && !a.scopeOrgUnitId && !choices.some((r) => r.id === a.roleId)).map((a) => ({ id: a.roleId, title: a.roleTitle, code: a.roleCode }))]
    .filter((r, index, rows) => rows.findIndex((item) => item.id === r.id) === index);
  useEffect(() => {
    let alive = true;
    void userManagementService.roleChoices(i18n.language).then((rows) => { if (alive) setChoices(rows); })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : t("profile.loadError")); });
    return () => { alive = false; };
  }, [i18n.language, t]);

  async function save() {
    if (!valid || saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    const membership = {
      profileId: form.profileAdmin || user?.rootUser ? null : form.profileId,
      profileAdmin: form.profileAdmin,
      profileAccessIds: form.profileAdmin ? form.profileAccessIds : [],
      roleIds: form.profileAdmin ? undefined : user?.rootUser ? [] : form.roleIds,
      roleGrants: form.profileAdmin ? undefined : user?.rootUser ? [] : form.roleIds.map((roleId) => ({ roleId,
        validFrom: form.rolePeriods[roleId]?.validFrom ?? null, validTo: form.rolePeriods[roleId]?.validTo ?? null })),
    };
    try {
      let id = user?.id;
      if (user) await userManagementService.updateUser(user.id, {
        firstName: form.firstName, lastName: form.lastName, mobile: form.mobile || null, email: form.email || null,
        enabled: user.enabled, locked: user.locked,
        defaultOrgUnitId: membership.profileId !== user.profileId || membership.profileAdmin !== user.profileAdmin ? null : user.defaultOrgUnitId, ...membership,
      });
      else id = await userManagementService.createUser({ username: form.username, password: form.password,
        firstName: form.firstName, lastName: form.lastName, email: form.email || null, mobile: form.mobile || null,
        ...membership, enabled: true, defaultOrgUnitId: null });
      runWithNavigationBypass(() => onCreated(id!));
    } catch (e) { setError(e instanceof Error ? e.message : t("usermanagement.demo.saveError")); }
    finally { saving.current = false; setBusy(false); }
  }
  function requestClose() { if (dirty) setClosePending(true); else onClose(); }
  function toggleRole(id: string, checked: boolean) {
    setForm((current) => ({ ...current, roleIds: checked ? [...new Set([...current.roleIds, id])] : current.roleIds.filter((value) => value !== id) }));
  }
  return <>
    <Dialog open data-ui5-compact-size="" className="managementDetailDialog" headerText={t(user ? "profile.editUser" : "usermanagement.demo.createUser")} onBeforeClose={(event) => { event.preventDefault(); if (!saving.current) requestClose(); }}
      footer={<DialogFooterBar><Button design="Emphasized" disabled={busy || !valid} onClick={() => void save()}>{t("common.save")}</Button><Button disabled={busy} onClick={requestClose}>{t("common.cancel")}</Button></DialogFooterBar>}>
      <FlexBox direction="Column" className="userManagementForm userManagementWideForm">
        {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
        <Form accessibleMode="Edit" accessibleName={t(user ? "profile.editUser" : "usermanagement.demo.createUser")} layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
          <FormGroup columnSpan={2} accessibleName={t("usermanagement.demo.username")}>
            <FormItem labelContent={<Label for="user-form-username" required>{t("usermanagement.demo.username")}</Label>}>
              <Input id="user-form-username" value={form.username} maxlength={100} readonly={Boolean(user)} disabled={busy}
                onInput={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
            </FormItem>
          </FormGroup>
          <FormGroup columnSpan={2} accessibleName={`${t("usermanagement.demo.firstName")} / ${t("usermanagement.demo.lastName")}`}>
            {(["firstName", "lastName"] as const).map((field) => <FormItem key={field} labelContent={<Label for={`user-form-${field}`} required>{t(`usermanagement.demo.${field}`)}</Label>}>
              <Input id={`user-form-${field}`} value={form[field]} maxlength={100} disabled={busy}
                onInput={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />
            </FormItem>)}
          </FormGroup>
          {!user ? <FormGroup columnSpan={2} accessibleName={t("usermanagement.demo.password")}>
            {(["password", "confirmPassword"] as const).map((field) => <FormItem key={field} labelContent={<Label for={`user-form-${field}`} required>{t(`usermanagement.demo.${field}`)}</Label>}>
              <Input id={`user-form-${field}`} value={form[field]} type="Password" maxlength={72} disabled={busy}
                valueState={field === "confirmPassword" && form.confirmPassword && form.confirmPassword !== form.password ? "Negative" : "None"}
                valueStateMessage={<Text>{t("usermanagement.demo.passwordConfirmationMismatch")}</Text>}
                onInput={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />
            </FormItem>)}
          </FormGroup> : null}
          {user ? <FormGroup columnSpan={2} accessibleName={`${t("usermanagement.demo.email")} / ${t("usermanagement.demo.mobile")}`}>
            {(["email", "mobile"] as const).map((field) => <FormItem key={field} labelContent={<Label for={`user-form-${field}`}>{t(`usermanagement.demo.${field}`)}</Label>}>
              <Input id={`user-form-${field}`} value={form[field]} maxlength={field === "email" ? 200 : 20} disabled={busy}
                onInput={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />
            </FormItem>)}
          </FormGroup> : null}
        </Form>
        {root && !user?.rootUser ? <CheckBox text={t("profile.adminRole")} checked={form.profileAdmin} disabled={busy} onChange={(event) => setForm({ ...form, profileAdmin: event.target.checked, profileId: "" })} /> : null}
        {!user?.rootUser && !form.profileAdmin ? <>
          <Label for="user-form-profile" required>{t("profile.userProfile")}</Label>
          <Select id="user-form-profile" value={form.profileId} disabled={busy || !root} onChange={(event) => {
            const id = event.detail.selectedOption?.value ?? "";
            if (id !== form.profileId) setForm({ ...form, profileId: id, roleIds: [], rolePeriods: {} });
          }}>
            <Option value="" selected={!form.profileId}>{t("profile.select")}</Option>
            {profiles.map((p) => <Option key={p.id} value={p.id} selected={form.profileId === p.id}>{p.name}</Option>)}
          </Select>
          <Label>{t("profile.userRoles")}</Label>
          <Text>{t("profile.rolesHint")}</Text>
          {roleChoices.map((role) => <div className="modalTwoColumnGrid" key={role.id}>
            <CheckBox text={role.title} checked={form.roleIds.includes(role.id)} disabled={busy || (!form.roleIds.includes(role.id) && !choices.some((r) => r.id === role.id))} onChange={(event) => toggleRole(role.id, event.target.checked)} />
            {form.roleIds.includes(role.id) ? <div className="modalDateRange"> {(["validFrom", "validTo"] as const).map((field) => <FlexBox direction="Column" key={field}>
              <Label>{t(`usermanagement.demo.${field}`)}</Label>
              <PersianDatePicker value={form.rolePeriods[role.id]?.[field]?.slice(0, 10) ?? ""} disabled={busy || !choices.some((r) => r.id === role.id)} accessibleName={`${role.title} — ${t(`usermanagement.demo.${field}`)}`} invalidValueMessage={t("common.invalidPersianDate")}
                onChange={(value) => setForm((current) => ({ ...current, rolePeriods: { ...current.rolePeriods,
                  [role.id]: { validFrom: current.rolePeriods[role.id]?.validFrom ?? null, validTo: current.rolePeriods[role.id]?.validTo ?? null,
                    [field]: value ? `${value}${field === "validFrom" ? "T00:00:00" : "T23:59:59.999999"}` : null } } }))}
                onDraftStateChange={(draft) => setDateDrafts((current) => {
                  const key = `${role.id}:${field}`; const previous = current[key];
                  return previous?.valid === draft.valid && previous.dirty === draft.dirty && previous.draftValue === draft.draftValue ? current : { ...current, [key]: draft };
                })} />
            </FlexBox>)} </div> : null}
          </div>)}
          {!datesOrdered ? <MessageStrip design="Negative" hideCloseButton>{t("usermanagement.demo.invalidDates")}</MessageStrip> : null}
          {user && form.profileId === user.profileId && user.assignments.some((a) => a.active && a.scopeType !== "GLOBAL") ? <>
            <Label>{t("profile.retainedScopedRoles")}</Label>
            {user.assignments.filter((a) => a.active && a.scopeType !== "GLOBAL").map((a) => <Text key={a.id}>{a.roleTitle}</Text>)}
          </> : null}
        </> : null}
        {root && form.profileAdmin ? <Form accessibleMode="Edit" accessibleName={t("profile.adminAccess")} layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
          <FormItem labelContent={<Label for="user-form-profile-access">{t("profile.adminAccess")}</Label>}>
            <MultiComboBox id="user-form-profile-access" disabled={busy} showSelectAll onSelectionChange={(event) => {
              const ids = event.detail.items.map((item) => item.getAttribute("data-profile-id")).filter((id): id is string => Boolean(id));
              setForm((current) => ({ ...current, profileAccessIds: ids }));
            }}>
              {profiles.map((profile) => <MultiComboBoxItem key={profile.id} data-profile-id={profile.id} text={profile.name} selected={form.profileAccessIds.includes(profile.id)} />)}
            </MultiComboBox>
          </FormItem>
        </Form> : null}
        {!user ? <><Text>{t("usermanagement.security.usernameHint")}</Text><Text>{t("usermanagement.demo.passwordHint")}</Text><Text>{t("usermanagement.security.temporaryPasswordHint")}</Text></> : null}
      </FlexBox>
    </Dialog>
    <DeleteConfirmDialog open={closePending || blocker.state === "blocked"} title={t("common.unsavedChanges.title")} message={t("common.unsavedChanges.message")} confirmText={t("common.unsavedChanges.leave")} cancelText={t("common.unsavedChanges.stay")} loading={busy}
      onClose={() => { setClosePending(false); if (blocker.state === "blocked") blocker.reset(); }}
      onConfirm={() => { setClosePending(false); if (blocker.state === "blocked") blocker.proceed(); else onClose(); }} />
  </>;
}
