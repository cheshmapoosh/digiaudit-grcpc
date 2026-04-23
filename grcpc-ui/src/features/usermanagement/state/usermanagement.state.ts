import { create } from "zustand";

import type {
    RoleDetail,
    RoleSummary,
    UserDetail,
    UserSummary,
} from "@/features/usermanagement";
import { userManagementService } from "@/features/usermanagement";

interface UserManagementState {
    usersById: Record<string, UserSummary>;
    userOrderedIds: string[];
    selectedUser: UserDetail | null;

    rolesById: Record<string, RoleSummary>;
    roleOrderedIds: string[];
    selectedRole: RoleDetail | null;

    loading: boolean;
    error: string | null;

    loadUsers(): Promise<void>;
    loadUser(id: string): Promise<void>;
    loadRoles(): Promise<void>;
    loadRole(id: string): Promise<void>;
    refreshUsers(): Promise<void>;
    refreshRoles(): Promise<void>;
    clearError(): void;
    reset(): void;
}

type IndexedItems<T extends { id: string }> = {
    byId: Record<string, T>;
    orderedIds: string[];
};

function indexItems<T extends { id: string }>(items: T[]): IndexedItems<T> {
    const byId: Record<string, T> = {};
    const orderedIds: string[] = [];

    for (const item of items) {
        byId[item.id] = item;
        orderedIds.push(item.id);
    }

    return { byId, orderedIds };
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallback;
}

const initialState = {
    usersById: {},
    userOrderedIds: [],
    selectedUser: null,
    rolesById: {},
    roleOrderedIds: [],
    selectedRole: null,
    loading: false,
    error: null,
};

export const useUserManagementState = create<UserManagementState>((set, get) => {
    async function execute<T>(
        task: () => Promise<T>,
        onSuccess: (result: T) => void,
        fallbackMessage: string,
    ): Promise<void> {
        set({ loading: true, error: null });

        try {
            const result = await task();
            onSuccess(result);
        } catch (error) {
            set({
                error: toErrorMessage(error, fallbackMessage),
            });
            throw error;
        } finally {
            set({ loading: false });
        }
    }

    return {
        ...initialState,

        async loadUsers() {
            await execute(
                () => userManagementService.listUsers(),
                (items) => {
                    const { byId, orderedIds } = indexItems(items);
                    set({
                        usersById: byId,
                        userOrderedIds: orderedIds,
                    });
                },
                "خطا در دریافت کاربران",
            );
        },

        async loadUser(id: string) {
            await execute(
                () => userManagementService.getUserById(id),
                (user) => {
                    set({ selectedUser: user });
                },
                "خطا در دریافت اطلاعات کاربر",
            );
        },

        async loadRoles() {
            await execute(
                () => userManagementService.listRoles(),
                (items) => {
                    const { byId, orderedIds } = indexItems(items);
                    set({
                        rolesById: byId,
                        roleOrderedIds: orderedIds,
                    });
                },
                "خطا در دریافت نقش‌ها",
            );
        },

        async loadRole(id: string) {
            await execute(
                () => userManagementService.getRoleById(id),
                (role) => {
                    set({ selectedRole: role });
                },
                "خطا در دریافت اطلاعات نقش",
            );
        },

        async refreshUsers() {
            await get().loadUsers();
        },

        async refreshRoles() {
            await get().loadRoles();
        },

        clearError() {
            set({ error: null });
        },

        reset() {
            set(initialState);
        },
    };
});