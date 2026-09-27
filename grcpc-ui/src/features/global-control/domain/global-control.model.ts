export interface ControlGroup {
  id: string;
  nodeType: "controlGroup";
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalControl {
  id: string;
  nodeType: "globalControl";
  code: string;
  name: string;
  description: string | null;
  controlGroupId: string;
  controlType: string;
  testRequired: boolean;
  validFrom: string | null;
  validTo: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ControlGroupCreate {
  code: string; name: string; description: string | null; parentId: string | null;
  validFrom: string | null; validTo: string | null;
}
export type ControlGroupUpdate = Omit<ControlGroupCreate, "code"> & { version: number };

export interface GlobalControlCreate {
  code: string; name: string; description: string | null; controlGroupId: string;
  controlType: string; testRequired: boolean; validFrom: string | null; validTo: string | null;
}
export type GlobalControlUpdate = Omit<GlobalControlCreate, "code"> & { version: number };

export interface RegulationOption { id: string; code: string; name: string }
export interface GlobalControlRegulation {
  id: string; globalControlId: string; regulationId: string;
  regulationCode: string; regulationName: string; version: number;
}
