import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, FlexBox, Input, Label, MessageStrip, Title } from "@ui5/webcomponents-react";
import { authService } from "../service/auth.service";
import { useAuthState } from "../state/auth.state";
import { isValidPassword } from "../domain/passwordPolicy";
import { HttpError } from "@/shared/infra/http.client";
import { useInitialAppReady } from "@/shared/bootstrap/useInitialAppReady";
import "./change-password.css";

export default function ChangePasswordPage() {
  useInitialAppReady();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const valid = currentPassword.length > 0 && isValidPassword(newPassword)
    && newPassword !== currentPassword && confirmation === newPassword;

  async function save() {
    if (!valid || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      // The server invalidates every old session; require login with the chosen password.
      setSaved(true);
    } catch (cause) {
      const key = cause instanceof HttpError && cause.code === "CURRENT_PASSWORD_INVALID"
        ? "auth.password.currentInvalid" : "auth.password.saveError";
      setError(t(key));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function exit() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      if (!saved) await useAuthState.getState().logout();
      useAuthState.getState().reset();
      navigate("/login", { replace: true });
    } catch {
      setError(t("auth.password.saveError"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <FlexBox direction="Column" className="changePasswordPage">
    <Title level="H2">{t("auth.password.title")}</Title>
    <MessageStrip design={saved ? "Positive" : "Information"} hideCloseButton>{t(saved ? "auth.password.saved" : "auth.password.required")}</MessageStrip>
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    {!saved ? <>
      <Label for="current-password" required>{t("auth.password.current")}</Label>
      <Input id="current-password" type="Password" value={currentPassword} disabled={busy} maxlength={200} onInput={(event) => setCurrentPassword(event.target.value)} />
      <Label for="new-password" required>{t("auth.password.new")}</Label>
      <Input id="new-password" type="Password" value={newPassword} disabled={busy} maxlength={72} onInput={(event) => setNewPassword(event.target.value)} />
      <Label for="confirm-password" required>{t("auth.password.confirm")}</Label>
      <Input id="confirm-password" type="Password" value={confirmation} disabled={busy} maxlength={72} onInput={(event) => setConfirmation(event.target.value)} />
      <MessageStrip design="Information" hideCloseButton>{t("auth.password.rules")}</MessageStrip>
      {confirmation && confirmation !== newPassword ? <MessageStrip design="Negative" hideCloseButton>{t("auth.password.mismatch")}</MessageStrip> : null}
      <Button design="Emphasized" disabled={busy || !valid} onClick={() => void save()}>{t("common.save")}</Button>
    </> : null}
    <Button disabled={busy} onClick={() => void exit()}>{t(saved ? "auth.password.login" : "auth.password.logout")}</Button>
  </FlexBox>;
}
