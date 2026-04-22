import type { SetupRepo } from "./setup.repo";
import { SetupApiRepo } from "./setup.api.repo";

export function createSetupRepo(): SetupRepo {
    return new SetupApiRepo();
}
