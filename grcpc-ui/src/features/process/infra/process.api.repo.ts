import { httpClient } from "@/shared/infra/http.client.ts";
import type {
  ProcessNode,
  ProcessNodeCreate,
  ProcessNodeUpdate,
} from "@/features/process";
import type { ProcessRepo } from "./process.repo";

const BASE_URL = "/api/processes";

export class ProcessApiRepo implements ProcessRepo {
  async list(): Promise<ProcessNode[]> {
    return httpClient.get<ProcessNode[]>(BASE_URL);
  }

  async getById(id: string): Promise<ProcessNode | null> {
    try {
      return await httpClient.get<ProcessNode>(`${BASE_URL}/${id}`);
    } catch {
      return null;
    }
  }

  async create(payload: ProcessNodeCreate): Promise<ProcessNode> {
    return httpClient.post<ProcessNode>(BASE_URL, payload);
  }

  async update(id: string, payload: ProcessNodeUpdate): Promise<ProcessNode> {
    return httpClient.put<ProcessNode>(`${BASE_URL}/${id}`, payload);
  }

  async remove(id: string): Promise<void> {
    await httpClient.delete<void>(`${BASE_URL}/${id}`);
  }

// متد getChildren مشابه list
  async getChildren(parentId: string | null): Promise<ProcessNode[]> {
    const url = parentId ? `${BASE_URL}/children/${parentId}` : BASE_URL;
    return httpClient.get<ProcessNode[]>(url);
  }

  // متد toggleStatus مشابه create/update
  async toggleStatus(id: string): Promise<ProcessNode> {
    return httpClient.patch<ProcessNode>(`${BASE_URL}/${id}/toggleStatus`);
  }

}
