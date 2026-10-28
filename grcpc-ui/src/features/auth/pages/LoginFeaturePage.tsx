import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, FlexBox, Form, FormItem, Icon, Input, Label, MessageStrip, Text, type InputDomRef } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth";
import { useInitialAppReady } from "@/shared/bootstrap/useInitialAppReady";
import { resolveLoginReturnUrl, type LoginRouterState } from "@/features/auth/utils/returnUrl";
import PublicAuthLayout from "@/shared/components/PublicAuthLayout";

const REMEMBERED_USERNAME_KEY = "grcpc.login.rememberedUsername";
function rememberedUsername() {
    try { return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? ""; }
    catch { return ""; }
}

export default function LoginFeaturePage() {
    useInitialAppReady();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const submitting = useAuthState((state) => state.submitting);
    const error = useAuthState((state) => state.error);
    const sessionExpired = useAuthState((state) => state.sessionExpired);
    const login = useAuthState((state) => state.login);
    const clearError = useAuthState((state) => state.clearError);
    const clearSessionExpired = useAuthState((state) => state.clearSessionExpired);
    const markSessionExpired = useAuthState((state) => state.markSessionExpired);
    const [username, setUsername] = useState(rememberedUsername);
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(() => rememberedUsername().length > 0);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordHelp, setShowPasswordHelp] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const submissionInProgress = useRef(false);
    const redirectTo = useMemo(() => resolveLoginReturnUrl(location.search, location.state as LoginRouterState | null), [location.search, location.state]);

    useEffect(() => {
        if ((location.state as LoginRouterState | null)?.sessionExpired) markSessionExpired();
    }, [location.state, markSessionExpired]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting || submissionInProgress.current || !username.trim() || !password) return;
        submissionInProgress.current = true;
        clearError();
        clearSessionExpired();
        try {
            await login({ username: username.trim(), password });
            try {
                if (remember) window.localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim());
                else window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
            } catch { /* Storage may be unavailable. */ }
            setPassword("");
            navigate(useAuthState.getState().me?.passwordChangeRequired ? "/change-password" : redirectTo, { replace: true });
        } catch { setPassword(""); }
        finally { submissionInProgress.current = false; }
    }

    function handleInputKeyDown(event: KeyboardEvent<InputDomRef>) {
        if (event.key !== "Enter" || event.nativeEvent.isComposing || event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!event.repeat) formRef.current?.requestSubmit();
    }

    return (
        <PublicAuthLayout panelLabel={t("auth.login.welcome")}>
            <Text>{t("auth.login.intro")}</Text>
            <form ref={formRef} onSubmit={(event) => void handleSubmit(event)}>
                <FlexBox direction="Column" gap="0.75rem">
                    {error && <MessageStrip design="Negative" onClose={clearError}>{error}</MessageStrip>}
                    {sessionExpired && <MessageStrip design="Critical" onClose={clearSessionExpired}>{t("auth.sessionExpired")}</MessageStrip>}
                    <Form accessibleMode="Edit" accessibleName={t("auth.login.welcome")} layout="S1 M1 L1 XL1" labelSpan="S12 M12 L12 XL12" itemSpacing="Normal">
                        <FormItem labelContent={<Label for="login-username" wrappingType="Normal">{t("auth.login.fields.username")}</Label>}>
                            <Input id="login-username" value={username} icon={<Icon name="employee" />} onInput={(event) => setUsername(event.target.value)} onKeyDown={handleInputKeyDown} />
                        </FormItem>
                        <FormItem labelContent={<Label for="login-password">{t("auth.login.fields.password")}</Label>}>
                            <Input
                                id="login-password"
                                type={showPassword ? "Text" : "Password"}
                                value={password}
                                onInput={(event) => setPassword(event.target.value)}
                                onKeyDown={handleInputKeyDown}
                                icon={<Button design="Transparent" icon={showPassword ? "hide" : "show"} accessibleName={t(showPassword ? "auth.login.hidePassword" : "auth.login.showPassword")} onClick={() => setShowPassword((value) => !value)} />}
                            />
                        </FormItem>
                    </Form>
                    <FlexBox alignItems="Center" justifyContent="SpaceBetween" wrap="Wrap">
                        <CheckBox text={t("auth.login.rememberMe")} checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                        <Button design="Transparent" onClick={() => setShowPasswordHelp((value) => !value)}>{t("auth.login.forgotPassword")}</Button>
                    </FlexBox>
                    {showPasswordHelp && <MessageStrip design="Information" onClose={() => setShowPasswordHelp(false)}>{t("auth.login.passwordHelp")}</MessageStrip>}
                    <Button type="Submit" design="Emphasized" disabled={submitting || !username.trim() || !password}>
                        {submitting ? t("auth.login.actions.submitting") : t("auth.login.actions.submit")}
                    </Button>
                </FlexBox>
            </form>
        </PublicAuthLayout>
    );
}
