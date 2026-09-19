import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Dialog, FlexBox, Input, Label, MessageStrip, Text } from "@ui5/webcomponents-react";
import type { UserDetail } from "../domain/usermanagement.model";
import { userManagementService } from "../service/usermanagement.service";
import { isValidPassword } from "@/features/auth/domain/passwordPolicy";
import "./user-management-forms.css";

export default function UserSecurityDialog({ user, mode, onClose, onSaved }: {
  user: UserDetail;
  mode: "password" | "status";
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const valid = mode === "status" || (isValidPassword(password) && confirmation === password);
  const title = t(mode === "password" ? "usermanagement.security.resetPassword"
    : user.enabled ? "usermanagement.security.disable" : "usermanagement.security.enable");

  async function save() {
    if (saving.current || !valid) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      if (mode === "password") await userManagementService.resetPassword(user.id, password);
      else await userManagementService.setEnabled(user.id, !user.enabled);
      setPassword("");
      setConfirmation("");
      onSaved();
    } catch {
      setError(t("usermanagement.demo.saveError"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <Dialog open headerText={title} onBeforeClose={(event) => { if (saving.current) event.preventDefault(); }} onClose={onClose}
    footer={<Bar endContent={<><Button design="Emphasized" disabled={busy || !valid} onClick={() => void save()}>{t("common.save")}</Button><Button disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></>} />}>
    <FlexBox direction="Column" className="userManagementForm">
      <Text>{`${user.firstName} ${user.lastName} (${user.username})`}</Text>
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
      <MessageStrip design="Information" hideCloseButton>{t(mode === "password" ? "usermanagement.security.temporaryPasswordHint"
        : user.enabled ? "usermanagement.security.disableHint" : "usermanagement.security.enableHint")}</MessageStrip>
      {mode === "password" ? <>
        <Label for="reset-user-password" required>{t("usermanagement.demo.password")}</Label>
        <Input id="reset-user-password" type="Password" value={password} maxlength={72} disabled={busy} onInput={(event) => setPassword(event.target.value)} />
        <Label for="reset-user-password-confirm" required>{t("auth.password.confirm")}</Label>
        <Input id="reset-user-password-confirm" type="Password" value={confirmation} maxlength={72} disabled={busy} onInput={(event) => setConfirmation(event.target.value)} />
        <Text>{t("usermanagement.demo.passwordHint")}</Text>
        {confirmation && confirmation !== password ? <MessageStrip design="Negative" hideCloseButton>{t("auth.password.mismatch")}</MessageStrip> : null}
      </> : null}
    </FlexBox>
  </Dialog>;
}
