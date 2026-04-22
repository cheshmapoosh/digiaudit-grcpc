import { z } from "zod";
import { t } from "@/shared/utils/i18n.util";

export const initializeSystemSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, t("setup.validation.usernameRequired", "نام کاربری الزامی است"))
        .max(100, t("setup.validation.usernameMaxLength", "نام کاربری نمی‌تواند بیشتر از 100 کاراکتر باشد")),

    password: z
        .string()
        .min(8, t("setup.validation.passwordMinLength", "رمز عبور باید حداقل 8 کاراکتر باشد"))
        .max(200, t("setup.validation.passwordMaxLength", "رمز عبور نمی‌تواند بیشتر از 200 کاراکتر باشد")),

    firstName: z
        .string()
        .trim()
        .min(1, t("setup.validation.firstNameRequired", "نام الزامی است"))
        .max(100, t("setup.validation.firstNameMaxLength", "نام نمی‌تواند بیشتر از 100 کاراکتر باشد")),

    lastName: z
        .string()
        .trim()
        .min(1, t("setup.validation.lastNameRequired", "نام خانوادگی الزامی است"))
        .max(100, t("setup.validation.lastNameMaxLength", "نام خانوادگی نمی‌تواند بیشتر از 100 کاراکتر باشد")),

    mobile: z
        .string()
        .trim()
        .max(20, t("setup.validation.mobileMaxLength", "موبایل نمی‌تواند بیشتر از 20 کاراکتر باشد"))
        .optional()
        .or(z.literal("")),

    email: z
        .string()
        .trim()
        .email(t("setup.validation.emailInvalid", "ایمیل معتبر نیست"))
        .max(200, t("setup.validation.emailMaxLength", "ایمیل نمی‌تواند بیشتر از 200 کاراکتر باشد"))
        .optional()
        .or(z.literal("")),
});

export type InitializeSystemInput = z.infer<typeof initializeSystemSchema>;
