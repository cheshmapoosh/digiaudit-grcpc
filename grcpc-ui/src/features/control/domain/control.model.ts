export type ControlStatus = "active" | "inactive";

export type ControlNature = "preventive" | "detective";

export type ControlAutomationType = "manual" | "system" | "semiManualSystem";

export type ControlImportance = "low" | "medium" | "high" | "critical";

export interface ControlSummary {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    controlClass?: string | null;
    controlNature?: ControlNature | null;
    automationType?: ControlAutomationType | null;
    importance?: ControlImportance | null;
    objective?: string | null;
    status: ControlStatus;
    createdAt?: string | null;
    updatedAt?: string | null;
}
