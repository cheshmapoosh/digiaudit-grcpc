import type { AuditFields } from "@/shared/domain/audit.model.ts";

export type ProcessStatus = "active" | "inactive";

export interface ProcessNode extends AuditFields {
  id: string;
  code: string;
  title: string;
  description?: string;
  parentId: string | null;
  ownerId?: string | null;
  sortOrder: number;
  status: ProcessStatus;
}

export type ProcessReadonlyKeys =
    | "id"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "deletedAt"
    | "deletedBy";

export type ProcessNodeCreate = Omit<ProcessNode, ProcessReadonlyKeys>;

export type ProcessNodeUpdate = Partial<
    Omit<ProcessNode, ProcessReadonlyKeys>
>;
