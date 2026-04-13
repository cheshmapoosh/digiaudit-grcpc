import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    Input,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { OrganizationNode } from "@/features/organization";
import OrganizationTree from "../components/OrganizationTree";

export interface OrganizationsListReportProps {
    items: OrganizationNode[];
    selectedId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onSearchTextChange: (value: string) => void;
    onRefresh: () => void;
    onCreateRoot: () => void;
    onSelect: (id: string) => void;
    onCreateChild: (parentId: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string) => void;
}

export default function OrganizationsListReport({
                                                    items,
                                                    selectedId,
                                                    searchText,
                                                    busy = false,
                                                    error,
                                                    onSearchTextChange,
                                                    onRefresh,
                                                    onCreateRoot,
                                                    onSelect,
                                                    onCreateChild,
                                                    onEdit,
                                                    onDelete,
                                                    onToggleStatus,
                                                }: OrganizationsListReportProps) {
    const { t } = useTranslation();

    return (
        <div style={{ display: "grid", gap: "1rem", minHeight: 0 }}>
            <Bar
                startContent={
                    <Title level="H4">
                        {t("organization.list.title", { defaultValue: "واحدهای سازمانی" })}
                    </Title>
                }
                endContent={
                    <>
                        <Button
                            design="Transparent"
                            icon="refresh"
                            disabled={busy}
                            onClick={onRefresh}
                        >
                            {t("common.refresh", { defaultValue: "بروزرسانی" })}
                        </Button>

                        <Button
                            design="Emphasized"
                            icon="add"
                            disabled={busy}
                            onClick={onCreateRoot}
                        >
                            {t("organization.actions.createRoot", {
                                defaultValue: "ایجاد واحد سازمانی",
                            })}
                        </Button>
                    </>
                }
            />

            <Input
                value={searchText}
                placeholder={t("organization.list.search", {
                    defaultValue: "جستجو بر اساس کد، نام یا توضیحات",
                })}
                onInput={(event) => onSearchTextChange(event.target.value)}
            />

            {error ? (
                <MessageStrip design="Negative" hideCloseButton>
                    {error}
                </MessageStrip>
            ) : null}

            <div style={{ minHeight: 0, overflow: "auto" }}>
                <OrganizationTree
                    items={items}
                    selectedId={selectedId}
                    searchText={searchText}
                    busy={busy}
                    onSelect={onSelect}
                    onCreateChild={onCreateChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                />
            </div>
        </div>
    );
}