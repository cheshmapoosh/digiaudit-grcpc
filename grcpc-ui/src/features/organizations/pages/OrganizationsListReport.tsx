//src/features/organization/pages/OrganizationsListReport.tsx
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";

import {
    BusyIndicator,
    Button,
    DatePicker,
    Input,
    Label,
    Toolbar,
    ToolbarSpacer
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents/dist/Title.js";

import type {Organization} from "../types";
import {organizationService} from "../api/organization.service";
import {OrganizationTree} from "../components/OrganizationTree";

function parseDateOnly(d?: string): Date | null {
    if (!d) return null;
    const [y, m, day] = d.split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day, 0, 0, 0, 0);
}

function matchesAsOfDate(org: Organization, asOf?: string): boolean {
    const d = parseDateOnly(asOf);
    if (!d) return true;

    const from = parseDateOnly(org.validFrom) ?? new Date(1970, 0, 1);
    const to = parseDateOnly(org.validTo) ?? new Date(9999, 11, 31);
    return from <= d && d <= to;
}

function matchesSearch(org: Organization, q: string): boolean {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${org.code} ${org.name} ${org.type ?? ""} ${org.status ?? ""}`
        .toLowerCase()
        .includes(s);
}

export default function OrganizationsListReport({
                                                    selectedId,
                                                    treeFocusId,
                                                    expandOneLevelForId,
                                                    onSelect,
                                                    onCreate,
                                                    onDataLoaded // ✅ new
                                                }: {
    selectedId?: string;
    treeFocusId?: string;
    expandOneLevelForId?: string;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDataLoaded?: (items: Organization[]) => void; // ✅ new
}) {
    const {t} = useTranslation();

    const [items, setItems] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter bar
    const [q, setQ] = useState("");
    const [asOfDate, setAsOfDate] = useState<string | undefined>(undefined);

    async function refresh() {
        setLoading(true);
        try {
            const data = await organizationService.list();
            setItems(data);
            onDataLoaded?.(data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter((org) => matchesSearch(org, q) && matchesAsOfDate(org, asOfDate));
    }, [items, q, asOfDate]);

    return (
        <div className="page" style={{height: "100%", minHeight: 0}}>
            {/* Header */}
            <div className="pageHeader">
                <ui5-title level="H2">{t("org.page.title", "سازمان‌ها")}</ui5-title>

                <div style={{display: "flex", gap: 8}}>
                    <Button design="Emphasized" icon="add" onClick={onCreate}>
                        {t("org.actions.new", "ایجاد سازمان")}
                    </Button>
                    <Button design="Transparent" icon="synchronize" onClick={refresh}>
                        {t("common.refresh", "بازآوری")}
                    </Button>
                </div>
            </div>

            {/* Filter bar */}
            <Toolbar className="filterBar" design="Transparent">
                <Input
                    value={q}
                    onInput={(e: any) => setQ(e.target.value)}
                    placeholder={t("common.search", "جستجو...")}
                    style={{width: "min(360px, 100%)"}}
                />

                <div style={{display: "flex", alignItems: "center", gap: 6}}>
                    <Label>{t("org.filter.date", "تاریخ")}</Label>
                    <DatePicker
                        value={asOfDate ?? ""}
                        onChange={(e: any) => setAsOfDate(e.target.value || undefined)}
                    />
                </div>

                <Button
                    design="Transparent"
                    icon="clear-filter"
                    onClick={() => {
                        setQ("");
                        setAsOfDate(undefined);
                    }}
                >
                    {t("org.filter.clear", "پاک کردن")}
                </Button>

                <ToolbarSpacer/>
            </Toolbar>

            {/* Content */}
            {loading ? (
                <BusyIndicator active style={{width: "100%"}}/>
            ) : (
                <div style={{padding: 12}}>
                    <ui5-title level="H4">{t("org.tree.title", "ساختار سازمان")}</ui5-title>
                    <div
                        style={{
                            borderTop: "1px solid var(--sapList_BorderColor)",
                            margin: "8px 0 12px"
                        }}
                    />
                    <OrganizationTree
                        items={filteredItems}
                        selectedId={treeFocusId ?? selectedId}
                        expandOneLevelForId={expandOneLevelForId}
                        onSelect={(id) => {
                            onSelect(id);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
