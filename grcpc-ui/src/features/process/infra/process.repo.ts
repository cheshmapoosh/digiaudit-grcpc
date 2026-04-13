import type {BaseRepo} from "@/shared/infra/base.repo";
import type {
  ProcessNode,
  ProcessNodeCreate,
  ProcessNodeUpdate,
} from "@/features/process";

export type ProcessRepo = BaseRepo<ProcessNode, ProcessNodeCreate, ProcessNodeUpdate> & {
  getChildren(parentId: string | null): Promise<ProcessNode[]>;
  toggleStatus(id: string): Promise<ProcessNode>;
};
