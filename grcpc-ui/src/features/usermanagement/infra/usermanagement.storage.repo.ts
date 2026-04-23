import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserManagementRepo,
    UserSummary,
} from "@/features/usermanagement";

const roleSummaries: RoleSummary[] = [
    {
        id: "11111111-1111-1111-1111-111111111111",
        code: "ROOT_ADMIN",
        title: "مدیر ریشه",
        description: "بالاترین سطح دسترسی سامانه",
        systemDefined: true,
        enabled: true,
        createdAt: new Date().toISOString(),
    },
    {
        id: "22222222-2222-2222-2222-222222222222",
        code: "USER_ADMIN",
        title: "مدیر کاربران",
        description: "مدیریت کاربران و نقش‌ها",
        systemDefined: false,
        enabled: true,
        createdAt: new Date().toISOString(),
    },
];

const roleDetails: Record<string, RoleDetail> = {
    "11111111-1111-1111-1111-111111111111": {
        ...roleSummaries[0],
        updatedAt: new Date().toISOString(),
        translations: [
            { locale: "fa", title: "مدیر ریشه", description: "بالاترین سطح دسترسی سامانه" },
            { locale: "en", title: "Root Admin", description: "Highest access level" },
        ],
        systemPermissions: [
            {
                id: "p1",
                code: "USER_VIEW",
                moduleName: "usermanagement",
                title: "مشاهده کاربران",
                description: null,
                createdAt: new Date().toISOString(),
            },
            {
                id: "p2",
                code: "ROLE_VIEW",
                moduleName: "usermanagement",
                title: "مشاهده نقش‌ها",
                description: null,
                createdAt: new Date().toISOString(),
            },
        ],
        businessPermissions: [],
    },
    "22222222-2222-2222-2222-222222222222": {
        ...roleSummaries[1],
        updatedAt: new Date().toISOString(),
        translations: [{ locale: "fa", title: "مدیر کاربران", description: "مدیریت کاربران و نقش‌ها" }],
        systemPermissions: [
            {
                id: "p1",
                code: "USER_VIEW",
                moduleName: "usermanagement",
                title: "مشاهده کاربران",
                description: null,
                createdAt: new Date().toISOString(),
            },
        ],
        businessPermissions: [],
    },
};

export class UserManagementStorageRepo implements UserManagementRepo {
    async listUsers(): Promise<UserSummary[]> {
        return [];
    }

    async getUserById(): Promise<UserDetail | null> {
        return null;
    }

    async listRoles(): Promise<RoleSummary[]> {
        return roleSummaries;
    }

    async getRoleById(id: string): Promise<RoleDetail | null> {
        return roleDetails[id] ?? null;
    }
}
