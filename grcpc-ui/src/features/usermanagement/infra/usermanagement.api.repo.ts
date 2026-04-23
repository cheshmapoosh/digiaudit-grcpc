import i18n from "@/i18n/i18n";
import { httpClient } from "@/shared/infra/http.client.ts";
import type { UserManagementRepo } from "./usermanagement.repo";
import {
    roleDetailSchema,
    roleSummaryListSchema,
    userDetailSchema,
    userSummaryListSchema,
} from "../domain/usermanagement.schema";
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

export class UserManagementApiRepo implements UserManagementRepo {
    async listUsers(): Promise<UserSummary[]> {
        const response = await httpClient.get<unknown>(USERS_BASE_URL);
        return userSummaryListSchema.parse(response);
    }

    async getUserById(id: string): Promise<UserDetail | null> {
        try {
            const response = await httpClient.get<unknown>(
                `${USERS_BASE_URL}/${id}?locale=${encodeURIComponent(resolveLocale())}`,
            );
            return userDetailSchema.parse(response);
        } catch {
            return null;
        }
    }

    async listRoles(): Promise<RoleSummary[]> {
        const response = await httpClient.get<unknown>(
            `${ROLES_BASE_URL}?locale=${encodeURIComponent(resolveLocale())}`,
        );
        return roleSummaryListSchema.parse(response);
    }

    async getRoleById(id: string): Promise<RoleDetail | null> {
        try {
            const response = await httpClient.get<unknown>(
                `${ROLES_BASE_URL}/${id}?locale=${encodeURIComponent(resolveLocale())}`,
            );
            return roleDetailSchema.parse(response);
        } catch {
            return null;
        }
    }
}
