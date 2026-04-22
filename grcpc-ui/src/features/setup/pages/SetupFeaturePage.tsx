import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    BusyIndicator,
    Card,
    CardHeader,
    Input,
    Label,
    MessageStrip,
    Text,
    Title,
} from "@ui5/webcomponents-react";

import { useSetupState } from "@/features/setup";

interface SetupFormState {
    username: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
}

const INITIAL_FORM: SetupFormState = {
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
};

function extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "object" && error !== null) {
        const apiError = error as Partial<{ message: string; details: string[] }>;

        if (Array.isArray(apiError.details) && apiError.details.length > 0) {
            return apiError.details.join(" | ");
        }

        if (typeof apiError.message === "string" && apiError.message.trim()) {
            switch (apiError.message) {
                case "System is already initialized":
                    return fallback;
                case "Username already exists":
                    return "این نام کاربری قبلا ثبت شده است";
                case "ROOT_ADMIN role seed was not found":
                    return "نقش پایه ROOT_ADMIN در سیستم یافت نشد";
                default:
                    return apiError.message;
            }
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

export default function SetupFeaturePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const status = useSetupState((state) => state.status);
    const loading = useSetupState((state) => state.loading);
    const submitting = useSetupState((state) => state.submitting);
    const loadStatus = useSetupState((state) => state.loadStatus);
    const initialize = useSetupState((state) => state.initialize);
    const error = useSetupState((state) => state.error);
    const clearError = useSetupState((state) => state.clearError);

    const [form, setForm] = useState<SetupFormState>(INITIAL_FORM);
    const [pageError, setPageError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        void loadStatus().catch((loadError: unknown) => {
            setPageError(
                extractErrorMessage(
                    loadError,
                    t("setup.errors.loadStatus", {
                        defaultValue: "خطا در دریافت وضعیت راه‌اندازی",
                    }),
                ),
            );
        });
    }, [loadStatus, t]);

    useEffect(() => {
        if (error) {
            setPageError(error);
        }
    }, [error]);

    const initialized = useMemo(() => Boolean(status?.initialized), [status?.initialized]);

    const handleChange = useCallback(
        <K extends keyof SetupFormState>(key: K, value: SetupFormState[K]) => {
            setForm((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const validate = useCallback(() => {
        if (!form.username.trim()) {
            setValidationError(
                t("setup.validation.usernameRequired", {
                    defaultValue: "نام کاربری الزامی است",
                }),
            );
            return false;
        }

        if (!form.firstName.trim()) {
            setValidationError(
                t("setup.validation.firstNameRequired", {
                    defaultValue: "نام الزامی است",
                }),
            );
            return false;
        }

        if (!form.lastName.trim()) {
            setValidationError(
                t("setup.validation.lastNameRequired", {
                    defaultValue: "نام خانوادگی الزامی است",
                }),
            );
            return false;
        }

        if (!form.password) {
            setValidationError(
                t("setup.validation.passwordRequired", {
                    defaultValue: "رمز عبور الزامی است",
                }),
            );
            return false;
        }

        if (form.password.length < 8) {
            setValidationError(
                t("setup.validation.passwordMinLength", {
                    defaultValue: "رمز عبور باید حداقل 8 کاراکتر باشد",
                }),
            );
            return false;
        }

        if (!form.confirmPassword) {
            setValidationError(
                t("setup.validation.confirmPasswordRequired", {
                    defaultValue: "تکرار رمز عبور الزامی است",
                }),
            );
            return false;
        }

        if (form.password !== form.confirmPassword) {
            setValidationError(
                t("setup.validation.passwordConfirmationMismatch", {
                    defaultValue: "تکرار رمز عبور با رمز عبور یکسان نیست",
                }),
            );
            return false;
        }

        setValidationError(null);
        return true;
    }, [form, t]);

    const handleSubmit = useCallback(async () => {
        if (initialized || !validate()) {
            return;
        }

        clearError();
        setPageError(null);
        setSuccessMessage(null);

        try {
            await initialize({
                username: form.username.trim(),
                password: form.password,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                mobile: form.mobile.trim() || undefined,
                email: form.email.trim() || undefined,
            });

            setSuccessMessage(
                t("setup.messages.initializeSuccess", {
                    defaultValue: "راه‌اندازی اولیه با موفقیت انجام شد. در حال انتقال به صفحه ورود...",
                }),
            );

            window.setTimeout(() => {
                navigate("/login", { replace: true });
            }, 900);
        } catch (submitError) {
            setPageError(
                extractErrorMessage(
                    submitError,
                    t("setup.errors.initialize", {
                        defaultValue: "خطا در انجام راه‌اندازی اولیه",
                    }),
                ),
            );
        }
    }, [clearError, form, initialize, initialized, navigate, t, validate]);

    const handleGoHome = useCallback(() => {
        navigate("/");
    }, [navigate]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: "2rem",
                background: `
                    radial-gradient(circle at top right, rgba(10, 132, 255, 0.10), transparent 28%),
                    radial-gradient(circle at bottom left, rgba(0, 153, 102, 0.08), transparent 24%),
                    linear-gradient(135deg, var(--sapBackgroundColor), var(--sapGroup_ContentBackground))
                `,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "1180px",
                    display: "grid",
                    gridTemplateColumns: "minmax(320px, 1fr) minmax(420px, 560px)",
                    gap: "1.5rem",
                    alignItems: "stretch",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "1.25rem",
                        minHeight: "720px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "2rem",
                        color: "white",
                        background: `
                            linear-gradient(160deg, rgba(8, 57, 90, 0.92), rgba(7, 105, 81, 0.86)),
                            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))
                        `,
                        boxShadow: "0 1.5rem 3rem rgba(0, 0, 0, 0.16)",
                    }}
                >
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
                            {t("setup.hero.badge", {
                                defaultValue: "مرحله راه‌اندازی اولیه سامانه",
                            })}
                        </Text>
                    </div>

                    <div style={{ display: "grid", gap: "1rem", maxWidth: "620px" }}>
                        <Title
                            level="H1"
                            style={{
                                color: "white",
                                margin: 0,
                                lineHeight: 1.2,
                            }}
                        >
                            {t("setup.hero.title", {
                                defaultValue: "تعریف کاربر ریشه و فعال‌سازی اولیه GRC",
                            })}
                        </Title>

                        <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: "1rem", lineHeight: 1.9 }}>
                            {t("setup.hero.description", {
                                defaultValue:
                                    "در این مرحله تنها کاربر ریشه سامانه ایجاد می‌شود. پس از ثبت موفق، ادامه ورود و مدیریت کاربران از طریق همین حساب کاربری انجام خواهد شد.",
                            })}
                        </Text>
                    </div>

                    <div
                        style={{
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
                                {t("setup.hero.cards.rootUser.title", {
                                    defaultValue: "کاربر ریشه",
                                })}
                            </Title>
                            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                                {t("setup.hero.cards.rootUser.description", {
                                    defaultValue: "این کاربر اختیار راه‌اندازی و مدیریت اولیه سامانه را دارد.",
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
                                {t("setup.hero.cards.security.title", {
                                    defaultValue: "امنیت",
                                })}
                            </Title>
                            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                                {t("setup.hero.cards.security.description", {
                                    defaultValue: "برای حساب ریشه از رمز عبور قوی و اطلاعات معتبر استفاده کنید.",
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
                                {t("setup.hero.cards.oneTime.title", {
                                    defaultValue: "فقط یک‌بار",
                                })}
                            </Title>
                            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                                {t("setup.hero.cards.oneTime.description", {
                                    defaultValue: "این صفحه فقط برای راه‌اندازی اولیه قابل استفاده است.",
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
                            titleText={t("setup.page.title", {
                                defaultValue: "راه‌اندازی اولیه سامانه",
                            })}
                            subtitleText={t("setup.page.subtitle", {
                                defaultValue: "ثبت کاربر ریشه و تکمیل اطلاعات اولیه",
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
                        <Bar
                            startContent={
                                <Title level="H4">
                                    {t("setup.form.title", {
                                        defaultValue: "ثبت کاربر ریشه",
                                    })}
                                </Title>
                            }
                            endContent={loading ? <BusyIndicator active delay={0} size="S" /> : undefined}
                        />

                        <Text style={{ color: "var(--sapContent_LabelColor)" }}>
                            {t("setup.form.subtitle", {
                                defaultValue:
                                    "اطلاعات زیر برای ایجاد نخستین کاربر سامانه استفاده می‌شود. پس از ثبت موفق، به صفحه ورود منتقل خواهید شد.",
                            })}
                        </Text>

                        {initialized ? (
                            <MessageStrip design="Positive" hideCloseButton>
                                {t("setup.messages.alreadyInitialized", {
                                    defaultValue: "سامانه قبلا راه‌اندازی شده است و کاربر ریشه ثبت شده است.",
                                })}
                            </MessageStrip>
                        ) : null}

                        {pageError ? (
                            <MessageStrip design="Negative" hideCloseButton>
                                {pageError}
                            </MessageStrip>
                        ) : null}

                        {validationError ? (
                            <MessageStrip design="Negative" hideCloseButton>
                                {validationError}
                            </MessageStrip>
                        ) : null}

                        {successMessage ? (
                            <MessageStrip design="Positive" hideCloseButton>
                                {successMessage}
                            </MessageStrip>
                        ) : null}

                        <div
                            style={{
                                display: "grid",
                                gap: "1rem",
                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            }}
                        >
                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label required for="setup-username">
                                    {t("setup.fields.username", { defaultValue: "نام کاربری" })}
                                </Label>
                                <Input
                                    id="setup-username"
                                    value={form.username}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.username", {
                                        defaultValue: "نام کاربری ریشه را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("username", event.target.value)}
                                />
                            </div>

                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label for="setup-email">
                                    {t("setup.fields.email", { defaultValue: "ایمیل" })}
                                </Label>
                                <Input
                                    id="setup-email"
                                    value={form.email}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.email", {
                                        defaultValue: "ایمیل را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("email", event.target.value)}
                                />
                            </div>

                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label required for="setup-firstName">
                                    {t("setup.fields.firstName", { defaultValue: "نام" })}
                                </Label>
                                <Input
                                    id="setup-firstName"
                                    value={form.firstName}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.firstName", {
                                        defaultValue: "نام را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("firstName", event.target.value)}
                                />
                            </div>

                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label required for="setup-lastName">
                                    {t("setup.fields.lastName", { defaultValue: "نام خانوادگی" })}
                                </Label>
                                <Input
                                    id="setup-lastName"
                                    value={form.lastName}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.lastName", {
                                        defaultValue: "نام خانوادگی را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("lastName", event.target.value)}
                                />
                            </div>

                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label required for="setup-password">
                                    {t("setup.fields.password", { defaultValue: "رمز عبور" })}
                                </Label>
                                <Input
                                    id="setup-password"
                                    type="Password"
                                    value={form.password}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.password", {
                                        defaultValue: "رمز عبور را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("password", event.target.value)}
                                />
                            </div>

                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label required for="setup-confirmPassword">
                                    {t("setup.fields.confirmPassword", {
                                        defaultValue: "تکرار رمز عبور",
                                    })}
                                </Label>
                                <Input
                                    id="setup-confirmPassword"
                                    type="Password"
                                    value={form.confirmPassword}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.confirmPassword", {
                                        defaultValue: "تکرار رمز عبور را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("confirmPassword", event.target.value)}
                                />
                            </div>

                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <Label for="setup-mobile">
                                    {t("setup.fields.mobile", { defaultValue: "موبایل" })}
                                </Label>
                                <Input
                                    id="setup-mobile"
                                    value={form.mobile}
                                    disabled={submitting || initialized}
                                    placeholder={t("setup.placeholders.mobile", {
                                        defaultValue: "شماره موبایل را وارد کنید",
                                    })}
                                    onInput={(event) => handleChange("mobile", event.target.value)}
                                />
                            </div>

                            <div
                                style={{
                                    gridColumn: "1 / -1",
                                    padding: ".85rem 1rem",
                                    borderRadius: ".85rem",
                                    background: "var(--sapList_Background)",
                                    border: "1px solid var(--sapList_BorderColor)",
                                }}
                            >
                                <Text style={{ color: "var(--sapContent_LabelColor)" }}>
                                    {t("setup.hints.password", {
                                        defaultValue:
                                            "پیشنهاد می‌شود رمز عبور حداقل 8 کاراکتر بوده و ترکیبی از حروف و اعداد باشد.",
                                    })}
                                </Text>
                            </div>
                        </div>

                        <Bar
                            endContent={
                                <>
                                    <Button
                                        design="Emphasized"
                                        disabled={submitting || loading || initialized}
                                        onClick={() => void handleSubmit()}
                                    >
                                        {submitting
                                            ? t("setup.actions.initializing", {
                                                defaultValue: "در حال راه‌اندازی...",
                                            })
                                            : t("setup.actions.initialize", {
                                                defaultValue: "راه‌اندازی اولیه",
                                            })}
                                    </Button>

                                    <Button
                                        design="Transparent"
                                        disabled={submitting}
                                        onClick={handleGoHome}
                                    >
                                        {t("setup.actions.goHome", {
                                            defaultValue: "بازگشت",
                                        })}
                                    </Button>
                                </>
                            }
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}