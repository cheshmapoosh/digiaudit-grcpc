import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
    Dialog,
    Button,
    Input,
    List,
    ListItemStandard,
    FlexBox,
    FlexBoxDirection,
    Toolbar,
    ToolbarSpacer,
} from "@ui5/webcomponents-react";

import type { ProcessNode } from "../model/process.types";

export default function ParentValueHelpDialog({
                                                  open,
                                                  items,
                                                  excludedId,
                                                  selectedParentId,
                                                  onCancel,
                                                  onSelect,
                                              }: {
    open: boolean;
    items: ProcessNode[];
    excludedId?: string;
    selectedParentId?: string | null;
    onCancel: () => void;
    onSelect: (node: ProcessNode | undefined) => void;
}) {
    const { t } = useTranslation();
    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items
            .filter((x) => (excludedId ? x.id !== excludedId : true))
            .filter((x) => {
                if (!s) return true;
                return `${x.code ?? ""} ${x.title}`.toLowerCase().includes(s);
            })
            .slice(0, 200);
    }, [items, q, excludedId]);

    return (
        <Dialog
            open={open}
            headerText={t("process.parent.selectTitle", "انتخاب والد")}
            onAfterClose={onCancel}
            style={{ width: "min(860px, 95vw)" }}
            footer={
                <Button design="Transparent" onClick={onCancel}>
                    {t("common.close", "بستن")}
                </Button>
            }
        >
            <FlexBox direction={FlexBoxDirection.Column} style={{ gap: 10 }}>
                <Toolbar design="Transparent">
                    <Input
                        value={q}
                        onInput={(e: any) => setQ(e.target.value)}
                        placeholder={t("common.search", "جستجو...")}
                        style={{ width: "min(420px, 100%)" }}
                    />
                    <ToolbarSpacer />
                    <Button design="Transparent" onClick={() => setQ("")}>
                        {t("process.filter.clear", "پاک کردن")}
                    </Button>
                </Toolbar>

                <List
                    onItemClick={(e: any) => {
                        const item = e.detail?.item as any;
                        const id = item?.getAttribute?.("data-id");
                        if (id === "") return onSelect(undefined);
                        const node = filtered.find((x) => x.id === id);
                        if (node) onSelect(node);
                    }}
                    style={{ maxHeight: "60vh", overflow: "auto" }}
                >
                    <ListItemStandard data-id="" selected={!selectedParentId} description={t("common.none", "ندارد")}>
                        {t("common.none", "ندارد")}
                    </ListItemStandard>

                    {filtered.map((x) => (
                        <ListItemStandard
                            key={x.id}
                            data-id={x.id}
                            selected={x.id === selectedParentId}
                            description={x.code ?? ""}
                        >
                            {x.title}
                        </ListItemStandard>
                    ))}
                </List>
            </FlexBox>
        </Dialog>
    );
}