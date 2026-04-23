export type RegulationType = "GROUP" | "LAW" | "REQUIREMENT";

export type FileMeta = {
    id: string;
    name: string;
    url: string;
};

export type Regulation = {
    id: string;
    code: string;
    title: string;
    type: RegulationType;
    parentId: string | null;
    description?: string;
    validFrom?: string;
    validTo?: string;
    documents?: FileMeta[];
};

export type Organization = {
    id: string;
    name: string;
    description?: string;
    regulationIds: string[];
};

export const db = {
    regulations: [] as Regulation[],
    organizations: [] as Organization[],
};

// 🔥 seed (فقط یکبار در startup صدا بزن)
export function seed() {
    if (db.regulations.length) return;

    db.regulations = [
        { id: "1", code: "00", title: "ساختار قانون", type: "GROUP", parentId: null },
        { id: "2", code: "01", title: "قانون مالیاتی", type: "GROUP", parentId: "1" },
        { id: "3", code: "01-01", title: "ارزش افزوده", type: "LAW", parentId: "2" },
        { id: "4", code: "01-01-01", title: "دریافت 10 درصد", type: "REQUIREMENT", parentId: "3" },
    ];

    db.organizations = [
        {
            id: "org1",
            name: "آریا ساسول",
            regulationIds: ["2"],
        },
    ];
}