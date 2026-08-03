import type { ControlSummary } from "../domain/control.model";
import { createControlRepo } from "./control.repo.provider";
import type { ControlRepo } from "./control.repo";

export interface ControlService {
    list(): Promise<ControlSummary[]>;
    get(controlId: string): Promise<ControlSummary>;
}

export function createControlService(repo: ControlRepo): ControlService {
    return {
        list: () => repo.list(),
        get: (controlId) => repo.get(controlId),
    };
}

export const controlService = createControlService(createControlRepo());
