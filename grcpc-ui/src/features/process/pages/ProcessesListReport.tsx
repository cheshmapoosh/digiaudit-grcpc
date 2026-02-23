import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { BusyIndicator, Button, Input, Label, Toolbar, ToolbarSpacer } from "@ui5/webcomponents-react";
import "@ui5/webcomponents/dist/Title.js";

import type { ProcessNode } from "../model/process.types";
import { processService } from "../service/process.service";
import { ProcessTree } from "../components/ProcessTree";

function matchesSearch(p: ProcessNode, q: string): boolean {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${p.code ?? ""} ${p.title ?? ""} ${p.status ?? ""}`.toLowerCase().includes(s);
}

export default function ProcessesListReport({
                                                selectedId,
                                                treeFocusId,
                                                expandOneLevelForId,
                                                onSelect,
                                                onCreate,
                                                onDataLoaded,
                                            }: {
    selectedId?: string;
    treeFocusId?: string;
    expandOneLevelForId?: string;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDataLoaded?: (items: ProcessNode[]) => void;
}) {
    const { t } = useTranslation();

    const [items, setItems] = useState<ProcessNode[]>([]);
    const [loading, setLoading] = useState(false);

    const [q, setQ] = useState("");

    async function refresh() {
        setLoading(true);
        try {
            const data = await processService.list();
            const list = Array.isArray(data) ? data : [];
            setItems(list);
            onDataLoaded?.(list);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filteredItems = useMemo(() => items.filter((p) => matchesSearch(p, q)), [items, q]);

    return (
        <div className="page" style={{ height: "100%", minHeight: 0 }}>
            <div className="pageHeader">
                {/* @ts-ignore */}
                <ui5-title level="H2">{t("process.page.title", "فرآیندها")}</ui5-title>

                <div style={{ display: "flex", gap: 8 }}>
                    <Button design="Emphasized" icon="add" onClick={onCreate}>
                        {t("process.actions.new", "ایجاد فرآیند")}
                    </Button>
                    <Button design="Transparent" icon="synchronize" onClick={refresh}>
                        {t("common.refresh", "بازآوری")}
                    </Button>
                </div>
            </div>

            <Toolbar className="filterBar" design="Transparent">
                <Input
                    value={q}
                    onInput={(e: any) => setQ(e.target.value)}
                    placeholder={t("common.search", "جستجو...")}
                    style={{ width: "min(360px, 100%)" }}
                />

                <Button
                    design="Transparent"
                    icon="clear-filter"
                    onClick={() => {
                        setQ("");
                    }}
                >
                    {t("process.filter.clear", "پاک کردن")}
                </Button>

                <ToolbarSpacer />
            </Toolbar>

            {loading ? (
                <BusyIndicator active style={{ width: "100%" }} />
            ) : (
                <div style={{ padding: 12 }}>
                    {/* @ts-ignore */}
                    <ui5-title level="H4">{t("process.tree.title", "ساختار فرآیند")}</ui5-title>
                    <div style={{ borderTop: "1px solid var(--sapList_BorderColor)", margin: "8px 0 12px" }} />

                    <ProcessTree
                        items={filteredItems}
                        selectedId={treeFocusId ?? selectedId}
                        expandOneLevelForId={expandOneLevelForId}
                        onSelect={onSelect}
                    />
                </div>
            )}
        </div>
    );
}