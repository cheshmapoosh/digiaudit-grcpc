export type OrganizationStatus = "ACTIVE" | "INACTIVE";

export type OrganizationType =
    | "COMPANY"
    | "BUSINESS_UNIT"
    | "DIVISION"
    | "DEPARTMENT"
    | "COST_CENTER"
    | "LOCATION"
    | "OTHER";

export interface Organization {
    id: string; // uuid
    code: string;
    name: string;
    type: OrganizationType;
    parentId?: string;
    status: OrganizationStatus;
    validFrom?: string; // YYYY-MM-DD
    validTo?: string; // YYYY-MM-DD
    description?: string;
    createdAt: string; // ISO datetime
    updatedAt: string; // ISO datetime
}

export type OrganizationCreateInput = Omit<
    Organization,
    "id" | "createdAt" | "updatedAt"
>;

export type OrganizationUpdateInput = Partial<OrganizationCreateInput>;
