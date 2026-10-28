import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
    Button,
    BusyIndicator,
    FlexBox,
    Form,
    FormGroup,
    FormItem,
    Input,
    Label,
    MessageStrip,
    Text,
} from "@ui5/webcomponents-react";

import { useSetupState } from "@/features/setup";
import PublicAuthLayout from "@/shared/components/PublicAuthLayout";
import { useInitialAppReady } from "@/shared/bootstrap/useInitialAppReady";

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

function extractErrorMessage(error: unknown, fallback: string, t: TFunction): string {
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
                    return t("setup.errors.usernameExists");
                case "ROOT_ADMIN role seed was not found":
                    return t("setup.errors.rootRoleMissing");
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
    useInitialAppReady();

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
    const [actionError, setActionError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        void loadStatus().catch((loadError: unknown) => {
            setActionError(
                extractErrorMessage(
                    loadError,
                    t("setup.errors.loadStatus", {
                        defaultValue: "خطا در دریافت وضعیت راه‌اندازی",
                    }),
                    t,
                ),
            );
        });
    }, [loadStatus, t]);

    const initialized = useMemo(() => Boolean(status?.initialized), [status?.initialized]);

    const effectiveError = actionError ?? error;

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
        if (submitting || loading || initialized || !validate()) {
            return;
        }

        clearError();
        setActionError(null);
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
            setActionError(
                extractErrorMessage(
                    submitError,
                    t("setup.errors.initialize", {
                        defaultValue: "خطا در انجام راه‌اندازی اولیه",
                    }),
                    t,
                ),
            );
        }
    }, [clearError, form, initialize, initialized, loading, navigate, submitting, t, validate]);

    const handleGoHome = useCallback(() => {
        navigate("/");
    }, [navigate]);

    return (
        <PublicAuthLayout panelLabel={t("setup.page.title")} compact>
            <Text>{t("setup.page.subtitle")}</Text>
            <form
                aria-label={t("setup.form.title")}
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                }}
            >
                {loading && <BusyIndicator active delay={0} size="S" />}
                {initialized && (
                    <MessageStrip design="Positive" hideCloseButton>
                        {t("setup.messages.alreadyInitialized")}
                    </MessageStrip>
                )}
                {effectiveError && <MessageStrip design="Negative" hideCloseButton>{effectiveError}</MessageStrip>}
                {validationError && <MessageStrip design="Negative" hideCloseButton>{validationError}</MessageStrip>}
                {successMessage && <MessageStrip design="Positive" hideCloseButton>{successMessage}</MessageStrip>}
                <Form accessibleMode="Edit" accessibleName={t("setup.form.title")} layout="S1 M1 L1 XL1" labelSpan="S4 M4 L4 XL4" itemSpacing="Normal">
                    <FormGroup accessibleName={t("setup.fields.username")}>
                        <FormItem labelContent={<Label required for="setup-username">{t("setup.fields.username")}</Label>}>
                            <Input
                                id="setup-username"
                                value={form.username}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("username", event.target.value)}
                            />
                        </FormItem>
                    </FormGroup>
                    <FormGroup accessibleName={`${t("setup.fields.firstName")} / ${t("setup.fields.lastName")}`}>
                        <FormItem labelContent={<Label required for="setup-firstName">{t("setup.fields.firstName")}</Label>}>
                            <Input
                                id="setup-firstName"
                                value={form.firstName}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("firstName", event.target.value)}
                            />
                        </FormItem>
                        <FormItem labelContent={<Label required for="setup-lastName">{t("setup.fields.lastName")}</Label>}>
                            <Input
                                id="setup-lastName"
                                value={form.lastName}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("lastName", event.target.value)}
                            />
                        </FormItem>
                    </FormGroup>
                    <FormGroup accessibleName={`${t("setup.fields.password")} / ${t("setup.fields.confirmPassword")}`}>
                        <FormItem labelContent={<Label required for="setup-password">{t("setup.fields.password")}</Label>}>
                            <Input
                                id="setup-password"
                                type="Password"
                                value={form.password}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("password", event.target.value)}
                            />
                        </FormItem>
                        <FormItem labelContent={<Label required for="setup-confirmPassword">{t("setup.fields.confirmPassword")}</Label>}>
                            <Input
                                id="setup-confirmPassword"
                                type="Password"
                                value={form.confirmPassword}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("confirmPassword", event.target.value)}
                            />
                        </FormItem>
                    </FormGroup>
                    <FormGroup accessibleName={`${t("setup.fields.email")} / ${t("setup.fields.mobile")}`}>
                        <FormItem labelContent={<Label for="setup-email">{t("setup.fields.email")}</Label>}>
                            <Input
                                id="setup-email"
                                value={form.email}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("email", event.target.value)}
                            />
                        </FormItem>
                        <FormItem labelContent={<Label for="setup-mobile">{t("setup.fields.mobile")}</Label>}>
                            <Input
                                id="setup-mobile"
                                value={form.mobile}
                                disabled={submitting || initialized}
                                onInput={(event) => handleChange("mobile", event.target.value)}
                            />
                        </FormItem>
                    </FormGroup>
                </Form>
                <Text>{t("setup.hints.password")}</Text>
                <FlexBox justifyContent="End">
                    <Button design="Transparent" disabled={submitting} onClick={handleGoHome}>
                        {t("setup.actions.goHome")}
                    </Button>
                    <Button type="Submit" design="Emphasized" disabled={submitting || loading || initialized}>
                        {submitting ? t("setup.actions.initializing") : t("setup.actions.initialize")}
                    </Button>
                </FlexBox>
            </form>
        </PublicAuthLayout>
    );
}
