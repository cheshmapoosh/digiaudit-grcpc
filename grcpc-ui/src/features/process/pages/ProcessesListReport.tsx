import { HeaderSearch } from "@/shared/components/HeaderSearch";
import { useMasterDataAccess } from "@/features/master-data/security/masterDataAccess";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BusyIndicator,
    Button,
    MessageStrip,
    Title,
} from "@ui5/webcomponents-react";

import type { ProcessNode, ProcessNodeType } from "../domain/process.model";
import ProcessCreateMenu from "../components/ProcessCreateMenu";
import ProcessTree from "../components/ProcessTree";

export interface ProcessesListReportProps {
    items: ProcessNode[];
    selectedId?: string | null;
    expansionAnchorId?: string | null;
    searchText: string;
    busy?: boolean;
    error?: string | null;
    onErrorClose?: () => void;
    createOptions: ProcessNodeType[];
    onSearchTextChange: (value: string) => void;
    onCreate: (nodeType: ProcessNodeType) => void;
    onShow: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

export default function ProcessesListReport({
    items,
    selectedId,
    expansionAnchorId,
    searchText,
    busy = false,
    error,
    onErrorClose,
    createOptions,
    onSearchTextChange,
    onCreate,
    onShow,
    onDelete,
    onSelect,
}: ProcessesListReportProps) {
    const { t } = useTranslation();
    const { manage } = useMasterDataAccess("PROCESS");

    const enabledCreateOptions: ProcessNodeType[] = selectedId ? createOptions : ["PROCESS"];

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
                        {t("process.list.title", { defaultValue: "ساختار فرآیند" })}
                    </Title>
                }
                endContent={
                    <>
                        <HeaderSearch value={searchText} onChange={(value) => onSearchTextChange(value)} disabled={busy} accessibleName={t("process.list.search", {
                    defaultValue: "جستجو بر اساس نام، کد یا توضیحات",
                })} />
                        {manage ? <ProcessCreateMenu
                            disabled={busy}
                            nodeTypes={enabledCreateOptions}
                            onCreate={onCreate}
                        /> : null}


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
                            {t("common.delete", { defaultValue: "Delete" })}
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
                style={{ gridRow: "3", minHeight: 0, overflowY: "auto", overflowX: "auto", boxSizing: "border-box" }}
            >
                {busy ? <BusyIndicator active /> : null}

                <ProcessTree
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
