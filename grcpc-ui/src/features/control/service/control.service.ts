import type { ControlSummary } from "../domain/control.model";
import type { ControlRepo } from "./control.repo";
import { createControlRepo } from "./control.repo.provider";

export interface ControlService {
    list(): Promise<ControlSummary[]>;
}

function sortControls(items: ControlSummary[]): ControlSummary[] {
    return [...items].sort((a, b) => {
        const codeCompare = a.code.localeCompare(b.code, "fa");
        if (codeCompare !== 0) {
            return codeCompare;
        }

        return a.name.localeCompare(b.name, "fa");
    });
}

export function createControlService(repo: ControlRepo): ControlService {
    return {
        async list() {
            const items = await repo.list();
            return sortControls(items);
        },
    };
}

const controlRepo = createControlRepo();
export const controlService = createControlService(controlRepo);
