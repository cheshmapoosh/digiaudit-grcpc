import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Dialog, FlexBox, Label, MessageStrip, Option, Select, Text } from "@ui5/webcomponents-react";
import { PersianDatePicker } from "@/shared/components/PersianDatePicker";
import { userManagementService } from "../service/usermanagement.service";
import type { RoleSummary } from "../domain/usermanagement.model";
import "./user-management-forms.css";

export default function AssignGlobalRoleDialog({ userId, onClose, onAssigned }: { userId: string; onClose: () => void; onAssigned: () => void }) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [roleId, setRoleId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [datesValid, setDatesValid] = useState({ from: true, to: true });
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const ordered = !validFrom || !validTo || validTo >= validFrom;

  useEffect(() => {
    let active = true;
    void userManagementService.listRoles().then((items) => {
      if (active) setRoles(items);
    }).catch(() => { if (active) setError(t("usermanagement.demo.loadRolesError")); });
    return () => { active = false; };
  }, [t]);

  async function save() {
    if (!roles.some((role) => role.id === roleId && role.enabled) || !ordered || !datesValid.from || !datesValid.to || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await userManagementService.assignRole(userId, {
        roleId, scopeType: "GLOBAL", scopeOrgUnitId: null,
        validFrom: validFrom ? `${validFrom}T00:00:00` : null,
        validTo: validTo ? `${validTo}T23:59:59.999999` : null,
      });
      onAssigned();
    } catch {
      setError(t("usermanagement.demo.saveError"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <Dialog open headerText={t("usermanagement.demo.assignRole")} onBeforeClose={(event) => { if (saving.current) event.preventDefault(); }} onClose={onClose}
    footer={<Bar endContent={<><Button design="Emphasized" disabled={busy || !roles.some((role) => role.id === roleId && role.enabled) || !ordered || !datesValid.from || !datesValid.to} onClick={() => void save()}>{t("common.save")}</Button><Button disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></>} />}>
    <FlexBox direction="Column" className="userManagementForm">
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
      <Label for="assign-global-role" required>{t("usermanagement.demo.role")}</Label>
      <Select id="assign-global-role" disabled={busy} onChange={(event) => setRoleId(event.detail.selectedOption.dataset.id ?? "")}>
        <Option selected={!roleId} data-id="">{t("usermanagement.demo.selectRole")}</Option>
        {roles.map((role) => <Option key={role.id} data-id={role.id} selected={roleId === role.id}>{role.title && role.title !== role.code ? role.title : t("usermanagement.roles.untitled")}{!role.enabled ? ` (${t("usermanagement.roles.status.disabled")})` : ""}</Option>)}
      </Select>
      {roleId && !roles.some((role) => role.id === roleId && role.enabled) ? <MessageStrip design="Negative" hideCloseButton>{t("usermanagement.security.disabledRole")}</MessageStrip> : null}
      <Text>{t("usermanagement.demo.globalScope")}</Text>
      <Text>{t("usermanagement.demo.globalHint")}</Text>
      <Label>{t("usermanagement.demo.validFrom")}</Label>
      <PersianDatePicker invalidValueMessage={t("common.invalidPersianDate")} value={validFrom} onChange={setValidFrom} disabled={busy} accessibleName={t("usermanagement.demo.validFrom")} onDraftStateChange={(draft) => setDatesValid((value) => value.from === draft.valid ? value : { ...value, from: draft.valid })} />
      <Label>{t("usermanagement.demo.validTo")}</Label>
      <PersianDatePicker invalidValueMessage={t("common.invalidPersianDate")} value={validTo} onChange={setValidTo} disabled={busy} accessibleName={t("usermanagement.demo.validTo")} onDraftStateChange={(draft) => setDatesValid((value) => value.to === draft.valid ? value : { ...value, to: draft.valid })} />
      {!ordered ? <MessageStrip design="Negative" hideCloseButton>{t("usermanagement.demo.invalidDates")}</MessageStrip> : null}
    </FlexBox>
  </Dialog>;
}
