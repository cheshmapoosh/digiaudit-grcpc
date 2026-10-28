import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { useTranslation } from "react-i18next";
import {
    Bar,
    Button,
    BusyIndicator,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { OrganizationNode } from "@/features/organization";
import OrganizationTree from "../components/OrganizationTree";

export interface OrganizationsListReportProps {
    items: OrganizationNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    onSearchTextChange: (value: string) => void;
    onCreate: () => void;
    onShow: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

export default function OrganizationsListReport({
    items,
                                                    selectedId,
                                                    expansionAnchorId,
                                                    searchText,
                                                    busy = false,
                                                    error,
                                                    onErrorClose,
                                                    onSearchTextChange,
                                                    onCreate,
                                                    onShow,
    onDelete,
                                                    onSelect,
                                                }: OrganizationsListReportProps) {
    const { t } = useTranslation();
    const { manage } = useMasterDataAccess("REFERENCE");

    return (
        <div
            style={{
                display: "grid",
                gridTemplateRows: "auto auto minmax(0, 1fr)",
                gap: "var(--sapContent_Space_Tiny)",
                height: "100%",
                minHeight: 0,
            }}
        >
            <Bar
                startContent={
                    <Title level="H4">
                        {t("organization.list.title", { defaultValue: "ساختار سازمانی" })}
                    </Title>
                }
                endContent={
                    <>
                        <HeaderSearch value={searchText} onChange={(value) => onSearchTextChange(value)} disabled={busy} accessibleName={t("organization.list.search", {
                    defaultValue: "جستجو بر اساس کد",
                })} />
                        <Button
                            design="Emphasized"
                            disabled={busy}
                            hidden={!manage}
                            onClick={onCreate}
                        >
                            {t("common.create", { defaultValue: "ایجاد" })}
                        </Button>


                        <Button
                            design="Emphasized"
                            disabled={!selectedId || busy}
                            onClick={() => selectedId && onShow(selectedId)}
                        >
                            {t("common.view", { defaultValue: "نمایش" })}
                        </Button>

                        <Button
                            design="Negative"
                            hidden={!manage}
                            disabled={!selectedId || busy}
                            onClick={() => selectedId && onDelete(selectedId)}
                        >
                            {t("common.delete", { defaultValue: "حذف" })}
                        </Button>
                    </>
                }
            />


            {error ? (
                <MessageStrip design="Negative" onClose={onErrorClose}>
                    {error}
                </MessageStrip>
            ) : null}

            <div
                style={{ gridRow: "3", minHeight: 0, overflowY: "auto", overflowX: "hidden", boxSizing: "border-box" }}
            >
                {busy ? <BusyIndicator active /> : null}

                <OrganizationTree
                    items={items}
                    selectedId={selectedId}
                    expansionAnchorId={expansionAnchorId}
                    searchText={searchText}
                    busy={busy}
                    onSelect={onSelect}
                />
            </div>
        </div>
    );
}
