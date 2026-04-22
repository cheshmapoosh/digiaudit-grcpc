import type { InitializeSystemRequest, SetupStatus } from "@/features/setup";

export interface SetupRepo {
    getStatus(): Promise<SetupStatus>;
    initialize(payload: InitializeSystemRequest): Promise<void>;
}
