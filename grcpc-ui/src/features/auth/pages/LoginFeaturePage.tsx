import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Button,
    Card,
    CardHeader,
    Input,
    Label,
    MessageStrip,
    Text,
    Title,
} from "@ui5/webcomponents-react";

import { useAuthState } from "@/features/auth";

type RouterState = {
    from?: {
        pathname?: string;
        search?: string;
        hash?: string;
    };
};

export default function LoginFeaturePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const submitting = useAuthState((state) => state.submitting);
    const error = useAuthState((state) => state.error);
    const login = useAuthState((state) => state.login);
    const clearError = useAuthState((state) => state.clearError);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const redirectTo = useMemo(() => {
        const routerState = location.state as RouterState | null;
        const pathname = routerState?.from?.pathname;
        const search = routerState?.from?.search ?? "";
        const hash = routerState?.from?.hash ?? "";

        if (!pathname || pathname === "/" || pathname === "/login") {
            return "/dashboard";
        }

        return `${pathname}${search}${hash}`;
    }, [location.state]);

    async function handleSubmit() {
        clearError();

        try {
            await login({
                username: username.trim(),
                password,
            });

            navigate(redirectTo, { replace: true });
        } catch {
            // خطا در store مدیریت می‌شود
        }
    }

    const isSubmitDisabled = submitting || username.trim().length === 0 || password.length === 0;

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: "2rem",
                background: `
                    radial-gradient(circle at top right, rgba(10, 132, 255, 0.12), transparent 28%),
                    radial-gradient(circle at bottom left, rgba(0, 153, 102, 0.10), transparent 24%),
                    linear-gradient(135deg, var(--sapBackgroundColor), var(--sapGroup_ContentBackground))
                `,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "1180px",
                    display: "grid",
                    gridTemplateColumns: "minmax(320px, 1.1fr) minmax(360px, 460px)",
                    gap: "1.5rem",
                    alignItems: "stretch",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "1.25rem",
                        minHeight: "620px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "2rem",
                        color: "var(--sapTextColor)",
                        background: `
                            linear-gradient(160deg, rgba(8, 57, 90, 0.92), rgba(7, 105, 81, 0.85)),
                            url("/images/grc-login-hero.jpg") center/cover no-repeat
                        `,
                        boxShadow: "0 1.5rem 3rem rgba(0, 0, 0, 0.16)",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.00) 35%, rgba(0,0,0,0.16))",
                            pointerEvents: "none",
                        }}
                    />

                    <div style={{ position: "relative", zIndex: 1, display: "grid", gap: "1rem" }}>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: ".5rem",
                                padding: ".45rem .85rem",
                                borderRadius: "999px",
                                width: "fit-content",
                                background: "rgba(255,255,255,0.12)",
                                border: "1px solid rgba(255,255,255,0.16)",
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            <span
                                style={{
                                    width: ".6rem",
                                    height: ".6rem",
                                    borderRadius: "50%",
                                    background: "#79f2c0",
                                    display: "inline-block",
                                }}
                            />
                            <Text style={{ color: "white" }}>
                                {t("auth.login.hero.badge", {
                                    defaultValue: "ورود امن و کنترل‌شده",
                                })}
                            </Text>
                        </div>

                        <div style={{ display: "grid", gap: ".75rem", maxWidth: "640px" }}>
                            <Title
                                level="H1"
                                style={{
                                    color: "white",
                                    margin: 0,
                                    lineHeight: 1.2,
                                }}
                            >
                                {t("auth.login.hero.title", {
                                    defaultValue: "سامانه حاکمیت، ریسک و کنترل",
                                })}
                            </Title>

                            <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: "1rem", lineHeight: 1.8 }}>
                                {t("auth.login.hero.description", {
                                    defaultValue:
                                        "ورود به محیط یکپارچه GRC برای مدیریت فرآیندها، ساختار سازمانی، قوانین و کنترل دسترسی‌ها.",
                                })}
                            </Text>
                        </div>
                    </div>

                    <div
                        style={{
                            position: "relative",
                            zIndex: 1,
                            display: "grid",
                            gap: "1rem",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        }}
                    >
                        <div
                            style={{
                                padding: "1rem",
                                borderRadius: "1rem",
                                background: "rgba(255,255,255,0.10)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            <Title level="H5" style={{ color: "white", margin: 0 }}>
                                {t("auth.login.hero.cards.governance.title", {
                                    defaultValue: "حاکمیت",
                                })}
                            </Title>
                            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                                {t("auth.login.hero.cards.governance.description", {
                                    defaultValue: "مدیریت ساختار و نقش‌ها با شفافیت و قابلیت ممیزی.",
                                })}
                            </Text>
                        </div>

                        <div
                            style={{
                                padding: "1rem",
                                borderRadius: "1rem",
                                background: "rgba(255,255,255,0.10)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            <Title level="H5" style={{ color: "white", margin: 0 }}>
                                {t("auth.login.hero.cards.risk.title", {
                                    defaultValue: "ریسک",
                                })}
                            </Title>
                            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                                {t("auth.login.hero.cards.risk.description", {
                                    defaultValue: "پایش دسترسی و کنترل ورود برای کاهش ریسک عملیاتی.",
                                })}
                            </Text>
                        </div>

                        <div
                            style={{
                                padding: "1rem",
                                borderRadius: "1rem",
                                background: "rgba(255,255,255,0.10)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(6px)",
                            }}
                        >
                            <Title level="H5" style={{ color: "white", margin: 0 }}>
                                {t("auth.login.hero.cards.control.title", {
                                    defaultValue: "کنترل",
                                })}
                            </Title>
                            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                                {t("auth.login.hero.cards.control.description", {
                                    defaultValue: "احراز هویت، ثبت وقایع و رهگیری کامل عملیات مدیریتی.",
                                })}
                            </Text>
                        </div>
                    </div>
                </div>

                <Card
                    style={{
                        width: "100%",
                        borderRadius: "1.25rem",
                        alignSelf: "center",
                        boxShadow: "0 1rem 2.5rem rgba(0, 0, 0, 0.10)",
                    }}
                    header={
                        <CardHeader
                            titleText={t("auth.login.pageTitle", {
                                defaultValue: "ورود به سامانه",
                            })}
                            subtitleText={t("auth.login.pageSubtitle", {
                                defaultValue: "احراز هویت کاربران GRC",
                            })}
                        />
                    }
                >
                    <div
                        style={{
                            padding: "1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem",
                        }}
                    >
                        <div style={{ display: "grid", gap: ".5rem" }}>
                            <Title level="H4">
                                {t("auth.login.title", {
                                    defaultValue: "ورود کاربر",
                                })}
                            </Title>
                            <Text>
                                {t("auth.login.description", {
                                    defaultValue: "برای ادامه، نام کاربری و رمز عبور خود را وارد کنید.",
                                })}
                            </Text>
                        </div>

                        {error ? (
                            <MessageStrip design="Negative" hideCloseButton>
                                {error}
                            </MessageStrip>
                        ) : null}

                        <div style={{ display: "grid", gap: ".5rem" }}>
                            <Label for="login-username">
                                {t("auth.login.fields.username", {
                                    defaultValue: "نام کاربری",
                                })}
                            </Label>
                            <Input
                                id="login-username"
                                value={username}
                                placeholder={t("auth.login.placeholders.username", {
                                    defaultValue: "نام کاربری را وارد کنید",
                                })}
                                onInput={(event) => setUsername(event.target.value)}
                            />
                        </div>

                        <div style={{ display: "grid", gap: ".5rem" }}>
                            <Label for="login-password">
                                {t("auth.login.fields.password", {
                                    defaultValue: "رمز عبور",
                                })}
                            </Label>
                            <Input
                                id="login-password"
                                type="Password"
                                value={password}
                                placeholder={t("auth.login.placeholders.password", {
                                    defaultValue: "رمز عبور را وارد کنید",
                                })}
                                onInput={(event) => setPassword(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        void handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: ".25rem",
                            }}
                        >
                            <Text style={{ color: "var(--sapContent_LabelColor)" }}>
                                {t("auth.login.helpText", {
                                    defaultValue: "برای ورود، از حساب کاربری تخصیص‌یافته استفاده کنید.",
                                })}
                            </Text>
                        </div>

                        <div style={{ display: "flex", gap: ".75rem", marginTop: ".5rem" }}>
                            <Button
                                design="Emphasized"
                                disabled={isSubmitDisabled}
                                onClick={() => void handleSubmit()}
                            >
                                {submitting
                                    ? t("auth.login.actions.submitting", {
                                        defaultValue: "در حال ورود...",
                                    })
                                    : t("auth.login.actions.submit", {
                                        defaultValue: "ورود",
                                    })}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}