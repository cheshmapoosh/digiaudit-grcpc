/** A read-only occurrence, identified by Scope so a Control can appear in multiple branches. */
export interface ProcessControlNode {
  scopeId: string;
  subprocessId: string;
  controlId: string;
  code: string;
  title: string;
  status: "ACTIVE" | "INACTIVE";
}

export const processControlTreeId = (scopeId: string) => `control:${scopeId}`;

export type ProcessCreateType = "PROCESS" | "SUBPROCESS" | "CONTROL";
