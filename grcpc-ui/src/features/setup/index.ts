export { setupRoutes } from "./routes";

export type { SetupStatus, InitializeSystemRequest } from "./domain/setup.model";
export { initializeSystemSchema } from "./domain/setup.schema";
export type { InitializeSystemInput } from "./domain/setup.schema";

export { createSetupService, setupService } from "./service/setup.service";
export { useSetupState } from "./state/setup.state";
