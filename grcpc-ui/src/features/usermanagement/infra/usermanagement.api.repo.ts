import i18n from "@/i18n/i18n";
import { httpClient } from "@/shared/infra/http.client.ts";
import type { UserManagementRepo } from "./usermanagement.repo";
import {
    roleDetailSchema,
    roleSummaryListSchema,
    userDetailSchema,
    userSummaryListSchema,
} from "@/features/usermanagement";
import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserSummary,
} from "@/features/usermanagement";

const USERS_BASE_URL = "/api/usermanagement/users";
const ROLES_BASE_URL = "/api/usermanagement/roles";

function resolveLocale(): string {
    return i18n.resolvedLanguage || i18n.language || "fa";
}

function buildLocalizedUrl(baseUrl: string, id?: string): string {
    const resourcePath = id ? `${baseUrl}/${id}` : baseUrl;
    const locale = encodeURIComponent(resolveLocale());
    return `${resourcePath}?locale=${locale}`;
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallback;
}

export class UserManagementApiRepo implements UserManagementRepo {
    async listUsers(): Promise<UserSummary[]> {
        const response = await httpClient.get<unknown>(USERS_BASE_URL);
        return userSummaryListSchema.parse(response);
    }

    async getUserById(id: string): Promise<UserDetail> {
        try {
            const response = await httpClient.get<unknown>(buildLocalizedUrl(USERS_BASE_URL, id));
            return userDetailSchema.parse(response);
        } catch (error) {
            throw new Error(
                toErrorMessage(error, "خطا در دریافت یا اعتبارسنجی اطلاعات کاربر"),
            );
        }
    }

    async listRoles(): Promise<RoleSummary[]> {
        const response = await httpClient.get<unknown>(buildLocalizedUrl(ROLES_BASE_URL));
        return roleSummaryListSchema.parse(response);
    }

    async getRoleById(id: string): Promise<RoleDetail> {
        try {
            const response = await httpClient.get<unknown>(buildLocalizedUrl(ROLES_BASE_URL, id));
            return roleDetailSchema.parse(response);
        } catch (error) {
            throw new Error(
                toErrorMessage(error, "خطا در دریافت یا اعتبارسنجی اطلاعات نقش"),
            );
        }
    }
}