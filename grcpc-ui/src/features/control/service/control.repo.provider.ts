import { ControlApiRepo } from "./control.api.repo";
import type { ControlRepo } from "./control.repo";

export function createControlRepo(): ControlRepo {
    return new ControlApiRepo();
}
