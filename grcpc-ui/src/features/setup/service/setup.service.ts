import { initializeSystemSchema } from "@/features/setup";
import type { InitializeSystemRequest, SetupStatus } from "@/features/setup";
import type { SetupRepo } from "../infra/setup.repo";
import { createSetupRepo } from "../infra/setup.factory";

export interface SetupService {
    getStatus(): Promise<SetupStatus>;
    initialize(payload: InitializeSystemRequest): Promise<void>;
}

export function createSetupService(repo: SetupRepo): SetupService {
    return {
        async getStatus() {
            return repo.getStatus();
        },

        async initialize(payload) {
            const parsed = initializeSystemSchema.parse({
                ...payload,
                username: payload.username.trim(),
                firstName: payload.firstName.trim(),
                lastName: payload.lastName.trim(),
                mobile: payload.mobile?.trim() || undefined,
                email: payload.email?.trim() || undefined,
            });

            await repo.initialize({
                ...parsed,
                mobile: parsed.mobile || undefined,
                email: parsed.email || undefined,
            });
        },
    };
}

const setupRepo = createSetupRepo();
export const setupService = createSetupService(setupRepo);
