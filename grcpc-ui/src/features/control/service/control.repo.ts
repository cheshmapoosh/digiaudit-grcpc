import type { ControlSummary } from "../domain/control.model";

export interface ControlRepo {
    list(): Promise<ControlSummary[]>;
    get(controlId: string): Promise<ControlSummary>;
}
