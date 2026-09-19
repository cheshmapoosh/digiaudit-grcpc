import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, Button, Dialog, FlexBox, Input, Label, MessageStrip, Text } from "@ui5/webcomponents-react";
import { userManagementService } from "../service/usermanagement.service";
import "./user-management-forms.css";
import { isValidPassword } from "@/features/auth/domain/passwordPolicy";

export default function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: "", firstName: "", lastName: "", password: "" });
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const validUsername = /^[A-Za-z0-9]{1,100}$/.test(form.username);
  const valid = validUsername && form.firstName.trim() && form.lastName.trim() && isValidPassword(form.password);

  async function save() {
    if (!valid || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const id = await userManagementService.createUser({ ...form, enabled: true, defaultOrgUnitId: null });
      setForm({ username: "", firstName: "", lastName: "", password: "" });
      onCreated(id);
    } catch {
      setError(t("usermanagement.demo.saveError"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <Dialog open headerText={t("usermanagement.demo.createUser")} onBeforeClose={(event) => { if (saving.current) event.preventDefault(); }} onClose={onClose}
    footer={<Bar endContent={<><Button design="Emphasized" disabled={busy || !valid} onClick={() => void save()}>{t("common.save")}</Button><Button disabled={busy} onClick={onClose}>{t("common.cancel")}</Button></>} />}>
    <FlexBox direction="Column" className="userManagementForm">
      {error ? <MessageStrip design="Negative" hideCloseButton>{error}</MessageStrip> : null}
      {(["username", "firstName", "lastName", "password"] as const).map((field) => <FlexBox direction="Column" key={field}>
        <Label for={`create-user-${field}`} required>{t(`usermanagement.demo.${field}`)}</Label>
        <Input id={`create-user-${field}`} value={form[field]} type={field === "password" ? "Password" : "Text"} maxlength={field === "password" ? 72 : 100} disabled={busy}
          onInput={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />
      </FlexBox>)}
      <Text>{t("usermanagement.security.usernameHint")}</Text>
      {form.username && !validUsername ? <MessageStrip design="Negative" hideCloseButton>{t("usermanagement.security.invalidUsername")}</MessageStrip> : null}
      <Text>{t("usermanagement.demo.passwordHint")}</Text>
      <Text>{t("usermanagement.security.temporaryPasswordHint")}</Text>
    </FlexBox>
  </Dialog>;
}
