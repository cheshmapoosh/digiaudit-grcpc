import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, CheckBox, Input, MessageStrip, Text, Title } from "@ui5/webcomponents-react";
import { useAuthState } from "@/features/auth";
import { useInitialAppReady } from "@/shared/bootstrap/useInitialAppReady";
import { resolveLoginReturnUrl, type LoginRouterState } from "@/features/auth/utils/returnUrl";
import DigiAuditBrand from "@/shared/components/DigiAuditBrand";
import { applySettings, loadSettings, saveSettings } from "@/ui/ui-settings";
import "./login.css";

const REMEMBERED_USERNAME_KEY = "grcpc.login.rememberedUsername";
function rememberedUsername() {
    try { return window.localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? ""; }
    catch { return ""; }
}

export default function LoginFeaturePage() {
    useInitialAppReady();
    const { t, i18n } = useTranslation();
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
    const redirectTo = useMemo(() => resolveLoginReturnUrl(location.search, location.state as LoginRouterState | null), [location.search, location.state]);

    useEffect(() => {
        if ((location.state as LoginRouterState | null)?.sessionExpired) markSessionExpired();
    }, [location.state, markSessionExpired]);

    function toggleLanguage() {
        const nextLang = i18n.language.startsWith("fa") ? "en" : "fa";
        const settings = { ...loadSettings(), lang: nextLang, dir: nextLang === "fa" ? "rtl" : "ltr" } as const;
        saveSettings(settings);
        applySettings(settings);
        void i18n.changeLanguage(nextLang);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting || !username.trim() || !password) return;
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
    }

    const isFa = i18n.language.startsWith("fa");
    return (
        <div className="loginPage" dir={isFa ? "rtl" : "ltr"}>
            <section className="loginHero" aria-label={t("auth.login.hero.ariaLabel")}>
                <div className="loginHeroCopy">
                    <DigiAuditBrand light />
                    <h1>{t("auth.login.hero.platform")}</h1>
                    <p className="loginHeroModules">{t("auth.login.hero.modules")}</p>
                    <p className="loginHeroTagline">{t("auth.login.hero.tagline")}</p>
                </div>
                <div className="loginHeroTraits">
                    <span>{t("auth.login.hero.secure")}</span><span>{t("auth.login.hero.scalable")}</span>
                    <span>{t("auth.login.hero.trusted")}</span><span>{t("auth.login.hero.efficient")}</span>
                </div>
            </section>
            <section className="loginPanel">
                <div className="loginLanguage"><Button design="Transparent" icon="world" onClick={toggleLanguage}>{isFa ? "فارسی" : "English"}</Button></div>
                <div className="loginPanelContent">
                    <DigiAuditBrand />
                    <Title level="H2" className="loginWelcome">{t("auth.login.welcome")}</Title>
                    <Text className="loginIntro">{t("auth.login.intro")}</Text>
                    <form className="loginForm" onSubmit={(event) => void handleSubmit(event)}>
                        {error && <MessageStrip design="Negative" onClose={clearError}>{error}</MessageStrip>}
                        {sessionExpired && <MessageStrip design="Critical" onClose={clearSessionExpired}>{t("auth.sessionExpired")}</MessageStrip>}
                        <div className="loginField">
                            <label htmlFor="login-username">{t("auth.login.fields.username")}</label>
                            <Input id="login-username" value={username} placeholder={t("auth.login.usernameOrEmail")} onInput={(event) => setUsername(event.target.value)} />
                        </div>
                        <div className="loginField">
                            <label htmlFor="login-password">{t("auth.login.fields.password")}</label>
                            <Input
                                id="login-password"
                                type={showPassword ? "Text" : "Password"}
                                value={password}
                                placeholder={t("auth.login.placeholders.password")}
                                onInput={(event) => setPassword(event.target.value)}
                                icon={<Button design="Transparent" icon={showPassword ? "hide" : "show"} accessibleName={t(showPassword ? "auth.login.hidePassword" : "auth.login.showPassword")} onClick={() => setShowPassword((value) => !value)} />}
                            />
                        </div>
                        <div className="loginOptions">
                            <CheckBox text={t("auth.login.rememberMe")} checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                            <Button design="Transparent" onClick={() => setShowPasswordHelp((value) => !value)}>{t("auth.login.forgotPassword")}</Button>
                        </div>
                        {showPasswordHelp && <MessageStrip design="Information" onClose={() => setShowPasswordHelp(false)}>{t("auth.login.passwordHelp")}</MessageStrip>}
                        <Button className="loginSubmit" type="Submit" design="Emphasized" disabled={submitting || !username.trim() || !password}>
                            {submitting ? t("auth.login.actions.submitting") : t("auth.login.actions.submit")}
                        </Button>
                    </form>
                    <div className="loginTrust"><span>{t("auth.login.or")}</span><p>♢ {t("auth.login.trust")}</p></div>
                </div>
                <div className="loginPowered"><img src="/images/digi-audit-mark.svg" alt="" /><span>{t("auth.login.poweredBy")} <strong>Digi Audit</strong><small>{t("auth.login.hero.platform")}</small></span></div>
            </section>
        </div>
    );
}
