import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, FlexBox, Input, Label, MessageStrip, Text, Title } from "@ui5/webcomponents-react";
import { authService } from "../service/auth.service";
import { useAuthState } from "../state/auth.state";
import { isValidUsername } from "../domain/usernamePolicy";
import { HttpError } from "@/shared/infra/http.client";
import { useInitialAppReady } from "@/shared/bootstrap/useInitialAppReady";
import "./change-password.css";

export default function ChangeUsernamePage() {
  useInitialAppReady();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const username = useAuthState((state) => state.me?.username ?? "");
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const valid = isValidUsername(newUsername) && newUsername.toLowerCase() !== username.toLowerCase()
    && currentPassword.length > 0;

  async function save() {
    if (!valid || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await authService.changeUsername({ currentPassword, newUsername });
      setCurrentPassword("");
      setSaved(true);
    } catch (cause) {
      const key = cause instanceof HttpError && cause.code === "CURRENT_PASSWORD_INVALID"
        ? "auth.password.currentInvalid"
        : cause instanceof HttpError && cause.code === "USERNAME_UNAVAILABLE"
          ? "auth.username.unavailable" : "auth.username.saveError";
      setError(t(key));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function leave() {
    if (saving.current) return;
    if (saved) useAuthState.getState().reset();
    navigate(saved ? "/login" : "/dashboard", { replace: true });
  }

  return <FlexBox direction="Column" className="changePasswordPage">
    <Title level="H2">{t("auth.username.title")}</Title>
    <MessageStrip design={saved ? "Positive" : "Information"} hideCloseButton>
      {t(saved ? "auth.username.saved" : "auth.username.hint", { username: newUsername.toLowerCase() })}
    </MessageStrip>
    {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
    {!saved ? <>
      <Label>{t("auth.username.current")}</Label>
      <Text>{username}</Text>
      <Label for="new-username" required>{t("auth.username.new")}</Label>
      <Input id="new-username" value={newUsername} maxlength={100} disabled={busy} onInput={(event) => setNewUsername(event.target.value)} />
      {newUsername && !isValidUsername(newUsername) ? <MessageStrip design="Negative" hideCloseButton>{t("usermanagement.security.invalidUsername")}</MessageStrip> : null}
      <Label for="username-current-password" required>{t("auth.password.current")}</Label>
      <Input id="username-current-password" type="Password" value={currentPassword} maxlength={200} disabled={busy} onInput={(event) => setCurrentPassword(event.target.value)} />
      <Button design="Emphasized" disabled={busy || !valid} onClick={() => void save()}>{t("common.save")}</Button>
    </> : null}
    <Button disabled={busy} onClick={leave}>{t(saved ? "auth.username.login" : "auth.credentials.back")}</Button>
  </FlexBox>;
}
